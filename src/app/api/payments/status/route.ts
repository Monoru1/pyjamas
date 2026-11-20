import { UUID_PATTERN } from '@/lib/payments/read-body';
import { createClient } from '@/lib/supabase/server';
import { existingPaymentsConfiguration } from '@/lib/payments/fedapay';
import { paymentDatabase, reconcilePayment } from '@/lib/payments/server';
export const runtime = 'nodejs';

const orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
const unsettled = ['pending', 'failed', 'cancelled'];
/** At most one tracking-triggered FedaPay read per payment in this window (scheduled runs count too). */
const RECHECK_INTERVAL_MS = 30_000;

type Attempt = { id: string; status: string; amount_xof: number; environment: string; provider_id: number | null; expires_at: string | null; updated_at: string; orders: unknown };

/**
 * Tracking of an EXISTING order. Access is only through the secret tracking
 * reference (random UUID), never the order number. It does not depend on
 * new-sales admission: a closed checkout must not hide a paid order.
 *
 * `recheck=1` (return from FedaPay, manual refresh) lets the server re-read the
 * transaction from FedaPay, which is the only authority. The browser's return
 * parameters are never trusted as a payment result.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get('reference') ?? '';
  if (!UUID_PATTERN.test(token)) return Response.json({ error: 'Référence invalide.' }, { status: 400 });
  try {
    const config = existingPaymentsConfiguration();
    if (config.liveTest) { const auth = await createClient(); const { data: { user } } = await auth.auth.getUser(); if (!user || !(await auth.rpc('is_admin')).data) return Response.json({ error: 'Accès réservé au personnel.' }, { status: 403 }); }
    const db = paymentDatabase();
    const read = async () => {
      const { data, error } = await db.from('payment_attempts').select('id,status,amount_xof,environment,provider_id,expires_at,updated_at,order_id,orders(order_number,needs_attention,status)')
        .eq('public_token', token).eq('environment', config.environment).maybeSingle();
      if (error) throw new Error('tracking_unavailable');
      return data as Attempt | null;
    };
    let data = await read();
    if (!data) return Response.json({ error: 'Paiement introuvable.' }, { status: 404 });
    let checkedNow = false;
    if (params.get('recheck') === '1' && data.provider_id && unsettled.includes(data.status)) {
      // Atomic claim: concurrent tabs or a scheduled run cannot multiply provider reads.
      const now = Date.now();
      const { data: claimed, error: claimError } = await db.from('payment_attempts').update({ updated_at: new Date(now).toISOString() })
        .eq('id', data.id).in('status', unsettled).lt('updated_at', new Date(now - RECHECK_INTERVAL_MS).toISOString()).select('id');
      if (!claimError && claimed?.length === 1) {
        try { await reconcilePayment(data.id, `tracking:${crypto.randomUUID()}`); checkedNow = true; }
        catch { console.error('payment_tracking_recheck_failed', { paymentId: data.id }); }
        data = (await read()) ?? data;
      }
    }
    const raw = (Array.isArray(data.orders) ? data.orders[0] : data.orders) as { order_number?: string; needs_attention?: boolean; status?: string } | null;
    // Logistics are shown only once the provider confirmed the payment.
    const order = raw ? { order_number: raw.order_number, needs_attention: Boolean(raw.needs_attention),
      ...(data.status === 'paid' && raw.status && orderStatuses.includes(raw.status) ? { status: raw.status } : {}) } : null;
    return Response.json({ status: data.status, amount: data.amount_xof, mode: data.environment, liveTest: config.liveTest, order,
      // Reservation deadline of an unsettled attempt, so the page can say how long it stays resumable.
      ...(unsettled.includes(data.status) && data.expires_at ? { reservedUntil: new Date(data.expires_at).toISOString() } : {}),
      checkedNow }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch { return Response.json({ error: 'Vérification momentanément indisponible.' }, { status: 503 }); }
}
