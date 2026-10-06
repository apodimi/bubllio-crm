#!/bin/sh
set -eu

.venv/bin/python src/manage.py migrate --noinput
.venv/bin/python src/manage.py collectstatic --noinput

exec .venv/bin/gunicorn bubllio_crm.wsgi:application \
    --chdir src \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile /dev/null \
    --error-logfile -
