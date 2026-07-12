import { CatalogueExperience } from '@/features/catalog/components/catalogue-experience';
import { listProducts } from '@/lib/repositories/catalog.repository';
import { createClient } from '@/lib/supabase/server';

interface CataloguePageProps {
  searchParams?: Promise<{
    collection?: string;
    type?: string;
  }>;
}

export default async function CataloguePage({ searchParams }: CataloguePageProps) {
  const products = await listProducts(72);
  const params = await searchParams;
  const collectionSlug = params?.collection;
  const supabase = await createClient();
  const { data: collection } = collectionSlug
    ? await supabase.from('collections').select('name_fr, description_fr').eq('slug', collectionSlug).eq('is_active', true).maybeSingle()
    : { data: null };
  const title = collection ? collection.name_fr : 'Choisir une pièce douce, belle et prête à offrir.';
  const description = collection?.description_fr || (collection
    ? 'Découvrez les articles sélectionnés dans cette collection.'
    : 'Découvrez les pyjamas, ensembles et accessoires de la maison.');

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-10 text-foreground md:px-8">
      <div className="pointer-events-none absolute -right-24 top-10 h-96 w-96 rounded-full bg-brand-accent/15 blur-3xl" />
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="rounded-[3rem] bg-brand-evergreen p-8 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Catalogue</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] md:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/72">
            {description}
          </p>
        </section>
        <CatalogueExperience products={products} initialCollection={collectionSlug} collectionName={collection?.name_fr} />
      </div>
    </main>
  );
}
