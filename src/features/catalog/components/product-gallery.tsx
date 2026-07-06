import type { ProductDetails } from '@/features/catalog/types';

interface ProductGalleryProps {
  product: ProductDetails;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = product.images.length > 0 ? product.images : [];
  const primary = images.find((image) => image.isPrimary) ?? images[0];

  return (
    <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[3rem] border border-brand-primary/10 bg-brand-soft/60 p-4 shadow-[0_30px_90px_rgba(80,34,28,0.12)] md:p-6">
        <div className="absolute left-6 top-6 z-10 rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-evergreen">
          Edition fete
        </div>
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primary.url} alt={primary.altFr ?? product.nameFr} className="h-full w-full rounded-[2.5rem] object-cover transition duration-700 hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] border border-dashed border-brand-primary/20 text-center text-brand-primary/60">
            Photo produit a ajouter
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(0, 4).map((image) => (
            <div key={image.id} className="aspect-square overflow-hidden rounded-2xl bg-brand-soft shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.altFr ?? product.nameFr} className="h-full w-full object-cover transition duration-500 hover:scale-110" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
