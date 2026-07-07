import type { CurrencyCode } from '@/lib/utils/money';

export interface CatalogImage {
  id: string;
  url: string;
  altFr: string | null;
  altEn: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  sizeLabel: string;
  colorNameFr: string;
  colorNameEn: string | null;
  colorHex: string | null;
  audience: string | null;
  price: number;
  compareAtPrice: number | null;
  currencyCode: CurrencyCode;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string | null;
  descriptionFr: string | null;
  descriptionEn: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  categoryNameFr: string | null;
  categoryNameEn: string | null;
  collectionSlugs: string[];
  basePrice: number;
  compareAtPrice: number | null;
  currencyCode: CurrencyCode;
  primaryImageUrl: string | null;
  totalStock: number;
  isFeatured: boolean;
  isNew: boolean;
}

export interface ProductDetails extends CatalogProduct {
  images: CatalogImage[];
  variants: ProductVariant[];
}
