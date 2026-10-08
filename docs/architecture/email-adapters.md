# Email Sending: Current Behavior and Direction

There are currently several sending paths. Configuring an organization SMTP
account does not switch automation emails to that account.

| Caller | Implementation | Transport |
|---|---|---|
| Automation action and manual automation test | Queued through the database outbox, then Django `send_mail` | Global backend, currently console |
| Email account test endpoint | `organizations/services/email_service.py` opens an SMTP connection | Selected organization's SMTP account |
| First-run setup test email | `organizations/services/email_service.py` sends one message | Unsaved SMTP settings supplied to the setup form |
| Workspace invitation | Queued, then sent by a worker | Active default SMTP account of the inviting organization |
| Installation-admin invitation | Queued, then sent by a worker | Installation fallback SMTP account |
| Password reset | Queued, then sent by a worker | Installation fallback SMTP account, or the global backend when none is configured |

Transactional account emails use one branded Bubllio layout for workspace and
installation-admin invitations, password resets, and SMTP test messages. Every
message is multipart: responsive HTML for modern clients and a plain-text fallback
for accessibility and restrictive clients.

The editable source is `email_templates/src/transactional.mjml`. Build it with:

```bash
cd email_templates
npm ci
npm run build
```

The build writes `src/organizations/templates/emails/transactional.html`. Commit
both the MJML source and compiled HTML. Production reads the compiled Django
template, so Node and MJML are not production runtime dependencies. CI rebuilds
the template and fails when the committed HTML is out of date.

The automation path prints email in the terminal with checked-in settings. Saved
or unsaved SMTP accounts attempt a real network send. Tests use mocked or test
email boundaries.

## Organization SMTP Accounts Are Implemented

Owners and administrators manage accounts through the API; authorized staff can
use Django admin. The first-run frontend can create one optional SMTP account;
ongoing account management is not yet available there. Before completing setup,
the frontend can send a real test email through
`POST /api/v1/setup/smtp-test/` using unsaved settings and a recipient supplied
by the operator. The test does not persist credentials or switch automation
emails to SMTP. A successful response means the SMTP server accepted the
message; delivery still needs to be checked in the inbox.

```text
GET    /api/v1/organizations/<organization_id>/email-accounts/
POST   /api/v1/organizations/<organization_id>/email-accounts/
GET    /api/v1/organizations/<organization_id>/email-accounts/<account_id>/
PATCH  /api/v1/organizations/<organization_id>/email-accounts/<account_id>/
DELETE /api/v1/organizations/<organization_id>/email-accounts/<account_id>/
POST   /api/v1/organizations/<organization_id>/email-accounts/<account_id>/test/
```

The test body is `{ "recipient": "person@example.com" }`. A successful attempt
records `last_tested_at` and clears `last_test_error`. A sending exception is
stored as a truncated string in `last_test_error`; it is not comprehensively
sanitized. The immediate HTTP failure response is generic and uses status 502.
Treat stored diagnostics as potentially sensitive. Password fields are write-only
through the API and encrypted at rest.

An owner or administrator can queue a workspace invitation when either an active
workspace default SMTP account exists or the installation fallback configured
during first setup exists. Workspace SMTP wins; the fallback is used only when
the workspace has no active default. A queue/database failure rolls back the
invitation; a later SMTP failure is recorded in the outbox and retried. The
invitation link uses `BUBLLIO_APP_URL`,
which must be set to the public frontend origin in deployments.

## Background delivery and recovery

Transactional emails and automation runs use Celery with RabbitMQ. PostgreSQL
stores the authoritative outbox row; RabbitMQ carries only its UUID. Invitation
tokens are encrypted in the outbox and removed after successful handling.
Workers retry failures with increasing delays up to six attempts. Celery Beat
republishes due rows and recovers jobs whose worker lock became stale.

Delivery is at-least-once: a worker can finish an external send and crash before
marking it complete, so a rare duplicate email is possible. Revoked, accepted,
or expired invitations are checked again before sending. SMTP test buttons stay
synchronous so the operator receives an immediate connectivity result.

The installation administrator can view or replace the fallback account from
Account settings in the React application. This uses
`/api/v1/organizations/installation-settings/` and is restricted to active Django
superusers. It never returns the stored password. Saving a new password
re-encrypts it with the primary key in `BUBLLIO_EMAIL_ENCRYPTION_KEYS`.

For normal production installation, enter SMTP once in the first-run setup.
The deployment Compose files do not require duplicate `DJANGO_EMAIL_*` values.
Django's global email backend remains an advanced fallback only when no saved
installation account is available; operators who need it can pass those
settings through a deployment-specific Compose override.

Set `BUBLLIO_EMAIL_ENCRYPTION_KEYS` before storing passwords. Generate a Fernet key:

```bash
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Keep it in a secret manager or ignored `.env`. `BUBLLIO_EMAIL_ENCRYPTION_KEY`
remains supported for existing single-key installations, but new deployments
should use the plural setting.

To rotate a key without losing saved credentials:

1. Generate a new key.
2. Set `BUBLLIO_EMAIL_ENCRYPTION_KEYS=new-key,previous-key`; the first key is
   always used for new encryption and the remaining keys are decrypt-only
   fallbacks.
3. Back up the database and run
   `uv run python src/manage.py rotate_email_encryption`.
4. Verify one SMTP connection, then change the setting to contain only the new
   key.

The rotation command locks the credential rows and uses one database
transaction. If any value cannot be decrypted, the whole operation rolls back.
Losing every key that can decrypt an existing value is not recoverable. Never
put passwords or encryption keys in version control.

## Next Integration: Reuse Django SMTP Sending

Planned, not implemented: let `send_email` select an authorized account belonging
to the automation's organization and reuse an organization-aware sending service.
Define account selection, inactive-account behavior, and behavior when no account
is available. Marking an account `is_default` today does not connect it to
automation sending.

This can use Django's email backend support and the existing encrypted account
model. No additional provider framework or service is required. Definitions
should reference account IDs, never copy passwords into action JSON or payloads.

Additional provider adapters are a possible later extension. There is currently
no generic `email_sender` interface, provider SDK integration, or
`BUBLLIO_EMAIL_PROVIDER` selection setting. Older phase-based proposals are
superseded by this description and the [workflow roadmap](automation-roadmap.md).
