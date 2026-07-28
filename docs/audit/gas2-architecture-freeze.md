# GAS 2.0 architecture freeze

## Freeze decision

`FREEZE_ACCEPTED`

`GAS2_ARCHITECTURE_FREEZE_VERSION =
GAS2_PREPILOT_ARCHITECTURE_FREEZE_v1`

| Field | Frozen value |
| --- | --- |
| Baseline | `351e3aa3915c0d903ccf67ac7581feb5fc50371a` |
| Date | 2026-07-28 |
| Runtime shape | Next.js/TypeScript modular monolith |
| Persistence | One Prisma/PostgreSQL source |
| Data use | Synthetic only |
| Real pilot | `NO_GO` |
| Production | Not ready |

Freeze acceptance means the architecture is a coherent base for controlled
incremental work. It does not mean that capabilities are complete, approved,
clinically validated or production qualified.

## Frozen architecture contract

### 1. Runtime and module shape

- Keep one modular monolith unless a demonstrated operational requirement and
  architecture review approve a different topology.
- Keep domain, application/ports, infrastructure/persistence, API and
  presentation responsibilities separated.
- Do not create `src/guardian2`, a parallel service or a second persistence
  source for the same clinical/organizational concept.
- Reuse established application services, ports, Prisma units of work, HTTP
  guards and domain policies.

### 2. Sources of truth

| Concept | Frozen source of truth | Derived views that must not become a second source |
| --- | --- | --- |
| Episode | `DischargeEpisode` and `EpisodeTransition` | Episode governance and workspace summaries |
| Identity/access | `User`, `RoleAssignment`, `SessionMetadata` | Authenticated principal |
| Legal evidence | Versioned policy and append-only legal/revocation records | Effective-authorization query |
| Safety Plan | `SafetyPlan`, versions, sections, permissions, state changes | Patient/caregiver filtered views |
| Check-in | Protocol version, assignment and terminal outcome/response | Patient/professional projections |
| Rule/alert | Rule definition/version/approval/evaluation and `Alert`/`AlertReview` | Alert lists and workqueue entries |
| Provenance | Canonical lineage resolved from stored internal sources | Governance evidence projection |
| Task | `Task` current state and append-only `TaskEvent` history | Accountability/workqueue projections |
| Caregiver | Authorization, latest episode scope, invitation/session/revocation evidence | Caregiver portal view |
| Audit | Immutable `AuditEvent` | Governance evidence references |

No `EpisodeContract`, `AuditLog`, duplicate task ledger or duplicate
authorization registry may be added alongside these sources.

### 3. Transaction and concurrency invariants

- Critical mutation and its audit event remain in the same unit of work.
- Episode operations preserve actor-scoped idempotency, request fingerprint and
  optimistic version checks.
- DEC-002 or unavailable/inconsistent governance remains fail-closed for
  closure.
- A future close mutation must atomically bind the approved policy inputs,
  episode version, open obligations and close write; current code is not
  authorization to enable closure.
- Task operations preserve actor idempotency, task revision, guarded
  `TaskEvent` insertion and guarded current-state update.
- Task lock order remains: episode, unique participant users sorted globally by
  ID, then current role/assignee authorization, then mutation.
- Caregiver access/revocation retains authorization locking, per-request
  revalidation and same-transaction session invalidation.
- Append-only/no-delete database triggers and all `RESTRICT` relationships
  remain unless an approved lifecycle policy and migration review explicitly
  change them.
- Read-only governance evidence remains one `REPEATABLE READ` snapshot with
  explicit collection limits/truncation.

### 4. Security invariants

- Authentication and authorization are server-side and deny by default.
- A role alone never grants global clinical access; resource relationship,
  current role, responsibility, scope and revocation are rechecked.
- `admin` and `support` do not inherit clinical plaintext access.
- Demo identity remains synthetic, loopback-only and impossible in production.
- Session and invitation raw tokens are never persisted; hashes are stored.
- Cookies remain `HttpOnly`, `SameSite=Strict`, scoped and secure when required.
- State-changing cookie-authenticated routes retain same-origin validation.
- Errors/logs retain only allowlisted technical code, correlation ID and
  component; no request body or clinical text.
- No secret is exposed through `NEXT_PUBLIC`/client configuration.

### 5. Clinical-safety invariants

- Human review is required before the implemented signal-derived action.
- A direct human-initiated task is a distinct path; it is not a signal-derived
  automatic action.
- Review evidence is not itself authorization; current actor/resource
  authorization is evaluated separately.
- No automatic clinical action, derivation, closure, signature, communication
  or recommendation is introduced.
- Deterministic rules abstain on missing required inputs and do not produce a
  predictive score or diagnosis.
- The traffic-light feature remains disabled by default until approved.
- Safety Plan edits create a new version and never overwrite history.
- Home Safety remains informational and cannot certify a home as safe.
- Crisis routing remains disabled until a locally approved and technically
  verified source exists.
- SBAR remains deterministic, source-visible and unsigned; missing clinical
  assessment/recommendation is not invented.

### 6. Provenance and evidence invariants

- A rule input claim does not become a verified source by assertion. It must
  resolve to a stored source of the same kind/resource/episode.
- Rule input context remains explicitly
  `DECLARED_NOT_SOURCE_VERIFIED`; verification refers to the resolved source
  relationship, not truth of the observed statement.
- Only referenced inputs are attached to evaluation lineage.
- Only a matched rule evaluation can parent an alert.
- Invalid and legacy lineage is reported explicitly and never silently upgraded.
- Governance evidence remains read-only, bounded, minimized and non-persisted.
- An unavailable historical authorization decision or reviewer role is reported
  as unavailable, not inferred.

### 7. Institutional gates

All decisions DEC-001 through DEC-017 remain pending at this baseline.
Decision Packs remain decision-support evidence. In particular:

- DEC-002 blocks real duration/closure policy;
- DEC-005 blocks approved lifecycle and real data;
- DEC-013 blocks productive identity/access;
- DEC-014 blocks productive incident operations;
- DEC-015 blocks continuity/contingency;
- DEC-016 keeps the real pilot at `NO_GO`;
- DEC-017 blocks task SLA/priority/escalation.

No implementation branch can reinterpret a prepared pack as approval.

### 8. Data restrictions

- Development, testing, performance work and demonstrations use only synthetic
  data.
- No real patient, caregiver, workforce or hospital dataset may enter the
  repository, local demo database, fixtures, screenshots, logs or tickets.
- Pseudonymization does not authorize real-data use.
- No retention, archive, deletion, rights, backup-copy or export policy is
  treated as approved while DEC-005 is pending.

## Freeze violation and review matrix

| Proposed change | Classification | Required review/gate |
| --- | --- | --- |
| Documentation correction that does not change behavior | `NORMAL_INCREMENT` | Normal PR/CI |
| Synthetic test reliability or accessibility | `NORMAL_INCREMENT` | Normal PR/CI plus safety-boundary regression |
| New source of truth or parallel aggregate | `ARCHITECTURE_REVIEW_REQUIRED` | Principal architecture/data review |
| Change to lock order, isolation or idempotency | `ARCHITECTURE_REVIEW_REQUIRED` | Concurrency design and integration tests |
| New persistence engine/model or event store | `ARCHITECTURE_REVIEW_REQUIRED` | Architecture/data/lifecycle review |
| Enable episode closure | `INSTITUTIONAL_DECISION_REQUIRED` | DEC-002 approval plus architecture/concurrency review |
| New clinical rule set/default/threshold | `INSTITUTIONAL_DECISION_REQUIRED` | Applicable clinical DEC and validation |
| New SLA, overdue or escalation | `INSTITUTIONAL_DECISION_REQUIRED` | DEC-017 approval |
| Institutional identity adapter | `INSTITUTIONAL_DECISION_REQUIRED` | DEC-013 plus security/architecture review |
| External connector or FHIR adapter | `ARCHITECTURE_REVIEW_REQUIRED` | Approved contract/profile, security/privacy/interoperability review |
| Offline clinical storage/reconciliation | `ARCHITECTURE_REVIEW_REQUIRED` | DEC-005/015 plus threat model and safety review |
| New export or retention mechanism | `INSTITUTIONAL_DECISION_REQUIRED` | DEC-005 and purpose-specific DEC |
| Real-pilot environment/data | `INSTITUTIONAL_DECISION_REQUIRED` | DEC-016 GO and all scoped blockers |
| Production deployment | `INSTITUTIONAL_DECISION_REQUIRED` | Separate production assessment and approvals |
| Clinical AI/ML, scoring or autonomous action | `REGULATORY_REASSESSMENT_REQUIRED` | Product-scope, clinical-safety, privacy, regulatory and architecture reassessment |

## Unfreeze rule

The contract may evolve only through an explicit document that:

1. identifies the frozen clause;
2. cites the institutional decision/evidence and authority where applicable;
3. explains source-of-truth and transaction impact;
4. evaluates security, privacy, clinical-safety and interoperability impact;
5. includes migration/backward-compatibility and rollback reasoning;
6. adds focused unit, integration and E2E evidence;
7. updates ADR, traceability and this freeze version;
8. passes PR/CI before dependent work starts.
