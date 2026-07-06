import { createClient } from '@/lib/supabase/server';
import {
  composeProductDetails,
  mapCatalogImage,
  mapCatalogProduct,
  mapProductVariant,
} from '@/features/catalog/catalog.mappers';
import type { CatalogProduct, ProductDetails } from '@/features/catalog/types';

export async function listFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('product_catalog')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Unable to load featured products:', error.message);
      return [];
    }

    return (data ?? []).map(mapCatalogProduct);
  } catch (error) {
    console.error('Featured products repository runtime fallback:', error);
    return [];
  }
}

export async function listProducts(limit = 24): Promise<CatalogProduct[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('product_catalog')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Unable to load products:', error.message);
      return [];
    }

    return (data ?? []).map(mapCatalogProduct);
  } catch (error) {
    console.error('Products repository runtime fallback:', error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetails | null> {
  try {
    const supabase = await createClient();

    const { data: productRow, error: productError } = await supabase
      .from('product_catalog')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (productError) {
      console.error('Unable to load product:', productError.message);
      return null;
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
      console.error('Unable to load product variants:', variantsError.message);
    }

    if (imagesError) {
      console.error('Unable to load product images:', imagesError.message);
    }

    return composeProductDetails(
      product,
      (variantRows ?? []).map((row) => mapProductVariant(row, product.currencyCode)),
      (imageRows ?? []).map(mapCatalogImage),
    );
  } catch (error) {
    console.error('Product details repository runtime fallback:', error);
    return null;
  }
}
