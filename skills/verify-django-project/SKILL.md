---
name: verify-django-project
description: Verify Bubllio CRM changes with targeted tests, Django system checks, migration consistency checks, and a focused diff review. Use after code, model, API, or automation changes and before reporting completion.
---

# Verify the Django Project

Choose checks proportional to the change. Run targeted tests first when available,
then the project-wide baseline from the repository root:

```bash
uv run python src/manage.py check
uv run python src/manage.py makemigrations --check --dry-run
uv run python src/manage.py test organizations companies contacts automations
```

The explicit app labels are required by this repository's `src/` layout. A bare
`manage.py test` currently discovers zero tests and is not valid verification.

If models intentionally changed, create the migration first and inspect it for
unintended operations. Never claim that `makemigrations --check` proves migrations
were applied to a deployment database.

Review the final diff for:

- missing organization scoping or cross-tenant validation;
- API behavior that differs from documentation or Postman examples;
- secrets, local databases, IDE state, caches, or unrelated edits;
- automation side effects without matching run records or failure handling.

Report which commands ran and their outcomes. If a check cannot run, state the
exact reason; do not describe the change as fully verified.
