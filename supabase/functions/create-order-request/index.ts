import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

type RequestLine = { variantId?: unknown; quantity?: unknown };
type RequestBody = {
  customer?: { name?: unknown; phone?: unknown; comment?: unknown };
  lines?: RequestLine[];
  website?: unknown;
};

const corsHeaders = {
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': 'https://pyjamas25.netlify.app',
  'Content-Type': 'application/json; charset=utf-8',
};

function response(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Méthode non autorisée.' }, 405);

  try {
    const body = (await request.json()) as RequestBody;
    if (body.website) return response({ orderNumber: 'OK' }); // Honeypot: do not create a row.

    const name = typeof body.customer?.name === 'string' ? body.customer.name.trim().replace(/\s+/g, ' ') : '';
    const phone = typeof body.customer?.phone === 'string' ? normalizePhone(body.customer.phone) : '';
    const comment = typeof body.customer?.comment === 'string' ? body.customer.comment.trim() : '';
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (name.length < 2 || name.length > 80) return response({ error: 'Indique un nom entre 2 et 80 caractères.' }, 400);
    if (phone.length < 8 || phone.length > 15) return response({ error: 'Indique un numéro WhatsApp valide.' }, 400);
    if (comment.length > 500) return response({ error: 'Le commentaire est trop long.' }, 400);
    if (lines.length < 1 || lines.length > 20) return response({ error: 'Le panier est invalide.' }, 400);

    const quantities = new Map<string, number>();
    for (const line of lines) {
      const variantId = typeof line.variantId === 'string' ? line.variantId : '';
      const quantity = Number(line.quantity);
      if (!/^[0-9a-f-]{36}$/i.test(variantId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return response({ error: 'Une ligne du panier est invalide.' }, 400);
      }
      quantities.set(variantId, (quantities.get(variantId) ?? 0) + quantity);
    }

    if ([...quantities.values()].some((quantity) => quantity > 10)) {
      return response({ error: 'La quantité maximale est de 10 articles par taille.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Configuration serveur incomplète.');
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count: pendingCount, error: rateError } = await admin
      .from('orders')
      .select('id, customers!inner(whatsapp_phone)', { count: 'exact', head: true })
      .eq('source', 'website')
      .eq('status', 'pending')
      .eq('customers.whatsapp_phone', phone)
      .gte('created_at', since);
    if (rateError) throw rateError;
    if ((pendingCount ?? 0) >= 2) {
      return response({ error: 'Tu as déjà deux demandes en attente. Contacte-nous sur WhatsApp pour les modifier.' }, 429);
    }

    const variantIds = [...quantities.keys()];
    const { data: variants, error: variantsError } = await admin
      .from('product_variants')
      .select('id, product_id, sku, color_name_fr, size_label, price, stock_quantity, is_active, products!inner(name_fr, is_active, deleted_at)')
      .in('id', variantIds)
      .eq('is_active', true)
      .eq('products.is_active', true)
      .is('products.deleted_at', null);
    if (variantsError) throw variantsError;
    if (!variants || variants.length !== variantIds.length) return response({ error: 'Un article n’est plus disponible.' }, 409);

    let customerId: string | null = null;
    const { data: existingCustomer, error: customerLookupError } = await admin
      .from('customers')
      .select('id')
      .eq('whatsapp_phone', phone)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (customerLookupError) throw customerLookupError;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      const { error } = await admin.from('customers').update({ full_name: name, phone, whatsapp_phone: phone }).eq('id', customerId);
      if (error) throw error;
    } else {
      const { data, error } = await admin
        .from('customers')
        .insert({ full_name: name, phone, whatsapp_phone: phone })
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('Client introuvable après création.');
      customerId = data.id;
    }

    const items = variants.map((variant) => {
      const quantity = quantities.get(variant.id) ?? 0;
      if (variant.stock_quantity < quantity) throw new Error(`Le stock de ${variant.sku} a changé.`);
      const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
      return {
        product_id: variant.product_id,
        variant_id: variant.id,
        sku: variant.sku,
        product_name: product?.name_fr ?? 'Article',
        color_name: variant.color_name_fr,
        size_label: variant.size_label,
        quantity,
        unit_price: variant.price,
        line_total: Number(variant.price) * quantity,
      };
    });
    const total = items.reduce((sum, item) => sum + item.line_total, 0);

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({ customer_id: customerId, status: 'pending', currency_code: 'XOF', subtotal: total, discount_total: 0, total, customer_note: comment || null, source: 'website' })
      .select('id, order_number')
      .single();
    if (orderError || !order) throw orderError ?? new Error('Commande introuvable après création.');

    const { error: itemsError } = await admin.from('order_items').insert(items.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) throw itemsError;
    const { error: historyError } = await admin.from('order_status_history').insert({ order_id: order.id, new_status: 'pending', note: 'Commande créée depuis le site.' });
    if (historyError) throw historyError;

    return response({ orderNumber: order.order_number }, 201);
  } catch (error) {
    console.error('create-order-request failed', error);
    return response({ error: 'La commande n’a pas pu être enregistrée. Réessaie dans un instant.' }, 500);
  }
});
