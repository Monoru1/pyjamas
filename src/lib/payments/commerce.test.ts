import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';
import { checkoutSchema } from './checkout-input';
const db = new PGlite();
const product='22222222-2222-4222-8222-222222222222';
const product2='22222222-2222-4222-8222-222222222223';
const small='11111111-1111-4111-8111-111111111111';
const large='11111111-1111-4111-8111-111111111112';
const staff='44444444-4444-4444-8444-444444444444';
const customer={name:'Fixture Test',phone:'2290100000000',email:'fixture@example.test',address:'Adresse fictive 123',city:'Cotonou',comment:''};
const basket=(quantity=1)=>[{variantId:small,quantity}];
async function checkout(lines=basket(),key=crypto.randomUUID(),hash='hash') {
  const r=await db.query<{p:Record<string,unknown>}>('select create_shop_payment($1,$2,$3,$4,\'sandbox\',42,500) p',[key,hash,JSON.stringify(customer),JSON.stringify(lines)]);
  return r.rows[0].p;
}
async function attach(p:Record<string,unknown>,provider=42) {await db.query('update payment_attempts set provider_id=$2 where id=$1',[p.id,provider]);}
async function apply(p:Record<string,unknown>,status='paid',event=crypto.randomUUID(),provider=42,amount=p.amount_xof,account=42) {
  return db.query('select apply_shop_payment($1,$2,$3,$4,\'sandbox\',$5,$6)',[p.id,provider,amount,account,status,event]);
}
const stock=async(id=small)=>(await db.query<{stock_quantity:number}>('select stock_quantity from product_variants where id=$1',[id])).rows[0].stock_quantity;
beforeAll(async()=>{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function is_admin() returns boolean language sql as $$select auth.uid()='${staff}'::uuid$$;
   create type order_status as enum('pending','confirmed','preparing','ready','delivered','cancelled');
   create table customers(id uuid primary key default gen_random_uuid(),full_name text,phone text,whatsapp_phone text,email text,city text,country text,created_at timestamptz default now());
   create table products(id uuid primary key,name_fr text,is_active boolean,deleted_at timestamptz,currency_code text);
   create table product_variants(id uuid primary key,product_id uuid,sku text,price numeric,stock_quantity int check(stock_quantity>=0),is_active boolean,color_name_fr text,size_label text);
   create table orders(id uuid primary key default gen_random_uuid(),order_number text unique default gen_random_uuid()::text,customer_id uuid,status order_status,currency_code text,subtotal numeric,discount_total numeric,total numeric,customer_note text,source text,created_at timestamptz default now());
   create table order_items(order_id uuid,product_id uuid,variant_id uuid,sku text,product_name text,color_name text,size_label text,quantity int,unit_price numeric,line_total numeric);
   create table order_status_history(order_id uuid,old_status order_status,new_status order_status,changed_by uuid,note text);
   create table christmas_event_config(event_key text,requests_open boolean);
   create table christmas_event_requests(event_key text,status text,staff_notes text,requested_places int,consent_at timestamptz);
   alter table christmas_event_requests enable row level security;
   create policy "event guests request places" on christmas_event_requests for insert to anon with check(true);
  `);
  await db.exec(readFileSync('supabase/migrations/20260715090848_order_request_workflow.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261020142232_sandbox_payment_acceptance.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261020142639_atomic_order_requests_and_staff_transitions.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261029093122_fedapay_commerce.sql','utf8'));
},30000);
beforeEach(async()=>{
 await db.exec(`reset role;set request.jwt.claim.sub='';truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers,product_variants,products cascade;
 insert into products values('${product}','Produit fixture uniquement',true,null,'XOF'),('${product2}','Autre produit fixture',true,null,'XOF');
 insert into product_variants values('${small}','${product}','TEST-S',1500,3,true,'Vert','S'),('${large}','${product2}','TEST-L',2000,2,true,'Rouge','L');`);
});
afterAll(async()=>{await db.close();});
it('calculates single product from DB, shipping included, snapshots delivery and size',async()=>{
 const p=await checkout();expect(p.amount_xof).toBe(2000);expect(await stock()).toBe(2);
 expect((await db.query('select payment_state,total,delivery from orders')).rows[0]).toMatchObject({payment_state:'pending_payment',total:'2000',delivery:{address:customer.address,shipping_xof:500}});
 expect((await db.query('select size_label,unit_price from order_items')).rows[0]).toEqual({size_label:'S',unit_price:'1500'});
});
it('reserves multiple sizes and products atomically with DB prices',async()=>{
 const p=await checkout([{variantId:small,quantity:2},{variantId:large,quantity:1}]);
 expect(p.amount_xof).toBe(5500);expect(await stock()).toBe(1);expect(await stock(large)).toBe(1);
});
it('rejects exhausted product and rolls back ALL changes for a failing multi-line basket',async()=>{
 await db.query('update product_variants set stock_quantity=0 where id=$1',[large]);
 await expect(checkout([{variantId:small,quantity:1},{variantId:large,quantity:1}])).rejects.toThrow('Stock unavailable');
 expect(await stock()).toBe(3);expect((await db.query('select count(*)::int n from orders')).rows[0]).toEqual({n:0});
});
it('refresh and duplicate checkout preserve one reservation; changed basket conflicts',async()=>{
 const key=crypto.randomUUID();const p=await checkout(basket(),key);const same=await checkout(basket(),key);
 expect(same.id).toBe(p.id);expect(same.creator).toBe(false);expect(await stock()).toBe(2);
 await expect(checkout(basket(2),key,'changed')).rejects.toThrow('Idempotency conflict');
});
it('aggregates repeated variants and rejects overselling',async()=>{
 await expect(checkout([{variantId:small,quantity:2},{variantId:small,quantity:2}])).rejects.toThrow('Stock unavailable');
 expect(await stock()).toBe(3);
});
it('confirms once, enqueues two notifications, ignores duplicate and stale pending',async()=>{
 const p=await checkout();await attach(p);await apply(p,'paid','evt');await apply(p,'paid','evt');await apply(p,'pending','stale');
 expect(await stock()).toBe(2);
 expect((await db.query('select payment_state from orders')).rows[0]).toEqual({payment_state:'paid'});
 expect((await db.query('select count(*)::int n from notification_jobs')).rows[0]).toEqual({n:2});
 expect((await db.query("select count(*)::int n from inventory_movements where kind='commit'")).rows[0]).toEqual({n:1});
});
it('declined and canceled remain retryable, retain stock, and can later become paid',async()=>{
 const p=await checkout();await attach(p);await apply(p,'failed');await apply(p,'cancelled');expect(await stock()).toBe(2);
 expect((await db.query('select count(*)::int n from notification_jobs')).rows[0]).toEqual({n:0});
 await apply(p);expect(await stock()).toBe(2);
});
it('releases expired stock once, even with duplicate events',async()=>{
 const p=await checkout();await attach(p);await apply(p,'expired','one');await apply(p,'expired','two');expect(await stock()).toBe(3);
 expect((await db.query("select count(*)::int n from inventory_movements where kind='release'")).rows[0]).toEqual({n:1});
});
it('late paid after expiry flags stock shortage and blocks fulfillment',async()=>{
 const p=await checkout();await attach(p);await apply(p,'expired');await db.query('update product_variants set stock_quantity=0 where id=$1',[small]);
 await apply(p);expect(await stock()).toBe(0);
 expect((await db.query('select payment_state,needs_attention from orders')).rows[0]).toEqual({payment_state:'paid',needs_attention:true});
});
it('rejects wrong provider, amount and merchant before any order mutation',async()=>{
 const p=await checkout();await attach(p);
 await expect(apply(p,'paid',crypto.randomUUID(),43)).rejects.toThrow('Payment mismatch');
 await expect(apply(p,'paid',crypto.randomUUID(),42,1)).rejects.toThrow('Payment mismatch');
 await expect(apply(p,'paid',crypto.randomUUID(),42,p.amount_xof,43)).rejects.toThrow('Payment mismatch');
 expect((await db.query('select payment_state from orders')).rows[0]).toEqual({payment_state:'pending_payment'});
});
it('fulfillment requires provider payment and never decrements reserved stock twice',async()=>{
 const p=await checkout();await attach(p);
 await db.exec(`set request.jwt.claim.sub='${staff}';set role authenticated;`);
 await expect(db.query("select admin_transition_order($1,'pending','confirmed')",[p.order_id])).rejects.toThrow('Provider-confirmed');
 await db.exec('reset role');await apply(p);
 await db.exec('set role authenticated');await db.query("select admin_transition_order($1,'pending','confirmed')",[p.order_id]);await db.exec('reset role');expect(await stock()).toBe(2);
});
it('denies public and ordinary-user payment/stock mutations',async()=>{
 const p=await checkout();
 for(const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await expect(checkout()).rejects.toThrow('permission denied');
  await expect(db.query('update orders set payment_state=\'paid\' where id=$1',[p.order_id])).rejects.toThrow('permission denied');
  await expect(db.query('select * from notification_jobs')).rejects.toThrow('permission denied');
  await expect(db.query('update product_variants set stock_quantity=10')).rejects.toThrow('permission denied');
  await db.exec('reset role');
 }
});
it('notification lease can be recovered after a worker crash',async()=>{
 const p=await checkout();await attach(p);await apply(p);
 const claim=async()=>(await db.query<{j:Record<string,unknown>}>('select claim_notification_job() j')).rows[0].j;
 const a=await claim();const b=await claim();expect(a.id).not.toBe(b.id);expect(await claim()).toBeNull();
 await db.query("update notification_jobs set lease_until=now()-interval '1 minute' where id=$1",[a.id]);
 const retry=await claim();expect(retry.id).toBe(a.id);expect(retry.lease_token).not.toBe(a.lease_token);expect(retry.attempts).toBe(2);
});
it('strict input rejects a client amount, invalid size id, quantity and delivery',()=>{
 const input={idempotencyKey:crypto.randomUUID(),customer,lines:basket()};expect(checkoutSchema.safeParse(input).success).toBe(true);
 for(const bad of [{...input,amount:1},{...input,customer:{...customer,address:''}},{...input,lines:[{variantId:small,quantity:0}]},{...input,lines:[{variantId:'S',quantity:1}]}]) expect(checkoutSchema.safeParse(bad).success).toBe(false);
});
