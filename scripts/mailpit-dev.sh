#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$PROJECT_ROOT" && docker compose up -d mailpit)

export DJANGO_EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend"
export DJANGO_EMAIL_HOST="127.0.0.1"
export DJANGO_EMAIL_PORT="${MAILPIT_SMTP_PORT:-1025}"
export DJANGO_EMAIL_USE_TLS="false"
export DJANGO_EMAIL_USE_SSL="false"
export DJANGO_DEFAULT_FROM_EMAIL="Bubllio CRM <noreply@bubllio.test>"

printf 'Mailpit inbox: http://127.0.0.1:%s\n' "${MAILPIT_UI_PORT:-8025}"
exec "$PROJECT_ROOT/scripts/dev.sh"
