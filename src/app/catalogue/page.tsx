import { CatalogueExperience } from '@/features/catalog/components/catalogue-experience';
import { listProducts } from '@/lib/repositories/catalog.repository';

interface CataloguePageProps {
  searchParams?: Promise<{
    collection?: string;
    type?: string;
  }>;
}

export default async function CataloguePage({ searchParams }: CataloguePageProps) {
  const products = await listProducts(72);
  const params = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-10 text-foreground md:px-8">
      <div className="pointer-events-none absolute -right-24 top-10 h-96 w-96 rounded-full bg-brand-accent/15 blur-3xl" />
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="rounded-[3rem] bg-brand-evergreen p-8 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Catalogue</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] md:text-7xl">
            Choisir une pièce douce, belle et prête à offrir.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/72">
            Pyjamas de Noël, essentiels maison et accessoires cocooning : filtrez l’ambiance, puis composez le cadeau parfait.
          </p>
        </section>
        <CatalogueExperience products={products} initialCollection={params?.collection} initialType={params?.type} />
      </div>
    </main>
  );
}
