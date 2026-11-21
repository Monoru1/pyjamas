import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { ADMIN_MANAGER_ID, ADMIN_OWNER_ID, commerceDatabase, sessionClaims } from '@/lib/payments/test-support/commerce-db';

// Terrain 16 · SEC-005 / SEC-011 — owner decision: exactly two administrators
// (sakryad@gmail.com, lamaisondespyjamas@gmail.com), identical rights, no employee, no third access.
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const owner = ADMIN_OWNER_ID, manager = ADMIN_MANAGER_ID;
const employee = randomUUID(), stranger = randomUUID();
const product = randomUUID(), variant = randomUUID();
const as = async <T,>(id: string, aal: string, sql: string, params: unknown[] = []) => {
  const claims = await sessionClaims(db, id, { aal });
  return asClaims<T>(claims, sql, params);
};
const asClaims = <T,>(claims: Record<string, unknown>, sql: string, params: unknown[] = []) => db.transaction(async tx => {
  await tx.query("select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)", [claims.sub, JSON.stringify(claims)]);
  await tx.exec('set local role authenticated');
  return (await tx.query<T>(sql, params)).rows;
});
const flag = (on: boolean) => db.query("update private.security_flags set enabled=$1 where key='admin_mfa_required'", [on]);

/** The administrative capabilities the back-office relies on, checked through RLS as the user. */
async function capabilities(id: string, aal = 'aal1') {
  // Allowed (at least one row reached) / no row visible / refused: row counts themselves change as the journal grows.
  const one = async (sql: string, params: unknown[] = []) => { try { return (await as<Record<string, unknown>>(id, aal, sql, params)).length > 0 ? 'allowed' : 'none'; } catch { return 'denied'; } };
  return {
    functions: (await as<Record<string, boolean>>(id, aal, 'select is_admin() a, is_manager() m, is_super_admin() s'))[0],
    readCustomers: await one('select id from customers'),
    readOrders: await one('select id from orders'),
    readPayments: await one('select id from payment_attempts'),
    readNotifications: await one('select id from notification_jobs'),
    editProduct: await one('update products set is_featured=is_featured where id=$1 returning id', [product]),
    editCollections: await one("update collections set name_fr=name_fr returning id"),
    editSettings: await one("update settings set value=value returning key"),
    manageProfiles: await one('select id from profiles'),
    readJournal: await one('select id from activity_logs'),
    setPrice: await one('select admin_set_variant_price($1,(select price from product_variants where id=$1),1600)', [variant]),
  };
}

beforeAll(async () => {
  db = await commerceDatabase();
  await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())', [employee, 'ancien.employe@example.test', stranger, 'tiers@example.test']);
  // Profile values can be anything: they no longer grant rights.
  await db.query("insert into profiles(id,role,is_active,full_name) values ($1,'super_admin',true,'Propriétaire technique'),($2,'admin',true,'Responsable'),($3,'employee',true,'Ancien employé'),($4,'super_admin',true,'Compte tiers')", [owner, manager, employee, stranger]);
  await db.exec(`insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
    insert into customers(id,full_name,phone,country) values('${randomUUID()}','Client fictif','22901000000','BJ');
    insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('${product}','droits-fixture','Pyjama fixture',1500,'XOF',true);
    insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values('${variant}','${product}','DROITS-M',1500,3,true,'M','Rouge');
    insert into collections(slug,name_fr) values('droits-fixture','Collection fixture') on conflict do nothing;
    insert into settings(key,value) values('homepage','{}') on conflict do nothing;`);
}, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => { await flag(false); await db.exec(`update product_variants set price=1500 where id='${variant}'`); });

it('binds exactly the two authorised addresses to two distinct Auth identities', async () => {
  const rows = (await db.query<{ email: string; user_id: string }>('select email, user_id from private.admin_accounts order by email')).rows;
  expect(rows).toEqual([{ email: 'lamaisondespyjamas@gmail.com', user_id: manager }, { email: 'sakryad@gmail.com', user_id: owner }]);
  expect((await db.query<{ n: number }>('select count(*)::int n from private.authorized_admin_emails')).rows[0].n).toBe(2);
});

it('gives both administrators exactly the same complete rights', async () => {
  const ownerRights = await capabilities(owner);
  const managerRights = await capabilities(manager);
  expect(ownerRights.functions).toEqual({ a: true, m: true, s: true });
  // Orders, payments and notifications are empty in this fixture: readable, nothing to see.
  for (const name of ['readOrders', 'readPayments', 'readNotifications'] as const) expect(ownerRights[name], name).toBe('none');
  for (const name of ['readCustomers', 'editProduct', 'editCollections', 'editSettings', 'manageProfiles', 'readJournal', 'setPrice'] as const) expect(ownerRights[name], name).toBe('allowed');
  expect(managerRights).toEqual(ownerRights);
});

it('refuses an anonymous visitor', async () => {
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select is_admin_account()'); })).rejects.toThrow('permission denied');
  const rows = await db.transaction(async tx => { await tx.exec('set local role anon'); return (await tx.query('select id from customers')).rows; }).catch(() => 'denied');
  expect(rows === 'denied' || (Array.isArray(rows) && rows.length === 0)).toBe(true);
});

it('refuses a third authenticated account and a former employee, whatever their profile says', async () => {
  for (const id of [stranger, employee]) {
    const rights = await capabilities(id, 'aal2');
    expect(rights.functions).toEqual({ a: false, m: false, s: false });
    expect([rights.readCustomers, rights.editProduct, rights.editCollections, rights.editSettings, rights.manageProfiles, rights.readJournal]).toEqual(['none', 'none', 'none', 'none', 'none', 'none']);
    expect(rights.setPrice).toBe('denied');
    expect((await as<{ ok: boolean }>(id, 'aal2', 'select is_admin_account() ok'))[0].ok).toBe(false);
  }
});

it('deactivated every profile outside the two identities, without deleting anything, and journaled it', async () => {
  const fresh = await commerceDatabase();
  try {
    // Profiles that existed BEFORE the migration: replay it on a database where they are active.
    await fresh.exec(`delete from private.admin_accounts; insert into auth.users(id,email,email_confirmed_at) values ('${employee}','x@example.test',now());
      insert into profiles(id,role,is_active) values ('${employee}','employee',true),('${owner}','super_admin',true);`);
    await fresh.exec(readFileSync('supabase/migrations/20261121180100_two_admin_accounts_mfa.sql', 'utf8'));
    const profiles = (await fresh.query<{ id: string; is_active: boolean }>('select id,is_active from profiles order by is_active')).rows;
    expect(profiles).toEqual([{ id: employee, is_active: false }, { id: owner, is_active: true }]);
    expect((await fresh.query<{ n: number }>("select count(*)::int n from activity_logs where action='deactivate_unauthorized_profile' and entity_id=$1", [employee])).rows[0].n).toBe(1);
  } finally { await fresh.close(); }
}, 60000);

it('an e-mail change never moves or grants administrative rights', async () => {
  // The technical owner changes address, then a third account takes the old one.
  await db.query("update auth.users set email='nouvelle.adresse@example.test' where id=$1", [owner]);
  await db.query("update auth.users set email='sakryad@gmail.com' where id=$1", [stranger]);
  expect((await db.query<{ state: string }>('select state from private.bind_authorized_admins() where email=$1', ['sakryad@gmail.com'])).rows[0].state).toBe('already_bound');
  expect((await as<{ ok: boolean }>(stranger, 'aal2', 'select is_admin() ok'))[0].ok).toBe(false);
  expect((await as<{ ok: boolean }>(owner, 'aal1', 'select is_admin() ok'))[0].ok).toBe(true);
  await db.query("update auth.users set email='tiers@example.test' where id=$1", [stranger]);
  await db.query("update auth.users set email='sakryad@gmail.com' where id=$1", [owner]);
});

it('protects both accounts with AAL2 once the MFA switch is on', async () => {
  await flag(true);
  for (const id of [owner, manager]) {
    expect((await as<{ ok: boolean; acc: boolean }>(id, 'aal1', 'select is_admin() ok, is_admin_account() acc'))[0]).toEqual({ ok: false, acc: true });
    expect(await as(id, 'aal1', 'select id from customers')).toEqual([]);
    expect((await capabilities(id, 'aal2')).functions).toEqual({ a: true, m: true, s: true });
  }
  expect(await capabilities(owner, 'aal2')).toEqual(await capabilities(manager, 'aal2'));
});

it('hides the decision, the bindings and the MFA switch from browser roles', async () => {
  for (const sql of ['select * from private.security_flags', 'select * from private.admin_accounts', 'select * from private.authorized_admin_emails',
    "insert into private.admin_accounts(user_id,email) values (gen_random_uuid(),'sakryad@gmail.com')", 'select * from private.bind_authorized_admins()']) {
    await expect(as(owner, 'aal2', sql)).rejects.toThrow('permission denied');
  }
});

it('journals sensitive administrative changes without copying their data', async () => {
  await as(manager, 'aal1', "update customers set city='Porto-Novo'");
  await as(owner, 'aal1', 'update profiles set full_name=full_name where id=$1', [manager]);
  await as(owner, 'aal1', 'select admin_set_variant_price($1,1500,1700)', [variant]);
  const rows = (await db.query<{ actor_id: string; action: string; entity_type: string; before_data: unknown; after_data: unknown }>("select actor_id,action,entity_type,before_data,after_data from activity_logs where actor_id is not null order by created_at")).rows;
  expect(rows.map(r => [r.actor_id, r.entity_type])).toEqual(expect.arrayContaining([[manager, 'customers'], [owner, 'profiles'], [owner, 'product_variants']]));
  expect(rows.every(r => r.before_data === null && r.after_data === null)).toBe(true);
});

it('deploys with the confirmed owner and binds only the original manager after confirmation', async () => {
  const empty = new PGlite();
  try {
    await empty.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email text unique, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;
      create table public.profiles(id uuid primary key, role text, is_active boolean default true, full_name text);
      create table public.activity_logs(id uuid default gen_random_uuid(), actor_id uuid, action text, entity_type text, entity_id uuid, before_data jsonb, after_data jsonb, created_at timestamptz default now());
      create table public.customers(id uuid); create table public.collections(id uuid); create table public.product_images(id uuid);
      create function public.is_admin() returns boolean language sql as $$select false$$;
      create function public.is_manager() returns boolean language sql as $$select false$$;
      create function public.is_super_admin() returns boolean language sql as $$select false$$;`);
    const sql = readFileSync('supabase/migrations/20261121180100_two_admin_accounts_mfa.sql', 'utf8');
    await expect(empty.exec(sql)).rejects.toThrow('neither authorised administrator');
    // The owner is confirmed; the manager's reserved identity is still unconfirmed.
    const ownerId = randomUUID(), managerId = randomUUID(), replacementId = randomUUID();
    await empty.query("insert into auth.users values ($1,'sakryad@gmail.com',now()),($2,'lamaisondespyjamas@gmail.com',null)", [ownerId, managerId]);
    await empty.exec(sql);
    expect((await empty.query('select user_id from private.admin_accounts')).rows).toEqual([{ user_id: ownerId }]);
    expect((await empty.query('select reserved_user_id from private.authorized_admin_emails where email=$1', ['lamaisondespyjamas@gmail.com'])).rows).toEqual([{ reserved_user_id: managerId }]);
    const check = (id: string) => empty.transaction(async tx => {
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
      await tx.exec('set local role authenticated');
      return (await tx.query('select public.is_admin_account() as allowed')).rows;
    });
    expect(await check(ownerId)).toEqual([{ allowed: true }]);
    expect(await check(managerId)).toEqual([{ allowed: false }]);
    await empty.query("update auth.users set email='other-manager@example.test' where id=$1", [managerId]);
    await empty.query("insert into auth.users values ($1,'lamaisondespyjamas@gmail.com',now())", [replacementId]);
    await empty.exec('select * from private.bind_authorized_admins()');
    expect(await check(replacementId)).toEqual([{ allowed: false }]);
    await empty.query("update auth.users set email='replacement@example.test' where id=$1", [replacementId]);
    await empty.query("update auth.users set email='lamaisondespyjamas@gmail.com' where id=$1", [managerId]);
    await empty.query('update auth.users set email_confirmed_at=now() where id=$1', [managerId]);
    const states = (await empty.query<{ email: string; state: string }>('select email,state from private.bind_authorized_admins() order by email')).rows;
    expect(states).toEqual([{ email: 'lamaisondespyjamas@gmail.com', state: 'bound' }, { email: 'sakryad@gmail.com', state: 'already_bound' }]);
    expect(await check(managerId)).toEqual([{ allowed: true }]);
    expect(await check(replacementId)).toEqual([{ allowed: false }]);
    await empty.exec('select * from private.bind_authorized_admins()');
    expect((await empty.query("select count(*)::int as n from activity_logs where action='admin_bound'")).rows).toEqual([{ n: 2 }]);
  } finally { await empty.close(); }
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
    expect(def).toContain('profiles');
    expect(def).not.toContain('employee');
    expect((await copy.query("select 1 from pg_trigger where tgname in ('cap_unpaid_reservation','audit_customer_changes')")).rows).toEqual([]);
    expect((await copy.query("select to_regclass('private.admin_accounts') r")).rows).toEqual([{ r: null }]);
    expect((await copy.query<{ ok: boolean }>("select has_function_privilege('service_role','public.create_order_request_atomic(uuid,text,text,text,text,jsonb)','execute') ok")).rows[0].ok).toBe(true);
    expect((await copy.query<{ n: number }>('select count(*)::int n from activity_logs')).rows[0].n).toBe(before);
  } finally { await copy.close(); }
}, 60000);

it('postflight checks all pass on a database migrated with Terrain 15 and 16', async () => {
  await db.exec(`create schema if not exists storage; create table if not exists storage.objects(id uuid, bucket_id text);
    alter table storage.objects enable row level security;
    create policy "public read product images bucket" on storage.objects for select to public using (bucket_id in ('product-images','site-assets'));`);
  await db.exec(readFileSync('supabase/migrations/20261121180300_storage_no_public_listing.sql', 'utf8'));
  // Fixture profiles created after the migration for the refusal tests; production has none.
  await db.query('update profiles set is_active=false where id = any($1)', [[employee, stranger]]);
  const row = (await db.query<Record<string, boolean>>(readFileSync('supabase/production/terrain16-postflight.sql', 'utf8'))).rows[0];
  expect(Object.entries(row).filter(([, ok]) => ok !== true)).toEqual([]);
});
