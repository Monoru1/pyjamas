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
import { GET as status } from '@/app/api/payments/status/route';
import { checkoutConfiguration, existingPaymentsConfiguration, paymentConfiguration } from './fedapay';
import { processNotificationJobs } from './notifications';
import { orderWhatsAppUrl } from '@/lib/orders/whatsapp';
import { storeIdentity } from '@/lib/legal/store-identity';

// Terrain 14: tracking and reconciliation of EXISTING orders do not depend on new-sales admission.
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const origin = 'https://pyjamas25.netlify.app';
const product = '22222222-2222-4222-8222-222222222222';
const variant = '11111111-1111-4111-8111-111111111111';
let provider: Record<string, unknown>;
let creates = 0;
let mails: Record<string, unknown>[] = [];
const open = {
  CONTEXT: 'production', FEDAPAY_ENABLED: 'true', PAYMENT_CHECKOUT_ENABLED: 'true', FEDAPAY_ENVIRONMENT: 'live', FEDAPAY_LIVE_APPROVED: 'true',
  FEDAPAY_SECRET_KEY: 'sk_live_fixture', FEDAPAY_WEBHOOK_SECRET: 'wh_fixture', FEDAPAY_ACCOUNT_ID: '101915', PAYMENT_LIVE_TEST_ENABLED: 'false', PAYMENT_ADMIN_TEST_ENABLED: 'false',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://pukvrerdloudfiphomsj.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture',
  PAYMENT_DATABASE_ISOLATED: 'false', PAYMENT_SITE_URL: origin, SITE_ORIGIN: origin, PAYMENT_SHIPPING_XOF: '0', RESEND_API_KEY: 'fixture',
  ORDER_EMAIL_FROM: 'notifications@example.test', ORDER_ADMIN_EMAIL: 'shop@example.test', ORDER_NOTIFICATIONS_ENABLED: 'true',
  PAYMENT_RECONCILE_SECRET: 'fixture-signing-secret-at-least-32-characters',
};
// Production state of 19 November: new sales suspended, payments service still configured.
const closed = { ...open, FEDAPAY_LIVE_APPROVED: 'false', PAYMENT_CHECKOUT_ENABLED: 'false' };
const setEnv = (values: Record<string, string>) => { for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value); };
const request = (path: string, body: unknown) => new Request(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const track = async (reference: string) => { const response = await status(new Request(`${origin}/api/payments/status?reference=${reference}`)); return { code: response.status, body: await response.json() }; };
async function approved() {
  const raw = JSON.stringify({ name: 'transaction.approved', object: 'transaction', entity: { id: 42, updated_at: '2026-11-19T12:22:46.561Z' } });
  const t = Math.floor(Date.now() / 1000);
  return webhook(new Request(origin + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fedapay-signature': `t=${t},s=${createHmac('sha256', 'wh_fixture').update(`${t}.${raw}`).digest('hex')}` }, body: raw }));
}
async function order() {
  const lines = [{ variantId: variant, quantity: 1 }];
  const priced = await (await quote(request('/api/payments/quote', { lines }))).json();
  const response = await checkout(request('/api/payments/checkout', { idempotencyKey: randomUUID(), quoteToken: priced.quoteToken, customer: { emailConfirmation: true, name: 'Cliente Fixture', phone: '+229 01 00 00 00 02', email: 'cliente@example.test', address: 'Adresse de test fictive', city: 'Cotonou' }, lines }));
  expect(response.status).toBe(200);
  return (await db.query<{ public_token: string; order_number: string }>('select p.public_token, o.order_number from payment_attempts p join orders o on o.id = p.order_id')).rows[0];
}

beforeAll(async () => { db = await commerceDatabase(); fixture.client = sqlClient(db); }, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  creates = 0; mails = []; provider = {};
  setEnv(open);
  await db.exec(`truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products,event_request_limits,order_request_limits cascade;
 insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
 insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('${product}','suivi-fixture','Pyjama fixture',10000,'XOF',true);
 insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values('${variant}','${product}','S-36',10000,5,true,'3-6 mois','Rouge');`);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://api.fedapay.com/v1/transactions' && init?.method === 'POST') { creates++; provider = { ...JSON.parse(String(init.body)), id: 42, status: 'pending', account_id: 101915 }; return Response.json({ 'v1/transaction': provider }); }
    if (url === 'https://api.fedapay.com/v1/transactions/42') return Response.json({ 'v1/transaction': provider });
    if (url === 'https://api.fedapay.com/v1/transactions/42/token') return Response.json({ token: 'fixture', url: 'https://process.fedapay.com/fixture' });
    if (url === 'https://api.resend.com/emails') { mails.push(JSON.parse(String(init?.body))); return Response.json({ id: `fixture-${mails.length}` }); }
    throw new Error('Unexpected external request');
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('separates new-sales admission from existing payments', () => {
  expect(() => checkoutConfiguration(closed)).toThrow();
  expect(() => paymentConfiguration(closed)).toThrow();
  expect(existingPaymentsConfiguration(closed)).toMatchObject({ environment: 'live', staffOnly: false });
  // Outside production, Live stays refused; a deliberate full stop still stops everything.
  for (const override of [{ CONTEXT: 'deploy-preview' }, { FEDAPAY_ENABLED: 'false' }, { FEDAPAY_SECRET_KEY: '' }]) expect(() => existingPaymentsConfiguration({ ...closed, ...override })).toThrow();
});

it('tracks paid orders (delivered, in preparation) while the checkout is closed', async () => {
  const { public_token: reference } = await order();
  provider.status = 'approved';
  expect((await approved()).status).toBe(200);
  setEnv(closed);
  await db.exec(`update orders set status='delivered'`);
  expect(await track(reference)).toMatchObject({ code: 200, body: { status: 'paid', order: { status: 'delivered' } } });
  await db.exec(`update orders set status='preparing'`);
  expect(await track(reference)).toMatchObject({ code: 200, body: { status: 'paid', order: { status: 'preparing' } } });
  // No new sale is possible meanwhile.
  expect((await checkout(request('/api/payments/checkout', {}))).status).toBe(503);
});

it('never presents an unpaid order as confirmed and hides its logistics', async () => {
  const { public_token: reference } = await order();
  setEnv(closed);
  const { code, body } = await track(reference);
  expect(code).toBe(200);
  expect(body.status).toBe('pending');
  expect(body.order.status).toBeUndefined();
});

it('reconciles an already created payment from a signed webhook after the checkout closed', async () => {
  const { public_token: reference } = await order();
  setEnv(closed);
  provider.status = 'approved';
  expect((await approved()).status).toBe(200);
  expect((await track(reference)).body.status).toBe('paid');
  expect(creates).toBe(1);
  expect((await db.query<Record<string, unknown>>("select count(*)::int n from inventory_movements where kind='commit'")).rows[0].n).toBe(1);
});

it('refuses unknown or malformed tracking links and never accepts an order number', async () => {
  const { order_number: orderNumber } = await order();
  setEnv(closed);
  expect((await track(randomUUID())).code).toBe(404);
  expect((await track('not-a-reference')).code).toBe(400);
  expect((await track(encodeURIComponent(orderNumber))).code).toBe(400);
});

it('adds an order-scoped WhatsApp button to the paid customer email only', async () => {
  const { order_number: orderNumber } = await order();
  provider.status = 'approved';
  await approved();
  expect(await processNotificationJobs(5)).toBe(2);
  const customer = mails.find(mail => mail.to === 'cliente@example.test')!;
  const staff = mails.find(mail => mail.to !== 'cliente@example.test')!;
  const expected = orderWhatsAppUrl(storeIdentity.whatsapp, orderNumber)!;
  expect(expected.startsWith('https://wa.me/2290197338843?text=')).toBe(true);
  expect(String(customer.html)).toContain('Contacter la boutique sur WhatsApp');
  expect(String(customer.html)).toContain(expected.replace(/&/g, '&amp;').replace(/'/g, '&#39;'));
  expect(String(customer.text)).toContain(`Contacter la boutique sur WhatsApp · ${expected}`);
  expect(String(customer.text)).toContain('/paiement?reference=');
  expect(String(staff.html)).not.toContain('wa.me');
});

it('builds a WhatsApp link with the reference only, for mobile and desktop', () => {
  const url = orderWhatsAppUrl('+229 01 97 33 88 43', 'MDP-20261119-6E3AC2')!;
  expect(url.startsWith('https://wa.me/2290197338843?text=')).toBe(true);
  expect(decodeURIComponent(url.split('text=')[1])).toBe("Bonjour La Maison des Pyjamas, ma commande MDP-20261119-6E3AC2 est payée. Je souhaite organiser la livraison ou le retrait de ma commande.");
  for (const [phone, ref] of [['', 'MDP-20261119-6E3AC2'], ['12', 'MDP-20261119-6E3AC2'], ['2290197338843', ''], ['2290197338843', 'MDP-X<script>']]) expect(orderWhatsAppUrl(phone, ref)).toBeNull();
});
