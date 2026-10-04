---
name: review-django-migration
description: Review Bubllio CRM Django model and migration changes for correctness, data preservation, deployment safety, and SQLite/PostgreSQL portability. Use for schema, constraint, index, or data-migration changes; review only unless implementation is requested.
---

# Review a Django Migration

Read `docs/development/migrations.md`, `docs/development/databases.md`, and the
affected domain architecture document. Review the model diff together with every
new migration. Never rewrite an already-applied migration to represent a later
change.

## Correctness

- Ensure migration state matches current models and `makemigrations --check`
  reports no missing migration.
- For data migrations, use historical models from `apps.get_model`; do not import
  current application models.
- Preserve UUID public identifiers, organization ownership, uniqueness rules,
  defaults, nullability, and deletion behavior.
- Check forward and reverse behavior. If reversal is intentionally impossible,
  make that explicit and justify it.
- Avoid model methods, signals, and live service behavior in historical data
  transformations.

## Deployment safety

Identify table rewrites, long locks, full-table backfills, uniqueness failures,
and old-code or new-schema incompatibility. For risky changes, prefer an explicit
expand, backfill, enforce, contract sequence rather than one blocking step. Do
not invent zero-downtime requirements when the deployment model does not need
them, but state downtime and rollback assumptions.

Use Django ORM migration operations where practical. Raw SQL must support the
documented database targets or have an explicit, tested vendor branch. Do not
add an application-level database adapter around Django's ORM.

## Verification

At minimum run:

```bash
uv run python src/manage.py makemigrations --check --dry-run
uv run python src/manage.py migrate --plan
uv run python src/manage.py test <affected-apps>
```

For material schema or data changes, apply migrations to a fresh database and an
upgrade fixture that represents existing data. Verify on PostgreSQL as well as
SQLite when constraints, indexes, JSON, transactions, ordering, or SQL differ.

Report findings by severity with file and line, failure mode, and remediation.
State which database paths and migration directions were actually exercised.
