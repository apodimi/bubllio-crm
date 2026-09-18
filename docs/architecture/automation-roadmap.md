# Workflow Direction: Build on Django

Status: design direction, not implemented functionality. For the running system,
read [Automations: Current Behavior](automations.md).

## Product Goal

A future CRM user should arrange blocks, configure them with forms, activate
the workflow, and inspect the result of each step. The first useful experience
is a linear sequence:

```text
When a company is created
  -> Create a contact for that company
  -> Send an email to the contact
```

These are proposed blocks. Today only `company.created -> send_email` exists,
with fixed email configuration. There is no frontend builder in this repository.
The trigger can serve as the visual Start block without another backend operation.

## Initial Technical Decision

Use the existing Django/DRF application and database for the next iteration.
No RabbitMQ, Celery, Node-RED, external workflow engine, or frontend library is
being introduced by this decision. SQLite and PostgreSQL remain supported.

This keeps local setup small and preserves organization permissions, CRM
services, and email credentials in one application. Contributors can understand
a complete execution without operating another service.

The tradeoff is synchronous execution: slow actions occupy the request process,
with no durable background execution or automatic recovery. Keep initial flows
short. Revisit background processing when workload or product requirements
justify it; saving a run does not make it a durable queue.

## Events, Actions, and Waiting

| Block | Meaning | Design consequence |
|---|---|---|
| Company created | Starts a run after company creation | Entry trigger |
| Create contact | Creates a contact using configured inputs | Action with an output |
| Contact created | Starts a separate run after contact creation | Another entry trigger |
| Wait for contact created | Pauses an existing run until a matching contact appears | Persistent state and event correlation |
| Send email | Sends configured content to selected recipients | Action using an organization-authorized sender |

Waiting may last days. It must correlate organization and company, define
timeouts and cancellation, and handle events arriving around registration of
the wait. It cannot sleep inside an HTTP request. Whether the product needs
this block is still an open requirement.

## Incremental Delivery

1. Make the current path trustworthy: expose only wired triggers, require valid
   configuration, clarify manual tests, and test the signal-to-run path. Preserve
   existing rules and runs through explicit migrations if structure changes.
2. Reuse organization SMTP sending for the email action, with same-tenant account
   validation and explicit account-selection and inactive-account policies.
3. Add ordered actions. Start with one entry trigger and a linear list of steps.
   Persist a definition snapshot/version and per-step results so later edits
   cannot rewrite what an earlier run means.
4. Expose the supported block catalog and configuration requirements through the
   API. A future editor can render forms and store layout separately from
   executable meaning.
5. Build the visual UI with draft, validation, publish, test, and run inspection.
   Choose frontend tooling when frontend work begins.

Each stage needs implementation, migration review where relevant, tests, and
documentation updates. This list does not change today's API schema.
Conditions, branches, loops, schedules, waits, and user-supplied code are outside
the first linear version.

## Proposed Responsibilities

- Models store organization-owned definitions, versions, runs, and step results.
- Serializers validate complete definitions and references to allowed outputs.
- Views authorize requests and coordinate validation, publication, and execution.
- Services implement CRM actions and execute steps in the defined order.
- The future UI draws flows and collects configuration. The server validates
  independently; connecting boxes cannot grant extra permissions.

For the first linear runner, stop on a failed step and retain previous results.
An earlier email cannot be undone by rolling back later database writes. Define
retry and duplicate-prevention rules before adding a retry button, especially
for contact creation and email sending. Bound execution and prevent actions
from recursively triggering unlimited workflows.

## Decisions Needed Before Multi-step Implementation

- Whether the contact step creates a record or waits for one created elsewhere.
- How users supply contact fields and select outputs from earlier steps.
- How email accounts, templates, and missing values are selected and validated.
- How publication, in-flight runs, event timing, and failure recovery interact.

These are product and execution semantics that the future UI must make clear.
