# Developer commands

Use these entry points instead of remembering separate backend and frontend
commands.

## First setup

```bash
./scripts/bootstrap.sh
```

Installs Python and frontend dependencies, applies migrations, and runs Django's
configuration check.

## Start the application

| Goal | Command |
| --- | --- |
| Normal development data | `./scripts/dev.sh` |
| Fresh onboarding flow | `./scripts/onboarding-dev.sh reset` |
| Resume onboarding sandbox | `./scripts/onboarding-dev.sh start` |
| Fresh populated demo | `./scripts/demo-dev.sh reset` |
| Resume populated demo | `./scripts/demo-dev.sh start` |
| Local email inbox | `./scripts/mailpit-dev.sh` |

Features that send transactional email or execute automations use background
jobs. Run these in separate terminals when testing those flows:

```bash
docker compose up -d rabbitmq
uv run celery --workdir=src -A bubllio_crm worker --loglevel=INFO
uv run celery --workdir=src -A bubllio_crm beat --loglevel=INFO
```

The database-backed outbox preserves jobs while the broker or worker is briefly
offline. Beat republishes due jobs once per minute. `CELERY_TASK_ALWAYS_EAGER=true`
is available for isolated tests, but it does not represent production behavior.

The onboarding and demo profiles use separate ignored SQLite databases under
`.local/`. They never use the normal database configured in `.env`.

The demo login is:

```text
username: demo
password: demo-password
```

`seed_demo` is idempotent and may also be run against a development database:

```bash
uv run python src/manage.py seed_demo
uv run python src/manage.py seed_demo --reset
```

It refuses to run when `DJANGO_DEBUG=false`.

## Diagnose the environment

```bash
./scripts/doctor.sh
```

The doctor checks required commands, installed dependencies, Django/database
connectivity, pending migrations, and development ports.

## Verify changes

During development:

```bash
./scripts/verify.sh fast
```

Before handoff or release:

```bash
./scripts/verify.sh full
```

The full mode adds the frontend build, browser tests, release-version alignment,
and transactional-email compilation checks.

Both modes also validate the OpenAPI contract. Generate a local copy for
inspection or client tooling with:

```bash
./scripts/generate-api-schema.sh
```

The output is `.local/openapi.yaml`. It is a generated local artifact and is
intentionally excluded from Git.

## View local email

`./scripts/mailpit-dev.sh` starts Mailpit and configures Django to deliver into
it. Open `http://127.0.0.1:8025`. Messages never leave the local machine.

## Enable Git hooks

```bash
./scripts/install-git-hooks.sh
```

The pre-commit hook rejects local artifacts and absolute contributor paths. It
runs Django checks for staged Python changes and frontend lint for staged
TypeScript/JavaScript changes. Full tests remain explicit so commits stay fast.

The hook is optional local assistance; CI remains authoritative.
