# Understanding Installation Settings

This guide is for the person responsible for keeping a self-hosted Bubllio CRM
installation available and safe. You do not need to be a Django developer.

Open **Account settings** with an installation administrator account. Workspace
owners cannot see these installation-wide controls.

## Server safety checks

The checklist answers whether Bubllio's main application settings are suitable
for real users. Each row explains why the setting matters. A failed row includes
the exact environment variable the server administrator must change.

After changing an environment variable, restart Bubllio and reload the page.
Passing every application check does not confirm the hosting provider's
firewall, HTTPS certificate, monitoring, or backup configuration; verify those
with the provider too.

## Information for support

Use **Copy support information** when asking for help. The report contains
software versions, database type, public address, and other basic operating
details. It excludes passwords, secret keys, database login details, email
credentials, and customer records.

## Access and workspace history

This table shows the latest 100 important administration actions. It covers
workspace provisioning, invitations, member role changes and removals, email
connection changes, installation-administrator invitations, installation
settings, and data-export downloads. It does not store passwords, invitation
links, or secret values. Changes made directly through the database or Django
admin are not recorded here.

## Backup health

Bubllio displays the results reported by the real backup process. It does not
copy the database by itself.

The hosting provider, database service, or a scheduled server job should create
the backup. After a successful backup, run:

```bash
uv run python src/manage.py record_backup_event --kind backup --status success
```

After proving that a backup can be restored into a safe, isolated environment,
run:

```bash
uv run python src/manage.py record_backup_event --kind restore_test --status success
```

Use `--status failure` when either operation fails. This makes the problem
visible to the next installation administrator who opens Settings.

By default, Bubllio marks a backup as too old after 24 hours and a recovery test
as too old after 90 days. Change those expectations with:

```env
BUBLLIO_BACKUP_MAX_AGE_HOURS=24
BUBLLIO_RESTORE_TEST_MAX_AGE_DAYS=90
```

Do not report success until the real backup or recovery test has completed.

### Downloading a local data copy

Use **Download data export** to save a JSON copy of workspaces, members,
companies, contacts, and non-secret settings on your computer.
Passwords, sign-in tokens, and saved email passwords are excluded. Every
download is added to the access history.

The downloaded file still contains customer and contact information. Store it
in an encrypted location with restricted access. This export is useful for
review and portability, but it is not a complete database backup that Bubllio
can restore automatically. Keep the external database backup and recovery-test
process in place.

### Preparing a CRM business-data transfer

Use **Download CRM transfer** when moving customer records into a fresh CRM
installation. The installation-admin-only endpoint
`GET /api/v1/installation/business-transfer/` produces
`bubllio-crm-business-transfer` format version 1. It includes organization and
member references, non-secret organization settings, customer codes, companies,
contacts, deals, tasks, collaborators and costs, service catalog items,
subscriptions, charges, payments, and activity/timeline history. Each dataset
has a count and SHA-256 digest for import validation. A transfer is refused while
a workspace is awaiting owner provisioning or a business relation crosses
organizations.

The transfer contains customer information and member identifiers. Keep it in
restricted, encrypted storage and remove temporary copies after the trial.
Passwords, sessions, SMTP credentials, active invitation links, operational
logs, and legacy automation state are excluded and need separate handling.
Customer notes and other free text may still contain sensitive information.
This file is not a database backup or live synchronization. On Core-required
`develop`, use the [suite bootstrap](suite-integration-trial.md) to create an
empty passwordless staging workspace. On legacy `main`, complete normal CRM
setup and leave its setup workspace empty. Then validate the file and import it
from the server, naming the target staging user:

```bash
uv run python src/manage.py import_business_transfer /path/to/transfer.json
uv run python src/manage.py import_business_transfer /path/to/transfer.json --apply --trial-admin YOUR_ADMIN_USERNAME
```

The import requires only the empty staging workspace in the target. It preserves
customer, deal, and related UUIDs and dates; database-generated integer IDs
such as settings IDs may change. It grants the named staging
user admin access to imported team workspaces for the trial. All
referenced source users become inactive placeholders with unusable passwords;
their memberships and assignments retain references but do not grant them
sign-in. Imported personal workspaces require a separate owner reconciliation.
The import does not configure Core access or reconcile member identities;
follow the suite guide for immutable mappings and grants after import.
Keep the old installation available until records and access are verified in
the new one. The command parses the complete JSON file in memory; run a large
trial on a host with sufficient RAM and disk space.

## Software updates

When a newer stable GitHub Release exists, installation administrators see a
banner containing the installed version, the available version, and a link to
the release notes. Read the release instructions, back up the database, deploy
the exact release tag, run migrations, and verify sign-in plus one normal
workspace flow.

The application only reports the available update. It does not replace files,
run migrations, or restart the server automatically.

## Features still planned

- Restoring the older, partial **Download data export** file. Use the CRM
  business transfer format above for migration.
- Recording personal-account profile and sign-in changes in the installation
  history.
- Email alerts for failed or overdue backups and failed invitation delivery.
