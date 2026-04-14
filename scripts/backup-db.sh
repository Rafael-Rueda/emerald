#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Emerald — Backup Postgres DB to a timestamped gzipped SQL dump.
#
# Usage:
#   bash scripts/backup-db.sh
#
# Output: backups/emerald_YYYYMMDD_HHMMSS.sql.gz (repo root)
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.production.yml"
ENV_FILE="$REPO_ROOT/.env"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE — run scripts/setup-production.sh first." >&2; exit 1; }

# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$REPO_ROOT/backups"
OUT="$OUT_DIR/emerald_${TIMESTAMP}.sql.gz"
mkdir -p "$OUT_DIR"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-emerald}" "${POSTGRES_DB:-emerald}" | gzip > "$OUT"

echo "Backup saved to $OUT"
