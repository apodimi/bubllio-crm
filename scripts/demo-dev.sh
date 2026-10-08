#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX_DIR="$PROJECT_ROOT/.local/demo"
SANDBOX_DB="$SANDBOX_DIR/db.sqlite3"
COMMAND="${1:-start}"

mkdir -p "$SANDBOX_DIR"

if [[ "$COMMAND" == "reset" ]]; then
  rm -f "$SANDBOX_DB" "$SANDBOX_DB-shm" "$SANDBOX_DB-wal"
elif [[ "$COMMAND" != "start" ]]; then
  printf 'Usage: ./scripts/demo-dev.sh [start|reset]\n' >&2
  exit 2
fi

export DATABASE_URL="sqlite:///$SANDBOX_DB"
export BUBLLIO_UPDATE_CHECK_ENABLED="false"
export DJANGO_DEBUG="true"
export DJANGO_SECURE_SSL_REDIRECT="false"
export DJANGO_SESSION_COOKIE_SECURE="false"
export DJANGO_CSRF_COOKIE_SECURE="false"

(cd "$PROJECT_ROOT" && uv run python src/manage.py migrate --noinput)
(cd "$PROJECT_ROOT" && uv run python src/manage.py seed_demo)

printf '\nDemo login: demo / demo-password\n\n'
exec "$PROJECT_ROOT/scripts/dev.sh"
