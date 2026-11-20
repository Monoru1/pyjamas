#!/usr/bin/env bash
# Shared helpers for the production release scripts. PostgreSQL client tools run either from PATH
# or inside the container named by PG_CONTAINER (same working directory mounted at the same path).
# Connection strings travel through the environment, never through arguments or files.
set -euo pipefail

sql_tool() {  # sql_tool '<shell snippet using "$PROD_DB_URL" / "$TARGET_URL" / "$DRILL_ADMIN_URL">'
  if [ -n "${PG_CONTAINER:-}" ]; then
    docker exec -i -e PROD_DB_URL -e TARGET_URL -e DRILL_ADMIN_URL -e QUERY -w "$PWD" "$PG_CONTAINER" sh -c "$1"
  else sh -c "$1"; fi
}

# Figures that must survive a backup, a restore and the migration. No personal data.
COMMERCIAL_FINGERPRINT="select 'produits=' || (select count(*) from public.products)
  union all select 'variantes=' || (select count(*) from public.product_variants)
  union all select 'stock_total=' || (select coalesce(sum(stock_quantity), 0) from public.product_variants)
  union all select 'commandes=' || (select count(*) from public.orders)
  union all select 'lignes=' || (select count(*) from public.order_items)
  union all select 'clients=' || (select count(*) from public.customers)
  union all select 'total_commandes=' || (select coalesce(sum(total), 0) from public.orders)
  union all select 'profils=' || (select count(*) from public.profiles)
  union all select 'empreinte_catalogue=' || (select md5(coalesce(string_agg(id || ':' || price || ':' || stock_quantity, ',' order by id), '')) from public.product_variants)
  union all select 'empreinte_commandes=' || (select md5(coalesce(string_agg(id || ':' || order_number || ':' || status || ':' || total, ',' order by id), '')) from public.orders)
  union all select 'empreinte_lignes=' || (select md5(coalesce(string_agg(order_id || ':' || sku || ':' || quantity || ':' || unit_price || ':' || line_total, ',' order by order_id, sku, quantity), '')) from public.order_items)"
MIGRATION_HISTORY="select 'migrations=' || count(*) || ' derniere=' || max(version) from supabase_migrations.schema_migrations"
# Exact row count of every table of the commercial schemas.
TABLE_COUNTS="select table_schema || '.' || table_name || '=' ||
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
  from information_schema.tables where table_type = 'BASE TABLE' and (table_schema = 'public' or (table_schema, table_name) = ('auth', 'users'))
  order by 1"
# Deterministic digests of ALL rows in every table covered by the strict restore, including
# Auth and migration contents. Only digests leave the runner, never row values.
TABLE_HASHES="select table_schema || '.' || table_name || '=' ||
  (xpath('/row/h/text()', query_to_xml(format('select md5(coalesce(string_agg(d, %L order by d collate \"C\"), %L)) as h from (select md5(row_to_json(t)::text) d from %I.%I t) rows', '', '', table_schema, table_name), false, true, '')))[1]::text
  from information_schema.tables where table_type = 'BASE TABLE' and table_schema in ('public', 'auth', 'supabase_migrations') order by 1"
export COMMERCIAL_FINGERPRINT MIGRATION_HISTORY TABLE_COUNTS TABLE_HASHES

schema_fingerprint() {
  sql_tool "pg_dump --dbname=\"\$$1\" --schema-only --no-owner --no-publications --no-subscriptions --schema=public --schema=auth --schema=supabase_migrations" < /dev/null > "$2"
  # pg_dump emits a per-run random restrict token and source/tool minor versions.
  sed -E '/^\\(un)?restrict /d; /^-- Dumped (from database|by pg_dump) version /d' "$2" | sha256sum | cut -d' ' -f1
}

# Prints only the lines of a tool log that name the failing object, never data or statement text.
sanitized_errors() {
  grep -E '^(pg_restore|pg_dump|psql)[^ ]*:? .*(error|ERROR|from TOC entry)' "$1" 2>/dev/null \
    | sed -E 's/"[^"]*"/"…"/g; s/\([^)]*\)=\([^)]*\)/(…)=(…)/g' | cut -c1-220 | head -20 || true
}

# query_file <url variable name> <sql file> <output file>: unaligned, pipe-separated, tuples only.
# Both read nothing from stdin: inside a `while read` loop they must not swallow the loop's input.
query_file() { sql_tool "psql \"\$$1\" -X -q -At -F '|' -v ON_ERROR_STOP=1 -f '$2'" < /dev/null > "$3"; }
query() { sql_tool "psql \"\$$1\" -X -q -At -v ON_ERROR_STOP=1 -c \"\$QUERY\"" < /dev/null; }
