'use client';

import { useCartStore } from '@/features/cart/cart.store';
import { formatPrice } from '@/lib/utils/money';

export function CartLines() {
  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeLine = useCartStore((state) => state.removeLine);

  if (lines.length === 0) {
    return (
      <div className="rounded-[2.5rem] border border-dashed border-brand-primary/20 bg-white/70 p-10 text-center shadow-sm backdrop-blur">
        <p className="text-2xl font-semibold tracking-[-0.03em]">Votre panier attend son premier cadeau.</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-foreground/60">
          Explorez la selection et ajoutez une piece douce avant de lancer la commande.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <article key={line.variantId} className="overflow-hidden rounded-[2.25rem] border border-brand-primary/10 bg-white/85 shadow-[0_20px_70px_rgba(80,34,28,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-brand-soft">
                {line.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.imageUrl} alt={line.productName} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <p className="text-xl font-semibold tracking-[-0.03em]">{line.productName}</p>
                <p className="mt-1 text-sm text-foreground/60">
                  {line.colorName ?? 'Couleur'} · {line.sizeLabel ?? 'Taille'} · {line.sku}
                </p>
                <p className="mt-3 font-semibold text-brand-primary">
                  {formatPrice(line.unitPrice, line.currency)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <input
                type="number"
                min={1}
                max={line.maxStock}
                value={line.quantity}
                onChange={(event) => setQuantity(line.variantId, Number(event.target.value))}
                className="w-24 rounded-full border border-brand-primary/10 bg-brand-cream px-4 py-2 text-center font-semibold outline-none focus:border-brand-primary"
              />
              <button type="button" onClick={() => removeLine(line.variantId)} className="rounded-full px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-soft">
                Retirer
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
