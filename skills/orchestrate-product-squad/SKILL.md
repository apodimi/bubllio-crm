---
name: orchestrate-product-squad
description: Coordinate a Bubllio CRM product initiative across architecture, market research, UX/UI, full-stack implementation, and independent QA/security review. Use for substantial features, redesigns, product discovery, or release work that benefits from specialist agents; not for a small isolated edit or a single-purpose review.
---

# Orchestrate the Product Squad

Act as the principal architect and retain responsibility for scope, architectural
decisions, task ownership, integration, and the final verdict. Delegate bounded,
independent work to specialist agents when available; do not delegate the
architect role itself.

Read [references/roles-and-gates.md](references/roles-and-gates.md) before
delegating. Load only the project skills and architecture documents relevant to
the requested work.

## Establish the mission

Translate the request into a short mission brief containing:

- the user or business outcome;
- in-scope and explicitly out-of-scope behavior;
- domain invariants and existing-data transitions that must remain correct;
- known constraints and unresolved decisions;
- acceptance criteria and required evidence;
- whether the current request authorizes research, planning, implementation, or
  release-affecting actions.

Do not let the squad expand that authority. Research does not authorize code
changes, a review does not authorize fixes, and implementation does not authorize
deployment or external communication.

Before any edits, record the starting commit and `git status --short`. Identify
pre-existing changed paths, preserve them as user-owned work, and define the exact
diff or path set the squad will review. Recheck status and the scoped diff at every
implementation handoff and before the final verdict.

## Delegate deliberately

Use these specialist roles when their work is material to the mission:

- business analyst for current, cited market and user-workflow evidence;
- product designer for information architecture, interaction design, visual
  direction, responsive behavior, and accessibility;
- senior full-stack engineer for implementation and focused tests;
- QA and security engineer for independent adversarial verification.

Run genuinely independent discovery tasks in parallel. Market research may run
alongside a current-state UX audit, but the target design must be created or
revised after the architect synthesizes their evidence. Keep dependent work in
sequence: synthesize research and design constraints before implementation, and
verify the resulting diff rather than an earlier plan. With limited agent slots,
finish or release discovery agents before starting QA.

Give every specialist a bounded question, relevant source files, explicit
non-goals, an expected deliverable, and ownership boundaries. No two agents may
edit the same files concurrently. Prefer read-only specialist reviews; assign
implementation ownership to one engineer and route requested fixes through the
architect.

## Synthesize before building

Reconcile specialist output into one coherent decision. Resolve contradictions
explicitly using, in order:

1. user intent and accepted scope;
2. tenant isolation, authorization, data integrity, and operational safety;
3. repository architecture and documented API contracts;
4. user value and usability;
5. delivery cost and implementation preference.

Record a lightweight decision summary in the working conversation. Create an ADR,
product document, research report, or design artifact only when the user requests
it or the repository already requires it for this kind of change. Never add
agent-only reports or local workflow artifacts to the repository.

## Build and verify

Before implementation, assign file ownership and identify the matching repository
skills. The full-stack engineer must preserve organization scoping end to end and
add regression coverage for changed behavior.

After implementation, give QA the mission brief, acceptance criteria, and actual
diff, but not a suggested verdict. Require failures first, reproducible evidence,
and explicit coverage of authorization, tenant isolation, invalid input, state
transitions, responsive UI, accessibility, and relevant database behavior.

Maintain a verification matrix containing each required gate, its trigger, owner,
command or environment, evidence, blocking status, and result. Every skipped or
`N/A` gate needs a reason. Triage QA findings through the architect, have the
original implementation owner apply approved fixes, then require QA to inspect the
updated diff and rerun every affected check. Only post-fix evidence may support the
final verdict.

Use `verify-fullstack-feature` for a completed cross-stack feature and add
`audit-tenant-boundaries` or `review-django-migration` whenever their triggers
apply. A failed or skipped mandatory gate prevents a release-ready claim.

For release-readiness work, separately evaluate API/frontend compatibility,
deployment ordering, migration and backfill safety, rollback or forward-recovery,
feature flags when warranted, observability, and post-release validation. Use
`audit-production-environment` when a real deployment environment is in scope.
Release readiness never authorizes deployment.

## Report the result

Lead with the outcome. Summarize:

- what the squad decided and delivered;
- the most important evidence and verification commands;
- unresolved risks, disagreements, or skipped checks;
- the smallest next decision or action, if anything remains.

Do not present independent specialist opinions as consensus until the architect
has reconciled them. Do not claim GO when required evidence is missing.
