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
       -> Deal
  -> Automation
       -> AutomationRun

User
  -> UserProfile
```

## Organization

`Organization` is our own customer's workspace or tenant.

An organization represents one isolated customer workspace in Bubllio CRM.

An organization owns its CRM data:

- companies
- contacts
- deals and sales pipeline
- automations
- users and role-based permissions through memberships
- pending invitations to users who are not members yet
- organization settings and encrypted SMTP email accounts

Organization settings also hold the workspace's business identity, regional
preferences, and ERP defaults. Business identity includes legal/trading names,
tax and registration references, contact details, and postal address. ERP
defaults currently prepare currency, fiscal-year start, tax rate, payment terms,
and document numbering; they do not create accounting documents by themselves.

Users may opt into one private personal workspace through the workspace
picker. It is a normal tenant for the user's own companies, contacts and
automations, but it is marked `is_personal` and has a single owner. Personal
workspaces cannot be deleted, invited to, or given additional members.
Team/shared workspaces remain normal organizations: users see them after an
accepted invitation or when they create one for themselves. A workspace
awaiting its nominated owner is hidden from normal CRM endpoints. Membership
roles control access after provisioning.

## Company

`Company` is an external business stored inside the CRM.

A company is an external business that the workspace sells to or works with.

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

The company record also stores the business profile needed during sales and
customer servicing: tax/VAT reference, industry, contact channels, postal
address, country code, and internal notes. These fields belong to the owning
organization and are included in tenant-scoped search.

Each company receives an organization-scoped customer code (`CUS-00001`, then
`CUS-00002`, and so on) and may be assigned to one workspace member as its
account owner. Tax/VAT IDs and email addresses are checked case-insensitively
for exact duplicates inside the same organization.

Customer-facing company URLs use this shorter code as their public reference.
The API still accepts the original UUID in detail and action routes so existing
bookmarks and integrations remain compatible.

Companies are archived and restored for normal lifecycle management. Active
lists hide archived records by default, while explicit filters can show archived
or all records. Permanent deletion remains an API-level operation for empty
records only; a company with contacts cannot be deleted.

`CompanyActivity` records who created, updated, assigned, archived, or restored
a company. It also records when a contact is added. Activity entries store safe
metadata such as changed field names rather than previous field values.

## Contact

`Contact` is a person inside a company.

A contact is a person who works at one of the stored companies.

Contacts belong to:

- one organization
- one company

The serializer validates that the selected company belongs to the selected organization.
Contact email addresses are checked case-insensitively for exact duplicates
inside the same organization. Contacts can be searched by name, communication
details, department, or job title and filtered by their company. They also track
an optional workspace owner, active/former status, one active primary contact
per company, archival state, and a tenant-scoped activity log. See the
[business contact guide](../guides/contact-management.md) for the non-technical workflow.

## Deal

`Deal` is a tenant-owned sales opportunity connected to one company and
optionally one contact and workspace owner. It moves through lead, qualified,
proposal, negotiation, won, or lost stages and stores value, currency,
probability, and expected close date. The entered amount records whether it is
net or VAT-inclusive; the API derives net value, VAT amount, and gross value
without mixing tax into revenue forecasts. Deals also keep a stable position
inside each pipeline stage so drag-and-drop ordering persists. Cross-tenant
company, contact, and owner references are rejected. See the
[business pipeline guide](../guides/sales-pipeline.md).

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
Organization 1 -> many Deals
Organization 1 -> many ServiceCatalogItems
Organization 1 -> many CustomerSubscriptions
Organization 1 -> many Charges
Organization 1 -> many Payments
Organization 1 -> many OrganizationMemberships
User 1 -> many OrganizationMemberships
Company 1 -> many Contacts
Company 1 -> many CompanyActivities
Company 1 -> many Deals
Company 1 -> many CustomerSubscriptions
User 1 -> many assigned Companies
Organization 1 -> many Automations
Automation 1 -> many AutomationRuns
Organization 1 -> 1 OrganizationSettings
Organization 1 -> many EmailAccounts
User 1 -> 0 or 1 personal Organization
CustomerSubscription 1 -> many Charges
Charge 1 -> many Payments
```

## Services and billing

`ServiceCatalogItem` stores reusable commercial defaults such as a service name,
net price, VAT rate and billing cycle. `CustomerSubscription` is the actual
agreement with one company and keeps a copy of those values so later catalog
changes cannot rewrite customer history.

Creating a subscription creates its first `Charge`. A charge snapshots net,
VAT and gross amounts for one coverage period. One or more `Payment` records may
settle it. The payment status is derived from the received and outstanding
amounts; it is not a manually maintained boolean.

When an active recurring subscription with auto-renew enabled is fully paid,
the service creates exactly one next charge. The database uniqueness constraint
on subscription and due date keeps this operation idempotent. Pausing or
cancelling a subscription does not delete its charges or payments. A normal
cancellation enters `cancelling` state through the current charge's coverage
end, cancels only later open charges, and prevents payment from generating
another charge. It may be resumed before that effective date without duplicating
the next charge. Immediate cancellation remains an explicit exceptional action.

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
serializers.py (or api/*_serializers.py) -> API input validation
services/*.py                           -> reusable domain behavior
models.py                                -> core data constraints and simple model behavior
api/*.py                                 -> HTTP request/response coordination
```

Views should not become the place where all product rules live.

For the event-to-action path, read [Automations](automations.md). A future
`Create contact` action would create a CRM record; a `Contact created` trigger
would react to one. Neither is currently implemented in the automation system.
The [workflow roadmap](automation-roadmap.md) explains this distinction.
## Tenant access boundary

Every authenticated user can access normal REST resources only in organizations
where they have an `OrganizationMembership` with the required capability. Django
staff or superuser status does not bypass this REST boundary; however, a Django
superuser has broad access through `/admin/`. Installation administration uses
explicit endpoints. A normal pending invitation does not create membership;
provisioning creates a temporary owner membership but keeps the workspace
inaccessible until the nominated owner accepts.
