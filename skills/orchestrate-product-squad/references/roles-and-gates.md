# Product Squad Roles and Gates

Use the smallest set of roles that covers the mission. These are decision and
ownership boundaries, not fictional permanent identities.

## Principal architect

The primary agent is the architect and orchestrator.

Responsibilities:

- define scope, system boundaries, invariants, and acceptance criteria;
- record the starting commit, pre-existing worktree changes, and reviewed diff;
- decide which specialist work can run independently;
- protect tenant isolation and existing public contracts;
- assign exclusive file ownership for concurrent work;
- reconcile research, design, engineering, and QA findings;
- stop work when a missing user choice would materially change the product;
- issue the final evidence-based verdict.

The architect must inspect the relevant raw evidence and diffs. Specialist
summaries inform decisions but do not replace architectural review.

## Business analyst

Use for product discovery, competitive analysis, prioritization, or workflow
research. This role is read-only unless the user specifically requests a saved
artifact.

Research rules:

- search broadly enough to compare credible alternatives, but never claim to
  have searched the entire internet;
- prefer current first-party product documentation, pricing, security, and API
  pages; use reputable independent evidence for user sentiment and market context;
- cite direct sources close to each claim and record the access date;
- separate verified facts, source-backed interpretation, and recommendation;
- compare workflows and outcomes, not only feature names;
- identify plan, region, edition, or date limitations;
- do not copy proprietary text or produce an uncited feature matrix.

Expected deliverable:

1. research question and evaluation criteria;
2. evidence table with sources and freshness;
3. competitor or workflow comparison;
4. implications for Bubllio, including what not to build;
5. open questions and confidence level.

## Product and UI/UX designer

Use for new or materially changed user journeys, information architecture, visual
systems, interaction patterns, or responsive behavior.

Responsibilities:

- inspect the current UI, design tokens, shared primitives, and relevant flows;
- define user journey, hierarchy, states, and interaction behavior before visual
  polish;
- cover loading, empty, error, validation, pending, success, permission-denied,
  and destructive-action states;
- specify keyboard behavior, focus management, accessible names, contrast, touch
  targets, reduced motion, and responsive layout;
- reuse the established design system unless a deliberate change is approved;
- distinguish product requirements from aesthetic preference.

Expected deliverable:

1. current-state problems and evidence;
2. proposed flow and information hierarchy;
3. component and state inventory;
4. responsive and accessibility requirements;
5. visual direction or implementation-ready annotations;
6. measurable design acceptance criteria.

When research and UX audit run concurrently, the initial design output is
diagnostic. Create or revise the target flow only after the architect has
synthesized the research evidence.

The designer may implement frontend changes only when explicitly assigned file
ownership. Otherwise the engineer implements the approved direction.

## Senior full-stack engineer

Use after the architect has established the contract and dependencies.

Responsibilities:

- read the affected architecture documents and matching repository skills;
- preserve the view/serializer/service/model separation and the frontend
  page/component -> hook -> service -> shared API path;
- derive organization ownership server-side and include organization identity in
  tenant URLs and client cache keys;
- keep ORM behavior portable across SQLite and PostgreSQL;
- create new migrations for model changes and never rewrite applied migrations;
- validate inputs at trust boundaries and avoid exposing secrets or customer data;
- add focused regression tests, including allowed and denied cross-tenant paths;
- report assumptions and contract changes immediately to the architect.

Expected deliverable:

1. concise implementation summary;
2. changed contracts and migrations;
3. tests added and commands executed;
4. residual risks or follow-up work.

## QA and security engineer

Use only after there is a stable artifact, implementation, or release candidate to
inspect. Keep the first pass independent and read-only.

Test from public seams where practical. Cover:

- acceptance criteria and important regression paths;
- authentication, authorization, IDOR attempts, and two-organization isolation;
- foreign related-object IDs and client-supplied ownership;
- validation boundaries, malformed data, concurrency, and repeat submissions;
- migration reversibility and PostgreSQL-sensitive behavior when applicable;
- frontend loading, empty, error, stale-cache, workspace-switching, keyboard,
  focus, responsive, and critical browser flows;
- secret leakage, unsafe logs, generated artifacts, and undocumented behavior.

Expected deliverable:

1. findings ordered by severity with file or endpoint locations;
2. reproducible steps and expected versus actual behavior;
3. commands and environments used;
4. coverage gaps and untested assumptions;
5. `PASS`, `FAIL`, or `UNKNOWN` for each acceptance criterion;
6. recommended `GO`, `NO-GO`, or `UNKNOWN` verdict.

QA recommends a verdict; only the architect issues the final verdict.

After an approved fix, QA must review the updated artifact and rerun affected
checks. Earlier results are stale and cannot support the final verdict.

## Phase gates

### Discovery gate

Pass when the problem, target users, evidence freshness, constraints, and success
criteria are explicit. Otherwise continue discovery or ask for the one user choice
that materially changes direction.

The mission must inventory domain invariants and data transitions relevant to the
feature: ownership and permissions, lifecycle states, ordering, deletion or
archival, related records, concurrency, reporting effects, and treatment of
existing tenant data. Mark irrelevant categories `N/A` with a reason.

### Design and architecture gate

Pass when the user flow, API/data contracts, tenant boundary, failure states,
migration implications, and file ownership are coherent. Do not implement through
an unresolved security or data-ownership question.

### Implementation gate

Pass when the diff matches the accepted scope, tests cover new behavior, docs do
not contradict the implementation, and no agent-owned temporary artifact is in
the worktree.

### Verification gate

Pass only when applicable mandatory checks succeed and critical acceptance
criteria have direct evidence. A skipped security, tenant-isolation, migration, or
critical-flow check yields `UNKNOWN` or `NO-GO`, never `GO`.

Track gates in a matrix with: gate, trigger, owner, command or environment,
evidence, blocking status, result, and any `N/A` reason. `verify-fullstack-feature`
and `audit-tenant-boundaries` are mandatory for a cross-stack tenant-scoped change.
Use `review-django-migration` for schema or data migration changes. Include
PostgreSQL, browser, and accessibility checks when their documented triggers
apply; omission requires an explicit reason and residual-risk statement.

### Release-readiness gate

Use this gate when the user asks whether a change can be released. It is distinct
from authorization to deploy.

Require evidence for:

- backward and forward compatibility across API, workers, and frontend versions;
- rollout order and behavior during a partially deployed state;
- migration, backfill, lock, runtime, and existing-data safety;
- tested rollback or a documented forward-recovery strategy;
- feature flags or staged exposure when blast radius warrants them;
- logs, metrics, alerts, and a concrete post-release validation check;
- the exact release artifact and environment being evaluated.

If a real environment is in scope, apply `audit-production-environment`. Missing
critical operational evidence produces `UNKNOWN`; a known broken control or unsafe
transition produces `NO-GO`.

### Handoff gate

State delivered behavior, evidence, known limitations, and the exact next action.
Confirm the final status and scoped diff contain no accidental or agent-only files.
Never hide a failed check behind an overall summary.
