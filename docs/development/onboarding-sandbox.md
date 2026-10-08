# Test first-run onboarding locally

Use the onboarding sandbox when you need to repeat the initial administrator,
workspace, and SMTP flow. It never reads or changes the normal development
database.

## Start with a clean installation

From the repository root:

```bash
./scripts/onboarding-dev.sh reset
```

The command:

1. creates an ignored SQLite database under `.local/onboarding/`;
2. applies migrations;
3. generates temporary setup and email-encryption keys;
4. starts Django and the React frontend; and
5. prints the setup token to enter in the onboarding form.

Open `http://127.0.0.1:5173` and complete the flow. Press `Ctrl+C` to stop both
servers.

## Resume instead of resetting

To keep the current sandbox data:

```bash
./scripts/onboarding-dev.sh start
```

This is useful for inspecting the application after setup or continuing an
interrupted test.

## Repeat the flow

Run `reset` again. Only the dedicated sandbox database and its SQLite sidecar
files are removed. The default SQLite database and any PostgreSQL database in
your `.env` remain untouched because the script supplies its own `DATABASE_URL`.

To see the exact sandbox path without starting servers:

```bash
./scripts/onboarding-dev.sh path
```

The generated keys are temporary and intended only for this local sandbox. The
update checker is disabled so onboarding tests do not make release-check
requests.
