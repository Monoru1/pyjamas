import { createAdminClient as createClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils/money';
const statuses = ['pending','paid','failed','cancelled','expired','refunded','partially_refunded'];
export default async function PaymentsPage({searchParams}:{searchParams:Promise<{status?:string;date?:string}>}) {
  const db = await createClient();
  const filters = await searchParams;
  let query = db.from('payment_attempts').select('id,status,amount_xof,provider_id,created_at,environment,order_id,last_error').order('created_at',{ascending:false}).limit(100);
  if (filters.status && statuses.includes(filters.status)) query = query.eq('status',filters.status);
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date) && !Number.isNaN(Date.parse(filters.date))) query = query.gte('created_at',`${filters.date}T00:00:00Z`).lt('created_at',new Date(Date.parse(filters.date)+86400000).toISOString());
  const [{data,error},{data:jobs},{data:events}] = await Promise.all([
    query,
    db.from('notification_jobs').select('id,kind,status,attempts,last_error,created_at').neq('status','sent').order('created_at',{ascending:false}).limit(30),
    db.from('payment_events').select('id,payment_id,new_status,external_event,created_at').order('created_at',{ascending:false}).limit(30),
  ]);
  return <div className="admin-page"><header className="admin-heading"><div><p>SUIVI DES PAIEMENTS</p><h1>Paiements FedaPay.</h1><span>Seule une confirmation vérifiée auprès de FedaPay autorise le traitement. Les tests sandbox sont identifiés.</span></div></header>
    <form method="get" className="mb-5 flex flex-wrap gap-3"><label>Statut <select name="status" defaultValue={filters.status || ''}><option value="">Tous</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label>Date (UTC) <input type="date" name="date" defaultValue={filters.date}/></label><button className="admin-action">Filtrer</button></form>
    {error ? <p role="alert">Impossible de charger les paiements. Vérifiez les migrations et les droits.</p> :
      <section className="admin-panel p-5"><h2 className="mb-5 text-2xl">Transactions</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Référence','Environnement','Statut','Montant','FedaPay','Erreur'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data?.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-mono">{p.id}</td><td className="p-3">{p.environment}</td><td className="p-3">{p.status}</td><td className="p-3">{formatPrice(Number(p.amount_xof),'XOF')}</td><td className="p-3">{p.provider_id || 'Association en attente'}</td><td className="p-3">{p.last_error || '—'}</td></tr>)}</tbody></table></div></section>}
    <section className="admin-panel mt-5 p-5"><h2 className="text-xl">Notifications à traiter</h2><p className="my-3 text-sm">Les commandes apparaissent dans l’administration même sans e-mail. Aucun WhatsApp automatique n’est configuré.</p>{jobs?.map(j=><p key={j.id} className="py-2 text-sm">{j.kind} · {j.status} · tentatives {j.attempts} · {j.last_error || 'en attente'}</p>)}</section>
    <section className="admin-panel mt-5 p-5"><h2 className="text-xl">Derniers événements vérifiés</h2>{events?.map(e=><p key={e.id} className="py-2 text-sm">{e.created_at} · {e.payment_id.slice(0,8)} · {e.new_status} · {e.external_event}</p>)}</section>
  </div>;
}
