import Link from 'next/link';
import { ArrowUpRight, Boxes, Clock3, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils/money';

const labels: Record<string, string> = { pending: 'À confirmer', confirmed: 'Confirmée', preparing: 'Préparation', ready: 'Prête', delivered: 'Livrée', cancelled: 'Annulée' };

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ data: summary }, { data: orders }] = await Promise.all([
    supabase.from('dashboard_summary').select('*').single(),
    supabase.from('orders').select('id, order_number, status, total, currency_code, created_at, customers(full_name, whatsapp_phone)').order('created_at', { ascending: false }).limit(6),
  ]);
  const cards = [
    ['Commandes', summary?.orders_total ?? 0, 'Toutes les commandes', ShoppingBag, 'text-brand-primary'],
    ['À traiter', summary?.orders_pending ?? 0, 'Demandes en attente', Clock3, 'text-amber-700'],
    ['Produits', summary?.products_total ?? 0, 'Au catalogue', Boxes, 'text-brand-evergreen'],
    ['Stock bas', summary?.variants_low_stock ?? 0, 'À recommander', Boxes, 'text-rose-700'],
  ];
  return <div className="admin-page"><header className="admin-heading"><div><p>LA MAISON DES PYJAMAS</p><h1>Le studio de vente.</h1><span>Tout ce qui compte, en un regard.</span></div><Link href="/" target="_blank" className="admin-store-link">Voir la boutique <ArrowUpRight size={17} /></Link></header><div className="admin-kpis">{cards.map(([title, value, caption, Icon, color]) => { const CardIcon = Icon as typeof ShoppingBag; return <article key={title as string}><div><span>{title as string}</span><strong>{value as number}</strong><small>{caption as string}</small></div><CardIcon className={color as string} size={24} /></article>; })}</div><section className="admin-panel"><div className="admin-panel-title"><div><p>DERNIÈRES COMMANDES</p><h2>Le rythme de la maison</h2></div><Link href="/admin/commandes">Tout gérer</Link></div>{orders?.length ? <div className="admin-table">{orders.map((order) => { const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers; return <div key={order.id}><div><strong>#{order.order_number}</strong><span>{customer?.full_name || customer?.whatsapp_phone || 'Client à renseigner'}</span></div><span className={'status status-' + order.status}>{labels[order.status]}</span><strong>{formatMoney(Number(order.total), order.currency_code)}</strong></div>; })}</div> : <div className="admin-empty">Aucune commande pour l’instant. Dès qu’un client valide son panier WhatsApp, elle apparaîtra ici.</div>}</section></div>;
}
