---
name: crm-release-trace
description: Trace a Bubllio CRM fix from source and signed release through image digests, Update Agent or Compose deployment, and the live browser/API when a user sees stale behavior.
---

# CRM release trace

Read `docs/development/updating.md`, `docs/development/production-deployment.md`,
the selected platform runbook, `release/policies/`, and `updater/README.md`.
Check the exact environment and current deployment mode before giving commands.

1. Identify the source commit, version, release tag, and migration policy.
   Confirm the matching frontend/backend images, signed manifest, and release
   verification succeeded. A green source build is not a deployed version.
2. Compare the verified image digests and agent `release.env` (or manual Compose
   inputs) with the running services. The API, worker, Beat, and frontend may
   be on different revisions during rollout; check the component that owns the
   reported behavior.
3. Verify the live browser asset, API route and response, health, and relevant
   job state. Separate stale browser cache, stale image, failed migration,
   incorrect routing, and unchanged durable data before choosing a remedy.
4. For Update Agent jobs, distinguish preflight, backup, pull, deploy, health,
   and `MANUAL_INTERVENTION`. Respect the signed `online_safe`, `maintenance`,
   or `irreversible` classification. Never supply arbitrary commands, image
   URLs, or provider credentials through Django.

Do not delete PostgreSQL, RabbitMQ, media, or agent volumes to fix stale UI.
Do not call a GitHub release a successful Dokploy rollout. Give the smallest
reversible recovery action and recheck the running behavior. Preserve an
off-host backup and restore evidence before a migration or rollback decision;
the Update Agent never automatically restores the database.
