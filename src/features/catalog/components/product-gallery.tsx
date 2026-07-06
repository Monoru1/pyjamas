import type { ProductDetails } from '@/features/catalog/types';

interface ProductGalleryProps {
  product: ProductDetails;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = product.images.length > 0 ? product.images : [];
  const primary = images.find((image) => image.isPrimary) ?? images[0];

  return (
    <div className="space-y-4">
      <div className="flex aspect-[4/5] items-center justify-center rounded-[2.5rem] border border-brand-primary/10 bg-brand-soft/60 p-6">
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primary.url} alt={primary.altFr ?? product.nameFr} className="h-full w-full rounded-[2rem] object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-dashed border-brand-primary/20 text-center text-brand-primary/60">
            Photos produit a ajouter depuis le back-office
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(0, 4).map((image) => (
            <div key={image.id} className="aspect-square overflow-hidden rounded-2xl bg-brand-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.altFr ?? product.nameFr} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
