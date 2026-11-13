/** Dedicated loopback CI database only. Never accepts a recipe/production URL. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const url = new URL(process.env.TEST_DATABASE_URL || 'invalid:');
if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.pathname !== '/mdp_test') throw new Error('Dedicated loopback mdp_test database required');
const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
const product = randomUUID(), variant = randomUUID();
const customer = {name:'Fixture uniquement',phone:'2290100000000',email:'fixture@example.test',address:'Adresse de recette fictive',city:'Cotonou'};
const lines = [{variantId:variant,quantity:1}];
async function reserve(key) {
  const {rows:[{quote}]}=await pool.query('select quote_shop_basket($1,0) quote',[JSON.stringify(lines)]);
  return pool.query("select create_shop_payment($1,'fixture',$2,$3,'sandbox',42,0,$4) payment",[key,JSON.stringify(customer),JSON.stringify(lines),JSON.stringify(quote.items)]);
}
try {
  assert.equal((await pool.query('select count(*)::int n from information_schema.tables where table_schema=\'public\'')).rows[0].n,0,'Database must be fresh, not an existing application');
  await pool.query(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    create schema extensions;create function extensions.unaccent(text) returns text language sql immutable as $$select $1$$;`);
  await pool.query((await readFile('supabase/recette/bootstrap-production-schema.sql','utf8')).replace(/^create extension[^;]+;$/gm,''));
  for(const name of ['20261029093122_fedapay_commerce','20261029105353_live_test_price_quotes','20261029105807_stock_price_admin_guards','20261029111200_payment_events_index','20261103163942_operational_notifications','20261113090005_order_whatsapp_lifecycle','20261113093826_staff_notification_channels','20261113102412_email_only_notifications','20261113150500_order_reconciliation'])await pool.query(await readFile(`supabase/migrations/${name}.sql`,'utf8'));
  await pool.query("insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA')");
  await pool.query("insert into products(id,slug,name_fr,base_price,currency_code,is_active) values($1,'concurrency-fixture','Fixture uniquement',1500,'XOF',true)",[product]);
  await pool.query("insert into product_variants(id,product_id,sku,color_name_fr,size_label,price,stock_quantity,is_active) values($1,$2,'CONCURRENT-S','Vert','S',1500,1,true)",[variant,product]);
  // Real separate connections contend on the same last unit.
  const outcomes=await Promise.allSettled([reserve(randomUUID()),reserve(randomUUID())]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1,'Only one basket can reserve the last unit');
  assert.equal((await pool.query('select stock_quantity from product_variants where id=$1',[variant])).rows[0].stock_quantity,0);
  assert.equal((await pool.query('select count(*)::int n from orders')).rows[0].n,1);
  console.log('PASS real PostgreSQL last-unit concurrency and atomic rollback');
  await pool.query('truncate notification_jobs,inventory_movements,payment_events,payment_attempts,order_items,order_status_history,orders,customers cascade');
  await pool.query('update product_variants set stock_quantity=2 where id=$1',[variant]);
  const key=randomUUID();const duplicate=await Promise.all([reserve(key),reserve(key)]);
  assert.equal(duplicate[0].rows[0].payment.id,duplicate[1].rows[0].payment.id);
  assert.equal((await pool.query('select count(*)::int n from orders')).rows[0].n,1);
  assert.equal((await pool.query('select stock_quantity from product_variants where id=$1',[variant])).rows[0].stock_quantity,1);
  console.log('PASS concurrent idempotency: one order and one reservation');
  const payment=duplicate[0].rows[0].payment;
  await pool.query('update payment_attempts set provider_id=42 where id=$1',[payment.id]);
  const apply=()=>pool.query("select apply_shop_payment($1,42,1500,42,'sandbox','paid','fixture-event')",[payment.id]);
  await Promise.all([apply(),apply()]);
  assert.equal((await pool.query('select count(*)::int n from notification_jobs')).rows[0].n,2);
  assert.equal((await pool.query("select count(*)::int n from inventory_movements where kind='commit'")).rows[0].n,1);
  console.log('PASS concurrent webhook replay: one inventory commit and two unique notification jobs');
} finally { await pool.end(); }
