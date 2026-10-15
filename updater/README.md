# Bubllio Update Agent

The Bubllio Update Agent is a small service that runs **outside the CRM
deployment lifecycle**. It gives an installation administrator a controlled
update button without giving Django, the browser, or a public container access
to Docker, provider credentials, arbitrary commands, or arbitrary release URLs.

This directory is an MVP bootstrap implementation. It is intentionally
fail-closed and currently supports one-click updates only when the signed
release manifest declares `migration_policy: online_safe`.

## Trust boundary

The CRM can request only an exact stable target version and an idempotency key.
Every powerful value is fixed by operator-owned agent configuration:

- installation UUID and allowed `owner/repository`;
- release manifest and Sigstore bundle URL templates;
- expected GitHub Actions workflow identity and OIDC issuer;
- Compose project, environment file, image repositories, and environment names;
- backup executable and arguments;
- local health endpoint.

The recommended setup exposes HTTP over a Unix-domain socket, authenticates every
`/v1/*` request with HMAC, and keeps job state in its own SQLite file. A loopback
TCP listener is available as a mutually exclusive fallback. The agent never stores provider credentials in
the CRM database and never accepts a command, path, branch, repository, provider
identifier, image reference, or URL through its HTTP API.

Treat the machine account running this service as a deployment administrator.
Docker access is effectively root-equivalent. Do not mount the Docker socket
into the CRM containers and do not run this agent as part of the Compose project
that it replaces.

## Release verification

For a target `0.3.0`, the agent substitutes only the already-validated stable
version into the configured HTTPS URLs. Redirects are limited in count and may
target only exact, operator-configured HTTPS CDN hosts; request authentication is
never forwarded. Response sizes are bounded. The manifest must be canonical JSON and contain exactly:

| Field | Meaning |
| --- | --- |
| `repository` | The configured `owner/repository` |
| `version` | Exact stable target version |
| `commit_sha` | Lowercase 40-character Git commit SHA |
| `image_digests` | Configured image names mapped to `sha256:` digests |
| `min_version`, `max_version` | Inclusive supported source-version range |
| `migration_policy` | `online_safe`, `maintenance`, or `irreversible` |
| `expected_schema` | Release-defined schema identifier shown in preflight |
| `health_timeout_seconds` | Health-check deadline from 5 to 900 seconds |
| `rollback_compatible` | Whether an application rollback is declared compatible |

The default configuration uses `cosign verify-blob` with an exact Fulcio
certificate identity and issuer. For this repository's example configuration,
the identity for v0.3.0 is:

```text
https://github.com/apodimi/bubllio-crm/.github/workflows/release.yml@refs/tags/v0.3.0
```

The workflow identity template is configurable for forks but must pin the
configured repository, a workflow file, and `refs/tags/v{version}`. An Ed25519
public-key verifier is available for offline installations; only the public key
belongs in configuration.

Generate canonical input before signing:

```bash
uv run --project updater bubllio-update-agent canonicalize-manifest \
  --input release-manifest.draft.json \
  --output release-manifest.json
```

Validate a downloaded bundle using the same policy as the running agent:

```bash
BUBLLIO_UPDATE_AGENT_SECRET='replace-with-at-least-32-random-bytes' \
uv run --project updater bubllio-update-agent validate-manifest \
  --config /etc/bubllio-update-agent/config.json \
  --manifest release-manifest.json \
  --bundle release-manifest.sigstore.json \
  --target-version 0.3.0
```

## Compose contract

The configured Compose files must consume the configured immutable image
variables, for example:

```yaml
services:
  backend:
    image: ${BUBLLIO_BACKEND_IMAGE:?Set BUBLLIO_BACKEND_IMAGE}
  frontend:
    image: ${BUBLLIO_FRONTEND_IMAGE:?Set BUBLLIO_FRONTEND_IMAGE}
```

Keep `compose.update-agent.yaml` in the configured `compose_files` list. The
agent uses that complete list for every Compose operation; omitting the override
would recreate the backend without its narrow Unix-socket mount.

Before the first pull, the agent atomically writes the signed desired state to
the configured `.bubllio-update-agent/release.env` with mode `0640`. Every agent
`pull` and `up` includes that file as the final `--env-file`, and removes the
managed variables from its process environment so shell values cannot override
the persisted digests. Manual reconciliation must include it too:

```bash
env -u BUBLLIO_IMAGE_TAG \
  -u BUBLLIO_BACKEND_IMAGE \
  -u BUBLLIO_FRONTEND_IMAGE \
  docker compose --env-file .env.production \
    --env-file .bubllio-update-agent/release.env \
    -f compose.production.yaml \
    -f compose.update-agent.yaml up -d
```

At deployment time those values are constructed only from the configured image
repository plus the verified manifest digest. Tags are not trusted as the final
image identity. The adapter performs:

1. `docker compose config --quiet` and path/image checks;
2. the fixed backup executable, which must return success only after a verified
   backup has completed;
3. `docker compose pull` only for the explicitly configured services backed by
   signed image digests (`backend`, `worker`, `beat`, and `frontend` in the
   example); infrastructure images such as PostgreSQL and RabbitMQ are excluded;
4. `docker compose up --detach --remove-orphans`;
5. polling of the configured loopback health endpoint, requiring bounded JSON
   with `status: ok` and exact signed version, commit SHA, and schema values.

The command output is not persisted, preventing accidental secret disclosure.
Errors exposed through the API are structured and sanitized.

## Download and verify a published wheel

Choose an exact CRM release tag; never install an updater from a moving `latest`
URL. Download the wheel with the GitHub CLI and verify its GitHub artifact
attestation against this repository before installing it:

```bash
release_tag=v0.2.0
release_dir=$(mktemp -d)
gh release download "$release_tag" \
  --repo apodimi/bubllio-crm \
  --pattern 'bubllio_update_agent-*.whl' \
  --dir "$release_dir"
gh attestation verify "$release_dir"/*.whl \
  --repo apodimi/bubllio-crm
```

The successful verification must identify `apodimi/bubllio-crm` as the source
repository and GitHub Actions as the signer. Keep the downloaded wheel with the
release evidence. Use a new, empty `release_dir` for every version so an older
wheel cannot be selected by the install wildcard. Forks must substitute their
own repository consistently in the download, attestation, agent configuration,
and manifest identity.

## Install and run

Install the verified wheel in a dedicated virtual environment and install
`cosign` from the official Sigstore distribution. Copy `config.example.json` to
an operator-only path, replace every placeholder, and store the shared HMAC
secret in a root-readable environment file rather than the JSON file.

```bash
install -d -m 0755 /opt/bubllio-update-agent
uv venv /opt/bubllio-update-agent/.venv --python 3.13
uv pip install \
  --python /opt/bubllio-update-agent/.venv/bin/python \
  "$release_dir"/*.whl
install -d -m 0750 /etc/bubllio-update-agent
install -d -m 0700 /var/lib/bubllio-update-agent
install -d -m 0750 /run/bubllio-update-agent
BUBLLIO_UPDATE_AGENT_SECRET='replace-with-at-least-32-random-bytes' \
  /opt/bubllio-update-agent/.venv/bin/bubllio-update-agent serve \
  --config /etc/bubllio-update-agent/config.json
```

For a source checkout used in development, `uv sync --project updater --frozen`
remains the reproducible setup command. Production installations should use the
attested release wheel above.

Manage the process independently from the CRM Compose project. A minimal
systemd unit is:

```ini
[Unit]
Description=Bubllio Update Agent
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=simple
User=bubllio-update-agent
Group=bubllio-update-agent
SupplementaryGroups=docker bubllio-web
EnvironmentFile=/etc/bubllio-update-agent/secret.env
ExecStart=/opt/bubllio-update-agent/.venv/bin/bubllio-update-agent serve --config /etc/bubllio-update-agent/config.json
Restart=on-failure
RestartSec=5
RuntimeDirectory=bubllio-update-agent
RuntimeDirectoryMode=0750
StateDirectory=bubllio-update-agent
StateDirectoryMode=0700
UMask=0007
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Create the dedicated accounts and groups according to the host's policy. In
this example, `bubllio-web` has the same GID as `socket_group_gid`, and the
agent user must be a member of that group so it can assign the socket group.
Membership in `docker` is root-equivalent; use a narrower Docker authorization
mechanism where the host supports one. Put only
`BUBLLIO_UPDATE_AGENT_SECRET=...` in `secret.env`, set the file to mode `0600`,
then enable the service:

```bash
systemctl daemon-reload
systemctl enable --now bubllio-update-agent.service
systemctl status --no-pager bubllio-update-agent.service
```

Do not copy the example unit without reconciling its users, groups, Docker
access, backup executable, project paths, and service hardening with the target
host.

## Upgrade the agent

Download and attest the wheel for the exact new CRM release as above. Preserve
the operator-owned configuration, secret file, and state database; a wheel
upgrade must not replace them. Then perform a controlled service restart:

```bash
systemctl stop bubllio-update-agent.service
uv pip install --upgrade --reinstall \
  --python /opt/bubllio-update-agent/.venv/bin/python \
  "$release_dir"/*.whl
systemctl start bubllio-update-agent.service
systemctl status --no-pager bubllio-update-agent.service
```

Confirm `/v1/status` through the CRM Update Center after the restart. If the
service does not return healthy, stop and use the previous verified wheel; do
not delete or rewrite the state database while an update job may be active.

Use a dedicated systemd service with a restricted OS account, `RuntimeDirectory`
for `/run/bubllio-update-agent`, an explicit `ReadWritePaths` entry for the state
directory, and only the minimum Docker and backup permissions needed by the
configured adapter. The socket is created as `0660`; the example uses
`socket_group_gid: 10001` to match the published backend image. Change both the
agent setting and Compose `group_add` together when an installation uses a
different backend GID. The agent removes a stale socket only when it is an actual Unix socket owned by the
agent's OS user and a connection probe proves that nobody is listening. It
never replaces a live socket, symlink, or regular file, and shutdown removes
only the exact socket inode created by that process. TCP fallback is
loopback-only. Protect the configuration, HMAC secret, state
database, deployment files, Docker credentials, and backup tooling with OS file
permissions.

Mount only the runtime directory into the backend container, preferably
read-only, and add the socket GID to the backend process. Do **not** mount the
Docker socket:

```yaml
services:
  backend:
    environment:
      BUBLLIO_UPDATE_AGENT_SOCKET: /run/bubllio-update-agent/agent.sock
    volumes:
      - /run/bubllio-update-agent:/run/bubllio-update-agent:ro
    group_add:
      - "${BUBLLIO_UPDATE_AGENT_GID:-10001}"
```

The service holds an OS advisory lock at `agent.lock` beside its state database
for its entire lifetime. A second process fails before it can touch the database
or socket. Only after acquiring that lock does startup convert an interrupted
active job to `MANUAL_INTERVENTION`; the agent never guesses whether an
interrupted migration or deployment is safe to repeat.

## HTTP contract

Authenticated endpoints are:

- `GET /v1/status`
- `POST /v1/preflight` with `{"target_version":"0.3.0"}`
- `POST /v1/updates` with an additional `idempotency_key`
- `GET /v1/updates/<job-uuid>`

Requests include `X-Bubllio-Timestamp` (Unix seconds),
`X-Bubllio-Installation-Id`, and
`X-Bubllio-Signature`, a lowercase hex HMAC-SHA256 of:

```text
METHOD\n/path\ntimestamp\ninstallation_id\nsha256(raw-body)
```

Set the CRM's `BUBLLIO_UPDATE_AGENT_INSTALLATION_ID` to the exact canonical UUID
from the agent configuration. A valid request signature for another installation
is rejected.

Every JSON response includes the installation UUID and carries
`X-Bubllio-Response-Signature`, an HMAC-SHA256 over
`status\n/path\nrequest_timestamp\ninstallation_id\nsha256(raw-response-body)`.

The timestamp window is configurable from 5 to 300 seconds. Replayed starts are
safe because the idempotency key is persisted and bound to one target version.
Only one update can be active at a time.

Job states are `REQUESTED`, `PREFLIGHT`, `BACKING_UP`, `DEPLOYING`, `VERIFYING`,
`SUCCEEDED`, `FAILED`, `ROLLED_BACK`, and `MANUAL_INTERVENTION`.

## Deliberate MVP limitations

- The v0.2.0 CRM release contains maintenance-window migrations, so it is the
  manual bootstrap release for installing this agent. It is not eligible for
  this agent's one-click Compose path.
- `maintenance` and `irreversible` manifests are rejected. A later adapter must
  stop all writers, run exactly one migration task, prove schema readiness, and
  then start services before those policies can be enabled.
- Automatic database restore is never attempted. After deployment begins, an
  error becomes `MANUAL_INTERVENTION`; operators use release-specific recovery
  guidance. `ROLLED_BACK` is reserved for a future adapter that can prove a safe
  application rollback.
- Backup success currently means the configured executable returned zero. The
  operator remains responsible for off-host retention and restore rehearsals.
- The Dokploy adapter is not included yet. It should implement the same adapter
  protocol while keeping Dokploy credentials exclusively in this service.

## License

The Bubllio Update Agent is licensed under the
[Elastic License 2.0](LICENSE.md).
