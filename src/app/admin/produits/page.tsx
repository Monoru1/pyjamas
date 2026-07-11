import Image from 'next/image';
import { archiveProduct, createProduct, setPrimaryProductImage, updateProduct, updateVariantStock, uploadProductImage } from '@/app/admin/actions';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/money';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, name_fr, slug, description_fr, base_price, currency_code, is_active, is_featured, is_new, product_images(id, url, alt_fr, is_primary, sort_order), product_variants(id, sku, size_label, color_name_fr, stock_quantity, low_stock_threshold)')
    .is('deleted_at', null)
    .order('sort_order');

  return <div className="admin-page">
    <header className="admin-heading"><div><p>CATALOGUE</p><h1>Produits & contenus.</h1><span>Les articles, leurs images et leur stock.</span></div></header>
    <section className="admin-panel create-product-panel">
      <div className="admin-panel-title"><div><p>NOUVEL ARTICLE</p><h2>Ajouter au catalogue</h2></div></div>
      <form action={createProduct} className="product-edit-form"><label>Nom de l’article<input name="name_fr" required placeholder="Pyjama satin rose"/></label><label>Prix FCFA<input name="base_price" type="number" min="0" required placeholder="25000"/></label><label className="field-wide">Description courte<textarea name="description_fr" rows={2}/></label><button className="admin-primary-button">Créer l’article</button></form>
    </section>
    <section className="admin-panel"><div className="admin-panel-title"><div><p>INVENTAIRE</p><h2>{products?.length ?? 0} pièces au catalogue</h2></div></div><div className="admin-products admin-products-editor">
      {products?.map((product) => {
        const images = [...(Array.isArray(product.product_images) ? product.product_images : [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
        const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
        return <article key={product.id}>
          <div className="product-editor-head"><div className="product-thumb">{images[0]?.url ? <Image src={images[0].url} alt={images[0].alt_fr || product.name_fr} fill sizes="110px"/> : <span>Aucune image</span>}</div><div><h3>{product.name_fr}</h3><p>/{product.slug} · {formatPrice(Number(product.base_price), product.currency_code)}</p></div><span className={product.is_active ? 'pill pill-live' : 'pill'}>{product.is_active ? 'En ligne' : 'Masqué'}</span></div>
          <details className="product-details"><summary>Modifier la fiche</summary>
            <form action={updateProduct} className="product-edit-form"><input type="hidden" name="id" value={product.id}/><label>Nom de l’article<input name="name_fr" defaultValue={product.name_fr} required/></label><label>Prix FCFA<input name="base_price" type="number" min="0" defaultValue={product.base_price} required/></label><label className="field-wide">Description<textarea name="description_fr" rows={4} defaultValue={product.description_fr ?? ''}/></label><div className="field-wide product-checks"><label><input type="checkbox" name="is_active" defaultChecked={product.is_active}/> En ligne</label><label><input type="checkbox" name="is_featured" defaultChecked={product.is_featured}/> À la une</label><label><input type="checkbox" name="is_new" defaultChecked={product.is_new}/> Nouveauté</label></div><button className="admin-primary-button">Enregistrer la fiche</button></form>
            <div className="product-media"><h4>Images du produit</h4>{images.length > 0 && <div className="media-grid">{images.map(image => <form action={setPrimaryProductImage} key={image.id} className={image.is_primary ? 'media-item media-primary' : 'media-item'}><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="image_id" value={image.id}/><div><Image src={image.url} alt={image.alt_fr || product.name_fr} fill sizes="130px"/></div><button>{image.is_primary ? 'Image principale' : 'Mettre en couverture'}</button></form>)}</div>}<form action={uploadProductImage} className="image-upload-form"><input type="hidden" name="product_id" value={product.id}/><label>Ajouter une image<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required/></label><label>Texte alternatif<input name="alt_fr" placeholder={product.name_fr}/></label><button className="admin-primary-button">Téléverser</button></form></div>
            <form action={archiveProduct} className="archive-product-form"><input type="hidden" name="id" value={product.id}/><button>Retirer du catalogue</button></form>
          </details>
          <div className="variants">{variants.map(variant => <form key={variant.id} action={updateVariantStock}><input type="hidden" name="id" value={variant.id}/><span>{variant.color_name_fr} · {variant.size_label}<small>{variant.sku}</small></span><input aria-label={`Stock ${variant.sku}`} name="stock" type="number" min="0" defaultValue={variant.stock_quantity} className={variant.stock_quantity <= variant.low_stock_threshold ? 'low-stock' : ''}/><button>Stock</button></form>)}</div>
        </article>;
      })}
    </div></section>
  </div>;
}
