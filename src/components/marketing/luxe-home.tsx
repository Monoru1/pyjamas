import { EmptyProducts } from '@/components/marketing/empty-products';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProductCard } from '@/features/catalog/components/product-card';
import type { CatalogProduct } from '@/features/catalog/types';

interface LuxeHomeProps {
  siteName: string;
  products: CatalogProduct[];
}

const heroImage = 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1400&q=85';
const giftImage = 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1000&q=85';
const loungeImage = 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1000&q=85';

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

      <section className="relative px-4 py-8 sm:px-5 md:px-8 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-brand-evergreen text-white shadow-[0_35px_120px_rgba(15,59,46,0.28)] md:rounded-[3.5rem]">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-evergreen via-brand-evergreen/92 to-brand-primary/82" />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-brand-primary/40 blur-3xl" />

            <div className="relative flex min-h-[620px] flex-col justify-between gap-12 p-7 sm:p-9 md:p-12 lg:min-h-[760px]">
              <div className="flex items-center justify-between gap-4">
                <BrandLogo compact />
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-brand-accent backdrop-blur">
                  Noel 2026
                </span>
              </div>

              <div className="max-w-4xl">
                <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand-accent md:text-sm">{siteName}</p>
                <h1 className="mt-6 text-5xl font-semibold leading-[0.86] tracking-[-0.07em] sm:text-6xl md:text-8xl lg:text-[7.8rem]">
                  Offrir la chaleur. Porter le luxe.
                </h1>
                <p className="mt-8 max-w-2xl text-base leading-8 text-white/76 md:text-xl">
                  Une selection de pyjamas de Noel pensee comme un cadeau : douce, elegante, rapide a commander et impossible a oublier.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a href="#vedettes" className="rounded-full bg-brand-accent px-7 py-4 text-center text-sm font-semibold text-brand-evergreen shadow-[0_18px_55px_rgba(201,154,46,0.32)]">
                    Voir la selection
                  </a>
                  <a href="/catalogue" className="rounded-full border border-white/20 bg-white/10 px-7 py-4 text-center text-sm font-semibold text-white backdrop-blur">
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
            <div className="relative min-h-[420px] overflow-hidden rounded-[2.5rem] border border-brand-primary/10 bg-brand-cream shadow-[0_30px_90px_rgba(80,34,28,0.12)] md:rounded-[3rem]">
              <div className="absolute inset-0" style={{ backgroundImage: `url(${giftImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-evergreen/86 via-brand-evergreen/16 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 rounded-[2rem] border border-white/15 bg-white/12 p-6 text-white backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-accent">Gift season</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Le site doit sentir le paquet cadeau.</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
              {collections.map(([title, text]) => (
                <article key={title} className="group rounded-[2rem] border border-brand-primary/10 bg-white/82 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_20px_70px_rgba(80,34,28,0.12)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-primary/70">Collection</p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-foreground/60">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-5 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="rounded-[2.5rem] bg-brand-primary p-8 text-white shadow-[0_30px_90px_rgba(143,20,40,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-accent">Rituel de fete</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] md:text-6xl">Un matin de Noel en un clic.</h2>
          </div>
          <div className="min-h-[320px] overflow-hidden rounded-[2.5rem] border border-brand-primary/10 shadow-[0_30px_90px_rgba(80,34,28,0.10)]" style={{ backgroundImage: `url(${loungeImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>
      </section>

      <section id="vedettes" className="px-4 pb-16 sm:px-5 md:px-8">
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
