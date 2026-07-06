import Link from 'next/link';
import type { CatalogProduct } from '@/features/catalog/types';
import { formatPrice } from '@/lib/utils/money';

interface ProductCardProps {
  product: CatalogProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const hasPromo = product.compareAtPrice && product.compareAtPrice > product.basePrice;

  return (
    <Link
      href={`/catalogue/${product.slug}`}
      className="group block overflow-hidden rounded-[2rem] border border-brand-primary/10 bg-white/90 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(80,34,28,0.16)]"
    >
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-brand-soft/60 p-4">
        {product.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.primaryImageUrl} alt={product.nameFr} className="h-full w-full rounded-[1.5rem] object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] border border-dashed border-brand-primary/20 text-center text-sm text-brand-primary/60">
            Photo produit a ajouter
          </div>
        )}
        <div className="absolute left-4 top-4 flex gap-2">
          {product.isNew ? <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-semibold text-brand-evergreen">Nouveau</span> : null}
          {hasPromo ? <span className="rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white">Offre</span> : null}
        </div>
        <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/82 p-3 text-xs font-semibold text-brand-primary opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
          Voir tailles, couleurs et stock
        </div>
      </div>

      <div className="space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary/65">
          {product.categoryNameFr ?? 'Pyjama'}
        </p>
        <h3 className="text-xl font-semibold leading-snug tracking-[-0.02em]">{product.nameFr}</h3>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-foreground/60">Stock : {product.totalStock}</p>
          <p className="text-lg font-semibold text-brand-primary">
            {formatPrice(product.basePrice, product.currencyCode)}
          </p>
        </div>
        {hasPromo ? (
          <p className="text-sm text-foreground/45 line-through">
            {formatPrice(product.compareAtPrice ?? product.basePrice, product.currencyCode)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
