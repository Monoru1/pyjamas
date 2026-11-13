import { CampaignImage as Image } from '@/components/marketing/campaign-image';
import { CatalogueExperience } from '@/features/catalog/components/catalogue-experience';
import { listProducts } from '@/lib/repositories/catalog.repository';

export const dynamic = 'force-dynamic';

// Real campaign photos imported from the shop's own Drive.
// These are editorial photos, not a substitute for verified product variants.
const shootingPhotos = [
  '/christmas-2026/shooting-drive/shoot-01.jpg',
  '/christmas-2026/shooting-drive/shoot-03.jpg',
  '/christmas-2026/shooting-drive/shoot-04.jpg',
];

export default async function CataloguePage() {
  const products = (await listProducts(72)).filter(product => product.collectionSlugs.includes('noel'));

  return (
    <main className="relative min-h-screen bg-[#fff8f3] px-4 py-7 text-[#0c352c] sm:px-6 md:px-8 md:py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="rounded-[2rem] bg-[#b3203a] p-7 text-[#fff8ed] sm:p-10 md:rounded-[3rem] md:p-14">
          <p className="text-xs font-bold uppercase tracking-[.3em] text-[#f5d59f]">ÉDITION NOËL 2026</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-7xl">
            Le bonheur est encore plus doux <em className="text-[#f8d09c]">ensemble.</em>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#f5eee5]">
            Découvrez les modèles du shooting. Prix provisoires ; tailles et disponibilités à confirmer auprès de la boutique.
          </p>
        </section>
        <section aria-labelledby="shooting-title" className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b3203a]">Notre shooting</p>
              <h2 id="shooting-title" className="mt-2 font-serif text-3xl sm:text-4xl">Découvrez l’univers de Noël</h2>
              <p className="mt-2 text-sm text-[#52645d]">
                Découvrez les vrais modèles de notre shooting de Noël. Les tailles et disponibilités des fiches produits sont mises à jour progressivement.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {shootingPhotos.map((src, index) => (
                <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#f0e5de]">
                  <Image src={src} alt={`Véritable shooting de pyjamas Noël, photographie ${index + 1}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                </div>
              ))}
            </div>
          </section>
        <CatalogueExperience products={products} initialCollection="noel" collectionName="Noël 2026" />
      </div>
    </main>
  );
}
