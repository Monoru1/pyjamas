import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { commerceDatabase, sqlClient } from './test-support/commerce-db';
vi.mock('server-only', () => ({}));
const fixture = vi.hoisted(() => ({ client: {} as ReturnType<typeof sqlClient> }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fixture.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, rpc: async () => ({ data: false }) }) }));
import { POST as quote } from '@/app/api/payments/quote/route';
import { POST as checkout } from '@/app/api/payments/checkout/route';
import { POST as webhook } from '@/app/api/payments/webhook/route';
import { POST as reconcile } from '@/app/api/payments/reconcile/route';
import { GET as status } from '@/app/api/payments/status/route';
import { describePayment, type ReturnHint } from '@/app/paiement/payment-status';

// Terrain 15 — incident MDP-20261120-E6AAAD: the customer cancelled on FedaPay Live, FedaPay
// kept the transaction `pending` (no terminal webhook) and the shop showed "En attente" forever.
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const origin = 'https://pyjamas25.netlify.app';
const product = '22222222-2222-4222-8222-222222222222';
const variant = '11111111-1111-4111-8111-111111111111';
let provider: Record<string, unknown>;
let reads = 0;
let tokens = 0;
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
async function signed(name: string) {
  const raw = JSON.stringify({ name, object: 'transaction', entity: { id: 42, updated_at: new Date().toISOString() } });
  const t = Math.floor(Date.now() / 1000);
  return webhook(new Request(origin + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fedapay-signature': `t=${t},s=${createHmac('sha256', 'wh_fixture').update(`${t}.${raw}`).digest('hex')}` }, body: raw }));
}
/** Lets the throttle and the reservation deadline elapse without waiting. */
const age = (columns: string) => db.exec(`update payment_attempts set ${columns}`);

beforeAll(async () => { db = await commerceDatabase(); fixture.client = sqlClient(db); }, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  reads = 0; tokens = 0; provider = {};
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  await db.exec(`truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products,event_request_limits,order_request_limits cascade;
 insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
 insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('${product}','annulation-fixture','Pyjama fixture',20000,'XOF',true);
 insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values('${variant}','${product}','S-36',20000,5,true,'M','Rouge');`);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://api.fedapay.com/v1/transactions' && init?.method === 'POST') { provider = { ...JSON.parse(String(init.body)), id: 42, status: 'pending', account_id: 101915 }; return Response.json({ 'v1/transaction': provider }); }
    if (url === 'https://api.fedapay.com/v1/transactions/42') { reads++; return Response.json({ 'v1/transaction': provider }); }
    if (url === 'https://api.fedapay.com/v1/transactions/42/token') { tokens++; return Response.json({ token: 'fixture', url: 'https://process.fedapay.com/fixture' }); }
    throw new Error('Unexpected external request');
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('reproduces the incident: a cancelled FedaPay checkout stays pending and is shown as NOT finalized, never as paid', async () => {
  const { body } = await pay();
  expect(body.url).toBe('https://process.fedapay.com/fixture');
  // Customer cancels on FedaPay; FedaPay sends no terminal event and still reports `pending`.
  const before = reads;
  const tracked = await track(body.reference, true);
  expect(tracked).toMatchObject({ status: 'pending', checkedNow: false }); // updated_at is fresh: throttled.
  await age(`updated_at=now()-interval '1 minute'`);
  const rechecked = await track(body.reference, true);
  expect(rechecked).toMatchObject({ status: 'pending', checkedNow: true });
  expect(reads).toBe(before + 1); // The server itself asked FedaPay.
  expect(Date.parse(rechecked.reservedUntil)).toBeGreaterThan(Date.now());
  expect(rechecked.order.status).toBeUndefined(); // No logistics for an unpaid order.
  // Old page: one undifferentiated "En attente de confirmation". New page: explicit, honest, actionable.
  const shown = describePayment(rechecked, 'canceled', false);
  expect(shown.title).toBe('Paiement non finalisé');
  expect(shown.body).toContain('aucun débit');
  expect(shown.action).toBe('resume');
  expect(await stock()).toBe(4); // Still reserved while the attempt can be resumed.
});

it('throttles tracking-triggered FedaPay reads (one per payment per 30 s, scheduled runs included)', async () => {
  const { body } = await pay();
  await age(`updated_at=now()-interval '1 minute'`);
  const start = reads;
  const results = await Promise.all([track(body.reference, true), track(body.reference, true), track(body.reference, true)]);
  expect(results.filter(result => result.checkedNow).length).toBe(1);
  expect(reads).toBe(start + 1);
  expect((await track(body.reference)).checkedNow).toBe(false); // Plain polling never reads FedaPay.
  expect(reads).toBe(start + 1);
});

it('closes an unpaid attempt at its reservation deadline: expired, stock released once, new order allowed', async () => {
  const { key, body } = await pay();
  expect(await stock()).toBe(4);
  await age(`expires_at=now()-interval '1 minute', updated_at=now()-interval '1 minute'`);
  const tracked = await track(body.reference, true);
  expect(tracked.status).toBe('expired');
  expect(tracked.reservedUntil).toBeUndefined();
  expect(await stock()).toBe(5);
  expect(describePayment(tracked, 'canceled', false)).toMatchObject({ title: 'Paiement expiré', action: 'restart' });
  // A later scheduled run keeps it closed and does not release twice.
  await age(`next_reconcile_at=now()-interval '1 minute'`);
  const run = await reconcile(new Request(origin + '/api/payments/reconcile', { method: 'POST', headers: { authorization: `Bearer ${env.PAYMENT_RECONCILE_SECRET}` } }));
  expect(await run.json()).toMatchObject({ checked: 1, attempted: 1 });
  expect(await stock()).toBe(5);
  expect((await one<{ n: number }>(`select count(*)::int n from inventory_movements where kind='release'`)).n).toBe(1);
  expect((await one<{ s: string; p: string }>(`select p.status s, o.payment_state p from payment_attempts p join orders o on o.id=p.order_id`))).toEqual({ s: 'expired', p: 'expired' });
  // Same browser key: the server says terminal, never offers the old FedaPay link again.
  const again = await checkout(post('/api/payments/checkout', { idempotencyKey: key, customer, lines }));
  expect(again.status).toBe(409);
  expect(await again.json()).toMatchObject({ terminal: true, reference: body.reference });
  // A fresh quote is possible again (the browser drops its key on `terminal`).
  expect((await quote(post('/api/payments/quote', { lines }))).status).toBe(200);
});

it('never loses a payment approved after the local deadline: FedaPay wins, stock re-acquired, no duplicate', async () => {
  const { body } = await pay();
  await age(`expires_at=now()-interval '1 minute', updated_at=now()-interval '1 minute'`);
  expect((await track(body.reference, true)).status).toBe('expired');
  provider.status = 'approved';
  expect((await signed('transaction.approved')).status).toBe(200);
  expect((await signed('transaction.approved')).status).toBe(200); // Re-delivery.
  const tracked = await track(body.reference);
  expect(tracked.status).toBe('paid');
  expect(describePayment(tracked, '', false).title).toBe('Paiement confirmé');
  expect(await stock()).toBe(4);
  expect((await one<{ n: number }>(`select count(*)::int n from inventory_movements where kind='commit'`)).n).toBe(1);
  expect((await one<{ n: number }>(`select count(*)::int n from orders`)).n).toBe(1);
});

it('maps FedaPay declined/canceled to distinct resumable states, and resumes the SAME transaction idempotently', async () => {
  for (const [providerStatus, local, title] of [['declined', 'failed', 'Paiement refusé'], ['canceled', 'cancelled', 'Paiement annulé']] as const) {
    await db.exec('truncate payment_events,inventory_movements,payment_attempts,order_items,order_status_history,orders,customers,order_request_limits cascade');
    await db.exec(`update product_variants set stock_quantity=5`);
    const first = await pay();
    provider.status = providerStatus;
    expect((await signed(`transaction.${providerStatus}`)).status).toBe(200);
    const tracked = await track(first.body.reference);
    expect(tracked.status).toBe(local);
    expect(describePayment(tracked, '', false)).toMatchObject({ title, action: 'resume' });
    expect(await stock()).toBe(4); // Kept until the reservation deadline.
    // "Reprendre le paiement": same key, same order, same amount, same FedaPay transaction.
    const tokensBefore = tokens;
    const priced = await (await checkout(post('/api/payments/checkout', { idempotencyKey: first.key, customer, lines }))).json();
    expect(priced.quote.reserved).toBe(true);
    const resumed = await checkout(post('/api/payments/checkout', { idempotencyKey: first.key, quoteToken: priced.quoteToken, customer, lines }));
    expect(await resumed.json()).toMatchObject({ url: 'https://process.fedapay.com/fixture', reference: first.body.reference });
    expect(tokens).toBe(tokensBefore); // Stored link reused, no new provider transaction.
    expect((await one<{ n: number }>('select count(*)::int n from payment_attempts')).n).toBe(1);
  }
});

it('resuming an overdue attempt goes to the tracking page as expired instead of reopening FedaPay', async () => {
  const first = await pay();
  await age(`expires_at=now()-interval '1 minute'`);
  const priced = await (await checkout(post('/api/payments/checkout', { idempotencyKey: first.key, customer, lines }))).json();
  const resumed = await (await checkout(post('/api/payments/checkout', { idempotencyKey: first.key, quoteToken: priced.quoteToken, customer, lines }))).json();
  expect(resumed).toMatchObject({ internal: true, url: `${origin}/paiement?reference=${first.body.reference}` });
  expect((await track(first.body.reference)).status).toBe('expired');
  expect(await stock()).toBe(5);
});

it('wording: only a server-confirmed `paid` ever says the payment is confirmed, whatever the return hint', () => {
  const hints: ReturnHint[] = ['', 'approved', 'declined', 'canceled'];
  for (const state of ['pending', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded', 'unknown']) for (const hint of hints) for (const stalled of [false, true]) {
    const view = describePayment({ status: state, reservedUntil: new Date(Date.now() + 3600_000).toISOString() }, hint, stalled);
    expect(view.title).not.toMatch(/confirmé/i);
    expect(view.body).not.toMatch(/a confirmé votre paiement/);
  }
  expect(describePayment({ status: 'pending' }, 'approved', false).title).toBe('Paiement en cours de vérification');
  expect(describePayment({ status: 'pending' }, '', true).title).toBe('Paiement non finalisé');
  expect(describePayment({ status: 'paid' }, 'canceled', true).title).toBe('Paiement confirmé');
});
