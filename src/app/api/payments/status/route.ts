import { UUID_PATTERN } from '@/lib/payments/read-body';
import { createClient } from '@/lib/supabase/server';
import { existingPaymentsConfiguration } from '@/lib/payments/fedapay';
import { paymentDatabase } from '@/lib/payments/server';
export const runtime = 'nodejs';

const orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

/**
 * Tracking of an EXISTING order. Access is only through the secret tracking
 * reference (random UUID), never the order number. It does not depend on
 * new-sales admission: a closed checkout must not hide a paid order.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('reference') ?? '';
  if (!UUID_PATTERN.test(token)) return Response.json({ error: 'Référence invalide.' }, { status: 400 });
  try {
    const config = existingPaymentsConfiguration();
    if (config.liveTest) { const auth = await createClient(); const { data: { user } } = await auth.auth.getUser(); if (!user || !(await auth.rpc('is_admin')).data) return Response.json({ error: 'Accès réservé au personnel.' }, { status: 403 }); }
    const db = paymentDatabase();
    const { data, error } = await db.from('payment_attempts').select('status,amount_xof,environment,order_id,orders(order_number,needs_attention,status)')
      .eq('public_token', token).eq('environment', config.environment).maybeSingle();
    if (error) throw new Error('tracking_unavailable');
    if (!data) return Response.json({ error: 'Paiement introuvable.' }, { status: 404 });
    const raw = (Array.isArray(data.orders) ? data.orders[0] : data.orders) as { order_number?: string; needs_attention?: boolean; status?: string } | null;
    // Logistics are shown only once the provider confirmed the payment.
    const order = raw ? { order_number: raw.order_number, needs_attention: Boolean(raw.needs_attention),
      ...(data.status === 'paid' && raw.status && orderStatuses.includes(raw.status) ? { status: raw.status } : {}) } : null;
    // A polling client cannot trigger provider reads: scheduled reconciliation and webhooks are authoritative.
    return Response.json({ status: data.status, amount: data.amount_xof, mode: data.environment, liveTest: config.liveTest, order }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch { return Response.json({ error: 'Vérification momentanément indisponible.' }, { status: 503 }); }
}
