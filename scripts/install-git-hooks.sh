#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$PROJECT_ROOT" && git config core.hooksPath .githooks)
printf 'Git hooks enabled from .githooks/.\n'
