-- RECETTE ONLY. Public media buckets, authenticated staff mutations.
do $$ begin
 if to_regclass('public.live_test_authorizations') is null or not exists(select 1 from public.products where slug='recette-fedapay-100-xof') then raise exception 'Isolated recipe with private test fixture required'; end if;
end $$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='admin delete product images bucket') then
create policy "admin delete product images bucket" on storage.objects for DELETE to authenticated
using (((bucket_id = ANY (ARRAY['product-images'::text, 'site-assets'::text])) AND is_admin())) ; end if; end $policy$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='admin update product images bucket') then
create policy "admin update product images bucket" on storage.objects for UPDATE to authenticated
using (((bucket_id = ANY (ARRAY['product-images'::text, 'site-assets'::text])) AND is_admin())) with check (((bucket_id = ANY (ARRAY['product-images'::text, 'site-assets'::text])) AND is_admin())); end if; end $policy$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='admin upload product images bucket') then
create policy "admin upload product images bucket" on storage.objects for INSERT to authenticated
 with check (((bucket_id = ANY (ARRAY['product-images'::text, 'site-assets'::text])) AND is_admin())); end if; end $policy$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='christmas videos admin delete') then
create policy "christmas videos admin delete" on storage.objects for DELETE to authenticated
using (((bucket_id = 'christmas-videos'::text) AND is_admin())) ; end if; end $policy$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='christmas videos admin update') then
create policy "christmas videos admin update" on storage.objects for UPDATE to authenticated
using (((bucket_id = 'christmas-videos'::text) AND is_admin())) with check (((bucket_id = 'christmas-videos'::text) AND is_admin())); end if; end $policy$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='christmas videos admin upload') then
create policy "christmas videos admin upload" on storage.objects for INSERT to authenticated
 with check (((bucket_id = 'christmas-videos'::text) AND is_admin())); end if; end $policy$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='christmas videos public read') then
create policy "christmas videos public read" on storage.objects for SELECT to public
using ((bucket_id = 'christmas-videos'::text)) ; end if; end $policy$;
do $policy$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='public read product images bucket') then
create policy "public read product images bucket" on storage.objects for SELECT to public
using ((bucket_id = ANY (ARRAY['product-images'::text, 'site-assets'::text]))) ; end if; end $policy$;
