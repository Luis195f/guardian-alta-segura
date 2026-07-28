# GAS 2.0 future branch policy

## Purpose

This policy preserves
`GAS2_PREPILOT_ARCHITECTURE_FREEZE_v1` while allowing legitimate incremental
evolution. It is not a permanent ban on institutionally approved work.

## Mandatory entry gate

Before opening an implementation branch:

1. identify the one capability and its source-of-truth owner;
2. identify every applicable DEC and canonical REQ;
3. distinguish technical implementation from institutional/clinical/legal
   approval;
4. confirm that any required approval has a version, scope, authority, evidence
   reference and effective/review date;
5. start from a clean, current `main`;
6. record whether the change is a normal increment, architecture review,
   institutional decision or regulatory reassessment;
7. stop if the required authority/evidence is absent.

Prepared Decision Packs do not satisfy the approval gate.

## Branch contract

- One capability per branch.
- Reuse existing aggregates, services, ports, adapters, schemas, flags and test
  seams.
- Do not create parallel sources of truth.
- Preserve optimistic versions, idempotency, lock order, isolation and
  append-only history.
- Preserve human review and separate current authorization before any
  signal-derived action.
- Preserve audit and canonical provenance.
- Do not encode clinical, legal, SLA, retention or identity defaults while
  their decisions remain pending.
- Use synthetic data unless DEC-016 and all scoped gates formally authorize a
  real-pilot environment.
- Add focused unit tests for policy/rules, integration tests for persistence and
  concurrency, and E2E tests for authorization/error/empty states.
- Update ADR, traceability, configuration examples and operator documentation
  in the same branch when the contract changes.
- Complete PR and CI before starting a dependent branch.

## Required impact review

Every PR must state:

| Area | Required question |
| --- | --- |
| Source of truth | Does this add or duplicate an aggregate/table/registry? |
| Transaction | Which mutation and audit/provenance writes must be atomic? |
| Concurrency | Does lock order, revision, isolation or idempotency change? |
| Authorization | Are role, relationship, scope, revocation and purpose rechecked? |
| Clinical safety | Could the change infer, recommend, automate, close, sign or route? |
| Privacy | Does it create a copy, export, cache, retention or deletion path? |
| Security | Does it add credentials, tokens, external trust or client-visible secrets? |
| Interoperability | Is there an approved external contract/profile and error model? |
| Operations | Does it require health, telemetry, incident or continuity behavior? |
| Evidence | Can the claim be proved from code/tests without overstating validation? |

## Change-specific gates

### Episode closure

Requires DEC-002 approval for an explicit scope, an atomic close design,
concurrency tests against open obligations and stale policy/version data, an
ADR and updated traceability. Do not merely remove the current blocker.

### Task SLA, priority or escalation

Requires DEC-017 approval. Values must be versioned, explainable and
institutionally owned; they must not be presented as a clinical score.

### Institutional identity

Requires DEC-013 approval and security review covering subject linking,
assurance, sessions, revocation, role mapping, resource authorization,
privileged/emergency access, failure and audit. Do not simulate SSO/MFA.

### Data lifecycle/export

Requires DEC-005 plus the purpose-specific decision. Identify every data class,
copy, retention trigger, rights/hold/backup interaction and evidence owner.
Never implement deletion by bypassing historical database guards.

### Incident/observability

Requires DEC-014 for semantics, ownership and sinks; DEC-005 for evidence
lifecycle; DEC-015 for continuity interaction. Do not put clinical payloads or
direct identifiers in logs, metrics, traces or tickets.

### Continuity/offline

Requires DEC-015 and its DEC-005/013/014 dependencies. Threat-model local data,
stale state, reconciliation, replay, duplicate prevention, provenance, audit,
expiry and user-visible degraded mode. No shadow clinical workflow.

### External connector/FHIR

Requires a named system owner, approved contract/profile/version, operations
and scopes. Implement an anti-corruption adapter and contract tests; do not
build a full FHIR server or speculative vendor connector.

### Real pilot/production

Requires a formal DEC-016 decision and all blockers for the approved scope.
Production additionally requires a separate readiness assessment; a pilot GO
is not production authorization.

### AI/ML, scoring or autonomous action

These change the product boundary and require explicit product, clinical-safety,
privacy, architecture and regulatory reassessment before implementation. The
MVP freeze does not authorize them.

## Work allowed while gates remain pending

- documentation and institutional workshop preparation;
- synthetic demo hardening that does not change clinical behavior;
- accessibility and non-clinical UI polish;
- deterministic test reliability;
- developer tooling and API documentation;
- synthetic performance/concurrency testing;
- static security analysis;
- presentation material using the claims register.

## Work held until approval

- real episode closure/default duration;
- productive identity/sessions/emergency access;
- real-data lifecycle, exports and rights workflows;
- SLA/overdue/escalation;
- productive incident operations/observability;
- continuity, offline clinical storage and reconciliation;
- official crisis resource;
- productive SBAR export/signature;
- external/FHIR connectors;
- real-pilot or production deployment.

## Pull request completion evidence

Before merge, the PR must show:

- exact changed files and why;
- decisions/assumptions and unresolved institutional items;
- format, lint, typecheck, unit, integration, E2E, build, traceability and
  migration results as applicable;
- test counts and any retry/flakiness;
- security/privacy/clinical-safety/concurrency impact;
- residual risks;
- no real data or secrets;
- no unrelated changes;
- next branch only when it is genuinely independent.

