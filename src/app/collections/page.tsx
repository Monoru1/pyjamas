import { CollectionFilms } from '@/components/marketing/collection-films';
import { listCollectionFilms } from '@/lib/repositories/films.repository';

export const revalidate = 60;

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  const films = await listCollectionFilms();
  return <main className="min-h-screen bg-[#071e19] text-[#fff8e9]">
    <CollectionFilms films={films}/>
  </main>;
}
