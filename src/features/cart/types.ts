import type { CurrencyCode } from '@/lib/utils/money';

export interface CartLine {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  sizeLabel: string | null;
  colorName: string | null;
  unitPrice: number;
  currency: CurrencyCode;
  imageUrl: string | null;
  quantity: number;
  maxStock: number;
}

export interface CheckoutCustomer {
  name: string;
  phone: string | null;
  comment: string | null;
}
