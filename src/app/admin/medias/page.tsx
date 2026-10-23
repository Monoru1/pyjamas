import { Images } from 'lucide-react';
import { MediaLibrary } from '@/components/admin/media-library';
import { createAdminClient as createClient } from '@/lib/supabase/admin';

export default async function AdminMediasPage() {
  const supabase = await createClient();
  const { data: assets, error } = await supabase
    .from('media_assets')
    .select('id, title, alt_fr, url, asset_type, mime_type, size_bytes, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <p>ÉDITION NOËL 2026</p>
          <h1>Studio photos & vidéos.</h1>
          <span>Une médiathèque simple pour l’équipe. Ajouter, prévisualiser et organiser nos contenus.</span>
        </div>
        <Images size={28} className="text-[#b3203a]" aria-hidden="true" />
      </header>
      {error
        ? <div className="admin-medias-message" role="alert">La médiathèque est momentanément indisponible. Réessaie plus tard.</div>
        : <MediaLibrary assets={assets ?? []} />}
    </div>
  );
}
