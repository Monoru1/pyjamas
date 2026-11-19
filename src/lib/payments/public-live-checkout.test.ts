import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { commerceDatabase, sqlClient } from './test-support/commerce-db';
vi.mock('server-only', () => ({}));
const fixture = vi.hoisted(() => ({ client: {} as ReturnType<typeof sqlClient> }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fixture.client }));
// A real customer: no session and no staff role.
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, rpc: async () => ({ data: false }) }) }));
import { POST as quote } from '@/app/api/payments/quote/route';
import { POST as checkout } from '@/app/api/payments/checkout/route';
import { POST as webhook } from '@/app/api/payments/webhook/route';
import { POST as contact } from '@/app/api/orders/contact/route';
import { processNotificationJobs, staffRecipients } from './notifications';

// Public Live opening (FEDAPAY_LIVE_APPROVED=true): one basket = one order = one payment.
let db: Awaited<ReturnType<typeof commerceDatabase>>;
const origin = 'https://pyjamas25.netlify.app';
const product = { a: '22222222-2222-4222-8222-0000000000a1', b: '22222222-2222-4222-8222-0000000000b1', c: '22222222-2222-4222-8222-0000000000c1' };
const variant = { a: '11111111-1111-4111-8111-0000000000a1', b: '11111111-1111-4111-8111-0000000000b1', c: '11111111-1111-4111-8111-0000000000c1', c2: '11111111-1111-4111-8111-0000000000c2' };
let provider: Record<string, unknown>;
let creates = 0;
let mails: Record<string, unknown>[] = [];
let mailKeys: string[] = [];
const publicLive = {
  CONTEXT: 'production', FEDAPAY_ENABLED: 'true', PAYMENT_CHECKOUT_ENABLED: 'true', FEDAPAY_ENVIRONMENT: 'live', FEDAPAY_LIVE_APPROVED: 'true',
  FEDAPAY_SECRET_KEY: 'sk_live_fixture', FEDAPAY_WEBHOOK_SECRET: 'wh_fixture', FEDAPAY_ACCOUNT_ID: '101915', PAYMENT_LIVE_TEST_ENABLED: 'false', PAYMENT_ADMIN_TEST_ENABLED: 'false',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://pukvrerdloudfiphomsj.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture',
  PAYMENT_DATABASE_ISOLATED: 'false', PAYMENT_SITE_URL: origin, SITE_ORIGIN: origin, PAYMENT_SHIPPING_XOF: '0', RESEND_API_KEY: 'fixture',
  ORDER_EMAIL_FROM: 'La Maison des Pyjamas <notifications@example.test>', ORDER_ADMIN_EMAIL: 'lamaisondespyjamas@example.test, owner@example.test, owner@example.test',
  ORDER_NOTIFICATIONS_ENABLED: 'true', PAYMENT_RECONCILE_SECRET: 'fixture-signing-secret-at-least-32-characters',
};
const request = (path: string, body: unknown) => new Request(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
// Article A 10 000 × 2, article B 20 000 × 1, article C 25 000 × 3 (two sizes) = 115 000 FCFA.
const lines = [{ variantId: variant.a, quantity: 2 }, { variantId: variant.b, quantity: 1 }, { variantId: variant.c, quantity: 2 }, { variantId: variant.c2, quantity: 1 }];
const basket = () => ({ idempotencyKey: randomUUID(), customer: { emailConfirmation: true as const, name: 'Cliente Fixture', phone: '+229 01 00 00 00 01', email: 'cliente@example.test', address: 'Adresse de test fictive', city: 'Cotonou' }, lines });
async function signedApproved() {
  const raw = JSON.stringify({ name: 'transaction.approved', object: 'transaction', entity: { id: 42, updated_at: '2026-11-19T12:22:46.561Z' } });
  const t = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', 'wh_fixture').update(`${t}.${raw}`).digest('hex');
  return webhook(new Request(origin + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fedapay-signature': `t=${t},s=${signature}` }, body: raw }));
}
const stock = async () => Object.fromEntries((await db.query<{ id: string; stock_quantity: number }>('select id, stock_quantity from product_variants order by id')).rows.map(row => [row.id, row.stock_quantity]));

beforeAll(async () => { db = await commerceDatabase(); fixture.client = sqlClient(db); }, 60000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  creates = 0; mails = []; mailKeys = []; provider = {};
  for (const [key, value] of Object.entries(publicLive)) vi.stubEnv(key, value);
  await db.exec(`truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products,event_request_limits,order_request_limits cascade;
 insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
 insert into products(id,slug,name_fr,base_price,currency_code,is_active) values
  ('${product.a}','bebe-fixture','Pyjama bébé fixture',10000,'XOF',true),('${product.b}','festif-fixture','Pyjama festif fixture',20000,'XOF',true),('${product.c}','rouge-fixture','Pyjama rouge fixture',25000,'XOF',true);
 insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values
  ('${variant.a}','${product.a}','A-36',10000,10,true,'3-6 mois','Rouge'),('${variant.b}','${product.b}','B-M',20000,10,true,'M','Festif'),
  ('${variant.c}','${product.c}','C-S',25000,10,true,'S','Rouge'),('${variant.c2}','${product.c}','C-L',25000,10,true,'L','Rouge');`);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://api.fedapay.com/v1/transactions' && init?.method === 'POST') { creates++; const body = JSON.parse(String(init.body)); provider = { ...body, id: 42, status: 'pending', account_id: 101915 }; return Response.json({ 'v1/transaction': provider }); }
    if (url === 'https://api.fedapay.com/v1/transactions/42') return Response.json({ 'v1/transaction': provider });
    if (url === 'https://api.fedapay.com/v1/transactions/42/token') return Response.json({ token: 'fixture', url: 'https://process.fedapay.com/fixture' });
    if (url === 'https://api.resend.com/emails') { mails.push(JSON.parse(String(init?.body))); mailKeys.push(String((init?.headers as Record<string, string>)['Idempotency-Key'])); return Response.json({ id: `fixture-${mails.length}` }); }
    throw new Error('Unexpected external request');
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('parses staff recipients without duplicates or invalid entries', () => {
  expect(staffRecipients('lamaisondespyjamas@gmail.com, sakryad@gmail.com')).toEqual(['lamaisondespyjamas@gmail.com', 'sakryad@gmail.com']);
  expect(staffRecipients(' a@example.test ,A@example.test,not-an-email,, ')).toEqual(['a@example.test']);
  expect(staffRecipients('')).toEqual([]);
});

it('charges a multi-article basket once: one order, one FedaPay transaction, every line and variant', async () => {
  const input = basket();
  const priced = await (await quote(request('/api/payments/quote', { lines }))).json();
  expect(priced.quote.amount_xof).toBe(115000);
  const first = await checkout(request('/api/payments/checkout', { ...input, quoteToken: priced.quoteToken }));
  expect(first.status).toBe(200);
  expect((await first.json()).url).toBe('https://process.fedapay.com/fixture');
  expect(creates).toBe(1);
  expect(provider.amount).toBe(115000);
  expect((await db.query<Record<string, unknown>>('select count(*)::int n from orders')).rows[0].n).toBe(1);
  expect((await db.query<Record<string, unknown>>('select count(*)::int n, sum(line_total)::int total from order_items')).rows[0]).toEqual({ n: 4, total: 115000 });
  expect(await stock()).toEqual({ [variant.a]: 8, [variant.b]: 9, [variant.c]: 8, [variant.c2]: 9 });
  // Notifications only after a provider-confirmed payment.
  expect(await processNotificationJobs(5)).toBe(0);

  provider.status = 'approved';
  expect((await signedApproved()).status).toBe(200);
  expect((await signedApproved()).status).toBe(200);
  expect((await db.query<Record<string, unknown>>("select count(*)::int n from inventory_movements where kind='commit'")).rows[0].n).toBe(4);
  expect(await stock()).toEqual({ [variant.a]: 8, [variant.b]: 9, [variant.c]: 8, [variant.c2]: 9 });

  expect(await processNotificationJobs(5)).toBe(2);
  expect(await processNotificationJobs(5)).toBe(0);
  expect(mails).toHaveLength(2);
  const staff = mails.find(mail => Array.isArray(mail.to))!;
  const customer = mails.find(mail => mail.to === 'cliente@example.test')!;
  expect(staff.to).toEqual(['lamaisondespyjamas@example.test', 'owner@example.test']);
  for (const mail of [staff, customer]) {
    for (const text of ['2 × Pyjama bébé fixture', '1 × Pyjama festif fixture', '2 × Pyjama rouge fixture (Rouge, S)', '1 × Pyjama rouge fixture (Rouge, L)', '115 000 FCFA']) expect(String(mail.text).replace(/ /g, ' ')).toContain(text);
  }
  expect(String(customer.text)).toMatch(/Une question sur votre commande \? Contactez-nous · https:\/\/pyjamas25\.netlify\.app\/paiement\?reference=[0-9a-f-]{36}#contact/);
  expect(String(staff.text)).not.toContain('Contactez-nous');
});

it('lets the paying customer contact the shop about that order only, once per message', async () => {
  const input = basket();
  const priced = await (await quote(request('/api/payments/quote', { lines }))).json();
  expect((await checkout(request('/api/payments/checkout', { ...input, quoteToken: priced.quoteToken }))).status).toBe(200);
  const { rows: [{ public_token: reference }] } = await db.query<{ public_token: string }>('select public_token from payment_attempts');
  const requestId = randomUUID();
  // Unpaid order: no message.
  expect((await contact(request('/api/orders/contact', { reference, requestId, message: 'Bonjour, une question.' }))).status).toBe(404);
  provider.status = 'approved';
  expect((await signedApproved()).status).toBe(200);
  mails = []; mailKeys = [];
  // Guessing: a random reference opens nothing.
  expect((await contact(request('/api/orders/contact', { reference: randomUUID(), requestId, message: 'Bonjour, une question.' }))).status).toBe(404);
  expect((await contact(request('/api/orders/contact', { reference, requestId, message: 'ok' }))).status).toBe(400);
  const sent = await contact(request('/api/orders/contact', { reference, requestId, message: 'Bonjour, pouvez-vous livrer samedi ?' }));
  expect(sent.status).toBe(200);
  const body = await sent.json();
  expect(body.sent).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(/@/);
  expect(mails).toHaveLength(1);
  const order = (await db.query<{ order_number: string }>('select order_number from orders')).rows[0].order_number;
  expect(mails[0]).toMatchObject({ to: ['lamaisondespyjamas@example.test', 'owner@example.test'], reply_to: 'cliente@example.test', subject: `Question concernant la commande ${order}` });
  expect(String(mails[0].text)).toContain('Bonjour, pouvez-vous livrer samedi ?');
  expect(String(mails[0].text)).toContain('Cliente Fixture');
  expect(mailKeys[0]).toBe(`contact-${requestId}`);
  // Another origin cannot post on behalf of the customer.
  const foreign = new Request(origin + '/api/orders/contact', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ reference, requestId: randomUUID(), message: 'Bonjour, une question.' }) });
  expect((await contact(foreign)).status).toBe(403);
});

it('reports a failed contact send instead of a false confirmation', async () => {
  const input = basket();
  const priced = await (await quote(request('/api/payments/quote', { lines }))).json();
  await checkout(request('/api/payments/checkout', { ...input, quoteToken: priced.quoteToken }));
  provider.status = 'approved';
  await signedApproved();
  const { rows: [{ public_token: reference }] } = await db.query<{ public_token: string }>('select public_token from payment_attempts');
  const base = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (url, init) => url === 'https://api.resend.com/emails' ? new Response('{}', { status: 500 }) : base(url as string, init));
  const failed = await contact(request('/api/orders/contact', { reference, requestId: randomUUID(), message: 'Bonjour, une question.' }));
  expect(failed.status).toBe(503);
  expect((await failed.json()).sent).toBeUndefined();
});
