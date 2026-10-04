# Manual production evidence

Mark each applicable gate `PASS`, `FAIL`, or `UNKNOWN`. Record source and UTC
timestamp without copying secrets or customer data.

## P0 gates

- **Artifact identity:** running release SHA matches the audited and tested SHA.
- **TLS and DNS:** expected public host resolves correctly, HTTPS is valid, HTTP
  redirects to HTTPS, and an unexpected Host header is rejected.
- **Database isolation:** PostgreSQL is not publicly reachable except through the
  approved network path; application credentials are least-privileged.
- **Migrations:** migration plan was reviewed and applied once; application and
  schema versions match.
- **Backup and restore:** automated backups are enabled and a recent restore was
  completed into an isolated target with recorded duration and integrity checks.
- **Tenant isolation:** release tests exercise at least two organizations across
  every pilot-critical read and write flow.
- **Authentication:** login, refresh rotation, logout or blacklist, password reset,
  invitation expiry, and role denial paths were exercised against the release.
- **Email:** invitation, password reset, and SMTP test messages were delivered;
  SPF, DKIM, DMARC, and bounce or failure handling were observed where applicable.
- **Monitoring:** a controlled test error reached the error monitor and on-call
  recipient; logs exclude authorization headers, secrets, and SMTP credentials.
- **Health and capacity:** external health checks pass and process or database
  limits have headroom for the agreed pilot load.
- **Rollback:** a named operator has tested instructions to revert the application;
  irreversible migrations have an explicit recovery plan.
- **Customer acceptance:** a named pilot user completed the agreed critical
  journey in the production-like environment.

## Immediate NO-GO conditions

Return NO-GO for cross-tenant access, exposed secrets, debug output, invalid TLS,
unrestorable backups, unapplied or destructive unreviewed migrations, broken
authentication, missing critical email delivery, or a release artifact mismatch.
