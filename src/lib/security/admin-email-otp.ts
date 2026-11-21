import 'server-only';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { getPublicEnv } from '@/lib/env';

export type AdminOtpIdentity = { userId: string; sessionId: string };
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const ADMIN_EMAIL_CODE = /^[0-9]{6}$/;

export function adminOtpIdentity(claims: { sub?: unknown; session_id?: unknown; amr?: unknown }): AdminOtpIdentity | null {
  const { sub, session_id: session, amr } = claims;
  if (typeof sub !== 'string' || !UUID.test(sub) || typeof session !== 'string' || !UUID.test(session)
      || !Array.isArray(amr) || !amr.some(entry => entry?.method === 'password')) return null;
  return { userId: sub, sessionId: session };
}

function otpSecret(value = process.env.ADMIN_EMAIL_OTP_SECRET) {
  return value && /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : null;
}

function digest(identity: AdminOtpIdentity, code: string, secret: Buffer) {
  return createHmac('sha256', secret)
    .update(`admin-email-otp:v1:${identity.userId}:${identity.sessionId}:${code}`).digest('hex');
}

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('admin_otp_database_unavailable');
  return createSupabaseClient<Database>(getPublicEnv().supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function sendCode(to: string, code: string, challengeId: string) {
  const from = process.env.ORDER_EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;
  if (!from || !apiKey) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `admin-otp-${challengeId}`,
      },
      body: JSON.stringify({
        from, to,
        subject: 'Votre code de connexion — La Maison des Pyjamas',
        text: [
          `Votre code de connexion est ${code}.`,
          'Ce code expire dans 5 minutes. Ne le partagez jamais.',
          'Si vous n’avez pas demandé cette connexion, aucune action n’est nécessaire.',
        ].join('\n\n'),
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return !!body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' && !!body.id.trim();
  } catch {
    return false;
  }
}

export async function requestAdminEmailOtp(identity: AdminOtpIdentity): Promise<boolean> {
  const db = serviceClient();
  const secret = otpSecret();
  for (let attempt = 0; attempt < 3; attempt++) {
    const challengeId = randomUUID();
    const code = String(randomInt(1_000_000)).padStart(6, '0');
    // Even without a secret, record that the session entered the pilot. It remains blocked.
    const issued = await db.rpc('issue_admin_email_otp', {
      p_user: identity.userId, p_session: identity.sessionId, p_challenge: challengeId,
      p_digest: secret ? digest(identity, code, secret) : null,
    });
    if (issued.error || !issued.data || typeof issued.data !== 'object' || Array.isArray(issued.data)) return false;
    if (issued.data.retry === true) continue;
    if (typeof issued.data.recipient !== 'string') return false;
    const accepted = await sendCode(issued.data.recipient, code, challengeId);
    const completed = await db.rpc('finish_admin_email_otp_delivery', {
      p_user: identity.userId, p_session: identity.sessionId, p_challenge: challengeId, p_accepted: accepted,
    });
    return !completed.error && completed.data === true;
  }
  return false;
}

export async function verifyAdminEmailOtp(identity: AdminOtpIdentity, code: string): Promise<boolean> {
  const secret = otpSecret();
  if (!secret || !ADMIN_EMAIL_CODE.test(code)) return false;
  const { data, error } = await serviceClient().rpc('verify_admin_email_otp', {
    p_user: identity.userId, p_session: identity.sessionId, p_digest: digest(identity, code, secret),
  });
  return !error && data === true;
}
