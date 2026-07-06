import type { CartLine } from './types';
import type { ProductDetails, ProductVariant } from '@/features/catalog/types';

export function variantToCartLine(product: ProductDetails, variant: ProductVariant): CartLine {
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];

  return {
    variantId: variant.id,
    productId: product.id,
    productName: product.nameFr,
    sku: variant.sku,
    sizeLabel: variant.sizeLabel,
    colorName: variant.colorNameFr,
    unitPrice: variant.price,
    currency: variant.currencyCode,
    imageUrl: primaryImage?.url ?? product.primaryImageUrl,
    quantity: 1,
    maxStock: variant.stockQuantity,
  };
}
