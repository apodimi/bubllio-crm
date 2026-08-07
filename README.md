# Bubllio CRM API

Bubllio CRM API is an open-source CRM backend built with Django and Django REST Framework.

The project is intentionally documented as a learning project too: the code should grow step by step, with clear reasoning about where each piece belongs and why it exists.

## Current Stack

- Python 3.13
- Django
- Django REST Framework
- uv for dependency and virtualenv management
- SQLite for local development

## Quick Start

Install dependencies:

```bash
uv sync
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
http://127.0.0.1:8000/api/v1/
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

GET  /api/v1/companies/
GET  /api/v1/companies/?search=<term>
POST /api/v1/companies/

GET  /api/v1/contacts/
GET  /api/v1/contacts/?search=<term>
POST /api/v1/contacts/

GET  /api/v1/automations/
POST /api/v1/automations/
GET  /api/v1/automations/runs/
POST /api/v1/automations/<id>/test/
```

## Documentation

Start here:

- [Getting Started](docs/getting-started.md)
- [Project Structure](docs/project-structure.md)
- [Django Workflow](docs/development/django-workflow.md)
- [Migrations](docs/development/migrations.md)
- [REST API Patterns](docs/api/rest-patterns.md)
- [Postman Guide](docs/api-postman.md)
- [CRM Domain Model](docs/architecture/crm-domain.md)
- [Automations Architecture](docs/architecture/automations.md)
- [Email Adapters Plan](docs/architecture/email-adapters.md)

## Common Commands

```bash
uv sync
uv add package-name
uv run python src/manage.py check
uv run python src/manage.py makemigrations
uv run python src/manage.py migrate
uv run python src/manage.py showmigrations
uv run python src/manage.py runserver
uv run python src/manage.py createsuperuser
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

Next likely steps:

- email adapter abstraction
- real SMTP provider support
- per-organization email settings
- API tests
- authentication and permissions
