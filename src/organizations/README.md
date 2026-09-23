# Organizations code map

`organizations` is the Django app for workspace ownership, membership, invitations,
installation setup, and SMTP configuration. These concerns share the same tenant
and permission model, so they remain one Django app. The Python files are grouped
by responsibility to make them easier to navigate.

## Ownership boundaries

Not every feature in this app is workspace-scoped:

| Scope | Examples | Where to look |
| --- | --- | --- |
| Installation-wide | first setup, installation admins, fallback SMTP, personal-workspace policy | `api/setup.py`, `api/installation_settings.py`, `api/installation_admins.py`, `models.py:InstallationState` |
| Workspace-wide | workspace settings, SMTP accounts, members, invitations | `api/workspace_settings.py`, `api/email_accounts.py`, `api/memberships.py`, `api/invitations.py` |
| User/account-wide | login, logout, current user, password reset | `../accounts/` |

The installation-wide models stay here for now because they are already part of
the `organizations` Django app and its migration history. A future `core` or
`installation` app should only be introduced together with an explicit migration
plan; do not move these models casually just to make folders look cleaner.

| Looking for | Start here |
| --- | --- |
| Public workspace routes | `urls.py` → `api/workspaces.py` |
| Member roles and access checks | `../access/permissions.py`, `../access/api/memberships.py` |
| Workspace invitations | `../access/api/invitations.py` |
| Installation-admin invitations | `../onboarding/api/installation_admins.py` |
| Workspace creation and handoff | `api/provisioning.py`, `services/provisioning.py` |
| First-run setup | `../onboarding/api/setup.py`, `../onboarding/api/setup_serializers.py` |
| Workspace and installation settings | `api/workspace_settings.py`, `../onboarding/api/installation_settings.py` |
| SMTP account endpoints and delivery | `api/email_accounts.py`, `services/email_service.py`, `services/email_security.py` |
| Personal workspace creation | `services/personal_workspace.py` |
| Models and schema changes | `models.py`, `migrations/` |
| Regression tests | `tests/`, `../access/tests/`, `../onboarding/tests/` |
| Current-user and logout endpoints | `../accounts/auth_views.py` |

`api/` coordinates workspace HTTP requests and responses. `serializers.py`
validates workspace API input. `access/` owns authorization and membership
flows. `onboarding/` owns installation lifecycle flows. `services/` contains reusable
workflows and SMTP behavior. `models.py` and migrations own persistent data
and constraints. Keep all organization-owned queries scoped through the
organization and its capability checks.

The Django app label, model locations, database migrations, and public URL paths
were deliberately kept stable by this folder reorganization. Do not rewrite an
applied migration just to match a newer source-file layout.

Run the app tests from the repository root:

```bash
uv run python src/manage.py test organizations
```
