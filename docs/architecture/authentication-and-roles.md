# Authentication, Organizations, and Roles

This document describes the **implemented** security boundary of Bubllio CRM.
For the proposed next step and a comparison with other CRM products, see
[Access-model research](../research/access-model-comparison.md).

## Authentication and authorization

Authentication answers “who is making this request?”. Authorization answers
“what may this user do inside this organization?”. They are separate checks and
both are required.

The API uses JSON Web Tokens through DRF SimpleJWT. Protected API endpoints
require an authenticated user and accept a Bearer access token. Setup,
invitation preview/acceptance, and password-reset endpoints are intentional
exceptions. The Django admin still uses
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

An installation administrator or a user with a workspace-creator grant may
create a shared organization. The creator nominates its initial business owner
by email; the handoff process is described below. Other users join only by
accepting an invitation sent by that organization's owner or administrator.

There are three different questions, which must not be conflated:

1. **Installation authority:** may this account configure the whole deployment
   or create shared workspaces? Active Django superusers can do both; a
   workspace-creator grant allows only shared-workspace provisioning.
2. **Workspace membership:** which organizations may this account access, and
   what is its role in each? An installation administrator has no implicit REST
   membership in workspaces created by somebody else.
3. **Record visibility:** which records inside an accessible workspace are
   visible? Currently all four workspace roles can read all of that workspace's
   companies, contacts, automations, and run history. There is no team-,
   record-, or field-level visibility policy yet.

An `Organization` is a workspace and security boundary, **not** a CRM company
record or a department by default. Create a separate workspace when data,
membership, administration, or SMTP configuration should be separate. Put
ordinary customers in `Company` records within the appropriate workspace.

Organizations created before the membership migration do not have an owner that
can be inferred safely. After upgrading an existing development database, a
Django superuser must add an owner membership through `/admin/` before an ordinary
user can access that organization. Do not guess ownership during migration.

## Roles and capabilities

| Capability | Owner | Admin | Member | Viewer |
|---|---:|---:|---:|---:|
| View companies, contacts, automations, and run history | Yes | Yes | Yes | Yes |
| Create companies and contacts | Yes | Yes | Yes | No |
| Create and test automations | Yes | Yes | No | No |
| View workspace settings and SMTP account metadata | Yes | Yes | Yes | Yes |
| Change workspace settings, SMTP accounts; send SMTP test email | Yes | Yes | No | No |
| List members and pending invitations | Yes | Yes | No | No |
| Invite, change, or remove members/viewers | Yes | Yes | No | No |
| Invite or promote administrators | Yes | No | No | No |
| Change or remove administrators | Yes | No | No | No |
| Transfer ownership | Yes | No | No | No |
| Delete organization | Yes | No | No | No |

Email account passwords are encrypted at rest and never returned by the API.
The account list returns account configuration (excluding passwords) to every workspace role;
editing it requires owner/admin. A workspace uses its active default SMTP
account for invitations, falling back to installation SMTP if it has none.

The table describes current endpoints; it is not a promise of per-record CRUD.
For example, the current API can create/list companies and contacts, but has no
company/contact update or delete endpoint. Account-level profile/password
settings belong to the authenticated individual, independently of workspace role.

Authorization is expressed as capabilities in
`src/access/permissions.py`. This avoids scattering role comparisons
through every view.

Administrators may invite, update, and remove members or viewers. They cannot create,
modify, or remove another administrator or owner. Owners may promote members to
administrator and transfer ownership. The current owner cannot be removed or
demoted directly; ownership must first be transferred to another membership.

A single user can therefore be an owner in workspace A, a viewer in workspace B,
and an installation administrator at the same time. These are independent
assignments; selecting a different workspace does not carry its role across.

## Workspace provisioning

Only an installation administrator can grant or revoke workspace-creator access
to an **existing active account**. This does not make that account Django staff,
superuser, or a member of any workspace:

```text
GET    /api/v1/organizations/workspace-creators/
POST   /api/v1/organizations/workspace-creators/  {"email": "creator@example.com"}
DELETE /api/v1/organizations/workspace-creators/<grant_id>/
```

`GET /api/v1/auth/me/` exposes `can_create_workspaces` for the UI. The backend
checks the grant on every create request; a stale UI or JWT cannot grant access.
The grant is revocable. Revocation prevents new workspace creation but does not
undo an already-created workspace or remove its membership. Workspace-creation
and owner-invitation resend requests share a 20-per-user-per-day throttle.

Create a shared workspace with `POST /api/v1/organizations/` and `name`, `slug`,
and `owner_email`. A delegated creator **must** supply `owner_email`; an
installation administrator may omit it to become owner directly, preserving
the old IT workflow. If the nominated email is the creator's own email, they
become owner immediately. Otherwise:

1. Installation fallback SMTP must be configured. The server atomically creates
   the organization, its settings, a provisional creator-owner membership, and
   a seven-day, email-bound owner invitation. Failed delivery rolls all of this
   back. The response has `owner_invitation_pending: true`.
2. While awaiting acceptance, the workspace is excluded from normal workspace
   listings and **all** membership-scoped CRM/settings endpoints, including
   for the provisional creator. It cannot collect CRM data through the REST API.
3. The nominated person accepts through the existing invitation page. A new
   account can register there; an existing account must sign in with the
   invited email. Acceptance atomically removes the provisional creator
   membership, installs the nominated owner, and opens the workspace.
4. The creator or an installation administrator may view pending workspaces,
   resend the invitation (invalidating the previous token), or cancel/delete
   the pending workspace:

```text
GET    /api/v1/organizations/provisioning/
POST   /api/v1/organizations/provisioning/<organization_id>/
DELETE /api/v1/organizations/provisioning/<organization_id>/
```

Only the creator sees their pending workspaces; installation admins can see all.
An unaccepted or expired invitation grants **no** workspace access. The
database constraint ensures at most one owner; the provisional membership
ensures a pending workspace is not left ownerless. Owner handoff, grant/revoke,
shared-workspace creation through this API, resend, and cancellation are recorded in a read-only
`WorkspaceAccessEvent` log visible to installation admins in Django admin.
General membership changes do not yet have that audit coverage.

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

Direct `POST` to the members endpoint is unavailable. Membership creation
requires the email invitation and acceptance flow below.

Owners and administrators invite by email through
`POST /api/v1/organizations/<organization_id>/invitations/` with `email` and
`role`. Owners may invite `admin`, `member`, or `viewer`; administrators may
invite only `member` or `viewer`. `GET` on the same route lists unexpired,
unaccepted invitations. The server sends through that organization's active
default SMTP account, or the installation fallback SMTP if the workspace has
none. It returns an error and saves no invitation if neither is available or
delivery fails. A new invitation to the same email replaces the
earlier pending one. Invitation POST requests are limited to 20 per user per day.

Invitation links contain a random token. Only its SHA-256 hash is stored, and
the link expires after seven days. `GET /api/v1/invitations/<token>/` previews
the workspace, invited email, role, and expiry. `POST` to the corresponding
`accept/` route consumes it once. An existing user must sign in with the
invited email; a new user supplies a username and password and receives JWTs.
The invited email cannot be changed at acceptance. No general public signup
endpoint exists. Invited users cannot create additional shared organizations
unless an installation administrator later grants workspace-creator access.

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

The first setup user is an installation administrator. Installation
administrators can invite additional IT administrators through a separate,
email-bound, seven-day invitation. Accepting it grants Django superuser and
staff privileges, but does not create workspace memberships. In the product
API, even a superuser sees CRM workspaces only through `OrganizationMembership`.
Because Django superusers can access data through `/admin/`, this role is
reserved for trusted IT operators and must not be used as a workspace role.

Installation administrators can create shared organizations and manage
installation settings. Delegated workspace creators can create organizations,
but cannot change installation settings or invite installation administrators.
Organization owners and administrators can invite people into their own
workspace, but cannot grant workspace-creator or installation-admin access.

**Important limitation:** the REST API enforces membership even for installation
administrators, but Django's `/admin/` grants superusers broad database access.
Do not describe the present installation role as technically unable to read
other workspaces. Treat it as highly privileged, reserve it for trusted IT
operators, and protect `/admin/` accordingly. Delegated workspace creators
have no Django admin access from that grant. See the
[research and access-model rationale](../research/access-model-comparison.md).

The installation setting `allow_personal_workspaces` defaults to false. When
enabled, any authenticated user can create one personal workspace, owned only
by that user; personal workspaces cannot invite members or be deleted through
the current API. Disabling the setting blocks new creation but does not remove
existing personal workspaces.

## Future security work

- general invitation revocation and membership-change audit trail;
- a future HttpOnly-cookie refresh transport if the deployment needs stronger browser-side token protection;
- inactive/suspended memberships;
- audit log for ordinary membership and later ownership changes (provisioning
  ownership acceptance is already logged);
- rate limiting and production HTTPS/security settings.

## Django Admin fallback

The Django admin is an operational fallback for staff/superusers, not an
organization-owner dashboard. Django superusers can inspect organizations,
memberships, organization settings, and email accounts at `/admin/`, regardless
of REST workspace membership. The email account admin
form accepts a password only when creating or changing an account, encrypts it
before saving, and never displays the encrypted value as an editable field.

The explicit test-email API remains available for Postman or a future frontend:

```text
POST /api/v1/organizations/<organization_id>/email-accounts/<account_id>/test/
```
