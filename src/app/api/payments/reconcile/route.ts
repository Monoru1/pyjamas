import { timingSafeEqual } from 'node:crypto';
import { paymentDatabase, reconcilePayment } from '@/lib/payments/server';
import { existingPaymentsConfiguration } from '@/lib/payments/fedapay';
import { processNotificationJobs } from '@/lib/payments/notifications';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const expected = process.env.PAYMENT_RECONCILE_SECRET;
  const received = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!expected || !received || Buffer.byteLength(expected) !== Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  let checked = 0;
  let attempted = 0;
  let paymentsFailed = false;
  if (process.env.FEDAPAY_ENABLED === 'true') {
    try {
      const db = paymentDatabase();
      const environment = existingPaymentsConfiguration().environment;
      const dueAt = new Date().toISOString();
      // Keep the batch small enough for the scheduled function to finish. Four per 5-minute run
      // (Terrain 16): with 30-minute reservations, overdue holds must be closed promptly.
      const { data, error } = await db.from('payment_attempts').select('id,provider_id')
        .eq('environment', environment).not('order_id', 'is', null)
        .lte('next_reconcile_at', dueAt).order('next_reconcile_at').limit(4);
      if (error) throw error;
      for (const item of data ?? []) {
        const retryAt = new Date(Date.now() + 600_000).toISOString();
        // Claim only work still due. A concurrent run or a webhook may already have moved it.
        const { data: claimed, error: claimError } = await db.from('payment_attempts')
          .update({ next_reconcile_at: retryAt }).eq('id', item.id)
          .lte('next_reconcile_at', dueAt).select('id');
        if (claimError) { paymentsFailed = true; continue; }
        if (claimed?.length !== 1) continue;
        attempted++;
        try {
          if (!item.provider_id) throw new Error('provider_association_missing');
          await reconcilePayment(item.id, `reconcile:${crypto.randomUUID()}`);
          checked++;
        } catch {
          // If a webhook reconciled the payment in the meantime, preserve its result.
          await db.from('payment_attempts').update({
            last_error: item.provider_id ? 'reconciliation_failed' : 'provider_association_missing',
          }).eq('id', item.id).eq('next_reconcile_at', retryAt);
          console.error('payment_reconciliation_failed', { paymentId: item.id });
        }
      }
    } catch {
      paymentsFailed = true;
    }
  }
  try {
    const sent = await processNotificationJobs(2);
    if (paymentsFailed) return Response.json({ error: 'Réconciliation indisponible.' }, { status: 503 });
    return Response.json({ checked, attempted, notificationsSent: sent });
  } catch {
    return Response.json({ error: 'Réconciliation indisponible.' }, { status: 503 });
  }
}
