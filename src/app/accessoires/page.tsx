import { ProductGrid } from '@/features/catalog/components/product-grid';
import { listProducts } from '@/lib/repositories/catalog.repository';

export default async function AccessoiresPage() {
  const products = (await listProducts(72)).filter((product) => product.categorySlug === 'accessoires');

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="overflow-hidden rounded-[2.5rem] bg-brand-primary p-7 text-white md:rounded-[3rem] md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-accent md:text-sm">Accessoires de fête</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-5xl md:text-7xl">
            Les petits détails qui rendent le cadeau inoubliable.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/78">
            Chaussons tout doux, plaids chaleureux, pochettes élégantes et coffrets prêts à déposer sous le sapin.
          </p>
          <a href="/catalogue?type=accessory" className="mt-8 inline-flex rounded-full bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-evergreen">
            Voir les accessoires
          </a>
        </section>

        {products.length > 0 ? <ProductGrid products={products} /> : (
          <section className="rounded-[2.5rem] border border-brand-primary/10 bg-white/80 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">Sélection en préparation</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Les accessoires arrivent bientôt.</h2>
          </section>
        )}
      </div>
    </main>
  );
}
