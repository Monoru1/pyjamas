'use client';
/* eslint-disable @next/next/no-img-element -- Posters are precompressed local WebP files. */
import { useRef, useState } from 'react';
import { Play, ArrowLeft, ArrowRight } from 'lucide-react';
export type CollectionFilm = { src: string; poster: string; title: string; duration: number };
const PAGE_SIZE = 6;
export function CollectionFilms({ films, children }: { films: CollectionFilm[]; children: React.ReactNode }) {
  const [selected, setSelected] = useState(0); const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false); const [page, setPage] = useState(0);
  const player = useRef<HTMLDivElement>(null); const film = films[selected];
  const pageCount = Math.ceil(films.length / PAGE_SIZE);
  function choose(index: number) {
    setSelected(index); setStarted(true); setFailed(false);
    player.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return <>
    <section className="mx-auto grid max-w-[1380px] px-4 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
      {children}
      <div ref={player} className="relative min-h-[490px] overflow-hidden rounded-b-[28px] bg-[#123d30] lg:min-h-[680px] lg:rounded-r-[32px] lg:rounded-bl-none">
        {film ? started ? <video key={film.src} src={film.src} poster={film.poster} controls autoPlay playsInline preload="none" aria-label={film.title} className="absolute inset-0 h-full w-full object-contain" onError={() => setFailed(true)} /> : <button type="button" className="group absolute inset-0 h-full w-full text-white" onClick={() => setStarted(true)} aria-label={`Lire : ${film.title}`}>
          <img src={film.poster} alt="Découvrez la collection Noël en vidéo" className="h-full w-full object-cover" fetchPriority="high" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/20"><span className="rounded-full bg-white/95 p-6 text-[#b3203a]"><Play size={32} aria-hidden="true" /></span><span className="rounded-full bg-[#123d30]/90 px-6 py-3 font-semibold">Lire le film de la collection</span></span>
        </button> : <p className="p-10 text-white">Les films de Noël seront bientôt disponibles.</p>}
        {failed && <p role="alert" className="absolute inset-x-4 bottom-4 rounded-xl bg-white p-4 text-sm text-red-800">Cette vidéo est momentanément indisponible. Choisissez un autre film ou réessayez.</p>}
      </div>
    </section>
    {films.length > 0 && <section className="mx-auto max-w-[1380px] space-y-6 px-4 pt-12 sm:px-6" aria-labelledby="collection-films-title">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#b3203a]">LE NOËL DE LA MAISON</p><h2 id="collection-films-title" className="mt-3 font-serif text-4xl text-[#123d30]">Nos souvenirs en mouvement.</h2><p className="mt-3 text-[#68766b]">{films.length} films : les modèles, les coulisses et les moments partagés à la boutique.</p></div>
      <div className="flex items-center gap-3"><button type="button" aria-label="Films précédents" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-full border p-3 disabled:opacity-30"><ArrowLeft size={20} /></button><span className="text-sm" aria-live="polite">{page + 1} / {pageCount}</span><button type="button" aria-label="Films suivants" disabled={page === pageCount - 1} onClick={() => setPage(page + 1)} className="rounded-full border p-3 disabled:opacity-30"><ArrowRight size={20} /></button></div></div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{films.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item, offset) => <button key={item.src} type="button" onClick={() => choose(page * PAGE_SIZE + offset)} aria-pressed={item.src === film.src} className="overflow-hidden rounded-2xl border border-[#123d30]/15 bg-white text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b3203a]">
        <div className="relative aspect-video bg-[#123d30]"><img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="rounded-full bg-white/90 p-3 text-[#b3203a]"><Play size={22} aria-hidden="true" /></span></span></div><div className="flex items-center justify-between gap-3 p-5"><span className="font-semibold text-[#123d30]">{item.title}</span>{item.duration > 0 && <span className="shrink-0 text-xs text-[#68766b]">{Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}</span>}</div>
      </button>)}</div>
    </section>}
  </>;
}
