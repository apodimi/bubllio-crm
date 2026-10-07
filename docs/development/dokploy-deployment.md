# Install Bubllio CRM with Dokploy

This guide is written for the person responsible for the company server. It does
not require Django, React, or Docker development knowledge.

The Dokploy deployment runs three services:

- `frontend`: the only public service; Dokploy routes HTTPS traffic to port `8080`;
- `backend`: the private Bubllio API on port `8000`;
- `postgres`: the private database with persistent storage.

The database and backend are intentionally not published on host ports.

## Before starting

Have these ready:

- a Dokploy server with a public IP;
- a DNS name such as `crm.example.com` pointing to that IP;
- access to the Bubllio Git repository;
- SMTP credentials for invitations and password resets, entered during setup;
- an S3-compatible destination for off-server backups.

Generate two independent secrets on a trusted computer. Do not paste their
output into chat, tickets, or Git:

```bash
openssl rand -base64 48
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Use the first value for `DJANGO_SECRET_KEY` and the second for
`BUBLLIO_EMAIL_ENCRYPTION_KEYS`. Generate a separate strong database password.

## 1. Create the Compose service

1. In Dokploy, create a project and add a **Docker Compose** service.
2. Select GitHub or Git as the provider.
3. Select `apodimi/bubllio-crm` and the release branch or tag supplied by Bubllio.
4. Set the Compose path to `./compose.dokploy.yaml`.
5. Keep Compose mode; do not select Docker Stack.
6. Save without deploying yet.

For a private repository, connect the Dokploy GitHub provider or add Dokploy's
generated SSH public key as a read-only deploy key.

## 2. Add the environment

Open the Compose service's **Environment** tab and add the following. Replace all
example values; do not reuse passwords between fields.

```dotenv
POSTGRES_DB=bubllio
POSTGRES_USER=bubllio
POSTGRES_PASSWORD=replace-with-a-strong-database-password
DATABASE_URL=postgresql://bubllio:replace-with-the-url-encoded-database-password@postgres:5432/bubllio

DJANGO_SECRET_KEY=replace-with-the-generated-django-secret
DJANGO_ALLOWED_HOSTS=crm.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://crm.example.com
DJANGO_SECURE_HSTS_SECONDS=3600
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=false
DJANGO_SECURE_HSTS_PRELOAD=false
BUBLLIO_APP_URL=https://crm.example.com
BUBLLIO_SETUP_TOKEN=replace-with-a-random-one-time-token-at-least-32-characters
BUBLLIO_EMAIL_ENCRYPTION_KEYS=replace-with-the-generated-fernet-key
```

If the database password contains reserved URL characters, URL-encode it only in
`DATABASE_URL`; keep the original value in `POSTGRES_PASSWORD`.

Dokploy writes these values to the Compose `.env` file. The Bubllio Compose file
references every required value explicitly, so secrets are passed only to the
services that need them.

## 3. Configure the public domain

1. Open the Compose service's **Domains** tab.
2. Add `crm.example.com`.
3. Select service `frontend` and container port `8080`.
4. Enable HTTPS and certificate generation.
5. Use Dokploy's **Preview Compose** action and verify that routing targets only
   `frontend:8080`, never `backend` or `postgres`.

Use Dokploy's native domain management. Do not add public host ports or custom
Traefik labels to this repository.

## 4. Deploy and verify

Click **Deploy** and follow the build logs. A healthy deployment shows all three
services running. The backend startup automatically applies migrations once and
collects Django static files before Gunicorn starts.

Verify from a browser or terminal:

```bash
curl --fail --show-error https://crm.example.com/health/
```

Then open `https://crm.example.com` and complete first-run setup. Enter the SMTP
account once in the **Email** step; Bubllio encrypts its password and uses that
account for installation invitations and password resets. For Google Workspace
authenticated relay, use `smtp-relay.gmail.com`, port `587`, the full mailbox as
the username, its app password, and STARTTLS (leave SSL unchecked).

Test:

1. installation administrator login;
2. workspace creation;
3. SMTP test message;
4. invitation delivery and acceptance;
5. password reset delivery;
6. logout and login again.

After setup succeeds, the first-run endpoint locks itself automatically. Removing
`BUBLLIO_SETUP_TOKEN` from Dokploy later is optional defense in depth; it is not
required for normal operation and does not require interrupting the initial
deployment flow.

A green container state alone is not acceptance evidence. The public health URL
and the user journey must both work.

## 5. Back up before real data

Configure an S3-compatible destination in Dokploy. Create a scheduled PostgreSQL
backup for database `bubllio`, run **Test**, and confirm that an object appears in
the destination. Also protect the persistent volume if required by the chosen
Dokploy backup mode.

Before admitting real users, restore one backup into an isolated test deployment
and record the timestamp and duration. A successful upload without a restore test
is not a verified backup.

## Updating

For a private repository with custom code, enable the automatic update pull
request described in [Updating a self-hosted installation](updating.md). Review
and merge its green PR before deploying; do not pull source code inside the
server or running containers.

1. Take and verify a database backup.
2. Select the exact merged commit from the private repository's `main` branch.
3. Deploy from Dokploy.
4. Confirm all services are healthy and call `/health/`.
5. Run login, workspace access, invitation, and one critical CRM flow.

Keep the previous release identifier available. Database migrations can require a
forward fix, so an application rollback does not replace a database backup.

## Stop conditions

Do not onboard users when any of these is true:

- HTTPS is invalid or the app is reachable only over HTTP;
- the backend or database is exposed directly to the internet;
- migrations or `/health/` fail;
- invitations or password resets do not arrive;
- backups have not completed a restore rehearsal;
- a user can access another workspace's data.

After deployment, run the production-environment audit against the real service
and keep its evidence with the release SHA.
