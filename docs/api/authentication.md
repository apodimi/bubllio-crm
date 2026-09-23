# REST Authentication Guide

This guide explains the JWT API contract independently from the React client.
It is useful for Postman, curl, mobile clients, scripts, and contributors
debugging a browser login.

## Endpoints

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/token/` | none | exchange username/password for access and refresh tokens |
| POST | `/api/v1/auth/token/refresh/` | refresh token in JSON | rotate the refresh token and issue a new access token |
| GET | `/api/v1/auth/me/` | access Bearer token | return the current user and visible organizations |
| GET/PATCH | `/api/v1/auth/me/profile/` | access Bearer token | read or complete the personal onboarding profile |
| GET/PATCH | `/api/v1/auth/me/settings/` | access Bearer token | read or update email and profile settings |
| GET | `/api/v1/auth/me/export/` | access Bearer token | download the authenticated user's personal account export |
| POST | `/api/v1/auth/me/delete/` | access Bearer token | delete the account after password and ownership checks |
| POST | `/api/v1/auth/me/password/` | access Bearer token | change the current password |
| POST | `/api/v1/auth/password-reset/` | none | request a generic password-reset email response |
| POST | `/api/v1/auth/password-reset/<uidb64>/<token>/` | reset token in URL | set a new password from a valid reset link |
| POST | `/api/v1/auth/logout/` | access Bearer token | blacklist the submitted refresh token |
| GET | `/api/v1/setup/` | none | report whether first-run setup is available |
| POST | `/api/v1/setup/` | server-side setup token in JSON | create the first admin, workspace, and optional SMTP account |
| POST | `/api/v1/setup/smtp-test/` | server-side setup token in JSON | send a real test email with unsaved SMTP settings |
| POST | `/api/v1/organizations/` | installation admin or workspace creator Bearer token | create a shared workspace with `owner_email`; a different owner receives an email invitation |
| GET/POST | `/api/v1/organizations/workspace-creators/` | installation admin Bearer token | list grants or grant an existing active user provisioning access |
| DELETE | `/api/v1/organizations/workspace-creators/<grant_id>/` | installation admin Bearer token | revoke a creator grant |
| GET | `/api/v1/organizations/provisioning/` | authenticated Bearer token | list own pending handoffs; installation admins see all |
| POST/DELETE | `/api/v1/organizations/provisioning/<organization_id>/` | provisioning creator or installation admin Bearer token | resend owner invitation or cancel pending workspace |
| GET/POST | `/api/v1/organizations/<organization_id>/invitations/` | owner/admin Bearer token | list pending invitations or email a new invitation |
| GET | `/api/v1/organizations/<organization_id>/members/` | owner/admin Bearer token | list members; direct membership creation is unavailable |
| GET/POST | `/api/v1/organizations/installation-admin-invitations/` | installation admin Bearer token | list IT admins and pending invitations, or invite another IT admin |
| GET | `/api/v1/installation-admin-invitations/<token>/` | invitation token in URL | preview an IT admin invitation |
| POST | `/api/v1/installation-admin-invitations/<token>/accept/` | invitation token; Bearer token for existing users | accept once and become an installation administrator |
| GET | `/api/v1/invitations/<token>/` | invitation token in URL | preview a valid invitation |
| POST | `/api/v1/invitations/<token>/accept/` | invitation token; Bearer token for existing users | accept once and join the workspace |

The Django admin continues to use session authentication at `/admin/`. The API
does not use browser sessions for normal REST requests.

The setup endpoint is a separate bootstrap path, not public registration. Its
GET response is only `{ "available": true|false }` and never reveals the token.
POST is accepted only with a server-configured `BUBLLIO_SETUP_TOKEN` of at
least 32 characters, empty user and organization tables, and an unfinished installation. The
request contains `setup_token`, `username`, `email`, `password`,
`organization_name`, and `organization_slug`; `smtp` may contain the existing
email-account fields including its password. SMTP requires a valid server-side
`BUBLLIO_EMAIL_ENCRYPTION_KEY`. Success returns `201` and permanently closes
setup in that database. The API rate-limits setup POST attempts. See
[Getting Started](../getting-started.md) for the complete operator procedure.

Installation settings expose the `allow_personal_workspaces` policy. It
defaults to `false` and can be changed only by the installation administrator.
When enabled, users may create one personal workspace explicitly; disabling
the policy does not delete existing personal workspaces.

The SMTP test request contains `setup_token`, `recipient` (a valid email
address), and the same `smtp` object accepted by setup. It opens an SMTP
connection, authenticates, and sends one test message. It does not persist an
email account or consume the setup flow. Success (`200`) means the SMTP server
accepted the message, not that the recipient inbox delivered it. Network or
authentication failures return a generic `502` without exposing credentials.
The endpoint closes as soon as installation setup closes.

## Invite-only registration

There is no general public signup endpoint. An owner or admin creates an
invitation with `{ "email": "person@example.com", "role": "member" }` under
their organization URL. `owner` is not an invitable role through the ordinary
workspace invitation endpoint; the provisioning flow sends initial owner
invitations. Only an owner may invite an `admin`. Sending requires the organization's active default SMTP
account or the installation fallback. The emailed link expires after seven days. Set `BUBLLIO_APP_URL` to
the public React origin so the link points to the correct installation.

The recipient opens the link to preview the workspace and role. A new user
posts `username` and `password` to `accept/`; the invited email is assigned by
the server, and the response includes JWT `tokens` and `organization_id`. An
existing user signs in and posts an empty JSON body with their Bearer token.
Their account email must match the invitation. Acceptance creates a membership
for that workspace only and consumes the link; replay or expiry returns `404`.
An ordinary workspace membership alone does not permit creating another shared
organization. An installation administrator may grant a separate
workspace-creator right to an existing account. That creator must supply
`owner_email` when creating a workspace. If it differs from their own email,
the workspace remains hidden until the invited owner accepts; the creator's
temporary membership is then removed. Installation administrators may still
create a workspace for themselves by omitting `owner_email`. See the
[role guide](../architecture/authentication-and-roles.md) for the handoff and
recovery flow.

IT administrator invitations use installation fallback SMTP and the separate
`/installation-admin-invite/<token>` browser route. An existing account must
sign in with the invited email; a new account supplies registration details.
Acceptance grants Django superuser/staff status without adding any workspace
membership. Reserve this privilege for trusted operators because Django's
`/admin/` grants broad access outside the normal tenant-scoped product API.

New invited users provide a display name, optional first/last names, optional
date of birth, timezone, and locale during registration. Existing users can
complete or update the same profile through `/api/v1/auth/me/profile/`. Account
settings use `/api/v1/auth/me/settings/` for email and profile updates and
`/api/v1/auth/me/password/` for an authenticated password change. Password reset
requests always return the same generic response whether or not the email
exists. Reset links are single-use and expire when the user password changes.

After an installation is initialized, users may explicitly create one private
personal workspace. Shared/team workspaces are separate organizations and are
visible only through an accepted membership. Personal workspaces cannot invite
other users, add members, or be deleted; an installation administrator creates
a regular workspace when a team needs shared CRM data, or delegates that
provisioning right to a selected account.

Account settings also expose an explicit personal-data export and account
deletion flow. The export contains account/profile/membership metadata only;
never tokens, passwords, SMTP secrets or workspace CRM data. Deletion requires
the current password and the literal confirmation `DELETE`, and owners must
transfer workspace ownership first.

## Login with curl

Create a local user first:

```bash
uv run python src/manage.py createsuperuser
```

Request the token pair:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/token/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"your-password"}'
```

A successful response looks like:

```json
{
  "refresh": "<long-refresh-token>",
  "access": "<short-lived-access-token>"
}
```

Do not commit either value. The access token is intended for API requests; the
refresh token is only for obtaining a new pair or logging out.

## Call an authenticated endpoint

```bash
curl http://127.0.0.1:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The response includes the user's visible organizations. Each organization may
have a different `current_user_role` because membership is organization-scoped.

## Refresh and rotation

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/token/refresh/ \
  -H 'Content-Type: application/json' \
  -d '{"refresh":"<refresh-token>"}'
```

Refresh rotation is enabled. When the response contains a new `refresh` value,
the client must replace the old refresh token. The old token is blacklisted.
Keeping the old token after a successful refresh will cause the next refresh to
fail.

## Logout

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/logout/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"refresh":"<refresh-token>"}'
```

The endpoint returns `204 No Content` when the refresh token is blacklisted.
Clients should clear local token state regardless of whether the network call
succeeds, because logout must also make the current UI private immediately.

## Status codes

- `200`: token, refresh, or current-user request succeeded.
- `204`: logout succeeded.
- `400`: malformed or missing refresh token.
- `401`: missing, expired, invalid, or revoked authentication.
- `404`: the user is authenticated but cannot access a tenant/resource; this
  avoids exposing whether an inaccessible organization exists.

## Browser client behavior

The official React client implements this contract in
`frontend/src/services/api.ts` and `frontend/src/features/auth/hooks/useAuth.tsx`.
Axios adds the Bearer header and retries one failed request after refresh.
Zustand persists the token pair in same-tab `sessionStorage`; reloads in that
tab retain the session, while logout clears it.

## Security notes

- Use HTTPS outside local development.
- Never put JWTs in source control, Postman exports with real values, logs, or
  `VITE_*` variables.
- The current starter sends the refresh token in JSON and stores it in
  JavaScript-readable `sessionStorage`, which makes XSS prevention essential.
  A production browser deployment may choose an HttpOnly-cookie refresh design,
  but that requires deliberate CSRF and cookie configuration.
- API authorization is enforced by Django, not by frontend route guards or
  hidden buttons.
