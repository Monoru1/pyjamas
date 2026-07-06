'use client';

import { useCartStore } from '@/features/cart/cart.store';
import { formatPrice } from '@/lib/utils/money';

export function CartLines() {
  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeLine = useCartStore((state) => state.removeLine);

  if (lines.length === 0) return null;

  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <article key={line.variantId} className="rounded-[2rem] border border-brand-primary/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">{line.productName}</p>
              <p className="mt-1 text-sm text-foreground/60">
                {line.colorName ?? 'Couleur'} - {line.sizeLabel ?? 'Taille'} - {line.sku}
              </p>
              <p className="mt-2 font-semibold text-brand-primary">
                {formatPrice(line.unitPrice, line.currency)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={line.maxStock}
                value={line.quantity}
                onChange={(event) => setQuantity(line.variantId, Number(event.target.value))}
                className="w-24 rounded-full border border-brand-primary/10 px-4 py-2"
              />
              <button type="button" onClick={() => removeLine(line.variantId)} className="text-sm font-semibold text-brand-primary">
                Retirer
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
