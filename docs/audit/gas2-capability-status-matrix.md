# GAS 2.0 capability status matrix

> **Boundary overlay 2026-07-31:** ADR-0015 and
> [the system assurance boundary](../system-assurance-boundary.md) supersede the
> earlier ownership grouping. Capability state below still describes the current
> monolith; deterministic clinical rules and their alerts are not Guardián Core.

## Taxonomy

Capability state uses only:

- `IMPLEMENTED`
- `PARTIALLY_IMPLEMENTED`
- `NOT_IMPLEMENTED`
- `DEMO_ONLY`
- `BLOCKED_BY_INSTITUTIONAL_DECISION`
- `DEFERRED`
- `NOT_APPLICABLE`

Readiness uses only `READY`, `CONDITIONALLY_READY`, `NOT_READY` and
`NOT_ASSESSED`.

Disposition uses `REUSE`, `EXTEND_LATER`, `FREEZE` and `DO_NOT_BUILD`.

## Architecture capability matrix

| Capability | Source of truth / implementation | State | Technical proof | Institutional limit | Disposition |
| --- | --- | --- | --- | --- | --- |
| Authentication | `User`, `RoleAssignment`, `SessionMetadata`, demo identity adapter | `DEMO_ONLY` | Unit/integration/E2E negative-role/session tests | DEC-013; no productive IdP/assurance | `EXTEND_LATER` |
| Resource authorization | Role matrix plus episode/scope/current-role checks | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E | Institutional role mapping pending | `FREEZE` |
| Audit | `AuditEvent` plus DB no-update/no-delete triggers | `IMPLEMENTED` | Unit/integration and migration guards | Retention/access procedure pending | `FREEZE` |
| Episode | `DischargeEpisode`, `EpisodeTransition` | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E | DEC-001/002/005/013 | `FREEZE` |
| Episode governance | Domain policy/view over current episode facts | `PARTIALLY_IMPLEMENTED` | Fail-closed unit/integration/E2E | Closure policy pending | `FREEZE` |
| Legal records | Separate append-only participation, communication, basis and revocation records | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E | DEC-003/005 | `FREEZE` |
| Safety Plan | Version/state history with section permissions | `DEMO_ONLY` | Unit/integration/E2E | Clinical/content/lifecycle approval pending | `FREEZE` |
| Check-ins | Versioned protocols, assignments and terminal outcomes | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E | DEC-006 | `FREEZE` |
| Deterministic clinical rules | Version/approval/activation/evaluation | `DEMO_ONLY` | Unit/integration/E2E | Synthetic fixtures; intended purpose, MDR assessment and DEC-008/009 pending | `FREEZE` |
| Canonical provenance | Source/evaluation/alert lineage schema v1 | `IMPLEMENTED` | Unit/integration/E2E | Internal synthetic source kinds only | `FREEZE` |
| Alert review | `Alert`, append-only `AlertReview` | `IMPLEMENTED` | Unit/integration/E2E | Review workflow not clinically validated | `FREEZE` |
| Human authorization | Policy for reviewed-alert task creation | `PARTIALLY_IMPLEMENTED` | 17 policy tests plus app/integration/E2E | Only one action; instance decision not persisted | `FREEZE` |
| Tasks | `Task`, append-only `TaskEvent`, revision/idempotency | `IMPLEMENTED` | Unit/integration/E2E concurrency | Institutional policy pending DEC-017 | `FREEZE` |
| Task accountability | Derived projection over task/event chain | `IMPLEMENTED` | Domain/integration evidence tests | SLA/teams/acceptance not represented | `FREEZE` |
| Governance evidence | Repeatable-read, read-only bounded projection | `IMPLEMENTED` | Domain/app/integration/E2E | Not an independent evidence source/approval | `FREEZE` |
| Caregiver access | Authorization, versioned episode scope, invitation/session/revocation | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E including races | DEC-004/005/013 | `FREEZE` |
| Home Safety | Append-only informational versions | `DEMO_ONLY` | Unit/integration/E2E | DEC-007 | `FREEZE` |
| Crisis resource | Explicit disabled safe state | `DEMO_ONLY` | Unit/E2E | DEC-010/011 | `FREEZE` |
| SBAR | Deterministic unsigned minimized preview | `PARTIALLY_IMPLEMENTED` | Unit/E2E/build | DEC-005/012; no approved PDF/export/signature | `FREEZE` |
| Current pending-item visibility | Visibility/blockers across episodes, alerts and tasks | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E | Not a commitment/deadline/evidence model; clinical alerts remain coupled; DEC-006/017 | `FREEZE` |
| Core circuit assurance | Explicit commitment, responsible person, deadline, evidence and human review of missing evidence | `DEFERRED` | Repository absence | ADR-0015 approval, regulatory assessment and DEC-017 | `EXTEND_LATER` |
| Technical observability foundation | Correlation IDs, sanitized public errors and sanitized stderr | `PARTIALLY_IMPLEMENTED` | Unit/E2E | No metrics, tracing, telemetry sink or DB readiness | `EXTEND_LATER` |
| Institutional incident operations | No approved operating model or workflow | `BLOCKED_BY_INSTITUTIONAL_DECISION` | Repository absence | DEC-014/005 | `EXTEND_LATER` |
| Continuity | No continuity capability; process liveness is separate | `NOT_IMPLEMENTED` | Health E2E proves liveness only, not continuity | DEC-015 | `EXTEND_LATER` |
| External connectors | No adapters | `DEFERRED` | Repository absence | Contract/institutional requirement absent; reuse the boundary only | `REUSE` |
| FHIR | Conditional documented boundary | `DEFERRED` | Repository absence | No profile, operation, scope or endpoint; reuse only if an approved requirement exists | `REUSE` |
| Production deployment | No productive environment baseline | `NOT_IMPLEMENTED` | Repository absence | Do not build pending DEC-005/013–016 and infrastructure decisions | `DO_NOT_BUILD` |

## Real bounded contexts and owners

| Context | Domain/application owner | Persistence owner | Main aggregate/source |
| --- | --- | --- | --- |
| Identity and access | `domain/auth`, `application/auth`, `application/admin` | Security Prisma unit of work | `User`, `RoleAssignment`, `SessionMetadata` |
| Legal authorization | `domain/legal`, `application/legal` | Legal records Prisma unit of work | Policy and legal record histories |
| Episode | `domain/episode`, `application/episode` | Episode Prisma unit of work | `DischargeEpisode`, `EpisodeTransition` |
| Safety Plan | `domain/safety-plan`, `application/safety-plan` | Safety Plan Prisma unit of work | `SafetyPlan`, versions/sections/state changes |
| Check-in | `domain/check-in`, `application/check-in` | Check-in Prisma unit of work | Protocol, assignment, outcome/response |
| Explainable alerts | `domain/alerts`, `application/alerts` | Alerts Prisma unit of work | Rule definition/version/evaluation, alert/review |
| Provenance | `domain/provenance` | Resolved by alerts adapter; lineage stored with alert | Canonical provenance document |
| Workqueue | `domain/workqueue`, `application/workqueue` | Nursing workqueue Prisma unit of work | `Task`, `TaskEvent` |
| Human authorization | `domain/authorization` | Not persisted as an instance decision | Pure policy decision |
| Governance evidence | `domain/governance`, `application/governance` | Repeatable-read evidence reader | Derived read-only view |
| Caregiver | `domain/caregiver`, `application/caregiver` | Caregiver Prisma unit of work | Authorization/scope/invitation/session/access evidence |
| Home Safety | `domain/home-safety`, `application/home-safety` | Home Safety Prisma unit of work | Review version and item history |
| Crisis | `domain/crisis` | None | Disabled configuration constant |
| SBAR | `application/sbar` | Read adapter only | Derived unsigned preview |
| Audit | `domain/audit` | `AuditEvent` | Immutable technical audit event |

There is no `src/guardian2` context and no parallel episode aggregate.

## Current pending-item detail

This table describes observable baseline conditions. It must not be presented as
the Core circuit-assurance capability or as detection of non-compliance.

| Condition | Capability state | Current behavior | Required next authority |
| --- | --- | --- | --- |
| `TASK_WITHOUT_OWNER` | `PARTIALLY_IMPLEMENTED` | `UNASSIGNED` is visible; no escalation | DEC-017 |
| `TASK_OVERDUE` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | Age metric only; no SLA/deadline | DEC-017 |
| `SIGNAL_NOT_REVIEWED` | `PARTIALLY_IMPLEMENTED` | Open state and counts are visible | DEC-017 for timing |
| `REVIEW_SLA_BREACHED` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | Not evaluated | DEC-017 |
| `EPISODE_WITHOUT_OWNER` | `IMPLEMENTED` | Required responsible IDs and active-role blockers | DEC-001/013 for institutional meaning |
| `EPISODE_CLOSED_WITH_OPEN_TASK` | `PARTIALLY_IMPLEMENTED` | Open task blocker; all closure currently denied | DEC-002 |
| `PROTOCOL_VERSION_MISSING` | `IMPLEMENTED` | Fixed relation/governance blocker | DEC-006 for approved content |
| `SIGNAL_PROVENANCE_INCOMPLETE` | `IMPLEMENTED` | Invalid/legacy status explicit; new path resolves stored source | External source contract if added |
| `ESCALATION_WITHOUT_RECIPIENT` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | No escalation model | DEC-017 |
| `CONTACT_NOT_COMPLETED` | `NOT_IMPLEMENTED` | Contact outcomes are events, not a completion policy | DEC-017 |
| `FOLLOWUP_WINDOW_MISSED` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | No approved timing semantics | DEC-006/017 |

## Keep, integrate and never build

| Classification | Capabilities |
| --- | --- |
| Guardián Core | Episode governance bounded to organizational facts, human authorization, task accountability, technical evidence/audit and future circuit assurance after ADR-0015 approval |
| Clinical Rules | Rule catalog/approval/evaluation, clinical input semantics, matched notices and their clinical presentation; separate intended purpose and regulatory assessment required |
| Shared safety interface | Provenance and human-review references used across the current boundary; these do not prove deployment or regulatory independence |
| Integrate when approved | HCE/EHR, institutional identity, messaging, telephony, external clinical or telemonitoring services, RPM and wearables; no provider is selected |
| Do not build | Own EHR, generic RPM, clinical voice platform, wearable, autonomous therapeutic chatbot, opaque predictor, speculative graph DB, complete FHIR server without requirement |
