#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-fast}"
BACKEND_APPS=(bubllio_crm organizations access onboarding companies contacts deals subscriptions accounts activities automations delivery)
export UV_CACHE_DIR="${UV_CACHE_DIR:-$PROJECT_ROOT/.uv-cache}"

if [[ "$MODE" != "fast" && "$MODE" != "full" ]]; then
  printf 'Usage: ./scripts/verify.sh [fast|full]\n' >&2
  exit 2
fi

printf 'Backend checks...\n'
(cd "$PROJECT_ROOT" && uv run python src/manage.py check)
(cd "$PROJECT_ROOT" && uv run python src/manage.py makemigrations --check --dry-run)
(cd "$PROJECT_ROOT" && uv run python src/manage.py spectacular --validate --file "$PROJECT_ROOT/.local/openapi.yaml")
(cd "$PROJECT_ROOT" && uv run python src/manage.py test "${BACKEND_APPS[@]}")

printf 'Frontend checks...\n'
(cd "$PROJECT_ROOT/frontend" && npm run lint)
(cd "$PROJECT_ROOT/frontend" && npm test)

if [[ "$MODE" == "full" ]]; then
  (cd "$PROJECT_ROOT" && uv run python scripts/check_release_version.py)
  (cd "$PROJECT_ROOT/frontend" && npm run build)
  (cd "$PROJECT_ROOT/frontend" && npm run test:e2e)
  (cd "$PROJECT_ROOT/email_templates" && npm ci && npm run build)
  (cd "$PROJECT_ROOT" && git diff --exit-code -- src/organizations/templates/emails/transactional.html)
fi

printf '\nVerification (%s) passed.\n' "$MODE"
