import { removePromotion, setPromotion } from '@/app/admin/actions';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/money';

export default async function PromotionsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('id, name_fr, currency_code, product_variants(id, sku, size_label, color_name_fr, price, compare_at_price)').is('deleted_at', null).order('name_fr');
  const rows = (products ?? []).flatMap(product => (Array.isArray(product.product_variants) ? product.product_variants : []).map(variant => ({ ...variant, productName: product.name_fr, currency: product.currency_code })));
  const available = rows.filter(row => !row.compare_at_price);
  const active = rows.filter(row => row.compare_at_price);
  return <div className="admin-page"><header className="admin-heading"><div><p>VENTE</p><h1>Promotions.</h1><span>Crée une offre sur la taille de ton choix. Le prix normal est conservé et barré sur le site.</span></div></header>
    <section className="admin-panel create-product-panel"><div className="admin-panel-title"><div><p>NOUVELLE PROMOTION</p><h2>Créer une offre</h2></div></div><form action={setPromotion} className="product-edit-form"><label className="field-wide">Produit et taille<select name="variant_id" required defaultValue=""><option value="" disabled>Choisir un produit / une taille</option>{available.map(row => <option key={row.id} value={row.id}>{row.productName} · {row.size_label} — {formatPrice(Number(row.price), row.currency)}</option>)}</select></label><label>Prix promotionnel FCFA<input name="promotion_price" type="number" min="1" required placeholder="Ex. 22000"/></label><button className="admin-primary-button">Créer la promotion</button></form></section>
    <section className="admin-panel"><div className="admin-panel-title"><div><p>PROMOTIONS ACTIVES</p><h2>{active.length} offre{active.length > 1 ? 's' : ''} en cours</h2></div></div>{active.length ? <div className="promotion-list">{active.map(variant => <form key={variant.id} action={removePromotion}><div><strong>{variant.productName} · {variant.size_label}</strong><span>{variant.color_name_fr} · Prix promo : {formatPrice(Number(variant.price), variant.currency)}</span><span>Prix normal : {formatPrice(Number(variant.compare_at_price), variant.currency)}</span></div><input type="hidden" name="variant_id" value={variant.id}/><button>Retirer la promotion</button></form>)}</div> : <p className="admin-empty">Aucune promotion active.</p>}</section>
  </div>;
}
