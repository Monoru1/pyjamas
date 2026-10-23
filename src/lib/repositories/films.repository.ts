import { createPublicClient } from '@/lib/supabase/public';
import { safeMediaUrl } from '@/lib/security/urls';
import type { CollectionFilm } from '@/components/marketing/collection-films';

// Titles based on reviewed footage. Keep the original pages 1–2 only;
// video-10 was previously displayed as “Un instant à la maison · 11”.
const selectedFilms: Record<string, string> = {
  'video-03.mp4': 'Noël entre amis',
  'video-00.mp4': 'Bienvenue à La Maison des Pyjamas',
  'video-01.mp4': 'Bleu nuit, éclats de fête',
  'video-02.mp4': 'Les détails du satin de Noël',
  'video-04.mp4': 'Vert sapin & carreaux bleus',
  'video-05.mp4': 'À chaque envie, son pyjama',
  'video-06.mp4': 'Satin au pied du sapin',
  'video-07.mp4': 'Les motifs de la fête',
  'video-08.mp4': 'Des coffrets prêts à offrir',
  'video-09.mp4': 'Un moment ensemble au salon',
  'video-11.mp4': 'Douceur au pied du sapin',
};
export async function listCollectionFilms(): Promise<CollectionFilm[]> {
  try {
    const { data, error } = await createPublicClient().from('media_assets').select('url, metadata')
      .eq('asset_type', 'video').eq('is_active', true).contains('tags', ['noel-2026']).order('path').limit(100);
    if (error) return [];
    const films = (data ?? []).flatMap((row) => {
      const meta = row.metadata as Record<string, unknown> | null;
      const src = safeMediaUrl(row.url); const poster = safeMediaUrl(meta?.poster);
      if (!src || !poster) return [];
      const filename = src.split('/').pop() ?? '';
      const title = selectedFilms[filename];
      if (!title) return [];
      return [{ src, poster, title, duration: typeof meta?.duration === 'number' ? meta.duration : 0 }];
    });
    return films.sort((a, b) => Number(b.src.endsWith('/video-03.mp4')) - Number(a.src.endsWith('/video-03.mp4')));
  } catch { return []; }
}
