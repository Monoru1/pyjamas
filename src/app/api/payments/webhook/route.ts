import { readLimitedBody, requireJsonRequest, HttpInputError, UUID_PATTERN } from '@/lib/payments/read-body';
import { existingPaymentsConfiguration, verifyWebhook } from '@/lib/payments/fedapay';
import { paymentDatabase, reconcilePayment } from '@/lib/payments/server';
export const runtime = 'nodejs';

type WebhookEvent = { id?: unknown; name?: unknown; entity?: { id?: unknown; updated_at?: unknown; custom_metadata?: { payment_id?: unknown } } };

/**
 * Stable deduplication key. Uses the event id when FedaPay sends one, otherwise
 * the event name, transaction id and provider update time (identical on retries,
 * different for each state change). The state itself is always re-read from FedaPay.
 */
function webhookEventKey(event: WebhookEvent) {
  if (typeof event.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(event.id)) return event.id;
  if (Number.isSafeInteger(event.id)) return String(event.id);
  if (typeof event.name !== 'string' || !/^transaction\.[a-z_]{1,40}$/.test(event.name)) return null;
  const updated = typeof event.entity?.updated_at === 'string' && /^[0-9T:.+\-Z]{10,40}$/.test(event.entity.updated_at) ? `:${event.entity.updated_at}` : '';
  return `${event.name}:${event.entity!.id}${updated}`;
}
export async function POST(request: Request) {
  try {
    requireJsonRequest(request);
    const raw = await readLimitedBody(request, 64000);
    const signingSecret=process.env.FEDAPAY_WEBHOOK_SECRET;
    if(!signingSecret)return Response.json({error:'Signature non configurée.'},{status:503});
    if (!verifyWebhook(raw, request.headers.get('x-fedapay-signature'), signingSecret)) return Response.json({ error: 'Signature invalide.' }, { status: 400 });
    const config = existingPaymentsConfiguration();
    const event = JSON.parse(raw) as WebhookEvent;
    // Real FedaPay Live deliveries carry no top-level id: only the entity id is required.
    if (!Number.isSafeInteger(event.entity?.id) || (event.entity!.id as number) < 1) return Response.json({ error: 'Événement invalide.' }, { status: 400 });
    if (typeof event.name !== 'string' || !event.name.startsWith('transaction.')) return Response.json({ received: true });
    const eventKey = webhookEventKey(event);
    if (!eventKey) return Response.json({ error: 'Événement invalide.' }, { status: 400 });
    const db = paymentDatabase();
    const { data, error } = await db.from('payment_attempts').select('id').eq('provider_id', event.entity!.id).eq('environment', config.environment).maybeSingle();
    if (error) throw new Error('Base indisponible.');
    // Return retryable error for a webhook that overtakes the provider-id persistence.
    const candidate = event.entity?.custom_metadata?.payment_id;
    const id = data?.id ?? (typeof candidate === 'string' && UUID_PATTERN.test(candidate) ? candidate : null);
    if (!id) return Response.json({ error: 'Transaction non encore associée.' }, { status: 503 });
    await reconcilePayment(id, `fedapay:${eventKey}`, event.entity!.id as number);
    return Response.json({ received: true });
  } catch (error) { console.error('payment_webhook_failed'); if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status }); return Response.json({ error: 'Notification temporairement non traitée.' }, { status: 503 }); }
}
