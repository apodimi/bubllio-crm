# Updating a self-hosted installation

Bubllio CRM can check for stable GitHub Releases and, after a one-time operator
bootstrap, install eligible releases from Account settings. Deployment
privileges stay in the independent Bubllio Update Agent; the browser and Django
never receive Docker access, provider credentials, arbitrary commands, or
arbitrary download URLs.

The agent is provider-agnostic at its boundary. Version 0.2.0 includes the
generic Docker Compose adapter. A native Dokploy adapter and other providers can
implement the same adapter contract without changing the CRM API.

## What the Update button does

1. The CRM discovers the latest stable `vMAJOR.MINOR.PATCH` GitHub Release.
2. The agent downloads the manifest and Sigstore bundle from its fixed,
   operator-configured release source.
3. The agent verifies the exact repository, release version, workflow identity,
   commit SHA, supported source-version range, image digests, and migration
   policy.
4. Preflight validates the fixed Compose project and reports blockers without
   exposing provider details.
5. Only an `online_safe` release can proceed automatically. The agent runs the
   configured backup command, pulls digest-pinned images, deploys them, and
   waits for health verification.
6. Job state remains in the agent's own SQLite store while the CRM restarts.
   Account settings reconnects and resumes progress reporting afterward.

`maintenance` and `irreversible` releases remain operator-managed. The UI links
to their release notes instead of bypassing the safety classification.

## Bootstrap 0.2.0 manually

Version 0.2.0 introduces the Update Center and contains migrations that require
a maintenance window. An older CRM cannot safely trigger a service it does not
yet know about, so **0.2.0 is a manual bootstrap release**.

Before upgrading:

1. Take an off-host PostgreSQL backup and complete an isolated restore
   rehearsal.
2. Record the currently deployed tag or image digest.
3. Review `uv run python src/manage.py migrate --plan` against a copy of the
   production database and resolve duplicate identities before the window.
4. Stop the old web, worker, and beat writers, apply the migrations once, deploy
   the matching backend and frontend release, then verify health and sign-in.

The first Automations removal release deliberately retains legacy automation
tables and ignored outbox rows. Do not drop them in this deployment. Their
physical deletion requires a later, separately approved irreversible release.

After 0.2.0 is healthy, install the agent outside the CRM lifecycle by following
[`updater/README.md`](../../updater/README.md). Its machine account is a
deployment administrator: Docker access is effectively root-equivalent, so do
not mount the Docker socket into Django and do not run the agent inside the
Compose project it updates.

## Connect the agent

For a same-host Docker Compose installation, mount only the agent's narrow
runtime directory read-only into the backend. Keep the agent socket at
`/run/bubllio-update-agent/agent.sock`, create it as mode `0660` with group GID
`10001`, and set:

```text
BUBLLIO_UPDATE_AGENT_ENABLED=true
BUBLLIO_UPDATE_AGENT_SOCKET=/run/bubllio-update-agent/agent.sock
BUBLLIO_UPDATE_AGENT_RUNTIME_HOST=/run/bubllio-update-agent
BUBLLIO_UPDATE_AGENT_INSTALLATION_ID=replace-with-the-agent-installation-uuid
BUBLLIO_UPDATE_AGENT_SECRET=replace-with-a-unique-random-secret-of-at-least-32-bytes
BUBLLIO_UPDATE_AGENT_TIMEOUT=5
```

Use the same HMAC secret in the agent service environment. Start and subsequently
manage the CRM with both Compose files:

```bash
docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.update-agent.yaml up -d
```

The override mounts the runtime directory read-only instead of bind-mounting the
socket inode. The backend therefore reconnects when the external agent safely
replaces its socket during restart. The agent's `compose_files` setting must
contain those same two files so a deployment preserves the socket mount.

The agent atomically owns `.bubllio-update-agent/release.env`, containing the
version and signed digest-pinned image references. Every agent reconciliation
adds it as the final Compose `--env-file`. Manual Compose recovery must do the
same so shell variables or mutable tags cannot silently replace the verified
images:

```bash
env -u BUBLLIO_IMAGE_TAG \
  -u BUBLLIO_BACKEND_IMAGE \
  -u BUBLLIO_FRONTEND_IMAGE \
  docker compose --env-file .env.production \
    --env-file .bubllio-update-agent/release.env \
    -f compose.production.yaml \
    -f compose.update-agent.yaml up -d
```

For a remote runner, leave the socket
unset and use an HTTPS `BUBLLIO_UPDATE_AGENT_URL`. Plain HTTP is accepted
automatically only for loopback; the insecure override is reserved for an
explicitly isolated management network. Provider credentials and backup
configuration belong only to the agent.

The generic Compose adapter expects `BUBLLIO_BACKEND_IMAGE` and
`BUBLLIO_FRONTEND_IMAGE` to resolve to the digest-pinned images from the signed
manifest. The supplied production Compose file supports those variables while
retaining local source builds for manual operation. Each image configuration
also has an explicit service allowlist: the agent pulls only `backend`, `worker`,
`beat`, and `frontend`. It does not refresh mutable PostgreSQL or RabbitMQ images
as a side effect of a CRM release.

## Release checking and privacy

`BUBLLIO_UPDATE_CHECK_ENABLED` controls the read-only GitHub release check.
`BUBLLIO_UPDATE_REPOSITORY` defaults to `apodimi/bubllio-crm`, accepts only an
`owner/repository` value, and is cached for `BUBLLIO_UPDATE_CHECK_TTL` seconds.
Disable it for offline installations:

```text
BUBLLIO_UPDATE_CHECK_ENABLED=false
```

GitHub receives the server IP and Bubllio version user agent. The endpoints and
Update Center are available only to active installation administrators.

## Backup and recovery status

The Account settings backup panel is operational evidence, not the backup
engine. Record externally verified jobs with:

```bash
uv run python src/manage.py record_backup_event --kind backup --status success
uv run python src/manage.py record_backup_event --kind restore_test --status success
```

The update agent separately runs its fixed backup executable immediately before
an eligible deployment. It never performs an automatic database restore. If a
failure occurs after deployment begins, the state becomes
`MANUAL_INTERVENTION`; follow the release-specific recovery notes. Prefer a
forward fix after migrations unless the signed manifest explicitly declares an
application rollback compatible.

## Publishing a release

1. Update the matching version in `pyproject.toml`, `frontend/package.json`, and
   `release/policies/<version>.json`.
2. Classify the migrations honestly and set the supported source-version range.
3. Run `uv run python scripts/check_release_version.py` and all backend,
   PostgreSQL, frontend, browser, migration, image, and security gates.
4. Commit the exact release tree and create the matching immutable tag, such as
   `v0.2.0`.
5. Push the commit and tag. `.github/workflows/release.yml` publishes the two
   GHCR images, build attestations, updater wheel, canonical manifest, Sigstore
   bundle, and GitHub Release notes extracted from `CHANGELOG.md`.

GHCR creates a package as private on its first publication. For the first
release, the workflow intentionally stops after pushing the candidate images if
an anonymous digest pull fails. Open both package settings, change
`bubllio-crm-backend` and `bubllio-crm-frontend` to **Public**, then rerun the
failed workflow. GitHub documents this default and the visibility control in
[Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
The workflow will not create the public version tags or publish the draft
GitHub Release until both anonymous pulls succeed.

The workflow embeds the exact version and commit SHA in the backend image and
signs the manifest with its GitHub Actions OIDC identity. The agent pins that
repository, workflow, tag, and issuer and fails closed on any mismatch.
