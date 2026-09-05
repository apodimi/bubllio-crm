---
name: add-crm-resource
description: Add or expand a Bubllio CRM REST resource, including its Django model, tenant rules, API surface, migrations, tests, admin integration, and relevant documentation. Use for organization-owned CRM entities or CRUD operations; do not use for automation execution behavior alone.
---

# Add a CRM Resource

Read `docs/architecture/crm-domain.md` and `docs/api/rest-patterns.md` before
designing the change. Inspect a similar existing app rather than assuming all CRUD
operations already follow the same pattern.

## Domain and tenancy

- Decide which organization owns the resource and make that relationship
  explicit.
- Enforce cross-resource tenant invariants. For example, a contact cannot point
  to a company from another organization.
- Scope reads and writes to the organization when request identity or routing
  provides an organization context. Do not introduce fake isolation by trusting
  an unvalidated organization ID from the payload.
- Preserve UUID public identifiers and intentional cascade behavior.

## Implementation

Implement only the operations requested. A typical new resource may require:

- model and migration;
- admin registration;
- serializer validation and read-only fields;
- collection, detail, or custom-action views;
- app and project URL routing;
- focused API and domain tests;
- updates to API/domain documentation and Postman artifacts when their published
  behavior changes.

Keep reusable product rules out of views. Return useful validation errors without
exposing internal exceptions.

## Completion

Load `skills/verify-django-project/SKILL.md` and run its proportional verification.
Report any operation intentionally left out of scope.

