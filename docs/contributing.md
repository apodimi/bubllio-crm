# Contributing to Bubllio CRM

Welcome. This guide is for anyone changing the repository, whether the change
is a one-line documentation fix or a new domain feature. It explains the
repository's mental model first, then gives a repeatable workflow.

## What this repository contains

Bubllio CRM is a Django REST API and an official React client in one monorepo:

```text
repository
├── src/                  Django backend and domain logic
├── frontend/             React/TypeScript client
├── docs/                 architecture, API, development, and walkthrough docs
├── skills/               focused implementation checklists
├── .github/workflows/    repository CI
├── pyproject.toml        Python dependency intent
└── uv.lock               exact Python dependency resolution
```

The backend is the source of truth for authentication, tenancy, permissions,
validation, and business behavior. The frontend is a replaceable client: it
should make the API easy to use, but it must never become a second place where
authorization or tenant rules are implemented.

## Before changing code

1. Read this guide and [Project Structure](project-structure.md).
2. Read the architecture page for the domain you will change:
   - CRM data: [CRM Domain](architecture/crm-domain.md)
   - authentication and roles: [Authentication and Roles](architecture/authentication-and-roles.md)
   - automations: [Automations](architecture/automations.md)
   - email: [Email Sending](architecture/email-adapters.md)
3. Check whether a focused workflow exists in `skills/`.
4. Search for the existing behavior before introducing a parallel abstraction.

The architecture documents describe implemented behavior unless they explicitly
label a section as planned. The [Automation Roadmap](architecture/automation-roadmap.md)
is intentionally not a list of available APIs.

## Local setup

From the repository root:

```bash
uv sync
uv run python src/manage.py migrate
uv run python src/manage.py createsuperuser
```

Start the backend in terminal one:

```bash
uv run python src/manage.py runserver 127.0.0.1:8000
```

Start the frontend in terminal two:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api/` to Django, so browser
requests remain same-origin during local development. The complete setup and
troubleshooting notes are in [Getting Started](getting-started.md).

## Choosing where code belongs

Use this decision table before adding a function:

| Question | Put it in |
|---|---|
| Is it a database invariant? | `models.py` or a database constraint |
| Does it validate request JSON? | `serializers.py` |
| Does it coordinate HTTP methods/status codes? | `views.py` |
| Is it reusable business behavior across views/signals? | a domain service, for example `services.py` |
| Is it a URL-to-view mapping? | the app's `urls.py` |
| Is it tenant/capability authorization? | `organizations/permissions.py` and its resolver helpers |
| Is it a React domain request/cache? | the owning `frontend/src/features/<feature>/api.ts` |
| Is it visual composition or navigation? | `frontend/src/pages/`, `components/`, or `routes/` |
| Is it a token/session state transition? | `frontend/src/features/auth/` |
| Is it an explanation of current behavior? | the matching `docs/` page |

Do not move business rules into React because a button needs to be hidden. A
hidden button is a usability improvement; the Django permission check is the
security boundary.

## Normal backend change

For a new REST resource, use this order:

```text
model → migration → admin registration → serializer and validation
  → permission/query scoping → view → app URL → tests
  → documentation and examples
```

Use UUIDs for public identifiers. For organization-owned data, resolve the
organization from the authenticated user and URL, then pass that resolved
organization into queries and saves. Never trust an incoming `organization`
field from the client.

When changing a model:

```bash
uv run python src/manage.py makemigrations
uv run python src/manage.py migrate
uv run python src/manage.py makemigrations --check --dry-run
```

Never edit an already-applied migration. Create a new migration instead.

## Normal frontend change

The frontend has three distinct kinds of state:

1. **Server state** belongs in TanStack Query. Examples: organizations,
   companies, contacts, automation rules, and run history.
2. **Authentication state** belongs in the Zustand store. Access and refresh
   tokens are memory-only; a page reload intentionally requires login again.
3. **Local UI state** belongs close to the component. Examples: dialog open
   state, search text, and selected form values.

Use the Axios wrapper in `frontend/src/services/api.ts` through the owning
feature's service and hook; do not create ad-hoc `fetch` or Axios clients in pages. Include
the organization ID in every
organization-owned URL and query key. After a successful mutation, invalidate
the affected TanStack Query key.

## Tests and verification

Run the smallest relevant test while iterating, then run the full checks before
opening a pull request:

```bash
# Backend
uv run python src/manage.py check
uv run python src/manage.py makemigrations --check --dry-run
uv run python src/manage.py test bubllio_crm organizations companies contacts automations

# Frontend
cd frontend
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser tests mock API traffic and do not write to the local CRM database.
The backend tests use an isolated test database. Run `migrate` separately when
you want to use the development SQLite database.

## Pull request checklist

Before asking for review, confirm:

- [ ] The change has a focused test or a documented reason a test is not useful.
- [ ] Tenant boundaries are preserved for create, list, update, and delete.
- [ ] New model changes have a new migration.
- [ ] API status codes and error shapes follow [REST API Patterns](api/rest-patterns.md).
- [ ] Frontend code uses the existing Axios, Zustand, and TanStack abstractions.
- [ ] Documentation says whether behavior is implemented or planned.
- [ ] README, Postman examples, and walkthroughs do not describe stale behavior.
- [ ] No database files, `.env` files, tokens, passwords, build output, or
      dependency directories are included.
- [ ] `git diff --check` and the full verification commands pass.

## Common mistakes

### “I added a field but the API does not show it”

The model and serializer are separate. Add the field to the serializer's
explicit `fields` list and add request validation if it is writable.

### “The user can see another organization's object”

Check both the organization resolver and the queryset. A UUID in a URL is not
authorization by itself. The authenticated user must have a membership, and
the resolved organization must be used in every query.

### “The frontend still shows old data after creating a record”

Invalidate the matching TanStack Query key after the mutation succeeds. Do not
manually duplicate server data in Zustand or component state.

### “Login works in tests but not after refreshing the browser”

That is expected for the current starter: tokens are intentionally memory-only.
If persistence is needed, document the security decision first; do not quietly
put tokens in localStorage.

### “I changed the automation roadmap and the feature appeared to work”

Roadmap diagrams are explanatory. A feature is supported only when there is an
implemented backend path, tests, and current documentation describing it.
