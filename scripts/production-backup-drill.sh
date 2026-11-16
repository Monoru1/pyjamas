#!/usr/bin/env bash
# Backup of production + proof that it restores, on a throwaway local PostgreSQL. No paid service.
#
#   export PROD_DB_URL='postgresql://…'   # Supabase → Connect → Session pooler (IPv4). Never commit or paste it.
#   bash scripts/production-backup-drill.sh
#
# 1. Full backup of the production database (custom format) → backups/<timestamp>/full.dump
# 2. Restore of the commercial schemas into an isolated, disposable PostgreSQL (Docker).
# 3. Proof: the restored copy has the same figures and fingerprints as production.
# 4. Dress rehearsal: the V1 migration and its postflight run on the restored copy.
# Production is only ever READ (pg_dump + one SELECT). Storage files are not part of a SQL backup.
set -euo pipefail
: "${PROD_DB_URL:?Set PROD_DB_URL in your shell first}"
cd "$(dirname "$0")/.."
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="backups/$stamp"; mkdir -p "$out"; chmod 700 backups "$out"
image="${DRILL_IMAGE:-postgres:17}"
name="lmp-restore-drill-$stamp"
fingerprint="select 'produits ' || (select count(*) from public.products) || ' / variantes ' || (select count(*) from public.product_variants)
  || ' / stock ' || (select coalesce(sum(stock_quantity), 0) from public.product_variants)
  || ' / commandes ' || (select count(*) from public.orders) || ' / lignes ' || (select count(*) from public.order_items)
  || ' / clients ' || (select count(*) from public.customers) || ' / total ' || (select coalesce(sum(total), 0) from public.orders)
  || ' / profils ' || (select count(*) from public.profiles)
  || ' / catalogue ' || (select md5(coalesce(string_agg(id || ':' || price || ':' || stock_quantity, ',' order by id), '')) from public.product_variants)
  || ' / empreinte_commandes ' || (select md5(coalesce(string_agg(id || ':' || order_number || ':' || status || ':' || total, ',' order by id), '')) from public.orders)
  || ' / migrations ' || (select count(*) from supabase_migrations.schema_migrations)"

if [ -n "${DRILL_LOCAL_ADMIN_URL:-}" ]; then
  # Test mode: an already running disposable server, host binaries.
  run() { "$@"; }; admin="$DRILL_LOCAL_ADMIN_URL"; work="$PWD/$out"; repo="$PWD"
else
  docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=drill -v "$PWD/$out:/backup" -v "$PWD:/repo:ro" "$image" >/dev/null
  trap 'docker stop "$name" >/dev/null 2>&1 || true' EXIT
  run() { docker exec -e PGPASSWORD=drill "$name" "$@"; }; admin="postgresql://postgres:drill@127.0.0.1:5432/postgres"; work=/backup; repo=/repo
  for _ in $(seq 1 60); do run pg_isready -q -h 127.0.0.1 -U postgres && break; sleep 1; done
fi
target="${admin%/*}/lmp_restore_drill"

echo "1/4 Sauvegarde complète de la production (lecture seule)…"
run pg_dump "$PROD_DB_URL" --format=custom --file="$work/full.dump"
run pg_dump "$PROD_DB_URL" --format=custom --no-owner --schema=public --schema=auth --schema=supabase_migrations --file="$work/commerce.dump"
run psql "$PROD_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "$fingerprint" > "$out/production.fingerprint"
( cd "$out" && sha256sum full.dump commerce.dump > SHA256SUMS )

echo "2/4 Restauration dans une base isolée et jetable…"
run psql "$admin" -X -q -v ON_ERROR_STOP=1 -c "drop database if exists lmp_restore_drill" -c "create database lmp_restore_drill"
run psql "$target" -X -q -v ON_ERROR_STOP=1 <<'SQL'
do $$ declare r text; begin
  foreach r in array array['anon','authenticated','service_role','authenticator','supabase_admin','supabase_auth_admin','supabase_storage_admin','dashboard_user','supabase_replication_admin','supabase_read_only_user'] loop
    if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I', r); end if;
  end loop;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
drop schema public cascade;
SQL
run pg_restore --dbname="$target" --no-owner "$work/commerce.dump" > "$out/restore.log" 2>&1 || echo "   pg_restore a signalé des avertissements : voir $out/restore.log (la preuve est l'étape 3)."

echo "3/4 Preuve : comparaison production / copie restaurée…"
run psql "$target" -X -At -v ON_ERROR_STOP=1 -c "$fingerprint" > "$out/restored.fingerprint"
if ! diff -q "$out/production.fingerprint" "$out/restored.fingerprint" >/dev/null; then
  echo "ÉCHEC : la copie restaurée diffère de la production. NE PAS MIGRER."; diff "$out/production.fingerprint" "$out/restored.fingerprint" || true; exit 1
fi
echo "   Identiques : $(cat "$out/restored.fingerprint")"

echo "4/4 Répétition générale de la migration V1 sur la copie restaurée…"
node scripts/build-production-migration.mjs > "$out/v1-production.sql"
run psql "$target" -X -q -v ON_ERROR_STOP=1 -P pager=off -f "$repo/supabase/production/preflight.sql" > "$out/preflight-copy.txt"
run psql "$target" -X -q -v ON_ERROR_STOP=1 -f "$work/v1-production.sql" > "$out/migration-copy.log" 2>&1
run psql "$target" -X -v ON_ERROR_STOP=1 -P pager=off -f "$repo/supabase/production/postflight.sql" | tee "$out/postflight-copy.txt"
if grep -qE '\| f +\|' "$out/postflight-copy.txt"; then echo "ÉCHEC : un contrôle du postflight est à false sur la copie. NE PAS MIGRER."; exit 1; fi
{ echo "Sauvegarde et restauration prouvées le $stamp (UTC)"; echo "Empreinte : $(cat "$out/restored.fingerprint")"; cat "$out/SHA256SUMS"; } > "$out/PREUVE.txt"
echo
echo "RÉUSSI. Sauvegarde : $out/full.dump — preuve : $out/PREUVE.txt"
echo "Conserver le dossier $out hors du dépôt, dans un espace protégé : il contient des données clients."
