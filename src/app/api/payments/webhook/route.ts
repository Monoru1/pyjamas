import { readLimitedBody, requireJsonRequest, HttpInputError, UUID_PATTERN } from '@/lib/payments/read-body';
import { paymentConfiguration, verifyWebhook } from '@/lib/payments/fedapay';
import { paymentDatabase, reconcilePayment } from '@/lib/payments/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    requireJsonRequest(request);
    const raw = await readLimitedBody(request, 64000);
    const config = paymentConfiguration();
    if (!verifyWebhook(raw, request.headers.get('x-fedapay-signature'), config.webhookSecret)) return Response.json({ error: 'Signature invalide.' }, { status: 400 });
    const event = JSON.parse(raw) as { id?: unknown; name?: unknown; entity?: { id?: unknown; custom_metadata?: { payment_id?: unknown } } };
    if (!Number.isSafeInteger(event.id) || !Number.isSafeInteger(event.entity?.id)) return Response.json({ error: 'Événement invalide.' }, { status: 400 });
    if (typeof event.name !== 'string' || !event.name.startsWith('transaction.')) return Response.json({ received: true });
    const db = paymentDatabase();
    const { data, error } = await db.from('payment_attempts').select('id').eq('provider_id', event.entity!.id).eq('environment', config.environment).maybeSingle();
    if (error) throw new Error('Base indisponible.');
    // Return retryable error for a webhook that overtakes the provider-id persistence.
    const candidate = event.entity?.custom_metadata?.payment_id;
    const id = data?.id ?? (typeof candidate === 'string' && UUID_PATTERN.test(candidate) ? candidate : null);
    if (!id) return Response.json({ error: 'Transaction non encore associée.' }, { status: 503 });
    await reconcilePayment(id, `fedapay:${event.id}`, event.entity!.id as number);
    return Response.json({ received: true });
  } catch (error) { console.error('payment_webhook_failed'); if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status }); return Response.json({ error: 'Notification temporairement non traitée.' }, { status: 503 }); }
}
