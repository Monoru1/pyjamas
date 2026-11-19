import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { commerceDatabase, sqlClient } from './test-support/commerce-db';
import { checkoutConfiguration, paymentConfiguration } from './fedapay';
vi.mock('server-only', () => ({}));
const fixture = vi.hoisted(() => ({ client: {} as ReturnType<typeof sqlClient>, admin: true }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fixture.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'staff-fixture' } } }) }, rpc: async () => ({ data: fixture.admin }) }) }));
import { POST as quote } from '@/app/api/payments/quote/route';
import { POST as checkout } from '@/app/api/payments/checkout/route';
import { POST as webhook } from '@/app/api/payments/webhook/route';
import { processNotificationJobs } from './notifications';

// Private Live payment on production: admins only, one exact owner-approved amount.
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const product = '22222222-2222-4222-8222-222222222222';
const variant = '11111111-1111-4111-8111-111111111111';
const origin = 'https://pyjamas25.netlify.app';
let provider: Record<string, unknown>;
let creates = 0;
let mails = 0;
const production = {
  CONTEXT: 'production', FEDAPAY_ENABLED: 'true', PAYMENT_CHECKOUT_ENABLED: 'true', FEDAPAY_ENVIRONMENT: 'live',
  FEDAPAY_SECRET_KEY: 'sk_live_fixture', FEDAPAY_WEBHOOK_SECRET: 'wh_fixture', FEDAPAY_ACCOUNT_ID: '101915',
  FEDAPAY_LIVE_APPROVED: 'false', PAYMENT_LIVE_TEST_ENABLED: 'false', PAYMENT_ADMIN_TEST_ENABLED: 'true',
  PAYMENT_ADMIN_TEST_AMOUNT_XOF: '2000', PAYMENT_ADMIN_TEST_EXPIRES_AT: new Date(Date.now() + 3600_000).toISOString(),
  SUPABASE_SERVICE_ROLE_KEY: 'fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://pukvrerdloudfiphomsj.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture', PAYMENT_DATABASE_ISOLATED: 'false', PAYMENT_SITE_URL: origin, SITE_ORIGIN: origin,
  PAYMENT_RECONCILE_SECRET: 'fixture-signing-secret-at-least-32-characters', PAYMENT_SHIPPING_XOF: '500',
  RESEND_API_KEY: 'fixture', ORDER_EMAIL_FROM: 'fixture@example.test', ORDER_ADMIN_EMAIL: 'admin@example.test', ORDER_NOTIFICATIONS_ENABLED: 'true',
};
const request = (path: string, body: unknown) => new Request(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const input = () => ({ idempotencyKey: randomUUID(), customer: { emailConfirmation: true, name: 'Fixture uniquement', phone: '+229 01 00 00 00 00', email: 'fixture@example.test', address: 'Adresse de recette fictive', city: 'Cotonou' }, lines: [{ variantId: variant, quantity: 1 }] });
async function signedEvent(id = 100, name = 'transaction.approved') {
  const raw = JSON.stringify({ id, name, entity: { id: 42 } });
  const t = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', 'wh_fixture').update(`${t}.${raw}`).digest('hex');
  return webhook(new Request(origin + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fedapay-signature': `t=${t},s=${signature}` }, body: raw }));
}
async function priced(basket = input()) {
  const q = await (await quote(request('/api/payments/quote', { lines: basket.lines }))).json();
  return { basket, token: q.quoteToken as string, amount: q.quote.amount_xof as number };
}
beforeAll(async () => { db = await commerceDatabase(); fixture.client = sqlClient(db); }, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  creates = 0; mails = 0; provider = {}; fixture.admin = true;
  for (const [key, value] of Object.entries(production)) vi.stubEnv(key, value);
  await db.exec(`truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products,event_request_limits cascade;
 insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
 insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('${product}','admin-fixture','Fixture uniquement',1500,'XOF',true);
 insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values('${variant}','${product}','ADMIN-S',1500,3,true,'S','Vert');`);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://api.fedapay.com/v1/transactions' && init?.method === 'POST') { creates++; const body = JSON.parse(String(init.body)); provider = { ...body, id: 42, status: 'pending', account_id: 101915 }; return Response.json({ 'v1/transaction': provider }); }
    if (url === 'https://api.fedapay.com/v1/transactions/42') return Response.json({ 'v1/transaction': provider });
    if (url === 'https://api.fedapay.com/v1/transactions/42/token') return Response.json({ token: 'fixture', url: 'https://checkout.fedapay.com/fixture' });
    if (url === 'https://api.resend.com/emails') { mails++; return Response.json({ id: `fixture-${mails}` }); }
    throw new Error('Unexpected external request');
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('configures a staff-only production Live test and fails closed otherwise', () => {
  expect(paymentConfiguration(production)).toMatchObject({ environment: 'live', adminTest: true, staffOnly: true, adminTestAmount: 2000, liveTest: false });
  expect(paymentConfiguration({ ...production, FEDAPAY_LIVE_APPROVED: 'true' })).toMatchObject({ adminTest: false, staffOnly: false });
  for (const override of [{ PAYMENT_ADMIN_TEST_ENABLED: 'false' }, { CONTEXT: 'deploy-preview' }, { FEDAPAY_ACCOUNT_ID: '999' }, { PAYMENT_ADMIN_TEST_AMOUNT_XOF: '' }, { PAYMENT_ADMIN_TEST_AMOUNT_XOF: '0' }, { PAYMENT_ADMIN_TEST_AMOUNT_XOF: '200001' }, { PAYMENT_LIVE_TEST_ENABLED: 'true' }])
    expect(() => paymentConfiguration({ ...production, ...override })).toThrow();
  expect(checkoutConfiguration(production).adminTest).toBe(true);
  for (const expires of ['', 'nonsense', new Date(Date.now() - 1000).toISOString(), new Date(Date.now() + 73 * 3600_000).toISOString()])
    expect(() => checkoutConfiguration({ ...production, PAYMENT_ADMIN_TEST_EXPIRES_AT: expires })).toThrow();
  // Expiry stops new admissions only: webhooks and reconciliation still run.
  expect(paymentConfiguration({ ...production, PAYMENT_ADMIN_TEST_EXPIRES_AT: '' }).adminTest).toBe(true);
});

it('refuses non-admin visitors without reserving stock or calling FedaPay', async () => {
  fixture.admin = false;
  const { basket, token } = await priced();
  expect((await checkout(request('/api/payments/checkout', { ...basket, quoteToken: token }))).status).toBe(403);
  expect(creates).toBe(0);
  expect((await db.query<Record<string, unknown>>('select count(*)::int n from orders')).rows[0].n).toBe(0);
});

it('refuses any total other than the owner-approved amount', async () => {
  vi.stubEnv('PAYMENT_ADMIN_TEST_AMOUNT_XOF', '1999');
  const { basket, token } = await priced();
  expect((await checkout(request('/api/payments/checkout', { ...basket, quoteToken: token }))).status).toBe(403);
  expect(creates).toBe(0);
  expect((await db.query<Record<string, unknown>>('select count(*)::int n from orders')).rows[0].n).toBe(0);
});

it('runs one admin Live payment end to end and blocks a second debit', async () => {
  const { basket, token, amount } = await priced();
  expect(amount).toBe(2000);
  const first = await checkout(request('/api/payments/checkout', { ...basket, quoteToken: token }));
  expect(first.status).toBe(200);
  expect((await first.json()).url).toBe('https://checkout.fedapay.com/fixture');
  expect(creates).toBe(1);
  expect(provider.amount).toBe(2000);
  // Same request resumes the same payment; a different basket cannot open a second one.
  expect((await checkout(request('/api/payments/checkout', { ...basket, quoteToken: token }))).status).toBe(200);
  expect(creates).toBe(1);
  const other = await priced();
  expect((await checkout(request('/api/payments/checkout', { ...other.basket, quoteToken: other.token }))).status).toBe(409);
  expect(creates).toBe(1);
  provider.status = 'approved';
  expect((await signedEvent()).status).toBe(200);
  expect((await signedEvent()).status).toBe(200);
  expect((await db.query<Record<string, unknown>>("select status from payment_attempts")).rows.map(r => r.status)).toEqual(['paid']);
  expect((await db.query<Record<string, unknown>>("select count(*)::int n from inventory_movements where kind='commit'")).rows[0].n).toBe(1);
  expect((await db.query<Record<string, unknown>>('select stock_quantity from product_variants')).rows[0].stock_quantity).toBe(2);
  expect(await processNotificationJobs(3)).toBe(2);
  expect(await processNotificationJobs(2)).toBe(0);
  expect(mails).toBe(2);
});
