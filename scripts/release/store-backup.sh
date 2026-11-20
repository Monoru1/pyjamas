#!/usr/bin/env bash
# Encrypts the full production dump and stores ONLY the ciphertext in a private Supabase Storage bucket,
# then proves the stored object decrypts back to the same dump and applies the retention period.
# Required: BACKUP_PASSPHRASE, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL (all from the protected environment).
set -euo pipefail
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"; : "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"; : "${SUPABASE_URL:?SUPABASE_URL is required}"
dump="${BACKUP_DIR:-backups}/full.dump"; evidence="${EVIDENCE_DIR:-evidence}"; bucket=release-backups; days="${BACKUP_RETENTION_DAYS:-30}"
[ -s "$dump" ] || { echo "No dump to store"; exit 1; }
[ -f "$evidence/PREUVE.txt" ] && grep -qx 'restauration_verifiee=true' "$evidence/PREUVE.txt" \
  && grep -qx "sha256_sauvegarde_complete=$(sha256sum "$dump" | cut -d' ' -f1)" "$evidence/PREUVE.txt" \
  || { echo "Storage refused: a successful restore and comparison proof for this dump is required"; exit 1; }
[[ "$days" =~ ^[1-9][0-9]*$ ]] || { echo "BACKUP_RETENTION_DAYS must be a positive integer"; exit 1; }
key_type=legacy-service-role
case "$SUPABASE_SERVICE_ROLE_KEY" in
  sb_secret_?*) key_type=sb_secret;;
  eyJ*.*.*) ;; # Historical compatibility outside the new-key validation run.
  *) echo "SUPABASE_SERVICE_ROLE_KEY is invalid (expected a server secret key)"; exit 1;;
esac
if [ "${REQUIRE_SECRET_KEY:-false}" = true ] && [ "$key_type" != sb_secret ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY must be an sb_secret_ key for this run"; exit 1
fi
[ "${#BACKUP_PASSPHRASE}" -ge 24 ] || { echo "BACKUP_PASSPHRASE must be at least 24 characters"; exit 1; }
api() { # api <method> <path> [curl args…] → prints HTTP status, body in $body_file
  local method="$1" path="$2"; shift 2
  curl -sS -o "$body_file" -w '%{http_code}' -X "$method" "$SUPABASE_URL/storage/v1/$path" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" "$@"
}
body_file="$(mktemp)"; work="$(mktemp -d)"; trap 'rm -rf "$body_file" "$work"' EXIT
# The API-key gateway authenticates sb_secret_ via apikey, never as a JWT bearer.
status="$(api GET "bucket/$bucket")"
case "$status" in 401|403) echo "SUPABASE_SERVICE_ROLE_KEY rejected by Storage (HTTP $status)"; exit 1;; esac

gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 \
  --output "$work/full.dump.gpg" "$dump" 3<<<"$BACKUP_PASSPHRASE"

status="$(api POST bucket -H 'Content-Type: application/json' -d "{\"id\":\"$bucket\",\"name\":\"$bucket\",\"public\":false}")"
case "$status" in 200|201|400|409) ;; *) echo "Bucket creation failed (HTTP $status)"; exit 1;; esac
[ "$(api GET "bucket/$bucket")" = 200 ] && [ "$(jq -r '.public' "$body_file")" = false ] || { echo "Bucket $bucket is missing or not private"; exit 1; }

object="production/$(date -u +%Y%m%dT%H%M%SZ)-${RELEASE_SHA:0:7}.dump.gpg"
status="$(api POST "object/$bucket/$object" -H 'Content-Type: application/octet-stream' --data-binary "@$work/full.dump.gpg")"
[ "$status" = 200 ] || { echo "Upload failed (HTTP $status)"; exit 1; }

# Proof that what is stored can be read back and decrypted to the exact dump.
status="$(api GET "object/authenticated/$bucket/$object")"
[ "$status" = 200 ] || { echo "Readback failed (HTTP $status)"; exit 1; }
mv "$body_file" "$work/readback.gpg"
cmp -s "$work/full.dump.gpg" "$work/readback.gpg" || { echo "Stored ciphertext differs from uploaded backup"; exit 1; }
gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt --output "$work/readback.dump" "$work/readback.gpg" 3<<<"$BACKUP_PASSPHRASE"
[ "$(sha256sum < "$work/readback.dump")" = "$(sha256sum < "$dump")" ] || { echo "Stored backup does not decrypt to the original dump"; exit 1; }

# Retention: remove encrypted backups older than the retention period, never the one just stored.
[ "$(api POST "object/list/$bucket" -H 'Content-Type: application/json' -d '{"prefix":"production/","limit":1000}')" = 200 ] || { echo "Listing failed"; exit 1; }
old="$(jq -c --arg keep "${object#production/}" --argjson days "$days" \
  '[.[] | select(.name != $keep and .created_at != null and ((.created_at | sub("\\.[0-9]+"; "") | sub("\\+00:00$"; "Z") | fromdateiso8601) < (now - $days * 86400))) | "production/" + .name]' "$body_file")"
removed=0
if [ "$old" != "[]" ]; then
  [ "$(api DELETE "object/$bucket" -H 'Content-Type: application/json' -d "{\"prefixes\":$old}")" = 200 ] || { echo "Retention cleanup failed"; exit 1; }
  removed="$(jq 'length' <<<"$old")"
fi
{ echo "stockage=bucket privé Supabase $bucket (texte chiffré AES-256 uniquement)"; echo "objet=$object"
  echo "type_cle_stockage=$key_type"
  echo "sha256_objet_chiffre=$(sha256sum "$work/full.dump.gpg" | cut -d' ' -f1)"; echo "relecture_et_dechiffrement=identique à la sauvegarde"
  echo "retention_jours=$days"; echo "anciennes_sauvegardes_supprimees=$removed"; } >> "$evidence/PREUVE.txt"
echo "Sauvegarde chiffrée stockée et relue : $bucket/$object (rétention $days jours, $removed ancienne(s) supprimée(s))"
