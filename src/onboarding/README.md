# Onboarding code map

`onboarding` owns installation lifecycle flows. It is separate from workspace
management because it runs before a normal user has access to any workspace.

| Looking for | Start here |
| --- | --- |
| First installation and initial admin | `api/setup.py` |
| Setup input validation | `api/setup_serializers.py` |
| Installation-wide settings | `api/installation_settings.py` |
| Installation administrator invitations | `api/installation_admins.py` |
| Installation tests | `tests/` |

Installation models remain in `organizations/models.py` temporarily to preserve
the existing migration history. Moving those tables to this app requires an
explicit migration plan and should not be done as a folder-only change.
