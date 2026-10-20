import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const variant='11111111-1111-4111-8111-111111111111';
const product='22222222-2222-4222-8222-222222222222';
let count=0;
const key=()=>`33333333-3333-4333-8333-${String(++count).padStart(12,'0')}`;
const lines=(quantity=1)=>JSON.stringify([{variantId:variant,quantity}]);
async function create(k=key(),qty=1,hash='hash') {
 const r=await db.query<{payment:Record<string,unknown>}>('select create_sandbox_payment($1,$2,$3,$4) as payment',[k,hash,JSON.stringify({name:'Test fictif',phone:'00000000'}),lines(qty)]);
 return r.rows[0].payment;
}

beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create function public.is_admin() returns boolean language sql as 'select false';
 create table products(id uuid primary key,name_fr text,is_active boolean,deleted_at timestamptz,currency_code text);
 create table product_variants(id uuid primary key,product_id uuid,sku text,price numeric,stock_quantity int,is_active boolean);
 create table christmas_event_config(event_key text,requests_open boolean);
 create table christmas_event_requests(event_key text,status text,staff_notes text,requested_places int,consent_at timestamptz);
 alter table christmas_event_requests enable row level security;
 create policy "event guests request places" on christmas_event_requests for insert to anon with check(true);
 insert into products values('${product}','Produit fixture SQL',true,null,'XOF');
 insert into product_variants values('${variant}','${product}','TEST-S',1500,3,true);`);
 await db.exec(readFileSync('supabase/migrations/20261020142232_sandbox_payment_acceptance.sql','utf8'));
},30_000);
afterAll(async()=>{await db.close();});

describe('PostgreSQL sandbox payment integrity',()=>{
 it('calculates prices from DB, returns same request, rejects changed request',async()=>{
   const k=key();const first=await create(k); const second=await create(k);
   expect(first.amount_xof).toBe(1500);expect(second.id).toBe(first.id);expect(second.creator).toBe(false);
   await expect(create(k,1,'modified')).rejects.toThrow('Idempotency conflict');
 });
 it('reserves against concurrent sandbox baskets and rolls back a failed checkout',async()=>{
   const first=await create(key(),2);expect(first.amount_xof).toBe(3000);
   const before=(await db.query<{count:number}>('select count(*)::int as count from payment_attempts')).rows[0].count;
   await expect(create()).rejects.toThrow('Insufficient stock');
   const after=(await db.query<{count:number}>('select count(*)::int as count from payment_attempts')).rows[0].count;
   expect(after).toBe(before);
   // Sandbox never decrements real inventory or creates commercial orders.
   expect((await db.query<{stock_quantity:number}>('select stock_quantity from product_variants')).rows[0].stock_quantity).toBe(3);
 });
 it('applies duplicate webhook once and prevents downgrade after payment',async()=>{
   await db.exec("update payment_attempts set expires_at=now()-interval '1 second'");
   const payment=await create();
   await db.query('update payment_attempts set provider_id=42 where id=$1',[payment.id]);
   const apply=(status:string,event:string)=>db.query('select apply_sandbox_payment($1,42,1500,$2,$3)',[payment.id,status,event]);
   await apply('paid','event:1');await apply('paid','event:1');await apply('pending','event:2');
   const state=async()=>(await db.query<{status:string}>('select status from payment_attempts where id=$1',[payment.id])).rows[0].status;
   expect(await state()).toBe('paid');
   expect((await db.query<{count:number}>('select count(*)::int as count from payment_events where payment_id=$1',[payment.id])).rows[0].count).toBe(2);
   await apply('partially_refunded','event:3');await apply('paid','event:4');expect(await state()).toBe('partially_refunded');
   await apply('refunded','event:5');await apply('paid','event:6');expect(await state()).toBe('refunded');
   await expect(db.query('select apply_sandbox_payment($1,42,1,\'paid\',\'tampered\')',[payment.id])).rejects.toThrow('Payment mismatch');
 });
 it('denies public reads and mutation RPC calls',async()=>{
   await db.exec('set role anon');
   await expect(db.query('select * from payment_attempts')).rejects.toThrow('permission denied');
   await expect(create()).rejects.toThrow('permission denied');
   await db.exec('reset role');
 });
 it('enforces closure even for direct Data API insertion',async()=>{
   await db.exec("grant insert on christmas_event_requests to anon; grant select on christmas_event_config to anon; insert into christmas_event_config values('noel-2026',false);set role anon;");
   await expect(db.query("insert into christmas_event_requests values('noel-2026','requested',null,1,now())")).rejects.toThrow('row-level security');
   await db.exec('reset role');
 });
});
