# Getting Started

This guide explains how to run Bubllio CRM API locally.

## Requirements

- Python 3.13
- uv
- Git

Docker is optional and is needed only for the provided local PostgreSQL service.

## Install Dependencies

From the project root:

```bash
uv sync
```

`uv sync` reads `pyproject.toml` and `uv.lock`, creates the virtual environment if needed, and installs the locked dependencies.

Without database configuration, the project uses SQLite. To use PostgreSQL, read
the [Database Setup](development/databases.md) guide and install its optional
driver with `uv sync --extra postgres`.

## Run Checks

```bash
uv run python src/manage.py check
```

Expected output:

```text
System check identified no issues (0 silenced).
```

This verifies that Django can load the project, settings, apps, models, and URL configuration.

## Apply Database Migrations

```bash
uv run python src/manage.py migrate
```

This creates or updates whichever database is selected by `DATABASE_URL`, or the
default local SQLite database when the variable is unset.

The local database file is ignored by git:

```text
src/db.sqlite3
```

## First-run setup

For a new installation, generate a one-time setup token and put it in the
server's ignored `.env` file as `BUBLLIO_SETUP_TOKEN`. It must be at least 32
characters long. Use a random value:

```bash
uv run python -c "import secrets; print(secrets.token_urlsafe(32))"
```

After migrations, start Django and the React frontend (see
[Frontend README](../frontend/README.md)). Open the frontend. It displays the
setup form only while there are no Django users or organizations, no completed installation,
and a server-side setup token is configured. Enter the token, first admin
username/email/password, and first workspace name/slug. This creates a Django
superuser who is also the workspace owner. Sign in with that account afterward.

SMTP is optional. The setup screen has four steps: Admin, Workspace, Email, and
Review. You can move back without losing entered values, skip SMTP, and review
the details before creating anything. To add SMTP during setup, first set
`BUBLLIO_EMAIL_ENCRYPTION_KEY` on the server as described in
[Email Sending](architecture/email-adapters.md). Setup stores the SMTP password
encrypted in the existing organization email-account model only when you finish.
The Email step has a **Send test email** button: enter a recipient address and
it sends a real message using the currently entered settings. A successful API
response means the SMTP server accepted the message; check the inbox to verify
delivery. The test does not save the account and can be skipped. Setup does not
route automation emails through that account. You may skip SMTP
and configure it later via the authenticated organization API or Django admin.

The endpoint is rate-limited, checks the setup token, and closes after success.
Remove `BUBLLIO_SETUP_TOKEN` from the environment afterward. Never place it in
`VITE_*` variables, a public URL, logs, or version control. Use HTTPS if setup
is reached across a network. `DJANGO_SECRET_KEY`, database configuration,
allowed hosts, and other deployment security settings remain environment
configuration, not browser form fields.

## Invite teammates

Open a workspace and choose **People**. Enter a teammate's email and select
their workspace role. Bubllio sends an invitation through that workspace's
active default SMTP account; if none exists, configure one first. The link
expires after seven days. A new recipient creates an account from the link;
someone with an existing account signs in with the invited email. There is no
public signup page. After joining, a user sees only workspaces where their
invitation has been accepted. Only installation administrators can create new
shared workspaces.

Installation administrators can invite additional IT administrators from
Account settings. The invitation uses the installation fallback SMTP account,
expires after seven days, and can be accepted by a new or existing account.
Administrator privileges do not add workspace memberships automatically.

For deployments, set `BUBLLIO_APP_URL` to the public React origin so email
links open the right site. The local default is `http://127.0.0.1:5173`.

## Command-line alternative

If you prefer not to expose a first-run form, leave `BUBLLIO_SETUP_TOKEN`
unset and create the admin with Django's standard command:

```bash
uv run python src/manage.py createsuperuser
```

Use this account to log in to Django admin.

All CRM API endpoints require authentication. The REST API uses JWT access and
refresh tokens. For browser-based API testing, Django's admin/session login is
still available at:

```text
http://127.0.0.1:8000/api-auth/login/
```

For Postman, obtain a JWT pair from `POST /api/v1/auth/token/` with the same
local Django username and password, then send the access token as a Bearer
token. Use HTTPS outside local development.

## Run Server

```bash
uv run python src/manage.py runserver
```

Open:

```text
http://127.0.0.1:8000/admin/
http://127.0.0.1:8000/api-auth/login/
http://127.0.0.1:8000/api/v1/organizations/
```

## Local Email

Automation email uses console output by default.

The project uses:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

That means emails are printed in the terminal where `runserver` is running.

Organization SMTP accounts have a separate test endpoint that attempts real
delivery. Creating one does not change automation email behavior. See
[Email Sending](architecture/email-adapters.md) for that distinction and the
encryption key required when storing SMTP passwords.

## Try an Automation

Follow [Your First Automation](guides/first-automation.md) to create an active
rule, create a new company, and inspect the email output and run history.
Only `company.created` is automatically emitted today. No queue, worker, or
workflow server is needed. The future visual builder is described separately in
the [workflow roadmap](architecture/automation-roadmap.md).

## Environment Variables

Production must set:

```text
DJANGO_SECRET_KEY
```

Local development has a non-production fallback. Optional `DATABASE_URL` selects
the database; `BUBLLIO_EMAIL_ENCRYPTION_KEY` is needed for stored SMTP passwords.
Keep this key stable across restarts. If it is lost, create a new key and
re-enter the SMTP password in workspace Settings so the account can be
encrypted again. The first-setup SMTP account is the installation fallback for
workspaces that do not define their own active default account.
See [Database Setup](development/databases.md) and [Email Sending](architecture/email-adapters.md).
