-- Terrain 16 · SEC-005 / SEC-011 — two administrative accounts, MFA-ready, audited.
-- Decision of 21 Nov 2026: only the technical owner and the shop manager administer the shop.
-- The `employee` role keeps existing in the enum (no data rewrite) but grants nothing anymore.

-- 1. Preflight: never silently lock out a person. An ACTIVE employee profile must be promoted
--    (if it is one of the two authorised holders) or deactivated by the owner BEFORE this runs.
do $$
begin
  if exists (select 1 from public.profiles where is_active and role = 'employee') then
    raise exception 'Terrain 16: active employee profile(s) found. Promote the authorised holder to admin or deactivate the profile, then re-run.';
  end if;
end $$;

-- 2. Private switch, not exposed through the Data API (only `public` is). Off until both
--    holders have enrolled a second factor; then: update private.security_flags set enabled = true
--    where key = 'admin_mfa_required';
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
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

-- 3. Role only, without the assurance level: lets the app send an admin to /admin/mfa
--    instead of the login page. Grants no data access by itself.
create or replace function public.is_admin_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role in ('super_admin', 'admin'));
$$;
revoke all on function public.is_admin_account() from public, anon;
grant execute on function public.is_admin_account() to authenticated;

-- 4. Every RLS policy, guard and staff RPC goes through these three functions: same signatures,
--    so no policy is rewritten. `employee` is excluded; AAL2 is required once the switch is on.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin_account() and private.admin_assurance_ok();
$$;
create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin_account() and private.admin_assurance_ok();
$$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role = 'super_admin')
    and private.admin_assurance_ok();
$$;
revoke all on function public.is_admin(), public.is_manager(), public.is_super_admin() from public, anon;
grant execute on function public.is_admin(), public.is_manager(), public.is_super_admin() to authenticated;

-- 5. New profiles default to an inactive, non-administrative state: a public sign-up never
--    obtains rights, and a new admin requires an explicit, audited change by the super admin.
alter table public.profiles alter column is_active set default false;

-- 6. Traceability of administrative changes not yet journaled (no customer data copied).
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
create trigger audit_customer_changes after update or delete on public.customers
  for each row execute function public.audit_staff_change();
create trigger audit_profile_changes after insert or update or delete on public.profiles
  for each row execute function public.audit_staff_change();
create trigger audit_collection_changes after insert or update or delete on public.collections
  for each row execute function public.audit_staff_change();
create trigger audit_product_image_changes after insert or update or delete on public.product_images
  for each row execute function public.audit_staff_change();
