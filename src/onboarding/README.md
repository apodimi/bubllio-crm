# Onboarding code map

`onboarding` owns installation lifecycle flows. It is separate from workspace
management because it runs before a normal user has access to any workspace.

| Looking for | Start here |
| --- | --- |
| First installation and initial admin | `api/setup.py` |
| Setup input validation | `api/setup_serializers.py` |
| Installation-wide settings | `api/installation_settings.py` |
| Installation administrator invitations | `api/installation_admins.py` |
| GitHub Release update status | `api/update_status.py`, `services/update_checker.py` |
| Production configuration diagnostics | `api/production_readiness.py`, `services/production_readiness.py` |
| Installation system information | `api/system_information.py`, `services/system_information.py` |
| Backup and restore status | `api/backup_status.py`, `services/backup_status.py`; reporter command is `organizations/management/commands/record_backup_event.py` |
| Installation activity log | `api/installation_audit_log.py` |
| Downloadable non-secret data export | `api/data_export.py`, `services/data_export.py` |
| Installation tests | `tests/` |

Installation models remain in `organizations/models.py` temporarily to preserve
the existing migration history. Moving those tables to this app requires an
explicit migration plan and should not be done as a folder-only change.
