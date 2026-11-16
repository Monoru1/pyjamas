import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECONDS = 300;

/**
 * Resend signs webhooks with Svix: HMAC-SHA256 over `${id}.${timestamp}.${rawBody}` with the
 * base64 key that follows `whsec_`. The header may carry several space-separated `v1,<sig>`.
 */
export function verifyResendWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string | undefined,
  now = Date.now(),
) {
  if (!secret?.startsWith('whsec_') || !headers.id || !headers.timestamp || !headers.signature) return false;
  if (!/^[\w.:-]{1,200}$/.test(headers.id) || !/^\d{1,12}$/.test(headers.timestamp)) return false;
  if (Math.abs(now / 1000 - Number(headers.timestamp)) > TOLERANCE_SECONDS) return false;
  const key = Buffer.from(secret.slice(6), 'base64');
  if (key.length < 16) return false;
  const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest();
  return headers.signature.split(' ').some(part => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const received = Buffer.from(value, 'base64');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

/** Keeps identifiers and timestamps only: recipient, subject and content are dropped. */
export function parseResendEvent(rawBody: string) {
  let event: { type?: unknown; created_at?: unknown; data?: { email_id?: unknown } };
  try { event = JSON.parse(rawBody); } catch { return null; }
  if (typeof event?.type !== 'string' || !/^email\.[a-z_]{1,40}$/.test(event.type)) return null;
  const messageId = event.data?.email_id;
  const at = typeof event.created_at === 'string' ? Date.parse(event.created_at) : NaN;
  if (typeof messageId !== 'string' || !/^[\w-]{1,200}$/.test(messageId) || Number.isNaN(at)) return null;
  return { type: event.type, messageId, occurredAt: new Date(at).toISOString() };
}
