import { SectionHeading } from '@/components/marketing/section-heading';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { listProducts } from '@/lib/repositories/catalog.repository';

export default async function CataloguePage() {
  const products = await listProducts(48);

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <SectionHeading
          eyebrow="Catalogue"
          title="Tous les pyjamas disponibles"
          description="Cette page affichera le catalogue complet avec filtres par collection, taille, couleur et stock."
        />
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
