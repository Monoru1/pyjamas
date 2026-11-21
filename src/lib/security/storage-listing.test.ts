import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// Terrain 16 · SEC-010: anonymous visitors can no longer list bucket contents; staff still can.
it('removes the public listing policies and keeps staff listing', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema storage; create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
      grant usage on schema storage to anon, authenticated; alter table storage.objects enable row level security; grant select on storage.objects to anon, authenticated;
      create function public.is_admin() returns boolean language sql as $$select current_setting('test.admin',true)='on'$$;
      grant execute on function public.is_admin() to authenticated;
      create policy "public read product images bucket" on storage.objects for select to public using (bucket_id in ('product-images','site-assets'));
      create policy "christmas videos public read" on storage.objects for select to public using (bucket_id='christmas-videos');
      insert into storage.objects(bucket_id,name) values ('product-images','a.jpg'),('site-assets','b.webp'),('christmas-videos','c.mp4');`);
    const list = async (role: string, admin = false) => db.transaction(async tx => {
      await tx.exec(`set local test.admin='${admin ? 'on' : 'off'}'; set local role ${role}`);
      return (await tx.query('select name from storage.objects')).rows.length;
    });
    expect(await list('anon')).toBe(3);
    await db.exec(readFileSync('supabase/migrations/20261121180300_storage_no_public_listing.sql', 'utf8'));
    expect(await list('anon')).toBe(0);
    expect(await list('authenticated')).toBe(0);
    expect(await list('authenticated', true)).toBe(3);
    // Re-runnable without error.
    await db.exec(readFileSync('supabase/migrations/20261121180300_storage_no_public_listing.sql', 'utf8'));
  } finally { await db.close(); }
});
