import { timingSafeEqual } from 'node:crypto';
import { paymentDatabase, reconcilePayment } from '@/lib/payments/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const expected = process.env.PAYMENT_RECONCILE_SECRET;
  const received = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!expected || !received || Buffer.byteLength(expected) !== Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  try {
    const db = paymentDatabase();
    const { data, error } = await db.from('payment_attempts').select('id').not('provider_id', 'is', null).order('updated_at').limit(25);
    if (error) throw error;
    let checked = 0;
    for (const item of data ?? []) {
      try { await reconcilePayment(item.id, `reconcile:${crypto.randomUUID()}`); checked++; } catch { /* Leave failed records retryable; do not leak provider data. */ }
    }
    return Response.json({ checked, attempted: data?.length ?? 0 });
  } catch { return Response.json({ error: 'Réconciliation indisponible.' }, { status: 503 }); }
}
