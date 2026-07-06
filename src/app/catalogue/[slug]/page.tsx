import { notFound } from 'next/navigation';
import { ProductGallery } from '@/features/catalog/components/product-gallery';
import { VariantPicker } from '@/features/catalog/components/variant-picker';
import { getProductBySlug } from '@/lib/repositories/catalog.repository';
import { formatPrice } from '@/lib/utils/money';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <ProductGallery product={product} />

        <section className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              {product.categoryNameFr ?? 'Catalogue'}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{product.nameFr}</h1>
            {product.descriptionFr ? (
              <p className="max-w-2xl text-base leading-8 text-foreground/65">{product.descriptionFr}</p>
            ) : null}
            <p className="text-2xl font-semibold text-brand-primary">
              Dès {formatPrice(product.basePrice, product.currencyCode)}
            </p>
          </div>

          <VariantPicker product={product} />
        </section>
      </div>
    </main>
  );
}
