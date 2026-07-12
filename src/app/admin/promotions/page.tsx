import { removePromotion, setPromotion } from '@/app/admin/actions';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/money';

export default async function PromotionsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('id, name_fr, currency_code, product_variants(id, sku, size_label, color_name_fr, price, compare_at_price)').is('deleted_at', null).order('name_fr');
  const rows = (products ?? []).flatMap(product => (Array.isArray(product.product_variants) ? product.product_variants : []).map(variant => ({ ...variant, productName: product.name_fr, currency: product.currency_code })));
  return <div className="admin-page"><header className="admin-heading"><div><p>VENTE</p><h1>Promotions par taille.</h1><span>Chaque promotion vise une taille précise. Le prix normal est restauré dès que tu retires l’offre.</span></div></header><section className="admin-panel"><div className="admin-panel-title"><div><p>VARIANTES</p><h2>Appliquer une promotion</h2></div></div><div className="promotion-list">{rows.map(variant => <form key={variant.id} action={variant.compare_at_price ? removePromotion : setPromotion}><div><strong>{variant.productName} · {variant.size_label}</strong><span>{variant.color_name_fr} · Prix actuel : {formatPrice(Number(variant.price), variant.currency)}</span>{variant.compare_at_price && <span>Prix normal : {formatPrice(Number(variant.compare_at_price), variant.currency)}</span>}</div>{variant.compare_at_price ? <><button>Retirer la promotion</button><input type="hidden" name="variant_id" value={variant.id}/></> : <><input type="number" name="promotion_price" min="0" max={Math.max(0, Number(variant.price) - 1)} placeholder="Prix promo" required/><input type="hidden" name="variant_id" value={variant.id}/><button>Mettre en promotion</button></>}</form>)}</div></section></div>;
}
