import Image from 'next/image';
import { EmptyProducts } from '@/components/marketing/empty-products';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ProductCard } from '@/features/catalog/components/product-card';
import type { CatalogProduct } from '@/features/catalog/types';
import type { StoreSettings } from '@/lib/repositories/settings.repository';

interface LuxeHomeProps {
  settings: StoreSettings;
  products: CatalogProduct[];
}

export function LuxeHome({ settings, products }: LuxeHomeProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="snow-field" />
      <div className="intro-curtain">
        <div className="rounded-[2rem] bg-white/95 px-7 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur">
          <Image src="/brand/logo-maison-pyjamas.svg" alt="La Maison des Pyjamas" width={360} height={152} priority unoptimized className="h-24 w-auto object-contain md:h-32" />
        </div>
      </div>

      <section className="relative px-4 py-8 sm:px-5 md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="relative min-h-[580px] overflow-hidden rounded-[2rem] bg-brand-evergreen text-white shadow-[0_35px_120px_rgba(15,59,46,0.28)] sm:min-h-[640px] md:rounded-[3.5rem] lg:min-h-[760px]">
            <Image
              src={settings.heroImage}
              alt="Famille en pyjamas de Noël"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-evergreen via-brand-evergreen/82 to-brand-evergreen/8" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-evergreen/30 via-transparent to-transparent" />
            <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-brand-primary/35 blur-3xl" />

            <div className="relative flex min-h-[580px] max-w-3xl flex-col justify-between gap-8 p-6 sm:min-h-[640px] sm:gap-12 sm:p-9 md:p-12 lg:min-h-[760px]">
              <div className="flex items-center gap-5">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-brand-accent backdrop-blur">
                  Noël 2026
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand-accent md:text-sm">{settings.siteName}</p>
                <h1 className="mt-5 text-[2.7rem] font-semibold leading-[0.9] tracking-[-0.065em] sm:mt-6 sm:text-6xl md:text-8xl lg:text-[7.8rem]">
                  Offrir la chaleur. Porter le luxe.
                </h1>
                <p className="mt-6 max-w-xl text-sm leading-7 text-white/82 sm:mt-8 sm:text-base sm:leading-8 md:text-xl">
                  Une sélection de pyjamas de Noël pensée pour les moments inoubliables en famille.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a href="#vedettes" className="magnetic-cta rounded-full bg-brand-primary px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_55px_rgba(143,20,40,0.34)]">
                    Découvrir la collection
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {['Idéal à offrir', 'Qualité premium', 'Commande WhatsApp'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-xs font-semibold backdrop-blur sm:rounded-3xl sm:p-4 sm:text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-5 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="rounded-[2.5rem] bg-brand-primary p-8 text-white shadow-[0_30px_90px_rgba(143,20,40,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-accent">Rituel de fête</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] md:text-6xl">Un matin de Noël en un clic.</h2>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-[2.5rem] border border-brand-primary/10 shadow-[0_30px_90px_rgba(80,34,28,0.10)]">
            <Image src={settings.loungeImage} alt="Salon chaleureux le matin de Noël" fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section id="vedettes" className="px-4 pb-16 sm:px-5 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">Sélection cadeau</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
                Les pièces qui doivent faire ouvrir le panier.
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
