import Image from 'next/image';
import { archiveProduct, createProduct, receiveStock, deleteVariant, setPrimaryProductImage, updateProduct, updateVariantStock, updateVariantPrice, uploadProductImage } from '@/app/admin/actions';
import { createAdminClient as createClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils/money';

const adultSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const babySizes = ['3-6 mois', '6-9 mois', '9-12 mois', '12-18 mois', '18-24 mois'];
const childSizes = Array.from({ length: 13 }, (_, index) => `${index + 1} ${index === 0 ? 'an' : 'ans'}`);

function SizeChoices() {
  return <fieldset className="field-wide size-selectors"><legend>Tailles disponibles</legend><p className="field-help">Ouvre une liste puis coche une ou plusieurs tailles. Les variantes sont créées au prix de départ ; tu pourras ajuster chaque prix ensuite.</p><div className="size-dropdowns"><details><summary>Adultes <span>S à 3XL</span></summary><div>{adultSizes.map(size => <label key={size}><input type="checkbox" name="sizes" value={size}/>{size}</label>)}</div></details><details><summary>Bébés <span>3 à 24 mois</span></summary><div>{babySizes.map(size => <label key={size}><input type="checkbox" name="sizes" value={size}/>{size}</label>)}</div></details><details><summary>Enfants <span>1 à 13 ans</span></summary><div>{childSizes.map(size => <label key={size}><input type="checkbox" name="sizes" value={size}/>{size}</label>)}</div></details></div></fieldset>;
}

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: collections }, { data: categories }, { data: links }, stockResult, movementsResult] = await Promise.all([
    supabase.from('products').select('id, name_fr, slug, description_fr, base_price, currency_code, category_id, is_active, is_featured, is_new, product_images(id, url, alt_fr, is_primary, sort_order), product_variants(id, sku, size_label, color_name_fr, price, stock_quantity, low_stock_threshold, is_active)').is('deleted_at', null).order('sort_order'),
    supabase.from('collections').select('id, name_fr').eq('is_active', true).neq('slug', 'promotions').order('sort_order'),
    supabase.from('categories').select('id, name_fr, slug').eq('is_active', true).order('sort_order'),
    supabase.from('product_collections').select('product_id, collection_id'),
    supabase.from('admin_stock_levels').select('*'),
    supabase.from('staff_stock_movements').select('request_id, variant_id, kind, reason, staff_id, stock_before, stock_after, created_at').order('created_at', { ascending: false }).limit(30),
  ]);
  const stockByVariant = new Map(stockResult.data?.map(level => [level.variant_id, level]));
  const labelsByVariant = new Map(products?.flatMap(product => Array.isArray(product.product_variants) ? product.product_variants.map(variant =>
    [variant.id, `${product.name_fr} · ${variant.size_label} · ${variant.sku}`] as const) : []));
  const movementDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Porto-Novo' });
  const collectionsByProduct = new Map<string, Set<string>>();
  for (const link of links ?? []) {
    const selected = collectionsByProduct.get(link.product_id) ?? new Set<string>();
    selected.add(link.collection_id); collectionsByProduct.set(link.product_id, selected);
  }

  return <div className="admin-page">
    <header className="admin-heading"><div><p>CATALOGUE</p><h1>Produits & contenus.</h1><span>À la réception d’une livraison, enregistre les quantités reçues et ajoute les nouvelles références.</span></div></header>
    <section className="admin-panel create-product-panel">
      <div className="admin-panel-title"><div><p>NOUVEL ARTICLE</p><h2>Ajouter au catalogue</h2></div></div>
      <form action={createProduct} className="product-edit-form">
        <label>Nom de l’article<input name="name_fr" required placeholder="Pyjama satin rose"/></label>
        <label>Tag / univers<select name="category_id" defaultValue=""><option value="">Sans tag</option>{categories?.map(category => <option key={category.id} value={category.id}>{category.name_fr}</option>)}</select></label>
        <label>Prix de départ FCFA<input name="base_price" type="number" min="0" required placeholder="25000"/></label>
        <label className="field-wide">Description courte<textarea name="description_fr" rows={2}/></label>
        <fieldset className="field-wide collection-products"><legend>Collections</legend>{collections?.map(collection => <label key={collection.id}><input type="checkbox" name="collection_ids" value={collection.id}/><span>{collection.name_fr}</span></label>)}</fieldset>
        <SizeChoices/><button className="admin-primary-button">Créer la fiche masquée</button>
      </form>
    </section>
    <section className="admin-panel"><div className="admin-panel-title"><div><p>INVENTAIRE</p><h2>{products?.length ?? 0} pièces au catalogue</h2></div></div><div className="admin-products admin-products-editor">
      {products?.map((product) => {
        const images = [...(Array.isArray(product.product_images) ? product.product_images : [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
        const variants = (Array.isArray(product.product_variants) ? product.product_variants : []).filter(v=>v.is_active);
        const displayPrice=variants.length?Math.min(...variants.map(v=>Number(v.price))):Number(product.base_price);
        const selectedCollections = collectionsByProduct.get(product.id) ?? new Set<string>();
        return <article key={product.id}>
          <div className="product-editor-head"><div className="product-thumb">{images[0]?.url ? <Image src={images[0].url} alt={images[0].alt_fr || product.name_fr} fill sizes="110px"/> : <span>Aucune image</span>}</div><div><h3>{product.name_fr}</h3><p>/{product.slug} · {formatPrice(displayPrice, product.currency_code)}</p></div><span className={product.is_active ? 'pill pill-live' : 'pill'}>{product.is_active ? 'En ligne' : 'Masqué'}</span></div>
          <details className="product-details"><summary>Modifier la fiche</summary>
            <form action={updateProduct} className="product-edit-form"><input type="hidden" name="id" value={product.id}/><label>Nom de l’article<input name="name_fr" defaultValue={product.name_fr} required/></label><label>Tag / univers<select name="category_id" defaultValue={product.category_id ?? ''}><option value="">Sans tag</option>{categories?.map(category => <option key={category.id} value={category.id}>{category.name_fr}</option>)}</select></label><label>{variants.length ? "Prix à partir de FCFA (calculé depuis les tailles)" : "Prix indicatif FCFA"}<input name="base_price" type="number" min="0" defaultValue={displayPrice} readOnly={variants.length>0} required/><small>Le prix de vente se modifie pour chaque taille ci-dessous.</small></label><label className="field-wide">Description<textarea name="description_fr" rows={4} defaultValue={product.description_fr ?? ''}/></label><fieldset className="field-wide collection-products"><legend>Collections</legend>{collections?.map(collection => <label key={collection.id}><input type="checkbox" name="collection_ids" value={collection.id} defaultChecked={selectedCollections.has(collection.id)}/><span>{collection.name_fr}</span></label>)}</fieldset><div className="field-wide product-checks"><label><input type="checkbox" name="is_active" defaultChecked={product.is_active}/> En ligne</label><label><input type="checkbox" name="is_featured" defaultChecked={product.is_featured}/> À la une</label><label><input type="checkbox" name="is_new" defaultChecked={product.is_new}/> Nouveauté</label></div><button className="admin-primary-button">Enregistrer la fiche</button></form>
            <div className="product-media"><h4>Images du produit</h4>{images.length > 0 && <div className="media-grid">{images.map(image => <form action={setPrimaryProductImage} key={image.id} className={image.is_primary ? 'media-item media-primary' : 'media-item'}><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="image_id" value={image.id}/><div><Image src={image.url} alt={image.alt_fr || product.name_fr} fill sizes="130px"/></div><button>{image.is_primary ? 'Image principale' : 'Mettre en couverture'}</button></form>)}</div>}<form action={uploadProductImage} className="image-upload-form"><input type="hidden" name="product_id" value={product.id}/><label>Ajouter une image<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required/></label><label>Texte alternatif<input name="alt_fr" placeholder={product.name_fr}/></label><button className="admin-primary-button">Téléverser</button></form></div>
            <form action={archiveProduct} className="archive-product-form"><input type="hidden" name="id" value={product.id}/><button>Retirer du catalogue</button></form>
          </details>
          <div className="variants">{variants.map(variant => {
            const stock = stockByVariant.get(variant.id);
            return <div key={variant.id} className="variant-row">
              <span>{variant.color_name_fr} · {variant.size_label}<small>{variant.sku}</small></span>
              <form action={updateVariantPrice}><input type="hidden" name="id" value={variant.id}/><input type="hidden" name="expected_price" value={variant.price}/><label>Prix FCFA<input aria-label={`Prix ${variant.sku}`} name="price" type="number" min="1" step="1" defaultValue={variant.price}/></label><button>Enregistrer le prix</button></form>
              <form action={deleteVariant} className="variant-delete"><input type="hidden" name="id" value={variant.id}/><button>Archiver la taille</button></form>
              <div className="variant-stock">
                {stock ? <p>Physique calculé : {stock.physical} · Disponible : {stock.available} · Réservé : {stock.reserved} · Payé, à remettre : {stock.awaiting_handover}</p>
                  : <p>État du stock indisponible.</p>}
                {stock && <details><summary>Réceptionner des marchandises</summary>
                  <form action={receiveStock}>
                    <input type="hidden" name="id" value={variant.id}/>
                    <input type="hidden" name="request_id" value={crypto.randomUUID()}/>
                    <label>Quantité reçue<input name="stock" type="number" min="1" step="1" required/></label>
                    <label>Référence de réception<input name="reason" maxLength={200} required/></label>
                    <button>Valider la réception</button>
                  </form>
                </details>}
                {stock && <details><summary>Corriger une quantité</summary>
                  <form action={updateVariantStock}>
                    <input type="hidden" name="id" value={variant.id}/>
                    <input type="hidden" name="request_id" value={crypto.randomUUID()}/>
                    <input type="hidden" name="expected_stock" value={stock.available}/>
                    <label>Stock disponible corrigé<input name="stock" type="number" min="0" step="1" defaultValue={stock.available} required/></label>
                    <label>Motif de la correction<input name="reason" maxLength={200} required/></label>
                    <button>Enregistrer la correction</button>
                  </form>
                </details>}
              </div>
            </div>;
          })}</div>
          {!stockResult.error && <details><summary>Réceptionner une nouvelle taille</summary>
            <form action={receiveStock} className="product-edit-form">
              <input type="hidden" name="product_id" value={product.id}/>
              <input type="hidden" name="request_id" value={crypto.randomUUID()}/>
              <label>Taille<select name="size_label" defaultValue="" required>
                <option value="" disabled>Choisir une taille</option>
                <optgroup label="Adultes">{adultSizes.map(size => <option key={size}>{size}</option>)}</optgroup>
                <optgroup label="Bébés">{babySizes.map(size => <option key={size}>{size}</option>)}</optgroup>
                <optgroup label="Enfants">{childSizes.map(size => <option key={size}>{size}</option>)}</optgroup>
                <option>Unique</option>
              </select></label>
              <label>Prix FCFA<input name="price" type="number" min="1" step="1" defaultValue={product.base_price} required/></label>
              <label>Quantité reçue<input name="stock" type="number" min="1" step="1" required/></label>
              <label>Référence de réception<input name="reason" maxLength={200} required/></label>
              <button>Valider la réception</button>
            </form>
          </details>}
        </article>;
      })}
    </div></section>
    <section className="admin-panel">
      <h2>Derniers mouvements du personnel</h2>
      {movementsResult.error ? <p>Historique indisponible.</p> : movementsResult.data.length === 0 ? <p>Aucun mouvement enregistré.</p> :
        <ul>{movementsResult.data.map(movement => <li key={movement.request_id}>
          <strong>{labelsByVariant.get(movement.variant_id) ?? movement.variant_id}</strong>
          <p>{movement.kind === 'receipt' ? 'Réception' : 'Correction'} · {movement.stock_before} → {movement.stock_after} disponibles · {movement.reason}</p>
          <small>{movementDate.format(new Date(movement.created_at))} · Personnel : {movement.staff_id}</small>
        </li>)}</ul>}
    </section>
  </div>;
}
