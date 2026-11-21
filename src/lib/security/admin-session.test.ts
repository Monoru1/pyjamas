import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ADMIN_SESSION_MAX_AGE_SECONDS, adminSessionExpired, primaryAuthenticatedAt, supabaseCookieOptions } from './admin-session';
import { ADMIN_MANAGER_ID, ADMIN_OWNER_ID, commerceDatabase, sessionClaims } from '@/lib/payments/test-support/commerce-db';

// Terrain 16 — persistent (30 days) yet bounded and revocable administrator sessions.
const DAY = 24 * 3600;
const now = 1_800_000_000;
const amr = (...entries: [string, number][]) => ({ amr: entries.map(([method, age]) => ({ method, timestamp: now - age })) });

it('counts 30 days from the last primary authentication, never from a refresh or a TOTP re-entry', () => {
  expect(ADMIN_SESSION_MAX_AGE_SECONDS).toBe(30 * DAY);
  expect(primaryAuthenticatedAt(amr(['totp', 10], ['password', 5 * DAY]))).toBe(now - 5 * DAY);
  expect(adminSessionExpired(amr(['password', 30 * DAY - 60]), now)).toBe(false);
  expect(adminSessionExpired(amr(['password', 30 * DAY]), now)).toBe(true);
  expect(adminSessionExpired(amr(['totp', 60], ['password', 31 * DAY]), now)).toBe(true);
  expect(adminSessionExpired(amr(['recovery', DAY]), now)).toBe(false);
});

it('treats a missing, malformed or future authentication time as expired', () => {
  for (const claims of [null, {}, { amr: 'password' }, amr(['totp', 10]), { amr: [{ method: 'password', timestamp: 'x' }] }, amr(['password', -3600])])
    expect(adminSessionExpired(claims as never, now)).toBe(true);
});

it('keeps Supabase cookies 30 days (not the 400-day default), Secure in production', () => {
  expect(supabaseCookieOptions(true)).toEqual({ path: '/', sameSite: 'lax', secure: true, maxAge: 30 * DAY });
  expect(supabaseCookieOptions(false).secure).toBe(false);
});

describe('database enforcement', () => {
  let db: Awaited<ReturnType<typeof commerceDatabase>>;
  const check = async (claims: Record<string, unknown>) => db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)", [claims.sub, JSON.stringify(claims)]);
    await tx.exec('set local role authenticated');
    const allowed = (await tx.query<{ ok: boolean }>('select is_admin() ok')).rows[0].ok;
    const customers = (await tx.query('select id from customers')).rows.length;
    return { allowed, customers };
  });
  beforeAll(async () => {
    db = await commerceDatabase();
    await db.query("insert into customers(id,full_name,phone,country) values ($1,'Client fictif','22901000000','BJ')", [randomUUID()]);
  }, 60000);
  afterAll(async () => { await db.close(); });

  it('a refreshed access token of the same session keeps the administrative rights', async () => {
    const first = await sessionClaims(db, ADMIN_MANAGER_ID, { ageSeconds: 9 * DAY });
    expect(await check(first)).toEqual({ allowed: true, customers: 1 });
    // Refresh: Supabase issues a new token for the SAME session with the same amr.
    const refreshed = { ...first, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 };
    expect(await check(refreshed)).toEqual({ allowed: true, customers: 1 });
  });

  it('refuses a signed-out or revoked session immediately, even with an unexpired token', async () => {
    const claims = await sessionClaims(db, ADMIN_OWNER_ID);
    expect((await check(claims)).allowed).toBe(true);
    await db.query('delete from auth.sessions where id=$1', [claims.session_id]); // signOut local/others/global
    expect(await check(claims)).toEqual({ allowed: false, customers: 0 });
  });

  it('refuses a session past a Supabase time-box (not_after)', async () => {
    const claims = await sessionClaims(db, ADMIN_OWNER_ID);
    await db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1", [claims.session_id]);
    expect((await check(claims)).allowed).toBe(false);
  });

  it('stops at 30 days after the password, then a new sign-in restores access', async () => {
    expect((await check(await sessionClaims(db, ADMIN_MANAGER_ID, { ageSeconds: 30 * DAY - 120 }))).allowed).toBe(true);
    const old = await sessionClaims(db, ADMIN_MANAGER_ID, { ageSeconds: 30 * DAY + 1 });
    expect(await check(old)).toEqual({ allowed: false, customers: 0 });
    // Re-entering a TOTP code on the old session does not extend it.
    expect((await check({ ...old, aal: 'aal2', amr: [{ method: 'totp', timestamp: Math.floor(Date.now() / 1000) }, ...(old.amr as object[])] })).allowed).toBe(false);
    expect((await check(await sessionClaims(db, ADMIN_MANAGER_ID))).allowed).toBe(true);
  });

  it('refuses forged or incomplete claims and a session of another user', async () => {
    const claims = await sessionClaims(db, ADMIN_OWNER_ID);
    for (const forged of [{ ...claims, session_id: undefined }, { ...claims, session_id: 'not-a-uuid' }, { ...claims, amr: undefined },
      { ...claims, session_id: (await sessionClaims(db, ADMIN_MANAGER_ID)).session_id }])
      expect((await check(forged)).allowed).toBe(false);
  });

  it('requires AAL2 for an enrolled account before MFA becomes mandatory globally', async () => {
    await db.query("insert into auth.mfa_factors(user_id,status) values ($1,'verified'),($2,'unverified')", [ADMIN_OWNER_ID, ADMIN_MANAGER_ID]);
    try {
      expect(await check(await sessionClaims(db, ADMIN_OWNER_ID))).toEqual({ allowed: false, customers: 0 });
      expect(await check(await sessionClaims(db, ADMIN_OWNER_ID, { aal: 'aal2' }))).toEqual({ allowed: true, customers: 1 });
      expect(await check(await sessionClaims(db, ADMIN_MANAGER_ID))).toEqual({ allowed: true, customers: 1 });
    } finally { await db.exec('delete from auth.mfa_factors'); }
  });

  it('requires AAL2 on a valid persistent session once MFA is mandatory, for both administrators', async () => {
    await db.query("update private.security_flags set enabled=true where key='admin_mfa_required'");
    try {
      for (const id of [ADMIN_OWNER_ID, ADMIN_MANAGER_ID]) {
        expect((await check(await sessionClaims(db, id, { aal: 'aal1', ageSeconds: 3 * DAY }))).allowed).toBe(false);
        expect((await check(await sessionClaims(db, id, { aal: 'aal2', ageSeconds: 3 * DAY }))).allowed).toBe(true);
      }
    } finally { await db.query("update private.security_flags set enabled=false where key='admin_mfa_required'"); }
  });
});
