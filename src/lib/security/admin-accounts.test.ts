import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { commerceDatabase } from '@/lib/payments/test-support/commerce-db';

// Terrain 16 · SEC-005 / SEC-011 — two administrative accounts, AAL2 switch, audit trail.
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const admin = randomUUID(), owner = randomUUID(), employee = randomUUID(), stranger = randomUUID();
const as = async <T,>(id: string, aal: string, sql: string, params: unknown[] = []) => db.transaction(async tx => {
  await tx.query("select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)", [id, JSON.stringify({ sub: id, aal })]);
  await tx.exec('set local role authenticated');
  return (await tx.query<T>(sql, params)).rows;
});
const flag = (on: boolean) => db.query("update private.security_flags set enabled=$1 where key='admin_mfa_required'", [on]);

beforeAll(async () => {
  db = await commerceDatabase();
  for (const id of [admin, owner, employee, stranger]) await db.query('insert into auth.users(id) values ($1)', [id]);
  await db.query("insert into profiles(id,role,is_active,full_name) values ($1,'admin',true,'Responsable'),($2,'super_admin',true,'Propriétaire technique'),($3,'employee',false,'Ancien compte')", [admin, owner, employee]);
  await db.exec(`insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
    insert into customers(id,full_name,phone,country) values('${randomUUID()}','Client fictif','22901000000','BJ');`);
}, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => { await flag(false); });

it('keeps both authorised administrators working while MFA is not yet mandatory', async () => {
  for (const id of [admin, owner]) expect((await as<{ ok: boolean }>(id, 'aal1', 'select is_admin() ok'))[0].ok).toBe(true);
  expect((await as<{ ok: boolean }>(owner, 'aal1', 'select is_super_admin() ok'))[0].ok).toBe(true);
  expect((await as<{ ok: boolean }>(admin, 'aal1', 'select is_manager() ok'))[0].ok).toBe(true);
});

it('grants nothing to an employee, a deactivated profile or a signed-up stranger', async () => {
  await db.query("insert into profiles(id,role,full_name) values ($1,'admin','Inscription publique')", [stranger]);
  for (const id of [employee, stranger]) {
    expect((await as<{ ok: boolean; acc: boolean }>(id, 'aal2', 'select is_admin() ok, is_admin_account() acc'))[0]).toEqual({ ok: false, acc: false });
    expect(await as(id, 'aal2', 'select id from customers')).toEqual([]);
    expect(await as(id, 'aal2', "update product_variants set price=1 returning id")).toEqual([]);
  }
});

it('requires AAL2 for every administrative right once the switch is on', async () => {
  await flag(true);
  expect((await as<{ ok: boolean; acc: boolean }>(admin, 'aal1', 'select is_admin() ok, is_admin_account() acc'))[0]).toEqual({ ok: false, acc: true });
  expect(await as(admin, 'aal1', 'select id from customers')).toEqual([]);
  expect((await as<{ ok: boolean }>(owner, 'aal1', 'select is_super_admin() ok'))[0].ok).toBe(false);
  expect((await as<{ n: number }>(admin, 'aal2', 'select count(*)::int n from customers'))[0].n).toBe(1);
  expect((await as<{ ok: boolean }>(owner, 'aal2', 'select is_super_admin() ok'))[0].ok).toBe(true);
});

it('hides the switch from browser roles', async () => {
  await expect(as(admin, 'aal2', 'select * from private.security_flags')).rejects.toThrow('permission denied');
  await expect(as(admin, 'aal2', "update private.security_flags set enabled=false")).rejects.toThrow('permission denied');
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select is_admin_account()'); })).rejects.toThrow('permission denied');
});

it('journals administrative changes to customers and profiles without copying their data', async () => {
  await as(admin, 'aal1', "update customers set city='Porto-Novo'");
  await as(owner, 'aal1', 'update profiles set full_name=full_name where id=$1', [admin]);
  const rows = (await db.query<{ actor_id: string; action: string; entity_type: string; before_data: unknown; after_data: unknown }>("select actor_id,action,entity_type,before_data,after_data from activity_logs where entity_type in ('customers','profiles') order by created_at")).rows;
  expect(rows.map(r => [r.actor_id, r.action, r.entity_type])).toEqual([[admin, 'update', 'customers'], [owner, 'update', 'profiles']]);
  expect(rows.every(r => r.before_data === null && r.after_data === null)).toBe(true);
});

it('refuses to run while an active employee profile exists, instead of locking a person out', async () => {
  const sql = readFileSync('supabase/migrations/20261121180100_two_admin_accounts_mfa.sql', 'utf8');
  await expect(db.transaction(async tx => {
    await tx.query("update profiles set is_active=true where id=$1", [employee]);
    await tx.exec(sql);
  })).rejects.toThrow('active employee profile');
  expect((await db.query<{ a: boolean }>('select is_active a from profiles where id=$1', [employee])).rows[0].a).toBe(false);
});

it('SEC-006: no role can create an unpaid order through the legacy request RPC anymore', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await expect(db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select create_order_request_atomic($1,$2,'Fictif','22901000000','','[]'::jsonb)", [randomUUID(), 'a'.repeat(64)]);
    })).rejects.toThrow('permission denied');
  }
});

it('rollback script restores the previous rights and keeps the journal', async () => {
  const copy = await commerceDatabase();
  try {
    await copy.exec(`create schema if not exists storage; create table if not exists storage.objects(id uuid, bucket_id text);
      alter table storage.objects enable row level security;`);
    const before = (await copy.query<{ n: number }>('select count(*)::int n from activity_logs')).rows[0].n;
    await copy.exec(readFileSync('supabase/production/rollback-terrain16.sql', 'utf8'));
    const def = (await copy.query<{ d: string }>("select pg_get_functiondef('public.is_admin()'::regprocedure) d")).rows[0].d;
    expect(def).toContain('employee');
    expect((await copy.query("select 1 from pg_trigger where tgname in ('cap_unpaid_reservation','audit_customer_changes')")).rows).toEqual([]);
    expect((await copy.query<{ ok: boolean }>("select has_function_privilege('service_role','public.create_order_request_atomic(uuid,text,text,text,text,jsonb)','execute') ok")).rows[0].ok).toBe(true);
    expect((await copy.query<{ n: number }>('select count(*)::int n from activity_logs')).rows[0].n).toBe(before);
  } finally { await copy.close(); }
}, 60000);

it('postflight checks all pass on a database migrated with Terrain 15 and 16', async () => {
  await db.exec(`create schema if not exists storage; create table if not exists storage.objects(id uuid, bucket_id text);
    alter table storage.objects enable row level security;
    create policy "public read product images bucket" on storage.objects for select to public using (bucket_id in ('product-images','site-assets'));`);
  await db.exec(readFileSync('supabase/migrations/20261121180300_storage_no_public_listing.sql', 'utf8'));
  const row = (await db.query<Record<string, boolean>>(readFileSync('supabase/production/terrain16-postflight.sql', 'utf8'))).rows[0];
  expect(Object.entries(row).filter(([, ok]) => ok !== true)).toEqual([]);
});
