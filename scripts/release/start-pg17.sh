#!/usr/bin/env bash
# GitHub Actions only: starts a disposable PostgreSQL 17 container that provides both the client tools
# and the isolated restore server. The workspace is mounted at the same path. Nothing leaves the runner.
set -euo pipefail
password="$(openssl rand -hex 24)"; echo "::add-mask::$password"
docker run -d --name lmp-pg17 --network host -e POSTGRES_PASSWORD="$password" -v "$PWD:$PWD" -w "$PWD" postgres:17 \
  -c port=55432 -c listen_addresses=127.0.0.1 > /dev/null
for _ in $(seq 1 90); do docker exec lmp-pg17 pg_isready -q -h 127.0.0.1 -p 55432 -U postgres && ready=1 && break; sleep 1; done
[ "${ready:-}" = 1 ] || { echo "PostgreSQL 17 did not start"; exit 1; }
{ echo "PG_CONTAINER=lmp-pg17"; echo "DRILL_ADMIN_URL=postgresql://postgres:$password@127.0.0.1:55432/postgres"; } >> "$GITHUB_ENV"
docker exec lmp-pg17 psql --version
