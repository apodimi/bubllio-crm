---
target_identity: "file:/Users/aposdimit/git/bubllio-crm/frontend/src/pages/Settings/SettingsPage.tsx"
target_fingerprint: "sha256:cb19a40c55e975aa40f30b0e2d7763502b89d3183aeaa811851570a08bfe1643"
target_path: /Users/aposdimit/git/bubllio-crm/frontend/src/pages/Settings/SettingsPage.tsx
timestamp: 2026-10-04T18-46-35Z
slug: frontend-src-pages-settings-settingspage-tsx
---
# Organization Settings critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2/4 | No save confirmation or connection health |
| 2 | Match with real world | 2/4 | SMTP jargon and ambiguous delivery scope |
| 3 | User control and freedom | 1/4 | No reset, deactivate, delete, or safe partial edit |
| 4 | Consistency and standards | 3/4 | Clean MUI patterns; promised identity section absent |
| 5 | Error prevention | 1/4 | Unsafe replacement flow and no connection test |
| 6 | Recognition rather than recall | 2/4 | Existing safe values are not prefilled |
| 7 | Flexibility and efficiency | 1/4 | Rigid single-account UI over richer backend |
| 8 | Aesthetic and minimalist design | 3/4 | Calm, but minimal partly because functionality is missing |
| 9 | Error recovery | 1/4 | Generic errors without field-level guidance |
| 10 | Help and documentation | 1/4 | No provider or credential guidance |
| **Total** | | **17/40** | **Poor** |

## Design Specificity Verdict

Low. This is a clean, category-standard SMTP form. The fallback rule is Bubllio-specific, but the surface does not express the CRM settings model, roles, account lifecycle, or automation limitations. The deterministic detector returned zero mechanical findings; browser inspection nevertheless exposed behavioral and information-architecture problems the syntax-oriented scan cannot detect.

## Overall Impression

The page looks calm and trustworthy at first glance, but it is not functionally complete. Its biggest opportunity is to become a workspace control center with truthful email health rather than an unsafe SMTP replacement form.

## What's Working

- Clear single-column hierarchy, readable width, and good baseline labels.
- Loading, retry, pending, and configured/unconfigured states exist.
- The installation-fallback explanation captures a real product rule.

## Priority Issues

1. **P1 — Actual workspace settings are invisible.** Timezone, locale, and default sender name are fetched but neither displayed nor saved. Add a General/Regional section using the existing settings and options endpoints.
2. **P1 — SMTP editing risks accidental overwrite.** Safe existing fields are not hydrated and the password is always required. Prefill non-secret values, make password optional on update, add reset/cancel, and clear it after save.
3. **P1 — No operational proof.** The backend supports test delivery, `last_tested_at`, and `last_test_error`, but the UI exposes none. Add Send test email and a health/status summary.
4. **P1 — Delivery scope is misleading.** Workspace SMTP currently handles invitations, not automation email. Rename the section or state the scope explicitly until integration exists.
5. **P2 — Backend capabilities are stranded.** Multiple accounts, default/active state, delete, TLS/SSL choice, and partial updates exist but the UI omits them. Add an account list and explicit security mode.

## Persona Red Flags

- **Power admin:** cannot see multiple accounts, safely change one field, test delivery, or manage default/active state.
- **First-time owner:** SMTP host, port, and credentials lack provider guidance and the page does not explain what messages use this account.
- **Accessibility-dependent admin:** missing announced success and detached generic errors make recovery harder, although labels and responsive layout are sound.

## Minor Observations

- The browser found no horizontal overflow at 390px and no runtime console errors.
- Password input needs an appropriate `autocomplete` attribute.
- The saved password remains in component state after submission.
- The account summary omits sender address, security mode, and last-tested status.

## Questions to Consider

- Should this be an SMTP form or a workspace administration hub?
- What must an owner know at a glance to trust that invitations will arrive?
- Which stored regional settings will affect real product behavior in the next release?
