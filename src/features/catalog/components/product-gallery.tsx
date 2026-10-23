'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductDetails } from '@/features/catalog/types';

interface ProductGalleryProps {
  product: ProductDetails;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = product.images.length > 0 ? product.images : [];
  const primary = images.find((image) => image.isPrimary) ?? images[0];
  const [selectedId, setSelectedId] = useState(primary?.id);
  const selected = images.find(image => image.id === selectedId) ?? primary;
  const selectedIndex = images.findIndex(image => image.id === selected?.id);

  function move(offset: number) {
    const next = images[(selectedIndex + offset + images.length) % images.length];
    if (next) setSelectedId(next.id);
  }

  return (
    <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[2rem] border border-brand-primary/10 bg-brand-soft/60 p-3 shadow-[0_30px_90px_rgba(80,34,28,0.12)] sm:p-4 md:rounded-[3rem] md:p-6">
        <div className="absolute left-6 top-6 z-10 rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-evergreen">
          Edition fete
        </div>
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={selected.id} src={selected.url} alt={selected.altFr ?? product.nameFr} className="h-full w-full rounded-[1.65rem] object-contain md:rounded-[2.5rem]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] border border-dashed border-brand-primary/20 text-center text-brand-primary/60">
            Photo produit a ajouter
          </div>
        )}
        {images.length > 1 && <div className="absolute inset-x-4 bottom-5 flex items-center justify-between gap-3"><button type="button" onClick={()=>move(-1)} aria-label="Photo précédente" className="rounded-full bg-white/95 p-3 text-brand-primary shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4"><ChevronLeft size={20} aria-hidden="true"/></button><span aria-live="polite" className="rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-brand-primary">{selectedIndex+1} / {images.length}</span><button type="button" onClick={()=>move(1)} aria-label="Photo suivante" className="rounded-full bg-white/95 p-3 text-brand-primary shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4"><ChevronRight size={20} aria-hidden="true"/></button></div>}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button type="button" key={image.id} onClick={()=>setSelectedId(image.id)} aria-label={`Voir la photo ${index+1} de ${product.nameFr}`} aria-pressed={selected?.id===image.id} className={`aspect-square overflow-hidden rounded-2xl border-2 bg-brand-soft shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary ${selected?.id===image.id ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-transparent'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-110 motion-reduce:transition-none" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
