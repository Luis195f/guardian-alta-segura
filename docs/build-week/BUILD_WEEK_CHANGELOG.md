# Build Week changelog and attribution

The official CALL-E submission period began on **2026-07-23 at 21:30 SGT**.
For conservative attribution, repository history through the last commit before
that timestamp is treated as pre-existing. Git timestamps show when work entered
this repository; they do not prove organizer eligibility or independent creation.

## Pre-existing baseline

The exact repository cutoff commit is
`88be7da66c38f32f319e0fefc57f8246a1739a51` (2026-07-22 21:59:09 +02:00).
By that point the repository already contained the Next.js/Prisma foundation,
synthetic demo authentication and RBAC, discharge episodes, append-only Safety
Plans, check-ins, deterministic explainable alerts, the human workqueue and
Tasks, caregiver controls, Home Safety, deterministic SBAR, crisis blocked
states and role-based navigation. C09 does not present those capabilities as
hackathon-created.

## Hackathon-period repository delta

| Workstream | Repository evidence | What changed | Evidence boundary |
| --- | --- | --- | --- |
| C01-C02 | `docs/audit/call-e-*`, ADR-0019 and traceability artifacts | Defined a fail-closed CALL-E boundary, typed authority and hazards before adapter work | Design and deterministic repository evidence; not live runtime proof |
| C03-C04 | Patient Relay application, presentation and test paths referenced by `JUDGING_EVIDENCE.md` | Added Patient Relay preview, one-use confirmation, idempotency and synthetic dry-run artifacts | Fixture/fake/dry-run only in the judge demo |
| C05-C06 | Professional Relay paths and tests referenced by `JUDGING_EVIDENCE.md` | Added separate Professional Relay authorization, target derivation, result capture and human review | Does not auto-resolve or reassign a Task |
| C07 | Demo fixtures, E2E and visible lifecycle/evidence surfaces referenced by `JUDGE_DEMO_RUNBOOK.md` | Integrated the two relay flows into the existing UI and contracts | Same application; no parallel demo implementation |
| C08 | `docs/audit/c08-live-proof-*` and evidence-index C08 section | Attempted to qualify live proof and correctly stopped at the authorization gate | `LIVE_PROOF = BLOCKED_NO_AUTHORIZED_DESTINATION`; no live call executed |
| C09 | This submission package | Added sourced Problem Evidence, judge runbook, evidence matrix, video plan and copy-ready Devpost draft | Documentation only; no feature, runtime, schema, dependency or configuration change |

## C09 publication identity

The exact C09 commit and Draft PR must be read after publication from immutable
Git/PR metadata and are reported in the final C09 handoff. The committed package
intentionally avoids a self-referential commit placeholder that could never be
correct inside the commit it names.

The boundary remains explicit: pre-existing functionality is context, the
hackathon-period delta is repository work, synthetic evidence is not live
provider evidence, and no clinical outcome, adoption, compliance or
institutional-support claim is made.
