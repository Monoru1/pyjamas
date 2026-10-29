import { Images } from 'lucide-react';
import { MediaLibrary } from '@/components/admin/media-library';
import { createAdminClient as createClient } from '@/lib/supabase/admin';

export default async function AdminMediasPage({searchParams}:{searchParams:Promise<{notice?:string}>}) {
  const supabase = await createClient();
  const {notice}=await searchParams;
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
      {notice==='storage_ready' && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm">Les trois espaces de stockage de recette sont prêts. Aucun média de production n’a été modifié.</p>}
      {notice==='storage_unavailable' && <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm">Préparation du stockage indisponible. Vérifiez le contexte de recette et les droits serveur.</p>}
      {process.env.NEXT_PUBLIC_SUPABASE_URL==='https://oxhymanjibveayhcaqvj.supabase.co' && <form method="post" action="/api/admin/recipe-storage" className="mb-5"><button className="admin-action min-h-11 px-5">Préparer le stockage de recette</button></form>}
      {error
        ? <div className="admin-medias-message" role="alert">La médiathèque est momentanément indisponible. Réessaie plus tard.</div>
        : <MediaLibrary assets={assets ?? []} />}
    </div>
  );
}
