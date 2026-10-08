# Bubllio CRM Agent Guide

## Project Context

Bubllio CRM is a multi-tenant Django REST Framework backend. An `Organization`
owns its companies, contacts, automations, and automation runs. Preserve tenant
boundaries whenever data is created, queried, updated, or deleted.

Read the relevant architecture document before changing a domain:

- `docs/architecture/crm-domain.md`
- `docs/architecture/automations.md`
- `docs/architecture/email-adapters.md`
- `docs/api/rest-patterns.md`
- `docs/development/databases.md` for database configuration or backend changes.

## Repository Conventions

- Use Python 3.13 and `uv`.
- Keep model and query behavior portable across SQLite and PostgreSQL. Use
  `DATABASE_URL`; do not add application-level database adapters around Django's
  ORM.
- Run Django commands from the repository root with
  `uv run python src/manage.py ...`.
- Keep HTTP coordination in views, API validation in serializers, reusable
  business behavior in services, and persistent invariants in models or database
  constraints.
- Use UUIDs for public model identifiers.
- Add and commit Django migrations for model changes. Never edit an already
  applied migration merely to reflect a later model change.
- Add tests for new behavior and regressions.
- Keep documentation consistent with implemented behavior; clearly distinguish
  future plans from working features.
- Do not commit local databases, virtual environments, secrets, IDE settings, or
  generated caches.

## Local Development Hygiene

Keep the repository free from files that exist only because of one contributor's
machine, editor, agent, or local workflow.

- Never commit local tool state, caches, generated critiques or reports, browser
  artifacts, debug output, local databases, uploaded media, build output, IDE
  metadata, environment files, credentials, tokens, or temporary scripts.
- Never commit absolute filesystem paths, machine names, personal email addresses,
  or other contributor-specific identifiers. Use neutral placeholders in examples.
- When introducing a tool that creates local files, add its output directory to
  the repository `.gitignore` before running or committing it. Do not rely only on
  `.git/info/exclude`, because that protection is not shared with contributors.
- Commit an example configuration only when it is intentionally documented,
  contains placeholders, and is safe for public distribution. Keep the real local
  configuration ignored.
- Before every commit, inspect `git status --short` and the staged diff. If a file
  is not required to build, test, operate, or document the shared project, leave it
  untracked.

## Repository Skills

Load the matching skill before performing one of these workflows:

- `skills/add-crm-resource/SKILL.md`: add or expand a REST resource.
- `skills/add-automation-trigger/SKILL.md`: implement an automation event.
- `skills/add-automation-action/SKILL.md`: implement an action executor.
- `skills/write-api-tests/SKILL.md`: add Django/DRF API tests.
- `skills/verify-django-project/SKILL.md`: verify a completed change.
- `skills/audit-tenant-boundaries/SKILL.md`: audit organization isolation and
  cross-tenant authorization risks.
- `skills/add-frontend-feature/SKILL.md`: add or expand a React API feature.
- `skills/verify-fullstack-feature/SKILL.md`: verify a completed cross-stack
  change before handoff or release.
- `skills/review-django-migration/SKILL.md`: review model and migration changes
  for safety and database portability.
- `skills/audit-production-environment/SKILL.md`: produce an evidence-based
  production GO, NO-GO, or UNKNOWN verdict.

Use only the skills relevant to the requested work. They guide implementation but
do not broaden the user's requested scope or authorize unrelated changes.
