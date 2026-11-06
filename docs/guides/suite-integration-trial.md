# How do I trial CRM with Bubllio Core?

The `develop` branch has an additive suite sign-in path. Existing CRM
SimpleJWT login remains available. Use an isolated CRM database and a matching
Core/Keycloak test environment; this is not a live CRM cutover.

## Prepare the two installations

1. Finish Core and CRM setup. Register app key `crm` in Core's application
   manifest with the CRM launch URL, audience `bubllio-crm-api`, and compatible
   access contract. Enable it for the Core organization and grant the test
   member CRM access explicitly. A Core owner has no automatic CRM grant.
2. Configure Keycloak's public CRM web client for Authorization Code with PKCE
   S256, organization scope, and access-token audiences **both**
   `bubllio-crm-api` and `bubllio-core-api`. The Core development realm template
   includes these values for fresh local realms. Existing realms require a
   client update; editing the JSON template does not update running Keycloak.
3. Set all four `SUITE_*` values in the CRM `.env.example` on the API and the
   `VITE_SUITE_*` values in `frontend/.env.example` before building the client.
4. Import the business transfer as described in
   [installation settings](installation-settings.md). Choose an active target
   CRM user with local membership in the imported workspace, then bind IDs:

```bash
uv run python src/manage.py link_suite_identity \
  --user-id CRM_USER_ID \
  --subject KEYCLOAK_SUB \
  --crm-organization-id CRM_ORG_UUID \
  --core-organization-id CORE_ORG_UUID
```

Use immutable IDs from the two systems. The command rejects missing local
membership and conflicting links. It never matches email or organization name.
Repeat for each trial user and organization. Core access is checked on every
tenant request; CRM still enforces local roles and record permissions.
Organization-list requests have a three-second Core decision budget and fail
closed if it expires.

## Verify before a cutover decision

- Open CRM from Core and directly. Both routes must reach only a mapped tenant.
- Test allowed and denied grants in two organizations, including direct API
  calls. Revoking a grant must deny the next request.
- Test unmapped identity and organization, invalid token, and Core outage. The
  old CRM login and imported customer/deal relations must still work.
- Reconcile export counts, linked records, amounts, and archived state. Keep a
  tested rollback to the old CRM database and login until a final export after
  writes pause has been verified.

CRM password, account deletion, installation administration, and CRM invitation
routes are unavailable to suite sessions in this trial. Keycloak handles suite
passwords and recovery; Core handles suite membership and grants. SMTP secrets
and active invitations are not in the business transfer.
Revoking a Core grant stops suite sessions; it does not revoke a separate,
still-valid legacy CRM JWT during the compatibility window. Operators must
disable the legacy account/session separately when that is required.

The CRM product owner decides record completeness. Core/CRM engineering and
security owners decide identity mapping and rollback. The Privacy & GDPR Lead
decides handling and retention of the personal-data transfer. The release owner
decides live cutover. Agent reviews do not replace these decisions.
