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

All CRM API endpoints require authentication. For browser-based API testing, log
in at:

```text
http://127.0.0.1:8000/api-auth/login/
```

For Postman, use HTTP Basic authentication with the same local Django username
and password. Basic authentication must only be used over HTTPS outside local
development.

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

Local email does not go to a real inbox yet.

The project uses:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

That means emails are printed in the terminal where `runserver` is running.

## Environment Variables

The important environment variable right now is:

```text
DJANGO_SECRET_KEY
```

Production must set it. Local development has a non-production fallback so the project can run without extra setup.
