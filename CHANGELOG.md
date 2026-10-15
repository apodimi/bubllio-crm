# Changelog

All notable changes to Bubllio CRM are documented here. Versions follow Semantic
Versioning and correspond to published GitHub Releases.

## 0.2.3 — 2026-10-15

### Added

- redesigned Overview focused on the next action, today's task queue, items that
  need attention, billing pulse, and workspace totals;
- customer timeline, stronger company/contact search and ownership workflows,
  and expanded service and billing operations;
- responsive dock navigation, mobile navigation, and bundled Keyline icons;
- an installation-admin Update Center and an independent, provider-agnostic
  update agent with HMAC-authenticated orchestration, persistent progress,
  digest-pinned Compose deployments, and signed release verification;
- automated release publication with GHCR images, build attestations, a
  canonical Sigstore-signed manifest, and an attested updater wheel.

### Changed

- company and contact identity rules are now enforced per workspace with indexed
  list paths and transaction-safe customer-code allocation;
- production images now contain immutable version and commit provenance;
- the release requires a maintenance window while timeline, identity, and index
  migrations run. Duplicate email or tax identities abort safely and must be
  resolved before retrying.

### Fixed

- release verification now runs portably on Linux, including updater temporary
  directories, packaged license metadata, and isolated encryption-key tests.
- release image promotion now preserves the exact verified OCI manifest digest
  instead of converting it through the local Docker image store.
- Dokploy and production Compose builds now build the shared backend image once
  and reuse it for worker and beat, avoiding parallel image-tag collisions.

### Removed

- Automations are no longer exposed through the UI, API, admin, signals, or
  execution services. Phase 1 deliberately retains legacy models, tables, and
  outbox rows for rollback; workers ignore those rows. Physical data deletion is
  deferred to a separately approved cleanup release.

### Upgrade notes

- take a verified PostgreSQL backup and complete an isolated restore rehearsal;
- stop old web, worker, and beat writers before deploying this release;
- review and apply the migration plan once, then verify health, login, workspace
  access, invitations, tasks, companies, contacts, services, and billing;
- keep the previous release identifier available. See
  `docs/development/updating.md` for the full runbook.

## 0.1.1 — 2026-10-08

### Fixed

- production and Dokploy installations now collect SMTP credentials once in the
  first-run setup instead of requiring duplicate environment configuration;
- deployment guidance now reflects that setup locks automatically after success
  and that removing the setup token is optional defense in depth;
- added concrete Google Workspace authenticated relay values to the Dokploy
  operator guide.

## 0.1.0 — 2026-10-07

First internal production release.

### Included

- multi-workspace CRM with tenant-isolated companies and contacts;
- deals pipeline with drag-and-drop status management;
- tasks and follow-ups in list and board views;
- customer services, subscriptions, charges, payments, VAT, and cancellation
  through the paid period;
- roles, workspace invitations, invitation expiry, resend, and revoke;
- installation-admin setup, security checks, update notifications, and backup
  status;
- SMTP accounts, branded transactional emails, invitations, and password reset;
- Docker Compose deployment paths for standard servers and Dokploy;
- responsive React interface and PostgreSQL-backed production configuration.

### Operator notes

- Back up the database and complete a restore rehearsal before onboarding users.
- Configure HTTPS, production secrets, SMTP, monitoring, and off-server backups.
- Follow `docs/development/dokploy-deployment.md` for Dokploy installations.
- Workflow automation is not part of the current product. Any future version is
  tracked separately in `docs/architecture/automation-roadmap.md`.
