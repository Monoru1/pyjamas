import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Gift, Package } from 'lucide-react';
import { updateCollection } from '@/app/admin/actions';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/money';

export default async function AdminCollectionsPage() {
  const supabase = await createClient();
  const [
    { data: christmas },
    { data: products },
    { data: linked },
    { data: archives },
  ] = await Promise.all([
    supabase.from('collections')
      .select('id, slug, name_fr, description_fr, image_url, is_active')
      .eq('slug', 'noel').maybeSingle(),
    supabase.from('products')
      .select('id, name_fr, base_price, currency_code')
      .is('deleted_at', null).order('name_fr'),
    supabase.from('product_collections').select('product_id, collection_id'),
    supabase.from('collections')
      .select('slug, name_fr, is_active')
      .neq('slug', 'noel').order('name_fr'),
  ]);

  const included = new Set(
    (linked ?? []).filter(link => link.collection_id === christmas?.id).map(link => link.product_id),
  );

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div><p>LA SAISON DE LA MAISON</p><h1>Collection Noël 2026.</h1><span>Une seule collection affichée sur la boutique ; toutes les anciennes références restent archivées.</span></div>
        <Gift size={28} className="text-[#b3203a]"/>
      </header>

      {!christmas ? (
        <div className="admin-panel p-8" role="alert">
          La collection officielle « noel » est introuvable. Aucun contenu n’a été modifié.
        </div>
      ) : (
        <section className="admin-panel p-5 md:p-8">
          <div className="admin-panel-title">
            <div><p>COLLECTION PUBLIQUE</p><h2>{christmas.name_fr}</h2></div>
            <Link href="/catalogue?collection=noel" target="_blank" className="inline-flex items-center gap-2 text-sm font-bold text-[#b3203a]">
              Voir sur le site <ArrowUpRight size={16}/>
            </Link>
          </div>
          <div className="mb-7 grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-[#123d30]">
              <Image src={christmas.image_url || '/christmas-2026/family-together.jpg'} alt="Couverture de la collection Noël" fill sizes="260px" className="object-cover" />
            </div>
            <div className="flex flex-col justify-center gap-3">
              <div className="inline-flex w-fit items-center gap-3 rounded-full bg-[#f4efe5] px-4 py-2 text-xs font-bold text-[#10402f]">
                <Package size={15}/> {included.size} produit{included.size > 1 ? 's' : ''} associé{included.size > 1 ? 's' : ''}
              </div>
              <p className="text-sm leading-7 text-[#617269]">
                Cochez les articles qui appartiennent réellement à cette collection ; vous pourrez adapter les prix et les tailles depuis « Produits & stocks ».
              </p>
            </div>
          </div>
          <form action={updateCollection} className="product-edit-form">
            <input type="hidden" name="id" value={christmas.id}/>
            <input type="hidden" name="image_url" value={christmas.image_url || ''}/>
            <label>Nom de la collection
              <input name="name_fr" required defaultValue={christmas.name_fr}/>
            </label>
            <label>Nouvelle image de couverture
              <input name="image" type="file" accept="image/jpeg,image/png,image/webp"/>
            </label>
            <label className="field-wide">Description
              <textarea name="description_fr" rows={3} defaultValue={christmas.description_fr || ''}/>
            </label>
            <label className="field-wide collection-active">
              <input type="checkbox" name="is_active" defaultChecked={christmas.is_active}/> Collection visible sur le site
            </label>
            <fieldset className="field-wide collection-products">
              <legend>Produits à présenter pour Noël</legend>
              {(products ?? []).map(product => (
                <label key={product.id}>
                  <input type="checkbox" name="product_ids" value={product.id} defaultChecked={included.has(product.id)}/>
                  <span>{product.name_fr}</span>
                  <small>{formatPrice(Number(product.base_price), product.currency_code)}</small>
                </label>
              ))}
            </fieldset>
            <button type="submit" className="admin-primary-button">Enregistrer la collection Noël</button>
          </form>
        </section>
      )}

      <details className="admin-panel mt-6 p-5 text-sm md:p-7">
        <summary className="cursor-pointer font-bold text-[#123d30]">
          Consulter les anciennes collections archivées ({(archives ?? []).filter(item => item.slug !== 'promotions').length})
        </summary>
        <p className="my-4 leading-7 text-[#647469]">Aucune donnée historique n’a été supprimée. Les anciennes collections ne sont pas proposées dans la vitrine Noël.</p>
        <ul className="grid gap-2 text-[#617269]">
          {(archives ?? []).filter(item => item.slug !== 'promotions').map(item => (
            <li key={item.slug} className="flex justify-between gap-4 border-b border-[#edeae3] py-2">
              <span>{item.name_fr}</span><span>{item.is_active ? 'Encore active dans la base' : 'Archivée'}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
