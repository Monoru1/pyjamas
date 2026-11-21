import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { commerceDatabase, sqlClient } from './test-support/commerce-db';
vi.mock('server-only', () => ({}));
const fixture = vi.hoisted(() => ({ client: {} as ReturnType<typeof sqlClient> }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fixture.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'staff-fixture' } } }) }, rpc: async () => ({ data: true }) }) }));
import { POST as quote } from '@/app/api/payments/quote/route';
import { POST as checkout } from '@/app/api/payments/checkout/route';

/**
 * SEC-001 regression (Terrain 15). An anonymous visitor could reserve the whole stock of a
 * variant for 24 hours without paying, by rotating claimed phone numbers, and could exhaust
 * the shop-wide checkout ceiling for every other customer from a single connection.
 * Everything runs on a disposable PGlite database; provider calls are intercepted.
 */
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const product = '33333333-3333-4333-8333-333333333333';
const variant = '44444444-4444-4444-8444-444444444444';
const origin = 'https://pyjamas25.netlify.app';
let nextProviderId = 1000;
const providers = new Map<number, Record<string, unknown>>();

const request = (path: string, body: unknown, ip = '198.51.100.7') => new Request(origin + path, {
  method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-nf-client-connection-ip': ip }, body: JSON.stringify(body),
});
let phoneCounter = 0;
const basket = (quantity: number) => {
  phoneCounter++;
  return { idempotencyKey: randomUUID(), customer: { name: 'Fixture abus', phone: `22901${String(10_000_000 + phoneCounter).slice(-8)}`, email: 'fixture@example.test', address: 'Adresse de recette fictive', city: 'Cotonou' }, lines: [{ variantId: variant, quantity }] };
};
async function order(quantity: number, ip?: string) {
  const items = basket(quantity);
  const priced = await quote(request('/api/payments/quote', { lines: items.lines }, ip));
  if (priced.status !== 200) return priced;
  const { quoteToken } = await priced.json();
  return checkout(request('/api/payments/checkout', { ...items, quoteToken }, ip));
}
const stock = async () => (await db.query<{ stock_quantity: number }>('select stock_quantity from product_variants where id=$1', [variant])).rows[0].stock_quantity;

beforeAll(async () => { db = await commerceDatabase(); fixture.client = sqlClient(db); }, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  for (const [key, value] of Object.entries({ FEDAPAY_ENABLED: 'true', PAYMENT_CHECKOUT_ENABLED: 'true', FEDAPAY_ENVIRONMENT: 'sandbox', FEDAPAY_SECRET_KEY: 'sk_sandbox_fixture', FEDAPAY_WEBHOOK_SECRET: 'wh_fixture', FEDAPAY_ACCOUNT_ID: '42', SUPABASE_SERVICE_ROLE_KEY: 'fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://isolated.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture', PAYMENT_DATABASE_ISOLATED: 'true', PAYMENT_SITE_URL: origin, SITE_ORIGIN: origin, PAYMENT_RECONCILE_SECRET: 'fixture-signing-secret-at-least-32-characters', PAYMENT_SHIPPING_XOF: '500' })) vi.stubEnv(key, value);
  await db.exec(`truncate inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products,order_request_limits cascade;
  insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
  insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('${product}','abuse-fixture','Fixture abus',1500,'XOF',true);
  insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values('${variant}','${product}','ABUSE-M',1500,30,true,'M','Rouge');`);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://sandbox-api.fedapay.com/v1/transactions' && init?.method === 'POST') {
      const id = nextProviderId++; const body = JSON.parse(String(init.body));
      providers.set(id, { ...body, id, status: 'pending', account_id: 42 });
      return Response.json({ 'v1/transaction': providers.get(id) });
    }
    const read = /^https:\/\/sandbox-api\.fedapay\.com\/v1\/transactions\/(\d+)(\/token)?$/.exec(url);
    if (read && read[2]) return Response.json({ token: 'fixture', url: 'https://sandbox-checkout.fedapay.com/fixture' });
    if (read) return Response.json({ 'v1/transaction': providers.get(Number(read[1])) });
    throw new Error('Unexpected external request');
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('SEC-001: one connection cannot lock the whole stock of a variant with rotating phone numbers', async () => {
  const attacker = '203.0.113.66';
  const results = [];
  for (let i = 0; i < 3; i++) results.push((await order(10, attacker)).status);
  // A first unpaid basket of up to 30 units stays possible (a real family order).
  expect(results[0]).toBe(200);
  // But the same connection cannot pile up unpaid reservations beyond the cap.
  expect(results.filter(status => status === 429).length).toBeGreaterThan(0);
  expect(await stock()).toBeGreaterThan(0);
  // A genuine customer on another connection can still buy.
  expect((await order(1, '192.0.2.10')).status).toBe(200);
});

it('SEC-001: a single connection cannot exhaust the shop-wide checkout ceiling', async () => {
  const attacker = '203.0.113.99';
  // Malformed quote tokens: no stock is touched, only the request budget is consumed.
  for (let i = 0; i < 130; i++) await checkout(request('/api/payments/checkout', { ...basket(1), quoteToken: 'x' }, attacker));
  const blocked = await checkout(request('/api/payments/checkout', { ...basket(1), quoteToken: 'x' }, attacker));
  expect(blocked.status).toBe(429);
  // Another customer is not affected by that client's flood.
  expect((await order(1, '192.0.2.20')).status).toBe(200);
});

it('SEC-001: resuming the same order is never refused by the reservation cap', async () => {
  const ip = '198.51.100.30';
  const items = basket(10);
  const { quoteToken } = await (await quote(request('/api/payments/quote', { lines: items.lines }, ip))).json();
  expect((await checkout(request('/api/payments/checkout', { ...items, quoteToken }, ip))).status).toBe(200);
  expect((await order(10, ip)).status).toBe(200);
  // 20 units are now held by this connection: a NEW basket is refused...
  expect((await order(1, ip)).status).toBe(429);
  // ...but a retry of an existing order must still resume it.
  const resumed = await checkout(request('/api/payments/checkout', { ...items, quoteToken }, ip));
  expect(resumed.status).toBe(200);
  expect((await db.query<{ n: number }>('select count(*)::int n from payment_attempts')).rows[0].n).toBe(2);
});

it('SEC-001: stores only a keyed fingerprint of the connection, never the raw address', async () => {
  expect((await order(1, '198.51.100.41')).status).toBe(200);
  const rows = (await db.query<{ client_fingerprint: string }>('select client_fingerprint from payment_attempts')).rows;
  expect(rows[0].client_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify((await db.query('select * from payment_attempts')).rows)).not.toContain('198.51.100.41');
  expect(JSON.stringify((await db.query('select * from order_request_limits')).rows)).not.toContain('198.51.100.41');
});

it('SEC-001: the checkout budget is callable by the server only, never by browser roles', async () => {
  for (const role of ['anon', 'authenticated']) {
    await expect(db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      await tx.query('select consume_checkout_budget($1,$2,1,20)', ['a'.repeat(64), 'b'.repeat(64)]);
    })).rejects.toThrow('permission denied');
  }
  await expect(db.query('select consume_checkout_budget($1,$2,1,20)', ['not-a-fingerprint', 'b'.repeat(64)])).rejects.toThrow('Invalid checkout budget request');
});

it('SEC-008: connection fingerprints use the dedicated key once CHECKOUT_FINGERPRINT_SECRET is set', async () => {
  const dedicated = 'f'.repeat(40);
  vi.stubEnv('CHECKOUT_FINGERPRINT_SECRET', dedicated);
  expect((await order(1, '198.51.100.77')).status).toBe(200);
  const { client_fingerprint } = (await db.query<{ client_fingerprint: string }>('select client_fingerprint from payment_attempts')).rows[0];
  expect(client_fingerprint).toBe(createHmac('sha256', dedicated).update('checkout-client:198.51.100.77').digest('hex'));
  expect(client_fingerprint).not.toBe(createHmac('sha256', 'wh_fixture').update('checkout-client:198.51.100.77').digest('hex'));
});
