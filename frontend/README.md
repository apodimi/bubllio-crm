# Bubllio CRM Web

The React frontend for the fixed-domain [Bubllio CRM API](https://github.com/apodimi/bubllio-crm-api).
This is a separate application within the monorepo, not a Django admin theme or the older dynamic-model Bubllio Web.

## Stack

React + TypeScript + Vite, TanStack Router for navigation, TanStack Query for
server state, Material UI with Emotion, Axios for HTTP, and Zustand for in-memory
authentication state. There is no additional authentication provider.

## Run locally

Use Node 22.12+ (Node 22 is specified in .nvmrc) and npm.

Start the Django backend in its own repository:

```bash
uv sync
uv run python src/manage.py migrate
uv run python src/manage.py createsuperuser
uv run python src/manage.py runserver 127.0.0.1:8000
```

In this repository:

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:5173 and sign in with your Django username and password.
Create a workspace, add companies, and then add contacts linked to those companies.
No seed data or external auth account is required.

Defaults work without an environment file. To change the development API target,
copy .env.example to .env and change API_PROXY_TARGET. Restart Vite after changing
configuration. VITE_API_BASE_PATH is a same-origin path, normally /api/v1.

## Implemented

- Login/logout using the backend's REST JWT endpoints.
- Organization listing, creation, selection and direct workspace URLs.
- Workspace overview with live company/contact/enabled-rule counts.
- Company and contact lists, local search and creation forms.
- Read-only automation rules and run history.
- Responsive MUI shell, loading/error/empty states and server validation messages.
- Viewer roles cannot see create-company/contact controls; backend authorization
  remains authoritative. Null current_user_role represents superuser in the current API.

There are no fake production records or dashboard statistics. Browser tests use
isolated mocked API responses. Editing/deleting CRM records, member management,
email settings and the visual workflow editor are not part of this first slice.
Those features must follow supported backend endpoints.

## Authentication

The backend exposes SimpleJWT endpoints at /api/v1/auth/token/,
/api/v1/auth/token/refresh/, /api/v1/auth/me/, and /api/v1/auth/logout/.
The frontend keeps access and refresh tokens only in Zustand memory. It never
persists credentials in localStorage, sessionStorage, cookies, or environment
files. Refreshing the page requires signing in again.

Axios attaches the Bearer access token, retries one unauthorized request after
refreshing it, and clears the Zustand session when refresh fails. Logout calls
the backend blacklist endpoint and clears the TanStack Query cache.

Do not put secrets in VITE_* variables: they are public browser configuration.

## Structure and extension

For the full contributor workflow, including state ownership and how to add a
page or create form, read [Frontend Workflow](../docs/development/frontend-workflow.md).
The local frontend rules are in [AGENTS.md](AGENTS.md), including the request-
as-hook convention.

The top-level organization follows the
[Recommended Industry-Standard React.js Folder Structure](https://dev.to/pramod_boda/recommended-folder-structure-for-react-2025-48mc),
adapted for TypeScript, TanStack Router/Query, Axios, Zustand, and this project's
current size. We create a documented category when it has real code; we do not
commit empty placeholder directories.

```text
src/
  components/   Common UI and application layouts
  features/     Domain hooks, services, auth store and public exports
  pages/        Route-level screens
  routes/       TanStack Router configuration
  services/     Shared Axios client
  hooks/        Global reusable hooks
  context/      Shared React contexts
  config/       Query client and application configuration
  styles/       Material UI theme and future global styles
  types/        Shared TypeScript domain types
e2e/            Browser tests with mocked API
```

To add a domain, put raw requests under `features/<feature>/services/` and
TanStack Query hooks under `features/<feature>/hooks/`. Add its shared types to
`types/`, its route-level screen to `pages/`, and its lazy route to
`routes/router.tsx`. Every organization-owned query key and URL must include the
organization ID. Pass TanStack's AbortSignal through the Axios request wrapper.

Create forms POST only writable fields; ownership comes from the authorized URL.
Successful mutations invalidate the affected query. Backend validation errors
are shown in the dialog. Business rules and tenant checks stay in Django.

Change the human-selected palette in `styles/brand.ts`. Derived colors and
global Material UI defaults live in `styles/theme.ts`. Read the
[Theme Guide](src/styles/README.md) before changing visual tokens. The backend
does not import or depend on this frontend.

## Verify

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests start Vite automatically and mock API traffic; they do not send
email or write to a real CRM database. They cover tenant switching, role-based
controls, creation/validation, login/logout and mobile navigation.

## Deployment

Build with npm run build and serve dist/. Configure SPA fallback to index.html
for frontend routes, and proxy /api/ to Django before applying that fallback.
Vite's development proxy is not part of the production bundle. Use HTTPS,
forward Authorization headers and preserve API error responses.

Keep frontend and API under the same public origin. Separate repositories do not
require cross-origin browser requests. This application does not change Django's
production settings; configure its hosts, secrets and deployment security separately.

References: [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys),
[MUI installation](https://mui.com/material-ui/getting-started/installation/),
[Vite proxy](https://vite.dev/config/server-options.html#server-proxy).
