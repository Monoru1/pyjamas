import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data: collections } = await supabase
    .from('collections')
    .select('id, slug, name_fr, description_fr, image_url')
    .eq('is_active', true)
    .neq('slug', 'promotions')
    .order('sort_order');

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground sm:px-5 sm:py-8 md:px-8 md:py-10">
      <div className="pointer-events-none absolute -right-28 top-10 h-96 w-96 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 md:gap-10">
        <section className="rounded-[2rem] bg-brand-evergreen p-6 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] sm:p-8 md:rounded-[3rem] md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-accent sm:text-sm sm:tracking-[0.35em]">Collections</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold leading-[0.94] tracking-[-0.055em] sm:mt-5 sm:text-5xl md:text-7xl">
            Choisir un univers, trouver la bonne pièce.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:mt-6 sm:text-base sm:leading-8">
            Les collections sont composées depuis le studio de la maison.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {collections?.map((collection) => (
            <Link
              key={collection.id}
              href={`/catalogue?collection=${collection.slug}`}
              className="group relative min-h-[280px] overflow-hidden rounded-[2rem] bg-brand-evergreen p-6 text-white shadow-[0_24px_80px_rgba(80,34,28,0.10)] transition duration-300 hover:-translate-y-1 sm:min-h-[320px] sm:rounded-[2.5rem] sm:p-7 md:p-8"
            >
              {collection.image_url ? (
                <Image
                  src={collection.image_url}
                  alt={collection.name_fr}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  className="object-cover opacity-65 transition duration-500 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-evergreen via-brand-evergreen/35 to-transparent" />
              <div className="relative flex h-full flex-col justify-end">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-accent">Collection</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{collection.name_fr}</h2>
                <p className="mt-3 text-sm leading-6 text-white/75">{collection.description_fr || 'Découvrir la sélection.'}</p>
                <span className="mt-6 inline-flex w-fit rounded-full bg-white/20 px-5 py-3 text-sm font-semibold backdrop-blur">Explorer</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
