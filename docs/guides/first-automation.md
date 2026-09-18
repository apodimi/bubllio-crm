# Try Your First Automation

Goal: create a company and see one email action and its recorded result.
This uses the current synchronous implementation with no extra services.
Follow [Getting Started](../getting-started.md), then import the
[Postman collection](../api-postman.md).

## 1. Create an Organization

Authenticate and send **Create Organization**. The collection stores
`organization_id`; your user becomes the owner. Requests below all use:

```text
/api/v1/organizations/{{organization_id}}/
```

## 2. Create the Rule

Send **Create Company Email Automation**, or `POST automations/` with:

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

Expect HTTP 201 and a rule ID. Postman saves it as `automation_id`.
This only saves the rule; it sends no email yet.

## 3. Create a New Company

Send **Create Company**, or `POST companies/` with:

```json
{
  "name": "Automation demo company",
  "lifecycle_stage": "lead"
}
```

Expect HTTP 201. The save emits `company.created`; the active rule executes
before the request finishes. With the checked-in console backend, inspect the
terminal running `runserver` for the email. No SMTP account is needed.

Existing companies are not replayed when the rule is created. More matching
active rules produce more action attempts.

## 4. Inspect History

Send **List Automation Runs**, or `GET automations/runs/`.
Look for the rule ID and new company ID in `payload`, with `status: success`.
The list is newest first. For a failed action, inspect `error_message`.

Company creation returning HTTP 201 alone does not prove the action succeeded.
A console success means the action completed, not inbox delivery.

## 5. Try the Manual Action Test

Send **Test Automation**, or `POST automations/{{automation_id}}/test/` with:

```json
{
  "payload": {
    "test": true,
    "source": "postman"
  }
}
```

This executes the action again and writes another run. It does not create a
company or verify event dispatch. It also runs inactive rules. HTTP status is
201 even for a recorded failure; check `status` and `run.error_message`.
The payload is logged, not substituted into email content.

## Common Surprises

| Observation | Explanation |
|---|---|
| `contact.created` rule never runs automatically | That choice exists but its event is not wired |
| Manual test works but company creation does nothing | Check trigger, active flag, and organization |
| SMTP account test arrives, automation email does not | Separate send paths; automations still use console |
| Contact creation does not send email | Only company creation emits an automation event |
| Cannot PATCH a rule through the API | No update route yet; edit in Django admin |

For implementation details and reliability limits, read
[Automations](../architecture/automations.md). For the planned visual experience,
read the [workflow roadmap](../architecture/automation-roadmap.md).
