import Image from 'next/image';
import { Film, ImagePlus } from 'lucide-react';
import { updateSiteSettings } from '@/app/admin/actions';
import { getStoreSettings } from '@/lib/repositories/settings.repository';
import { createAdminClient as createClient } from '@/lib/supabase/admin';

export default async function SiteSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const saved = (await searchParams).saved === '1';
  const supabase = await createClient();
  const [settings, { data: media }] = await Promise.all([
    getStoreSettings(),
    supabase.from('media_assets')
      .select('id, title, url, asset_type')
      .eq('is_active', true)
      .in('asset_type', ['image', 'video'])
      .order('created_at', { ascending: false })
      .limit(75),
  ]);

  const videos = (media ?? []).filter(asset => asset.asset_type === 'video');
  const images = (media ?? []).filter(asset => asset.asset_type === 'image');
  const hero = settings.heroImage.includes('images.unsplash.com') ? '/christmas-2026/family-celebration.jpg' : settings.heroImage;
  const lounge = settings.loungeImage.includes('images.unsplash.com') ? '/christmas-2026/christmas-boutique.jpg' : settings.loungeImage;

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <p>AMBIANCE DE NOËL</p>
          <h1>Personnaliser la boutique.</h1>
          <span>Choisis les visuels de l’accueil et la vidéo mise à l’honneur. Aucun code à modifier.</span>
        </div>
        <ImagePlus size={28} className="text-[#b3203a]" />
      </header>
      {saved && <p role="status" className="admin-medias-message mb-5">Les visuels ont été enregistrés.</p>}
      <form action={updateSiteSettings} className="space-y-6">
        <section className="admin-panel p-6 md:p-8">
          <div className="admin-panel-title">
            <div><p>01 · LES IMAGES</p><h2>Les visuels de l’accueil</h2></div>
          </div>
          <p className="admin-upload-note mb-5">Tu peux choisir une image déjà téléversée dans la médiathèque ou en ajouter une nouvelle (JPG / PNG / WebP, maximum 5 Mo).</p>
          <div className="grid gap-7 md:grid-cols-2">
            <div className="space-y-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#0c352c]">
                <Image src={hero} alt="Couverture principale de la boutique" fill sizes="(max-width: 800px) 100vw, 50vw" className="object-cover" />
              </div>
              <label className="block text-sm font-bold text-[#133c30]">Image principale
                <select name="hero_image_selected" defaultValue="" className="mt-2 w-full rounded-xl border border-[#d6d6cf] bg-white p-3 font-normal">
                  <option value="">Conserver l’image actuelle</option>
                  {images.map(image => <option key={image.id} value={image.url}>{image.title || 'Image sans titre'}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-[#133c30]">Ou téléverser une autre image
                <input name="hero_image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" />
              </label>
            </div>
            <div className="space-y-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#0c352c]">
                <Image src={lounge} alt="Second visuel de Noël" fill sizes="(max-width: 800px) 100vw, 50vw" className="object-cover" />
              </div>
              <label className="block text-sm font-bold text-[#133c30]">Image de la maison
                <select name="lounge_image_selected" defaultValue="" className="mt-2 w-full rounded-xl border border-[#d6d6cf] bg-white p-3 font-normal">
                  <option value="">Conserver l’image actuelle</option>
                  {images.map(image => <option key={image.id} value={image.url}>{image.title || 'Image sans titre'}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-[#133c30]">Ou téléverser une autre image
                <input name="lounge_image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" />
              </label>
            </div>
          </div>
        </section>

        <section className="admin-panel p-6 md:p-8">
          <h2 className="mb-5 text-2xl">Les deux petites photographies du hero</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {([['hero_side_selected', 'Carte supérieure', settings.heroSideImage], ['hero_lower_selected', 'Carte inférieure · autre style de pyjama', settings.heroLowerImage]] as const).map(([name, label, current]) => <label key={name} className="grid gap-3 text-sm font-bold">
              <span>{label}</span>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Image src={current} alt={label} fill sizes="(max-width: 800px) 90vw, 40vw" className="object-contain" /></div>
              <select name={name} defaultValue="" className="w-full rounded-xl border p-3 font-normal"><option value="">Conserver l’image actuelle</option>{images.map(image => <option key={image.id} value={image.url}>{image.title || 'Image sans titre'}</option>)}</select>
            </label>)}
          </div>
        </section>
        <section className="admin-panel p-6 md:p-8">
          <div className="admin-panel-title">
            <div><p>02 · LE FILM</p><h2>La vidéo de Noël</h2></div>
            <Film className="text-[#b3203a]" size={25}/>
          </div>
          <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <video
              className="aspect-[3/4] w-full rounded-2xl bg-[#0c352c] object-cover"
              src={settings.featuredVideoUrl}
              preload="none"
              controls
              playsInline
              poster="/christmas-2026/family-together.jpg"
              aria-label="Aperçu de la vidéo mise en avant"
            />
            <div className="space-y-4">
              <p className="text-sm leading-7 text-[#5c6a61]">
                Choisis la vidéo qui apparaîtra dans la section « Derrière la magie » du site.
                Elle ne démarre pas automatiquement, pour préserver l’expérience mobile et la connexion des visiteurs.
              </p>
              <label className="block text-sm font-bold text-[#133c30]">
                Vidéo mise à l’honneur
                <select name="featured_video_url" defaultValue={videos.some(video => video.url === settings.featuredVideoUrl) ? settings.featuredVideoUrl : ''} className="mt-2 w-full rounded-xl border border-[#d6d6cf] bg-white p-3 font-normal">
                  <option value="">Film de Noël familial — version de référence</option>
                  {videos.map(video => <option key={video.id} value={video.url}>{video.title || 'Vidéo sans titre'}</option>)}
                </select>
              </label>
              <p className="admin-upload-note">Besoin d’une nouvelle vidéo ? Ajoute-la d’abord dans « Photos & vidéos », puis reviens choisir ton film.</p>
            </div>
          </div>
        </section>

        <input type="hidden" name="featured_video_original" value={settings.featuredVideoUrl} />
        <input type="hidden" name="hero_image_url" value={hero} />
        <input type="hidden" name="lounge_image_url" value={lounge} />
        <input type="hidden" name="site_name" value={settings.siteName} />
        <input type="hidden" name="whatsapp_phone" value={settings.whatsappPhone} />
        <input type="hidden" name="whatsapp_message" value={settings.whatsappDefaultMessage} />
        <input type="hidden" name="instagram_url" value={settings.instagramUrl} />
        <input type="hidden" name="tiktok_url" value={settings.tiktokUrl} />
        <button className="admin-primary-button min-h-12 w-full md:w-auto" type="submit">Enregistrer l’accueil Noël</button>
      </form>
    </div>
  );
}
