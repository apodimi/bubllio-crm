# How do I run Core-required CRM on `develop`?

Core and Keycloak are required. CRM does not offer its own browser setup,
password login, password reset, or member invitations in this mode. The live
`main` release keeps its old login until a separately approved cutover.

## Prepare Core and identity

1. Complete Core setup and create its organization. Register app key `crm` in
   Core's application manifest with the exact CRM launch URL, audience
   `bubllio-crm-api`, and contract version `1`. Enable CRM and grant the test
   member access. Core owners receive no automatic CRM grant.
2. Configure Keycloak's public `bubllio-crm-web` client for Authorization Code
   with PKCE S256, organization scope, and access-token audiences **both**
   `bubllio-crm-api` and `bubllio-core-api`. The Core `develop` local realm
   template and local CRM manifest provide examples. Existing realms require an
   operator-applied client change; editing JSON does not update a running realm.
3. Configure `SUITE_OIDC_ISSUER`, `SUITE_OIDC_JWKS_URL`,
   `SUITE_OIDC_AUDIENCE`, `SUITE_OIDC_CLIENT_ID`, and `SUITE_CORE_API_URL` in
   the CRM API environment. `CORE_REQUIRED=true` is the default and is fixed
   in production Compose. The browser gets public OIDC metadata from
   `/api/v1/auth/suite/config/`; the image needs no Keycloak build arguments.

## Transfer CRM records

Start with a fresh CRM database and apply migrations. Bootstrap a local
passwordless record for the exact Keycloak subject of the trial operator:

```bash
uv run python src/manage.py bootstrap_suite_crm \
  --subject KEYCLOAK_SUB \
  --workspace-slug migration-staging
```

The command prints the generated `--trial-admin` username. Download the
business transfer from the old live CRM and run the importer on the target:

```bash
uv run python src/manage.py import_business_transfer /path/to/transfer.json
uv run python src/manage.py import_business_transfer /path/to/transfer.json \
  --apply --trial-admin GENERATED_USERNAME
```

For each imported CRM organization the operator will use, bind its immutable
Core ID and grant a CRM domain role:

```bash
uv run python src/manage.py provision_suite_member \
  --subject KEYCLOAK_SUB \
  --crm-organization-id CRM_ORG_UUID \
  --core-organization-id CORE_ORG_UUID \
  --role admin
```

For another imported member, pass that member's target `--user-id` and exact
existing CRM role. This activates the imported passwordless placeholder while
retaining its assignments. Without `--user-id`, a new passwordless CRM shadow
user is created. Neither command matches by email or name. The staging
workspace has no Core mapping and cannot be opened through CRM.

## Verify before cutover

- Open CRM from Core and directly; only mapped, granted organizations should
  appear. A direct tenant API call needs a Keycloak token, Core grant, and CRM
  domain permission. Wrong organization, revoked grant, invalid token, and Core
  outage must deny data.
- Confirm old CRM token, password, setup, invitation, `/admin/`, and `/api-auth/`
  routes are unavailable on the new deployment. Organization-list requests
  fail closed after a three-second Core decision budget.
- Reconcile export counts, customer/deal links, amounts, archived state, and
  assignment references. SMTP secrets and active invitations are transferred
  separately.

The old live CRM and database snapshot are the rollback path. Pause old writes,
take a final export, import and reconcile, then make a separate cutover decision;
new writes after cutover need a replay plan before rollback.

The CRM product owner decides record completeness. Core/CRM engineering and
security owners decide identity mapping and rollback. The Privacy & GDPR Lead
decides handling and retention of the personal-data transfer. The release owner
decides live cutover. Agent reviews do not replace these decisions.
