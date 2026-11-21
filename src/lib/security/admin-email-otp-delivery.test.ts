import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { adminOtpIdentity, requestAdminEmailOtp, verifyAdminEmailOtp } from './admin-email-otp';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }));
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({ supabaseUrl: 'https://fixture.supabase.co' }) }));

const identity = { userId: 'a0000000-0000-4000-8000-000000000001', sessionId: 'a0000000-0000-4000-8000-000000000002' };
const address = 'admin@example.test';
let contents: { from: string; to: string; subject: string; text: string };
let sent = 0;
function provider(status: number) {
  vi.stubGlobal('fetch', vi.fn(async (_url: URL, init: RequestInit) => {
    contents = JSON.parse(String(init.body));
    sent++;
    return Response.json({ id: status === 200 ? 'provider-id-fixture' : null }, { status });
  }));
}

beforeEach(() => {
  vi.stubEnv('ADMIN_EMAIL_OTP_SECRET', 'ab'.repeat(32));
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-server-key');
  vi.stubEnv('RESEND_API_KEY', 'fixture-resend-key');
  vi.stubEnv('ORDER_EMAIL_FROM', 'Fixture <fixture@example.test>');
  rpc.mockReset();
  sent = 0;
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('only accepts claims from Supabase password sessions', () => {
  const claims = { sub: identity.userId, session_id: identity.sessionId, amr: [{ method: 'password' }] };
  expect(adminOtpIdentity(claims)).toEqual(identity);
  expect(adminOtpIdentity({ ...claims, amr: [{ method: 'otp' }] })).toBeNull();
  expect(adminOtpIdentity({ ...claims, session_id: undefined })).toBeNull();
});

it('sends a six-digit code only to the database-bound address and passes only the digest through RPC', async () => {
  provider(200);
  rpc.mockResolvedValueOnce({ data: { recipient: address } }).mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: true });
  expect(await requestAdminEmailOtp(identity)).toBe(true);
  expect(sent).toBe(1);
  expect(contents).toMatchObject({ to: address, subject: 'Votre code de connexion — La Maison des Pyjamas' });
  expect(contents.text).not.toMatch(/https?:/);
  const code = contents.text.match(/\b[0-9]{6}\b/)?.[0] ?? '';
  expect(code).toHaveLength(6);
  const issueParams = rpc.mock.calls[0][1];
  expect(issueParams).toMatchObject({ p_user: identity.userId, p_session: identity.sessionId, p_digest: expect.stringMatching(/^[0-9a-f]{64}$/) });
  expect(await verifyAdminEmailOtp(identity, code)).toBe(true);
  expect(rpc.mock.calls[2]).toEqual(['verify_admin_email_otp', {
    p_user: identity.userId, p_session: identity.sessionId, p_digest: issueParams.p_digest,
  }]);
});

it('marks provider rejection as failure and never sends when eligibility or configuration is missing', async () => {
  provider(503);
  rpc.mockResolvedValueOnce({ data: { recipient: address } }).mockResolvedValueOnce({ data: false }).mockResolvedValueOnce({ data: null });
  expect(await requestAdminEmailOtp(identity)).toBe(false);
  expect(rpc.mock.calls[1]).toEqual(['finish_admin_email_otp_delivery', expect.objectContaining({ p_accepted: false })]);
  vi.stubEnv('ADMIN_EMAIL_OTP_SECRET', '');
  expect(await requestAdminEmailOtp(identity)).toBe(false);
  expect(rpc.mock.calls[2]).toEqual(['issue_admin_email_otp', expect.objectContaining({ p_digest: null })]);
  expect(sent).toBe(1);
});
