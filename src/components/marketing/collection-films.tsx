'use client';
/* eslint-disable @next/next/no-img-element -- Local precompressed video posters. */
import { useRef, useState } from 'react';
import { ArrowDown, Play, Sparkles } from 'lucide-react';
import styles from './collection-films.module.css';

export type CollectionFilm = { src: string; poster: string; title: string; duration: number };

function durationLabel(duration: number) {
  return `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;
}

export function CollectionFilms({ films }: { films: CollectionFilm[] }) {
  const [selected, setSelected] = useState(0);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const player = useRef<HTMLDivElement>(null);
  const film = films[selected];

  function choose(index: number) {
    setSelected(index); setStarted(true); setFailed(false);
    player.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  return <div className={styles.cinema}>
    <header className="mx-auto max-w-[1380px] px-5 pb-9 pt-12 text-center sm:px-8 sm:pb-12 sm:pt-20">
      <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.3em] text-[#dfbd83]"><Sparkles size={16} aria-hidden="true"/> LA MAISON DES PYJAMAS · ÉDITION 2026</p>
      <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight sm:text-7xl">Noël, <em className="text-[#e9c793]">en mouvement.</em></h1>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#d0d9cf] sm:text-base">Les couleurs de la fête. La douceur des retrouvailles.<br/>Entrez dans les films de notre collection Noël.</p>
      <a href="#films-noel" className="mt-7 inline-flex items-center gap-2 border-b border-[#dfbd83]/50 pb-2 text-xs font-semibold uppercase tracking-[.17em] text-[#e9c793]">Explorer les films <ArrowDown size={15} aria-hidden="true"/></a>
    </header>

    {film ? <>
      <section aria-label="Film sélectionné" className="mx-auto max-w-[1380px] px-4 sm:px-8">
        <div ref={player} className={`${styles.screen} scroll-mt-5`}>
          <img src={film.poster} alt="" aria-hidden="true" className={styles.ambient}/>
          <div className={styles.vignette}/>
          <div key={film.src} className={styles.frame}>
            {started ? <video src={film.src} poster={film.poster} controls autoPlay playsInline preload="metadata" aria-label={film.title} onError={()=>setFailed(true)} className="relative h-full w-full object-contain"/> : <button type="button" onClick={()=>setStarted(true)} aria-label={`Lire : ${film.title}`} className={`${styles.cover} group`}>
              <img src={film.poster} alt="" fetchPriority="high" className="h-full w-full object-contain"/>
              <span className="absolute inset-0 flex items-center justify-center bg-black/15"><span className={styles.play}><Play size={30} aria-hidden="true"/></span></span>
              <span className="absolute inset-x-0 bottom-6 text-center text-xs font-semibold uppercase tracking-[.2em] text-white">Lancer le film</span>
            </button>}
          </div>
          <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/20 bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[.2em] text-[#f0d5aa] sm:left-6 sm:top-6">La collection Noël</span>
        </div>
        <div className="flex items-start justify-between gap-4 border-b border-[#e9c793]/20 py-6 sm:py-8" aria-live="polite"><div><p className="text-[10px] uppercase tracking-[.25em] text-[#c2a878]">À L’AFFICHE</p><h2 className="mt-2 font-serif text-2xl sm:text-4xl">{film.title}</h2></div><span className="pt-2 text-xs tabular-nums text-[#c2a878]">{durationLabel(film.duration)}</span></div>
        {failed && <div role="alert" className="mt-4 rounded-xl bg-[#fff8e9] p-4 text-sm text-red-900"><p>Ce film est momentanément indisponible. Choisissez un autre film ou réessayez.</p><button type="button" onClick={()=>{setStarted(false);setFailed(false);}} className="mt-2 min-h-11 underline">Réessayer ce film</button></div>}
      </section>

      <section id="films-noel" aria-labelledby="films-title" className="mx-auto max-w-[1380px] scroll-mt-8 px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="mb-7 flex items-end justify-between gap-5"><div><p className="text-[10px] uppercase tracking-[.25em] text-[#c2a878]">INSTANTS CHOISIS</p><h2 id="films-title" className="mt-3 font-serif text-3xl sm:text-4xl">Les films de Noël.</h2></div><span className="text-xs text-[#c2a878]">{films.length} films</span></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {films.map((item,index)=><button key={item.src} type="button" onClick={()=>choose(index)} aria-pressed={item.src===film.src} aria-label={`Lire : ${item.title}`} className={`${styles.card} group text-left`}>
            <div className={styles.poster}><img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover"/><span className={styles.shade}/><span className="absolute left-3 top-3 text-[10px] tracking-[.2em] text-white/80">{String(index+1).padStart(2,'0')}</span><span className={styles.smallPlay}><Play size={20} aria-hidden="true"/></span><span className="absolute bottom-3 right-3 text-[10px] tabular-nums text-white">{durationLabel(item.duration)}</span>{item.src===film.src && <span className="absolute bottom-3 left-3 text-[9px] font-semibold uppercase tracking-widest text-[#f1d29d]">À l’affiche</span>}</div>
            <h3 className="mt-3 text-sm font-medium leading-6 text-[#fff8e9] sm:text-base">{item.title}</h3>
          </button>)}
        </div>
      </section>
    </> : <p className="px-6 pb-20 text-center text-[#d0d9cf]">Les films de la collection seront bientôt disponibles.</p>}
  </div>;
}
