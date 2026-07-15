'use client';

import { useMemo, useState } from 'react';
import { AddButton } from '@/features/cart/components/add-button';
import type { ProductDetails } from '@/features/catalog/types';
import { formatPrice } from '@/lib/utils/money';

interface VariantPickerProps {
  product: ProductDetails;
}

export function VariantPicker({ product }: VariantPickerProps) {
  const activeVariants = useMemo(
    () => product.variants.filter((variant) => variant.isActive),
    [product.variants],
  );
  const [selectedId, setSelectedId] = useState(activeVariants[0]?.id ?? '');
  const selected = activeVariants.find((variant) => variant.id === selectedId) ?? activeVariants[0];

  if (!selected) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-primary/20 bg-white p-6">
        <p className="font-semibold">Aucune variante disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[2rem] border border-brand-primary/10 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-primary/65">Variantes</p>
        <div className="mt-4 grid gap-3">
          {activeVariants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => setSelectedId(variant.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected.id === variant.id
                  ? 'border-brand-primary bg-brand-soft'
                  : 'border-brand-primary/10 bg-white hover:border-brand-primary/30'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="font-semibold">
                    {variant.colorNameFr} - {variant.sizeLabel}
                  </p>
                </div>
                <div className="text-left sm:text-right">{variant.compareAtPrice && variant.compareAtPrice > variant.price ? <span className="mb-1 inline-flex rounded-full bg-brand-primary px-2 py-1 text-[10px] font-bold text-white">PROMOTION</span> : null}<p className="font-semibold text-brand-primary">{formatPrice(variant.price, variant.currencyCode)}</p>{variant.compareAtPrice && variant.compareAtPrice > variant.price ? <p className="text-xs text-foreground/45 line-through">{formatPrice(variant.compareAtPrice, variant.currencyCode)}</p> : null}</div>
              </div>
              <p className="mt-2 text-sm text-foreground/60">Stock : {variant.stockQuantity}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-brand-primary p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm text-white/70">Selection actuelle</p>
          <p className="mt-2 text-xl font-semibold">
            {selected.colorNameFr} - {selected.sizeLabel}
          </p>
        </div>
        <AddButton product={product} variant={selected} />
      </div>
    </div>
  );
}
