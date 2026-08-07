# Project Structure

This document explains what each important file and folder does.

## Root Files

```text
bubllio-crm-api/
  .gitignore
  .python-version
  README.md
  pyproject.toml
  uv.lock
  docs/
  src/
```

## `pyproject.toml`

Defines the Python project.

It contains:

- project name
- Python version requirement
- dependencies
- build backend

When we need a new package:

```bash
uv add package-name
```

## `uv.lock`

Locks the exact dependency versions.

`pyproject.toml` says what we want. `uv.lock` says exactly what was installed.

We commit `uv.lock` to git so other developers get the same dependency versions.

## `.python-version`

Defines the Python version for this project.

## `.gitignore`

Tells git what not to track.

Important ignored files:

```text
.venv/
__pycache__/
*.pyc
src/db.sqlite3
.env
.DS_Store
```

## `src/manage.py`

The Django command-line entrypoint.

We use it for:

```bash
uv run python src/manage.py check
uv run python src/manage.py runserver
uv run python src/manage.py migrate
uv run python src/manage.py makemigrations
uv run python src/manage.py createsuperuser
```

## `src/bubllio_crm/settings.py`

Project settings.

This file controls:

- installed apps
- database
- middleware
- timezone
- static files
- email backend
- Django REST Framework activation

When we create a new app, we add it to `INSTALLED_APPS`.

## `src/bubllio_crm/urls.py`

Global project URLs.

This is where we define top-level routes such as:

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include([
        path("organizations/", include("organizations.urls")),
        path("companies/", include("companies.urls")),
        path("contacts/", include("contacts.urls")),
        path("automations/", include("automations.urls")),
    ])),
]
```

The global API prefix is:

```text
/api/v1/
```

Each app adds its own paths under that prefix.

## `src/bubllio_crm/asgi.py` and `src/bubllio_crm/wsgi.py`

Server entrypoints.

At this stage we usually do not edit them.

## Django Apps

Each business domain should usually be a separate Django app.

Current apps:

```text
organizations/
companies/
contacts/
automations/
```

An app usually has:

```text
models.py       -> database models
serializers.py  -> model <-> JSON conversion
views.py        -> API behavior
urls.py         -> app routes
admin.py        -> Django admin registration
apps.py         -> app configuration
migrations/     -> database schema changes
tests.py        -> tests
```

## Current App Responsibilities

`organizations` represents the CRM workspace or tenant.

`companies` represents external businesses stored inside an organization.

`contacts` represents people who belong to companies.

`automations` represents workflow rules, actions, and execution history.
