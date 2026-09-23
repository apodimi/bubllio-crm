<p align="center">
  <img src="frontend/src/assets/brand/bubllio-mark.png" alt="Bubllio logo" width="104" />
</p>

# Bubllio CRM

Bubllio CRM is an open-source CRM with a Django REST API and a React frontend.

The project is intentionally documented as a learning project too: the code should grow step by step, with clear reasoning about where each piece belongs and why it exists.

## Roles at a glance

Installation access and workspace access are separate. One person can have a
different role in each workspace; creating a workspace does not grant access to
every other workspace.

| Role | Scope | Main responsibility |
| --- | --- | --- |
| Installation administrator | Whole installation | Configure installation settings, invite other IT admins, and grant workspace-creator access. |
| Workspace creator | Whole installation, limited | Create shared workspaces and nominate their first owner; no automatic access to other workspaces or Django admin. |
| Owner | One workspace | Full workspace management, including administrator appointments, ownership transfer, and deletion. |
| Admin | One workspace | Manage workspace settings, SMTP, automations, members, and CRM data, but not ownership. |
| Member | One workspace | Read and add CRM data. |
| Viewer | One workspace | Read-only access to CRM data and automation history. |

The first setup user is an installation administrator **and** owner of the
first workspace. For the exact permission matrix, invitation flow, and security
limits, see [Roles and Access](docs/guides/roles-and-access.md).

## Current Stack

- Python 3.13
- Django
- Django REST Framework
- uv for dependency and virtualenv management
- zero-config SQLite or `DATABASE_URL`-configured PostgreSQL
- REST JWT authentication with organization-scoped role-based access control
- React, TypeScript, Vite, TanStack Query/Router, and Material UI frontend
  in `frontend/`

## Quick Start

Install dependencies:

```bash
uv sync
```

The backend and official frontend live in this repository as a monorepo. To run
the frontend, use Node 22.12+ in a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api/` to the Django server at
`http://127.0.0.1:8000`. The frontend is an official client of the REST API;
contributors may replace its UI without changing backend ownership or rules.
See [Frontend Guide](frontend/README.md).

For a fresh installation, the optional first-run screen can create the initial
Django admin, workspace, and SMTP account. Set a random server-side
`BUBLLIO_SETUP_TOKEN` before starting, then follow
[Getting Started](docs/getting-started.md). With no token, the standard
`createsuperuser` command remains available; existing installations never expose
the first-run form.

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

REST authentication endpoints:

```text
POST /api/v1/auth/token/
POST /api/v1/auth/token/refresh/
GET  /api/v1/auth/me/
POST /api/v1/auth/logout/
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
GET  /api/v1/organizations/<id>/invitations/
POST /api/v1/organizations/<id>/invitations/
PATCH /api/v1/organizations/<id>/members/<membership-id>/
DELETE /api/v1/organizations/<id>/members/<membership-id>/

GET  /api/v1/organizations/installation-admin-invitations/
POST /api/v1/organizations/installation-admin-invitations/
GET  /api/v1/organizations/workspace-creators/
POST /api/v1/organizations/workspace-creators/
DELETE /api/v1/organizations/workspace-creators/<grant-id>/
GET  /api/v1/organizations/provisioning/
POST /api/v1/organizations/provisioning/<organization-id>/
DELETE /api/v1/organizations/provisioning/<organization-id>/

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

Installation admins can grant an existing user workspace-creator access without
making them a Django superuser. Workspace creation accepts `owner_email`. A
workspace nominated for somebody else stays inaccessible until that person
accepts the emailed owner invitation; its creator can resend or cancel the
pending handoff. See [Authentication and Roles](docs/architecture/authentication-and-roles.md).

## Documentation

Start here:

- [Getting Started](docs/getting-started.md)
- [Contributing Guide](docs/contributing.md)
- [System Overview](docs/architecture/system-overview.md)
- [Project Structure](docs/project-structure.md)
- [Django Workflow](docs/development/django-workflow.md)
- [Frontend Workflow](docs/development/frontend-workflow.md)
- [Database Setup](docs/development/databases.md)
- [Migrations](docs/development/migrations.md)
- [REST API Patterns](docs/api/rest-patterns.md)
- [REST Authentication](docs/api/authentication.md)
- [Postman Guide](docs/api-postman.md)
- [CRM Domain Model](docs/architecture/crm-domain.md)
- [Authentication and Roles](docs/architecture/authentication-and-roles.md)
- [Roles and Access — Plain-language Guide](docs/guides/roles-and-access.md)
- [Workspace Access Model: Research and Proposed Direction](docs/research/access-model-comparison.md)
- [Automations Architecture](docs/architecture/automations.md)
- [Try Your First Automation](docs/guides/first-automation.md)
- [Workflow Roadmap — Planned, Not Implemented](docs/architecture/automation-roadmap.md)
- [Email Sending: Current Behavior and Direction](docs/architecture/email-adapters.md)
- [AI Agent Guide](AGENTS.md)

Reusable workflows for AI-assisted contributions live in [`skills/`](skills/).
They cover CRM resources, automation triggers and actions, API tests, and project
verification.

## Understanding Automations

Today an active rule means: when a company is created in this organization,
send one fixed email and record its result. It runs synchronously in Django;
no additional service is required. The checked-in backend prints automation
messages to the console.

Only `company.created` is automatically dispatched, although the API currently
accepts additional, unwired trigger choices. Organization SMTP accounts can send
real test emails through their own endpoint, but are not yet used by automations.
The automation test endpoint performs the action; it is not a dry run.

Our direction is a future visual builder with one trigger and ordered actions,
built incrementally on the existing Django stack. Multi-step execution, contact
creation actions, waiting, and the visual UI are not implemented. Start with the
[walkthrough](docs/guides/first-automation.md), then read the
[current architecture](docs/architecture/automations.md) and the separate
[roadmap](docs/architecture/automation-roadmap.md).

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
- authenticated API access with short-lived JWT access tokens and refresh-token logout
- organization memberships with owner, admin, member, and viewer roles
- tenant-scoped CRM and automation endpoints
- automated authorization and tenant-isolation tests
- zero-config SQLite and `DATABASE_URL`-based PostgreSQL support
- local PostgreSQL Compose service
- organization settings and encrypted SMTP account APIs, Django admin forms,
  and a real SMTP test-email endpoint

Next likely steps:

- user invitation flow
- an optional HttpOnly-cookie refresh transport for production browser deployments
- automation validation and event-path test coverage
- connect automation email actions to existing organization SMTP accounts
- ordered workflow steps and, later, a visual builder (see the workflow roadmap)
- additional email providers if required
- MySQL database support and a multi-database CI matrix
