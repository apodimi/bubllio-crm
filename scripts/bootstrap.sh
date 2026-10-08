#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$PROJECT_ROOT/.uv-cache}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

require_command uv
require_command node
require_command npm

printf 'Installing backend dependencies...\n'
(cd "$PROJECT_ROOT" && uv sync --extra postgres)

printf 'Installing frontend dependencies...\n'
(cd "$PROJECT_ROOT/frontend" && npm ci)

printf 'Applying database migrations...\n'
(cd "$PROJECT_ROOT" && uv run python src/manage.py migrate --noinput)

printf 'Running Django checks...\n'
(cd "$PROJECT_ROOT" && uv run python src/manage.py check)

printf '\nBubllio is ready. Start it with ./scripts/dev.sh\n'
