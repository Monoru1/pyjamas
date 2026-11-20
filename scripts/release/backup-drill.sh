#!/usr/bin/env bash
# Phase 1 — backup of production and proof that it restores. Production is only READ.
#
# Required environment:
#   PROD_DB_URL       production connection string (secret)
#   DRILL_ADMIN_URL   admin URL of a DISPOSABLE PostgreSQL 17 server (never production)
# Optional: PG_CONTAINER (container holding the PostgreSQL 17 client tools), RELEASE_SHA,
#           BACKUP_DIR (sensitive output, default ./backups), EVIDENCE_DIR (non-sensitive, default ./evidence).
#
# 1. Full custom-format dump of production                          → $BACKUP_DIR/full.dump   (SENSITIVE)
# 2. Strict restore of the commercial schemas into a disposable database: any pg_restore error fails the run.
# 3. Proof: figures, fingerprints, per-table row counts and migration history match production.
# Default BACKUP_MODE=current verifies the current production, without a migration preflight.
# Explicit BACKUP_MODE=v1-rehearsal additionally requires the unchanged historical preflight
# and rehearses V1 ONLY on the isolated restore. Its evidence alone can authorize migrate.sh.
# Only $EVIDENCE_DIR may be published: it holds counts, hashes and control results, no customer data.
source "$(dirname "$0")/lib.sh"
: "${PROD_DB_URL:?PROD_DB_URL is required}"; : "${DRILL_ADMIN_URL:?DRILL_ADMIN_URL is required}"
cd "$(dirname "$0")/../.."
node scripts/release/check-drill-target.mjs || exit 1
mode="${BACKUP_MODE:-current}"
case "$mode" in current|v1-rehearsal) ;; *) echo "BACKUP_MODE must be current or v1-rehearsal"; exit 1;; esac
backup="${BACKUP_DIR:-backups}"; evidence="${EVIDENCE_DIR:-evidence}"
mkdir -p "$backup" "$evidence"; chmod 700 "$backup"
# Invalidate any proof from a previous attempt before touching the source or the restore.
rm -f "$evidence/PREUVE.txt"
export PROD_DB_URL DRILL_ADMIN_URL TARGET_URL="${DRILL_ADMIN_URL%/*}/lmp_restore_drill"
stamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fail() { echo "ÉCHEC : $1 — NE PAS MIGRER."; exit 1; }

echo "0/5 Versions…"
server="$(QUERY='show server_version_num' query PROD_DB_URL)"; tools="$(sql_tool 'pg_dump --version' | grep -oE '[0-9]+' | head -1)"
target_version="$(QUERY='show server_version_num' query DRILL_ADMIN_URL)"
echo "   production ${server:0:2}, outils $tools, serveur de restauration ${target_version:0:2}"
[ "$tools" -ge "${server:0:2}" ] && [ "${target_version:0:2}" -ge "${server:0:2}" ] || fail "outils ou serveur de restauration plus anciens que la production"

echo "1/5 Sauvegarde complète de la production (lecture seule)…"
sql_tool "pg_dump --dbname=\"\$PROD_DB_URL\" --format=custom --file='$backup/full.dump'" < /dev/null 2> "$backup/dump.log" || { sanitized_errors "$backup/dump.log"; fail "pg_dump complet"; }
sql_tool "pg_dump --dbname=\"\$PROD_DB_URL\" --format=custom --no-owner --schema=public --schema=auth --schema=supabase_migrations --file='$backup/commerce.dump'" < /dev/null 2>> "$backup/dump.log" || { sanitized_errors "$backup/dump.log"; fail "pg_dump des schémas commerciaux"; }
QUERY="$COMMERCIAL_FINGERPRINT" query PROD_DB_URL > "$evidence/production.fingerprint"
QUERY="$MIGRATION_HISTORY" query PROD_DB_URL > "$evidence/production.migrations"
QUERY="$TABLE_COUNTS" query PROD_DB_URL > "$evidence/production.table-counts"
QUERY="$TABLE_HASHES" query PROD_DB_URL > "$evidence/production.table-hashes"
schema_fingerprint PROD_DB_URL "$backup/production.schema" > "$evidence/production.schema-sha256"

echo "2/5 Restauration stricte dans une base isolée et jetable…"
QUERY="drop database if exists lmp_restore_drill" query DRILL_ADMIN_URL; QUERY="create database lmp_restore_drill" query DRILL_ADMIN_URL
# Same roles (names only) and same extensions as production, so that grants, policies and indexes restore.
QUERY="select rolname from pg_roles where rolname !~ '^pg_' and rolname ~ '^[a-z_][a-z0-9_]*\$'" query PROD_DB_URL | while read -r role; do
  QUERY="do \$\$ begin if not exists (select 1 from pg_roles where rolname = '$role') then create role \"$role\"; end if; end \$\$" query TARGET_URL
done
: > "$evidence/extensions-absentes.txt"
QUERY="select e.extname || '|' || n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname <> 'plpgsql'" query PROD_DB_URL | while IFS='|' read -r ext schema; do
  [[ "$ext" =~ ^[a-zA-Z0-9_-]+$ && "$schema" =~ ^[a-z_][a-z0-9_]*$ ]] || continue
  if [ "$(QUERY="select count(*) from pg_available_extensions where name = '$ext'" query TARGET_URL)" = 1 ]; then
    QUERY="create schema if not exists \"$schema\"; create extension if not exists \"$ext\" with schema \"$schema\"" query TARGET_URL
  else echo "$ext" >> "$evidence/extensions-absentes.txt"; fi
done
# The target already has an empty public schema: every other entry of the dump is restored, and any error is fatal.
sql_tool "pg_restore --list '$backup/commerce.dump'" < /dev/null | grep -vE '^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public ' > "$backup/restore.toc"
if ! sql_tool "pg_restore --dbname=\"\$TARGET_URL\" --exit-on-error --no-owner --no-publications --no-subscriptions --use-list='$backup/restore.toc' '$backup/commerce.dump'" < /dev/null > "$backup/restore.log" 2>&1; then
  sanitized_errors "$backup/restore.log"; fail "pg_restore a rencontré une erreur (journal complet conservé hors publication)"
fi
grep -qiE 'error|warning: errors ignored' "$backup/restore.log" && { sanitized_errors "$backup/restore.log"; fail "pg_restore a signalé une erreur"; }

echo "3/5 Preuve : comparaison production / copie restaurée…"
QUERY="$COMMERCIAL_FINGERPRINT" query TARGET_URL > "$evidence/restored.fingerprint"
QUERY="$MIGRATION_HISTORY" query TARGET_URL > "$evidence/restored.migrations"
QUERY="$TABLE_COUNTS" query TARGET_URL > "$evidence/restored.table-counts"
QUERY="$TABLE_HASHES" query TARGET_URL > "$evidence/restored.table-hashes"
schema_fingerprint TARGET_URL "$backup/restored.schema" > "$evidence/restored.schema-sha256"
for kind in fingerprint migrations table-counts table-hashes schema-sha256; do
  diff "$evidence/production.$kind" "$evidence/restored.$kind" > /dev/null || fail "la copie restaurée diffère de la production ($kind)"
done
sed 's/^/   /' "$evidence/restored.fingerprint"; sed 's/^/   /' "$evidence/restored.migrations"
echo "   $(wc -l < "$evidence/restored.table-counts") tables comparées ligne à ligne : identiques"

if [ "$mode" = v1-rehearsal ]; then
echo "4/5 Préflight historique sur la source (lecture seule)…"
query_file PROD_DB_URL supabase/production/preflight.sql "$evidence/preflight-production.txt"
awk -F'|' '$2 == "BLOQUANT" { total++; if ($4 != "t") { failed++; print "   BLOQUANT EN ÉCHEC : " $3 } } END { print "   " total - failed " contrôle(s) bloquant(s) validé(s) sur " total; exit failed > 0 || total < 10 }' "$evidence/preflight-production.txt" || fail "préflight de production"

echo "5/5 Répétition générale de la migration V1 sur la copie restaurée…"
node scripts/build-production-migration.mjs > "$backup/v1-production.sql"
sql_tool "psql \"\$TARGET_URL\" -X -q -v ON_ERROR_STOP=1 -f '$backup/v1-production.sql'" < /dev/null > "$backup/migration-copy.log" 2>&1 || { sanitized_errors "$backup/migration-copy.log"; fail "la migration échoue sur la copie restaurée"; }
query_file TARGET_URL supabase/production/postflight.sql "$evidence/postflight-copy.txt"
awk -F'|' '{ total++; if ($3 != "t") { failed++; print "   POSTFLIGHT EN ÉCHEC : " $2 } } END { print "   " total - failed " contrôle(s) de postflight validé(s) sur " total; exit failed > 0 || total == 0 }' "$evidence/postflight-copy.txt" || fail "postflight sur la copie"
QUERY="$COMMERCIAL_FINGERPRINT" query TARGET_URL > "$evidence/migrated-copy.fingerprint"
diff "$evidence/production.fingerprint" "$evidence/migrated-copy.fingerprint" > /dev/null || fail "la migration modifie des données commerciales sur la copie"
else
  echo "4/5 Schémas et données restaurés identiques ; aucun préflight historique requis."
  echo "5/5 Mode current : aucune répétition V1 exécutée."
fi
QUERY="drop database lmp_restore_drill" query DRILL_ADMIN_URL

{ echo "preuve=sauvegarde restaurée et comparée avec succès"
  echo "backup_mode=$mode"; echo "restauration_verifiee=true"
  echo "horodatage_utc=$stamp"; echo "release_sha=${RELEASE_SHA:-inconnu}"
  echo "sha256_sauvegarde_complete=$(sha256sum "$backup/full.dump" | cut -d' ' -f1)"
  if [ "$mode" = v1-rehearsal ]; then echo "sha256_migration=$(sha256sum "$backup/v1-production.sql" | cut -d' ' -f1)"; fi
  cat "$evidence/production.fingerprint" "$evidence/production.migrations"; } > "$evidence/PREUVE.txt"
echo; echo "RÉUSSI — preuve : $evidence/PREUVE.txt ; sauvegarde (sensible) : $backup/full.dump"
