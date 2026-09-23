# Workspace access model: research and proposed direction

Research checked on 23 September 2026. This is a design note, **not an API
contract**. The [authentication and roles guide](../architecture/authentication-and-roles.md)
describes what Bubllio implements today.

## The business question

One IT operator installs Bubllio for a company. Should everybody who can
create a workspace also become an installation superuser? **No.** Workspace
provisioning, deployment administration, workspace management, and CRM data
access are different responsibilities. The smallest useful model is:

```text
Installation
  ├─ installation administrator: deployment-wide settings and IT access
  ├─ workspace creator: create shared workspaces (implemented)
  └─ workspaces: independent membership and business data
       ├─ owner: ultimate workspace accountability
       ├─ admin: day-to-day workspace administration
       ├─ member: CRM contributor
       └─ viewer: read-only
```

The installation role and the membership role should be independent. A person
may be a creator without membership in an existing workspace, and may hold a
different role in each workspace. A workspace is justified by a real data or
administrative boundary (separate business unit, subsidiary, client, or SMTP
configuration), not merely because a customer company exists in the CRM.

## What comparable products teach us

| Product | Verified access model | Lesson for Bubllio |
| --- | --- | --- |
| [Microsoft Dataverse / Power Platform](https://learn.microsoft.com/en-us/power-platform/admin/database-security) | Tenant administration, environment administration, and Dataverse data roles have different scopes; tenant administration does not automatically grant data access. | Separate infrastructure/provisioning rights from workspace data membership. |
| [HubSpot](https://knowledge.hubspot.com/user-management/hubspot-user-permissions-guide?popup=false&retURL=%2F) | Super Admin is extremely broad; user/team management can be delegated, but only a Super Admin can grant Super Admin. CRM permissions can be more granular. | Keep IT elevation separate from ordinary invitation; do not hand out superuser just to add people or provision workspaces. |
| [Pipedrive](https://support.pipedrive.com/en/article/visibility-and-permissions-overview) | Permission sets control what users can do; visibility groups and item visibility control what they can see. Admins may have broader visibility. | Do not confuse action permissions with record visibility. Bubllio currently has only workspace-wide visibility. |
| [Salesforce](https://help.salesforce.com/s/articleView?id=security_data_access.htm&language=en_US&type=5) | Profiles/permission sets govern object and field access; sharing and role hierarchy govern record access. | Granularity is possible, but adopting the full hierarchy now would add major complexity before there is a concrete need. |
| [Odoo](https://www.odoo.com/documentation/19.0/applications/general/users/access_rights.html) | User roles and groups determine app access; administrators can delegate access-rights administration. [Multi-company access](https://www.odoo.com/documentation/19.0/applications/general/companies/multi_company.html) is granted per company. | Multiple business entities can coexist in one installation without making every user an installation administrator. |
| [SuiteCRM](https://docs.suitecrm.com/admin/administration-panel/roles-and-security-groups/) | Roles define module/record actions; security groups restrict records to teams. | Even in open-source CRM, action rights and record visibility are separate concepts; add the latter only when Bubllio needs it. |

These products differ in what they call an organization, account, or
environment; this is a comparison of *access boundaries*, not a claim that
their objects map one-to-one to a Bubllio `Organization`. Source details and
product behavior can change, so recheck the linked vendor docs before basing
implementation on them.

## Bubllio today versus possible later refinements

| Responsibility | Implemented today | Possible later refinement |
| --- | --- | --- |
| First installation | First-run setup creates a Django superuser, the first workspace, and its owner membership. | Keep one-time bootstrap. |
| More IT operators | Existing installation admins invite another installation admin, granting Django superuser/staff. | Keep rare; add an audit event for this elevation, which is not yet in `WorkspaceAccessEvent`. |
| Create a shared workspace | A Django superuser or delegated workspace creator may call `POST /api/v1/organizations/`. The delegated grant does not confer Django staff/superuser. | Consider an invitation to create a brand-new creator account; grants currently require an existing account. |
| Assign business owner | Creator nominates `owner_email`. If different from their own email, the workspace is isolated pending email acceptance; acceptance removes the provisional creator membership and installs the business owner. | Consider configurable owner-invitation expiry/recovery policy if enterprise deployments need it. |
| Configure workspace | Owner/admin can change settings and SMTP, manage allowed members; only owner can transfer ownership/delete. | Preserve these four simple roles until actual use cases require finer permissions. |
| Read workspace data | Any membership can read all companies, contacts, automations, and runs in that workspace. | Consider record/team visibility only when requirements identify who must be hidden from whom; design it separately from action roles. |
| Personal workspace | Installation policy defaults to off; when on, any user may create one. | For a company-managed installation, keep off unless there is a clear business reason and data-governance policy. |

### Recommended provisioning journey

1. IT completes first-run setup and invites a second trusted IT admin for
   operational continuity.
2. IT gives a selected existing operations account the workspace-creator grant,
   **not** installation-admin access.
3. The creator enters workspace details and nominates the business owner. The
   new owner accepts an email-bound invitation before receiving access. No
   public self-signup is required.
4. The owner invites one or more workspace admins, who configure settings and
   SMTP and invite members/viewers. An admin cannot appoint another admin.
5. Membership is required for normal CRM API access; a creator does not gain
   ongoing access to unrelated workspaces just by having created them.

This provisioning journey is implemented. While the nominated owner invitation
is pending, the creator has only a provisional owner membership; normal CRM
endpoints hide the workspace even from them. The creator or an installation
admin may resend the invitation or cancel the pending workspace. The backend
enforces the creator grant independently of React.

## Security implications and remaining work

- **Django superuser is a real bypass of REST membership isolation.** The
  product API scopes even IT users by membership, but `/admin/` gives
  superusers broad database access. Do not promise that IT cannot inspect CRM
  data until the privileged path is deliberately redesigned/restricted.
- **Keep creator permissions narrow.** Grant `create_workspace`, not global
  settings, SMTP secrets, IT invitations, membership edits in other workspaces,
  or automatic permanent ownership of every workspace.
- **Avoid orphaned ownership.** Provisioning uses a hidden, provisional owner
  membership and an explicit resend/cancel recovery path. The database still
  enforces *at most* one owner, not *at least* one after every possible direct
  administrative intervention.
- **Audit privilege changes.** Grant/revoke, creation, resend/cancel, and initial
  owner acceptance are recorded in `WorkspaceAccessEvent`. Ordinary workspace
  membership/ownership and SMTP changes still need an audit trail; invitation
  revocation is not implemented.
- **Keep the default simple.** Do not add arbitrary custom roles, Salesforce-like
  record hierarchies, or personal workspaces by default. Introduce narrower
  capabilities only for evidenced customer workflows.

## Decision

Use two scopes: **installation privileges** for deployment/provisioning and
**membership roles** for each workspace. Keep the four workspace roles and the
delegated workspace-creator grant. Do not add arbitrary custom roles or
record-level security until a concrete customer workflow requires them.
