# GAS 2.0 final risk register

## Rules

This register uses no aggregate score and assigns no invented clinical or CVSS
severity. Status values are `OPEN`, `MITIGATED_TECHNICALLY`,
`BLOCKED_BY_DECISION`, `DEFERRED`, `ACCEPTANCE_REQUIRED` and `CLOSED`.

## Consolidated risks

| ID | Category | Status | Evidence | Current impact | Readiness effect | Dependency/future action |
| --- | --- | --- | --- | --- | --- | --- |
| GAS2-R-001 | Technical/continuity | `OPEN` | `/api/health` returns process success without DB access | False-positive readiness during DB failure | Does not block local demo; blocks operational prepilot/pilot confidence | Future health/readiness branch after DEC-014/015 semantics |
| GAS2-R-002 | Security/identity | `BLOCKED_BY_DECISION` | Demo aliases and local sessions only | No productive authentication/assurance | Blocks real pilot and production | DEC-013 |
| GAS2-R-003 | Privacy | `BLOCKED_BY_DECISION` | No approved retention/archive/rights/export lifecycle | Real data cannot be governed end to end | Blocks real data, real pilot and production | DEC-005 and dependencies |
| GAS2-R-004 | Clinical safety | `BLOCKED_BY_DECISION` | Crisis resource deliberately disabled | No invented routing, but no actionable local destination | Demo can show safe blocked state; real use blocked | DEC-010/011 |
| GAS2-R-005 | Clinical safety/process | `BLOCKED_BY_DECISION` | No approved obligation/evidence/exception contract, task SLA, priority, assignment or escalation | Absence of evidence could be misread as omission or non-compliance | No circuit-assurance or “Process Safety” claim; real pilot blocked if in scope | ADR-0015 and DEC-017 |
| GAS2-R-006 | Clinical safety/process | `BLOCKED_BY_DECISION` | Check-in content/cadence/non-response policy pending | No approved follow-up-window semantics | Real check-ins blocked | DEC-006 |
| GAS2-R-007 | Episode governance | `BLOCKED_BY_DECISION` | DEC-002 always blocks closure | No unapproved close, but no usable real closure | Local demo shows blocker; real operation blocked | DEC-002 then atomic design review |
| GAS2-R-008 | Concurrency | `ACCEPTANCE_REQUIRED` | Future close policy would read multiple current obligations | Future TOCTOU if closure is enabled without a new atomic contract | No current close mutation; future branch gate | Architecture/concurrency review after DEC-002 |
| GAS2-R-009 | Evidence | `DEFERRED` | Per-instance human authorization decision is not persisted | Historical reconstruction cannot prove the exact pure-policy output | View accurately reports `UNAVAILABLE`; assess pilot evidence needs | DEC-017/014 and evidence-owner decision |
| GAS2-R-010 | Evidence | `DEFERRED` | Reviewer role at review time is not persisted | Current role cannot safely reconstruct historical role | No fabricated role; potential institutional evidence gap | Identity/audit evidence review |
| GAS2-R-011 | Operations | `BLOCKED_BY_DECISION` | Sanitized stderr only; no metrics/tracing/sink/workflow | No productive detection, response or handoff | Blocks productive operation | DEC-014/005 |
| GAS2-R-012 | Continuity | `BLOCKED_BY_DECISION` | No backup/restore/failover/offline/reconciliation plan | Outage can interrupt workflow without governed recovery | Blocks real pilot/production | DEC-015/005/013/014 |
| GAS2-R-013 | Regulatory | `ACCEPTANCE_REQUIRED` | DEC-016 records applicability as assessment required | Regulatory status is unknown | Real pilot remains NO_GO | Competent institutional assessment |
| GAS2-R-014 | Clinical safety | `ACCEPTANCE_REQUIRED` | Synthetic Home Safety/rules/SBAR are not locally validated | Automation bias or workflow mismatch remains possible | Conditional demo only | DEC-007/008/009/012 and safety review |
| GAS2-R-015 | Integration | `DEFERRED` | No external/FHIR adapter or contract | No real interoperability | Does not block local demo; blocks integration claims | Approved contract/profile first |
| GAS2-R-016 | Security | `CLOSED` | Seed errors use allowlisted envelope and 14 dedicated seed-error regression tests | Historical raw-detail disclosure removed | No open pilot effect from this path | Preserve tests |
| GAS2-R-017 | Data quality | `MITIGATED_TECHNICALLY` | Source provenance is resolved against stored records; invalid/legacy states explicit | Prevents claimed source IDs from becoming verified lineage | Supports synthetic technical demo; external source trust not covered | Preserve canonical parser and adapter contract |
| GAS2-R-018 | Authorization | `MITIGATED_TECHNICALLY` | Current role/resource/responsibility checks; admin/support clinical deny | Limits role-only bypass in audited paths | Supports synthetic technical review | Productive IAM still requires DEC-013 |
| GAS2-R-019 | Caregiver privacy | `MITIGATED_TECHNICALLY` | Episode scope, capabilities, section permission and revocation rechecked per request | Limits stale or over-broad caregiver access | Supports synthetic demo only | DEC-004/005/013 |
| GAS2-R-020 | Documentation/claims | `ACCEPTANCE_REQUIRED` | Build-week “ready” labels are demo-scoped | Qualification may be lost when quoted externally | Congress/FENIN only conditionally ready | Use claims register in all presentation material |

## Technical debt

Only confirmed implementation debt is listed here. Institutional blockers and
deferred integrations are not technical debt.

| ID | Domain | Evidence | Impact | Blocks demo | Blocks technical prepilot | Blocks real pilot | Dependency | Recommended future branch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GAS2-TD-001 | Health/readiness | Process-only health route | Cannot distinguish app liveness from DB readiness | No | Yes for operational review | Yes | DEC-014/015 semantics | `feat/gas2-health-readiness` after approval |
| GAS2-TD-002 | Evidence | Authorization instance decision not persisted | Historical evidence is explicitly unavailable | No | No | Scope-dependent | Evidence requirements/DEC-017 | `feat/gas2-authorization-evidence` only if required |
| GAS2-TD-003 | Evidence | Reviewer historical role not persisted | Cannot reconstruct role without inference | No | No | Scope-dependent | DEC-013/014 | Scoped audit-evidence branch if approved |
| GAS2-TD-004 | Demo security | Process-local login limiter | Does not coordinate multiple processes | No | No | Productive IAM replacement required | DEC-013 | Implement within institutional IAM branch, not standalone |

## Institutional blockers

| Blocker | Owner | State | Not technical debt because |
| --- | --- | --- | --- |
| Episode identity/duration/closure | Dirección Médica | Pending | Requires institutional protocol/authority |
| Legal basis/caregiver/lifecycle | Responsable del Tratamiento | Pending | Requires legal/controller decisions |
| Clinical content/rules/crisis/SBAR | Clinical authorities and TI | Pending | Requires local validation and approved configuration |
| Productive IAM | Dirección TI | Pending | Requires institutional identity/security decision |
| Incident operations | Dirección TI | Pending | Requires operating model and ownership |
| Continuity | Dirección de Enfermería | Pending | Requires approved plan, RTO/RPO and procedures |
| Real-pilot gate | Gerencia as controller | `NO_GO` | Requires institutional authorization |
| Task policy/SLA/escalation | Dirección de Enfermería | Pending | Requires operational accountability policy |

## Residual risk statement

The passing test baseline reduces uncertainty about the implemented synthetic
technical controls. It does not resolve clinical-safety, privacy, regulatory,
operational or institutional risk. Risk acceptance remains with the competent
human authorities and is not performed by this audit.
