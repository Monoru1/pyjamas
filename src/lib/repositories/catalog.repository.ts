import { createClient } from '@/lib/supabase/server';
import {
  composeProductDetails,
  mapCatalogImage,
  mapCatalogProduct,
  mapProductVariant,
} from '@/features/catalog/catalog.mappers';
import type { CatalogProduct, ProductDetails } from '@/features/catalog/types';

export async function listFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load featured products: ${error.message}`);
  }

  return (data ?? []).map(mapCatalogProduct);
}

export async function listProducts(limit = 24): Promise<CatalogProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load products: ${error.message}`);
  }

  return (data ?? []).map(mapCatalogProduct);
}

export async function getProductBySlug(slug: string): Promise<ProductDetails | null> {
  const supabase = await createClient();

  const { data: productRow, error: productError } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (productError) {
    throw new Error(`Unable to load product: ${productError.message}`);
  }

  if (!productRow) return null;

  const product = mapCatalogProduct(productRow);

  const [{ data: variantRows, error: variantsError }, { data: imageRows, error: imagesError }] =
    await Promise.all([
      supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('size_label', { ascending: true }),
      supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order', { ascending: true }),
    ]);

  if (variantsError) {
    throw new Error(`Unable to load product variants: ${variantsError.message}`);
  }

  if (imagesError) {
    throw new Error(`Unable to load product images: ${imagesError.message}`);
  }

  return composeProductDetails(
    product,
    (variantRows ?? []).map((row) => mapProductVariant(row, product.currencyCode)),
    (imageRows ?? []).map(mapCatalogImage),
  );
}
