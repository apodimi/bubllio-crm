# Email Sending: Current Behavior and Direction

There are currently four separate sending paths. Configuring an organization SMTP
account does not switch automation emails to that account.

| Caller | Implementation | Transport |
|---|---|---|
| Automation action and manual automation test | `automations/services.py` calls Django `send_mail` | Global backend, currently console |
| Email account test endpoint | `organizations/email_service.py` opens an SMTP connection | Selected organization's SMTP account |
| First-run setup test email | `organizations/email_service.py` sends one message | Unsaved SMTP settings supplied to the setup form |
| Workspace invitation | `organizations/email_service.py` sends the invitation link | Active default SMTP account of the inviting organization |

The first path prints email in the terminal with checked-in settings. The second
attempts a real network send. Tests use mocked or test email boundaries.

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

An owner or administrator can send a workspace invitation when either an active
workspace default SMTP account exists or the installation fallback configured
during first setup exists. Workspace SMTP wins; the fallback is used only when
the workspace has no active default. Invitation delivery failure returns `502`
and rolls back the invitation. The invitation link uses `BUBLLIO_APP_URL`,
which must be set to the public frontend origin in deployments.

The installation administrator can view or replace the fallback account from
Account settings in the React application. This uses
`/api/v1/organizations/installation-settings/` and is restricted to Django
staff users. It never returns the stored password. Saving a new password
re-encrypts it with the current `BUBLLIO_EMAIL_ENCRYPTION_KEY`.

Set `BUBLLIO_EMAIL_ENCRYPTION_KEY` before storing passwords. Generate a Fernet key:

```bash
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Keep it in a secret manager or ignored `.env`. The same key must be available
every time the application reads an existing SMTP account. Losing the key, or
replacing it without re-entering the SMTP password, makes existing passwords
unusable because Fernet encryption cannot be reversed without the original key.
If the original key is lost, generate a new one, restart the application with
it, then save the SMTP account again from workspace Settings; the new password
will be encrypted with the new key. Never put passwords or encryption keys in
version control.

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
