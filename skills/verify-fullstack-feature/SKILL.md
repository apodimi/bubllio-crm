---
name: verify-fullstack-feature
description: Verify a completed Bubllio CRM change across Django, React, migrations, tenant isolation, formatting, tests, build, and browser flows. Use before handoff or release of a cross-stack feature; it verifies and reports but does not broaden the feature scope.
---

# Verify a Full-Stack Feature

Inspect the requested diff and read the relevant `AGENTS.md` files. Use the
narrowest checks that cover the change, then run the full mandatory gates below
before a release-ready claim.

## Review gates

1. Confirm documentation and API claims match implemented behavior.
2. For organization-owned data, apply `audit-tenant-boundaries` and require
   allowed and denied two-organization regression coverage.
3. Confirm model changes have a new migration and no prior migration was edited.
4. Check ORM behavior remains portable between SQLite and PostgreSQL.
5. Check the frontend follows hook -> service -> shared Axios, uses tenant-aware
   query keys, and renders loading, empty, error, and pending states.
6. Check secrets, local databases, caches, browser artifacts, and generated output
   are not included in the diff.

## Mandatory commands

Run from the repository root:

```bash
uv run python src/manage.py check
uv run python src/manage.py makemigrations --check --dry-run
uv run python src/manage.py test bubllio_crm organizations access onboarding companies contacts automations
```

Run from `frontend/`:

```bash
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

Use a PostgreSQL-backed run when the change affects models, migrations,
constraints, transaction behavior, ordering, or database-specific semantics.
Run `uv run python src/manage.py check --deploy` with production-like environment
settings for release verification; development defaults are not evidence of
production safety.

## Result

Report failures first with actionable locations. Then list every executed command
and its result, skipped checks with reasons, and residual release risks. Do not
declare the change verified if a mandatory gate failed or was skipped without an
explicitly accepted reason.
