# System Overview

This page is the shortest architecture explanation that still lets a new
contributor understand how a browser action becomes a database change.

## Runtime components

The browser and API are separate applications. Email delivery and updates use
separate workers and authority:

```text
Browser → React UI → Django REST API → CRM database
                         │
                         ├→ email outbox → RabbitMQ → Celery worker
                         │        ↑
                         │    Celery Beat recovery
                         └→ independent Update Agent → fixed deployment adapter
```

The frontend never imports Django code. Django never imports frontend code.
They communicate through the versioned HTTP API under `/api/v1/`. This means a
future mobile client, CLI, or community-built UI can use the same API.
PostgreSQL is the production database; local development may use SQLite. The
Update Agent keeps its own SQLite job state and deployment credentials outside
Django. These are CRM components, not a Keycloak/Core integration.

## A typical authenticated request

For `GET /api/v1/organizations/<id>/companies/`:

1. The browser sends the request through Axios.
2. Axios reads the current access token from the in-memory Zustand store and
   adds `Authorization: Bearer <access-token>`.
3. Django SimpleJWT authenticates the token and sets `request.user`.
4. The view resolves the organization using the URL ID and that user.
5. The resolver checks membership and the required capability.
6. The view queries only companies belonging to the resolved organization.
7. The serializer converts models to the public JSON shape.
8. The browser stores the response in TanStack Query under a key containing the
   organization ID.

If the access token is expired, Axios makes one refresh request using the
refresh token, updates the Zustand tokens, and retries the original request.
If refresh fails, the store is cleared and the user must sign in again.

## Domain ownership

`Organization` is the tenant boundary. It owns or scopes:

```text
Organization
├── OrganizationMembership → User + role
├── Company
│   └── Contact
├── OrganizationSettings
└── EmailAccount
```

The organization ID in a URL is a lookup input, not proof that the caller may
access that organization. Every organization-owned read and write must pass
through membership/capability checks.

## Backend layers

The backend follows a small number of layers:

- **Model**: persistent fields, relationships, constraints, and invariants.
- **Serializer**: public JSON contract and request validation.
- **View**: HTTP method, request/response coordination, and status codes.
- **Permission/resolver**: membership and capability checks.
- **Service**: reusable business behavior that is not tied to one HTTP request.
- **Signal/event hook**: only where a real domain event needs to fan out to another subsystem; keep
  signal work small and explicit.

## Data and email boundaries

The default database is SQLite for a zero-configuration local start. PostgreSQL
is supported through Django's `DATABASE_URL` configuration; application code
should use the Django ORM and remain portable between both databases.

Organization SMTP accounts have an encrypted credential and test-delivery path.

## Update boundary

Self-update deployment authority is outside both applications:

```text
Installation admin → CRM Update Center → HMAC-authenticated Update Agent
                                           │ signed manifest + fixed adapter
                                           ▼
                                 deployment platform and backup tool
```

The agent owns its job state and provider access so it remains observable while
the CRM restarts. Django may request only an exact stable version and an
idempotency key; it cannot supply a command, repository, URL, path, image, or
provider credential. See the [update guide](../development/updating.md) for the
trust and release model.

## Where to investigate a bug

| Symptom | Start here |
|---|---|
| 401 during login or API use | `settings.py`, `urls.py`, `accounts/auth_views.py`, `frontend/src/services/api.ts` |
| 403/404 for a tenant route | `access/permissions.py`, organization resolver, view queryset |
| Wrong JSON shape or validation | the app's `serializers.py` |
| Data missing from a list | view queryset, tenant filter, TanStack Query key |
| Email not visible | configured Django email backend and `runserver` output |
| Frontend showing stale data | the owning feature's `api.ts` query key and mutation invalidation |
