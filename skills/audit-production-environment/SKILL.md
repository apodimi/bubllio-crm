---
name: audit-production-environment
description: Audit a Bubllio CRM deployment or production-like environment and return an evidence-based GO, NO-GO, or UNKNOWN verdict. Use before staging promotion, customer launch, or after infrastructure changes; never treat static configuration alone as proof that production is safe.
---

# Audit Production Environment

Read `AGENTS.md` and `docs/development/pilot-production-readiness.md`. This is a
read-only audit. Do not deploy, migrate, send email, rotate secrets, or modify
infrastructure unless the user separately authorizes those actions.

## Safety model

Never print environment values, connection strings, tokens, headers, credentials,
customer data, or secret lengths. Report only whether a required value is present
and whether the loaded application settings satisfy an invariant.

Run the deterministic check through the project's Python environment:

```bash
uv run python skills/audit-production-environment/scripts/check_django_environment.py
```

The script checks the configuration actually loaded by Django, not only `.env`
text. A passing automated result is necessary but not sufficient.

Then read `references/manual-evidence.md` and verify every applicable live-system
gate. Accept direct provider evidence, a recent timestamped rehearsal, or an
observed read-only check. Do not accept plans or unchecked documentation as
evidence of working backups, restore, TLS, monitoring, email, or rollback.

## Verdict

- **GO**: all automated checks pass, every P0 manual gate has current evidence,
  the release SHA is identified, and no unresolved critical or high finding exists.
- **NO-GO**: an automated blocker fails, a P0 control is known absent or broken,
  a critical or high finding exists, or the tested artifact differs from the
  release artifact.
- **UNKNOWN**: no blocker is proven, but one or more P0 gates lack access or
  evidence. UNKNOWN is never permission to launch.

Do not average results into a score. One tenant-isolation, authentication,
migration, backup or restore, TLS, or secret-exposure blocker is enough for
NO-GO.

## Report format

Return:

1. verdict and audited environment;
2. release SHA or `UNKNOWN`;
3. blockers;
4. automated checks with command evidence;
5. manual gates with `PASS`, `FAIL`, or `UNKNOWN` and evidence timestamps;
6. residual risks and the smallest next action required for GO.

State audit time and scope. A GO verdict expires when code, settings,
infrastructure, DNS or TLS, database, email, or secret configuration changes.
