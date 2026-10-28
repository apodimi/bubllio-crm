---
name: crm-identity-transition
description: Plan or review the additive Bubllio CRM transition from Django SimpleJWT and memberships to Keycloak identity and Core app access; use only when suite integration is in scope.
---

# CRM identity transition

Start with `docs/architecture/authentication-and-roles.md`,
`docs/api/authentication.md`, `docs/architecture/system-overview.md`, and the
Core repository's `docs/architecture/cross-app-contracts.md` and access
OpenAPI contract. Inspect current Django authentication, tenant resolvers,
frontend token handling, and all API consumers before proposing changes.

## Boundary to preserve

CRM currently authenticates with Django SimpleJWT and owns its user,
organization membership, invitation, and domain-permission behavior. Core's
Keycloak integration and app-access API do not authorize shipped CRM requests
yet. Treat integration as a planned, versioned contract change rather than an
implicit import of Core runtime or database state.

Design migration additively: validate Keycloak issuer, audience, expiry and
immutable subject on an isolated path; map subjects to existing CRM users and
tenants explicitly; ask Core for the exact app/organization decision while
retaining CRM domain permissions and tenant queryset filtering. An organization
ID in a URL, token, or app launcher is never sufficient authorization. Define
behavior for no mapping, wrong organization, denied grant, Core outage, token
refresh, logout, and rollback before removing SimpleJWT issuance.

Do not match accounts or organizations by mutable email/name, copy credentials,
read Core's database, or grant access because an app tile is visible. Preserve
the old path until migration and rollback tests pass for existing users. Record
the human owners of identity, product, engineering/security, and privacy
decisions; reviews by agents are not their approval.

Verify allowed and denied cross-tenant cases, direct API access, both old and
new auth paths during the compatibility window, and the versioned Core
contract. Update CRM and Core docs in their owning repositories when the
integration actually changes.
