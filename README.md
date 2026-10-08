<p align="center">
  <img src="frontend/src/assets/brand/bubllio-mark.png" alt="Bubllio logo" width="104" />
</p>

# Bubllio CRM

An open-source, self-hosted CRM for companies, contacts, sales, follow-ups,
services, billing, and workspace automation.

Bubllio combines a Django REST API with a React frontend. Each workspace is an
isolated tenant with its own members, permissions, CRM records, and settings.

## Run it locally

Requirements: Python 3.13, `uv`, and Node.js 22.12 or newer.

Terminal 1 — backend:

```bash
./scripts/bootstrap.sh
./scripts/dev.sh
```

The development script starts both backend and frontend. Open
`http://127.0.0.1:5173`.

For the initial administrator and workspace, follow the
[first-run setup](docs/getting-started.md#first-run-setup). SQLite works without
configuration; PostgreSQL setup is documented separately.

## What to read

| I want to… | Start here |
| --- | --- |
| Install and run Bubllio | [Getting started](docs/getting-started.md) |
| Deploy it for real users | [Production deployment](docs/development/production-deployment.md) |
| Deploy with Dokploy | [Dokploy guide](docs/development/dokploy-deployment.md) |
| Understand the product | [Business guides](docs/README.md#using-bubllio) |
| Contribute code | [Contributing](docs/contributing.md) |
| Find development commands | [Developer commands](docs/development/developer-experience.md) |
| Understand the architecture | [System overview](docs/architecture/system-overview.md) |
| Use the REST API | [API documentation](docs/README.md#api) |
| Find any other document | [Documentation home](docs/README.md) |

## Main technology

- Python 3.13, Django, and Django REST Framework
- SQLite for quick starts or PostgreSQL through `DATABASE_URL`
- React, TypeScript, Vite, TanStack Query/Router, and Material UI
- JWT authentication and workspace-scoped role-based access
- `uv` for Python dependencies and npm for frontend dependencies

## Roles in one minute

Installation access and workspace access are separate.

| Role | Scope | Purpose |
| --- | --- | --- |
| Installation administrator | Installation | Operates the server and grants workspace creation access. |
| Workspace creator | Installation | Creates a workspace and nominates its first owner. |
| Owner | Workspace | Controls ownership, administrators, settings, and data. |
| Admin | Workspace | Manages members, settings, automation, and CRM data. |
| Member | Workspace | Reads and adds CRM data. |
| Viewer | Workspace | Has read-only access. |

See [roles and access](docs/guides/roles-and-access.md) for the complete matrix.

## Common commands

```bash
./scripts/doctor.sh
./scripts/verify.sh fast
./scripts/verify.sh full
```

See [developer commands](docs/development/developer-experience.md) for demo,
onboarding, local email, and Git-hook workflows.

## Self-hosting

Production requires PostgreSQL, HTTPS, secure environment values, working email,
and tested backups. Do not infer production readiness from a successful local
run. Use the [production readiness guide](docs/development/pilot-production-readiness.md)
and the in-app installation checks before onboarding real data.

New versions are published through GitHub Releases. See the
[update guide](docs/development/updating.md) for backup, upgrade, and rollback
steps.

## Project status

The repository contains a working CRM and continues to evolve. Implemented
behavior is documented under architecture and guides. Planned work is kept under
roadmap and must not be treated as an existing feature.

Start at the [documentation home](docs/README.md) instead of reading every page
in order.
