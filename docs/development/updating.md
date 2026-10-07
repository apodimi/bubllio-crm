# Updating a self-hosted installation

Bubllio CRM uses stable GitHub Releases as the update source of truth. An
installation administrator sees a banner when the latest published release is
newer than the installed package version. Drafts and prereleases do not trigger
the banner.

The check is deliberately read-only. Bubllio does not pull code, replace
containers, run migrations, or restart services from the web application.
Operators remain in control of deployment credentials and rollback.

## Before upgrading

1. Open the release linked by the banner and read its release notes.
2. Back up the database and any deployment-managed files or volumes.
3. Confirm the release's supported Python, Node, and database versions.
4. Record the currently deployed tag or image digest so it can be restored.

## Upgrade

Follow the deployment method used by the installation and deploy the exact
release tag, not a moving branch. Install locked dependencies, then run:

```bash
uv run python src/manage.py migrate
uv run python src/manage.py check --deploy
```

Build and deploy the frontend for that same tag, restart the application using
the installation's process manager, and verify sign-in plus one representative
workspace flow. Release-specific steps take precedence over this general
checklist.

## Configuration and privacy

The backend checks
`https://api.github.com/repos/<owner>/<repository>/releases/latest` with a
three-second timeout. A result is cached for `BUBLLIO_UPDATE_CHECK_TTL` seconds
(six hours by default), and failures never block the CRM. GitHub receives the
server IP address and a Bubllio version user agent as part of this request.

Disable the request completely when an installation is offline or policy does
not allow it:

```text
BUBLLIO_UPDATE_CHECK_ENABLED=false
```

`BUBLLIO_UPDATE_REPOSITORY` defaults to `apodimi/bubllio-crm` and accepts
only an `owner/repository` value. The endpoint and banner are available only to
active installation administrators.

## Backup and restore status

Bubllio does not create database backups. Use the backup mechanism supported by
the hosting provider or database service. After the backup job completes, report
its result from the application environment:

```bash
uv run python src/manage.py record_backup_event --kind backup --status success
```

For failed runs, use `--status failure`. After completing a restore rehearsal,
record it with `--kind restore_test`. The Account settings panel shows the last
reported result, marks backups overdue after 24 hours, and recommends a restore
test every 90 days. These intervals can be changed with
`BUBLLIO_BACKUP_MAX_AGE_HOURS` and `BUBLLIO_RESTORE_TEST_MAX_AGE_DAYS`.

The status is only as trustworthy as the scheduler that reports it. Run the
reporting command after verifying the actual backup/restore operation succeeded;
store backup artifacts outside the application database and test recovery in an
isolated environment. Never put provider credentials or backup paths in the
reported event.

Installation administrators can also download a JSON data export from Account
settings. It excludes passwords, authentication tokens, encrypted SMTP
passwords, and automation error messages. The export contains customer data and
must be stored securely. It is intended for local inspection and portability;
it is not a replacement for a database-native backup and tested restore.

## Publishing a release

1. Update the matching version in `pyproject.toml` and `frontend/package.json`
   using `MAJOR.MINOR.PATCH`, then run
   `uv run python scripts/check_release_version.py`.
2. Run the full backend, frontend, and browser verification gates.
3. Merge the release-ready changes and create a matching tag such as `v0.2.0`.
4. Publish a non-draft, non-prerelease GitHub Release for that tag.
5. Include upgrade notes, migrations, breaking changes, and rollback guidance.

The update checker intentionally accepts only `vMAJOR.MINOR.PATCH` or
`MAJOR.MINOR.PATCH`. This keeps version ordering predictable without trusting
arbitrary release text.
