/**
 * Terrain 16 — persistent but bounded administrator sessions (Supabase Auth only, no parallel system).
 *
 * - The browser keeps the Supabase session cookies for at most 30 days (instead of the
 *   @supabase/ssr default of 400 days); short access tokens keep being refreshed by Supabase.
 * - The 30 days are counted from the last PRIMARY authentication (password, e-mail OTP, recovery
 *   link) recorded by Supabase in the JWT `amr` claim, never from the last refresh: refreshing or
 *   re-entering a TOTP code does not extend it. The database enforces the same limit
 *   (private.admin_assurance_ok), so an old token is refused even outside the app.
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Second-factor methods never restart the 30-day window. */
const SECOND_FACTORS = new Set(['totp', 'phone', 'webauthn', 'mfa/totp', 'mfa/phone', 'mfa/webauthn']);

export function supabaseCookieOptions(production = process.env.NODE_ENV === 'production') {
  return { path: '/', sameSite: 'lax' as const, secure: production, maxAge: ADMIN_SESSION_MAX_AGE_SECONDS };
}

/** The SSR SDK applies its own default maxAge before calling the cookie adapter. */
export function capAdminCookieAge<T extends { maxAge?: number }>(options: T): T {
  return options.maxAge !== undefined && options.maxAge > ADMIN_SESSION_MAX_AGE_SECONDS
    ? { ...options, maxAge: ADMIN_SESSION_MAX_AGE_SECONDS }
    : options;
}

type AmrEntry = { method?: unknown; timestamp?: unknown };

/** Unix seconds of the latest primary authentication in the `amr` claim, or null. */
export function primaryAuthenticatedAt(claims: { amr?: unknown } | null | undefined): number | null {
  if (!claims || !Array.isArray(claims.amr)) return null;
  const times = (claims.amr as AmrEntry[])
    .filter(entry => typeof entry?.method === 'string' && !SECOND_FACTORS.has(entry.method))
    .map(entry => Number(entry.timestamp))
    .filter(value => Number.isSafeInteger(value) && value > 0);
  return times.length ? Math.max(...times) : null;
}

/** True when the session must be re-authenticated (no primary authentication, or older than 30 days). */
export function adminSessionExpired(claims: { amr?: unknown } | null | undefined, now = Math.floor(Date.now() / 1000)) {
  const at = primaryAuthenticatedAt(claims);
  return at === null || at > now + 300 || now - at >= ADMIN_SESSION_MAX_AGE_SECONDS;
}
