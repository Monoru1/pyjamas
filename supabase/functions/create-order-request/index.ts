import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

type RequestLine = { variantId?: unknown; quantity?: unknown };
type RequestBody = {
  customer?: { name?: unknown; phone?: unknown; comment?: unknown };
  lines?: RequestLine[];
  website?: unknown;
  idempotencyKey?: unknown;
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

    const key = typeof body.idempotencyKey === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.idempotencyKey) ? body.idempotencyKey : crypto.randomUUID();
    const normalizedLines = [...quantities].sort(([left], [right]) => left.localeCompare(right)).map(([variantId, quantity]) => ({ variantId, quantity }));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ name, phone, comment, lines: normalizedLines })));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const { data: orderNumber, error } = await admin.rpc('create_order_request_atomic', {
      p_key: key, p_hash: hash, p_name: name, p_phone: phone, p_comment: comment, p_lines: normalizedLines,
    });
    if (error || !orderNumber) return response({ error: 'Demande impossible : vérifiez les disponibilités ou contactez la boutique avant de réessayer.' }, 409);
    return response({ orderNumber }, 201);
  } catch (error) {
    console.error('create-order-request failed', error instanceof Error ? error.name : 'unknown');
    return response({ error: 'La commande n’a pas pu être enregistrée. Réessaie dans un instant.' }, 500);
  }
});
