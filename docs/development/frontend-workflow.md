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

## Directory map

```text
frontend/src/
├── api/
│   ├── client.ts       Axios instance, JWT interceptors, request errors
│   ├── queries.ts      TanStack Query keys and query functions
│   ├── types.ts        public API response types
│   └── client.test.ts  small API/auth-state tests
├── app/
│   ├── auth.tsx        login/logout orchestration and React context
│   ├── authStore.ts    memory-only Zustand token/user state
│   ├── workspace.tsx   selected organization context
│   ├── queryClient.ts  TanStack Query client defaults
│   ├── router.tsx      application routes
│   ├── Layout.tsx      authenticated shell and navigation
│   └── theme.ts        Material UI theme
├── components/         reusable form/feedback components
└── pages/               route-level screens
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

## Adding a read-only page

1. Add or update the response type in `src/api/types.ts`.
2. Add a query key and `queryOptions` function in `src/api/queries.ts`.
3. Include the organization ID in both the URL and query key for tenant data.
4. Add a page under `src/pages/`.
5. Add its route in `src/app/router.tsx` and navigation entry in `Layout.tsx`.
6. Handle loading, empty, error, and successful states.
7. Add a browser test with a mocked API response.

Example query shape:

```ts
export const companiesQuery = (organizationId: string) => queryOptions({
  queryKey: keys.companies(organizationId),
  queryFn: ({ signal }) => request<Company[]>(
    organizationPath(organizationId) + 'companies/',
    { signal },
  ),
})
```

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
