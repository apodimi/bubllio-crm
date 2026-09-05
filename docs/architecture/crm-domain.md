# CRM Domain Model

This document explains the current CRM concepts and the naming decisions.

## Main Concepts

Current model hierarchy:

```text
Organization
  -> OrganizationMembership -> User
  -> Company
       -> Contact
  -> Automation
       -> AutomationRun
```

## Organization

`Organization` is our own customer's workspace or tenant.

Example:

```text
Nerds Lab uses Bubllio CRM.
Nerds Lab is an Organization.
```

An organization owns its CRM data:

- companies
- contacts
- automations
- users and role-based permissions through memberships
- future email settings

## Company

`Company` is an external business stored inside the CRM.

Example:

```text
Acme Inc is a company that Nerds Lab sells to or works with.
```

We chose `Company` instead of `Customer` because not every company is already a customer.

A company may be:

- lead
- prospect
- customer
- inactive

That status lives in:

```text
Company.lifecycle_stage
```

## Contact

`Contact` is a person inside a company.

Example:

```text
Maria works in accounting at Acme Inc.
```

Contacts belong to:

- one organization
- one company

The serializer validates that the selected company belongs to the selected organization.

## Why Not Use `Customer` As The Main Model?

`Customer` sounds like someone who already bought something.

In CRM systems, we often need to store companies before they become customers.

Better naming:

```text
Company = the external business
Contact = a person at that business
Company.lifecycle_stage = whether the company is a lead, prospect, customer, or inactive
```

This lets us model the full CRM lifecycle without renaming things later.

## Future Account Concept

We discussed `Account`, but for now `Company` carries that role.

Later, if the product needs more advanced account management, we can introduce an `Account` concept carefully. For now, adding it too early would create naming confusion.

## Current Relationships

```text
Organization 1 -> many Companies
Organization 1 -> many Contacts
Organization 1 -> many OrganizationMemberships
User 1 -> many OrganizationMemberships
Company 1 -> many Contacts
Organization 1 -> many Automations
Automation 1 -> many AutomationRuns
```

## Business Logic

Business logic means rules that belong to the product domain, not just HTTP.

Examples:

- A contact's company must belong to the same organization.
- A company creation can trigger automations.
- An automation only runs inside its own organization.
- A future email account may only be used by its organization.
- An authenticated user may access an organization only through a membership and
  the capabilities granted by its role.

See `docs/architecture/authentication-and-roles.md` for the complete tenant and
role rules.

Where business logic should live:

```text
serializers.py -> input validation related to API data
services.py    -> reusable domain behavior
models.py      -> core data constraints and simple model behavior
views.py       -> HTTP request/response coordination
```

Views should not become the place where all product rules live.
