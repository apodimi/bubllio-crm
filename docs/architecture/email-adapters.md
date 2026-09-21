# Email Sending: Current Behavior and Direction

There are currently two separate sending paths. Configuring an organization SMTP
account does not switch automation emails to that account.

| Caller | Implementation | Transport |
|---|---|---|
| Automation action and manual automation test | `automations/services.py` calls Django `send_mail` | Global backend, currently console |
| Email account test endpoint | `organizations/email_service.py` opens an SMTP connection | Selected organization's SMTP account |

The first path prints email in the terminal with checked-in settings. The second
attempts a real network send. Tests use mocked or test email boundaries.

## Organization SMTP Accounts Are Implemented

Owners and administrators manage accounts through the API; authorized staff can
use Django admin. The first-run frontend can create one optional SMTP account;
ongoing account management is not yet available there.

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

Set `BUBLLIO_EMAIL_ENCRYPTION_KEY` before storing passwords. Generate a Fernet key:

```bash
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Keep it in a secret manager or ignored `.env`. Losing the key, or replacing it
without decrypting/re-encrypting accounts, makes existing passwords unusable.
Never put passwords or encryption keys in version control.

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
