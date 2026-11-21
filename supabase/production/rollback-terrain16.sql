-- Terrain 16 — rollback of the database changes, ONLY after the previous code is redeployed
-- (the Terrain 16 code falls back to is_admin() if is_admin_account() is missing).
-- Restores legacy administrator checks without granting employee rights. Journaled rows are kept.
begin;
drop trigger if exists cap_unpaid_reservation on public.payment_attempts;
drop function if exists public.cap_unpaid_reservation();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true and p.role in ('super_admin', 'admin'));
$function$;
create or replace function public.is_manager() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active and role in ('super_admin','admin'));
$$;
create or replace function public.is_super_admin() returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true and p.role = 'super_admin');
$function$;
drop function if exists public.is_admin_account();
drop function if exists private.admin_assurance_ok();
drop function if exists private.bind_authorized_admins();
drop table if exists private.security_flags;
drop table if exists private.admin_accounts;
drop table if exists private.authorized_admin_emails;
-- Profiles deactivated by the migration stay inactive (see activity_logs 'deactivate_unauthorized_profile').
alter table public.profiles alter column is_active set default true;
drop trigger if exists audit_customer_changes on public.customers;
drop trigger if exists audit_profile_changes on public.profiles;
drop trigger if exists audit_collection_changes on public.collections;
drop trigger if exists audit_product_image_changes on public.product_images;
drop function if exists public.audit_staff_change();

grant execute on function public.create_order_request_atomic(uuid, text, text, text, text, jsonb) to service_role;

drop policy if exists "staff list public media" on storage.objects;
create policy "public read product images bucket" on storage.objects for select to public using (bucket_id = any (array['product-images'::text, 'site-assets'::text]));
create policy "christmas videos public read" on storage.objects for select to public using (bucket_id = 'christmas-videos'::text);
commit;
-- Terrain 15 (SEC-001 limits) is independent: keep it, or see docs/security/terrain-15-hardening.md.
