/**
 * Terrain 16 · SEC-011 — MFA gate for the two administrative accounts.
 *
 * - An account that already has a verified factor must always pass AAL2 (Supabase reports
 *   nextLevel = 'aal2'): a stolen password alone no longer opens the back-office.
 * - When ADMIN_MFA_REQUIRED=true (set only once BOTH holders have enrolled), an account
 *   without a factor is sent to enrolment instead of the back-office.
 * The database enforces the same rule independently (public.is_admin(), private.security_flags).
 */
export type AssuranceLevels = { currentLevel: string | null; nextLevel: string | null } | null | undefined;
export type MfaGate = 'ok' | 'verify' | 'enroll';

export function adminMfaRequired(value = process.env.ADMIN_MFA_REQUIRED) {
  return value === 'true';
}

export function adminMfaGate(levels: AssuranceLevels, required = adminMfaRequired()): MfaGate {
  const current = levels?.currentLevel ?? null;
  const next = levels?.nextLevel ?? null;
  if (current === 'aal2') return 'ok';
  if (next === 'aal2') return 'verify';
  return required ? 'enroll' : 'ok';
}

export const ADMIN_MFA_PATH = '/admin/mfa';
