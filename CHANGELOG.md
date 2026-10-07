# Changelog

All notable changes to Bubllio CRM are documented here. Versions follow Semantic
Versioning and correspond to published GitHub Releases.

## 0.1.2 — 2026-10-08

### Added

- opt-in daily update pull requests for private installations with custom code;
- explicit full-CI verification for every automatically proposed update branch;
- a documented review, backup, merge, and Dokploy deployment workflow that does
  not require pulling source code on the production server.

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
- Automation delivery remains limited to the behavior documented in
  `docs/architecture/automations.md` and `docs/architecture/email-adapters.md`.
