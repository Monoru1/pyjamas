-- Security hardening: remove public privilege escalation paths and enforce RLS through views.

-- The bootstrap trigger promoted a known test address to super_admin. Real admins are now
-- managed explicitly in public.profiles by an existing super_admin.
drop trigger if exists on_owner_signup on auth.users;
drop function if exists public.handle_owner_signup();

-- These helpers intentionally use SECURITY DEFINER to avoid RLS recursion, but must only
-- ever be callable by authenticated users. auth.uid() is used inside both functions.
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- Admin-only policies must not be evaluated for anonymous API callers.
drop policy if exists "admin create activity logs" on public.activity_logs;
create policy "admin create activity logs" on public.activity_logs for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin read activity logs" on public.activity_logs;
create policy "admin read activity logs" on public.activity_logs for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin manage coupons" on public.coupons;
create policy "admin manage coupons" on public.coupons for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

-- No public write surface is required today: checkout is handled by WhatsApp, not the API.
drop policy if exists "public create analytics events" on public.analytics_events;
drop policy if exists "public create customers" on public.customers;
drop policy if exists "public create orders" on public.orders;
drop policy if exists "public create order items" on public.order_items;
drop policy if exists "public create reviews pending" on public.reviews;

-- Avoid exposing images, variants or collection links belonging to hidden products.
drop policy if exists "public read product_images" on public.product_images;
create policy "public read product_images" on public.product_images for select to public
using (exists (select 1 from public.products p where p.id = product_images.product_id and p.is_active = true and p.deleted_at is null));
drop policy if exists "public read active variants" on public.product_variants;
create policy "public read active variants" on public.product_variants for select to public
using (is_active = true and exists (select 1 from public.products p where p.id = product_variants.product_id and p.is_active = true and p.deleted_at is null));
drop policy if exists "public read product_collections" on public.product_collections;
create policy "public read product_collections" on public.product_collections for select to public
using (exists (select 1 from public.products p where p.id = product_collections.product_id and p.is_active = true and p.deleted_at is null)
  and exists (select 1 from public.collections c where c.id = product_collections.collection_id and c.is_active = true));
drop policy if exists "public read public settings" on public.settings;
create policy "public read public settings" on public.settings for select to public
using (key = any (array['site', 'whatsapp', 'theme', 'social', 'homepage']));

-- Views used by the Data API must obey the caller's RLS policies.
alter view public.admin_order_overview set (security_invoker = true);
alter view public.admin_product_overview set (security_invoker = true);
alter view public.dashboard_summary set (security_invoker = true);
alter view public.product_catalog set (security_invoker = true);
revoke all on public.admin_order_overview, public.admin_product_overview, public.dashboard_summary from public, anon;
grant select on public.admin_order_overview, public.admin_product_overview, public.dashboard_summary to authenticated;
revoke all on public.product_catalog from public;
grant select on public.product_catalog to anon, authenticated;

-- Storage: limit public image buckets to the formats used by the site and a 5 MiB ceiling.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id in ('product-images', 'site-assets');

-- The test account is disabled; the configured owner remains the only active administrator.
update public.profiles set is_active = false where lower(email) = 'alice@lamaisonduconfort.com';
