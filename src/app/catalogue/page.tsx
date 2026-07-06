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
          title="Selection Noel premium"
          description="Filtrez par collection, disponibilite et nouveaute. Le catalogue reste branche sur Supabase et pret pour le back-office."
        />
        <CatalogueExperience products={products} />
      </div>
    </main>
  );
}
