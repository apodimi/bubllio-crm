# Frontend Development Workflow

The frontend is a React/TypeScript/Vite client for the REST API. It is designed
to be easy to replace without changing the backend's domain ownership.

## Runtime responsibilities

The frontend owns:

- routes and navigation;
- layout, typography, responsive behavior, and Material UI composition;
- form state and user feedback;
- server-state fetching and cache invalidation through TanStack Query;
- attaching JWTs and handling one access-token refresh through Axios;
- presenting API validation and permission errors.

The frontend does not own:

- organization membership or role decisions;
- tenant selection during writes;
- CRM validation that must also protect non-browser clients;
- automation execution;
- persistence of access or refresh tokens.

## Request rule: hooks at the React boundary

Requests used by React should be exposed as hooks. This is a good practice here
because it gives every page the same cache, loading, error, cancellation, and
authentication behavior. It also keeps URLs and response types out of visual
components.

The layers are intentionally separate:

```text
page/component → feature hook → feature service → services/api.ts → Axios
```

`services/api.ts` is the low-level transport: it knows Axios, Bearer headers,
refresh, and API errors. A feature's `services/` folder owns its raw endpoint
calls. Its `hooks/` folder owns query keys, TanStack Query definitions, and React
hooks. Shared domain interfaces live in `types/`.

For example:

```tsx
const companies = useCompanies(organizationId)
```

A page should not contain `request('/organizations/...')`, create an Axios
instance, or manually manage `isLoading` and cache invalidation for a server
request. Login/logout remain an explicit exception because they are auth
orchestration actions; they live in `features/auth/hooks/useAuth.tsx` and use the
auth service.

See [Frontend Rules](../../frontend/AGENTS.md) for the enforceable checklist.

## Directory map

```text
frontend/src/
├── components/
│   ├── common/         reusable dialogs and feedback states
│   └── layout/         authenticated application shell
├── config/             TanStack Query client and app configuration
├── context/            shared React contexts
├── features/
│   ├── auth/           hooks, services, Zustand store
│   ├── organizations/ domain hooks and services
│   ├── companies/      domain hooks and services
│   ├── contacts/       domain hooks and services
│   └── automations/    domain hooks and services
├── hooks/               globally reusable hooks
├── pages/               route-level screens grouped by page
├── routes/              TanStack Router configuration
├── services/            Axios client and shared external services
├── styles/              Material UI theme
└── types/               shared TypeScript domain interfaces
```

## How authentication works

Login is a two-request flow:

1. `POST /api/v1/auth/token/` with username and password.
2. Store access and refresh tokens in Zustand memory.
3. `GET /api/v1/auth/me/` with the access token.
4. Store the returned user and organizations in the auth context/state.

Axios adds the access token to normal API requests. On a 401 it makes one
`POST /api/v1/auth/token/refresh/` request. Concurrent failed requests share
one refresh promise, which prevents a burst of expired requests from rotating
the refresh token multiple times. A successful rotation replaces both tokens;
failure clears the session.

Logout posts the refresh token to `/api/v1/auth/logout/`, then clears Zustand and
the TanStack Query cache even if the server call fails.

Tokens are intentionally memory-only. A future HttpOnly-cookie design must be
an explicit security decision and documented as an API/browser contract change.

## Theme and brand customization

The application has one Material UI ThemeProvider in `main.tsx`. Developers
customize the small set of intentional inputs in `src/styles/brand.ts`:

- primary and secondary brand colors;
- application background and surface;
- primary and muted text;
- font family;
- base border radius.

`src/styles/theme.ts` derives light/dark primary variants, dividers, action
states, table styles, and shared component defaults. Pages and components use
semantic palette paths instead of color literals. This lets a self-hosting team
replace the base palette without searching through the application.

The detailed contract and agent rules are in
[`src/styles/README.md`](../../frontend/src/styles/README.md).

## Adding a read-only page

1. Add or update the response type in `src/types/`.
2. Add the raw endpoint call in the feature's `services/` folder.
3. Add the query key, `queryOptions`, and hook in the feature's `hooks/` folder.
4. Include the organization ID in both the URL and query key for tenant data.
5. Add a named `*Page.tsx` under `src/pages/<PageName>/`.
6. Add its route in `src/routes/router.tsx` and navigation entry in the layout.
7. Handle loading, empty, error, and successful states.
8. Add a browser test with a mocked API response.

Example query shape:

```ts
export const companyKeys = {
  byOrganization: (organizationId: string) =>
    ['organizations', organizationId, 'companies'] as const,
}

const companiesQuery = (organizationId: string) => queryOptions({
  queryKey: companyKeys.byOrganization(organizationId),
  queryFn: ({ signal }) => companyService.list(organizationId, signal),
})

export const useCompanies = (organizationId: string) =>
  useQuery(companiesQuery(organizationId))
```

The query definition may remain private. Export the hook and key factory through
the feature's `index.ts`. Route pages are imported directly by the router so
lazy loading is not defeated by a feature barrel imported elsewhere.

## Adding a create form

Use the shared `CreateDialog` when the form is a simple POST:

1. Render the form only when the current capability allows it.
2. Treat that visibility as UX, not security.
3. Send writable fields only; never send an organization ID supplied by a
   workspace selector.
4. Display field-level API validation errors.
5. Invalidate the affected query after a 2xx response.
6. Test both success and a representative 400 response.

The backend remains authoritative when a viewer calls the endpoint directly.

## Local commands

From `frontend/`:

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite mocks `/api/v1/` traffic. It verifies UI behavior and tenant
separation without requiring a running Django server.

## TanStack Router conventions

Routes are defined in `src/routes/router.tsx` with TanStack Router's code-based
route tree. The root route owns the shell, the organization route owns the
`$organizationId` parameter, and child routes own overview, companies,
contacts, and automations screens.

Use route templates and params for dynamic navigation:

```tsx
<Link
  to="/organizations/$organizationId/companies"
  params={{ organizationId: organization.id }}
>
  Companies
</Link>
```

This is preferable to concatenating `/organizations/` strings because the
router can type-check the route and its required parameters. When a component
library's polymorphic `component={Link}` type cannot express TanStack params,
wrap the visual component in a typed TanStack `Link` and keep the visual child
non-interactive.

Workspace routes use `beforeLoad` to redirect unauthenticated sessions to the
public root route. The backend still performs the real authorization check when
the workspace data is fetched; the router guard is only a navigation and UX
boundary.
