---
name: add-automation-trigger
description: Implement and wire a Bubllio CRM automation trigger from a real domain event through dispatch and run logging. Use when a declared or new trigger must actually execute automations; do not use merely to rename an event label.
---

# Add an Automation Trigger

Read `docs/architecture/automations.md` and inspect `automations/events.py`,
`automations/services.py`, and the emitting app before editing.

## Required behavior

- Use one stable event name in `AutomationTrigger`; avoid duplicate string
  literals across apps.
- Emit the event from every relevant domain code path. A model signal is suitable
  when any save path must trigger it; an explicit service is preferable when the
  event represents a deliberate business action.
- Dispatch only automations belonging to the affected organization and only
  active automations with the matching trigger.
- Build a JSON-serializable payload with stable identifiers and useful event-time
  values. Do not include secrets or whole model objects.
- Ensure an update trigger does not fire on unrelated saves. For change events,
  compare the relevant previous and new values reliably.
- Be explicit about transaction timing. Use an after-commit approach when an
  externally visible action must not run for data that can still roll back.

## Tests and documentation

Test the positive path and relevant negative paths: different organization,
inactive automation, unrelated update, or unchanged tracked value. Verify the
resulting `AutomationRun` payload and status. Keep the documented “supported” and
“wired” trigger lists accurate.

Load `skills/verify-django-project/SKILL.md` before completion.

