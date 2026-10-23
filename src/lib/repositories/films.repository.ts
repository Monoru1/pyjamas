import { createPublicClient } from '@/lib/supabase/public';
import { safeMediaUrl } from '@/lib/security/urls';
import type { CollectionFilm } from '@/components/marketing/collection-films';
export async function listCollectionFilms(): Promise<CollectionFilm[]> {
  try {
    const { data, error } = await createPublicClient().from('media_assets').select('url, metadata')
      .eq('asset_type', 'video').eq('is_active', true).contains('tags', ['noel-2026']).order('path').limit(100);
    if (error) return [];
    const films = (data ?? []).flatMap((row, index) => {
      const meta = row.metadata as Record<string, unknown> | null;
      const src = safeMediaUrl(row.url); const poster = safeMediaUrl(meta?.poster);
      if (!src || !poster) return [];
      return [{ src, poster, title: src.endsWith('/video-03.mp4') ? 'Un Noël en famille' : `Un instant à la maison · ${String(index + 1).padStart(2, '0')}`, duration: typeof meta?.duration === 'number' ? meta.duration : 0 }];
    });
    return films.sort((a, b) => Number(b.src.endsWith('/video-03.mp4')) - Number(a.src.endsWith('/video-03.mp4')));
  } catch { return []; }
}
