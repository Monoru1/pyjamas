import { SectionHeading } from '@/components/marketing/section-heading';
import { CatalogueExperience } from '@/features/catalog/components/catalogue-experience';
import { listProducts } from '@/lib/repositories/catalog.repository';

export default async function CataloguePage() {
  const products = await listProducts(48);

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <SectionHeading
          eyebrow="Catalogue"
          title="Sélection Noël premium"
          description="Des pièces douces, lumineuses et prêtes à offrir pour transformer chaque matin de fête en souvenir."
        />
        <CatalogueExperience products={products} />
      </div>
    </main>
  );
}
