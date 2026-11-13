import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { commerceDatabase } from '@/lib/payments/test-support/commerce-db';
import { emailKinds, renderOrderEmail } from '@/lib/payments/order-email';
import { ORDER_ITEM_FIELDS, buildOrderRecord, orderEmailData } from './order-record';

/** Full schema snapshot + every release migration, in a disposable database. No provider, no Supabase. */
let db: PGlite;
const staff = '44444444-4444-4444-8444-444444444444';
const outsider = '55555555-5555-4555-8555-555555555555';
const [productA, productB] = ['22222222-2222-4222-8222-222222222221', '22222222-2222-4222-8222-222222222222'];
const [small, large] = ['11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111112'];
const photo = 'https://oxhymanjibveayhcaqvj.supabase.co/storage/v1/object/public/product-images/a/fixture.webp';
const customer = { name: 'Awa Fixture', phone: '2290100000000', email: 'fixture@example.test', address: 'Adresse fictive 123',
  city: 'Cotonou', comment: 'Sonner deux fois', emailConfirmation: true, emailTracking: true };
type Row = Record<string, unknown>;
const rows = async <T = Row>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const asStaff = (id = staff) => db.exec(`set request.jwt.claim.sub='${id}';set role authenticated;`);
const asServer = () => db.exec(`reset role;set request.jwt.claim.sub='';`);

async function order(lines = [{ variantId: small, quantity: 1 }], shipping = 500) {
  const [{ quote }] = await rows<{ quote: { items: unknown } }>('select quote_shop_basket($1,$2) quote', [JSON.stringify(lines), shipping]);
  const [{ payment }] = await rows<{ payment: Row }>("select create_shop_payment($1,'hash',$2,$3,'sandbox',42,$4,$5) payment",
    [crypto.randomUUID(), JSON.stringify(customer), JSON.stringify(lines), shipping, JSON.stringify(quote.items)]);
  await db.query('update payment_attempts set provider_id=$2 where id=$1', [payment.id, 9000 + Math.floor(Math.random() * 1e6)]);
  return payment as { id: string; order_id: string; order_number: string; amount_xof: number };
}
async function settle(payment: { id: string; amount_xof: number }, status = 'paid', event = crypto.randomUUID()) {
  const [{ provider_id }] = await rows<{ provider_id: number }>('select provider_id from payment_attempts where id=$1', [payment.id]);
  await db.query("select apply_shop_payment($1,$2,$3,42,'sandbox',$4,$5)", [payment.id, provider_id, payment.amount_xof, status, event]);
}
const kinds = async (orderId: string) => (await rows<{ kind: string }>('select kind from notification_jobs where order_id=$1 order by kind', [orderId])).map(row => row.kind);
const transition = (orderId: string, from: string, to: string) => db.query('select admin_transition_order($1,$2,$3)', [orderId, from, to]);
async function record(orderId: string) {
  const [source] = await rows('select o.*, (select to_jsonb(c) from customers c where c.id=o.customer_id) customers from orders o where o.id=$1', [orderId]);
  const items = await rows(`select ${ORDER_ITEM_FIELDS} from order_items where order_id=$1 order by id`, [orderId]);
  return buildOrderRecord(source as never, items as never);
}

beforeAll(async () => {
  db = await commerceDatabase();
  await db.exec(`insert into auth.users values('${staff}'),('${outsider}');
    insert into profiles(id,role,is_active) values('${staff}','employee',true);
    insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA');
    insert into products(id,slug,name_fr,base_price,currency_code,is_active) values
      ('${productA}','fixture-a','Pyjama fixture rouge',15000,'XOF',true),('${productB}','fixture-b','Pyjama fixture vert',20000,'XOF',true);
    insert into product_variants(id,product_id,sku,color_name_fr,size_label,price,stock_quantity,is_active) values
      ('${small}','${productA}','FIX-A-S','Rouge','S',15000,50,true),('${large}','${productB}','FIX-B-L','Vert','L',20000,50,true);
    insert into product_images(product_id,url,is_primary,sort_order) values('${productA}','${photo}',true,0);`);
}, 120_000);
afterAll(async () => { await db.close(); });

it('gives every new order a unique readable reference and never rewrites an existing one', async () => {
  const first = await order(), second = await order();
  expect(first.order_number).toMatch(/^MDP-\d{8}-[0-9A-F]{6}$/);
  expect(second.order_number).toMatch(/^MDP-\d{8}-[0-9A-F]{6}$/);
  expect(second.order_number).not.toBe(first.order_number);
  expect(await rows('select order_number from orders where id=$1', [first.order_id])).toEqual([{ order_number: first.order_number }]);
  await db.query("update orders set customer_note='modifiée' where id=$1", [first.order_id]);
  expect(await rows('select order_number from orders where id=$1', [first.order_id])).toEqual([{ order_number: first.order_number }]);
  await expect(db.query('insert into orders(order_number,source) values($1,$2)', [first.order_number, 'website'])).rejects.toThrow(/duplicate|unique/i);
});

it('keeps multi-item prices, labels and photo after the catalogue changes, identical in back-office and e-mails', async () => {
  const payment = await order([{ variantId: small, quantity: 2 }, { variantId: large, quantity: 1 }], 1000);
  const before = await record(payment.order_id);
  expect(before).toMatchObject({ reference: payment.order_number, subtotal: 50000, discount: 0, shipping: 1000, total: 51000, issues: [] });
  expect(before.lines.map(line => [line.name, line.variant, line.size, line.quantity, line.unitPrice, line.total, line.photo]).sort()).toEqual([
    ['Pyjama fixture rouge', 'Rouge', 'S', 2, 15000, 30000, photo], ['Pyjama fixture vert', 'Vert', 'L', 1, 20000, 20000, null]]);
  expect(payment.amount_xof).toBe(before.total);
  await db.exec(`update product_variants set price=99000,size_label='XXL',color_name_fr='Bleu' where id='${small}';
    update products set name_fr='Renommé',is_active=false,deleted_at=now() where id='${productA}';
    delete from product_images where product_id='${productA}';`);
  expect(await record(payment.order_id)).toEqual(before);
  for (const kind of emailKinds) {
    const mail = renderOrderEmail(kind, orderEmailData(before), 'https://pyjamas25.netlify.app');
    expect(mail.subject).toContain(payment.order_number);
    expect(mail.text).toContain('2 × Pyjama fixture rouge (Rouge, S) · 30 000 FCFA');
    expect(mail.text).toContain('1 × Pyjama fixture vert (Vert, L) · 20 000 FCFA');
    expect(mail.text).toContain('Sous-total · 50 000 FCFA');
    expect(mail.text).toContain('Livraison · 1 000 FCFA');
    expect(mail.text).toContain('Total commande · 51 000 FCFA');
    expect(mail.html).toContain('fixture.webp');
    expect(mail.html).not.toContain('DÉMONSTRATION');
    if (!kind.startsWith('customer_')) expect(mail.html).toContain(`href="https://pyjamas25.netlify.app/admin/commandes/${payment.order_id}"`);
  }
  await db.exec(`update products set name_fr='Pyjama fixture rouge',is_active=true,deleted_at=null where id='${productA}';
    update product_variants set price=15000,size_label='S',color_name_fr='Rouge' where id='${small}';`);
});

it('flags persisted amounts that disagree instead of trusting them', () => {
  const base = { id: 'o', order_number: 'MDP-X', created_at: '', status: 'pending', payment_state: 'paid', source: 'fedapay_live', needs_attention: false, currency_code: 'XOF', customer_note: null };
  const line = { id: 'l', product_id: null, product_name: 'A', sku: 'S', color_name: 'Standard', size_label: 'M', quantity: 2, unit_price: 1000, line_total: 2000, image_url: null };
  expect(buildOrderRecord({ ...base, subtotal: 2000, discount_total: 0, total: 2500, delivery: { shipping_xof: 500 } }, [line]).issues).toEqual([]);
  expect(buildOrderRecord({ ...base, subtotal: 2000, discount_total: 0, total: 9999, delivery: { shipping_xof: 500 } }, [line]).issues).toEqual(['total_incoherent']);
  expect(buildOrderRecord({ ...base, subtotal: 1000, discount_total: 0, total: 1000, delivery: null }, [line]).issues).toEqual(['sous_total_incoherent']);
  expect(buildOrderRecord({ ...base, subtotal: 2000, discount_total: 0, total: 2000, delivery: null }, [{ ...line, line_total: 1500 }]).issues).toContain('ligne_incoherente');
  expect(buildOrderRecord({ ...base, subtotal: 2000, discount_total: 0, total: 2000, delivery: null }, [line]).lines[0].variant).toBeNull();
});

it('queues each of the nine models exactly once, only from persisted business events', async () => {
  const paid = await order();
  expect(await kinds(paid.order_id)).toEqual(['staff_email_new']);
  const event = crypto.randomUUID();
  await settle(paid, 'paid', event); await settle(paid, 'paid', event); await settle(paid, 'paid');
  expect(await kinds(paid.order_id)).toEqual(['admin_email', 'customer_email', 'staff_email_new']);
  await asStaff();
  for (const [from, to] of [['pending', 'confirmed'], ['confirmed', 'preparing'], ['preparing', 'ready'], ['ready', 'delivered']]) await transition(paid.order_id, from, to);
  await asServer();
  expect(await kinds(paid.order_id)).toEqual(['admin_email', 'customer_email', 'customer_email_delivered', 'customer_email_ready',
    'staff_email_delivered', 'staff_email_new', 'staff_email_ready']);
  const refused = await order();
  await settle(refused, 'failed'); await settle(refused, 'failed');
  expect(await kinds(refused.order_id)).toEqual(['customer_email_failed', 'staff_email_failed', 'staff_email_new']);
  const all = new Set([...(await kinds(paid.order_id)), ...(await kinds(refused.order_id))]);
  expect([...all].sort()).toEqual([...emailKinds].sort());
  expect(await rows('select order_id,kind,count(*) from notification_jobs group by 1,2 having count(*)>1')).toEqual([]);
  expect((await rows<{ n: number }>("select count(*)::int n from order_status_history where order_id=$1 and changed_by=$2", [paid.order_id, staff]))[0].n).toBe(4);
});

it('never lets staff, a buyer without consent or the public move an unpaid order forward', async () => {
  const unpaid = await order();
  await asStaff();
  await expect(transition(unpaid.order_id, 'pending', 'confirmed')).rejects.toThrow('Provider-confirmed payment required');
  await expect(db.query("update orders set payment_state='paid' where id=$1", [unpaid.order_id])).rejects.toThrow('permission denied');
  await asStaff(outsider);
  await expect(transition(unpaid.order_id, 'pending', 'confirmed')).rejects.toThrow('Staff access required');
  await asServer();
  await settle(unpaid);
  await asStaff();
  await expect(transition(unpaid.order_id, 'pending', 'delivered')).rejects.toThrow('Invalid transition');
  await expect(transition(unpaid.order_id, 'confirmed', 'preparing')).rejects.toThrow('Order changed');
  await asServer();
  expect(await rows('select status,payment_state from orders where id=$1', [unpaid.order_id])).toEqual([{ status: 'pending', payment_state: 'paid' }]);
  const silent = await db.query<{ payment: Row }>("select create_shop_payment($1,'hash',$2,$3,'sandbox',42,0,(select quote_shop_basket($3,0)->'items')) payment",
    [crypto.randomUUID(), JSON.stringify({ ...customer, emailConfirmation: false, emailTracking: false }), JSON.stringify([{ variantId: large, quantity: 1 }])]);
  const quiet = silent.rows[0].payment as { id: string; order_id: string; amount_xof: number };
  await db.query('update payment_attempts set provider_id=77 where id=$1', [quiet.id]);
  await settle(quiet);
  expect(await kinds(quiet.order_id)).toEqual(['admin_email', 'staff_email_new']);
});

it('converges on the same delivery state with duplicated and out-of-order Resend events', async () => {
  const payment = await order(); await settle(payment);
  const job = async () => (await rows("select status,delivery_status,delivered_at is not null delivered from notification_jobs where order_id=$1 and kind='admin_email'", [payment.order_id]))[0];
  const event = async (id: string, type: string, at: string, message = 'msg-1') =>
    (await rows<{ r: string }>('select record_email_delivery_event($1,$2,$3,$4) r', [id, message, type, at]))[0].r;
  // The webhook overtakes the persistence of the provider identifier.
  expect(await event('evt-early', 'email.delivered', '2026-11-13T12:00:05Z')).toBe('recorded');
  expect(await job()).toEqual({ status: 'pending', delivery_status: null, delivered: false });
  await db.query("update notification_jobs set status='sent',provider_message_id='msg-1',sent_at=now() where order_id=$1 and kind='admin_email'", [payment.order_id]);
  expect(await job()).toEqual({ status: 'sent', delivery_status: null, delivered: false });
  expect((await rows<{ r: string }>("select refresh_email_delivery('msg-1') r"))[0].r).toBe('delivered');
  expect(await job()).toEqual({ status: 'sent', delivery_status: 'delivered', delivered: true });
  expect(await event('evt-early', 'email.delivered', '2026-11-13T12:00:05Z')).toBe('duplicate');
  expect(await event('evt-late-delay', 'email.delivery_delayed', '2026-11-13T12:00:01Z')).toBe('delivered');
  expect(await event('evt-sent', 'email.sent', '2026-11-13T12:00:00Z')).toBe('delivered');
  expect(await event('evt-open', 'email.opened', '2026-11-13T13:00:00Z')).toBe('delivered');
  expect(await job()).toEqual({ status: 'sent', delivery_status: 'delivered', delivered: true });
  expect(await event('evt-bounce', 'email.bounced', '2026-11-13T12:10:00Z')).toBe('bounced');
  expect(await event('evt-unknown', 'email.delivered', '2026-11-13T12:00:00Z', 'someone-elses-message')).toBe('recorded');
  await expect(event('evt-bad', 'contact.created', '2026-11-13T12:00:00Z')).rejects.toThrow('Invalid provider event');
  expect((await rows<{ n: number }>("select count(*)::int n from notification_provider_events where provider_message_id='msg-1'"))[0].n).toBe(5);
});

it('journals a staff retry and refuses unsafe or repeated ones', async () => {
  const payment = await order(); await settle(payment);
  const id = (await rows<{ id: string }>("select id from notification_jobs where order_id=$1 and kind='admin_email'", [payment.order_id]))[0].id;
  const retry = async () => (await rows<{ r: boolean }>('select staff_retry_notification($1,$2) r', [id, staff]))[0].r;
  await db.query("update notification_jobs set status='blocked',attempts=6,last_error='email_rejected' where id=$1", [id]);
  expect(await retry()).toBe(true);
  expect(await rows('select status,attempts from notification_jobs where id=$1', [id])).toEqual([{ status: 'pending', attempts: 0 }]);
  expect(await rows("select actor_id,action,entity_type from activity_logs where entity_id=$1", [id])).toEqual([{ actor_id: staff, action: 'notification_retry', entity_type: 'notification_job' }]);
  expect(await retry()).toBe(false);
  await db.query("update activity_logs set created_at=now()-interval '2 minutes' where entity_id=$1", [id]);
  await db.query("update notification_jobs set status='blocked',last_error='delivery_window_exceeded' where id=$1", [id]);
  expect(await retry()).toBe(false);
  await db.query("update notification_jobs set status='sent',last_error=null where id=$1", [id]);
  expect(await retry()).toBe(false);
  await db.exec('set role authenticated');
  await expect(retry()).rejects.toThrow('permission denied');
  await asServer();
});

it('exposes the order list and histories to staff only', async () => {
  await db.exec('set role anon');
  for (const relation of ['admin_order_list', 'notification_demo_sends', 'notification_provider_events', 'notification_jobs']) {
    await expect(db.query(`select * from ${relation}`)).rejects.toThrow('permission denied');
  }
  await asStaff(outsider);
  expect(await rows('select id from admin_order_list')).toEqual([]);
  expect(await rows('select event_id from notification_provider_events')).toEqual([]);
  await asStaff();
  const list = await rows<Row>("select * from admin_order_list where search_text like '%awa fixture%' order by created_at");
  expect(list.length).toBeGreaterThan(5);
  const multi = list.find(row => row.item_count === 3)!;
  expect(multi).toMatchObject({ client_name: 'Awa Fixture', client_phone: '2290100000000', total: '51000.00', payment_state: 'pending_payment', notification_total: 1, notification_waiting: 1 });
  expect(list.some(row => row.notification_failed === 1)).toBe(true);
  expect((await rows(`select id from admin_order_list where search_text like '%${String(multi.order_number).toLowerCase()}%'`)).length).toBe(1);
  await asServer();
});

it('records a five-unit physical receipt once, with staff identity and reason', async () => {
  const key = crypto.randomUUID();
  const receipt = (request = key) => rows('select admin_record_stock($1,5,$2,$3)', [request, 'LIV-2026-001', small]);
  await asStaff(outsider);
  try {
    await expect(receipt()).rejects.toThrow('Staff access required');
    expect(await rows('select * from admin_stock_levels')).toEqual([]);
    expect(await rows('select * from staff_stock_movements')).toEqual([]);
  } finally { await asServer(); }

  await asStaff();
  try {
    const [before] = await rows<{ available: number }>('select available from admin_stock_levels where variant_id=$1', [small]);
    await receipt();
    await receipt();
    await expect(receipt(crypto.randomUUID())).rejects.toThrow('staff_stock_receipt_reference');
    await expect(rows('select admin_record_stock($1,6,$2,$3)', [key, 'LIV-2026-001', small])).rejects.toThrow('Stock request already used');
    await expect(rows('update product_variants set stock_quantity=100 where id=$1', [small])).rejects.toThrow('stock movement action');
    expect(await rows('select staff_id, kind, stock_before, stock_after from staff_stock_movements where request_id=$1', [key]))
      .toEqual([{ staff_id: staff, kind: 'receipt', stock_before: before.available, stock_after: before.available + 5 }]);
    expect(await rows('select available from admin_stock_levels where variant_id=$1', [small])).toEqual([{ available: before.available + 5 }]);
  } finally { await asServer(); }
});

it('receives a new size and requires a reason and a fresh count for corrections', async () => {
  const key = crypto.randomUUID();
  await asStaff();
  try {
    const [{ variant }] = await rows<{ variant: string }>(
      "select admin_record_stock($1,3,'LIV-2026-002',p_product_id=>$2,p_size=>'4XL',p_price=>15000) variant", [key, productA]);
    expect(await rows('select available, physical, reserved from admin_stock_levels where variant_id=$1', [variant]))
      .toEqual([{ available: 3, physical: 3, reserved: 0 }]);
    await expect(rows("select admin_record_stock($1,4,' ', $2,3)", [crypto.randomUUID(), variant])).rejects.toThrow('Invalid stock movement');
    await expect(rows("select admin_record_stock($1,4,'Recomptage', $2,2)", [crypto.randomUUID(), variant])).rejects.toThrow('Stock changed');
    await rows("select admin_record_stock($1,4,'Recomptage', $2,3)", [crypto.randomUUID(), variant]);
    expect(await rows('select kind, stock_after from staff_stock_movements where variant_id=$1 order by created_at', [variant]))
      .toEqual([{ kind: 'receipt', stock_after: 3 }, { kind: 'adjustment', stock_after: 4 }]);
  } finally { await asServer(); }
});

it('distinguishes available, reserved and paid stock awaiting handover', async () => {
  const stockVariant = crypto.randomUUID();
  await rows("insert into product_variants(id,product_id,sku,color_name_fr,size_label,price,stock_quantity,is_active) values($1,$2,'HANDOVER','Standard','XXL',15000,1,true)", [stockVariant, productA]);
  const lines = [{ variantId: stockVariant, quantity: 1 }];
  const pending = await order(lines);
  const check = async (reserved: number, awaitingHandover: number) => {
    await asStaff();
    try {
      const [level] = await rows<{ physical: number; available: number; reserved: number; awaiting_handover: number }>(
        'select physical, available, reserved, awaiting_handover from admin_stock_levels where variant_id=$1', [stockVariant]);
      expect(level).toMatchObject({ reserved, awaiting_handover: awaitingHandover, physical: level.available + reserved + awaitingHandover });
    } finally { await asServer(); }
  };
  await check(1, 0);
  await settle(pending, 'failed');
  await check(1, 0);
  await settle(pending, 'expired');
  await check(0, 0);
  const paid = await order(lines);
  await settle(paid);
  await check(0, 1);
  await asStaff();
  try {
    await transition(paid.order_id, 'pending', 'confirmed');
    await transition(paid.order_id, 'confirmed', 'preparing');
    await transition(paid.order_id, 'preparing', 'ready');
    await transition(paid.order_id, 'ready', 'delivered');
  } finally { await asServer(); }
  await check(0, 0);
});
