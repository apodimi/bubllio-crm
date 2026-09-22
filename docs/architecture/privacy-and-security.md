# Privacy and security baseline

Bubllio implements technical safeguards that help an installation operator meet
privacy obligations. They are not a legal certification: the operator still
needs a privacy notice, lawful-basis decisions, retention rules, processor
agreements, incident response, and local legal review.

The design follows the GDPR principles of transparency, purpose limitation, data
minimisation, accuracy, storage limitation, integrity/confidentiality and
accountability. The European Commission's overview of individual rights is the
reference for the product-facing controls: [information, access, rectification,
erasure, restriction, portability and objection](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/what-information-must-be-given-individuals-whose-data-are-collected_en).

## Current controls

- **Access and correction:** an authenticated user can read and update their
  own email, name, locale, timezone and optional date of birth in Account
  settings.
- **Consent records:** the profile stores the privacy-policy version and
  acceptance timestamp separately from optional marketing consent and its
  change timestamp. Marketing email must remain opt-in.
- **Portability:** `GET /api/v1/auth/me/export/` downloads a JSON export of
  account, profile and workspace-membership data. Credentials, JWTs, SMTP
  passwords and CRM records are never included.
- **Erasure:** `POST /api/v1/auth/me/delete/` requires the current password and
  an explicit `DELETE` confirmation. A workspace owner must transfer ownership
  first so deletion cannot orphan a tenant.
- **Authentication safety:** passwords use Django validators, reset requests are
  generic to avoid account enumeration, reset requests are rate-limited, JWT
  access tokens are short-lived, refresh tokens rotate and logout blacklists
  them.
- **Tenant isolation:** API queries scope organizations and CRM resources to
  memberships. A superuser does not automatically gain visibility into an
  unrelated workspace through the normal API.
- **Secret handling:** SMTP credentials are encrypted at rest with the server
  Fernet key and are never returned by settings endpoints.

## Operator responsibilities still required

Before calling an installation production-ready, document the data controller,
lawful basis per purpose, retention/deletion schedule, backup expiry behavior,
subprocessors and data-processing agreements, data residency, breach response,
access-review process, and a published privacy notice. Add a consent screen to
the invite registration flow before treating marketing or policy acceptance as
complete for a new account.

Avoid collecting optional personal data unless the installation needs it. Date
of birth is optional and should have a clearly documented purpose. Export and
deletion requests should be handled within the operator's documented SLA and
verified against the authenticated account.

