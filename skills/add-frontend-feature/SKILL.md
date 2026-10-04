---
name: add-frontend-feature
description: Add or expand a Bubllio CRM React feature that consumes the Django REST API. Use for pages, forms, queries, mutations, routes, and tenant-scoped frontend flows; not for backend-only changes or broad visual redesigns.
---

# Add a Frontend Feature

Read `frontend/AGENTS.md`, `docs/development/frontend-workflow.md`, and the
relevant backend serializer and view before changing the client. The server
contract and authorization rules are authoritative.

## Implementation boundary

Preserve this request path:

```text
page or component
  -> feature hook
  -> feature service
  -> src/services/api.ts
  -> Django REST API
```

- Put shared response and request types in `frontend/src/types/`.
- Put raw API calls in `frontend/src/features/<feature>/services/`.
- Put stable query keys, queries, mutations, cancellation signals, and
  invalidation in feature hooks.
- Include organization ID in every tenant URL and query key.
- Keep server state in TanStack Query and ephemeral UI state in components.
- Never create another Axios client or store API records in Zustand.
- Use TanStack Router typed routes rather than concatenated paths.

For new multi-field forms, use React Hook Form and Zod in the owning feature.
Send writable fields only; never send organization ownership because the backend
derives it from the authorized URL. Surface Django validation errors without
replacing them with client-only validation.

Use existing shared feedback, dialog, layout, branding, and theme primitives.
Do not add color or font literals or another theme provider. Provide loading,
empty, error, disabled or pending, and success behavior appropriate to the
operation.

## Tests and verification

Add focused Vitest coverage for schemas, services, or stateful behavior. Add or
update Playwright coverage when routing, authentication, tenant switching, or a
critical user flow changes.

Run from `frontend/`:

```bash
npm run format
npm run lint
npm run format:check
npm test
npm run build
```

Run `npm run test:e2e` for request, authentication, routing, or critical-flow
changes. Report commands and results; do not claim checks that were not run.
