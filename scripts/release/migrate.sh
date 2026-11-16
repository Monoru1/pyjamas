#!/usr/bin/env bash
# Phase 2 — production migration. Refuses to start without a recent successful backup drill for the
# same commit, a fresh passing preflight, and production data identical to the backed-up state.
#
# Required environment: PROD_DB_URL (secret), DRILL_EVIDENCE_DIR (evidence of phase 1), RELEASE_SHA.
# Optional: PG_CONTAINER, EVIDENCE_DIR (default ./evidence-migration), MAX_DRILL_AGE_HOURS (default 12).
source "$(dirname "$0")/lib.sh"
: "${PROD_DB_URL:?PROD_DB_URL is required}"; : "${DRILL_EVIDENCE_DIR:?DRILL_EVIDENCE_DIR is required}"; : "${RELEASE_SHA:?RELEASE_SHA is required}"
cd "$(dirname "$0")/../.."
export PROD_DB_URL
evidence="${EVIDENCE_DIR:-evidence-migration}"; work="$(mktemp -d "$PWD/.migration.XXXXXX")"; mkdir -p "$evidence"
trap 'rm -rf "$work"' EXIT
stop() { echo "ARRÊT AVANT TOUTE ÉCRITURE : $1"; exit 1; }
value() { grep -m1 "^$1=" "$DRILL_EVIDENCE_DIR/PREUVE.txt" | cut -d= -f2-; }

echo "1/5 Preuve de restauration…"
[ -f "$DRILL_EVIDENCE_DIR/PREUVE.txt" ] || stop "aucune preuve de restauration"
[ "$(value release_sha)" = "$RELEASE_SHA" ] || stop "la preuve de restauration concerne un autre commit"
age=$(( ( $(date -u +%s) - $(date -u -d "$(value horodatage_utc)" +%s) ) / 3600 ))
[ "$age" -ge 0 ] && [ "$age" -lt "${MAX_DRILL_AGE_HOURS:-12}" ] || stop "preuve de restauration trop ancienne (${age} h)"
echo "   preuve du $(value horodatage_utc), commit ${RELEASE_SHA:0:7}"

echo "2/5 Préflight récent et état de la production…"
query_file PROD_DB_URL supabase/production/preflight.sql "$evidence/preflight-production.txt"
awk -F'|' '$2 == "BLOQUANT" { total++; if ($4 != "t") { failed++; print "   BLOQUANT EN ÉCHEC : " $3 } } END { print "   " total - failed " contrôle(s) bloquant(s) validé(s) sur " total; exit failed > 0 || total < 10 }' "$evidence/preflight-production.txt" || stop "préflight de production"
QUERY="$COMMERCIAL_FINGERPRINT" query PROD_DB_URL > "$evidence/before.fingerprint"
diff "$DRILL_EVIDENCE_DIR/production.fingerprint" "$evidence/before.fingerprint" > /dev/null || stop "la production a changé depuis la sauvegarde : refaire la phase backup-drill"
QUERY="$MIGRATION_HISTORY" query PROD_DB_URL > "$evidence/before.migrations"

echo "3/5 Transaction de migration…"
node scripts/build-production-migration.mjs > "$work/v1-production.sql"
[ "$(sha256sum "$work/v1-production.sql" | cut -d' ' -f1)" = "$(value sha256_migration)" ] || stop "la transaction diffère de celle répétée sur la copie restaurée"
echo "   identique à la transaction répétée (sha256 $(value sha256_migration | cut -c1-12)…)"

echo "4/5 Application en production : dix migrations, une seule transaction…"
if ! sql_tool "psql \"\$PROD_DB_URL\" -X -q -v ON_ERROR_STOP=1 -f '$work/v1-production.sql'" < /dev/null > "$work/migration.log" 2>&1; then
  sanitized_errors "$work/migration.log"
  echo "MIGRATION ANNULÉE : la transaction a été entièrement défaite, la production est inchangée."; exit 1
fi
echo "   transaction validée"

echo "5/5 Postflight…"
query_file PROD_DB_URL supabase/production/postflight.sql "$evidence/postflight-production.txt"
QUERY="$COMMERCIAL_FINGERPRINT" query PROD_DB_URL > "$evidence/after.fingerprint"
QUERY="$MIGRATION_HISTORY" query PROD_DB_URL > "$evidence/after.migrations"
bad=0
awk -F'|' '{ total++; if ($3 != "t") { failed++; print "   POSTFLIGHT EN ÉCHEC : " $2 } } END { print "   " total - failed " contrôle(s) de postflight validé(s) sur " total; exit failed > 0 || total == 0 }' "$evidence/postflight-production.txt" || bad=1
diff "$evidence/before.fingerprint" "$evidence/after.fingerprint" > /dev/null || { echo "   DONNÉES COMMERCIALES MODIFIÉES"; bad=1; }
sed 's/^/   /' "$evidence/after.fingerprint" "$evidence/after.migrations"
if [ "$bad" = 1 ]; then
  echo "MIGRATION VALIDÉE MAIS CONTRÔLE EN ÉCHEC : garder les ventes fermées, ne pas fusionner la PR, examiner avant toute suite."; exit 1
fi
{ echo "preuve=migration V1 appliquée en production et contrôlée"; echo "horodatage_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; echo "release_sha=$RELEASE_SHA"
  cat "$evidence/after.fingerprint" "$evidence/after.migrations"; } > "$evidence/PREUVE-MIGRATION.txt"
echo; echo "MIGRATION RÉUSSIE — preuve : $evidence/PREUVE-MIGRATION.txt"
