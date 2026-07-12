'use client';

import { useMemo } from 'react';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import type { CatalogProduct } from '@/features/catalog/types';

interface CatalogueExperienceProps {
  products: CatalogProduct[];
  initialCollection?: string;
  collectionName?: string;
}

/** A collection page is intentionally an exact relation query: a product is shown
 * only when the admin associated it with that collection. Categories are tags,
 * not a hidden fallback for collections. */
export function CatalogueExperience({ products, initialCollection, collectionName }: CatalogueExperienceProps) {
  const visibleProducts = useMemo(() => {
    if (!initialCollection) return products;
    return products.filter((product) => product.collectionSlugs.includes(initialCollection));
  }, [initialCollection, products]);

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between text-sm text-foreground/60">
        <p>{visibleProducts.length} article{visibleProducts.length > 1 ? 's' : ''}</p>
        <p className="hidden md:block">{collectionName ? `Collection : ${collectionName}` : 'Catalogue complet'}</p>
      </div>
      <ProductGrid products={visibleProducts} />
    </section>
  );
}
