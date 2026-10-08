#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX_DIR="$PROJECT_ROOT/.local/onboarding"
SANDBOX_DB="$SANDBOX_DIR/db.sqlite3"
COMMAND="${1:-start}"

show_help() {
  cat <<'EOF'
Test Bubllio's first-run onboarding without touching the normal development database.

Usage:
  ./scripts/onboarding-dev.sh reset   Start with a brand-new onboarding database
  ./scripts/onboarding-dev.sh start   Resume the current onboarding sandbox
  ./scripts/onboarding-dev.sh path    Print the sandbox database path
  ./scripts/onboarding-dev.sh help    Show this help
EOF
}

case "$COMMAND" in
  reset)
    mkdir -p "$SANDBOX_DIR"
    rm -f "$SANDBOX_DB" "$SANDBOX_DB-shm" "$SANDBOX_DB-wal"
    ;;
  start)
    mkdir -p "$SANDBOX_DIR"
    ;;
  path)
    printf '%s\n' "$SANDBOX_DB"
    exit 0
    ;;
  help | --help | -h)
    show_help
    exit 0
    ;;
  *)
    printf 'Unknown command: %s\n\n' "$COMMAND" >&2
    show_help >&2
    exit 2
    ;;
esac

export DATABASE_URL="sqlite:///$SANDBOX_DB"
export BUBLLIO_SETUP_TOKEN
export BUBLLIO_EMAIL_ENCRYPTION_KEYS
export BUBLLIO_UPDATE_CHECK_ENABLED="false"

BUBLLIO_SETUP_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
BUBLLIO_EMAIL_ENCRYPTION_KEYS="$(python3 -c 'import base64, secrets; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())')"

printf '\nBubllio onboarding sandbox\n'
printf 'Database: %s\n' "$SANDBOX_DB"
printf 'Setup token: %s\n' "$BUBLLIO_SETUP_TOKEN"
printf 'Open: http://127.0.0.1:5173\n\n'
printf 'This sandbox is isolated from the normal development database.\n'
printf 'Run ./scripts/onboarding-dev.sh reset whenever you need a fresh setup.\n\n'

exec "$PROJECT_ROOT/scripts/dev.sh"
