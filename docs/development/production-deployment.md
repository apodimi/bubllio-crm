# Production deployment

For a guided Dokploy installation, use
[Install Bubllio CRM with Dokploy](dokploy-deployment.md).

This runbook deploys Bubllio CRM as three containers: PostgreSQL, the Django API
behind Gunicorn, and the React application behind Nginx. Put a TLS-terminating
reverse proxy or managed load balancer in front of port 8080. Do not expose the
PostgreSQL or Django containers directly to the internet.

## First deployment

1. Copy `.env.production.example` to `.env.production` on the server.
2. Replace every `CHANGE_ME` value. Never commit the resulting file.
3. Point the public DNS record at the TLS proxy or load balancer.
4. Start the immutable application images:

   ```bash
   docker compose --env-file .env.production -f compose.production.yaml up -d --build
   ```

5. Verify container health and the public readiness endpoint:

   ```bash
   docker compose --env-file .env.production -f compose.production.yaml ps
   curl --fail https://crm.example.com/health/
   ```

6. Open the application, complete the supported setup flow, and test an
   invitation, password reset, and installation SMTP message.
7. Setup locks itself automatically after success. Optionally remove
   `BUBLLIO_SETUP_TOKEN` during a later maintenance deployment as defense in
   depth; an immediate restart is not required.

The backend entrypoint applies migrations before Gunicorn starts and collects
Django admin static files. The public frontend sends same-origin `/api/`
requests to Django, so the browser never needs database or API credentials.

## TLS and proxy requirements

The outer proxy must terminate HTTPS and overwrite `X-Forwarded-Proto` with
`https`. Set `DJANGO_TRUST_X_FORWARDED_PROTO=true` only while Django remains
reachable exclusively through these trusted proxies. Start HSTS at the example
one-hour value; increase it only after HTTPS operation and every relevant
subdomain have been verified.

## Updates

Before updating, complete and verify a database backup. Pull the selected GitHub
release or immutable image, rebuild/start the services, then check `/health/`
and the critical customer flow. Keep the previous release identifier available
for rollback. A database migration may require a forward-fix rather than an
application-only rollback.

## Backups

Store database backups outside the application host or Docker volume, encrypt
them, define retention, and test a restore in an isolated environment. After the
real job succeeds, report it to Bubllio with `record_backup_event` as described
in [Updating and backups](updating.md). The application export is useful for
portability but is not a database backup.

## Remaining provider-specific work

The repository cannot choose or configure the public domain, TLS provider,
firewall, off-host backup storage, transactional email account, monitoring
vendor, or alert recipients. Record those decisions with the pilot evidence and
run the full checklist in
[Pilot production readiness](pilot-production-readiness.md) before onboarding a
customer.
