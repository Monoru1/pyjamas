import { LuxeHome } from '@/components/marketing/luxe-home';
import { listFeaturedProducts } from '@/lib/repositories/catalog.repository';
import { getStoreSettings } from '@/lib/repositories/settings.repository';

export default async function HomePage() {
  const [settings, featuredProducts] = await Promise.all([
    getStoreSettings(),
    listFeaturedProducts(6),
  ]);

  return <LuxeHome settings={settings} products={featuredProducts} />;
}
