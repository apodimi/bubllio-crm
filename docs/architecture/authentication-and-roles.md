# Authentication, Organizations, and Roles

This document describes the security boundary of Bubllio CRM.

## Authentication and authorization

Authentication answers “who is making this request?”. Authorization answers
“what may this user do inside this organization?”. They are separate checks and
both are required.

The API currently supports Django session authentication and HTTP Basic
authentication. All API endpoints require an authenticated user. Session login is
available at `/api-auth/login/`; the Django admin remains at `/admin/`.

Basic authentication is convenient for local Postman testing. It is safe only
over HTTPS outside local development. Token-based authentication can be added
later without changing the organization role model.

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

## Membership API

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

Invitations and public user registration are not implemented yet. For local
development, create users in Django admin or with `createsuperuser`.

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

Django superusers may access every organization for support and administration.
They are not a product-level organization role. Ordinary application users must
always have an `OrganizationMembership`.

## Future security work

- invitation and acceptance flow;
- production token authentication;
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
