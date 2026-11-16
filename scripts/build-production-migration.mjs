// Prints ONE transaction that applies the ten V1 migrations to production, records them in the
// migration history under the repository versions, and aborts (full rollback) if any commercial
// figure changed. It connects to nothing: review the output, then run it with an authorised role.
//   node scripts/build-production-migration.mjs > /tmp/v1-production.sql
// Existing order lines keep NO photo by default: order_reconciliation would fill them with today's
// catalogue photo, which is not the photo sold at the time. Pass --keep-historical-photos only
// once the owner has explicitly accepted that effect on existing orders.
import { readFileSync, readdirSync } from 'node:fs';
const versions = ['20261029093122', '20261029105353', '20261029105807', '20261029111200', '20261103163942',
  '20261113090005', '20261113093826', '20261113102412', '20261113150500', '20261113154852'];
const files = readdirSync('supabase/migrations');
const tag = '$v1_migration_body$';
const keepPhotos = process.argv.includes('--keep-historical-photos');
const fingerprint = `select
  (select count(*) from public.products) products, (select count(*) from public.product_variants) variants,
  (select count(*) from public.orders) orders, (select count(*) from public.order_items) order_items,
  (select count(*) from public.customers) customers,
  (select md5(coalesce(string_agg(id || ':' || base_price, ',' order by id), '')) from public.products) product_prices,
  (select md5(coalesce(string_agg(id || ':' || price || ':' || stock_quantity || ':' || is_active, ',' order by id), '')) from public.product_variants) variant_state,
  (select md5(coalesce(string_agg(id || ':' || order_number || ':' || status || ':' || subtotal || ':' || total, ',' order by id), '')) from public.orders) order_state,
  (select md5(coalesce(string_agg(order_id || ':' || sku || ':' || quantity || ':' || unit_price || ':' || line_total, ',' order by order_id, sku, quantity), '')) from public.order_items) line_state`;
const out = [`-- V1 production migration — generated ${new Date().toISOString().slice(0, 10)} from the repository. Do not edit.`,
  'begin;', "set local lock_timeout = '10s';", "set local statement_timeout = '180s';",
  // Refuse to run twice or on a database that is not at the expected starting point.
  `do $$ begin
  if exists (select 1 from supabase_migrations.schema_migrations where version in (${versions.map(v => `'${v}'`).join(', ')}) or name = 'fedapay_commerce') then raise exception 'V1 migrations already recorded'; end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'add_noel_pajama_sizes') then raise exception 'Unexpected starting point'; end if;
end $$;`,
  `create temporary table v1_before on commit drop as ${fingerprint};`];
for (const version of versions) {
  const file = files.find(name => name.startsWith(version + '_'));
  if (!file) throw new Error('Missing migration ' + version);
  const sql = readFileSync('supabase/migrations/' + file, 'utf8');
  if (sql.includes(tag) || /\b(begin|commit|rollback)\s*;/i.test(sql.replace(/\$\$[\s\S]*?\$\$/g, ''))) throw new Error('Unsafe to bundle ' + file);
  const name = file.slice(version.length + 1, -4);
  out.push(`\n-- ===== ${file} =====`, sql.trimEnd(),
    `insert into supabase_migrations.schema_migrations(version, name, statements) values ('${version}', '${name}', array[${tag}${sql}${tag}]);`);
}
if (!keepPhotos) out.push('\n-- ===== Historical order lines stay untouched: undo the photo backfill of order_reconciliation =====',
  'update public.order_items set image_url = null where image_url is not null;');
out.push(`\n-- ===== Verification before commit: any difference raises and rolls everything back =====
do $$ declare before v1_before%rowtype; after record; begin
  select * into before from v1_before;
  ${fingerprint} into after;
  if (before.products, before.variants, before.orders, before.order_items, before.customers, before.product_prices, before.variant_state, before.order_state, before.line_state)
    is distinct from (after.products, after.variants, after.orders, after.order_items, after.customers, after.product_prices, after.variant_state, after.order_state, after.line_state)
  then raise exception 'Commercial data changed during migration: rolled back'; end if;
  if to_regclass('public.admin_order_list') is null or to_regclass('public.admin_stock_levels') is null
    or to_regclass('public.notification_jobs') is null or to_regclass('public.staff_stock_movements') is null
    or (select count(*) from supabase_migrations.schema_migrations where version in (${versions.map(v => `'${v}'`).join(', ')})) <> 10
    or exists (select 1 from public.orders where payment_state <> 'unpaid')
    or exists (select 1 from public.notification_jobs) or exists (select 1 from public.inventory_movements)${keepPhotos ? '' : `
    or exists (select 1 from public.order_items where image_url is not null)`}
  then raise exception 'Unexpected state after migration: rolled back'; end if;
end $$;`, 'commit;');
process.stdout.write(out.join('\n') + '\n');
