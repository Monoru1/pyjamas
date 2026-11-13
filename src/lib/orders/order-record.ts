/**
 * Single source for what an order *is* commercially. The back-office page and the
 * nine e-mail models both render this record, built only from persisted rows.
 */
export const ORDER_FIELDS = 'id,order_number,created_at,status,payment_state,source,needs_attention,currency_code,subtotal,discount_total,total,customer_note,delivery,customers(full_name,phone,whatsapp_phone,email,city)';
export const ORDER_ITEM_FIELDS = 'id,product_id,product_name,sku,color_name,size_label,quantity,unit_price,line_total,image_url';

type Json = Record<string, unknown>;
type OrderSource = {
  id: string; order_number: string; created_at: string; status: string; payment_state: string; source: string;
  needs_attention: boolean; currency_code: string; subtotal: number | string; discount_total: number | string;
  total: number | string; customer_note: string | null; delivery: Json | null; customers?: Json | Json[] | null;
};
type ItemSource = {
  id: string; product_id: string | null; product_name: string; sku: string; color_name: string | null;
  size_label: string | null; quantity: number | string; unit_price: number | string; line_total: number | string;
  image_url: string | null;
};

export type OrderLine = {
  id: string; name: string; sku: string; variant: string | null; size: string | null;
  quantity: number; unitPrice: number; total: number; photo: string | null;
};
export type OrderRecord = {
  id: string; reference: string; createdAt: string; status: string; paymentState: string; source: string;
  needsAttention: boolean; currency: string;
  client: { name: string | null; phone: string | null; email: string | null; address: string | null; city: string | null; note: string | null };
  lines: OrderLine[]; subtotal: number; discount: number; shipping: number | null; total: number;
  /** Non-empty when persisted amounts disagree: nothing is sent and staff is alerted. */
  issues: string[];
};

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;

export function buildOrderRecord(order: OrderSource, items: ItemSource[]): OrderRecord {
  const customer = (Array.isArray(order.customers) ? order.customers[0] : order.customers) ?? {};
  const delivery = order.delivery ?? {};
  const lines = items.map(item => ({
    id: item.id, name: item.product_name, sku: item.sku,
    variant: item.color_name && item.color_name !== 'Standard' ? item.color_name : null,
    size: item.size_label, quantity: Number(item.quantity), unitPrice: Number(item.unit_price),
    total: Number(item.line_total), photo: item.image_url,
  }));
  const subtotal = Number(order.subtotal), discount = Number(order.discount_total), total = Number(order.total);
  const shipping = typeof delivery.shipping_xof === 'number' ? delivery.shipping_xof : null;
  const issues: string[] = [];
  if (![subtotal, discount, total].every(Number.isFinite)) issues.push('montants_illisibles');
  if (lines.some(line => !Number.isFinite(line.total) || line.unitPrice * line.quantity !== line.total)) issues.push('ligne_incoherente');
  if (lines.length && lines.reduce((sum, line) => sum + line.total, 0) !== subtotal) issues.push('sous_total_incoherent');
  if (shipping !== null && subtotal - discount + shipping !== total) issues.push('total_incoherent');
  return {
    id: order.id, reference: order.order_number, createdAt: order.created_at, status: order.status,
    paymentState: order.payment_state, source: order.source, needsAttention: order.needs_attention,
    currency: order.currency_code,
    client: {
      name: text(delivery.name) ?? text(customer.full_name),
      phone: text(delivery.phone) ?? text(customer.whatsapp_phone) ?? text(customer.phone),
      email: text(delivery.email) ?? text(customer.email),
      address: text(delivery.address), city: text(delivery.city) ?? text(customer.city),
      note: text(order.customer_note),
    },
    lines, subtotal, discount, shipping, total, issues,
  };
}

/** Exactly what the e-mail models receive for a real order. */
export function orderEmailData(record: OrderRecord) {
  return {
    reference: record.reference, total: record.total, subtotal: record.subtotal,
    discount: record.discount || undefined, shipping: record.shipping ?? undefined,
    adminPath: `/admin/commandes/${record.id}`,
    lines: record.lines.map(line => ({
      name: line.name, variant: line.variant, size: line.size, quantity: line.quantity,
      total: line.total, photo: line.photo,
    })),
  };
}

type Query = PromiseLike<{ data: unknown; error: unknown }>;
type Reader = { from(table: string): { select(fields: string): { eq(column: string, value: string): {
  single(): Query; order(column: string): Query;
} } } };

export async function loadOrderRecord(db: unknown, id: string): Promise<OrderRecord | null> {
  const reader = db as Reader;
  const [order, items] = await Promise.all([
    reader.from('orders').select(ORDER_FIELDS).eq('id', id).single(),
    reader.from('order_items').select(ORDER_ITEM_FIELDS).eq('order_id', id).order('id'),
  ]);
  if (order.error || !order.data || items.error) return null;
  return buildOrderRecord(order.data as OrderSource, (items.data as ItemSource[] | null) ?? []);
}
