#!/usr/bin/env bash
# CI only: builds a stand-in "production" database (structure snapshot of production, the 56 historical
# migration versions, synthetic rows) on a disposable server, so the release scripts are exercised for real.
# It deliberately includes what makes a Supabase dump hard to restore: foreign roles and grants, a trigger on
# auth.users calling a public function, a publication, and an extension-backed index in the public schema.
source "$(dirname "$0")/lib.sh"
: "${DRILL_ADMIN_URL:?DRILL_ADMIN_URL is required}"
cd "$(dirname "$0")/../.."
case "$DRILL_ADMIN_URL" in *127.0.0.1*|*localhost*) ;; *) echo "Loopback disposable server required"; exit 1;; esac
export DRILL_ADMIN_URL TARGET_URL="${DRILL_ADMIN_URL%/*}/prodsim"
QUERY="drop database if exists prodsim" query DRILL_ADMIN_URL; QUERY="create database prodsim" query DRILL_ADMIN_URL
snapshot="$(mktemp "$PWD/.migration.XXXXXX")"; trap 'rm -f "$snapshot" "$snapshot.sql"' EXIT
# SIM_TOLERANT=1 lets the snapshot load on an older local server that lacks PostgreSQL 17 privileges.
if [ "${SIM_TOLERANT:-}" = 1 ]; then sed -E 's/, ?maintain//Ig' supabase/recette/bootstrap-production-schema.sql > "$snapshot"; stop=0; else cp supabase/recette/bootstrap-production-schema.sql "$snapshot"; stop=1; fi
node -e "
const inventory = require('./docs/remote-migration-inventory.json');
const prior = [['20261020142232','sandbox_payment_acceptance'],['20261020142238','staff_security_and_interest_limits'],['20261020142639','atomic_order_requests_and_staff_transitions'],['20261023082445','order_request_rate_budget'],['20261023132029','add_noel_pajama_sizes']];
const all = new Map([...inventory.map(m => [m.version, m.name]), ...prior]);
console.log('insert into supabase_migrations.schema_migrations(version,name) values ' + [...all].map(([v, n]) => \`('\${v}','\${n}')\`).join(',') + ';');" > "$snapshot.sql"
sql_tool "psql \"\$TARGET_URL\" -X -q -v ON_ERROR_STOP=1" <<'SQL'
do $$ declare r text; begin foreach r in array array['anon','authenticated','service_role','authenticator','supabase_admin','supabase_auth_admin','dashboard_user','sim_second_owner'] loop
  if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I', r); end if; end loop; end $$;
create schema auth; grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
create table auth.users(id uuid primary key, email text unique, encrypted_password text, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
alter table auth.users owner to supabase_auth_admin; grant select on auth.users to dashboard_user;
create schema extensions; grant usage on schema extensions to anon, authenticated, service_role;
create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);
create publication supabase_realtime;
-- Supabase has default ACLs from multiple owners in the same schema. --no-owner
-- emits identical headers for these blocks, even though FOR ROLE remains distinct.
alter default privileges for role postgres in schema public grant select on tables to service_role;
alter default privileges for role sim_second_owner in schema public grant select on tables to service_role;
alter default privileges for role postgres in schema public grant execute on functions to service_role;
alter default privileges for role sim_second_owner in schema public grant execute on functions to service_role;
alter default privileges for role postgres in schema public grant usage on sequences to service_role;
alter default privileges for role sim_second_owner in schema public grant usage on sequences to service_role;
SQL
sql_tool "psql \"\$TARGET_URL\" -X -q -v ON_ERROR_STOP=$stop -f '$snapshot'" > /dev/null 2>&1 || { echo "Snapshot failed to load"; exit 1; }
sql_tool "psql \"\$TARGET_URL\" -X -q -v ON_ERROR_STOP=1 -f '$snapshot.sql'"
sql_tool "psql \"\$TARGET_URL\" -X -q -v ON_ERROR_STOP=1" <<'SQL'
create extension if not exists pg_trgm with schema public;
create index sim_products_name_trgm on public.products using gin (name_fr public.gin_trgm_ops);
create function public.sim_handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin return new; end $$;
create trigger sim_on_auth_user_created after insert on auth.users for each row execute function public.sim_handle_new_user();
alter publication supabase_realtime add table public.orders;
insert into auth.users(id, email, encrypted_password) values ('55555555-5555-4555-8555-555555555551', 'owner@example.test', 'not-a-real-hash');
insert into public.profiles(id, role, is_active) values ('55555555-5555-4555-8555-555555555551', 'super_admin', true);
insert into public.currencies(code, name, symbol) values ('XOF', 'Franc CFA', 'FCFA') on conflict do nothing;
insert into public.products(id, slug, name_fr, base_price, currency_code, is_active)
  select ('22222222-2222-4222-8222-' || lpad(n::text, 12, '0'))::uuid, 'simulation-' || n, 'Produit simulé ' || n, 15000 + n * 1000, 'XOF', true from generate_series(1, 3) n;
insert into public.product_variants(product_id, sku, color_name_fr, size_label, price, stock_quantity, is_active)
  select p.id, 'SIM-' || right(p.id::text, 2) || '-' || s, 'Standard', s, p.base_price + case s when 'L' then 2000 else 0 end, 7, true
  from public.products p cross join (values ('S'), ('M'), ('L')) sizes(s);
insert into public.product_images(product_id, url, is_primary, sort_order) select id, 'https://example.test/' || slug || '.webp', true, 0 from public.products;
insert into public.customers(id, full_name, phone, email) values ('33333333-3333-4333-8333-333333333331', 'Cliente Simulée', '2290100000000', 'cliente@example.test');
insert into public.orders(id, customer_id, status, currency_code, subtotal, discount_total, total, source)
  select ('44444444-4444-4444-8444-' || lpad(n::text, 12, '0'))::uuid, '33333333-3333-4333-8333-333333333331', 'delivered', 'XOF', 16000, 0, 16000, 'website' from generate_series(1, 2) n;
insert into public.order_items(order_id, product_id, sku, product_name, color_name, size_label, quantity, unit_price, line_total)
  select o.id, '22222222-2222-4222-8222-000000000001', 'SIM-01-S', 'Produit simulé 1', 'Standard', 'S', 1, 16000, 16000 from public.orders o;
SQL
echo "Simulated production ready: database prodsim"
