import type { CatalogProduct } from '@/features/catalog/types';
import { formatPrice } from '@/lib/utils/money';

interface ProductCardProps {
  product: CatalogProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-brand-primary/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex aspect-[4/5] items-center justify-center bg-brand-soft/60 p-8">
        {product.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImageUrl}
            alt={product.nameFr}
            className="h-full w-full rounded-[1.5rem] object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] border border-dashed border-brand-primary/20 text-center text-sm text-brand-primary/60">
            Photo produit à ajouter
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary/65">
            {product.categoryNameFr ?? 'Pyjama'}
          </p>
          {product.isNew ? (
            <span className="rounded-full bg-brand-accent/20 px-3 py-1 text-xs font-semibold text-brand-primary">
              Nouveau
            </span>
          ) : null}
        </div>

        <h3 className="text-xl font-semibold leading-snug">{product.nameFr}</h3>
        <p className="text-sm text-foreground/60">Stock total : {product.totalStock}</p>
        <p className="text-lg font-semibold text-brand-primary">
          Dès {formatPrice(product.basePrice, product.currencyCode)}
        </p>
      </div>
    </article>
  );
}
