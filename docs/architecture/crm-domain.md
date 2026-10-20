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
       -> Task

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
- tasks and follow-ups
- users and role-based permissions through memberships
- pending invitations to users who are not members yet
- organization settings and encrypted SMTP email accounts

Organization settings also hold the workspace's business identity, regional
preferences, and ERP defaults. Business identity includes legal/trading names,
tax and registration references, contact details, and postal address. ERP
defaults currently prepare currency, fiscal-year start, tax rate, payment terms,
and document numbering; they do not create accounting documents by themselves.

Users may opt into one private personal workspace through the workspace
picker. It is a normal tenant for the user's own companies and contacts, but it is marked
`is_personal` and has a single owner. Personal
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

Non-empty company email/tax IDs and contact emails are also protected by
tenant-scoped database uniqueness constraints, including archived records.
Customer codes use a transactional counter per organization rather than scanning
existing companies. See the [database upgrade procedure](../development/migrations.md#crm-database-performance-upgrade)
for duplicate preflight checks, counter backfill, and deployment precautions.

Customer-facing company URLs use this shorter code as their public reference.
The API still accepts the original UUID in detail and action routes so existing
bookmarks and integrations remain compatible.

Companies are archived and restored for normal lifecycle management. Active
lists hide archived records by default, while explicit filters can show archived
or all records. Permanent deletion remains an API-level operation for empty
records only; a company with contacts cannot be deleted.

Archiving changes the company record's visibility only. It does not implicitly
archive or stop contacts, deals, tasks, customer services, charges, or payments.
Those records keep their own lifecycle so an operator can finish or retain
existing work explicitly instead of losing it through a hidden cascade.

`CompanyActivity` records who created, updated, assigned, archived, or restored
a company. It also records when a contact is added. Activity entries store safe
metadata such as changed field names rather than previous field values.

`CompanyTimelineEvent` is the customer-facing, append-only history for a company.
It combines company and contact changes with deals, tasks, customer services,
payments, manual workspace notes, and structured communication logs. Events store
a stable type, category, optional source reference, actor, timestamp, and safe
display metadata. Manual notes store their text in `body`; communication logs
store their channel and outcome as display metadata and may reference a contact;
system events do not copy previous field values.
The timeline is indexed for newest-first company reads and category filters.

The tenant-scoped company attention endpoint returns at most five active companies
assigned to the current user that have no incomplete task. Companies with no
recorded communication sort before those with older communication. This is a
derived My work view, not a stored health score.

The API is `/api/v1/organizations/<organization_id>/companies/<company_id>/timeline/`.
Workspace viewers may read it; roles with `manage_crm` may add a note or log a
call, email, or meeting. A referenced contact must belong to the same company and
organization. Ownership always comes from the authorized organization and company
URL. Results are paginated with a default page size of 25 and a maximum of 100.
The attention view is
`/api/v1/organizations/<organization_id>/companies/attention/` and requires
`view_crm`.

## Action inbox

The action inbox is a derived, non-persistent view of unresolved work assigned
to the current user. It combines overdue and due-today tasks, active deals
without an open next action, active companies without an open follow-up,
grouped billing conditions, and pending invitations for roles that can manage
members. A company signal is omitted when one of its deals already has a
stronger signal. Items have stable IDs, deterministic severity and due-date
ordering, and the response is bounded to 50 items.

The endpoint is
`GET /api/v1/organizations/<organization_id>/activity-inbox/` and requires
`view_crm`. The membership role is evaluated server-side; pending invitations
are included only for roles with `manage_members`. The count is the number of
currently unresolved items, not an unread-message count. Read, dismiss, and
notification-delivery state are not implemented.

The web client refreshes this derived view every 30 seconds while active, on
window focus, and after related mutations such as completing a task. This is
near-live polling; the inbox does not use WebSockets or server-sent events.

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

Deal lists support tenant-scoped operational filters for ownership, missing or
present next actions, expected-close date ranges, archive state, and an optional
bounded result limit. The built-in My work and deal views compose these filters
through bookmarkable URLs; they do not create persistent custom-view records.

The web client exposes a canonical deal profile at
`/organizations/<organization_id>/deals/<deal_id>`. It combines the existing
tenant-scoped deal detail with tasks filtered by that deal, and supports the
existing edit, archive/restore, add-task, edit-task, and complete-task actions.
The older `/deals?deal=<deal_id>` drawer URL remains compatible for saved links.
This first profile version does not claim an immutable deal event or stage
history; that remains future work.

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
Organization 1 -> many Tasks
Organization 1 -> many ServiceCatalogItems
Organization 1 -> many CustomerSubscriptions
Organization 1 -> many Charges
Organization 1 -> many Payments
Organization 1 -> many ExternalCollaborators
Organization 1 -> many CollaboratorServices
Organization 1 -> many DealCostLines
Organization 1 -> many OrganizationMemberships
User 1 -> many OrganizationMemberships
Company 1 -> many Contacts
Company 1 -> many CompanyActivities
Company 1 -> many Deals
Company 1 -> many Tasks
Company 1 -> many CustomerSubscriptions
User 1 -> many assigned Companies
Company 1 -> many CompanyTimelineEvents
Organization 1 -> 1 OrganizationSettings
Organization 1 -> many EmailAccounts
User 1 -> 0 or 1 personal Organization
CustomerSubscription 1 -> many Charges
Charge 1 -> many Payments
ExternalCollaborator 1 -> many CollaboratorServices
Deal 1 -> many DealCostLines
```

## External collaborators and deal costing

External collaborators are organization-owned supplier records, not users and
not workspace members. Each collaborator may have a reusable service catalog
with a default cost and currency. A collaborator or catalog service is retired
by setting `is_active` to false; the API does not hard-delete either resource.

Deals may contain internal cost lines. A cost line snapshots the collaborator
name, service name, description, unit cost, and currency when it is created, so
later catalog edits do not rewrite historical deal economics. Lines may be
estimated, committed, paid, or cancelled. Cancelled lines are excluded from
profitability.

Cost lines must use the deal currency. Bubllio does not perform foreign-exchange
conversion. Deal profitability uses the deal's net value before VAT and reports
estimated cost, committed cost, estimated gross profit, and estimated margin.
These figures are commercial forecasts, not accounting net profit or proof of
collection.

The collaborator API is under
`/api/v1/organizations/<organization_id>/costing/`. Deal costs and profitability
are nested below `/api/v1/organizations/<organization_id>/deals/<deal_id>/`.
Workspace viewers may read them; roles with `manage_crm` may make changes. Every
related record is validated against the organization resolved from the URL.

## Tasks and next actions

`Task` is an organization-owned follow-up anchored to one company and optionally
linked to a contact or deal from that same company. It records a task, call,
email or meeting with an owner, priority, due time, optional reminder time and
notes. Organization ownership always comes from the authorized URL; related
records and assignees are validated against that organization.

Workflow is stored separately as `todo`, `in_progress`, `waiting` or
`completed`. Completion is recorded with `completed_at` and `completed_by`.
Moving to `completed` fills that audit metadata; moving out of it clears the
metadata. All move, complete and reopen operations use the same row-locking
service so these values cannot drift apart. Overdue remains a derived status
for an incomplete task whose due time has passed, not a mutable database flag.
The earliest incomplete task linked to a deal is its next action in the
frontend. Task creation, updates, workflow changes, completion, and reopening
are recorded in the owning company's customer timeline. Reminder delivery is
not yet implemented.

## Services and billing

`ServiceCatalogItem` stores reusable commercial defaults such as a service name,
net price, VAT rate and billing cycle. `CustomerSubscription` is the actual
agreement with one company and keeps a copy of those values so later catalog
changes cannot rewrite customer history.

Creating a subscription creates its first `Charge`. A charge snapshots net,
VAT and gross amounts for one coverage period. One or more `Payment` records may
settle it. The payment status is derived from the received and outstanding
amounts; it is not a manually maintained boolean. Editing a customer service's
price, VAT rate, or currency updates charges that still have an outstanding
balance. Fully paid charges remain immutable historical snapshots. An edit
cannot reduce a charge below its recorded payments, and its currency cannot
change after a payment has been recorded.

When an active recurring subscription with auto-renew enabled is fully paid,
the service creates exactly one next charge. The database uniqueness constraint
on subscription and due date keeps this operation idempotent. Pausing or
cancelling a subscription does not delete its charges or payments. A normal
cancellation enters `cancelling` state through the current charge's coverage
end, cancels only later open charges, and prevents payment from generating
another charge. It may be resumed before that effective date without duplicating
the next charge. Immediate cancellation remains an explicit exceptional action.

The public workflow calls these records **customer services**. Lifecycle changes
use explicit pause, resume, and end actions; generic updates edit agreement data
but cannot change status. When a catalog service is selected, the backend copies
its commercial defaults and uses the start date as the first charge date unless
the client explicitly provides another date.

## Business Logic

Business logic means rules that belong to the product domain, not just HTTP.

Examples:

- A contact's company must belong to the same organization.
- An email account may only be accessed through its organization's authorized settings endpoints.
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

The [workflow roadmap](automation-roadmap.md) describes a possible future event-to-action system;
it is not implemented.
## Tenant access boundary

Every authenticated user can access normal REST resources only in organizations
where they have an `OrganizationMembership` with the required capability. Django
staff or superuser status does not bypass this REST boundary; however, a Django
superuser has broad access through `/admin/`. Installation administration uses
explicit endpoints. A normal pending invitation does not create membership;
provisioning creates a temporary owner membership but keeps the workspace
inaccessible until the nominated owner accepts.
