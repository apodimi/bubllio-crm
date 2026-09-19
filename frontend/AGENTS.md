# Frontend Rules

These rules apply to `frontend/` and are intentionally practical. They keep
the React client predictable as more contributors and pages are added.

## Requests are hooks at the UI boundary

React pages and reusable UI components must not call `request()` or create their
own Axios/fetch client. Network access follows this direction:

```text
component/page
  → domain hook in src/api/hooks.ts
    → queryOptions in src/api/queries.ts
      → request() in src/api/client.ts
        → Axios + JWT interceptors
```

Use a hook when a request is consumed by React:

```tsx
const companies = useCompanies(organizationId)
```

Keep the query definition separate from the hook. `queries.ts` owns the URL,
query key, response type, and abort signal. `hooks.ts` owns the React adapter.
This makes the request reusable and keeps caching behavior consistent.

Authentication is the exception because login/logout are user actions rather
than server-state queries. Keep those orchestration calls in `app/auth.tsx`,
and keep token state in `app/authStore.ts`.

## Query and mutation rules

- Use TanStack Query for all server state.
- Give every query a stable key from `src/api/queries.ts`.
- Include the organization ID in both tenant URL and query key.
- Pass TanStack Query's `signal` into the request hook.
- Use a mutation hook for writes; invalidate affected queries after success.
- Send writable fields only. Ownership comes from the authorized URL.
- Do not copy API data into Zustand or duplicate it in component state.
- Components may own ephemeral UI state such as dialog visibility and search
  text.

## Router rules

- Use TanStack Router for navigation and route params.
- Prefer typed route templates such as
  `to="/organizations/$organizationId/companies"` with `params`.
- Do not concatenate organization paths manually in JSX.
- Route guards improve navigation UX; Django remains the authorization source.

## Component rules

- Keep pages responsible for composition, not HTTP details.
- Put reusable request behavior in `src/api/hooks.ts` or a feature hook module.
- Keep shared visual behavior in `src/components/`.
- Show loading, empty, error, and success states for server-backed views.
- Hide unavailable actions for usability, but never treat hidden controls as
  authorization.

## Verification

Every request or routing change should pass:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```
