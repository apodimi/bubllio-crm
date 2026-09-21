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
| POST | `/api/v1/auth/logout/` | access Bearer token | blacklist the submitted refresh token |
| GET | `/api/v1/setup/` | none | report whether first-run setup is available |
| POST | `/api/v1/setup/` | server-side setup token in JSON | create the first admin, workspace, and optional SMTP account |
| POST | `/api/v1/setup/smtp-test/` | server-side setup token in JSON | send a real test email with unsaved SMTP settings |

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

The SMTP test request contains `setup_token`, `recipient` (a valid email
address), and the same `smtp` object accepted by setup. It opens an SMTP
connection, authenticates, and sends one test message. It does not persist an
email account or consume the setup flow. Success (`200`) means the SMTP server
accepted the message, not that the recipient inbox delivered it. Network or
authentication failures return a generic `502` without exposing credentials.
The endpoint closes as soon as installation setup closes.

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
Axios adds the
Bearer header and retries one failed request after refresh. Zustand stores the
current tokens only in memory. A browser reload therefore returns to the login
screen by design.

## Security notes

- Use HTTPS outside local development.
- Never put JWTs in source control, Postman exports with real values, logs, or
  `VITE_*` variables.
- The current starter sends the refresh token in JSON and stores it in memory.
  A production browser deployment may choose an HttpOnly-cookie refresh design,
  but that requires deliberate CSRF and cookie configuration.
- API authorization is enforced by Django, not by frontend route guards or
  hidden buttons.
