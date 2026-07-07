import { SectionHeading } from '@/components/marketing/section-heading';
import { CatalogueExperience } from '@/features/catalog/components/catalogue-experience';
import { listProducts } from '@/lib/repositories/catalog.repository';

interface CataloguePageProps {
  searchParams?: Promise<{
    collection?: string;
    type?: string;
  }>;
}

export default async function CataloguePage({ searchParams }: CataloguePageProps) {
  const [products, params] = await Promise.all([
    listProducts(72),
    searchParams ?? Promise.resolve({}),
  ]);

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <SectionHeading
          eyebrow="Catalogue"
          title="Sélection Noël premium"
          description="Des pièces douces, lumineuses et prêtes à offrir pour transformer chaque matin de fête en souvenir."
        />
        <CatalogueExperience products={products} initialCollection={params.collection} initialType={params.type} />
      </div>
    </main>
  );
}
