import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, expect, it } from 'vitest';
const db=new PGlite();
const variant='11111111-1111-4111-8111-111111111111';
const product='22222222-2222-4222-8222-222222222222';
const staff='44444444-4444-4444-8444-444444444444';
let sequence=0;
const key=()=>`33333333-3333-4333-8333-${String(++sequence).padStart(12,'0')}`;
async function order(k=key(),qty=1,phone='00000001',hash='hash'){
 const r=await db.query<{number:string}>('select create_order_request_atomic($1,$2,$3,$4,$5,$6) as number',[k,hash,'Fixture fictive',phone,'',JSON.stringify([{variantId:variant,quantity:qty,unitPrice:1}])]);return r.rows[0].number;
}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function is_admin() returns boolean language sql as $$select auth.uid()='${staff}'::uuid$$;
 create type order_status as enum('pending','confirmed','preparing','ready','delivered','cancelled');
 create table customers(id uuid primary key default gen_random_uuid(),full_name text,phone text,whatsapp_phone text,created_at timestamptz default now());
 create table products(id uuid primary key,name_fr text,is_active boolean,deleted_at timestamptz,currency_code text);
 create table product_variants(id uuid primary key,product_id uuid,sku text,price numeric,stock_quantity int,is_active boolean,color_name_fr text,size_label text);
 create table orders(id uuid primary key default gen_random_uuid(),order_number text unique default gen_random_uuid()::text,customer_id uuid,status order_status,currency_code text,subtotal numeric,discount_total numeric,total numeric,customer_note text,source text,created_at timestamptz default now());
 create table order_items(order_id uuid,product_id uuid,variant_id uuid,sku text,product_name text,color_name text,size_label text,quantity int,unit_price numeric,line_total numeric);
 create table order_status_history(order_id uuid,old_status order_status,new_status order_status,changed_by uuid,note text);
 insert into products values('${product}','Fixture PostgreSQL',true,null,'XOF');
 insert into product_variants values('${variant}','${product}','TEST',1500,5,true,'Vert','M');
 `);
 await db.exec(readFileSync('supabase/migrations/20260715090848_order_request_workflow.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261020142639_atomic_order_requests_and_staff_transitions.sql','utf8'));
},30_000);
afterAll(async()=>{await db.close();});
it('creates a complete request atomically, uses DB prices and makes duplicate keys idempotent',async()=>{
 const k=key();const first=await order(k,2);expect(await order(k,2)).toBe(first);
 expect((await db.query('select total from orders where order_number=$1',[first])).rows[0]).toEqual({total:'3000'});
 expect((await db.query('select count(*)::int as n from order_items')).rows[0]).toEqual({n:1});
 expect((await db.query('select count(*)::int as n from order_status_history')).rows[0]).toEqual({n:1});
 await expect(order(k,2,'00000001','changed')).rejects.toThrow('Idempotency conflict');
});
it('rolls back customer, order and items if an item insert fails',async()=>{
 await db.exec(`create function fail_item() returns trigger language plpgsql as $$begin raise exception 'simulated item failure';end$$;create trigger fail before insert on order_items for each row execute function fail_item();`);
 await expect(order(key(),1,'00000002')).rejects.toThrow('simulated item failure');
 expect((await db.query("select count(*)::int as n from customers where whatsapp_phone='00000002'")).rows[0]).toEqual({n:0});
 expect((await db.query('select count(*)::int as n from orders')).rows[0]).toEqual({n:1});
 await db.exec('drop trigger fail on order_items');
});
it('rejects unavailable stock without creating rows',async()=>{
 await expect(order(key(),6,'00000003')).rejects.toThrow('Stock unavailable');
 expect((await db.query('select count(*)::int as n from orders')).rows[0]).toEqual({n:1});
});
it('serializes staff state transitions, rejects stale form and restores stock once on cancellation',async()=>{
 const existing=(await db.query<{id:string}>('select id from orders limit 1')).rows[0].id;
 await db.exec(`set request.jwt.claim.sub='${staff}';set role authenticated;`);
 await db.query("select admin_transition_order($1,'pending','confirmed')",[existing]);
 await expect(db.query("select admin_transition_order($1,'pending','cancelled')",[existing])).rejects.toThrow('Order changed');
 await db.exec('reset role');
 expect((await db.query('select stock_quantity from product_variants')).rows[0]).toEqual({stock_quantity:3});
 await db.exec('set role authenticated');
 await db.query("select admin_transition_order($1,'confirmed','cancelled')",[existing]);
 await db.query("select admin_transition_order($1,'cancelled','cancelled')",[existing]);
 await expect(db.query("select admin_update_order_status($1,'confirmed')",[existing])).rejects.toThrow('permission denied');
 await db.exec('reset role');
 expect((await db.query('select stock_quantity from product_variants')).rows[0]).toEqual({stock_quantity:5});
});
it('denies unauthenticated request creation and staff transitions',async()=>{
 await db.exec('set role anon');
 await expect(order()).rejects.toThrow('permission denied');
 await expect(db.query("select admin_transition_order(gen_random_uuid(),'pending','confirmed')")).rejects.toThrow('permission denied');
 await db.exec('reset role');
});
