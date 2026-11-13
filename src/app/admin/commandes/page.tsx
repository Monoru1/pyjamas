import { parseAdminOrderFilters, type OrderSearchParams } from '@/lib/orders/admin-order-filters';
import Link from 'next/link';
import { updateOrderStatus } from '@/app/admin/actions';
import { OrdersAutoRefresh } from '@/app/admin/commandes/orders-auto-refresh';
import { createAdminClient as createClient } from '@/lib/supabase/admin';
import { canFulfill, dateTime, nextOrderStatuses, orderStatusLabels, paymentStateLabels, transitionLabels } from '@/lib/orders/labels';
import { notificationSummary, toneClass } from '@/lib/orders/notification-status';
import { formatPrice } from '@/lib/utils/money';

const PAGE_SIZE = 20;
type Row = {
  id: string; order_number: string; created_at: string; status: string; payment_state: string; source: string;
  needs_attention: boolean; total: number; currency_code: string; client_name: string | null;
  client_phone: string | null; item_count: number; notification_total: number | null;
  notification_failed: number | null; notification_waiting: number | null;
  notification_accepted: number | null; notification_delivered: number | null;
};
export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderSearchParams> }) {
  const supabase = await createClient();
  const { search, status, payment, from, to, oldestFirst, page } = parseAdminOrderFilters(await searchParams);

  let query = supabase.from('admin_order_list' as never).select('*', { count: 'exact' })
    .order('created_at', { ascending: oldestFirst }).order('id')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (search) query = query.ilike('search_text', `%${search}%`);
  if (status) query = query.eq('status', status);
  if (payment) query = query.eq('payment_state', payment);
  if (from) query = query.gte('created_at', `${from}T00:00:00Z`);
  if (to) query = query.lt('created_at', new Date(Date.parse(to) + 86400000).toISOString());
  const { data, error, count } = await query;
  const orders = (data ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageLink = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ q: search, status, paiement: payment, du: from, au: to, tri: oldestFirst ? 'ancien' : '' })) if (value) params.set(key, value);
    if (target > 1) params.set('page', String(target));
    const text = params.toString();
    return text ? `/admin/commandes?${text}` : '/admin/commandes';
  };
  const field = 'min-h-11 rounded-lg border border-black/20 bg-white px-3';

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <p>OPÉRATIONS</p>
          <h1>Commandes.</h1>
          <span>Référence, client, paiement, préparation et notifications de chaque commande.</span>
          <OrdersAutoRefresh />
        </div>
      </header>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 text-sm font-semibold" method="get" role="search">
        <label className="flex min-w-0 flex-1 basis-56 flex-col gap-2">Référence ou client
          <input className={field} type="search" name="q" defaultValue={search} maxLength={60} placeholder="MDP-…, nom, téléphone" /></label>
        <label className="flex flex-col gap-2">Préparation
          <select className={field} name="status" defaultValue={status}><option value="">Toutes</option>{Object.entries(orderStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="flex flex-col gap-2">Paiement
          <select className={field} name="paiement" defaultValue={payment}><option value="">Tous</option>{Object.entries(paymentStateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="flex flex-col gap-2">Du (UTC) <input className={field} type="date" name="du" defaultValue={from} /></label>
        <label className="flex flex-col gap-2">Au (UTC) <input className={field} type="date" name="au" defaultValue={to} /></label>
        <label className="flex flex-col gap-2">Tri
          <select className={field} name="tri" defaultValue={oldestFirst ? 'ancien' : ''}><option value="">Plus récentes</option><option value="ancien">Plus anciennes</option></select></label>
        <button className="admin-action min-h-11 rounded-lg px-6">Filtrer</button>
        <Link className="min-h-11 py-3 underline" href="/admin/commandes">Réinitialiser</Link>
      </form>

      {error && <p role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm">Chargement impossible. Vérifiez que la migration de réconciliation des commandes est appliquée et que votre session staff est active.</p>}
      <section className="admin-panel">
        <div className="admin-panel-title">
          <div>
            <p>PAGE {page} / {pages}</p>
            <h2>{count ?? 0} commande{(count ?? 0) > 1 ? 's' : ''}</h2>
          </div>
        </div>

        {orders.length ? (
          <div className="admin-orders">
            {orders.map(order => {
              const next = canFulfill(order) ? nextOrderStatuses[order.status]?.[0] : undefined;
              const notifications = notificationSummary(order);
              return (
                <article key={order.id}>
                  <div className="order-top">
                    <div className="min-w-0">
                      <span>{order.order_number} · {dateTime(order.created_at)}</span>
                      <h3 className="break-words">{order.client_name || 'Client non renseigné'}</h3>
                      <p>{order.client_phone || 'Coordonnées à renseigner'} · {order.item_count} article{order.item_count > 1 ? 's' : ''}</p>
                    </div>
                    <strong>{formatPrice(Number(order.total), order.currency_code)}</strong>
                  </div>
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-black/55">Paiement</dt>
                    <dd>{paymentStateLabels[order.payment_state] ?? order.payment_state}{order.source === 'fedapay_sandbox' ? ' · TEST SANDBOX' : ''}{order.needs_attention ? ' · INTERVENTION REQUISE' : ''}</dd>
                    <dt className="text-black/55">Préparation</dt>
                    <dd>{orderStatusLabels[order.status] ?? order.status}</dd>
                    <dt className="text-black/55">Notifications</dt>
                    <dd><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${toneClass[notifications.tone]}`}>{notifications.label}</span></dd>
                  </dl>
                  {order.source === 'notification_demo' && <p className="order-note">Démonstration des notifications</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link className="min-h-10 rounded-lg border border-black/20 px-4 py-2 text-sm font-bold" href={`/admin/commandes/${order.id}`}>Ouvrir la commande</Link>
                    {next && <form action={updateOrderStatus} style={{ margin: 0 }}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="expected_status" value={order.status} />
                      <input type="hidden" name="status" value={next} />
                      <button>{transitionLabels[next]}</button>
                    </form>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : !error && (
          <div className="admin-empty">{search || status || payment || from || to ? 'Aucune commande ne correspond à ces filtres.' : 'Les nouvelles commandes du site apparaîtront ici.'}</div>
        )}
      </section>
      {pages > 1 && <nav aria-label="Pagination des commandes" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        {page > 1 ? <Link className="min-h-11 rounded-lg border border-black/20 px-4 py-3 font-bold" href={pageLink(page - 1)}>← Précédentes</Link> : <span />}
        <span>Page {page} sur {pages}</span>
        {page < pages ? <Link className="min-h-11 rounded-lg border border-black/20 px-4 py-3 font-bold" href={pageLink(page + 1)}>Suivantes →</Link> : <span />}
      </nav>}
    </div>
  );
}
