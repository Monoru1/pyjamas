-- Terrain 16 · SEC-005 / SEC-011 — owner decision of 21 Nov 2026 (final):
-- exactly two administrators with identical, complete shop rights; no employee access; no third access.
--   1. technical owner      sakryad@gmail.com
--   2. shop manager         lamaisondespyjamas@gmail.com
-- Rights are pinned to the Supabase Auth user ID bound for each authorised address, never to an
-- e-mail sent by a browser nor to profiles.role. A later e-mail change, a public sign-up or an
-- `employee` / `super_admin` profile value grants nothing. Non-destructive: no Auth identity,
-- profile, order or log row is deleted; the admin_role enum is unchanged.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Decision list (addresses already published in docs/GESTION_QUOTIDIENNE.md).
create table if not exists private.authorized_admin_emails (
  email text primary key check (email = lower(email)),
  label text not null
);
revoke all on private.authorized_admin_emails from public, anon, authenticated;
insert into private.authorized_admin_emails(email, label) values
  ('sakryad@gmail.com', 'Propriétaire technique'),
  ('lamaisondespyjamas@gmail.com', 'Responsable de la boutique')
on conflict (email) do nothing;

-- Binding of each address to ONE Auth identity, made server-side and then frozen.
create table if not exists private.admin_accounts (
  user_id uuid primary key,
  email text not null unique references private.authorized_admin_emails(email),
  bound_at timestamptz not null default now()
);
revoke all on private.admin_accounts from public, anon, authenticated;

-- Binds every authorised address whose Auth identity exists and is confirmed. Idempotent; never
-- moves an address to another identity. Run again by the owner after creating a missing account.
create or replace function private.bind_authorized_admins() returns table(email text, user_id uuid, state text)
language plpgsql security definer set search_path = '' as $$
declare r record; found_id uuid; bound_id uuid;
begin
  for r in select a.email from private.authorized_admin_emails a order by a.email loop
    bound_id := null; found_id := null;
    select b.user_id into bound_id from private.admin_accounts b where b.email = r.email;
    if bound_id is not null then
      email := r.email; user_id := bound_id; state := 'already_bound'; return next; continue;
    end if;
    select u.id into found_id from auth.users u
      where lower(u.email) = r.email and u.email_confirmed_at is not null;
    if found_id is null then
      email := r.email; user_id := null; state := 'missing_or_unconfirmed_account'; return next; continue;
    end if;
    insert into private.admin_accounts(user_id, email) values (found_id, r.email);
    insert into public.activity_logs(actor_id, action, entity_type, entity_id) values (null, 'admin_bound', 'auth_users', found_id);
    email := r.email; user_id := found_id; state := 'bound'; return next;
  end loop;
end $$;
revoke all on function private.bind_authorized_admins() from public, anon, authenticated;

do $$
declare missing text;
begin
  perform private.bind_authorized_admins();
  if not exists (select 1 from private.admin_accounts) then
    raise exception 'Terrain 16: neither authorised administrator has a confirmed Supabase Auth account; refusing to lock the back-office.';
  end if;
  select string_agg(a.email, ', ') into missing from private.authorized_admin_emails a
    where not exists (select 1 from private.admin_accounts b where b.email = a.email);
  if missing is not null then
    raise notice 'Terrain 16: create and confirm the Auth account for %, then run: select * from private.bind_authorized_admins();', missing;
  end if;
end $$;

-- MFA switch, off until BOTH holders have a verified factor.
create table if not exists private.security_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
revoke all on private.security_flags from public, anon, authenticated;
insert into private.security_flags(key, enabled) values ('admin_mfa_required', false) on conflict (key) do nothing;

create or replace function private.admin_assurance_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select not coalesce((select f.enabled from private.security_flags f where f.key = 'admin_mfa_required'), false)
      or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
revoke all on function private.admin_assurance_ok() from public, anon, authenticated;

-- Identity only (no AAL): lets the app send an administrator to /admin/mfa rather than to login.
create or replace function public.is_admin_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admin_accounts b where b.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin_account() from public, anon;
grant execute on function public.is_admin_account() to authenticated;

-- Every RLS policy, guard and staff RPC goes through these three functions (same signatures, so
-- no policy is rewritten). Identical rights for the two administrators: no tier above the other.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin_account() and private.admin_assurance_ok();
$$;
create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin();
$$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin();
$$;
revoke all on function public.is_admin(), public.is_manager(), public.is_super_admin() from public, anon;
grant execute on function public.is_admin(), public.is_manager(), public.is_super_admin() to authenticated;

-- Profiles no longer carry rights. Deactivate (never delete) every profile outside the two
-- identities so no historical account appears active; history and commercial data are untouched.
alter table public.profiles alter column is_active set default false;
with deactivated as (
  update public.profiles p set is_active = false
  where p.is_active and not exists (select 1 from private.admin_accounts b where b.user_id = p.id)
  returning p.id
)
insert into public.activity_logs(actor_id, action, entity_type, entity_id)
select null, 'deactivate_unauthorized_profile', 'profiles', id from deactivated;

-- Traceability of administrative changes not yet journaled (no customer data copied).
create or replace function public.audit_staff_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into public.activity_logs(actor_id, action, entity_type, entity_id)
    values (auth.uid(), lower(tg_op), tg_table_name,
            nullif(coalesce(to_jsonb(new), to_jsonb(old)) ->> 'id', '')::uuid);
  end if;
  return coalesce(new, old);
end $$;
revoke all on function public.audit_staff_change() from public, anon, authenticated;
drop trigger if exists audit_customer_changes on public.customers;
create trigger audit_customer_changes after update or delete on public.customers
  for each row execute function public.audit_staff_change();
drop trigger if exists audit_profile_changes on public.profiles;
create trigger audit_profile_changes after insert or update or delete on public.profiles
  for each row execute function public.audit_staff_change();
drop trigger if exists audit_collection_changes on public.collections;
create trigger audit_collection_changes after insert or update or delete on public.collections
  for each row execute function public.audit_staff_change();
drop trigger if exists audit_product_image_changes on public.product_images;
create trigger audit_product_image_changes after insert or update or delete on public.product_images
  for each row execute function public.audit_staff_change();
