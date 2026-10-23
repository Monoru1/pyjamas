import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { readLimitedBody, requireJsonRequest, HttpInputError, UUID_PATTERN } from '../_shared/http.ts';
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
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

function response(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== 'https://pyjamas25.netlify.app') return response({ error: 'Origine non autorisée.' }, 403);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Méthode non autorisée.' }, 405);

  try {
    requireJsonRequest(request);
    const body = JSON.parse(await readLimitedBody(request, 12000)) as RequestBody;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return response({ error: 'Requête invalide.' }, 400);
    if (Object.keys(body).some(key => !['customer', 'lines', 'website', 'idempotencyKey'].includes(key))) return response({ error: 'Champs non autorisés.' }, 400);
    if (typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey)) return response({ error: 'Référence de demande invalide.' }, 400);
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
      if (!line || typeof line !== 'object' || Array.isArray(line) || Object.keys(line).some(key => !['variantId', 'quantity'].includes(key))) return response({ error: 'Ligne invalide.' }, 400);
      const variantId = typeof line.variantId === 'string' ? line.variantId : '';
      const quantity = line.quantity;
      if (!UUID_PATTERN.test(variantId) || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
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

    const key = body.idempotencyKey;
    // A server-keyed contact fingerprint avoids storing raw contact details in the rate counter.
    // Origin is only a browser control, never authentication or protection against scripted callers.
    const budgetKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(serviceRoleKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', budgetKey, new TextEncoder().encode('order-budget:' + phone));
    const subject = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
    const { data: budgetAllowed, error: budgetError } = await admin.rpc('consume_order_request_budget', { p_subject: subject });
    if (budgetError) return response({ error: 'Service momentanément indisponible.' }, 503);
    if (!budgetAllowed) return new Response(JSON.stringify({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }), { status: 429, headers: { ...corsHeaders, 'Retry-After': '300' } });
    const normalizedLines = [...quantities].sort(([left], [right]) => left.localeCompare(right)).map(([variantId, quantity]) => ({ variantId, quantity }));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ name, phone, comment, lines: normalizedLines })));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const { data: orderNumber, error } = await admin.rpc('create_order_request_atomic', {
      p_key: key, p_hash: hash, p_name: name, p_phone: phone, p_comment: comment, p_lines: normalizedLines,
    });
    if (error || !orderNumber) return response({ error: 'Demande impossible : vérifiez les disponibilités ou contactez la boutique avant de réessayer.' }, 409);
    return response({ orderNumber }, 201);
  } catch (error) {
    if (error instanceof HttpInputError) return response({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return response({ error: 'JSON invalide.' }, 400);
    console.error('create-order-request failed', error instanceof Error ? error.name : 'unknown');
    return response({ error: 'La commande n’a pas pu être enregistrée. Réessaie dans un instant.' }, 500);
  }
});
