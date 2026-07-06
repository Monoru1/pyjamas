'use client';

import { useMemo, useState } from 'react';
import type { ProductDetails, ProductVariant } from '@/features/catalog/types';
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {variant.colorNameFr} - {variant.sizeLabel}
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">Ref : {variant.sku}</p>
                </div>
                <p className="font-semibold text-brand-primary">
                  {formatPrice(variant.price, variant.currencyCode)}
                </p>
              </div>
              <p className="mt-2 text-sm text-foreground/60">Stock : {variant.stockQuantity}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-brand-primary p-5 text-white">
        <p className="text-sm text-white/70">Selection actuelle</p>
        <p className="mt-2 text-xl font-semibold">
          {selected.colorNameFr} - {selected.sizeLabel}
        </p>
        <p className="mt-1 text-sm text-white/75">{selected.sku}</p>
      </div>
    </div>
  );
}
