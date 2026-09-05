# Bubllio CRM API and Postman Guide

This guide explains how to exercise the authenticated, organization-scoped API
with the files in `docs/postman/`.

## Preparation

Install dependencies, migrate, create a local user, and start Django:

```bash
uv sync
uv run python src/manage.py migrate
uv run python src/manage.py createsuperuser
uv run python src/manage.py runserver
```

Import both Postman files and select `Bubllio CRM Local`:

```text
docs/postman/bubllio-crm.postman_collection.json
docs/postman/bubllio-crm.local.postman_environment.json
```

Set `username` and `password` in the selected environment to the local Django
credentials. The collection inherits HTTP Basic authentication. Basic auth is for
local development here; use it only over HTTPS outside localhost.

## Environment variables

| Variable | Purpose |
|---|---|
| `base_url` | Local Django origin |
| `api_version` | API version, currently `v1` |
| `username`, `password` | Local authenticated Django user |
| `organization_id` | Created organization UUID |
| `user_id` | Existing Django user to add as a member |
| `membership_id` | Membership to update or remove |
| `company_id` | Created company UUID |
| `automation_id` | Created automation UUID |
| `company_search`, `contact_search` | Search values |

Organization, company, membership, and automation creation requests save returned
IDs into the environment automatically.

## Recommended flow

1. Create Organization. The authenticated creator becomes its owner.
2. List Organizations and confirm only memberships visible to the user appear.
3. Optionally create another Django user in `/admin/`, copy its integer ID into
   `user_id`, then add it under Members.
4. Create and search companies under the organization.
5. Create and search contacts. A contact's company must belong to the same
   organization.
6. Create a `company.created` email automation as an owner or administrator.
7. Test the automation and inspect its run history.
8. Optionally delete the organization as its owner.

## Authentication responses

Every API route requires authentication. With the current session-first DRF
configuration, an anonymous request commonly returns `403 Forbidden`. A user who
is authenticated but lacks membership or the required capability normally sees
`404 Not Found`, preventing disclosure of inaccessible organizations.

## Endpoints

Organizations:

```text
GET    /api/v1/organizations/
POST   /api/v1/organizations/
GET    /api/v1/organizations/<organization_id>/
DELETE /api/v1/organizations/<organization_id>/
```

Memberships (owner/admin, with role restrictions):

```text
GET    /api/v1/organizations/<organization_id>/members/
POST   /api/v1/organizations/<organization_id>/members/
PATCH  /api/v1/organizations/<organization_id>/members/<membership_id>/
DELETE /api/v1/organizations/<organization_id>/members/<membership_id>/
```

Companies and contacts:

```text
GET  /api/v1/organizations/<organization_id>/companies/
GET  /api/v1/organizations/<organization_id>/companies/?search=<term>
POST /api/v1/organizations/<organization_id>/companies/

GET  /api/v1/organizations/<organization_id>/contacts/
GET  /api/v1/organizations/<organization_id>/contacts/?search=<term>
POST /api/v1/organizations/<organization_id>/contacts/
```

Automations:

```text
GET  /api/v1/organizations/<organization_id>/automations/
POST /api/v1/organizations/<organization_id>/automations/
GET  /api/v1/organizations/<organization_id>/automations/runs/
POST /api/v1/organizations/<organization_id>/automations/<automation_id>/test/
```

Do not include `organization` in company, contact, or automation request bodies.
The server takes ownership from `<organization_id>` after checking the user's
membership. Response bodies still include the read-only organization UUID.

## Example bodies

Create organization:

```json
{
  "name": "Nerds Lab",
  "slug": "nerds-lab"
}
```

Add an existing user as a member:

```json
{
  "user_id": 2,
  "role": "member"
}
```

Create company:

```json
{
  "name": "Acme Inc",
  "email": "hello@acme.test",
  "lifecycle_stage": "lead"
}
```

Create contact:

```json
{
  "company": "<company UUID>",
  "first_name": "Maria",
  "last_name": "Papadopoulou",
  "email": "maria@acme.test"
}
```

Create automation:

```json
{
  "name": "Notify accounting",
  "trigger": "company.created",
  "action_type": "send_email",
  "action_config": {
    "to": ["accounting@example.com"],
    "subject": "New company",
    "body": "A company was added to Bubllio CRM."
  },
  "is_active": true
}
```

Local email uses Django's console backend, so messages appear in the terminal
running `runserver` rather than reaching a real inbox.

For the complete authorization rules, read
`docs/architecture/authentication-and-roles.md`.
