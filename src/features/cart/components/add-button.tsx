'use client';

import { variantToCartLine } from '@/features/cart/cart.mappers';
import { useCartStore } from '@/features/cart/cart.store';
import type { ProductDetails, ProductVariant } from '@/features/catalog/types';

interface AddButtonProps {
  product: ProductDetails;
  variant: ProductVariant;
}

export function AddButton({ product, variant }: AddButtonProps) {
  const addLine = useCartStore((state) => state.addLine);
  const disabled = variant.stockQuantity <= 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => addLine(variantToCartLine(product, variant), 1)}
      className="rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white disabled:bg-foreground/25"
    >
      {disabled ? 'Rupture de stock' : 'Ajouter au panier'}
    </button>
  );
}
