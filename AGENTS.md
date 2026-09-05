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

## Repository Conventions

- Use Python 3.13 and `uv`.
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

## Repository Skills

Load the matching skill before performing one of these workflows:

- `skills/add-crm-resource/SKILL.md`: add or expand a REST resource.
- `skills/add-automation-trigger/SKILL.md`: implement an automation event.
- `skills/add-automation-action/SKILL.md`: implement an action executor.
- `skills/write-api-tests/SKILL.md`: add Django/DRF API tests.
- `skills/verify-django-project/SKILL.md`: verify a completed change.

Use only the skills relevant to the requested work. They guide implementation but
do not broaden the user's requested scope or authorize unrelated changes.

