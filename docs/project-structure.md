# Project Structure

This document explains what each important file and folder does.

## Root Files

```text
bubllio-crm-api/
  .gitignore
  .python-version
  .env.example
  AGENTS.md
  README.md
  compose.yaml
  pyproject.toml
  uv.lock
  docs/
  frontend/
  skills/
  src/
```

## `frontend/`

The official, replaceable React client for the Django REST API. It is part of
this repository so backend and frontend changes can be reviewed together, while
remaining independently buildable and deployable.

It uses React, TypeScript, Vite, TanStack Query, TanStack Router, and Material UI.
The frontend owns navigation, presentation, forms, and server-state caching.
The API remains the source of truth for authentication, organization membership,
validation, capabilities, and business behavior.

Start with [Frontend Guide](../frontend/README.md). A developer who wants a
different UI can use the API directly; no frontend module is imported by Django.

The React source follows the feature-based structure documented in the frontend
guide, with separate top-level homes for routes, pages, shared infrastructure,
and reusable components:

```text
frontend/src/
  components/          common UI and layouts
  config/              application-level clients/configuration
  context/             shared React contexts
  features/
    auth/
    organizations/
    companies/
    contacts/
    automations/
  hooks/               globally reusable hooks
  pages/               route-level screens
  routes/              TanStack Router configuration
  services/            Axios and external communication
  styles/              theme and global styling
  types/               shared TypeScript domain types
```

Each business feature keeps domain hooks and service calls together. Pages stay
thin and compose feature hooks/components. Shared infrastructure does not own
domain behavior.

Brand inputs live in `frontend/src/styles/brand.ts`; the Material UI theme
derives variants and component defaults in `frontend/src/styles/theme.ts`.
Pages and components use semantic theme tokens rather than hardcoded colors.
See the [Theme Guide](../frontend/src/styles/README.md).

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
.idea/
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
- global API authentication and permission requirements

When we create a new app, we add it to `INSTALLED_APPS`.

Database URL parsing lives separately in `src/bubllio_crm/database.py`. With no
`DATABASE_URL` it selects SQLite; with a PostgreSQL URL it selects Django's
PostgreSQL backend. See `docs/development/databases.md`.

## `compose.yaml`

Provides the optional local PostgreSQL service. The Django application still runs
directly through `uv`, so SQLite users do not need Docker.

## `.env.example`

Documents safe local environment values. Copy it to the ignored `.env` file when
using PostgreSQL or other local overrides. Never put real secrets in the example.

## `src/bubllio_crm/urls.py`

Global project URLs.

This is where we define top-level routes such as:

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls")),
    path("api/v1/organizations/", include("organizations.urls")),
]
```

The global API prefix is:

```text
/api/v1/
```

Organization-owned apps are nested below an organization route so tenant context
comes from the URL and authenticated membership.

## `src/bubllio_crm/asgi.py` and `src/bubllio_crm/wsgi.py`

Server entrypoints.

At this stage we usually do not edit them.

## Django Apps

Each business domain should usually be a separate Django app.

Current apps:

```text
accounts/
access/
onboarding/
organizations/
companies/
contacts/
automations/
```

Simple apps usually have:

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

`organizations` represents the CRM workspace or tenant. Membership and
capability-based access rules live in the separate `access` app. Installation
setup and installation-wide administration live in the separate `onboarding`
app. Their existing models remain in `organizations/models.py` temporarily so
the migration history and database tables stay stable.

It also contains the general organization settings and SMTP email account
configuration used by the Django admin fallback dashboard.

`companies` represents external businesses stored inside an organization.

`contacts` represents people who belong to companies.

`automations` stores single-trigger, single-action rules and execution history.
It currently executes synchronously in Django; it is not yet a multi-step engine.

The entry point lives in `companies/signals.py`, registered by
`companies/apps.py`. It emits company creation to `automations/services.py`,
which selects same-organization active rules, executes the email action, and
records results. Views provide authorized list/create, run history, and manual
execution endpoints. See the [file-by-file map](architecture/automations.md).

The `organizations` app is larger than the simple example. Its
[file-by-file map](../src/organizations/README.md) separates HTTP handlers in
`api/`, reusable workflows in `services/`, and regression tests in `tests/`.
The app label and migrations remain unchanged.

Organization SMTP tests use `organizations/services/email_service.py`; automation emails
still use Django's global backend. The two paths are not connected yet.

Current route ownership:

```text
organizations/urls.py
  -> organization and membership endpoints
  -> includes company, contact, and automation routes below <organization_id>
```

## Documentation Map

- [Contributing Guide](contributing.md): repository mental model, change flow,
  testing, and pull request checklist.
- [System Overview](architecture/system-overview.md): request flow, domain
  ownership, and where to investigate behavior.
- [Getting Started](getting-started.md): install and run the application.
- [Frontend Workflow](development/frontend-workflow.md): React, Axios, Zustand,
  TanStack Query, and page/form conventions.
- [REST Authentication](api/authentication.md): JWT endpoints, curl examples,
  token rotation, and browser behavior.
- [First Automation](guides/first-automation.md): reproduce a complete event flow.
- [Automations](architecture/automations.md): implemented behavior and limitations.
- [Workflow Roadmap](architecture/automation-roadmap.md): future visual workflows.
- [Email Sending](architecture/email-adapters.md): console versus SMTP behavior.
- [Postman Guide](api-postman.md): authenticated requests and examples.

Architecture pages describe current code unless a section explicitly says
planned. A roadmap item is not a supported feature.

## Agent Files

`AGENTS.md` gives contributors and AI agents repository-wide context and
conventions. `skills/` contains focused, reusable workflows for common changes.
