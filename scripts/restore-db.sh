#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Emerald — Restore Postgres DB from a gzipped SQL dump.
#
# Usage:
#   bash scripts/restore-db.sh backups/emerald_YYYYMMDD_HHMMSS.sql.gz
#
# WARNING: this pipes the dump into `psql` against the live database.
# Ensure the target database is in a state where the dump can be applied.
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.production.yml"
ENV_FILE="$REPO_ROOT/.env"

[[ $# -eq 1 ]] || { echo "Usage: $0 <backup.sql.gz>" >&2; exit 1; }
[[ -f "$1" ]]  || { echo "Backup file not found: $1" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE — run scripts/setup-production.sh first." >&2; exit 1; }

# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

gunzip -c "$1" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "${POSTGRES_USER:-emerald}" "${POSTGRES_DB:-emerald}"

echo "Restore complete."
