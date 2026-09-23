# Organizations code map

`organizations` is the Django app for workspace ownership, membership, invitations,
installation setup, and SMTP configuration. These concerns share the same tenant
and permission model, so they remain one Django app. The Python files are grouped
by responsibility to make them easier to navigate.

| Looking for | Start here |
| --- | --- |
| Public workspace routes | `urls.py` → `api/workspaces.py` |
| Member roles and access checks | `permissions.py`, `api/memberships.py` |
| Workspace invitations | `api/invitations.py` |
| Installation-admin invitations | `api/installation_admins.py` |
| Workspace creation and handoff | `api/provisioning.py`, `services/provisioning.py` |
| First-run setup | `api/setup.py`, `api/setup_serializers.py` |
| Workspace and installation settings | `api/workspace_settings.py`, `api/installation_settings.py` |
| SMTP account endpoints and delivery | `api/email_accounts.py`, `services/email_service.py`, `services/email_security.py` |
| Personal workspace creation | `services/personal_workspace.py` |
| Models and schema changes | `models.py`, `migrations/` |
| Regression tests | `tests/` |
| Current-user and logout endpoints | `../accounts/auth_views.py` |

`api/` coordinates HTTP requests and responses. `serializers.py` and
`api/setup_serializers.py` validate API input. `services/` contains reusable
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
