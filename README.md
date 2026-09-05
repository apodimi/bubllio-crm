# Bubllio CRM API

Bubllio CRM API is an open-source CRM backend built with Django and Django REST Framework.

The project is intentionally documented as a learning project too: the code should grow step by step, with clear reasoning about where each piece belongs and why it exists.

## Current Stack

- Python 3.13
- Django
- Django REST Framework
- uv for dependency and virtualenv management
- zero-config SQLite or `DATABASE_URL`-configured PostgreSQL
- organization-scoped authentication and role-based access control

## Quick Start

Install dependencies:

```bash
uv sync
```

This uses SQLite without additional configuration. For local PostgreSQL:

```bash
docker compose up -d postgres
cp .env.example .env
# Uncomment DATABASE_URL in .env
uv sync --extra postgres
```

Run Django checks:

```bash
uv run python src/manage.py check
```

Apply migrations:

```bash
uv run python src/manage.py migrate
```

Run the development server:

```bash
uv run python src/manage.py runserver
```

Open:

```text
http://127.0.0.1:8000/api-auth/login/
http://127.0.0.1:8000/api/v1/organizations/
http://127.0.0.1:8000/admin/
```

## Environment Variables

Production secrets must not be committed to git.

The Django secret key is read from:

```text
DJANGO_SECRET_KEY
```

For local development, the project uses a non-production fallback. In production, always set:

```bash
export DJANGO_SECRET_KEY="your-real-secret-key"
```

Local email currently uses Django's console email backend, so automation emails are printed in the terminal where `runserver` is running.

## Current API

```text
GET  /api/v1/organizations/
POST /api/v1/organizations/
DELETE /api/v1/organizations/<id>/

GET  /api/v1/organizations/<id>/members/
POST /api/v1/organizations/<id>/members/
PATCH /api/v1/organizations/<id>/members/<membership-id>/
DELETE /api/v1/organizations/<id>/members/<membership-id>/

GET  /api/v1/organizations/<id>/settings/
PATCH /api/v1/organizations/<id>/settings/
GET  /api/v1/organizations/settings/options/
GET  /api/v1/organizations/<id>/email-accounts/
POST /api/v1/organizations/<id>/email-accounts/
POST /api/v1/organizations/<id>/email-accounts/<account-id>/test/

GET  /api/v1/organizations/<id>/companies/
POST /api/v1/organizations/<id>/companies/

GET  /api/v1/organizations/<id>/contacts/
POST /api/v1/organizations/<id>/contacts/

GET  /api/v1/organizations/<id>/automations/
POST /api/v1/organizations/<id>/automations/
GET  /api/v1/organizations/<id>/automations/runs/
POST /api/v1/organizations/<id>/automations/<automation-id>/test/
```

The settings options endpoint returns `{value, label}` pairs for every IANA
timezone available to the Python runtime and every locale configured in Django's
`LANGUAGES` setting. The frontend can use these directly for dropdowns; only the
selected values are stored in `OrganizationSettings`.

## Documentation

Start here:

- [Getting Started](docs/getting-started.md)
- [Project Structure](docs/project-structure.md)
- [Django Workflow](docs/development/django-workflow.md)
- [Database Setup](docs/development/databases.md)
- [Migrations](docs/development/migrations.md)
- [REST API Patterns](docs/api/rest-patterns.md)
- [Postman Guide](docs/api-postman.md)
- [CRM Domain Model](docs/architecture/crm-domain.md)
- [Authentication and Roles](docs/architecture/authentication-and-roles.md)
- [Automations Architecture](docs/architecture/automations.md)
- [Email Adapters Plan](docs/architecture/email-adapters.md)
- [AI Agent Guide](AGENTS.md)

Reusable workflows for AI-assisted contributions live in [`skills/`](skills/).
They cover CRM resources, automation triggers and actions, API tests, and project
verification.

## Common Commands

```bash
uv sync
uv add package-name
uv run python src/manage.py check
uv run python src/manage.py makemigrations
uv run python src/manage.py migrate
uv run python src/manage.py showmigrations
uv run python src/manage.py test bubllio_crm organizations companies contacts automations
uv run python src/manage.py runserver
uv run python src/manage.py createsuperuser
docker compose up -d postgres
```

## Current Status

Done:

- uv project setup
- Django project setup
- Django REST Framework enabled
- global `/api/v1/` URL prefix
- `organizations` app
- `companies` app
- `contacts` app
- `automations` app
- UUID public IDs
- admin registrations
- list/create APIs
- organization delete API
- basic search for companies and contacts
- automation trigger/action/run foundation
- `company.created` automation trigger
- `send_email` automation action
- Postman collection and local environment
- authenticated API access
- organization memberships with owner, admin, member, and viewer roles
- tenant-scoped CRM and automation endpoints
- automated authorization and tenant-isolation tests
- zero-config SQLite and `DATABASE_URL`-based PostgreSQL support
- local PostgreSQL Compose service
- UI-managed encrypted SMTP accounts and test-email endpoint

Next likely steps:

- user invitation flow
- production token authentication
- email adapter abstraction
- real SMTP provider support
- per-organization email settings
- MySQL database support and a multi-database CI matrix
