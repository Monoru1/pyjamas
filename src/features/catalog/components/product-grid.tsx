import { EmptyProducts } from '@/components/marketing/empty-products';
import type { CatalogProduct } from '@/features/catalog/types';
import { ProductCard } from './product-card';

interface ProductGridProps {
  products: CatalogProduct[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {products.length > 0 ? (
        products.map((product) => <ProductCard key={product.id} product={product} />)
      ) : (
        <EmptyProducts />
      )}
    </div>
  );
}
