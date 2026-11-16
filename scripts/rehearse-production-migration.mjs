// Rehearsal on a disposable in-memory database built from the production structure snapshot.
// Proves: preflight passes, the bundle commits, a second run is refused, and a run that would
// rewrite a price rolls back completely. Connects to nothing.
import { PGlite } from '@electric-sql/pglite';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const inventory = JSON.parse(readFileSync('docs/remote-migration-inventory.json', 'utf8'));
const prior = [['20261020142232', 'sandbox_payment_acceptance'], ['20261020142238', 'staff_security_and_interest_limits'],
  ['20261020142639', 'atomic_order_requests_and_staff_transitions'], ['20261023082445', 'order_request_rate_budget'], ['20261023132029', 'add_noel_pajama_sizes']];
const bundle = execFileSync('node', ['scripts/build-production-migration.mjs'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const preflight = readFileSync('supabase/production/preflight.sql', 'utf8');
async function database(misalignedPrice) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role; create schema extensions;
    create function extensions.unaccent(text) returns text language sql immutable as $$select $1$$;
    create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);`);
  await db.exec(readFileSync('supabase/recette/bootstrap-production-schema.sql', 'utf8').replace(/^create extension[^;]+;$/gm, ''));
  for (const [version, name] of [...inventory.map(m => [m.version, m.name]), ...prior].filter((m, i, all) => all.findIndex(x => x[0] === m[0]) === i))
    await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2) on conflict do nothing', [version, name]);
  await db.exec(`insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA');
    insert into products(id,slug,name_fr,base_price,currency_code,is_active) values('22222222-2222-4222-8222-222222222221','repetition','Produit de répétition',${misalignedPrice ? 99999 : 15000},'XOF',true);
    insert into product_variants(product_id,sku,color_name_fr,size_label,price,stock_quantity,is_active) values('22222222-2222-4222-8222-222222222221','REP-S','Rouge','S',15000,7,true),('22222222-2222-4222-8222-222222222221','REP-M','Rouge','M',18000,0,true);
    insert into product_images(product_id,url,is_primary,sort_order) values('22222222-2222-4222-8222-222222222221','https://example.test/repetition.webp',true,0);
    insert into customers(id,full_name,phone) values('33333333-3333-4333-8333-333333333331','Client de répétition','2290100000000');
    insert into orders(id,customer_id,status,currency_code,subtotal,discount_total,total,source) values('44444444-4444-4444-8444-444444444441','33333333-3333-4333-8333-333333333331','delivered','XOF',15000,0,15000,'website');
    insert into order_items(order_id,product_id,sku,product_name,color_name,size_label,quantity,unit_price,line_total) values('44444444-4444-4444-8444-444444444441','22222222-2222-4222-8222-222222222221','REP-S','Produit de répétition','Rouge','S',1,15000,15000);`);
  return db;
}
const state = async db => (await db.query(`select (select count(*)::int from supabase_migrations.schema_migrations) history, to_regclass('public.notification_jobs') is not null v1,
  (select order_number || '|' || total from orders) orders, (select string_agg(sku || ':' || price || ':' || stock_quantity, ',' order by sku) from product_variants) variants,
  (select base_price from products) base_price`)).rows[0];
const show = (label, value) => console.log(label.padEnd(46), typeof value === 'string' ? value : JSON.stringify(value));

let db = await database(false);
const checks = (await db.query(preflight)).rows;
show('Préflight (bloquants en échec)', checks.filter(c => c.niveau === 'BLOQUANT' && !c.ok).map(c => c.controle).join(' | ') || `aucun sur ${checks.filter(c => c.niveau === 'BLOQUANT').length}`);
const before = await state(db); show('Avant', before);
await db.exec(bundle);
const after = await state(db); show('Après', after);
if (after.history !== before.history + 10 || !after.v1 || after.orders !== before.orders || after.variants !== before.variants || after.base_price !== before.base_price) throw new Error('Rehearsal mismatch');
show('Photo des lignes historiques (défaut)', String((await db.query('select image_url from order_items')).rows[0].image_url) + ' → inchangée');
if ((await db.query('select image_url from order_items')).rows[0].image_url !== null) throw new Error('Historical photo was changed');
show('Commande existante', JSON.stringify((await db.query('select payment_state,needs_attention from orders')).rows[0]));
show('Préflight rejoué après migration', (await db.query(preflight)).rows.filter(c => c.niveau === 'BLOQUANT' && !c.ok).length + ' bloquant(s) en échec (attendu : base déjà migrée)');
let refused = ''; try { await db.exec(bundle); } catch (error) { refused = error.message; await db.exec('rollback'); }
const post = (await db.query(readFileSync('supabase/production/postflight.sql', 'utf8'))).rows;
show('Postflight (contrôles en échec)', post.filter(c => !c.ok).map(c => `${c.controle} [${c.detail}]`).join(' | ') || `aucun sur ${post.length}`);
if (post.some(c => !c.ok)) throw new Error('Postflight failed');
show('Second passage', refused || 'NON REFUSÉ'); if (!refused) throw new Error('Second run was not refused');
show('État inchangé après refus', JSON.stringify(await state(db)) === JSON.stringify(after) ? 'oui' : 'NON');
// Provisional catalogue on the migrated database.
const provisional = readFileSync('supabase/production/provisional-catalogue.sql', 'utf8');
const staff = '55555555-5555-4555-8555-555555555551';
await db.exec(`insert into auth.users values('${staff}'); insert into profiles(id,role,is_active) values('${staff}','admin',true);`);
let guard = ''; try { await db.exec(provisional); } catch (error) { guard = error.message; await db.exec('rollback'); }
show('Catalogue provisoire sans confirmation des lots', guard || 'NON REFUSÉ'); if (!/not confirmed/.test(guard)) throw new Error('Lot guard missing');
await db.exec(`select set_config('app.provisional_staff_id','${staff}',false); select set_config('app.lots_confirmed','oui',false);`);
await db.exec(provisional);
const catalogue = (await db.query(`select string_agg(v.sku || ':' || v.price || ':' || v.stock_quantity, ',' order by v.sku) variants, (select base_price from products) base_price,
  (select string_agg(kind || ' ' || stock_before || '→' || stock_after, ',' order by stock_before) from staff_stock_movements) movements,
  (select string_agg(before_data->>'price', ',' order by before_data->>'price') from activity_logs where action='provisional_price') old_prices,
  (select unit_price || '|' || line_total from order_items) historical_line, (select auth.uid() is null) identity_cleared from product_variants v`)).rows[0];
show('Catalogue provisoire appliqué', catalogue);
if (catalogue.variants !== 'REP-M:30000.00:30,REP-S:30000.00:30' || catalogue.movements !== 'adjustment 0→30,adjustment 7→30' || catalogue.old_prices !== '15000.00,18000.00'
  || catalogue.historical_line !== '15000.00|15000.00' || catalogue.base_price !== '30000.00' || !catalogue.identity_cleared) throw new Error('Provisional catalogue mismatch');
let twice = ''; try { await db.exec(provisional); } catch (error) { twice = error.message; await db.exec('rollback'); }
show('Catalogue provisoire, second passage', twice || 'NON REFUSÉ'); if (!twice) throw new Error('Provisional catalogue ran twice');
await db.close();

db = await database(true);
show('Cas d’écart de prix — préflight', (await db.query(preflight)).rows.filter(c => c.niveau === 'BLOQUANT' && !c.ok).map(c => `${c.controle} [${c.detail}]`).join(' | '));
const dirty = await state(db);
let rolledBack = ''; try { await db.exec(bundle); } catch (error) { rolledBack = error.message; await db.exec('rollback'); }
show('Cas d’écart de prix — migration', rolledBack || 'NON ANNULÉE');
show('Retour arrière complet', JSON.stringify(await state(db)) === JSON.stringify(dirty) ? 'oui, base identique à l’état initial' : 'NON');
if (!rolledBack || JSON.stringify(await state(db)) !== JSON.stringify(dirty)) throw new Error('Rollback rehearsal failed');
await db.close();
console.log('RÉPÉTITION RÉUSSIE');
