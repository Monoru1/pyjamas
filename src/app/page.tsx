import { listFeaturedProducts } from '@/lib/repositories/catalog.repository';
import { getStoreSettings } from '@/lib/repositories/settings.repository';
import { formatPrice } from '@/lib/utils/money';

export default async function HomePage() {
  const [settings, featuredProducts] = await Promise.all([
    getStoreSettings(),
    listFeaturedProducts(6),
  ]);

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 rounded-3xl border border-brand-primary/10 bg-white/70 p-8 shadow-sm">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">
            {settings.siteName}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Préparez Noël avec des pyjamas élégants, doux et prêts à commander.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-foreground/70">
            La fondation est connectée à Supabase : paramètres boutique, catalogue et produits
            vedettes sont maintenant lus depuis la vraie base.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <article
                key={product.id}
                className="rounded-2xl border border-brand-primary/10 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary/70">
                  {product.categoryNameFr ?? 'Collection'}
                </p>
                <h2 className="mt-3 text-xl font-semibold">{product.nameFr}</h2>
                <p className="mt-2 text-sm text-foreground/60">
                  Stock total : {product.totalStock}
                </p>
                <p className="mt-4 text-lg font-semibold text-brand-primary">
                  Dès {formatPrice(product.basePrice, product.currencyCode)}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-brand-primary/20 bg-brand-soft/40 p-6 md:col-span-3">
              <p className="font-semibold">Aucun produit vedette pour le moment.</p>
              <p className="mt-2 text-sm text-foreground/60">
                Dès que le back-office aura des produits actifs et mis en avant, ils apparaîtront ici.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
