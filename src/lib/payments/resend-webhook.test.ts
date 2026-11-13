import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/payments/operations', () => ({ operationsDatabase: () => ({ rpc: mocks.rpc }) }));
import { POST } from '@/app/api/notifications/resend/route';
import { parseResendEvent, verifyResendWebhook } from './resend-webhook';
import { notificationState, notificationSummary } from '@/lib/orders/notification-status';

const key = Buffer.from('fixture-signing-key-0123456789');
const secret = `whsec_${key.toString('base64')}`;
const body = JSON.stringify({ type: 'email.delivered', created_at: '2026-11-13T12:00:00.000Z',
  data: { email_id: 'a1b2c3d4-0000-4000-8000-000000000001', to: ['buyer@example.test'], subject: 'Privé' } });
const sign = (payload: string, id = 'msg_1', at = Math.floor(Date.now() / 1000), with_ = key) =>
  ({ id, timestamp: String(at), signature: `v1,${createHmac('sha256', with_).update(`${id}.${at}.${payload}`).digest('base64')}` });
const request = (payload: string, headers: { id: string; timestamp: string; signature: string }) =>
  new Request('https://deploy-preview-14--pyjamas25.netlify.app/api/notifications/resend', { method: 'POST', body: payload,
    headers: { 'content-type': 'application/json', 'svix-id': headers.id, 'svix-timestamp': headers.timestamp, 'svix-signature': headers.signature } });

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('RESEND_WEBHOOK_SECRET', secret); mocks.rpc.mockResolvedValue({ data: 'delivered', error: null }); });
afterEach(() => vi.unstubAllEnvs());

it('accepts only a fresh, correctly signed raw body', () => {
  const good = sign(body);
  expect(verifyResendWebhook(body, good, secret)).toBe(true);
  expect(verifyResendWebhook(body, { ...good, signature: `v1,AAAA ${good.signature}` }, secret)).toBe(true);
  expect(verifyResendWebhook(`${body} `, good, secret)).toBe(false);
  expect(verifyResendWebhook(body, sign(body, 'msg_1', undefined, Buffer.from('another-signing-key-000000')), secret)).toBe(false);
  expect(verifyResendWebhook(body, sign(body, 'msg_1', Math.floor(Date.now() / 1000) - 600), secret)).toBe(false);
  expect(verifyResendWebhook(body, { ...good, signature: good.signature.replace('v1,', 'v2,') }, secret)).toBe(false);
  expect(verifyResendWebhook(body, good, undefined)).toBe(false);
  expect(verifyResendWebhook(body, { ...good, id: null }, secret)).toBe(false);
});

it('keeps identifiers and time only, never recipient or subject', () => {
  expect(parseResendEvent(body)).toEqual({ type: 'email.delivered', messageId: 'a1b2c3d4-0000-4000-8000-000000000001', occurredAt: '2026-11-13T12:00:00.000Z' });
  expect(parseResendEvent('{"type":"contact.created","created_at":"2026-11-13T12:00:00Z","data":{}}')).toBeNull();
  expect(parseResendEvent('not json')).toBeNull();
});

it('webhook route rejects unsigned or unconfigured calls and records a signed event once', async () => {
  expect((await POST(request(body, { id: 'msg_1', timestamp: '1', signature: 'v1,AAAA' }))).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
  vi.stubEnv('RESEND_WEBHOOK_SECRET', '');
  expect((await POST(request(body, sign(body)))).status).toBe(503);
  vi.stubEnv('RESEND_WEBHOOK_SECRET', secret);
  const ok = await POST(request(body, sign(body, 'msg_2')));
  expect(ok.status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('record_email_delivery_event', {
    p_event_id: 'msg_2', p_message_id: 'a1b2c3d4-0000-4000-8000-000000000001', p_type: 'email.delivered', p_at: '2026-11-13T12:00:00.000Z' });
  expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('buyer@example.test');
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
  expect((await POST(request(body, sign(body, 'msg_3')))).status).toBe(503);
});

it('never labels a provider acceptance as a delivery', () => {
  expect(notificationState('pending').label).toBe('En attente');
  expect(notificationState('sending').label).toBe('En cours');
  expect(notificationState('sent').label).toBe('Accepté par Resend');
  expect(notificationState('sent', 'delivery_delayed').tone).toBe('accepted');
  expect(notificationState('sent', 'delivered').label).toBe('Livré');
  expect(notificationState('sent', 'bounced')).toEqual({ label: 'Rejeté par le destinataire', tone: 'failed' });
  expect(notificationState('blocked').label).toBe('Échec');
  const row = { notification_total: 3, notification_failed: 0, notification_waiting: 0, notification_accepted: 1, notification_delivered: 2 };
  expect(notificationSummary(row).tone).toBe('accepted');
  expect(notificationSummary({ ...row, notification_accepted: 0, notification_delivered: 3 }).tone).toBe('delivered');
  expect(notificationSummary({ ...row, notification_failed: 1 }).tone).toBe('failed');
  expect(notificationSummary({ ...row, notification_total: 0 }).label).toBe('Aucune');
});
