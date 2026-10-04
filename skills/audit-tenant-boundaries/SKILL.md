---
name: audit-tenant-boundaries
description: Audit Bubllio CRM changes or a domain for cross-organization data exposure, authorization bypasses, unsafe ownership input, and tenant cache leaks. Use for security reviews of organization-owned backend or frontend behavior; report findings unless fixes are explicitly requested.
---

# Audit Tenant Boundaries

Treat `Organization` as the tenant boundary. Read `AGENTS.md`,
`docs/architecture/authentication-and-roles.md`, and the architecture document for
the affected domain before reviewing code.

## Scope

Review the user-specified files or diff. If no scope is supplied, inspect the
current working-tree diff. Do not turn a review request into an implementation.

Trace each organization-owned operation from its public entry point to storage:

1. Authentication establishes the user but does not establish tenant access.
2. Resolve the organization from the URL and verify membership/capability before
   reading or mutating owned objects.
3. Scope object lookup and querysets by that authorized organization. A public
   UUID alone is not authorization.
4. Derive ownership server-side. Reject or ignore client-supplied organization,
   membership, sender-account, parent-company, or similar ownership fields.
5. Validate related objects against the same organization, including automation
   actions, email accounts, contacts, companies, invitations, and runs.
6. Check services, signals, execution hooks, admin paths, and error branches;
   authorization in the view does not protect an independently callable service.
7. In the frontend, include organization ID in tenant URLs and TanStack Query
   keys. Ensure logout or workspace switching cannot display another tenant's
   cached data. Hidden controls are never an authorization boundary.

## Adversarial checks

Look for direct-object-reference attacks, guessed UUIDs, foreign organization IDs
in request bodies, role escalation, owner removal or transfer bypasses, replayed
or cross-tenant invitations, and cross-tenant automation or SMTP references.

Require regression tests that use at least two organizations and prove both the
allowed path and the denied cross-tenant path. Prefer the public API seam over
testing permission helpers in isolation.

## Output

List findings first, ordered by severity. For each finding include the affected
file and line, an attack or failure scenario, the violated invariant, and the
smallest safe remediation. Distinguish confirmed vulnerabilities from missing
coverage. If no issue is found, state what was inspected and remaining blind
spots.
