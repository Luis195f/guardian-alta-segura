# REQ-01..REQ-14 — final technical/demo matrix

“Implemented” below always means a synthetic technical demo, never clinical, legal, regulatory or institutional validation.

| REQ | Documentary state | Real implementation found/final | Related tests | Interface | Demo fitness | Technical pending | Exclusively local/institutional pending |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Alta | Local protocol pending | Pseudonymous patient; versioned episode state/timeline; responsible professionals | Unit/integration/e2e | Professional | Ready for synthetic demo | Closure policy completeness | Identity/discharge protocol, retention, role mapping |
| 02 Legal basis | Legal review pending | Granular records/policies, fail-closed authorization, append-only revocation | Unit/integration/e2e | Patient/clinician | Partial demo | Additional delegated-recording workflow | Legal texts, basis, evidence, retention |
| 03 Safety Plan | Defined for development | Six steps, N+1 versions, state events, patient/caregiver filtering | Unit/integration/e2e | Professional/patient/caregiver | Ready | Institutional export | Content/review/visibility validation |
| 04 Check-ins | Local protocol pending | Versioned questions/schedule, assignments, terminal outcomes, patient response | Unit/integration/e2e | Admin/professional/patient | Ready | Scheduler/real communication intentionally absent | Questions, cadence, windows, no-response process |
| 05 Caregiver | Defined for development | Profile, one-use invitation, per-episode scope, portal, observation, immediate revocation | Unit/integration/e2e | Patient/caregiver | Ready with setup | Home Safety scope not expanded automatically | Representation, allowed scopes, authentication |
| 06 Revocation | Legal review pending | Append-only event; serialized access; session invalidation; history preserved | Unit/integration/e2e | Patient/caregiver | Ready | Broader rights workflow | Retention/archive/legal effects |
| 07 Home Safety | Clinical validation pending | Structured fixed template, versioned items/states/provenance, acknowledgement, human-review marker, append-only DB | Unit/integration/e2e | Responsible professional | Ready | Explicit caregiver scope if approved | Template and operational review validation |
| 08 Notices | Clinical validation pending | Closed deterministic DSL, abstention, version/approval/activation, explanation/origin, human review | Unit/integration/e2e | Admin/clinician/professional | Ready using synthetic fixture | Production input adapters intentionally absent | Rule catalog, thresholds, owners; traffic-light decision |
| 09 Tasks | Defined for development | Professional queue; manual linked task; assignment/contact/note/resolution events | Unit/integration/e2e | Professional | Ready | Priority/SLA configuration after decision | Taxonomy, SLA, operational rules |
| 10 Crisis | Local protocol pending | Visible disabled safe state; no phone/URI; test prevents silent number | Unit/e2e | All viewers | Ready as blocked-state demo | Future versioned config surface | Destination approval and TI verification |
| 11 SBAR | Defined for development | Deterministic minimized preview, provenance IDs, actor/time/profile version, print HTML, unsigned | Unit/e2e | Responsible professional | Ready | Approved PDF/export destination | Permitted fields and export profile |
| 12 Auth/RBAC | Technical verification pending | Demo provider abstraction, loopback, HttpOnly sessions, server RBAC/negative tests | Unit/integration/e2e | All synthetic roles | Ready locally | Production provider | Institutional IdP, MFA, roles, emergency access |
| 13 Incidents | Defined for development | Correlation IDs, sanitized errors/logs, no bodies/clinical content; no incident module | Unit/e2e security | Technical errors/support metadata | Partial | Incident module/ticket integration | Taxonomy, segregation, escalation process |
| 14 Downtime | Local protocol pending | Not implemented; normal episode history remains durable; no alternate census | None specific | None | Not demoed | Optional feature stays off | Continuity plan, activation, RTO/RPO, retention |

The canonical requirement titles, owners and decision states remain in `docs/requirements-traceability.md`; this matrix is a release snapshot, not a replacement.
