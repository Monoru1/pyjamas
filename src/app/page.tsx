import { LuxeHome } from '@/components/marketing/luxe-home';
import { listProducts } from '@/lib/repositories/catalog.repository';
import { getStoreSettings } from '@/lib/repositories/settings.repository';

export default async function HomePage() {
  const [settings, products] = await Promise.all([
    getStoreSettings(),
    listProducts(48),
  ]);

  const christmasSelection = products.filter(product => product.collectionSlugs.includes('noel')).slice(0, 6);
  return <LuxeHome settings={settings} products={christmasSelection} />;
}
