import { paymentDeployment } from '@/lib/payments/fedapay';
import { operationsDatabase } from '@/lib/payments/operations';
import { HttpInputError, readLimitedBody, requireJsonRequest } from '@/lib/payments/read-body';
import { parseResendEvent, verifyResendWebhook } from '@/lib/payments/resend-webhook';

export const runtime = 'nodejs';

/** Resend delivery events. Signature first; nothing from the body is logged. */
export async function POST(request: Request) {
  const deployment = paymentDeployment();
  if (deployment.context !== 'production' && (
    deployment.context !== 'deploy-preview'
    || process.env.SITE_ORIGIN !== 'https://deploy-preview-14--pyjamas25.netlify.app'
    || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://oxhymanjibveayhcaqvj.supabase.co'
    || process.env.PAYMENT_DATABASE_ISOLATED !== 'true'
  )) return new Response(null, { status: 404 });
  try {
    requireJsonRequest(request);
    const raw = await readLimitedBody(request, 64000);
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return Response.json({ error: 'Signature non configurée.' }, { status: 503 });
    const id = request.headers.get('svix-id');
    if (!verifyResendWebhook(raw, { id, timestamp: request.headers.get('svix-timestamp'), signature: request.headers.get('svix-signature') }, secret)) {
      return Response.json({ error: 'Signature invalide.' }, { status: 400 });
    }
    const event = parseResendEvent(raw);
    // Signed but not an e-mail event we track: acknowledge so the provider stops retrying.
    if (!event) return Response.json({ received: true });
    const { data, error } = await operationsDatabase().rpc('record_email_delivery_event', {
      p_event_id: id, p_message_id: event.messageId, p_type: event.type, p_at: event.occurredAt,
    });
    if (error) throw new Error('queue_unavailable');
    return Response.json({ received: true, result: data });
  } catch (error) {
    if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error('resend_webhook_failed');
    return Response.json({ error: 'Événement temporairement non traité.' }, { status: 503 });
  }
}
