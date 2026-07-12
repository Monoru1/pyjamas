import type { CatalogProduct, ProductDetails, ProductVariant, CatalogImage } from './types';

interface CatalogRow {
  id: string | null;
  slug: string | null;
  name_fr: string | null;
  name_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  category_id: string | null;
  category_slug: string | null;
  category_name_fr: string | null;
  category_name_en: string | null;
  collection_slugs: string[] | null;
  base_price: number | null;
  compare_at_price: number | null;
  currency_code: string | null;
  primary_image_url: string | null;
  min_variant_price: number | null;
  min_variant_compare_at_price: number | null;
  total_stock: number | null;
  is_featured: boolean | null;
  is_new: boolean | null;
}

interface VariantRow {
  id: string;
  product_id: string;
  sku: string;
  size_label: string;
  color_name_fr: string;
  color_name_en: string | null;
  color_hex: string | null;
  audience: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
}

interface ImageRow {
  id: string;
  url: string;
  alt_fr: string | null;
  alt_en: string | null;
  is_primary: boolean;
  sort_order: number;
}

function assertCurrency(value: string | null): CatalogProduct['currencyCode'] {
  if (value === 'EUR' || value === 'USD' || value === 'GBP') return value;
  return 'XOF';
}

export function mapCatalogProduct(row: CatalogRow): CatalogProduct {
  if (!row.id || !row.slug || !row.name_fr) {
    throw new Error('Invalid product catalog row.');
  }

  return {
    id: row.id,
    slug: row.slug,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryNameFr: row.category_name_fr,
    categoryNameEn: row.category_name_en,
    collectionSlugs: row.collection_slugs ?? [],
    basePrice: row.min_variant_price ?? row.base_price ?? 0,
    compareAtPrice: row.min_variant_compare_at_price ?? null,
    currencyCode: assertCurrency(row.currency_code),
    primaryImageUrl: row.primary_image_url,
    totalStock: row.total_stock ?? 0,
    isFeatured: row.is_featured ?? false,
    isNew: row.is_new ?? false,
  };
}

export function mapProductVariant(row: VariantRow, currencyCode: CatalogProduct['currencyCode']): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    sizeLabel: row.size_label,
    colorNameFr: row.color_name_fr,
    colorNameEn: row.color_name_en,
    colorHex: row.color_hex,
    audience: row.audience,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    currencyCode,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    isActive: row.is_active,
  };
}

export function mapCatalogImage(row: ImageRow): CatalogImage {
  return {
    id: row.id,
    url: row.url,
    altFr: row.alt_fr,
    altEn: row.alt_en,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
  };
}

export function composeProductDetails(
  product: CatalogProduct,
  variants: ProductVariant[],
  images: CatalogImage[],
): ProductDetails {
  return { ...product, variants, images };
}
