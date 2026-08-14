# GAS 2.0 claims register

> ADR-0015 and
> [the system assurance boundary](../system-assurance-boundary.md) govern all
> Core/Clinical Rules claims from 2026-07-31. A disclaimer cannot override a
> medical intended purpose expressed through real behavior, sales material or
> use instructions.

## Use rule

Claims must retain their scope and qualifier when reused. Technical tests,
human-in-the-loop design and fail-closed behavior do not prove clinical safety,
effectiveness, legal compliance or regulatory exemption.

The only permitted classifications are:

- `IMPLEMENTED_AND_TESTED`: implemented technical behavior with an executable
  test reference at the stated SHA;
- `DOCUMENTED_ONLY`: design or intended-purpose wording without runtime proof;
- `PENDING_DECISION`: a competent human or institutional decision is still
  required;
- `NOT_EVIDENCED`: the claim lacks sufficient evidence and must not be used;
- `NOT_APPLICABLE`: the claim is outside the stated scope with an explicit
  justification.

The SHA identifies the repository baseline inspected for the row. It is not a
release signature, timestamp, regulatory proof or acceptance of residual risk.

## Supported and restricted claims

| ID | Claim | Typical location | Current evidence | Classification | REQ | DEC | Control / hazard | Test evidence | Evidence SHA | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CLAIM-GAS2-001 | “Technical pre-pilot MVP using synthetic data only” | README/product copy | Loopback/demo gates, synthetic seed and local validation | `IMPLEMENTED_AND_TESTED` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `tests/e2e/demo-smoke.p15.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | May use only with synthetic/local/pre-pilot qualifier |
| CLAIM-GAS2-002 | “Local synthetic demo is reproducible” | Demo material | P15 manifest, prepare/verify/reset/smoke tooling | `IMPLEMENTED_AND_TESTED` | REQ-01, REQ-12, REQ-13 | DEC-016 | CTRL-011-A / HAZ-GAS-011 | `scripts/demo.test.mjs` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Qualify by environment, date and synthetic scope |
| CLAIM-GAS2-003 | “Not for clinical use” | README/UI | Demo-only runtime and fail-closed production configuration | `IMPLEMENTED_AND_TESTED` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `src/infrastructure/config/env.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Must retain |
| CLAIM-GAS2-004 | “Deterministic, versioned, explainable notices” | README/UI/demo | Rule DSL, version/approval/evaluation and explanations | `IMPLEMENTED_AND_TESTED` | REQ-08 | DEC-008, DEC-009 | CTRL-006-A / HAZ-GAS-006 | `src/domain/alerts/explainable-rule.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Synthetic and not clinically validated |
| CLAIM-GAS2-005 | “Human review is required before the implemented signal-derived action” | Workflow/UI | Explicit review plus separate human task request | `IMPLEMENTED_AND_TESTED` | REQ-08, REQ-09 | DEC-008, DEC-017 | CTRL-012-A / HAZ-GAS-012 | `src/application/workqueue/manage-nursing-tasks.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Direct human tasks remain a distinct path |
| CLAIM-GAS2-006 | “No autonomous clinical action was found in the audited baseline” | Audit/presentation | Routes and services keep review and mutation separate | `IMPLEMENTED_AND_TESTED` | REQ-08, REQ-09 | DEC-008, DEC-017 | CTRL-019-A / HAZ-GAS-019 | `src/domain/continuity/operational-continuity-boundary.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Retain exact baseline qualifier |
| CLAIM-GAS2-007 | “No clinical AI/ML is implemented” | README/audit | Dependency and code inventory; deterministic rules only | `IMPLEMENTED_AND_TESTED` | REQ-08 | DEC-008, DEC-016 | CTRL-006-A / HAZ-GAS-006 | `src/domain/commitment/commitment-boundary.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Current inspected baseline only |
| CLAIM-GAS2-008 | “Versioned Safety Plan preserves history” | Demo | Version tables, state events and append-only triggers | `IMPLEMENTED_AND_TESTED` | REQ-03 | DEC-005 | CTRL-005-A / HAZ-GAS-005 | `src/infrastructure/persistence/safety-plan.integration.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not call clinically validated |
| CLAIM-GAS2-009 | “Caregiver revocation cuts current access without deleting history” | Demo | Transactional revocation, per-request recheck and preserved records | `IMPLEMENTED_AND_TESTED` | REQ-05, REQ-06 | DEC-004, DEC-005, DEC-013 | CTRL-004-A / HAZ-GAS-004 | `src/infrastructure/persistence/caregiver-access.integration.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Synthetic technical behavior only |
| CLAIM-GAS2-010 | “Governance evidence is read-only and derived” | Architecture/audit | Repeatable-read reader and minimized projection | `IMPLEMENTED_AND_TESTED` | REQ-09, REQ-12 | DEC-013, DEC-017 | CTRL-003-A / HAZ-GAS-003 | `src/infrastructure/persistence/governance-evidence.integration.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Not an independent approval or evidence authority |
| CLAIM-GAS2-011 | “The operational continuity panel is a bounded, read-only administrative projection” | Architecture/demo UI | Bounded cursor projection with deny-by-default access | `IMPLEMENTED_AND_TESTED` | REQ-09, REQ-12, REQ-14 | DEC-013, DEC-015, DEC-017 | CTRL-012-A / HAZ-GAS-012 | `src/infrastructure/persistence/operational-continuity.integration.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Not a risk, freshness or clinical-priority dashboard |
| CLAIM-GAS2-012 | “Technical task accountability is implemented” | Architecture/audit | Task/Event/revision/locks and projection | `IMPLEMENTED_AND_TESTED` | REQ-09 | DEC-017 | CTRL-002-A / HAZ-GAS-002 | `src/domain/workqueue/task-accountability.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Institutional accountability and SLA remain pending |
| CLAIM-GAS2-013 | “The MVP demonstrates parts of the post-discharge circuit” | Architecture/demo | Episode, responsible users, review, task and evidence projections | `IMPLEMENTED_AND_TESTED` | REQ-01, REQ-08, REQ-09 | DEC-002, DEC-008, DEC-017 | CTRL-003-A / HAZ-GAS-003 | `tests/e2e/discharge-episode.spec.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Commitment deadline and typed evidence remain incomplete |
| CLAIM-GAS2-014 | “Guardián verifies the care circuit: every explicit discharge commitment becomes an obligation with owner, deadline and evidence” | Intended purpose/positioning | Boundary and commitment specification only | `DOCUMENTED_ONLY` | REQ-01, REQ-09 | DEC-002, DEC-017 | CTRL-020-A / HAZ-GAS-020 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Proposed intended purpose only; state the implementation gap |
| CLAIM-GAS2-015 | “Absence of evidence is detected and escalated for human review” | Intended purpose/positioning | Operational definition only; evaluator and escalation absent | `DOCUMENTED_ONLY` | REQ-09, REQ-13 | DEC-014, DEC-017 | CTRL-013-A / HAZ-GAS-013 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Never shorten to detection of non-compliance |
| CLAIM-GAS2-016 | “Clinical Rules is deterministic and explainable” | Demo/architecture | DSL, versioning, evaluation and explanation | `IMPLEMENTED_AND_TESTED` | REQ-08 | DEC-008, DEC-009 | CTRL-006-A / HAZ-GAS-006 | `src/application/alerts/manage-explainable-alerts.test.ts` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Does not imply clinical validity or regulatory class |
| CLAIM-GAS2-017 | “Guardián Core is not a medical device” | Regulatory/commercial | No formal qualification; modules remain logically coupled | `PENDING_DECISION` | REQ-08, REQ-09 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use pending competent assessment |
| CLAIM-GAS2-018 | “Clinical Rules is or is not a medical device” | Regulatory/commercial | Intended purpose and decision impact not approved | `PENDING_DECISION` | REQ-08 | DEC-008, DEC-016 | CTRL-006-A / HAZ-GAS-006 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not assert either conclusion or an MDR class |
| CLAIM-GAS2-019 | “Clinical Safety & Accountability Control Plane” | Positioning | Qualified architecture direction; productive controls partial | `DOCUMENTED_ONLY` | REQ-08, REQ-09, REQ-13, REQ-14 | DEC-014, DEC-015, DEC-016, DEC-017 | CTRL-008-A / HAZ-GAS-008 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Architecture direction only |
| CLAIM-GAS2-020 | “Clinically safe” | External/marketing | No approved safety case or local validation | `NOT_EVIDENCED` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-021 | “Clinically validated” | External/marketing | No clinical validation | `NOT_EVIDENCED` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-022 | “Effective” or “improves outcomes” | External/marketing | No outcomes study | `NOT_EVIDENCED` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-023 | “Reduces readmissions” | External/marketing | No comparative outcome evidence | `NOT_EVIDENCED` | REQ-01 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-024 | “Prevents suicide, relapse or mortality” | External/marketing | No evidence and outside implemented behavior | `NOT_EVIDENCED` | REQ-01, REQ-03, REQ-10 | DEC-010, DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-025 | “Predicts deterioration reliably” | External/marketing | No predictor or ML | `NOT_EVIDENCED` | REQ-08 | DEC-008, DEC-016 | CTRL-006-A / HAZ-GAS-006 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-026 | “AI clinically validated” | External/marketing | No clinical AI/ML and no validation | `NOT_EVIDENCED` | REQ-08 | DEC-008, DEC-016 | CTRL-006-A / HAZ-GAS-006 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-027 | “GDPR compliant” | External/legal | Legal bases and lifecycle decisions remain pending | `PENDING_DECISION` | REQ-02, REQ-05, REQ-06, REQ-11, REQ-13 | DEC-003, DEC-004, DEC-005, DEC-012, DEC-014, DEC-016 | CTRL-004-A / HAZ-GAS-004 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Compliance claim not authorized |
| CLAIM-GAS2-028 | “MDR compliant” or “medical-device compliant” | External/regulatory | Applicability and classification not assessed | `PENDING_DECISION` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Compliance claim not authorized |
| CLAIM-GAS2-029 | “AI Act compliant” or “high-risk status determined” | External/regulatory | Applicability not assessed; no clinical AI/ML | `PENDING_DECISION` | REQ-08 | DEC-016 | CTRL-006-A / HAZ-GAS-006 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Compliance claim not authorized |
| CLAIM-GAS2-030 | “CE ready” or “CE marked” | External/regulatory | No conformity evidence | `NOT_EVIDENCED` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-031 | “AEMPS/CEIm approved” | External/regulatory | No approval evidence | `NOT_EVIDENCED` | REQ-01–REQ-14 | DEC-016 | CTRL-008-A / HAZ-GAS-008 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-032 | “Real-pilot ready” | External/pilot | DEC-016 pending and `REAL PILOT = NO_GO` | `PENDING_DECISION` | REQ-01–REQ-14 | DEC-016 | CTRL-010-A / HAZ-GAS-010 | `NOT_APPLICABLE` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use; real pilot remains NO_GO |
| CLAIM-GAS2-033 | “Production ready” | External/release | Productive IAM, observability, continuity and lifecycle absent | `NOT_EVIDENCED` | REQ-02, REQ-12, REQ-13, REQ-14 | DEC-005, DEC-013, DEC-014, DEC-015, DEC-016 | CTRL-011-A / HAZ-GAS-011 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |
| CLAIM-GAS2-034 | “Real external integration” | External/interoperability | No adapter or approved external contract | `NOT_EVIDENCED` | REQ-12, REQ-13 | DEC-013, DEC-014, DEC-016 | CTRL-011-A / HAZ-GAS-011 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Say conditional boundary only |
| CLAIM-GAS2-035 | “FHIR interoperable” | External/interoperability | No mapper, client, endpoint or profile | `NOT_EVIDENCED` | REQ-12, REQ-13 | DEC-013, DEC-016 | CTRL-003-A / HAZ-GAS-003 | `NOT_EVIDENCED` | `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | Do not use |

## Presentation wording

Acceptable:

> Guardián Alta Segura is a technical pre-pilot foundation demonstrated with
> synthetic data. It organizes a deterministic, human-reviewed post-discharge
> workflow with versioning, authorization and technical traceability. It is not
> clinically validated, approved for real patients or production ready.

Also acceptable for architecture work:

> Guardián Core is proposed to verify documented obligations in the care
> circuit. The current MVP implements only parts of that flow and does not yet
> model a deadline and typed evidence for every commitment. Missing evidence
> would mean missing documentation pending human review, not confirmed
> non-compliance.

Not acceptable:

- “The platform prevents relapse or suicide.”
- “The system is clinically safe because a human reviews alerts.”
- “Tests prove regulatory or GDPR compliance.”
- “Fail-closed means the workflow is clinically validated.”
- “GAS integrates with the hospital/FHIR.”
- “The real pilot is ready.”
- “Guardián detects team or patient non-compliance.”
- “Human review keeps Clinical Rules outside the MDR.”
- “Deterministic means non-medical-device software.”
- “Core is outside the MDR because Clinical Rules is a separate module.”

## External presentation claim matrix

| Demo statement | Can show | Can say | Must qualify | Evidence |
| --- | --- | --- | --- | --- |
| End-to-end synthetic workflow | Yes | Yes | Synthetic/local only | E2E baseline |
| Explainable deterministic alert | Yes | Yes | Draft fixture, no prediction | Rule code/tests |
| Human task accountability | Yes | Yes | Technical, not institutional SLA | Task/Event/projection |
| Caregiver revocation | Yes | Yes | Demo identity/legal policy pending | Integration/E2E |
| Home Safety | Yes | Yes | Informational, no certification | Domain/UI/tests |
| SBAR | Yes | “Unsigned deterministic preview” | No approved PDF/profile/signature | SBAR code/tests |
| Crisis resource | Blocked state only | “Unavailable pending local approval” | DEC-010/011 | Constant/unit/E2E |
| Architecture target | Diagram/document only | “Planned/conditional” | Not implemented | Architecture docs |
| External/FHIR integration | No | “Not implemented” | No contract/profile | Repository absence |
| Clinical effectiveness/safety | No | No | Evidence absent | DEC-016 |
| Real pilot/production | No | No | `NO_GO`/not ready | DEC-016 and gaps |
