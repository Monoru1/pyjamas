import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { commerceDatabase, sqlClient } from './test-support/commerce-db';
vi.mock('server-only', () => ({}));
const fixture = vi.hoisted(() => ({ client: {} as ReturnType<typeof sqlClient> }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fixture.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({data:{user:{id:'staff-fixture'}}}) }, rpc: async () => ({data:true}) }) }));
import { POST as quote } from '@/app/api/payments/quote/route';
import { POST as checkout } from '@/app/api/payments/checkout/route';
import { POST as webhook } from '@/app/api/payments/webhook/route';
import { GET as status } from '@/app/api/payments/status/route';
import { processNotificationJobs } from './notifications';

let db: Awaited<ReturnType<typeof commerceDatabase>>;
const product='22222222-2222-4222-8222-222222222222';
const variant='11111111-1111-4111-8111-111111111111';
const origin='https://pyjamas25.netlify.app';
let provider: Record<string, unknown>;
let creates=0;
let mails=0;
const request=(path:string,body:unknown)=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
const input=()=>({idempotencyKey:randomUUID(),customer:{emailConfirmation:true,name:'Fixture uniquement',phone:'+229 01 00 00 00 00',email:'fixture@example.test',address:'Adresse de recette fictive',city:'Cotonou'},lines:[{variantId:variant,quantity:1}]});
async function signedEvent(id=100, name='transaction.approved') {
 const raw=JSON.stringify({id,name,entity:{id:42}});
 const t=Math.floor(Date.now()/1000);
 const signature=createHmac('sha256','wh_fixture').update(`${t}.${raw}`).digest('hex');
 return webhook(new Request(origin+'/api/payments/webhook',{method:'POST',headers:{'content-type':'application/json','x-fedapay-signature':`t=${t},s=${signature}`},body:raw}));
}
beforeAll(async()=>{db=await commerceDatabase();fixture.client=sqlClient(db);},60000);
afterAll(async()=>{await db.close();});
beforeEach(async()=>{vi.stubEnv('ORDER_NOTIFICATIONS_ENABLED','true');vi.stubEnv('ORDER_TEST_EMAILS','customer@example.test,fixture@example.test,admin@example.test,b');
 creates=0;mails=0;provider={};
 for(const [key,value] of Object.entries({FEDAPAY_ENABLED:'true',PAYMENT_CHECKOUT_ENABLED:'true',FEDAPAY_ENVIRONMENT:'sandbox',FEDAPAY_SECRET_KEY:'sk_sandbox_fixture',FEDAPAY_WEBHOOK_SECRET:'wh_fixture',FEDAPAY_ACCOUNT_ID:'42',SUPABASE_SERVICE_ROLE_KEY:'fixture',NEXT_PUBLIC_SUPABASE_URL:'https://isolated.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture',PAYMENT_DATABASE_ISOLATED:'true',PAYMENT_SITE_URL:origin,SITE_ORIGIN:origin,PAYMENT_RECONCILE_SECRET:'fixture-signing-secret-at-least-32-characters',PAYMENT_SHIPPING_XOF:'500',RESEND_API_KEY:'fixture',ORDER_EMAIL_FROM:'fixture@example.test',ORDER_ADMIN_EMAIL:'admin@example.test'}))vi.stubEnv(key,value);
 await db.exec(`truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products,event_request_limits cascade;
 insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA') on conflict do nothing;
 insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('${product}','flow-fixture','Fixture uniquement',1500,'XOF',true);
 insert into product_variants(id,product_id,sku,price,stock_quantity,is_active,size_label,color_name_fr) values('${variant}','${product}','FLOW-S',1500,1,true,'S','Vert');`);
 // Every external request is intercepted; an unexpected destination FAILS the test.
 vi.stubGlobal('fetch',vi.fn(async(url: string,init?:RequestInit)=>{
  if(url==='https://sandbox-api.fedapay.com/v1/transactions'&&init?.method==='POST') {creates++;const body=JSON.parse(String(init.body));provider={...body,id:42,status:'pending',account_id:42};return Response.json({'v1/transaction':provider});}
  if(url==='https://sandbox-api.fedapay.com/v1/transactions/42')return Response.json({'v1/transaction':provider});
  if(url==='https://sandbox-api.fedapay.com/v1/transactions/42/token')return Response.json({token:'fixture',url:'https://sandbox-checkout.fedapay.com/fixture'});
  if(url==='https://api.resend.com/emails'){mails++;return Response.json({id:`fixture-${mails}`});}
  throw new Error('Unexpected external request');
 }));
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('runs quote → reservation → provider double → signed webhook → confirmation → notification with real release SQL',async()=>{
 const basket=input();
 const priced=await quote(request('/api/payments/quote',{lines:basket.lines}));expect(priced.status).toBe(200);const q=await priced.json();expect(q.quote.amount_xof).toBe(2000);
 const first=await checkout(request('/api/payments/checkout',{...basket,quoteToken:q.quoteToken}));expect(first.status).toBe(200);const payment=await first.json();
 expect(creates).toBe(1);expect((await db.query<Record<string,unknown>>('select stock_quantity from product_variants')).rows[0].stock_quantity).toBe(0);
 const retry=await checkout(request('/api/payments/checkout',{...basket,quoteToken:q.quoteToken}));expect(retry.status).toBe(200);expect(creates).toBe(1);
 expect((await db.query<Record<string,unknown>>('select count(*)::int n from orders')).rows[0].n).toBe(1);
 provider.status='approved';expect((await signedEvent()).status).toBe(200);expect((await signedEvent()).status).toBe(200);
 const confirmed=await status(new Request(origin+`/api/payments/status?reference=${payment.reference}&status=approved`));expect((await confirmed.json()).status).toBe('paid');
 expect((await db.query<Record<string,unknown>>("select count(*)::int n from inventory_movements where kind='commit'")).rows[0].n).toBe(1);
 expect(await processNotificationJobs(3)).toBe(3);expect(await processNotificationJobs(2)).toBe(0);expect(mails).toBe(3);
 expect((await db.query<Record<string,unknown>>("select count(*)::int n from notification_jobs where status='sent'")).rows[0].n).toBe(3);
});
it('rejects a provider amount mismatch without confirming or notifying',async()=>{
 const basket=input();const q=await (await quote(request('/api/payments/quote',{lines:basket.lines}))).json();
 expect((await checkout(request('/api/payments/checkout',{...basket,quoteToken:q.quoteToken}))).status).toBe(200);
 provider.status='approved';provider.amount=1;expect((await signedEvent()).status).toBe(503);
 expect((await db.query<Record<string,unknown>>('select payment_state from orders')).rows[0].payment_state).toBe('pending_payment');
 expect(await processNotificationJobs(2)).toBe(1);expect(mails).toBe(1);
});
it('never enqueues a customer email based on historical WhatsApp consent', async () => {
 const base = input();
 const basket = { ...base, customer: { ...base.customer, emailConfirmation: undefined, whatsappUpdates: true } };
 const q = await (await quote(request('/api/payments/quote', { lines: basket.lines }))).json();
 expect((await checkout(request('/api/payments/checkout', { ...basket, quoteToken: q.quoteToken }))).status).toBe(200);
 provider.status = 'approved';
 expect((await signedEvent()).status).toBe(200);
 expect((await db.query("select kind from notification_jobs where kind = 'customer_email' or kind like '%whatsapp%'")).rows).toEqual([]);
});

it('queues one staff alert and each consented lifecycle event through the guarded staff workflow', async () => {
 const base = input();
 const basket = { ...base, customer: { ...base.customer, emailConfirmation: true } };
 const q = await (await quote(request('/api/payments/quote', { lines: basket.lines }))).json();
 const result = await checkout(request('/api/payments/checkout', { ...basket, quoteToken: q.quoteToken }));
 expect(result.status).toBe(200);
 const payment = await result.json();
 const beforeWebhook = await status(new Request(origin + `/api/payments/status?reference=${payment.reference}&status=approved`));
 expect((await beforeWebhook.json()).status).toBe('pending');

 provider.status = 'declined';
 expect((await signedEvent(201, 'transaction.declined')).status).toBe(200);
 expect((await signedEvent(201, 'transaction.declined')).status).toBe(200);
 provider.status = 'approved';
 expect((await signedEvent(202)).status).toBe(200);

 const staff = randomUUID();
 await db.query('insert into auth.users(id) values ($1)', [staff]);
 await db.query("insert into profiles(id, role, full_name) values ($1, 'admin', 'Staff fixture')", [staff]);
 const order = (await db.query<{ id: string }>('select id from orders')).rows[0].id;
 await db.transaction(async (tx) => {
   await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [staff]);
   await tx.exec('set local role authenticated');
   for (const [from, to] of [['pending', 'confirmed'], ['confirmed', 'preparing'], ['preparing', 'ready'], ['ready', 'delivered']]) {
     await tx.query('select admin_transition_order($1, $2, $3)', [order, from, to]);
   }
 });
 const kinds = (await db.query<{ kind: string }>('select kind from notification_jobs order by kind')).rows.map(row => row.kind);
 expect(kinds).toEqual([
   'admin_email', 'customer_email', 'staff_email_delivered', 'staff_email_failed', 'staff_email_new', 'staff_email_ready',
   'staff_telegram_delivered', 'staff_telegram_failed', 'staff_telegram_new', 'staff_telegram_paid', 'staff_telegram_ready',
 ]);
});

it('queues a demonstration order without touching payments or inventory', async () => {
 await db.exec(`insert into public.orders(order_number,source,status,currency_code,subtotal,total)
 values ('MDP-DEMO-NOTIFICATIONS','notification_demo','pending','XOF',25000,25000)`);
 const kinds = (await db.query<{ kind: string }>('select kind from notification_jobs order by kind')).rows.map(row => row.kind);
 expect(kinds).toEqual(['staff_email_new', 'staff_telegram_new']);
 expect((await db.query('select claim_staff_notification_job(true,true) as job')).rows).toEqual([{ job:null }]);
 expect((await db.query('select id from payment_attempts')).rows).toEqual([]);
 expect((await db.query('select id from inventory_movements')).rows).toEqual([]);
});
