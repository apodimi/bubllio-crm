# Email Adapters Plan

This document captures the direction for email sending in Bubllio CRM.

## Goal

The CRM should not be hardcoded to one email provider.

Some users may want:

- local console email
- SMTP
- Mailgun
- SendGrid
- Amazon SES
- Resend
- a custom provider

## Recommended Architecture

Use adapters.

Conceptually:

```text
Automation wants to send email
        |
        v
Email service
        |
        v
Adapter: console / SMTP / Mailgun / SendGrid / SES / Resend
```

The automation code should not care which provider sends the email.

It should call something like:

```python
email_sender.send(...)
```

The selected adapter handles provider-specific details.

## Env vs Database Config

Use both, but for different levels.

Environment variables:

```text
system-level default email provider
```

Database config:

```text
per-organization email accounts
```

## Phase 1

Keep the current local console backend.

Add an adapter interface and a default adapter selected by settings.

Example environment variable:

```text
BUBLLIO_EMAIL_PROVIDER=console
```

## Phase 2

Add SMTP adapter using environment variables.

Example:

```env
BUBLLIO_EMAIL_PROVIDER=smtp
BUBLLIO_SMTP_HOST=smtp.gmail.com
BUBLLIO_SMTP_PORT=587
BUBLLIO_SMTP_USERNAME=...
BUBLLIO_SMTP_PASSWORD=...
BUBLLIO_SMTP_USE_TLS=true
BUBLLIO_DEFAULT_FROM_EMAIL=no-reply@example.com
```

This is good for self-hosted installations that want one global provider.

## Phase 3

Add provider-specific adapters.

Examples:

```text
MailgunEmailSender
SendGridEmailSender
AmazonSesEmailSender
ResendEmailSender
```

The automation layer should not need to change when adding these.

## Phase 4

Add database-backed email accounts per organization.

Possible model:

```python
class EmailAccount(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    provider = models.CharField(max_length=50)
    from_email = models.EmailField()
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Secrets must be encrypted before storing them in the database.

Do not store SMTP passwords or API keys as plain text.

## Why This Is Better

Adapters keep the system extensible.

Adding a provider should mean:

```text
add one adapter
add settings/config validation
add tests
```

It should not require rewriting automations, serializers, or CRM domain logic.
