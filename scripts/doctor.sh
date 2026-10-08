#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$PROJECT_ROOT/.uv-cache}"
failures=0

pass() { printf '✓ %s\n' "$1"; }
fail() { printf '✗ %s\n' "$1"; failures=$((failures + 1)); }

check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    pass "$1 available ($($1 --version 2>&1 | head -n 1))"
  else
    fail "$1 is not installed"
  fi
}

printf 'Bubllio development doctor\n\n'
check_command uv
check_command node
check_command npm

project_python="$(cd "$PROJECT_ROOT" && uv run python --version 2>&1)"
if [[ "$project_python" == Python\ 3.13.* ]]; then
  pass "Project Python is $project_python"
else
  fail "Project requires Python 3.13; uv selected $project_python"
fi

if [[ -d "$PROJECT_ROOT/.venv" ]]; then pass 'Python environment exists'; else fail 'Run uv sync'; fi
if [[ -d "$PROJECT_ROOT/frontend/node_modules" ]]; then pass 'Frontend dependencies exist'; else fail 'Run npm ci in frontend/'; fi

if (cd "$PROJECT_ROOT" && uv run python src/manage.py check >/dev/null 2>&1); then
  pass 'Django configuration and database connection work'
else
  fail 'Django check failed; run uv run python src/manage.py check'
fi

pending="$(cd "$PROJECT_ROOT" && uv run python src/manage.py showmigrations --plan 2>/dev/null | grep '\[ \]' || true)"
if [[ -z "$pending" ]]; then pass 'Database migrations are applied'; else fail 'Database has unapplied migrations'; fi

for port in 8000 5173; do
  if command -v lsof >/dev/null 2>&1 && lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    printf '! Port %s is already in use\n' "$port"
  else
    pass "Port $port is available"
  fi
done

if (( failures > 0 )); then
  printf '\nDoctor found %s blocking issue(s).\n' "$failures" >&2
  exit 1
fi

printf '\nDevelopment environment looks healthy.\n'
