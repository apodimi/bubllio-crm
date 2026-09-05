---
name: write-api-tests
description: Write focused Django REST Framework tests for Bubllio CRM endpoints, domain invariants, tenant isolation, signals, and automation runs. Use for new feature coverage or regression tests; do not replace behavior changes with tests that encode a known bug.
---

# Write API Tests

Inspect the endpoint, serializer, model, and related service before choosing the
test boundary. Prefer observable behavior over implementation details.

## Coverage priorities

Cover the relevant subset of:

- successful request, response status, response body, and persisted state;
- invalid or missing input and missing resources;
- organization isolation and cross-organization references;
- search and filtering semantics;
- important side effects.

For automations, assert both the action boundary and resulting `AutomationRun`.
Include negative cases such as inactive rules and mismatched triggers. Mock
external systems, not the domain logic being tested.

Use helpers only when repetition justifies them. Keep fixtures small, make
organization ownership obvious, and avoid relying on ordering unless guaranteed.

Run the smallest relevant test target while iterating, then load
`skills/verify-django-project/SKILL.md` for final verification.

