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

## Supported and restricted claims

| Claim | Typical location | Current evidence | Classification | Action |
| --- | --- | --- | --- | --- |
| “Technical pre-pilot MVP using synthetic data only” | README/product copy | Loopback/demo gates, synthetic seed, full local validation | `SUPPORTED_TECHNICAL_CLAIM` | May use unchanged |
| “Local synthetic demo is reproducible” | Demo material | `demo:prepare` and 44 E2E tests passed | `SUPPORTED_DEMO_CLAIM` | May use with environment/date qualifier |
| “Not for clinical use” | README/UI | Institutional gates and demo-only runtime | `SUPPORTED_TECHNICAL_CLAIM` | Must retain |
| “Deterministic, versioned, explainable notices” | README/UI/demo | Rule DSL, version/approval/evaluation, explanation and tests | `SUPPORTED_DEMO_CLAIM` | Qualify as synthetic and not clinically validated |
| “Human review is required before the implemented signal-derived action” | Workflow/UI | Policy plus explicit review and task request | `SUPPORTED_TECHNICAL_CLAIM` | A direct human-initiated task is a distinct path, not a signal-derived automatic action |
| “No autonomous clinical action was found in the audited baseline” | Audit/presentation | Audited routes/services and E2E | `SUPPORTED_TECHNICAL_CLAIM` | Retain the baseline qualifier |
| “No clinical AI/ML is implemented” | README/audit | Dependency/code inventory; deterministic rules | `SUPPORTED_TECHNICAL_CLAIM` | May use for current baseline |
| “Versioned Safety Plan preserves history” | Demo | Schema, triggers, unit/integration/E2E | `SUPPORTED_DEMO_CLAIM` | Do not call clinically validated |
| “Caregiver revocation cuts current access without deleting history” | Demo | Transactional revocation and race/E2E tests | `SUPPORTED_DEMO_CLAIM` | Qualify as synthetic technical behavior |
| “Governance evidence is read-only and derived” | Architecture/audit | Repeatable-read reader and projection tests | `SUPPORTED_TECHNICAL_CLAIM` | Do not call independent approval/evidence authority |
| “Technical task accountability is implemented” | Architecture/audit | Task/Event/revision/locks/projection tests | `SUPPORTED_TECHNICAL_CLAIM` | State that institutional accountability is pending DEC-017 |
| “The MVP demonstrates parts of the post-discharge circuit” | Architecture/demo | Episode, responsible users, review, task and evidence projections | `SUPPORTED_TECHNICAL_CLAIM` | State that commitment, deadline and typed evidence are not implemented |
| “Guardián verifies the care circuit: every explicit discharge commitment becomes an obligation with owner, deadline and evidence” | Intended purpose/positioning | Boundary specification only; current `Task` has no deadline or typed evidence contract | `TARGET_CLAIM_NOT_YET_IMPLEMENTED` | May appear only as proposed intended purpose with the implementation gap stated |
| “Absence of evidence is detected and escalated for human review” | Intended purpose/positioning | Operational definition exists; detection workflow does not | `TARGET_CLAIM_NOT_YET_IMPLEMENTED` | Never shorten to “detects non-compliance” |
| “Clinical Rules is deterministic and explainable” | Demo/architecture | DSL, versioning, evaluation and explanation tests | `SUPPORTED_DEMO_CLAIM` | Does not imply non-MDSW, clinical validity or a risk class |
| “Guardián Core is not a medical device” | Regulatory/commercial | No formal qualification; modules remain coupled | `REQUIRES_REGULATORY_ASSESSMENT` | Do not use until function, configuration and claims are assessed |
| “Clinical Rules is/is not a medical device” | Regulatory/commercial | Intended purpose and decision impact not approved | `REQUIRES_REGULATORY_ASSESSMENT` | Do not assert either conclusion or an MDR class |
| “Clinical Safety & Accountability Control Plane” | Positioning | Several technical foundations exist; Process Safety/integration/productive controls partial | `MISLEADING_IF_USED_EXTERNALLY` | Use only as qualified architecture direction |
| “Clinically safe” | External/marketing | No clinical safety case or local validation | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “Clinically validated” | External/marketing | No clinical validation | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “Effective” / “improves outcomes” | External/marketing | No outcomes study | `REQUIRES_CLINICAL_EVIDENCE` | Do not use |
| “Reduces readmissions” | External/marketing | No comparative outcome evidence | `REQUIRES_CLINICAL_EVIDENCE` | Do not use |
| “Prevents suicide/relapse/mortality” | External/marketing | No evidence; outside product behavior | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “Predicts deterioration reliably” | External/marketing | No predictor/ML; deterministic organization only | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “AI clinically validated” | External/marketing | No clinical AI/ML | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “GDPR compliant” | External/legal | DEC-003/004/005 pending; no approved lifecycle | `REQUIRES_REGULATORY_ASSESSMENT` | Do not use |
| “MDR compliant” / “medical-device compliant” | External/regulatory | Applicability/classification not assessed | `REQUIRES_REGULATORY_ASSESSMENT` | Do not use |
| “AI Act compliant/high-risk status determined” | External/regulatory | Applicability not assessed; no clinical AI/ML | `REQUIRES_REGULATORY_ASSESSMENT` | Do not use |
| “CE ready/marked” | External/regulatory | No conformity evidence | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “AEMPS/CEIm approved” | External/regulatory | No approval evidence | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “Real-pilot ready” | External/pilot | DEC-016 pending, `NO_GO` | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “Production ready” | External/release | IAM/observability/continuity/lifecycle absent | `PROHIBITED_UNTIL_VALIDATED` | Do not use |
| “Real external integration” | External/interoperability | No adapter | `MISLEADING_IF_USED_EXTERNALLY` | Say “conditional boundary only” |
| “FHIR interoperable” | External/interoperability | No mapper/client/endpoint/profile | `MISLEADING_IF_USED_EXTERNALLY` | Do not use |

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

## FENIN/congress claim matrix

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
