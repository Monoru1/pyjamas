-- Terrain 16 · SEC-010 — public media stay reachable by their public URL, but the bucket
-- contents can no longer be enumerated through the Storage API by anyone.
-- Public buckets serve /storage/v1/object/public/... without any SELECT policy, so the
-- catalogue, home page and Christmas films keep working. Staff keep listing rights.
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  drop policy if exists "public read product images bucket" on storage.objects;
  drop policy if exists "christmas videos public read" on storage.objects;
  drop policy if exists "staff list public media" on storage.objects;
  create policy "staff list public media" on storage.objects for select to authenticated
    using (bucket_id in ('product-images', 'site-assets', 'christmas-videos') and public.is_admin());
end $$;
