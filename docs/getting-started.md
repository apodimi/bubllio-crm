# Getting Started

This guide explains how to run Bubllio CRM API locally.

## Requirements

- Python 3.13
- uv
- Git

Docker is optional and is needed only for the provided local PostgreSQL service.

## Install Dependencies

From the project root:

```bash
uv sync
```

`uv sync` reads `pyproject.toml` and `uv.lock`, creates the virtual environment if needed, and installs the locked dependencies.

Without database configuration, the project uses SQLite. To use PostgreSQL, read
the [Database Setup](development/databases.md) guide and install its optional
driver with `uv sync --extra postgres`.

## Run Checks

```bash
uv run python src/manage.py check
```

Expected output:

```text
System check identified no issues (0 silenced).
```

This verifies that Django can load the project, settings, apps, models, and URL configuration.

## Apply Database Migrations

```bash
uv run python src/manage.py migrate
```

This creates or updates whichever database is selected by `DATABASE_URL`, or the
default local SQLite database when the variable is unset.

The local database file is ignored by git:

```text
src/db.sqlite3
```

## Create Admin User

```bash
uv run python src/manage.py createsuperuser
```

Use this account to log in to Django admin.

All CRM API endpoints require authentication. The REST API uses JWT access and
refresh tokens. For browser-based API testing, Django's admin/session login is
still available at:

```text
http://127.0.0.1:8000/api-auth/login/
```

For Postman, obtain a JWT pair from `POST /api/v1/auth/token/` with the same
local Django username and password, then send the access token as a Bearer
token. Use HTTPS outside local development.

## Run Server

```bash
uv run python src/manage.py runserver
```

Open:

```text
http://127.0.0.1:8000/admin/
http://127.0.0.1:8000/api-auth/login/
http://127.0.0.1:8000/api/v1/organizations/
```

## Local Email

Automation email uses console output by default.

The project uses:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

That means emails are printed in the terminal where `runserver` is running.

Organization SMTP accounts have a separate test endpoint that attempts real
delivery. Creating one does not change automation email behavior. See
[Email Sending](architecture/email-adapters.md) for that distinction and the
encryption key required when storing SMTP passwords.

## Try an Automation

Follow [Your First Automation](guides/first-automation.md) to create an active
rule, create a new company, and inspect the email output and run history.
Only `company.created` is automatically emitted today. No queue, worker, or
workflow server is needed. The future visual builder is described separately in
the [workflow roadmap](architecture/automation-roadmap.md).

## Environment Variables

Production must set:

```text
DJANGO_SECRET_KEY
```

Local development has a non-production fallback. Optional `DATABASE_URL` selects
the database; `BUBLLIO_EMAIL_ENCRYPTION_KEY` is needed for stored SMTP passwords.
See [Database Setup](development/databases.md) and [Email Sending](architecture/email-adapters.md).
