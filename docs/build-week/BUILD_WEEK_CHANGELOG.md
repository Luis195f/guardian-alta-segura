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
| C09-SEC | PR #61 and the C09-SEC section of `docs/audit/gas2-evidence-index.md` | Updated Next to 16.3.3 and Prisma to 6.19.3; lock resolution includes `browserslist` 4.28.9 | Audit moved from 2 critical, 9 high and 3 moderate to 0 critical, 1 high and 0 moderate; `deepmerge-ts` remains open and unaccepted under GAS2-R-022 |
| C09-RECON | This reconciled submission package | Reapplies the C09 documentation on the exact remediated main while preserving both evidence histories | Documentation only; does not reinterpret historical C09 validation as evidence for the upgraded dependency graph |

## C09 and reconciliation publication identity

The exact C09 commit and Draft PR must be read after publication from immutable
Git/PR metadata and are reported in the final C09 handoff. The committed package
intentionally avoids a self-referential commit placeholder that could never be
correct inside the commit it names.

Original C09 PR #60 remains preserved as `OPEN`/Draft at
`2b1eb504419da413defe5000fb35c30a4038c459`. The reconciled commit, Draft PR and
remote CI must likewise be read after publication and reported separately; the
reconciled Draft technically replaces the content over the remediated main but
does not close, update or merge PR #60.

The boundary remains explicit: pre-existing functionality is context, the
hackathon-period delta is repository work, synthetic evidence is not live
provider evidence, and no clinical outcome, adoption, compliance or
institutional-support claim is made.
