import { updateOrderStatus } from '@/app/admin/actions';
import { OrdersAutoRefresh } from '@/app/admin/commandes/orders-auto-refresh';
import { createAdminClient as createClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils/money';

const labels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Prise en charge',
  preparing: 'Préparation',
  ready: 'Prête',
  delivered: 'Livrée',
  cancelled: 'Refusée / annulée',
};

const nextStatuses: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export default async function OrdersPage({searchParams}:{searchParams:Promise<{status?:string;date?:string}>}) {
  const supabase = await createClient();
  const filters = await searchParams;
  let query = supabase
    .from('orders')
    .select('id, order_number, status, total, currency_code, customer_note, created_at, payment_state, delivery, needs_attention, source, customers(full_name, phone, whatsapp_phone), order_items(product_name, sku, size_label, quantity)')
    .order('created_at', { ascending: false }).limit(200);
  if (filters.status && Object.keys(labels).includes(filters.status)) query = query.eq('status', filters.status as keyof typeof labels as never);
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date) && !Number.isNaN(Date.parse(filters.date))) {
    query = query.gte('created_at', `${filters.date}T00:00:00Z`).lt('created_at', new Date(Date.parse(filters.date)+86400000).toISOString());
  }
  const { data: orders, error } = await query;

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <p>OPÉRATIONS</p>
          <h1>Commandes.</h1>
          <span>Chaque demande arrive ici avant d’être prise en charge ou refusée.</span>
          <OrdersAutoRefresh />
        </div>
      </header>

      <form className="mb-5 flex flex-wrap gap-3" method="get">
        <label>Statut <select name="status" defaultValue={filters.status || ''}><option value="">Tous</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Date (Bénin / UTC) <input type="date" name="date" defaultValue={filters.date}/></label><button className="admin-action">Filtrer</button>
      </form>
      {error && <p role="alert">Chargement impossible. Vérifiez les migrations et les droits.</p>}
      <section className="admin-panel">
        <div className="admin-panel-title">
          <div>
            <p>SUIVI EN DIRECT</p>
            <h2>{orders?.length ?? 0} commande{(orders?.length ?? 0) > 1 ? 's' : ''}</h2>
          </div>
        </div>

        {orders?.length ? (
          <div className="admin-orders">
            {orders.map((order) => {
              const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
              const items = Array.isArray(order.order_items) ? order.order_items : [];
              const online = order.source.startsWith('fedapay_');
              const canFulfill = !online || (order.payment_state === 'paid' && !order.needs_attention);
              const transitions = canFulfill ? nextStatuses[order.status] ?? [] : [];

              return (
                <article key={order.id}>
                  <div className="order-top">
                    <div>
                      <span>#{order.order_number} · {labels[order.status]}</span>
                      <h3>{order.delivery?.name || customer?.full_name || 'Client'}</h3>
                      <p>{order.delivery?.phone || customer?.whatsapp_phone || customer?.phone || 'Coordonnées à renseigner'}</p>
                    </div>
                    <strong>{formatPrice(Number(order.total), order.currency_code)}</strong>
                  </div>
                  <p className="order-items">
                    {items.map((item) => `${item.quantity}× ${item.product_name}${item.size_label ? ` · ${item.size_label}` : ''} · Réf. ${item.sku}`).join(' — ') || 'Articles à renseigner'}
                  </p>
                  {online && <p className="order-note">Paiement : {order.payment_state} · {order.source === 'fedapay_sandbox' ? 'TEST SANDBOX' : 'Production'}{order.needs_attention ? ' · INTERVENTION REQUISE' : ''}</p>}
                  {order.delivery && <p className="order-note">Livraison : {order.delivery.address}, {order.delivery.city} · {order.delivery.email}</p>}
                  {order.customer_note && <p className="order-note">“{order.customer_note}”</p>}

                  {!canFulfill ? <p className="order-note">Traitement bloqué : paiement non confirmé ou intervention requise.</p> : order.status === 'pending' ? (
                    <div className="flex flex-wrap gap-3">
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="expected_status" value={order.status} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button className="admin-action">Prendre en charge</button>
                      </form>
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="expected_status" value={order.status} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button className="admin-action secondary">Refuser</button>
                      </form>
                    </div>
                  ) : transitions.length ? (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="expected_status" value={order.status} />
                      <select name="status" defaultValue={transitions[0]}>
                        {transitions.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
                      </select>
                      <button>Mettre à jour</button>
                    </form>
                  ) : (
                    <p className="order-note">Décision finale enregistrée.</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty">Les nouvelles demandes du site apparaîtront ici, en attente de validation.</div>
        )}
      </section>
    </div>
  );
}
