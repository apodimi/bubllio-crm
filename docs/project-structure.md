# Project structure

Use this page as a code map. For implementation rules, follow the linked
workflow for the area you are changing.

## Top-level map

```text
bubllio-crm/
├── frontend/        React application
├── src/             Django project and business apps
├── docs/            operator, product, API, and architecture documentation
├── skills/          repeatable implementation and verification workflows
├── compose.yaml     local PostgreSQL service
├── Dockerfile       production backend image
├── pyproject.toml   Python dependencies and package metadata
└── uv.lock          locked Python dependency versions
```

Local databases, environment files, caches, build output, and editor state are
ignored. See the hygiene rules in [`AGENTS.md`](../AGENTS.md).

## Backend

`src/manage.py` is the Django command entry point. Project-wide configuration is
under `src/bubllio_crm/`; business behavior is split into Django apps.

| App | Owns |
| --- | --- |
| `accounts` | User-facing account behavior. |
| `access` | Memberships, roles, capabilities, and invitations. |
| `onboarding` | First-run setup and installation administration. |
| `organizations` | Workspaces, settings, and SMTP accounts. |
| `companies` | Customer organizations and company activity. |
| `contacts` | People related to companies. |
| `deals` | Sales opportunities and pipeline stages. |
| `activities` | Follow-ups, calls, meetings, and task state. |
| `subscriptions` | Services, recurring billing, charges, and payments. |
| `automations` | Automation rules, execution, and run history. |

Inside an app, keep responsibilities predictable:

```text
models.py / models/       persistent data and invariants
serializers.py            API input and output validation
api/ or views.py          HTTP coordination
services/                 reusable business workflows
urls.py                   routes
migrations/               schema history
tests/                    behavior and regression coverage
```

Read the [Django workflow](development/django-workflow.md) before adding backend
behavior. Tenant-scoped changes must also follow the repository tenant-boundary
rules.

## Frontend

The official React client lives in `frontend/` and is deployed independently
from Django.

```text
frontend/src/
├── components/      shared UI and application layouts
├── context/         shared React contexts
├── features/        domain hooks, services, schemas, and components
├── i18n/            language setup and translation JSON
├── pages/           route-level composition
├── routes/          TanStack Router configuration
├── services/        shared API client infrastructure
├── styles/          brand tokens and Material UI theme
└── types/           shared API/domain types
```

Frontend requests follow one direction:

```text
page/component → feature hook → feature service → shared API client → Django
```

Read the [frontend workflow](development/frontend-workflow.md) for forms,
queries, mutations, routing, and verification.

## Configuration

| File | Purpose |
| --- | --- |
| `.env.example` | Safe development placeholders and available settings. |
| `.env.production.example` | Production checklist without secrets. |
| `src/bubllio_crm/settings.py` | Django settings and installed apps. |
| `src/bubllio_crm/database.py` | `DATABASE_URL` parsing. |
| `compose.yaml` | Optional local PostgreSQL. |
| `compose.production.yaml` | Generic self-hosted production stack. |
| `compose.dokploy.yaml` | Dokploy production stack. |

Real `.env` files and credentials must never be committed.

## Where should a change go?

| Change | Primary location |
| --- | --- |
| New stored field or invariant | Owning Django model plus migration |
| API validation | Owning serializer |
| Reusable business operation | Owning service module |
| HTTP status/query coordination | View or API module |
| Raw frontend request | Feature service |
| Query caching/invalidation | Feature hook |
| Page layout and UI state | Page or feature component |
| Shared visual behavior | `frontend/src/components/` |
| Brand-wide visual token | `frontend/src/styles/brand.ts` |
| Current technical behavior | `docs/architecture/` |
| User workflow | `docs/guides/` |
| Future direction | `docs/roadmap/` |

When unsure, start at the [documentation home](README.md) or inspect the nearest
existing feature with the same shape.
