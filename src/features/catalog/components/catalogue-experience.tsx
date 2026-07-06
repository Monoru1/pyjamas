'use client';

import { useMemo, useState } from 'react';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import type { CatalogProduct } from '@/features/catalog/types';

interface CatalogueExperienceProps {
  products: CatalogProduct[];
}

const filters = [
  { key: 'all', label: 'Tout' },
  { key: 'famille', label: 'Famille' },
  { key: 'femme', label: 'Femme' },
  { key: 'homme', label: 'Homme' },
  { key: 'couple', label: 'Couple' },
  { key: 'enfant', label: 'Enfant' },
  { key: 'new', label: 'Nouveautes' },
  { key: 'available', label: 'En stock' },
];

const sorts = [
  { key: 'featured', label: 'Selection' },
  { key: 'price-asc', label: 'Prix croissant' },
  { key: 'price-desc', label: 'Prix decroissant' },
  { key: 'new', label: 'Nouveautes' },
];

function matchesFilter(product: CatalogProduct, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'new') return product.isNew;
  if (filter === 'available') return product.totalStock > 0;

  const haystack = `${product.categoryNameFr ?? ''} ${product.nameFr} ${product.descriptionFr ?? ''}`.toLowerCase();
  return haystack.includes(filter);
}

export function CatalogueExperience({ products }: CatalogueExperienceProps) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('featured');

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => matchesFilter(product, filter));

    return [...filtered].sort((a, b) => {
      if (sort === 'price-asc') return a.basePrice - b.basePrice;
      if (sort === 'price-desc') return b.basePrice - a.basePrice;
      if (sort === 'new') return Number(b.isNew) - Number(a.isNew);
      return Number(b.isFeatured) - Number(a.isFeatured);
    });
  }, [filter, products, sort]);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-brand-primary/10 bg-white/75 p-4 shadow-sm backdrop-blur md:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === item.key
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-brand-cream text-foreground/70 hover:text-brand-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="flex items-center justify-between gap-3 rounded-full bg-brand-cream px-4 py-2 text-sm font-semibold text-foreground/70 lg:min-w-64">
            Trier
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent text-brand-primary outline-none">
              {sorts.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-foreground/60">
        <p>{visibleProducts.length} modele(s)</p>
        <p>Noel premium · stock visible · commande WhatsApp</p>
      </div>

      <ProductGrid products={visibleProducts} />
    </section>
  );
}
