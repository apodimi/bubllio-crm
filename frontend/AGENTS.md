# Frontend Rules

These rules apply to `frontend/` and are intentionally practical. They keep
the React client predictable as more contributors and pages are added.

## Requests are hooks at the UI boundary

React pages and reusable UI components must not call `request()` or create their
own Axios/fetch client. Network access follows this direction:

```text
component/page
  → domain hook in src/features/<feature>/hooks/
    → feature service in src/features/<feature>/services/
      → request() in src/services/api.ts
        → Axios + JWT interceptors
```

Use a hook when a request is consumed by React:

```tsx
const companies = useCompanies(organizationId)
```

Keep query keys and TanStack Query behavior in the owning feature's `hooks/`.
Keep raw domain API calls in the feature's `services/`. Shared response
interfaces live in `src/types/`.

Authentication is the exception because login/logout are user actions rather
than server-state queries. Keep those orchestration calls in
`features/auth/hooks/useAuth.tsx`, and keep token state in
`features/auth/store/authStore.ts`.

The first-run setup request follows the same hook → service → Axios path under
`features/setup/`. Never put `BUBLLIO_SETUP_TOKEN` or SMTP credentials in source,
localStorage, query strings, or `VITE_*` environment variables. The backend is
the authority on whether setup is available.

## Query and mutation rules

- Use TanStack Query for all server state.
- Give every query a stable key from its feature hook module.
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
- Put query behavior in feature `hooks/` and raw requests in feature `services/`.
- Keep shared visual behavior in `src/components/common/`.
- Render the Bubllio identity with `components/common/BrandLogo.tsx`; do not
  duplicate the mark or wordmark in individual pages.
- Show loading, empty, error, and success states for server-backed views.
- Hide unavailable actions for usability, but never treat hidden controls as
  authorization.

## Form rules

- New multi-field forms should use React Hook Form for field state and Zod for
  client-side validation. Keep the schema in the owning feature, not the page.
- Use a small feature-local field component to connect MUI inputs to React Hook
  Form and show validation errors inline. Put labels above inputs and explain
  domain-specific terms in helper text.
- Multi-step forms should validate only the current step before continuing,
  retain entered values when moving backward, and validate the full payload on
  final submission. Hidden optional fields must not block submission.
- The first-run wizard in `features/setup/` is the working example. Existing
  company/contact dialogs have not yet been migrated to React Hook Form; keep
  their current behavior until that work is explicitly requested.
- Client validation is for fast feedback. Django serializers remain the final
  authority, and server validation errors must still be displayed.

## Theme rules

- `src/styles/brand.ts` is the only place for manually selected brand colors,
  body/display font stacks, and base radius.
- Manrope is the display face and Inter is the body face. Load font weights in
  `src/styles/fonts.ts`; do not add font-family literals to UI components.
- `src/styles/theme.ts` derives variants and composes the final MUI theme.
- Every application-wide MUI component override belongs in its own kebab-case
  file under `src/styles/components/` and must be registered in that folder's
  `index.ts`.
- Pages, features, and components must not contain hex, RGB, HSL, or named color
  literals.
- Use semantic palette paths such as `primary.main`, `text.secondary`,
  `background.paper`, `divider`, and `action.selected`.
- Use an `sx` callback with MUI `alpha`, `lighten`, or `darken` when a semantic
  derived value is needed.
- Never add a second ThemeProvider or a feature-specific theme.
- Read `src/styles/README.md` before changing visual tokens.

## Verification

Every request or routing change should pass:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```
