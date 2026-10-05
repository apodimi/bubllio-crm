# Pilot Production Readiness

Target: a controlled first-customer pilot by **11 October 2026**. This is not a
claim of unrestricted public-production maturity. The pilot is a go only when
every P0 gate below has evidence and an owner.

## Current blockers

- Production security and SMTP settings are environment-driven, but no target
  deployment has supplied and verified its real values yet.
- Gunicorn, Nginx, PostgreSQL Compose, static delivery, and health checks are
  defined and smoke-tested locally; the target host and TLS proxy remain
  unselected.
- Backup, restore, monitoring, alerting, and incident procedures are undefined.
- CI runs the backend suite on PostgreSQL and Django deployment checks, but a
  manual tenant-isolation review and release-environment audit still need
  retained evidence.
- A customer acceptance flow and rollback decision have not been recorded.

## P0 go-live gates

- [ ] Run the `audit-production-environment` skill against the release
      environment and retain its GO/NO-GO/UNKNOWN evidence report.
- [ ] Select the hosting platform, region, public domain, and TLS termination.
- [ ] Add environment-driven production settings and pass
      `manage.py check --deploy` with production-like values.
- [ ] Run Django behind a production WSGI or ASGI server; never `runserver`.
- [ ] Provision managed PostgreSQL with encrypted connections and restricted
      network access.
- [ ] Configure `ALLOWED_HOSTS`, trusted origins, HTTPS redirect/proxy handling,
      secure cookies, HSTS rollout, static files, and secret injection.
- [ ] Configure deliverable email and verify invitation, password-reset, SMTP
      test, and failure paths using the customer domain.
- [ ] Enable error monitoring and structured application logs without secrets,
      SMTP credentials, authorization headers, or setup tokens.
- [ ] Automate database backups and complete one timed restore rehearsal.
- [ ] Run all backend, frontend, build, and Playwright gates on the release SHA.
- [ ] Run tenant-boundary tests with two organizations for every pilot-critical
      CRM, membership, invitation, provisioning, and automation flow.
- [ ] Complete customer acceptance and record rollback criteria and operator.

## Pilot scope

Installation administrators can review the same application-level security
configuration from Account settings. The dashboard checks debug mode, host and
HTTPS settings, secure cookies, HSTS, and secret/encryption-key configuration
without returning secret values. Hosting-level TLS, firewall, backup, and
monitoring controls still require external evidence.

Supported for the first customer:

- installation setup and administrator access;
- workspace creation, membership, roles, and invitations;
- companies and contacts;
- current documented automation behavior only;
- organization SMTP setup and test delivery;
- account and privacy settings already represented in the product.

Explicitly out of scope unless separately accepted: visual workflow building,
durable queues, retries, schedules, waits, branching, loops, and claims that
organization SMTP already powers automation delivery.

## Delivery sequence

### 4-5 October: freeze and infrastructure decision

Freeze pilot scope, select hosting/domain/email/monitoring, capture customer
acceptance scenarios, and create a release branch or tagged release candidate.

### 5-7 October: production foundation

Implement production settings, server/container or platform command, static
delivery, health checks, secrets, PostgreSQL, migrations, email, logging, and
monitoring. Add deployment checks to CI.

### 7-9 October: security and recovery

Audit tenant boundaries and authentication flows, close P0 findings, configure
backups, rehearse restore and rollback, and test from a clean environment.

### 9-10 October: acceptance

Run the complete customer journey in staging with production-like configuration.
Verify email deliverability, permissions, mobile usability of critical flows,
error reporting, and operator access.

### 11 October: controlled launch

Deploy the immutable release candidate, apply migrations once, run smoke tests,
create or invite the customer through the supported flow, and monitor closely.
Stop and roll back on data-isolation, authentication, migration, or email-secret
exposure failures.

## Required decisions

Before implementation can be deployment-specific, record:

1. hosting platform and region;
2. domain and DNS owner;
3. transactional email provider and sender domain;
4. monitoring provider and alert recipient;
5. backup retention and acceptable recovery time/data loss;
6. customer pilot users and the exact acceptance journey.

## Evidence bundle

Keep the release SHA, CI URLs, production `check --deploy` output, migration plan,
backup/restore timestamps, smoke-test results, acceptance sign-off, known risks,
and rollback instructions together. Never include secrets or customer data.
