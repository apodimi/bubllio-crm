# Migrations

Django does not change the database immediately when we edit a model.

The flow is:

```text
models.py
  -> makemigrations
  -> migration file
  -> migrate
  -> database table
```

## 1. Write Or Change The Model

Example file:

```text
src/organizations/models.py
```

Example model:

```python
import uuid

from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

Why:

- `id` is a UUID, so the public API does not expose integer IDs like `1`, `2`, `3`.
- `name` is the visible organization name.
- `slug` is a URL-friendly unique identifier.
- `created_at` is set once when the row is created.
- `updated_at` changes every time the row is saved.
- `__str__` controls how the object appears in Django admin and shell.

## 2. Create Migration

```bash
uv run python src/manage.py makemigrations
```

Or for one app:

```bash
uv run python src/manage.py makemigrations organizations
```

This creates a file like:

```text
src/organizations/migrations/0001_initial.py
```

Important: `makemigrations` does not change the database. It creates a migration file.

## 3. Apply Migration

```bash
uv run python src/manage.py migrate
```

This changes the database.

For `Organization`, it creates a table like:

```text
organizations_organization
```

## 4. Check Migration Status

```bash
uv run python src/manage.py showmigrations
```

Checked migrations look like:

```text
[X] 0001_initial
```

Unchecked migrations look like:

```text
[ ] 0001_initial
```

## Important Notes

Migration files are source code. Commit them to git.

The local SQLite database is not source code. Do not commit it:

```text
src/db.sqlite3
```

If you change a model, run:

```bash
uv run python src/manage.py makemigrations
uv run python src/manage.py migrate
```

Changing primary key type is sensitive.

Example:

```text
integer id -> UUID id
```

If rows already exist, this can break local data unless handled carefully.

For local learning data, it is sometimes okay to reset the local database. For production data, never delete the database; write a careful migration plan.

Migrations must remain portable across every database backend the project claims
to support. Run them against SQLite and PostgreSQL when a change depends on
database behavior. Changing `DATABASE_URL` selects another database; it does not
move existing records between databases.

## CRM database performance upgrade

The companies `0006`, contacts `0003`, and subscriptions `0004` migrations add
tenant-prefixed listing/date indexes, a customer-code counter, and case-insensitive
uniqueness for non-empty company email/tax IDs and contact emails within a workspace.
Archived records retain their identity reservations. Empty strings may repeat;
API inputs are trimmed before saving. Case folding follows the selected database's
`LOWER()` semantics (SQLite's built-in folding is limited for non-ASCII text).

Apply during a maintenance window: stop web/worker writers, take a backup, run
`uv run python src/manage.py migrate --plan`, then `uv run python src/manage.py migrate`
with the intended `DATABASE_URL`, and restart all processes on the new code.
Index creation and constraint checks can hold locks; this is not a zero-downtime
migration. Do not mix old writers that scan codes with the new counter allocator.

The migrations detect conflicting identities and abort with an actionable error;
they never merge, delete, or rewrite customer/contact identity values. Resolve
conflicts explicitly, then retry. Counter backfill reads existing codes once,
preserves all identifiers, and seeds the maximum numeric `CUS-` suffix per tenant.
Very large suffixes outside the signed-bigint counter range block the upgrade.

Normal saves allocate codes transactionally, and explicit numeric codes advance
the counter. Deleting a company does not recycle its code. Bulk imports that bypass
`save()` must not assign numeric `CUS-` codes without also maintaining the counter
inside the same transaction; use normal model/service creation instead.

Schema reversal removes the new indexes, constraints and counter, but preserves
company/contact rows. Roll back application code together with the schema while
writers are stopped. Reapplying rebuilds the counter from surviving rows, so a
rollback/reapply cannot preserve reservations for already deleted highest codes.

Billing overview totals are grouped by currency in SQL. Monthly recurring revenue
is first grouped by currency and billing interval, then divided and rounded using
Decimal in Python; this avoids SQLite integer-division differences and keeps
currencies separate.

## Membership Migration Note

Migration `organizations.0002_organizationmembership` introduces access control.
It deliberately does not assign owners to organizations that existed beforehand,
because the old schema contains no reliable user-to-organization relationship.
After applying it to an existing development database, use a Django superuser in
`/admin/` to create one owner membership for each existing organization.
