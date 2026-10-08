# Automations: Current Behavior

Bubllio currently supports one small automation: when a company is created,
queue a configured email action and record the result. Celery workers execute
jobs from RabbitMQ, while a database outbox preserves recoverable job state.

This page describes implemented behavior. The [workflow roadmap](automation-roadmap.md)
describes the future visual builder; it is not an API contract or a shipped feature.
Start with the [automation walkthrough](../guides/first-automation.md) to try it.

## Vocabulary

| Term | Meaning | Current example |
|---|---|---|
| Event | Something that happened in the CRM | A company was created |
| Trigger | Event name a rule listens for | `company.created` |
| Automation | Saved rule belonging to one organization | Notify accounting |
| Action | Operation the rule performs | `send_email` |
| Configuration | Settings for that operation | Recipients, subject, body |
| Payload | Data describing this occurrence | Company ID, name, lifecycle stage |
| Run | Recorded result of one execution attempt | `success` or `failed` |

Creating an automation saves a rule. It does not execute it or replay companies
created earlier. Each later matching event can execute it again.

## What Works Today

| Capability | Current behavior |
|---|---|
| Automatically dispatched trigger | `company.created` only |
| Action | One `send_email` per automation |
| Rule selection | Same organization, matching trigger, `is_active=True` |
| Execution | Asynchronous through Celery/RabbitMQ and the database outbox |
| Email content | Fixed recipients, subject and body from `action_config` |
| Email transport | Global Django backend; currently console output |
| History | A queued run followed by processing and a terminal result |
| API | List/create rules, list runs, manually execute a rule |
| Administration | Django admin can edit existing rules and their active flag |

There is no visual editor, contact-creation action, template interpolation,
condition, multi-step flow, wait state, or user-defined schedule. The API has no
automation detail, update, or delete route.

### Declared Triggers Are Not All Connected

`events.py` declares these choices, which the API currently accepts:

| Trigger | Automatically emitted by current code? |
|---|---|
| `company.created` | Yes, from Company `post_save` |
| `company.updated` | No |
| `company.lifecycle_stage_changed` | No |
| `contact.created` | No |
| `contact.updated` | No |
| `organization.created` | No |
| `organization.updated` | No |

Saving an unwired choice does not make it work. A manual test can still execute
its action because it bypasses event dispatch. Restricting selectable triggers
to implemented events is a planned correction, not a completed change.

## Execution and Code Map

```text
New Company saved through API, admin, or ordinary ORM save
  -> companies/signals.py: post_save(created=True)
  -> dispatch_company_created(company): build payload
  -> dispatch_automation_event(...): select active rules in this organization
  -> transaction.on_commit(...): dispatch matching rules after the save commits
  -> queue_automation_run(...): create queued run and durable outbox row
  -> Celery worker: claim the outbox row and execute the action
  -> _send_email(...): Django send_mail using global backend
  -> AutomationRun and outbox: persist terminal state
```

An update does not emit `company.created`. Bulk operations such as `bulk_create`
do not take this signal path. With no matching active rule, no run is created.
If several rules match, all are queued; worker concurrency determines execution
order.

| File | Responsibility and reason |
|---|---|
| `companies/apps.py` | Imports signals in `ready()` to register the receiver |
| `companies/signals.py` | Detects creation outside HTTP views too |
| `automations/events.py` | Centralizes event names and model choices |
| `automations/models.py` | Stores rules and results, with UUID identifiers |
| `automations/serializers.py` | Validates API configuration and shapes responses |
| `automations/services.py` | Selects rules and performs actions outside HTTP concerns |
| `automations/views.py` | Checks organization access and coordinates requests |
| `automations/urls.py` | Exposes the implemented endpoint operations |
| `automations/admin.py` | Registers rules and run history in Django admin |
| `automations/tests.py` | Currently tests API authorization and tenant scoping |
| `automations/migrations/0001_initial.py` | Initial rule and run schema |

## Stored Data

`Automation` holds `organization`, `name`, `trigger`, `action_type`,
`action_config`, `is_active`, and timestamps. The organization comes from the
authorized URL context, not the request body.

Example create body:

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

When configuration validation runs, `to` must contain at least one valid email
address and `subject` and `body` must be nonblank. `from_email` is optional.
JSON allows action-specific settings; it does not make arbitrary actions
executable. Only `send_email` is implemented.

The model permits a default empty configuration. Omitted configuration or
records created outside the API can therefore reach execution without required
keys and fail. Model/admin saves do not use the DRF action serializer.

The company event payload is:

```json
{
  "company_id": "<company UUID>",
  "company_name": "Acme Inc",
  "lifecycle_stage": "lead"
}
```

Payload is stored for inspection; it is not used to select recipients or render
email text. A string such as `{{ company_name }}` remains literal text.

`AutomationRun` stores `automation`, `trigger`, `status`, `payload`,
`error_message`, and `created_at`. It has no duration, attempts counter, per-step
results, or snapshot of the rule configuration. Deleting an automation cascades
to its runs; deleting its organization cascades to both.

| Status | Meaning in current code |
|---|---|
| `queued` | Durable outbox work exists and is waiting for a worker |
| `processing` | A worker has claimed the run |
| `success` | Action returned without raising an exception |
| `failed` | Execution raised an exception; its string is recorded |
| `skipped` | Executor encountered an unsupported action type |

`skipped` is a defensive executor path; normal API validation allows only the
known action type. Inactive rules are filtered out, not logged as skipped.
`success` does not prove inbox delivery; the sender's numeric return value is
not checked.

## API and Manual Tests

All routes are below `/api/v1/organizations/<organization_id>/`:

| Method and suffix | Access | Result |
|---|---|---|
| `GET automations/` | Any organization role | Rules in this organization |
| `POST automations/` | Owner/admin | Create rule; HTTP 201 |
| `GET automations/runs/` | Any organization role | Runs, newest first |
| `POST automations/<automation_id>/test/` | Owner/admin | Execute action; HTTP 201 with result |

Superuser access and inaccessible-organization responses follow the shared
[authorization rules](authentication-and-roles.md).

The test endpoint queues a real action, not a dry run. It:

- does not create a company or verify the event signal;
- executes even when `is_active=False` or the selected trigger is unwired;
- records supplied `payload`, or a default test payload when it is falsy;
- returns `status`, `run`, and a console-email `dev_note`;
- returns HTTP 201 with the initial `queued` state.

Clients must inspect the response status field. To test the complete event path,
create a new company after creating the rule and inspect run history.

## Email Boundary

Automation emails call Django's global `send_mail`. The checked-in backend
prints messages to the console. Organization SMTP accounts have a separate
real-send test endpoint and are not selected by automation execution, even when
marked default. See [Email Sending](email-adapters.md).

## Reliability and Review Findings

This asynchronous foundation has known limitations:

- Delivery is at-least-once. A worker crash after sending but before recording
  success can produce a duplicate email.
- A database error while creating the run/outbox can still escape to the caller.
- Failed outbox jobs retry up to six attempts; there is not yet a user-facing
  retry control or dead-letter dashboard.
- Action exception strings are stored as-is; run history is not a sanitized
  audit log and is readable by organization members.
- Existing automation tests cover authorization/scoping, but do not establish
  end-to-end signal execution, delivery, inactive-rule filtering, or recovery.

The [roadmap](automation-roadmap.md) prioritizes these gaps while keeping the
initial implementation within the existing Django stack.
