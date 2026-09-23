# Roles and access: who can do what?

This is the short, practical guide. For API behavior and implementation details,
read [Authentication, Organizations, and Roles](../architecture/authentication-and-roles.md).

## The two levels

Think of an **installation** as the entire Bubllio deployment and a
**workspace** (`Organization` in the API/database) as a separate place for a
team's CRM data. A `Company` is a customer or prospect *inside* a workspace;
it is not another workspace.

| Level | Role or grant | Who assigns it? | What it means |
| --- | --- | --- | --- |
| Installation | Installation administrator | The first-run setup creates the first one; an existing installation admin may invite more. | Manages installation policy and fallback SMTP, invites IT admins, grants workspace-creator access, and can create workspaces. This is a Django superuser. |
| Installation | Workspace creator | Installation administrator, for an existing active account. | Can create a shared workspace and nominate its initial owner. This grant does **not** make the person a superuser or an automatic member of other workspaces. |
| Workspace | Owner | First-run setup, self-nomination at creation, or acceptance of an initial owner invitation; later owners receive a transfer from the current owner. | Normally one owner per workspace, responsible for its administrators and lifecycle. The database prevents two owners. |
| Workspace | Admin | Invited or promoted by the owner. | Manages daily workspace operations but cannot appoint admins, transfer ownership, or delete the workspace. |
| Workspace | Member | Invited by an owner or admin. | Contributes CRM records; cannot manage workspace settings or members. |
| Workspace | Viewer | Invited by an owner or admin. | Reads workspace data without creating records. |

The installation role and a workspace role are independent. For example,
Maria can be a workspace creator, an owner in Workspace A, a viewer in
Workspace B, and have **no** access to Workspace C.

## Workspace permission matrix

These are permissions in the **current application**, not proposed features.
“Read CRM” includes companies, contacts, automation rules, and run history.
“Create CRM” means creating companies and contacts; edit/delete endpoints for
those records do not exist yet.

| Action inside this workspace | Owner | Admin | Member | Viewer |
| --- | :---: | :---: | :---: | :---: |
| Read CRM and automation history | ✓ | ✓ | ✓ | ✓ |
| Create companies and contacts | ✓ | ✓ | ✓ | — |
| Create and manually test automations | ✓ | ✓ | — | — |
| View workspace settings and SMTP account metadata | ✓ | ✓ | ✓ | ✓ |
| Change workspace settings or SMTP; send SMTP test email | ✓ | ✓ | — | — |
| See members and pending invitations | ✓ | ✓ | — | — |
| Invite, change, or remove members/viewers | ✓ | ✓ | — | — |
| Invite, promote, change, or remove admins | ✓ | — | — | — |
| Transfer ownership | ✓ | — | — | — |
| Delete the shared workspace | ✓ | — | — | — |

An admin cannot change or remove another admin. The current owner cannot be
removed or demoted directly: ownership must be transferred first. A personal
workspace cannot be deleted or shared through the current API.

## Example: a new team workspace

1. The IT installer completes first-run setup. This person becomes an
   installation administrator and owner of the initial workspace.
2. IT grants an existing colleague **workspace creator** access in Account
   settings. This is safer than making them an installation administrator.
3. The creator enters a workspace name, slug, and the business owner's email.
   If the email belongs to somebody else, Bubllio sends a seven-day owner
   invitation using installation fallback SMTP.
4. Until that person accepts, the new workspace is **pending** and hidden from
   normal CRM screens and API access, even for its creator. The creator or an
   installation admin can resend the invitation or cancel the pending workspace.
5. On acceptance, the invited person becomes owner and the creator's temporary
   membership is removed. The owner can now invite admins, members, and viewers.

If the creator deliberately enters their *own* email as initial owner, the
workspace is available immediately and no owner invitation is needed.
Granting or revoking workspace-creator access does not itself add or remove
membership in an existing workspace.

## Visibility and security limits

- A normal user sees only workspaces where they have an accepted membership.
  Within such a workspace, **all four roles can read all CRM records**. There
  are no record-by-record, team, or field visibility rules yet.
- An installation administrator has no automatic membership in unrelated
  workspaces through the REST API. However, this role is a **Django superuser**
  and can access data through `/admin/`; reserve it for trusted IT operators.
- The delegated workspace-creator grant does not provide Django admin access,
  installation settings, or access to other teams' CRM data.
- Personal workspaces are disabled by default. An installation admin may enable
  them; each user can then create one private personal workspace.
- Grant/revoke, workspace creation, owner-invitation resend/cancel, and initial
  owner acceptance have a read-only operational audit log. General membership
  and SMTP changes do not yet have the same audit coverage.

The backend checks permissions on every request. Hiding a button in React is
only a convenience; it is not the security boundary.
