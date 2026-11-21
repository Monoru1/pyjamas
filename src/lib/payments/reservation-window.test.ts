import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { commerceDatabase, sqlClient } from './test-support/commerce-db';
vi.mock('server-only', () => ({}));
const fixture = vi.hoisted(() => ({ client: {} as ReturnType<typeof sqlClient> }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fixture.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, rpc: async () => ({ data: false }) }) }));
import { POST as quote } from '@/app/api/payments/quote/route';
import { POST as checkout } from '@/app/api/payments/checkout/route';
import { POST as reconcile } from '@/app/api/payments/reconcile/route';
import { GET as status } from '@/app/api/payments/status/route';

// Terrain 16 · SEC-001 — 30-minute unpaid reservations. Same disposable harness as cancellation.test.ts.
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const origin = 'https://pyjamas25.netlify.app';
const product = '22222222-2222-4222-8222-222222222222';
const variant = '11111111-1111-4111-8111-111111111111';
let provider: Record<string, unknown>;
const env = {
  CONTEXT: 'production', FEDAPAY_ENABLED: 'true', PAYMENT_CHECKOUT_ENABLED: 'true', FEDAPAY_ENVIRONMENT: 'live', FEDAPAY_LIVE_APPROVED: 'true',
  FEDAPAY_SECRET_KEY: 'sk_live_fixture', FEDAPAY_WEBHOOK_SECRET: 'wh_fixture', FEDAPAY_ACCOUNT_ID: '101915', PAYMENT_LIVE_TEST_ENABLED: 'false', PAYMENT_ADMIN_TEST_ENABLED: 'false',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://pukvrerdloudfiphomsj.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture',
  PAYMENT_DATABASE_ISOLATED: 'false', PAYMENT_SITE_URL: origin, SITE_ORIGIN: origin, PAYMENT_SHIPPING_XOF: '0', ORDER_NOTIFICATIONS_ENABLED: 'false',
  PAYMENT_RECONCILE_SECRET: 'fixture-signing-secret-at-least-32-characters',
};
const customer = { name: 'Cliente Fixture', phone: '+229 01 00 00 00 02', email: 'cliente@example.test', address: 'Adresse de test fictive', city: 'Cotonou' };
const lines = [{ variantId: variant, quantity: 1 }];
const post = (path: string, body: unknown) => new Request(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const track = async (reference: string, recheck = false) => (await status(new Request(`${origin}/api/payments/status?reference=${reference}${recheck ? '&recheck=1' : ''}`))).json();
const one = async <T,>(sql: string) => (await db.query<T>(sql)).rows[0];
const stock = async () => (await one<{ s: number }>(`select stock_quantity s from product_variants where id='${variant}'`)).s;
async function pay(key = randomUUID()) {
  const priced = await (await quote(post('/api/payments/quote', { lines }))).json();
  const response = await checkout(post('/api/payments/checkout', { idempotencyKey: key, quoteToken: priced.quoteToken, customer, lines }));
  return { key, response, body: await response.json() };
}
/** Lets the throttle and the reservation deadline elapse without waiting. */
const age = (columns: string) => db.exec(`update payment_attempts set ${columns}`);

beforeAll(async () => { db = await commerceDatabase(); fixture.client = sqlClient(db); }, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  provider = {};
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  await db.exec(`truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products,event_request_limits,order_request_limits cascade;
 insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
 insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('${product}','annulation-fixture','Pyjama fixture',20000,'XOF',true);
 insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values('${variant}','${product}','S-36',20000,5,true,'M','Rouge');`);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://api.fedapay.com/v1/transactions' && init?.method === 'POST') { provider = { ...JSON.parse(String(init.body)), id: 42, status: 'pending', account_id: 101915 }; return Response.json({ 'v1/transaction': provider }); }
    if (url === 'https://api.fedapay.com/v1/transactions/42') { return Response.json({ 'v1/transaction': provider }); }
    if (url === 'https://api.fedapay.com/v1/transactions/42/token') { return Response.json({ token: 'fixture', url: 'https://process.fedapay.com/fixture' }); }
    throw new Error('Unexpected external request');
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

// Terrain 16 · SEC-001: unpaid reservations hold stock for 30 minutes, closed only after reading FedaPay.
it('T16: a new unpaid reservation expires 30 minutes after checkout, not 24 hours', async () => {
  await pay();
  const { minutes } = await one<{ minutes: number }>(`select extract(epoch from expires_at-created_at)/60 as minutes from payment_attempts`);
  expect(Number(minutes)).toBeGreaterThan(29);
  expect(Number(minutes)).toBeLessThanOrEqual(30.1);
});

it('T16: before the deadline a pending FedaPay payment keeps its stock reserved', async () => {
  const { body } = await pay();
  await age(`updated_at=now()-interval '1 minute'`);
  expect((await track(body.reference, true)).status).toBe('pending');
  expect(await stock()).toBe(4);
  expect((await one<{ n: number }>(`select count(*)::int n from inventory_movements where kind='release'`)).n).toBe(0);
});

it('T16: a payment approved by FedaPay when the deadline passes is confirmed, never expired', async () => {
  const { body } = await pay();
  provider.status = 'approved';
  await age(`expires_at=now()-interval '1 minute', updated_at=now()-interval '1 minute'`);
  expect((await track(body.reference, true)).status).toBe('paid');
  expect(await stock()).toBe(4);
  expect((await one<{ n: number }>(`select count(*)::int n from inventory_movements where kind='release'`)).n).toBe(0);
});

it('T16: a late approval after the stock was sold elsewhere is confirmed and flagged, stock never negative', async () => {
  const { body } = await pay();
  await age(`expires_at=now()-interval '1 minute', updated_at=now()-interval '1 minute'`);
  expect((await track(body.reference, true)).status).toBe('expired');
  await db.exec(`update product_variants set stock_quantity=0`); // Sold in the meantime.
  provider.status = 'approved';
  await age(`updated_at=now()-interval '1 minute'`);
  expect((await track(body.reference, true)).status).toBe('paid');
  expect(await stock()).toBe(0);
  expect((await one<{ a: boolean }>(`select needs_attention a from orders`)).a).toBe(true);
});

it('T16: the scheduled run closes up to four overdue reservations per pass', async () => {
  const transactions = new Map<number, Record<string, unknown>>();
  let next = 100;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://api.fedapay.com/v1/transactions' && init?.method === 'POST') { const id = next++; transactions.set(id, { ...JSON.parse(String(init.body)), id, status: 'pending', account_id: 101915 }); return Response.json({ 'v1/transaction': transactions.get(id) }); }
    const read = /^https:\/\/api\.fedapay\.com\/v1\/transactions\/(\d+)(\/token)?$/.exec(url);
    if (read?.[2]) return Response.json({ token: 'fixture', url: 'https://process.fedapay.com/fixture' });
    if (read) return Response.json({ 'v1/transaction': transactions.get(Number(read[1])) });
    throw new Error('Unexpected external request');
  }));
  for (let i = 0; i < 5; i++) expect((await pay()).response.status).toBe(200);
  expect(await stock()).toBe(0);
  await age(`expires_at=now()-interval '1 minute', next_reconcile_at=now()-interval '1 minute'`);
  const run = await reconcile(new Request(origin + '/api/payments/reconcile', { method: 'POST', headers: { authorization: `Bearer ${env.PAYMENT_RECONCILE_SECRET}` } }));
  expect(await run.json()).toMatchObject({ checked: 4, attempted: 4 });
  expect(await stock()).toBe(4);
});
