import { createAdminClient as createClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils/money';
export default async function PaymentsPage(){
  const db=await createClient();
  const {data,error}=await db.from('payment_attempts').select('id,status,amount_xof,provider_id,created_at').order('created_at',{ascending:false}).limit(100);
  return <div className="admin-page"><header className="admin-heading"><div><p>SUIVI DES TESTS</p><h1>Paiements FedaPay.</h1><span>Essais sandbox uniquement. Ces montants ne sont pas du chiffre d’affaires encaissé.</span></div></header>
  {error?<p role="status" className="admin-medias-message">Le module sandbox n’est pas encore activé sur cette base. La boutique continue de recevoir des demandes sans paiement en ligne.</p>:
  <section className="admin-panel p-5"><h2 className="mb-5 text-2xl">Transactions de test</h2>{data?.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Référence</th><th className="p-3">Statut</th><th className="p-3">Montant de test</th><th className="p-3">FedaPay</th></tr></thead><tbody>{data.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-mono">{p.id.slice(0,8)}</td><td className="p-3">{p.status}</td><td className="p-3">{formatPrice(Number(p.amount_xof),'XOF')}</td><td className="p-3">{p.provider_id||'En préparation'}</td></tr>)}</tbody></table></div>:<p>Aucun paiement de test enregistré.</p>}</section>}</div>;
}
