# Automations Architecture

Automations are the first step toward user-defined CRM workflows.

The basic idea is:

```text
When something happens,
run an action.
```

Example:

```text
When a company is created,
send an email to accounting.
```

In code terms:

```text
event/trigger -> automation lookup -> action execution -> run log
```

## Current Scope

Current implemented trigger:

```text
company.created
```

Current implemented action:

```text
send_email
```

Current execution style:

```text
synchronous
```

That means the automation runs during the same request that creates the company.

## Business Flow

```text
POST /api/v1/organizations/<organization_id>/companies/
  |
  v
Company is saved
  |
  v
company.created event is dispatched
  |
  v
Matching active automations are found
  |
  v
Action runs
  |
  v
AutomationRun is created
```

## App Structure

```text
src/automations/
  admin.py
  apps.py
  events.py
  models.py
  serializers.py
  services.py
  tests.py
  urls.py
  views.py
```

## `events.py`

Defines supported trigger names.

Current trigger constants:

```text
organization.created
organization.updated
company.created
company.updated
company.lifecycle_stage_changed
contact.created
contact.updated
```

Important: not all triggers are wired yet.

Currently wired:

```text
company.created
```

Why constants:

- We avoid random strings spread across the codebase.
- All supported triggers are documented in one place.
- Models, services, and views can reuse the same names.

## `models.py`

Defines the database models:

```text
Automation
AutomationRun
```

## Automation

`Automation` is the rule configured by the user.

Important fields:

```text
organization
name
trigger
action_type
action_config
is_active
created_at
updated_at
```

Example:

```json
{
  "organization": "organization-uuid",
  "name": "Notify accounting when a company is created",
  "trigger": "company.created",
  "action_type": "send_email",
  "action_config": {
    "to": ["accounting@example.com"],
    "subject": "New company created",
    "body": "A new company was added to Bubllio CRM."
  },
  "is_active": true
}
```

## `action_config`

`action_config` is a `JSONField`.

For `send_email`, it currently expects:

```json
{
  "to": ["accounting@example.com"],
  "subject": "New company created",
  "body": "A new company was added to Bubllio CRM."
}
```

Optional:

```json
{
  "from_email": "noreply@example.com"
}
```

Why JSON:

- Different action types need different settings.
- Email needs `to`, `subject`, `body`.
- A future Slack action may need `webhook_url`, `channel`, `message`.
- A future task action may need `title`, `due_at`, `assignee`.

## AutomationRun

`AutomationRun` is the execution history.

Every time an automation runs, we create a run record.

Important fields:

```text
automation
trigger
status
payload
error_message
created_at
```

Statuses:

```text
success
failed
skipped
```

Why this matters:

- If an email fails, we need to know.
- If an automation runs, we need history.
- Later we can add retries.
- Later we can show run logs in the UI.

## Services

File:

```text
src/automations/services.py
```

This file contains business logic that should not live directly in views.

Main functions:

```text
dispatch_company_created(company)
dispatch_automation_event(...)
run_automation(...)
```

Why use services:

- Views stay focused on HTTP request/response.
- Automation logic can be reused by any app.
- Later we can move execution to background jobs without changing every view.

## Signals

The first event is dispatched from:

```text
src/companies/signals.py
```

The signal listens to `post_save` for `Company`.

If `created` is true, it dispatches:

```text
company.created
```

This means automations run when a company is created through any code path that saves a new `Company`, not only through one API view.

## Local Email Behavior

In local development, emails are not sent to real inboxes.

We use:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

Emails are printed in the terminal where `runserver` is running.

## Test Automation Endpoint

Endpoint:

```text
POST /api/v1/organizations/<organization_id>/automations/<id>/test/
```

Why it exists:

- It improves DX.
- You can verify an automation is configured correctly.
- You get a direct API response with the `AutomationRun`.
- For local email, the response reminds you that the email is printed to the runserver terminal.

Creating and testing automations requires the `manage_automations` capability,
which is currently granted to organization owners and administrators. Automation
lists and run history are filtered by organization and may be viewed by any
organization member.

## Design Notes

This is intentionally not a full workflow engine yet.

Current scope:

```text
single trigger
single action
no conditions yet
synchronous execution
console email backend
run history
```

Future improvements:

```text
conditions
multiple actions per automation
background jobs
retries
templated email body
more action types
more triggers wired from models/signals
per-organization email settings
email adapter abstraction
```
