'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MediaMetadataForm } from '@/components/admin/media-metadata-form';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ImagePlus, LoaderCircle, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { setMediaStatus } from '@/app/admin/medias/actions';

type MediaAsset = {
  id: string;
  title: string | null;
  alt_fr: string | null;
  url: string;
  asset_type: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_active: boolean;
  created_at: string;
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const IMAGE_LIMIT = 5 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!selected || busy) return;
    setError('');
    setMessage('');

    const isImage = IMAGE_TYPES.has(selected.type);
    const isVideo = VIDEO_TYPES.has(selected.type);
    if (!isImage && !isVideo) {
      setError('Format non pris en charge : choisis JPG, PNG, WebP, MP4 ou WebM.');
      return;
    }
    const limit = isVideo ? VIDEO_LIMIT : IMAGE_LIMIT;
    if (!selected.size || selected.size > limit) {
      setError(isVideo
        ? 'Vidéo trop lourde (maximum 50 Mo). Compresse-la en MP4 Web avant de réessayer.'
        : 'Image trop lourde (maximum 5 Mo). Compresse-la avant de réessayer.');
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const bucket = isVideo ? 'christmas-videos' : 'site-assets';
    const extension = (isVideo ? selected.type.split('/')[1] : selected.type === 'image/jpeg' ? 'jpg' : selected.type.split('/')[1]) || 'bin';
    const path = `christmas-2026/${crypto.randomUUID()}.${extension}`;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Ta session a expiré. Reconnecte-toi.');
      const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin');
      if (roleError || !isAdmin) throw new Error('Ce compte ne peut pas publier de médias.');

      // Upload directly to Storage with RLS, not through a size-limited Netlify function.
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, selected, {
        cacheControl: '31536000',
        contentType: selected.type,
        upsert: false,
      });
      if (uploadError) throw new Error(`Téléversement impossible : ${uploadError.message}`);

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      const { error: recordError } = await supabase.from('media_assets').insert({
        bucket,
        path,
        url: publicData.publicUrl,
        title: title.trim() || selected.name,
        alt_fr: description.trim() || null,
        asset_type: isVideo ? 'video' : 'image',
        mime_type: selected.type,
        size_bytes: selected.size,
        is_active: true,
        tags: ['noel-2026'],
        metadata: { original_filename: selected.name, source: 'employee-upload' },
      });

      if (recordError) {
        await supabase.storage.from(bucket).remove([path]);
        throw new Error('Le fichier a été reçu mais son inscription dans la médiathèque a échoué.');
      }

      setSelected(null);
      setTitle('');
      setDescription('');
      setMessage('Média ajouté à la bibliothèque. Tu peux maintenant le retrouver ici.');
      const fileInput = form.querySelector('input[type=file]') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue pendant le transfert.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(asset: MediaAsset) {
    if (changing) return;
    setChanging(asset.id);
    setError('');
    try {
      const result = await setMediaStatus(asset.id, !asset.is_active);
      if (result.error) throw new Error(result.error);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier ce média.');
    } finally {
      setChanging(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="admin-panel p-5 md:p-8">
        <div className="admin-panel-title">
          <div><p>STUDIO CRÉATIF</p><h2>Ajouter des photos ou vidéos</h2></div>
          <ImagePlus size={23} className="text-[#b3203a]" aria-hidden="true" />
        </div>
        <p className="admin-upload-note mb-5">
          Images : JPG, PNG ou WebP (5 Mo max). Vidéos : MP4 ou WebM (50 Mo max). Pour les rushs plus longs du Drive,
          prépare un montage léger avant de publier. Les fichiers sont enregistrés
          directement dans la médiathèque de la boutique.
        </p>
        <form onSubmit={upload} className="admin-media-upload">
          <label className="wide">Choisir un fichier
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required
              onChange={event => { const file = event.target.files?.[0] ?? null; setSelected(file); setPreview(file ? URL.createObjectURL(file) : ''); }} />
          </label>
          {selected && preview && <div className="wide overflow-hidden rounded-xl bg-[#123d2f] p-3">{VIDEO_TYPES.has(selected.type) ? <video className="max-h-64 w-full" src={preview} controls preload="metadata" playsInline aria-label="Aperçu avant téléversement"/> :
            // eslint-disable-next-line @next/next/no-img-element
            <img className="mx-auto max-h-64 object-contain" src={preview} alt="Aperçu avant téléversement"/>}</div>}
          <label>Titre visible dans le studio
            <input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} placeholder="Famille au pied du sapin"/>
          </label>
          <label>Description / texte alternatif
            <input value={description} maxLength={200} onChange={event => setDescription(event.target.value)} placeholder="Décrire la photo pour l'accessibilité"/>
          </label>
          <div className="wide">
            {error && <p className="admin-medias-message text-red-700" role="alert">{error}</p>}
            {message && <p className="admin-medias-message" role="status">{message}</p>}
          </div>
          <button className="wide inline-flex items-center justify-center gap-2" type="submit" disabled={busy || !selected}>
            {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true"/> : <ImagePlus size={18} aria-hidden="true" />}
            {busy ? 'Téléversement en cours…' : 'Ajouter à la médiathèque'}
          </button>
        </form>
      </section>

      <section className="admin-panel p-5 md:p-8">
        <div className="admin-panel-title"><div><p>BIBLIOTHÈQUE</p><h2>{assets.length} médias récents</h2></div></div>
        <p className="admin-upload-note mb-5">
          Masquer un média le retire des vues de la bibliothèque publique, mais ne rend pas son URL de stockage privée.
          Les médias affichés dans les pages sont choisis séparément lors de la mise en page.
        </p>
        {assets.length === 0 ? (
          <div className="admin-empty">Aucun média n’a été ajouté via le studio pour l’instant. Le site utilise déjà une sélection issue des shootings Noël.</div>
        ) : (
          <div className="admin-media-grid">
            {assets.map(asset => (
              <article key={asset.id} className="admin-media-item">
                <div className="admin-media-thumb">
                  {asset.asset_type === 'video' ? (
                    <video src={asset.url} playsInline preload="none" controls aria-label={asset.title || 'Vidéo de la boutique'} />
                  ) : (
                    // Stored public URLs may not be in Next.js remotePatterns during staged onboarding.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.alt_fr || asset.title || 'Photographie de la boutique'} loading="lazy" />
                  )}
                </div>
                <div className="admin-media-meta">
                  <strong>{asset.title || 'Sans titre'}</strong>
                  <span>{asset.asset_type === 'video' ? 'Vidéo' : 'Photo'} · {asset.size_bytes ? (asset.size_bytes / 1024 / 1024).toFixed(1) : '?'} Mo</span>
                  <MediaMetadataForm id={asset.id} title={asset.title} alt={asset.alt_fr} />
                  <div className="admin-media-actions">
                    <button type="button" disabled={changing === asset.id} onClick={() => toggleStatus(asset)}>
                      {asset.is_active ? 'Masquer' : 'Réactiver'}
                    </button>
                    <a href={asset.url} rel="noopener noreferrer" target="_blank" aria-label={`Ouvrir ${asset.title || 'le média'}`}>
                      <ArrowUpRight size={18} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="admin-upload-note flex items-center gap-2"><Video size={17} /> Les vidéos sont chargées seulement quand quelqu’un appuie sur lecture.</p>
    </div>
  );
}
