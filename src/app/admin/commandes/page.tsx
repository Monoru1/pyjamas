import { updateOrderStatus } from '@/app/admin/actions';
import { OrdersAutoRefresh } from '@/app/admin/commandes/orders-auto-refresh';
import { createClient } from '@/lib/supabase/server';
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

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, currency_code, customer_note, created_at, customers(full_name, phone, whatsapp_phone), order_items(product_name, size_label, quantity)')
    .order('created_at', { ascending: false });

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
              const transitions = nextStatuses[order.status] ?? [];

              return (
                <article key={order.id}>
                  <div className="order-top">
                    <div>
                      <span>#{order.order_number} · {labels[order.status]}</span>
                      <h3>{customer?.full_name || 'Client'}</h3>
                      <p>{customer?.whatsapp_phone || customer?.phone || 'Coordonnées à renseigner'}</p>
                    </div>
                    <strong>{formatPrice(Number(order.total), order.currency_code)}</strong>
                  </div>
                  <p className="order-items">
                    {items.map((item) => `${item.quantity}× ${item.product_name}${item.size_label ? ` · ${item.size_label}` : ''}`).join(' — ') || 'Articles à renseigner'}
                  </p>
                  {order.customer_note && <p className="order-note">“{order.customer_note}”</p>}

                  {order.status === 'pending' ? (
                    <div className="flex flex-wrap gap-3">
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button className="admin-action">Prendre en charge</button>
                      </form>
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button className="admin-action secondary">Refuser</button>
                      </form>
                    </div>
                  ) : transitions.length ? (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
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
