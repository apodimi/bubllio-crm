# Database Setup

Bubllio CRM uses Django's ORM and database backends. Application code does not
contain custom database adapters. Developers select a supported backend through
one environment variable: `DATABASE_URL`.

## Quick choice

| Goal | Setup |
|---|---|
| Start immediately | Do nothing; SQLite is used automatically |
| Run local PostgreSQL | Start the Compose service and set the provided URL |
| Use an existing PostgreSQL server | Set its connection URL |

Current support:

- SQLite: built in and enabled by default.
- PostgreSQL: supported through the optional `postgres` dependency extra.
- MySQL and other URL schemes: rejected with a clear message until they are
  tested and documented by the project.

## SQLite: zero configuration

When `DATABASE_URL` is absent or empty, Django uses `src/db.sqlite3`.

```bash
uv sync
uv run python src/manage.py migrate
uv run python src/manage.py runserver
```

The SQLite file is local data and is ignored by Git.

## Local PostgreSQL with Docker

Start only the database service and install the optional driver:

```bash
docker compose up -d postgres
uv sync --extra postgres
cp .env.example .env
```

Uncomment this line in `.env`:

```env
DATABASE_URL=postgresql://bubllio:bubllio@localhost:5432/bubllio
```

Then migrate and run normally:

```bash
uv run python src/manage.py migrate
uv run python src/manage.py runserver
```

Inspect the service with `docker compose ps` or `docker compose logs postgres`.
`docker compose down` stops it without deleting its named data volume. Deleting
that volume destroys local PostgreSQL data and is not part of the normal workflow.

## Existing or hosted PostgreSQL

Set the URL supplied by the database provider:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

URL-encode special characters in usernames and passwords. Provider query options,
including SSL parameters, remain part of the URL. Then run:

```bash
uv sync --extra postgres
uv run python src/manage.py migrate
uv run python src/manage.py check
```

The project loads a root `.env` file for local convenience. Existing process
environment variables take precedence, so deployments can inject `DATABASE_URL`
without relying on a file.

Never commit `.env` or real credentials. `.env.example` contains safe examples.

Email account encryption is separate from database configuration. If the UI is
used to create SMTP accounts, set `BUBLLIO_EMAIL_ENCRYPTION_KEY` in `.env` as
described in `docs/architecture/email-adapters.md`.

## How configuration works

`src/bubllio_crm/database.py` converts `DATABASE_URL` into Django's `DATABASES`
setting. PostgreSQL connections use health checks and a 60-second persistent
connection lifetime. It gives actionable startup errors for malformed URLs,
unsupported backends, and missing PostgreSQL drivers.

All models, migrations, and queries must remain backend-independent unless a
feature explicitly documents a database requirement.

## Switching databases

SQLite and PostgreSQL contain separate data. Changing `DATABASE_URL` changes the
database Django connects to; it does not copy records. Run `migrate` for every new
empty database. Moving existing data requires a separate export/import plan.

## Verification

Run the same checks against SQLite and a configured PostgreSQL database:

```bash
uv run python src/manage.py check
uv run python src/manage.py migrate
uv run python src/manage.py test bubllio_crm organizations companies contacts automations
```
