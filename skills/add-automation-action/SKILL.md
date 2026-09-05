---
name: add-automation-action
description: Add a Bubllio CRM automation action with configuration validation, isolated execution, run-status handling, tests, and documentation. Use when automations gain a new executable action or an existing executor changes materially.
---

# Add an Automation Action

Read `docs/architecture/automations.md`. For email actions, also read
`docs/architecture/email-adapters.md` and preserve its provider boundary.

## Contract and execution

- Add a stable action type and a dedicated serializer for its configuration.
- Validate required fields, formats, and organization-owned references when the
  automation is created or updated; do not defer predictable errors to execution.
- Keep provider-specific behavior behind an adapter or service boundary.
- Produce one `AutomationRun` per attempt. Use `success` only after completion,
  `failed` with a useful sanitized error for exceptions, and `skipped` only when
  execution was intentionally not attempted.
- Never store credentials or sensitive provider responses in `action_config`,
  payloads, errors, or logs.
- Preserve organization ownership for referenced CRM data or integration accounts.

## Tests and documentation

Test configuration validation, successful execution, provider failure, run
logging, and tenant boundaries where relevant. Mock external delivery at the
adapter boundary; tests must not send real messages or require live credentials.
Update the automation documentation and API examples to match the implemented
configuration schema.

Load `skills/verify-django-project/SKILL.md` before completion.

