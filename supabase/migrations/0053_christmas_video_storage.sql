-- Noël 2026: non-destructive dedicated video storage bucket.
-- Uploaded from the browser with an authenticated session to avoid Netlify function limits.
-- 50 MiB max; transcode larger raw Drive videos before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('christmas-videos', 'christmas-videos', true, 52428800, ARRAY['video/mp4','video/webm']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "christmas videos admin upload" on storage.objects;
create policy "christmas videos admin upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'christmas-videos' and public.is_admin());

drop policy if exists "christmas videos admin update" on storage.objects;
create policy "christmas videos admin update" on storage.objects
for update to authenticated
using (bucket_id = 'christmas-videos' and public.is_admin())
with check (bucket_id = 'christmas-videos' and public.is_admin());

drop policy if exists "christmas videos admin delete" on storage.objects;
create policy "christmas videos admin delete" on storage.objects
for delete to authenticated
using (bucket_id = 'christmas-videos' and public.is_admin());

drop policy if exists "christmas videos public read" on storage.objects;
create policy "christmas videos public read" on storage.objects
for select to public using (bucket_id = 'christmas-videos');
