import { CollectionFilms } from '@/components/marketing/collection-films';
import { listCollectionFilms } from '@/lib/repositories/films.repository';
import Link from 'next/link';
import { ArrowUpRight, Gift, Sparkles } from 'lucide-react';

export const revalidate = 60;

export default async function CollectionsPage() {
  const films = await listCollectionFilms();
  return (
    <main className="min-h-screen bg-[#fff9f3] pb-24">
      <CollectionFilms films={films}>
        <div className="flex flex-col justify-center rounded-t-[28px] bg-[#0c352c] p-8 text-[#fff9ed] sm:p-12 lg:rounded-l-[32px] lg:rounded-tr-none lg:p-16">
          <span className="mb-7 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-[#f2d093]"><Sparkles size={17}/> ÉDITION 2026</span>
          <h1 className="mb-7 text-5xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">La collection <em className="text-[#f7d5a7]">Noël.</em></h1>
          <p className="mb-9 max-w-lg text-base leading-8 text-[#f2eee4]">Les tenues à partager, les souvenirs à créer et la chaleur des moments en famille. Toute la magie est réunie dans une seule collection.</p>
          <Link href="/catalogue?collection=noel" className="inline-flex min-h-13 w-fit items-center gap-3 rounded-full bg-[#b3203a] px-6 py-4 text-sm font-bold text-white">
            Découvrir la collection <ArrowUpRight size={18}/>
          </Link>
          <span className="mt-12 inline-flex items-center gap-3 text-sm text-[#e4c39c]"><Gift size={20}/> Une saison. Mille souvenirs.</span>
        </div>
      </CollectionFilms>

    </main>
  );
}
