import { CatalogueExperience } from '@/features/catalog/components/catalogue-experience';
import { listProducts } from '@/lib/repositories/catalog.repository';

// The store is intentionally a single Noël collection for this season.
// Avoid dynamic searchParams/cookies so Next.js can prerender this page.
export const revalidate = 60;

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
            Explorez notre sélection de Noël, les tailles et couleurs disponibles et les ensembles à partager.
          </p>
        </section>
        <CatalogueExperience products={products} initialCollection="noel" collectionName="Noël 2026" />
      </div>
    </main>
  );
}
