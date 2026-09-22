# CRM Domain Model

This document explains the current CRM concepts and the naming decisions.

## Main Concepts

Current model hierarchy:

```text
Organization
  -> OrganizationMembership -> User
  -> OrganizationSettings
  -> EmailAccount
  -> OrganizationInvitation
  -> Company
       -> Contact
  -> Automation
       -> AutomationRun

User
  -> UserProfile
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
- pending invitations to users who are not members yet
- organization settings and encrypted SMTP email accounts

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
Organization 1 -> 1 OrganizationSettings
Organization 1 -> many EmailAccounts
```

## Business Logic

Business logic means rules that belong to the product domain, not just HTTP.

Examples:

- A contact's company must belong to the same organization.
- A company creation can trigger automations.
- An automation only runs inside its own organization.
- An email account may only be accessed through its organization's authorized
  settings endpoints; automation sending is not connected to these accounts yet.
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

For the event-to-action path, read [Automations](automations.md). A future
`Create contact` action would create a CRM record; a `Contact created` trigger
would react to one. Neither is currently implemented in the automation system.
The [workflow roadmap](automation-roadmap.md) explains this distinction.
## Tenant access boundary

Every authenticated user can access only organizations where they have an
`OrganizationMembership` with the required capability. Django staff or
superuser status does not bypass this tenant boundary; installation-level
administration is exposed only through explicitly scoped installation settings
endpoints. A pending invitation never creates membership and therefore never
makes a workspace visible in the organization list.
