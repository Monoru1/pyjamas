import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { ADMIN_MANAGER_ID, ADMIN_OWNER_ID, commerceDatabase, sessionClaims } from '@/lib/payments/test-support/commerce-db';

type Identity = Awaited<ReturnType<typeof sessionClaims>>;
let db: Awaited<ReturnType<typeof commerceDatabase>>;
let owner: Identity;
const variant = randomUUID();
const fixtureCode = '703021';

const newSession = async (user = ADMIN_OWNER_ID, method = 'password') => {
  const claims = await sessionClaims(db, user, { aal: 'aal1' });
  await db.query('insert into auth.mfa_amr_claims(session_id, authentication_method) values ($1,$2)', [claims.session_id, method]);
  return claims;
};
const actor = <T,>(claims: Identity, sql: string, params: unknown[] = []) => db.transaction(async tx => {
  await tx.query("select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)", [claims.sub, JSON.stringify(claims)]);
  await tx.exec('set local role authenticated');
  return (await tx.query<T>(sql, params)).rows;
});
const flags = (enabled: boolean) => db.query("update private.security_flags set enabled=$1 where key='admin_email_otp_required'", [enabled]);
const status = async (claims: Identity) => (await actor<{ state: string; access: boolean }>(claims, 'select admin_email_otp_status() state, is_admin() access'))[0];
const digest = (claims: Identity, code: string) => createHmac('sha256', 'fixture-only')
  .update(`admin-email-otp:v1:${claims.sub}:${claims.session_id}:${code}`).digest('hex');
const service = <T,>(sql: string, params: unknown[]) => db.transaction(async tx => {
  await tx.exec('set local role service_role');
  return (await tx.query<{ result: T }>(sql, params)).rows[0].result;
});
const verify = (claims: Identity, code = fixtureCode, scope = claims) => service<boolean>(
  'select verify_admin_email_otp($1,$2,$3) result', [claims.sub, claims.session_id, digest(scope, code)]);
const finish = (claims: Identity, challenge: string, accepted: boolean) => service<boolean>(
  'select finish_admin_email_otp_delivery($1,$2,$3,$4) result', [claims.sub, claims.session_id, challenge, accepted]);
const ageLastSend = () => db.exec("update private.admin_email_otp_events set created_at=created_at-interval '61 seconds' where event='issued'");

async function issue(claims: Identity, code = fixtureCode, accept?: boolean) {
  const challenge = randomUUID();
  const receipt = await service<{ recipient?: string; retry?: boolean } | null>('select issue_admin_email_otp($1,$2,$3,$4) result',
    [claims.sub, claims.session_id, challenge, digest(claims, code)]);
  if (receipt?.recipient && accept !== undefined) expect(await finish(claims, challenge, accept)).toBe(accept);
  return { challenge, receipt };
}

beforeAll(async () => {
  db = await commerceDatabase();
  await db.exec(`create table auth.mfa_amr_claims(session_id uuid not null, authentication_method text not null, created_at timestamptz not null default now());
    insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
    insert into customers(full_name,phone,country) values('Client fictif','22901000000','BJ');
    insert into products(slug,name_fr,base_price,currency_code,is_active) values('otp-test','Fixture',1500,'XOF',true);
    insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr)
      select '${variant}',id,'OTP-M',1500,3,true,'M','Rouge' from products where slug='otp-test';`);
  await db.exec(readFileSync('supabase/migrations/20261121203637_admin_email_otp.sql', 'utf8'));
}, 60000);
afterAll(() => db?.close());
beforeEach(async () => {
  await db.exec("delete from private.admin_email_otp_sessions; delete from private.admin_email_otp_events; update auth.users set email_confirmed_at=now();");
  await flags(false);
  owner = await newSession();
});

it('keeps only the owner fallback available while the pilot blocks password-only and even AAL2 access', async () => {
  const emergency = await newSession();
  expect(await status(emergency)).toEqual({ state: 'legacy', access: true });
  expect(await status(await newSession(ADMIN_MANAGER_ID))).toEqual({ state: 'required', access: false });
  expect(await issue(owner, fixtureCode, true)).toMatchObject({ receipt: { recipient: 'sakryad@gmail.com' } });
  expect(await status({ ...owner, aal: 'aal2' })).toEqual({ state: 'required', access: false });
  expect(await status(emergency)).toEqual({ state: 'legacy', access: true });
  await flags(true);
  expect(await status(emergency)).toEqual({ state: 'required', access: false });
});

it('enforces OTP for direct database reads, admin roles and a privileged RPC', async () => {
  const manager = await newSession(ADMIN_MANAGER_ID);
  await flags(true);
  expect(await status(owner)).toEqual({ state: 'required', access: false });
  expect(await actor(owner, 'select id from customers')).toEqual([]);
  expect(await actor(owner, 'select is_manager() m, is_super_admin() s')).toEqual([{ m: false, s: false }]);
  await expect(actor(owner, 'select admin_set_variant_price($1,1500,1500)', [variant])).rejects.toThrow();
  for (const user of [owner, manager]) {
    await issue(user, fixtureCode, true);
    expect(await verify(user)).toBe(true);
    expect(await status(user)).toEqual({ state: 'verified', access: true });
    expect(await actor(user, 'select id from customers')).toHaveLength(1);
    expect(await actor(user, 'select is_manager() m, is_super_admin() s')).toEqual([{ m: true, s: true }]);
    await expect(actor(user, 'select admin_set_variant_price($1,1500,1500)', [variant])).resolves.toHaveLength(1);
  }
});

it('exposes neither the private tables nor a way to approve a code through a browser RPC', async () => {
  for (const [sql, params] of [
    ['select * from private.admin_email_otp_sessions', []],
    ['select * from private.admin_email_otp_events', []],
    ['select issue_admin_email_otp($1,$2,$3,$4)', [owner.sub, owner.session_id, randomUUID(), digest(owner, fixtureCode)]],
    ['select finish_admin_email_otp_delivery($1,$2,$3,true)', [owner.sub, owner.session_id, randomUUID()]],
    ['select verify_admin_email_otp($1,$2,$3)', [owner.sub, owner.session_id, digest(owner, fixtureCode)]],
  ] as [string, unknown[]][]) await expect(actor(owner, sql, params)).rejects.toThrow('permission denied');
});

it('rejects an incorrect, expired or reused code and atomically commits verification', async () => {
  await issue(owner, fixtureCode, true);
  expect(await verify(owner, '000000')).toBe(false);
  expect(await status(owner)).toEqual({ state: 'required', access: false });
  await db.exec("update private.admin_email_otp_sessions set expires_at=now()-interval '1 second'");
  expect(await verify(owner)).toBe(false);
  await ageLastSend();
  await issue(owner, '031415', true);
  expect(await verify(owner, '031415')).toBe(true);
  // If the HTTP response gets lost after commit, a reloaded page still sees the same approval.
  expect(await verify(owner, '031415')).toBe(false);
  expect(await status(owner)).toEqual({ state: 'verified', access: true });
  expect((await db.query('select digest, verified_at is not null as verified from private.admin_email_otp_sessions')).rows).toEqual([{ digest: null, verified: true }]);
});

it('rejects another account or browser session and demands OTP for a new login', async () => {
  const otherSession = await newSession();
  const manager = await newSession(ADMIN_MANAGER_ID);
  await issue(owner, fixtureCode, true);
  expect(await verify(otherSession)).toBe(false);
  expect(await verify(manager)).toBe(false);
  expect(await verify(owner, fixtureCode, otherSession)).toBe(false);
  expect(await verify(owner, fixtureCode, manager)).toBe(false);
  expect(await verify(owner)).toBe(true);
  await flags(true);
  expect(await status(otherSession)).toEqual({ state: 'required', access: false });
});

it('caps sends per account across sessions, invalidates the previous code and ignores delayed delivery callbacks', async () => {
  const first = await issue(owner, fixtureCode, true);
  expect((await issue(await newSession())).receipt).toBeNull();
  await ageLastSend();
  expect((await issue(owner)).receipt).toEqual({ retry: true });
  const next = await issue(owner, '041381', true);
  expect(next.receipt).toHaveProperty('recipient');
  expect(await finish(owner, first.challenge, true)).toBe(false);
  expect(await verify(owner)).toBe(false);
  for (const code of ['041382', '041383', '041384']) {
    await ageLastSend();
    expect((await issue(owner, code, true)).receipt).toHaveProperty('recipient');
  }
  await ageLastSend();
  expect((await issue(await newSession(), '041385')).receipt).toBeNull();
  expect(await verify(owner, '041384')).toBe(true);
});

it('blocks after five failed attempts on a code', async () => {
  await issue(owner, fixtureCode, true);
  for (let n = 0; n < 5; n++) expect(await verify(owner, '999999')).toBe(false);
  expect(await verify(owner)).toBe(false);
  expect((await db.query('select failed_attempts, digest from private.admin_email_otp_sessions')).rows).toEqual([{ failed_attempts: 5, digest: null }]);
});

it('keeps access closed until the provider has accepted the code and after delivery failure', async () => {
  const { challenge } = await issue(owner);
  expect(await verify(owner)).toBe(false);
  expect(await finish(owner, challenge, false)).toBe(false);
  expect(await finish(owner, challenge, true)).toBe(false);
  expect(await verify(owner)).toBe(false);
  expect(await status(owner)).toEqual({ state: 'required', access: false });
  const events = (await db.query('select event from private.admin_email_otp_events order by id')).rows;
  expect(events).toEqual([{ event: 'issued' }, { event: 'delivery_failed' }]);
});

it('refuses third accounts, unconfirmed managers and sessions without a real password AMR', async () => {
  const third = randomUUID();
  await db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'tiers@example.test',now())", [third]);
  await db.query('update auth.users set email_confirmed_at=null where id=$1', [ADMIN_MANAGER_ID]);
  for (const user of [await newSession(third), await newSession(ADMIN_MANAGER_ID), await newSession(ADMIN_OWNER_ID, 'otp')]) {
    expect(await status(user)).toEqual({ state: 'denied', access: false });
    expect((await issue(user)).receipt).toBeNull();
  }
});

it('keeps a refreshed session approved and refuses expired or revoked sessions with an existing token', async () => {
  await flags(true);
  await issue(owner, fixtureCode, true);
  expect(await verify(owner)).toBe(true);
  expect(await status({ ...owner, ...{ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 } })).toEqual({ state: 'verified', access: true });
  await db.query("update auth.sessions set created_at=now()-interval '29 days' where id=$1", [owner.session_id]);
  expect(await status(owner)).toEqual({ state: 'verified', access: true });
  await db.query("update auth.sessions set created_at=now()-interval '30 days' where id=$1", [owner.session_id]);
  expect(await status(owner)).toEqual({ state: 'denied', access: false });
  await db.query("update auth.sessions set created_at=now() where id=$1", [owner.session_id]);
  await db.query('delete from auth.sessions where id=$1', [owner.session_id]);
  expect(await status(owner)).toEqual({ state: 'denied', access: false });
});
