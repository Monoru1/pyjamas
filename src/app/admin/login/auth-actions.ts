'use server';

import { createClient } from '@/lib/supabase/server';
import { adminOtpIdentity, requestAdminEmailOtp, verifyAdminEmailOtp } from '@/lib/security/admin-email-otp';

const genericFailure = 'Connexion impossible. Vérifiez vos informations et réessayez.';
const genericDelivery = 'Si un nouveau code peut être envoyé, vous le recevrez par e-mail.';
const genericCodeFailure = 'Code refusé ou expiré. Vérifiez le code ou demandez-en un nouveau.';

export async function adminPasswordSignIn(form: FormData) {
  const email = form.get('email');
  const password = form.get('password');
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) return { error: genericFailure };
  let db: Awaited<ReturnType<typeof createClient>> | undefined;
  let signedIn = false;
  try {
    db = await createClient();
    const signIn = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (signIn.error || !signIn.data.session) return { error: genericFailure };

    signedIn = true;
    const { data: claims } = await db.auth.getClaims(signIn.data.session.access_token);
    const identity = claims?.claims && adminOtpIdentity(claims.claims);
    const status = await db.rpc('admin_email_otp_status');
    if (!identity || status.error || !status.data || status.data === 'denied') {
      await db.auth.signOut({ scope: 'local' });
      return { error: genericFailure };
    }
    if (status.data === 'required' || form.get('pilot') === 'true') {
      await requestAdminEmailOtp(identity).catch(() => false);
      // If an infrastructure error prevented entering the pilot at all, discard this login.
      const after = await db.rpc('admin_email_otp_status');
      if (after.error || (after.data !== 'required' && after.data !== 'verified')) {
        await db.auth.signOut({ scope: 'local' });
        return { error: genericFailure };
      }
      return { destination: '/admin/mfa' } as const;
    }
    const { data: allowed } = await db.rpc('is_admin');
    return { destination: allowed ? '/admin' : '/admin/mfa' } as const;
  } catch {
    if (signedIn) await db?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    return { error: genericFailure };
  }
}

async function currentIdentity() {
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  return data?.claims ? adminOtpIdentity(data.claims) : null;
}

export async function resendAdminCode() {
  try {
    const identity = await currentIdentity();
    if (identity) await requestAdminEmailOtp(identity);
  } catch { /* Same response for every failed request. */ }
  return { message: genericDelivery };
}

export async function verifyAdminCode(form: FormData) {
  const code = form.get('code');
  if (typeof code !== 'string') return { error: genericCodeFailure };
  try {
    const identity = await currentIdentity();
    if (identity && await verifyAdminEmailOtp(identity, code.trim())) return { verified: true } as const;
  } catch { /* Never return any provider, session or code details. */ }
  return { error: genericCodeFailure };
}
