import Image from 'next/image';
import { archiveProduct, createProduct, createVariant, deleteVariant, setPrimaryProductImage, updateProduct, updateVariantStock, uploadProductImage } from '@/app/admin/actions';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/money';

const adultSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const childSizes = Array.from({ length: 13 }, (_, index) => `${index + 1} ${index === 0 ? 'an' : 'ans'}`);

function SizeChoices() {
  return <fieldset className="field-wide size-selectors"><legend>Tailles disponibles</legend><p className="field-help">Ouvre une liste puis coche une ou plusieurs tailles. Les variantes sont créées au prix de départ ; tu pourras ajuster chaque prix ensuite.</p><div className="size-dropdowns"><details><summary>Adultes <span>S à 3XL</span></summary><div>{adultSizes.map(size => <label key={size}><input type="checkbox" name="sizes" value={size}/>{size}</label>)}</div></details><details><summary>Enfants <span>1 à 13 ans</span></summary><div>{childSizes.map(size => <label key={size}><input type="checkbox" name="sizes" value={size}/>{size}</label>)}</div></details></div></fieldset>;
}

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: collections }, { data: categories }, { data: links }] = await Promise.all([
    supabase.from('products').select('id, name_fr, slug, description_fr, base_price, currency_code, category_id, is_active, is_featured, is_new, product_images(id, url, alt_fr, is_primary, sort_order), product_variants(id, sku, size_label, color_name_fr, price, stock_quantity, low_stock_threshold)').is('deleted_at', null).order('sort_order'),
    supabase.from('collections').select('id, name_fr').eq('is_active', true).neq('slug', 'promotions').order('sort_order'),
    supabase.from('categories').select('id, name_fr, slug').eq('is_active', true).order('sort_order'),
    supabase.from('product_collections').select('product_id, collection_id'),
  ]);
  const collectionsByProduct = new Map<string, Set<string>>();
  for (const link of links ?? []) {
    const selected = collectionsByProduct.get(link.product_id) ?? new Set<string>();
    selected.add(link.collection_id); collectionsByProduct.set(link.product_id, selected);
  }

  return <div className="admin-page">
    <header className="admin-heading"><div><p>CATALOGUE</p><h1>Produits & contenus.</h1><span>Crée les articles, leurs tailles, leurs tags, leurs images et leur stock.</span></div></header>
    <section className="admin-panel create-product-panel">
      <div className="admin-panel-title"><div><p>NOUVEL ARTICLE</p><h2>Ajouter au catalogue</h2></div></div>
      <form action={createProduct} className="product-edit-form">
        <label>Nom de l’article<input name="name_fr" required placeholder="Pyjama satin rose"/></label>
        <label>Tag / univers<select name="category_id" defaultValue=""><option value="">Sans tag</option>{categories?.map(category => <option key={category.id} value={category.id}>{category.name_fr}</option>)}</select></label>
        <label>Prix de départ FCFA<input name="base_price" type="number" min="0" required placeholder="25000"/></label>
        <label className="field-wide">Description courte<textarea name="description_fr" rows={2}/></label>
        <fieldset className="field-wide collection-products"><legend>Collections</legend>{collections?.map(collection => <label key={collection.id}><input type="checkbox" name="collection_ids" value={collection.id}/><span>{collection.name_fr}</span></label>)}</fieldset>
        <SizeChoices/><button className="admin-primary-button">Créer l’article</button>
      </form>
    </section>
    <section className="admin-panel"><div className="admin-panel-title"><div><p>INVENTAIRE</p><h2>{products?.length ?? 0} pièces au catalogue</h2></div></div><div className="admin-products admin-products-editor">
      {products?.map((product) => {
        const images = [...(Array.isArray(product.product_images) ? product.product_images : [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
        const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
        const selectedCollections = collectionsByProduct.get(product.id) ?? new Set<string>();
        return <article key={product.id}>
          <div className="product-editor-head"><div className="product-thumb">{images[0]?.url ? <Image src={images[0].url} alt={images[0].alt_fr || product.name_fr} fill sizes="110px"/> : <span>Aucune image</span>}</div><div><h3>{product.name_fr}</h3><p>/{product.slug} · {formatPrice(Number(product.base_price), product.currency_code)}</p></div><span className={product.is_active ? 'pill pill-live' : 'pill'}>{product.is_active ? 'En ligne' : 'Masqué'}</span></div>
          <details className="product-details"><summary>Modifier la fiche</summary>
            <form action={updateProduct} className="product-edit-form"><input type="hidden" name="id" value={product.id}/><label>Nom de l’article<input name="name_fr" defaultValue={product.name_fr} required/></label><label>Tag / univers<select name="category_id" defaultValue={product.category_id ?? ''}><option value="">Sans tag</option>{categories?.map(category => <option key={category.id} value={category.id}>{category.name_fr}</option>)}</select></label><label>Prix de départ FCFA<input name="base_price" type="number" min="0" defaultValue={product.base_price} required/></label><label className="field-wide">Description<textarea name="description_fr" rows={4} defaultValue={product.description_fr ?? ''}/></label><fieldset className="field-wide collection-products"><legend>Collections</legend>{collections?.map(collection => <label key={collection.id}><input type="checkbox" name="collection_ids" value={collection.id} defaultChecked={selectedCollections.has(collection.id)}/><span>{collection.name_fr}</span></label>)}</fieldset><div className="field-wide product-checks"><label><input type="checkbox" name="is_active" defaultChecked={product.is_active}/> En ligne</label><label><input type="checkbox" name="is_featured" defaultChecked={product.is_featured}/> À la une</label><label><input type="checkbox" name="is_new" defaultChecked={product.is_new}/> Nouveauté</label></div><button className="admin-primary-button">Enregistrer la fiche</button></form>
            <div className="product-media"><h4>Images du produit</h4>{images.length > 0 && <div className="media-grid">{images.map(image => <form action={setPrimaryProductImage} key={image.id} className={image.is_primary ? 'media-item media-primary' : 'media-item'}><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="image_id" value={image.id}/><div><Image src={image.url} alt={image.alt_fr || product.name_fr} fill sizes="130px"/></div><button>{image.is_primary ? 'Image principale' : 'Mettre en couverture'}</button></form>)}</div>}<form action={uploadProductImage} className="image-upload-form"><input type="hidden" name="product_id" value={product.id}/><label>Ajouter une image<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required/></label><label>Texte alternatif<input name="alt_fr" placeholder={product.name_fr}/></label><button className="admin-primary-button">Téléverser</button></form></div>
            <form action={archiveProduct} className="archive-product-form"><input type="hidden" name="id" value={product.id}/><button>Retirer du catalogue</button></form>
          </details>
          <div className="variants">{variants.map(variant => <div key={variant.id} className="variant-row"><form action={updateVariantStock}><input type="hidden" name="id" value={variant.id}/><span>{variant.color_name_fr} · {variant.size_label}<small>{variant.sku}</small></span><input aria-label={`Prix ${variant.sku}`} name="price" type="number" min="0" defaultValue={variant.price}/><input aria-label={`Stock ${variant.sku}`} name="stock" type="number" min="0" defaultValue={variant.stock_quantity} className={variant.stock_quantity <= variant.low_stock_threshold ? 'low-stock' : ''}/><button>Enregistrer</button></form><form action={deleteVariant} className="variant-delete"><input type="hidden" name="id" value={variant.id}/><button>Supprimer la taille</button></form></div>)}</div>
          <form action={createVariant} className="add-variant-form"><input type="hidden" name="product_id" value={product.id}/><select name="size_label" defaultValue=""><option value="" disabled>Ajouter une taille</option><optgroup label="Adultes">{adultSizes.map(size => <option key={size}>{size}</option>)}</optgroup><optgroup label="Enfants">{childSizes.map(size => <option key={size}>{size}</option>)}</optgroup><option>Unique</option></select><input name="price" type="number" min="0" defaultValue={product.base_price} aria-label="Prix de la taille"/><input name="stock" type="number" min="0" defaultValue="0" aria-label="Stock de la taille"/><button>Ajouter</button></form>
        </article>;
      })}
    </div></section>
  </div>;
}
