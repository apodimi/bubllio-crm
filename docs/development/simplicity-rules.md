# Simplicity Rules

Bubllio uses Django REST Framework on the backend and React, TanStack Router,
TanStack Query, Axios, Zustand, Material UI, React Hook Form, and Zod on the
frontend. These tools already cover the application needs. New abstractions
must make an existing pattern easier to use; they must not be introduced only
to add another layer.

## Follow the shortest useful path

For a normal read or write, keep the path short:

```text
route → view → serializer → model
page → feature hook → feature service → api client
```

Add a service only when a business operation is reused, transactional, talks to
an external system, or is difficult to test inside a view. Examples are
invitation acceptance, SMTP delivery, ownership transfer, and automation
execution. Do not add a service that only calls one model method once.

Add a shared component only after the same UI behavior appears in at least two
features. Keep feature-specific components inside their feature. Avoid generic
components with configuration props for hypothetical future screens.

## One owner for each concern

- Django models and database constraints own persistent invariants.
- Serializers own API input and output validation.
- Views coordinate HTTP and choose the tenant capability.
- Services own reusable business operations and external side effects.
- React pages compose a screen; they do not call Axios or build API URLs.
- Feature hooks own TanStack Query keys, fetching, mutations, and invalidation.
- Zustand owns only client session state and small cross-screen client state.
- Material UI theme files own visual tokens and shared component defaults.

When a rule is needed in two layers, the backend remains authoritative. Frontend
validation improves feedback but never replaces serializer validation.

## Tenant context is always visible

Every organization-owned backend operation must resolve the organization from
the URL and the authenticated membership. Every frontend organization query
key and URL must include the organization ID. Never accept an organization ID
from a writable request body to decide ownership.

## Keep names literal

Prefer `useWorkspaceMembers`, `OrganizationInvitation`, and
`organizationService.createEmailAccount` over names such as `useResource`,
`DomainGateway`, or `CrudManager`. A contributor should know where code belongs
from its name and path without opening several files.

## A change is complete when it is easy to verify

Every new endpoint gets focused API tests for success, validation, authorization,
and tenant boundaries. Every new user flow gets a focused browser test. Keep
commands discoverable:

```bash
# frontend/
npm run format:check
npm run lint
npm test
npm run build
npm run test:e2e

# repository root
uv run python src/manage.py check
uv run python src/manage.py makemigrations --check --dry-run
uv run python src/manage.py test bubllio_crm organizations companies contacts automations
```

If a contributor cannot explain a module in one short paragraph, split the
module by responsibility before adding more behavior.
