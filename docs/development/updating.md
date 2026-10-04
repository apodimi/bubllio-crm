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

`BUBLLIO_UPDATE_REPOSITORY` defaults to `apodimi/bubllio-crm-api` and accepts
only an `owner/repository` value. The endpoint and banner are available only to
active installation administrators.

## Publishing a release

1. Update the version in `pyproject.toml` using `MAJOR.MINOR.PATCH`.
2. Run the full backend, frontend, and browser verification gates.
3. Merge the release-ready changes and create a matching tag such as `v0.2.0`.
4. Publish a non-draft, non-prerelease GitHub Release for that tag.
5. Include upgrade notes, migrations, breaking changes, and rollback guidance.

The update checker intentionally accepts only `vMAJOR.MINOR.PATCH` or
`MAJOR.MINOR.PATCH`. This keeps version ordering predictable without trusting
arbitrary release text.
