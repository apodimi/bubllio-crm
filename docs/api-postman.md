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
credentials. The collection obtains a JWT pair and sends the access token as a
Bearer token. Use HTTPS outside localhost.

## Environment variables

| Variable | Purpose |
|---|---|
| `base_url` | Local Django origin |
| `api_version` | API version, currently `v1` |
| `username`, `password` | Local authenticated Django user |
| `access_token`, `refresh_token` | Tokens populated by the Authentication/Login request |
| `organization_id` | Created organization UUID |
| `membership_id` | Membership to update or remove |
| `company_id` | Created company UUID |
| `automation_id` | Created automation UUID |
| `email_account_id` | Created SMTP account UUID |
| `company_search`, `contact_search` | Search values |

For UI-managed SMTP testing, also set `BUBLLIO_EMAIL_ENCRYPTION_KEY` in the
server's ignored `.env` file. Postman never stores that encryption key.

Organization, company, and automation creation requests save returned
IDs into the environment automatically.

## Recommended flow

1. Sign in as an installation administrator and create an organization. The
   creator becomes its owner when no other `owner_email` is supplied.
2. List Organizations and confirm only memberships visible to the user appear.
3. Invite another person by email under Members and have them accept the link
   before expecting the workspace to appear in their organization list.
4. Create and search companies under the organization.
5. Create and search contacts. A contact's company must belong to the same
   organization.
6. Create a `company.created` email automation as an owner or administrator.
7. Create another company to exercise the automatic event path, then inspect
   console email output and run history. Earlier companies are not replayed.
8. Optionally run Test Automation to execute the action directly again. This
   does not create a company or verify event dispatch.
9. Optionally delete the organization as its owner; this also deletes its rules
   and run history.

For expected results at each step, follow [Your First Automation](guides/first-automation.md).

To test delegated provisioning instead, grant an existing account access with
`POST /api/v1/organizations/workspace-creators/` and its email. Sign in as that
account, create a workspace with a different `owner_email`, then inspect
`GET /api/v1/organizations/provisioning/`. The normal organization list does
not include it until the nominated owner accepts the email invitation. The
creator may resend (`POST`) or cancel (`DELETE`) the pending provisioning URL.
This flow needs working installation fallback SMTP; unlike a mocked Postman
request, it sends a real invitation email.

## Authentication

Obtain tokens with `POST /api/v1/auth/token/` and JSON username/password. Use the
returned `access` value in `Authorization: Bearer <access>` headers. Refresh with
`POST /api/v1/auth/token/refresh/` and logout with `POST /api/v1/auth/logout/`.

## Authentication responses

Protected API routes require authentication; setup, token issuance, invitation
preview/acceptance, and password reset are intentional exceptions. With JWT
authentication, an anonymous request to a protected route returns
`401 Unauthorized`. A user who
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

Settings and email accounts:

```text
GET   /api/v1/organizations/<organization_id>/settings/
PATCH /api/v1/organizations/<organization_id>/settings/
GET   /api/v1/organizations/settings/options/

GET    /api/v1/organizations/<organization_id>/email-accounts/
POST   /api/v1/organizations/<organization_id>/email-accounts/
GET    /api/v1/organizations/<organization_id>/email-accounts/<account_id>/
PATCH  /api/v1/organizations/<organization_id>/email-accounts/<account_id>/
DELETE /api/v1/organizations/<organization_id>/email-accounts/<account_id>/
POST   /api/v1/organizations/<organization_id>/email-accounts/<account_id>/test/
```

`GET /api/v1/organizations/settings/options/` returns the timezone and locale
dropdown choices as `{value, label}` pairs. Timezones come from the runtime's
IANA database, while locales come from Django's `LANGUAGES` configuration.
These are code/configuration choices rather than database rows, so every client
can build the same dropdown without synchronizing reference data.

Create an SMTP account with:

```json
{
  "name": "Company SMTP",
  "provider": "smtp",
  "host": "smtp.example.com",
  "port": 587,
  "username": "mailer@example.com",
  "password": "provider-password",
  "use_tls": true,
  "use_ssl": false,
  "from_email": "mailer@example.com",
  "from_name": "Bubllio CRM",
  "is_default": true
}
```

Send a test email with:

```json
{ "recipient": "you@example.com" }
```

The password is accepted only on create or update and is never returned.

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

Invite a member by email:

```json
{
  "email": "teammate@example.com",
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

Automation email uses Django's console backend, so messages appear in the terminal
running `runserver`. The separate SMTP account test endpoint attempts real delivery;
setting an account as default does not connect it to automations.

Only `company.created` is automatically emitted. Other accepted trigger choices
are currently unwired. There is no automation update/delete endpoint yet.

Test Automation performs the configured action even for inactive rules and
returns HTTP 201 even for a recorded failure. Inspect `status` and
`run.error_message`. Its payload is stored in history, not rendered into email.
See [Automations](architecture/automations.md) for the complete behavior and
limitations.

For the complete authorization rules, read
`docs/architecture/authentication-and-roles.md`.
