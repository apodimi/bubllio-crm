# System Overview

This page is the shortest architecture explanation that still lets a new
contributor understand how a browser action becomes a database change.

## The two applications

The repository contains two applications with a deliberate boundary:

```text
Browser
  │ React UI, TanStack Router, TanStack Query, Axios
  ▼
Django REST API
  │ authentication, membership, capabilities, serializers, services
  ▼
Database and email adapters
```

The frontend never imports Django code. Django never imports frontend code.
They communicate through the versioned HTTP API under `/api/v1/`. This means a
future mobile client, CLI, or community-built UI can use the same API.

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
├── Automation
│   └── AutomationRun
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
- **Signal/event hook**: only where a real domain event needs to fan out to
  another subsystem; keep signal work small and explicit.

For example, company creation is handled by a view and serializer, then the
company-created signal hands the event to the automation service. The service
selects active rules in the same organization, executes the current action,
and records an `AutomationRun`.

## Current automation boundary

The implementation is intentionally smaller than the future visual builder:

- trigger: `company.created`
- action: `send_email`
- execution: synchronous inside the Django request path
- history: persisted `AutomationRun`
- queue: none
- retries: none
- branching/loops: none
- arbitrary multi-step graph: not implemented

The UI and documentation must not imply that a future workflow graph already
exists. See [Automations](automations.md) and the [Automation Roadmap](automation-roadmap.md).

## Data and email boundaries

The default database is SQLite for a zero-configuration local start. PostgreSQL
is supported through Django's `DATABASE_URL` configuration; application code
should use the Django ORM and remain portable between both databases.

Automation email currently uses Django's configured email backend, which is the
console backend locally. Organization SMTP accounts have a separate encrypted
credential and test-delivery path. Creating an SMTP account does not currently
switch automation delivery to that account.

## Where to investigate a bug

| Symptom | Start here |
|---|---|
| 401 during login or API use | `settings.py`, `urls.py`, `accounts/auth_views.py`, `frontend/src/services/api.ts` |
| 403/404 for a tenant route | `access/permissions.py`, organization resolver, view queryset |
| Wrong JSON shape or validation | the app's `serializers.py` |
| Data missing from a list | view queryset, tenant filter, TanStack Query key |
| Automation not firing | `companies/signals.py`, `automations/apps.py`, `automations/services.py` |
| Email not visible | configured Django email backend and `runserver` output |
| Frontend showing stale data | the owning feature's `api.ts` query key and mutation invalidation |
