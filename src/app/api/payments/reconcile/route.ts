import { timingSafeEqual } from 'node:crypto';
import { paymentDatabase, reconcilePayment } from '@/lib/payments/server';
import { paymentConfiguration } from '@/lib/payments/fedapay';
import { processNotificationJobs } from '@/lib/payments/notifications';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const expected = process.env.PAYMENT_RECONCILE_SECRET;
  const received = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!expected || !received || Buffer.byteLength(expected) !== Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  try {
    const db = paymentDatabase();
    const environment = paymentConfiguration().environment;
    // Bound runtime to Netlify's 60s limit; fair rotation includes failures.
    const { data, error } = await db.from('payment_attempts').select('id,provider_id,initialization_started_at').eq('environment', environment).not('order_id', 'is', null).lte('next_reconcile_at', new Date().toISOString()).order('next_reconcile_at').limit(2);
    if (error) throw error;
    let checked = 0;
    for (const item of data ?? []) {
      await db.from('payment_attempts').update({ next_reconcile_at: new Date(Date.now() + 600_000).toISOString() }).eq('id', item.id);
      try {
        if (!item.provider_id) throw new Error('provider_association_missing');
        await reconcilePayment(item.id, `reconcile:${crypto.randomUUID()}`); checked++;
      } catch {
        await db.from('payment_attempts').update({ last_error: item.provider_id ? 'reconciliation_failed' : 'provider_association_missing' }).eq('id', item.id);
        console.error('payment_reconciliation_failed', { paymentId: item.id });
      }
    }
    const sent = await processNotificationJobs(2);
    return Response.json({ checked, attempted: data?.length ?? 0, notificationsSent: sent });
  } catch { return Response.json({ error: 'Réconciliation indisponible.' }, { status: 503 }); }
}
