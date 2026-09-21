# Authentication, Organizations, and Roles

This document describes the security boundary of Bubllio CRM.

## Authentication and authorization

Authentication answers “who is making this request?”. Authorization answers
“what may this user do inside this organization?”. They are separate checks and
both are required.

The API uses JSON Web Tokens through DRF SimpleJWT. All API endpoints require an
authenticated user and accept a Bearer access token. The Django admin still uses
session authentication. REST endpoints are `/api/v1/auth/token/`, `/api/v1/auth/token/refresh/`,
`/api/v1/auth/me/`, and `/api/v1/auth/logout/`.

Refresh tokens rotate and are blacklisted after rotation. Logout blacklists the
submitted refresh token. The React frontend keeps both tokens in Zustand with
same-tab `sessionStorage` persistence. Reloads retain the session; signing out
clears it. Browser-side JavaScript can read `sessionStorage`, so XSS prevention
remains important.

## Membership model

A Django user may belong to multiple organizations and may have a different role
in each one:

```text
User 1 -> many OrganizationMemberships <- 1 Organization
```

`OrganizationMembership` contains a UUID, organization, user, role, and
timestamps. The database prevents duplicate membership for the same user and
organization and permits at most one owner per organization.

Creating an organization automatically creates an `owner` membership for the
authenticated creator.

Organizations created before the membership migration do not have an owner that
can be inferred safely. After upgrading an existing development database, a
Django superuser must add an owner membership through `/admin/` before an ordinary
user can access that organization. Do not guess ownership during migration.

## Roles and capabilities

| Capability | Owner | Admin | Member | Viewer |
|---|---:|---:|---:|---:|
| View CRM data and automation history | Yes | Yes | Yes | Yes |
| Create CRM companies and contacts | Yes | Yes | Yes | No |
| Create and test automations | Yes | Yes | No | No |
| List and manage memberships | Yes | Yes, limited | No | No |
| Add or change administrators | Yes | No | No | No |
| Transfer ownership | Yes | No | No | No |
| Delete organization | Yes | No | No | No |

Managing organization settings and email accounts is also restricted to owners
and administrators. All email account credentials are encrypted at rest and are
write-only through the API.

Authorization is expressed as capabilities in
`src/organizations/permissions.py`. This avoids scattering role comparisons
through every view.

Administrators may add, update, and remove members or viewers. They cannot create,
modify, or remove another administrator or owner. Owners may promote members to
administrator and transfer ownership. The current owner cannot be removed or
demoted directly; ownership must first be transferred to another membership.

## Tenant-scoped routes

Organization-owned resources use the organization UUID in the URL:

```text
/api/v1/organizations/<organization_id>/companies/
/api/v1/organizations/<organization_id>/contacts/
/api/v1/organizations/<organization_id>/automations/
```

The server resolves that organization through the authenticated user's membership
and required capability. The client does not choose ownership by sending an
`organization` field in JSON. `organization` is read-only in company, contact,
and automation serializers.

Queries are always filtered by the resolved organization. A missing membership or
insufficient capability normally returns `404 Not Found`; this avoids revealing
whether an inaccessible organization exists.

## Automation Access

Automation access uses these same boundaries: members can read rules and run
history; owners/admins can create rules and invoke the manual action test.
That test performs the action even for an inactive rule. It is not a permission
preview or dry run. See [Automations](automations.md) for current behavior.

## Membership Operations

Only owners and administrators can list memberships:

```text
GET /api/v1/organizations/<organization_id>/members/
```

Add an existing Django user with its integer user ID:

```http
POST /api/v1/organizations/<organization_id>/members/
Content-Type: application/json

{
  "user_id": 12,
  "role": "member"
}
```

Owners and administrators invite by email through
`POST /api/v1/organizations/<organization_id>/invitations/` with `email` and
`role`. Owners may invite `admin`, `member`, or `viewer`; administrators may
invite only `member` or `viewer`. `GET` on the same route lists unexpired,
unaccepted invitations. The server sends through that organization's active
default SMTP account; it returns an error and saves no invitation if there is
no account or delivery fails. A new invitation to the same email replaces the
earlier pending one. Invitation POST requests are limited to 20 per user per day.

Invitation links contain a random token. Only its SHA-256 hash is stored, and
the link expires after seven days. `GET /api/v1/invitations/<token>/` previews
the workspace, invited email, role, and expiry. `POST` to the corresponding
`accept/` route consumes it once. An existing user must sign in with the
invited email; a new user supplies a username and password and receives JWTs.
The invited email cannot be changed at acceptance. No general public signup
endpoint exists. The account may later create its own organization and becomes
that organization's owner without changing its role in the invited workspace.

Set `BUBLLIO_APP_URL` to the public React origin for correct links in emails.
Local development defaults to `http://127.0.0.1:5173`.

Change a role:

```http
PATCH /api/v1/organizations/<organization_id>/members/<membership_id>/
Content-Type: application/json

{
  "role": "viewer"
}
```

Setting `role` to `owner` transfers ownership atomically: the previous owner
becomes an administrator and the selected membership becomes the owner.

Remove a membership:

```text
DELETE /api/v1/organizations/<organization_id>/members/<membership_id>/
```

## Superusers

The optional first-run setup flow at `GET/POST /api/v1/setup/` can create the
first Django superuser and first organization owner. It is available only when
`BUBLLIO_SETUP_TOKEN` is configured, the installation has not been completed,
and the user and organization tables are empty. POST requires that server-side token; successful
setup closes the flow permanently for that database. An existing installation
does not gain a public user-creation path. See [Getting Started](../getting-started.md).

Django superusers may access every organization for support and administration.
They are not a product-level organization role. Ordinary application users must
always have an `OrganizationMembership`.

## Future security work

- invitation revocation and audit trail;
- a future HttpOnly-cookie refresh transport if the deployment needs stronger browser-side token protection;
- inactive/suspended memberships;
- audit log for membership and ownership changes;
- rate limiting and production HTTPS/security settings.

## Django Admin fallback

The Django admin is the operational dashboard for installations that do not have
a custom frontend yet. Owners/operators can inspect organizations, memberships,
organization settings, and email accounts at `/admin/`. The email account admin
form accepts a password only when creating or changing an account, encrypts it
before saving, and never displays the encrypted value as an editable field.

The explicit test-email API remains available for Postman or a future frontend:

```text
POST /api/v1/organizations/<organization_id>/email-accounts/<account_id>/test/
```
