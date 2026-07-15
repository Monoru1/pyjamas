import { notFound } from 'next/navigation';
import { ProductBenefits } from '@/features/catalog/components/product-benefits';
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
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-5 sm:py-8 md:px-8 md:py-10">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <ProductGallery product={product} />

        <section className="space-y-8">
          <div className="rounded-[2rem] border border-brand-primary/10 bg-white/70 p-5 shadow-[0_30px_90px_rgba(80,34,28,0.10)] backdrop-blur sm:p-6 md:rounded-[3rem] md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              {product.categoryNameFr ?? 'Edition Noel'}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.055em] sm:mt-5 sm:text-5xl md:text-7xl">
              {product.nameFr}
            </h1>
            {product.descriptionFr ? (
              <p className="mt-6 max-w-2xl text-base leading-8 text-foreground/65">{product.descriptionFr}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-end gap-4">
              <p className="text-3xl font-semibold text-brand-primary">
                {formatPrice(product.basePrice, product.currencyCode)}
              </p>
            </div>
          </div>

          <ProductBenefits />
          <VariantPicker product={product} />
        </section>
      </div>
    </main>
  );
}
