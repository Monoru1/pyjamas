'use client';

import { useMemo } from 'react';
import { selectSubtotal, selectTotalItems, useCartStore } from '@/features/cart/cart.store';
import { formatPrice } from '@/lib/utils/money';

export function CartSummary() {
  const lines = useCartStore((state) => state.lines);
  const totalItems = useCartStore(selectTotalItems);
  const subtotal = useCartStore(selectSubtotal);
  const currency = useMemo(() => lines[0]?.currency ?? 'XOF', [lines]);

  if (lines.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-brand-primary/20 bg-white p-8 text-center">
        <p className="text-lg font-semibold">Panier vide</p>
        <p className="mt-2 text-sm text-foreground/60">Les articles ajoutes apparaitront ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-[2rem] border border-brand-primary/10 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Total articles</p>
        <p>{totalItems}</p>
      </div>
      <div className="flex items-center justify-between text-xl font-semibold text-brand-primary">
        <p>Sous-total</p>
        <p>{formatPrice(subtotal, currency)}</p>
      </div>
    </div>
  );
}
