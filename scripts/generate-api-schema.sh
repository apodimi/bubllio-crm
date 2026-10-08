#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_PATH="${1:-$PROJECT_ROOT/.local/openapi.yaml}"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$PROJECT_ROOT/.uv-cache}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

cd "$PROJECT_ROOT"
uv run python src/manage.py spectacular --validate --file "$OUTPUT_PATH"
printf 'OpenAPI schema written to %s\n' "$OUTPUT_PATH"
