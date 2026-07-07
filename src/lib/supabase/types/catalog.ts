export type ProductRow = {
  id: string;
  category_id: string | null;
  slug: string;
  name_fr: string;
  name_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  base_price: number;
  compare_at_price: number | null;
  currency_code: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  sort_order: number;
  seo_title_fr: string | null;
  seo_title_en: string | null;
  seo_description_fr: string | null;
  seo_description_en: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  color_name_fr: string;
  color_name_en: string | null;
  color_hex: string | null;
  size_label: string;
  audience: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  url: string;
  alt_fr: string | null;
  alt_en: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  name_fr: string;
  name_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CollectionRow = {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductCollectionRow = {
  product_id: string;
  collection_id: string;
};

export type ProductCatalogRow = {
  id: string | null;
  category_id: string | null;
  slug: string | null;
  name_fr: string | null;
  name_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  base_price: number | null;
  compare_at_price: number | null;
  currency_code: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_new: boolean | null;
  sort_order: number | null;
  seo_title_fr: string | null;
  seo_title_en: string | null;
  seo_description_fr: string | null;
  seo_description_en: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  category_slug: string | null;
  category_name_fr: string | null;
  category_name_en: string | null;
  primary_image_url: string | null;
  total_stock: number | null;
  min_variant_price: number | null;
  max_variant_price: number | null;
  collection_slugs: string[] | null;
};
