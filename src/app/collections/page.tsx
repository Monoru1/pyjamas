import { CollectionFilms } from '@/components/marketing/collection-films';
import { listCollectionFilms } from '@/lib/repositories/films.repository';
import { listProducts } from '@/lib/repositories/catalog.repository';
import { ProductCard } from '@/features/catalog/components/product-card';
import { CampaignImage } from '@/components/marketing/campaign-image';
import Link from 'next/link';
import { ArrowUpRight, Gift, Sparkles } from 'lucide-react';

export const revalidate = 60;

export default async function CollectionsPage() {
  const [allFilms, catalogue] = await Promise.all([listCollectionFilms(), listProducts(72)]);
  // Preserve the original first two pages (six films each), in the existing order.
  const films = allFilms.slice(0, 12);
  const products = catalogue.filter(product => product.collectionSlugs.includes('noel'));
  return (
    <main className="min-h-screen bg-[#fff9f3] pb-24">
      <section className="mx-auto grid max-w-[1380px] px-4 pt-7 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:pt-12" aria-labelledby="noel-title">
        <div className="flex flex-col justify-center rounded-t-[28px] bg-[#0c352c] p-8 text-[#fff9ed] sm:p-12 lg:rounded-l-[32px] lg:rounded-tr-none lg:p-14">
          <p className="mb-7 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-[#f2d093]"><Sparkles size={17} aria-hidden="true"/> LA COLLECTION NOËL · 2026</p>
          <h1 id="noel-title" className="text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">Le plus beau cadeau ? <em className="block text-[#f7d5a7]">Être ensemble.</em></h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-[#f2eee4]">Des pyjamas assortis, des éclats de rire et des souvenirs qui restent. Cette année, habillez vos moments de Noël aux couleurs de la maison.</p>
          <a href="#modeles-noel" className="mt-8 inline-flex min-h-13 w-fit items-center gap-3 rounded-full bg-[#b3203a] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#94192f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Trouver mon pyjama <ArrowUpRight size={18} aria-hidden="true"/></a>
          <p className="mt-8 text-sm text-[#e4c39c]">Pour les grands, les tout-petits et tous vos moments partagés.</p>
        </div>
        <div className="relative min-h-[440px] overflow-hidden rounded-b-[28px] bg-[#e8ddd1] sm:min-h-[580px] lg:min-h-[720px] lg:rounded-r-[32px] lg:rounded-bl-none">
          <CampaignImage src="/christmas-2026/shooting-drive/shoot-01.jpg" alt="La famille réunie en pyjamas assortis pour le shooting de Noël de La Maison des Pyjamas" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover"/>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-7 pb-7 pt-24 text-white"><p className="text-xs font-bold uppercase tracking-[.25em]">La Maison des Pyjamas</p><p className="mt-2 font-serif text-3xl">Un Noël qui nous ressemble.</p></div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1380px] flex-wrap justify-between gap-5 px-6 py-9 text-sm font-semibold text-[#123d30] sm:py-12">
        <span className="inline-flex items-center gap-3"><Gift size={22} className="text-[#b3203a]" aria-hidden="true"/> Le plaisir d’offrir</span>
        <span className="inline-flex items-center gap-3"><Sparkles size={22} className="text-[#b3203a]" aria-hidden="true"/> Des looks à partager en famille</span>
        <span>Du premier Noël aux grands souvenirs</span>
      </div>

      <section id="modeles-noel" aria-labelledby="modeles-title" className="mx-auto max-w-[1380px] scroll-mt-8 px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#b3203a]">LES PIÈCES DE LA COLLECTION</p><h2 id="modeles-title" className="mt-3 font-serif text-4xl text-[#123d30] sm:text-5xl">À chacun son Noël.</h2><p className="mt-4 max-w-2xl leading-7 text-[#68766b]">Carreaux iconiques, imprimés de fête et douceur pour bébé : choisissez les pièces qui accompagneront vos retrouvailles.</p></div><Link href="/catalogue?collection=noel" className="inline-flex items-center gap-2 border-b border-[#123d30] pb-2 text-sm font-semibold text-[#123d30]">Tout le catalogue <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
        {products.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <Link href="/catalogue?collection=noel" className="inline-flex rounded-full bg-[#123d30] px-6 py-4 font-semibold text-white">Explorer les modèles</Link>}
        <p className="mt-5 text-sm text-[#68766b]">Prix provisoires. La boutique confirme les tailles et disponibilités lors de votre demande.</p>
      </section>

      <section className="mx-auto max-w-[1380px] px-4 sm:px-6" aria-labelledby="ensemble-title"><div className="grid overflow-hidden rounded-[28px] bg-[#f0e6db] md:grid-cols-2"><div className="relative min-h-[400px] md:min-h-[520px]"><CampaignImage src="/christmas-2026/shooting-drive/shoot-03.jpg" alt="Les pyjamas de Noël portés pendant le shooting de la collection" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover"/></div><div className="flex flex-col justify-center p-8 text-[#123d30] sm:p-12"><p className="text-xs font-bold uppercase tracking-[.25em] text-[#b3203a]">LES PETITS RITUELS, LES GRANDS SOUVENIRS</p><h2 id="ensemble-title" className="mt-5 font-serif text-4xl sm:text-5xl">Le même esprit.<br/>Chacun son style.</h2><p className="mt-6 leading-8 text-[#52645d]">Une photo au pied du sapin, une matinée qui s’étire, un cadeau ouvert ensemble… Nos pyjamas s’invitent dans ces instants tout simples qui font la magie de Noël.</p><a href="#modeles-noel" className="mt-7 inline-flex w-fit items-center gap-2 font-semibold">Composer nos looks <ArrowUpRight size={18} aria-hidden="true"/></a></div></div></section>

      <CollectionFilms films={films}>
        <div className="flex flex-col justify-center rounded-t-[28px] bg-[#0c352c] p-8 text-[#fff9ed] sm:p-12 lg:rounded-l-[32px] lg:rounded-tr-none lg:p-16">
          <span className="mb-7 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-[#f2d093]"><Sparkles size={17} aria-hidden="true"/> LA COLLECTION EN MOUVEMENT</span>
          <h2 className="mb-7 font-serif text-4xl leading-[1.12] sm:text-5xl">La magie se vit.<br/><em className="text-[#f7d5a7]">Et se partage.</em></h2>
          <p className="mb-9 max-w-lg text-base leading-8 text-[#f2eee4]">Les tenues à partager, les souvenirs à créer et la chaleur des moments en famille. Toute la magie est réunie dans une seule collection.</p>
          <Link href="/catalogue?collection=noel" className="inline-flex min-h-13 w-fit items-center gap-3 rounded-full bg-[#b3203a] px-6 py-4 text-sm font-bold text-white">
            Découvrir la collection <ArrowUpRight size={18}/>
          </Link>
          <span className="mt-12 inline-flex items-center gap-3 text-sm text-[#e4c39c]"><Gift size={20}/> Une saison. Mille souvenirs.</span>
        </div>
      </CollectionFilms>
      <div className="mx-4 mt-16 rounded-[28px] bg-[#b3203a] px-7 py-12 text-center text-[#fff9ed] sm:mx-6 sm:mt-20 sm:px-12"><Gift className="mx-auto mb-5 text-[#f2d093]" size={30} aria-hidden="true"/><p className="font-serif text-3xl sm:text-4xl">Vos plus beaux souvenirs commencent ici.</p><Link href="/catalogue?collection=noel" className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#fff9ed] px-6 py-4 text-sm font-bold text-[#123d30]">Choisir mes pyjamas de Noël <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </main>
  );
}
