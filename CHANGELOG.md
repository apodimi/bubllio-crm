# Changelog

All notable changes to Bubllio CRM are documented here. Versions follow Semantic
Versioning and correspond to published GitHub Releases.

## 0.2.7 — 2026-10-20

### Fixed

- custom customer services without a catalog item now expose a stable empty
  catalog name, and the frontend remains compatible with older responses that
  omitted the field instead of failing the entire services screen.

### Upgrade notes

- this release has no database migrations and is eligible for an online update
  from version 0.2.6.

## 0.2.6 — 2026-10-20

### Added

- a focused My work home with today's tasks, deals missing a next action, deals
  closing this month, and bookmarkable built-in task and deal views;
- richer customer timelines with safer follow-up creation and clearer service,
  billing, invitation, and update progress states;
- runtime response validation for critical frontend API contracts.

### Changed

- simplified the application shell, navigation, dashboard, company profile,
  task, deal, service, account, password-reset, and update experiences across
  desktop and mobile;
- deal work queues now use tenant-scoped server filters and bounded dashboard
  results instead of downloading broad lists;
- split large frontend surfaces into smaller, readable components while keeping
  existing routes and legacy `view=all` links compatible.

### Fixed

- service balances recalculate consistently after charge edits and accept the
  numeric API totals returned by the backend;
- password-reset links are invalidated after first successful use;
- invitation acceptance, tenant-scoped timeline writes, viewer-only deal
  access, update-agent reconnect reporting, and mobile navigation edge cases.

### Upgrade notes

- this release has no database migrations and is eligible for an online update
  from version 0.2.5;
- after deployment, verify sign-in, password reset, invitation acceptance, My
  work, deal views, customer timelines, billing edits, and Update Center status.

## 0.2.5 — 2026-10-16

### Added

- reusable, URL-aware list controls for companies and contacts, with clearer
  loading, empty, filtered, error, and mobile states;
- a focused task workspace with inline Jira-style status changes, a read-only
  details drawer, and a separate edit flow;
- direct company ordering and tenant-scoped assignee choices for faster CRM
  list workflows.

### Changed

- redesigned the overview, company, contact, deal, and task experiences around
  compact operational views, clearer hierarchy, and responsive layouts;
- refined the deals board with more actionable cards, persistent filters, and
  safer next-action entry;
- split the browser suite by CRM workflow and added component coverage for the
  shared list and board configuration.

### Fixed

- company updates, archive/restore actions, and membership-driven assignment
  cleanup now commit atomically with their audit history;
- removing a workspace member clears only that member's company assignments in
  the selected workspace and preserves assignments in every other workspace.

### Upgrade notes

- this release has no database migrations and is eligible for an online update
  from version 0.2.4;
- after deployment, verify sign-in, company/contact filtering, deal movement,
  task status changes, task details, editing, and member removal.

## 0.2.4 — 2026-10-15

### Added

- tenant-safe global CRM search across accessible workspaces, companies,
  contacts, and deals, with keyboard navigation and `Ctrl/Command + K` access;
- direct opening of contacts and deals selected from global search.

### Changed

- refined the workspace navigation with collapsible submenus, clearer active
  indicators, and a quieter interaction treatment;
- moved authenticated language selection into a scalable account-menu
  drill-down that remains usable as more languages are added;
- invalid workspace URLs now recover safely to the workspace picker.

### Upgrade notes

- this release has no database migrations and is eligible for an online update
  from version 0.2.3;
- after deployment, verify sign-in, workspace switching, global search, result
  navigation, submenu expansion, and language persistence.

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
