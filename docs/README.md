# Bubllio documentation

You do not need to read these documents in order. Pick the path that matches
what you are trying to do.

## Install and operate

1. [Getting started](getting-started.md) — local installation and first setup.
2. [Database setup](development/databases.md) — SQLite or PostgreSQL.
3. [Onboarding sandbox](development/onboarding-sandbox.md) — repeat first-run
   setup without touching your normal development database.
4. [Production deployment](development/production-deployment.md) — minimum
   production requirements.
5. [Dokploy deployment](development/dokploy-deployment.md) — complete Dokploy
   walkthrough.
6. [Production readiness](development/pilot-production-readiness.md) — evidence
   required before real customer data.
7. [Updates](development/updating.md) — releases, backups, upgrades, and rollback.

## Using Bubllio

These guides explain the product in business language:

- [Contacts and companies](guides/contact-management.md)
- [Sales pipeline](guides/sales-pipeline.md)
- [Tasks and follow-ups](guides/tasks-and-follow-ups.md)
- [Services and billing](guides/services-and-billing.md)
- [Roles and access](guides/roles-and-access.md)
- [Installation settings](guides/installation-settings.md)
- [First automation](guides/first-automation.md)

## Contributing

Start with [Contributing](contributing.md), then open only the guide related to
your change:

- [Project structure](project-structure.md)
- [Django workflow](development/django-workflow.md)
- [Frontend workflow](development/frontend-workflow.md)
- [Migrations](development/migrations.md)
- [Database development](development/databases.md)
- [Simplicity rules](development/simplicity-rules.md)
- [IDE setup](development/ide.md)

Repository-wide rules live in [`AGENTS.md`](../AGENTS.md). Focused implementation
workflows live in [`skills/`](../skills/).

## Architecture

Read [System overview](architecture/system-overview.md) first. Continue only into
the domain you are changing:

- [CRM domain](architecture/crm-domain.md)
- [Authentication and roles](architecture/authentication-and-roles.md)
- [Privacy and security](architecture/privacy-and-security.md)
- [Automations](architecture/automations.md)
- [Email delivery](architecture/email-adapters.md)

## API

- [Authentication](api/authentication.md)
- [REST patterns](api/rest-patterns.md)
- [Postman collection](api-postman.md)

The checked-in Postman collection is useful for exploration. The Django views,
serializers, and tests remain the authoritative API contract.

## Plans and research

These pages describe direction, not shipped behavior:

- [Pilot roadmap](roadmap/pilot-roadmap.md)
- [Services and billing brief](roadmap/services-and-billing-brief.md)
- [Automation roadmap](architecture/automation-roadmap.md)
- [Workspace access research](research/access-model-comparison.md)

## Documentation rules

- One page should answer one main question.
- Put the outcome or quick path before background information.
- Use tables for comparisons and code blocks only for commands or exact examples.
- Link to the authoritative page instead of copying the same explanation.
- Label planned behavior explicitly.
- Keep commands runnable from the directory stated above them.
- Remove stale instructions when behavior changes; do not preserve them as a
  historical narrative.
