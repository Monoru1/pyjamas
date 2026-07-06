import { EmptyProducts } from '@/components/marketing/empty-products';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProductCard } from '@/features/catalog/components/product-card';
import type { CatalogProduct } from '@/features/catalog/types';

interface LuxeHomeProps {
  siteName: string;
  products: CatalogProduct[];
}

const collections = [
  ['Famille', 'Le pyjama coordonne pour les photos, les cadeaux et les matins de fete.'],
  ['Elle', 'Textures douces, coupes elegantes, details qui font cadeau.'],
  ['Lui', 'Confort sobre, couleurs profondes et finition premium.'],
];

export function LuxeHome({ siteName, products }: LuxeHomeProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="snow-field" />
      <div className="intro-curtain">
        <div className="rounded-full border border-white/25 px-6 py-4 text-xs font-semibold uppercase tracking-[0.35em]">
          La Maison des Pyjamas
        </div>
      </div>

      <section className="relative px-5 py-10 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[3rem] bg-brand-evergreen p-8 text-white shadow-[0_35px_120px_rgba(15,59,46,0.26)] md:p-12">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-brand-primary/35 blur-3xl" />
            <div className="relative flex h-full min-h-[640px] flex-col justify-between gap-12">
              <div className="flex items-center justify-between">
                <BrandLogo compact />
                <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent">
                  Noel 2026
                </span>
              </div>

              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.45em] text-brand-accent">{siteName}</p>
                <h1 className="mt-6 text-6xl font-semibold leading-[0.88] tracking-[-0.06em] md:text-8xl">
                  Le cadeau qui donne envie de rester a la maison.
                </h1>
                <p className="mt-8 max-w-xl text-lg leading-8 text-white/72">
                  Pyjamas de Noel, silhouettes douces, couleurs profondes et commande WhatsApp en quelques secondes.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#vedettes" className="rounded-full bg-brand-accent px-7 py-4 text-center text-sm font-semibold text-brand-evergreen">
                    Voir la selection
                  </a>
                  <a href="/catalogue" className="rounded-full border border-white/20 px-7 py-4 text-center text-sm font-semibold text-white">
                    Catalogue complet
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {['Stock clair', 'Tailles visibles', 'Commande WhatsApp'].map((item) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-semibold backdrop-blur">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="relative min-h-[360px] overflow-hidden rounded-[3rem] border border-brand-primary/10 bg-brand-cream p-8 shadow-[0_30px_90px_rgba(80,34,28,0.10)]">
              <div className="absolute left-1/2 top-10 h-72 w-44 -translate-x-1/2 rounded-t-full bg-brand-primary shadow-[0_30px_70px_rgba(143,20,40,0.24)]" />
              <div className="absolute left-1/2 top-28 h-80 w-64 -translate-x-1/2 rounded-[4rem] bg-brand-soft" />
              <div className="absolute left-1/2 top-44 h-48 w-80 -translate-x-1/2 rounded-[3rem] bg-white/80 shadow-xl" />
              <div className="absolute inset-x-10 bottom-10 rounded-[2rem] bg-brand-evergreen p-6 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-accent">Ambiance</p>
                <p className="mt-3 text-2xl font-semibold">Creme chaud, bordeaux profond, or doux.</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
              {collections.map(([title, text]) => (
                <article key={title} className="rounded-[2rem] border border-brand-primary/10 bg-white/80 p-6 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-primary/70">Collection</p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-foreground/60">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="vedettes" className="px-5 pb-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">Selection cadeau</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
                Les pieces qui doivent faire ouvrir le panier.
              </h2>
            </div>
            <a href="/catalogue" className="rounded-full border border-brand-primary/20 bg-white/70 px-6 py-3 text-sm font-semibold text-brand-primary">
              Tout voir
            </a>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.length > 0 ? products.map((product) => <ProductCard key={product.id} product={product} />) : <EmptyProducts />}
          </div>
        </div>
      </section>
    </main>
  );
}
