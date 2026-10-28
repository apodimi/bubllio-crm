---
name: crm-onboarding-ux
description: Improve Bubllio CRM first-run, invitation acceptance, login recovery, and installation-admin handoff in the React client without changing Django authority.
---

# CRM onboarding UX

Read `frontend/AGENTS.md`, `docs/architecture/authentication-and-roles.md`,
`docs/api/authentication.md`, and the relevant `frontend/src/features/` flow.
Use `add-frontend-feature` for ordinary page and form mechanics; this skill
adds the account and installation journey constraints.

## Actual identity flow

- CRM currently uses Django users, SimpleJWT, and Django organization
  memberships. Its invitations are not Keycloak or Core invitations.
- There is no general public signup. A new member creates an account through
  a seven-day, email-bound invitation. An existing user signs in with the
  invited email before accepting. A consumed, expired, or revoked invitation
  grants no access.
- An installation administrator can create a shared workspace and nominate
  its first owner. A pending handoff is hidden from ordinary CRM routes until
  acceptance. Installation administration and workspace membership are
  separate authorities.
- The first-run setup endpoint closes after successful initialization. Do not
  route an established account back into setup because a browser session
  expired or an API request briefly failed.

Use server state for step availability and recoverable errors. Show one next
action, keep progress legible on phone and desktop, preserve form values when
moving backward, and make pending email or invitation work explicit. A loading
state must be visible during auth initialization; session expiry should lead to
sign-in without suggesting that installation data disappeared. Never request
the setup token again after the backend has completed its one-time ceremony.

Use existing MUI theme, React Hook Form/Zod, TanStack Query, and the project
Iconify wrapper. Keep client validation helpful while Django serializers and
permission checks remain authoritative. Cover the relevant success, pending,
expired, denied, and retry paths with focused frontend tests and a browser
journey when routing or auth changes.
