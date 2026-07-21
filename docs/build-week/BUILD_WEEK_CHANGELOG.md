# Build Week changelog and attribution

The repository does not contain an externally verified Build Week eligibility start timestamp. To avoid false attribution, this table reports immutable Git dates and uses a conservative repository-internal baseline: governance and the core platform through check-ins (`91b43d2`–`4ed4b7f`) are treated as pre-existing baseline; commits dated 2026-07-20/21 and this closing branch are described as Build Week work subject to organizer eligibility confirmation.

| Commit | Date (Europe/Paris) | Functionality | Main files | Tests | Attribution | Demo contribution |
| --- | --- | --- | --- | --- | --- | --- |
| `91b43d2` | 2026-07-15 16:37 | Initial governance repository | `AGENTS.md`, prompts | N/A | Pre-existing baseline | Safety constraints |
| `c9c5ee0` | 2026-07-15 21:18 | Clinical governance baseline | `docs/`, traceability | Traceability script | Pre-existing baseline | Honest scope/decisions |
| `e465ed7` | 2026-07-16 17:13 | Secure Next.js/Prisma foundation | auth, audit, CI, seed | Unit/integration/e2e | Pre-existing baseline | Synthetic login and RBAC |
| `6ded882` | 2026-07-16 22:00 | Consent/legal-basis controls | legal domain/API/UI | Unit/integration/e2e | Pre-existing baseline | Fail-closed authorization |
| `1a421a1` | 2026-07-17 00:08 | Structured discharge episode | episode domain/API/UI | Unit/integration/e2e | Pre-existing baseline | Alta/timeline |
| `3c24902` | 2026-07-17 10:24 | Versioned Safety Plan | schema, service, UI | Unit/integration/e2e | Pre-existing baseline | Append-only plan |
| `4ed4b7f` | 2026-07-17 15:54 | Versioned check-ins | protocol/assignment/response | Unit/integration/e2e | Pre-existing baseline | Patient check-in |
| `dd8e907` | 2026-07-20 22:36 | Deterministic explainable alerts | DSL, rules, alerts, UI | Unit/integration/e2e | Build Week candidate work | Explainable notice + human review |
| `fa7ea84` | 2026-07-21 17:12 | Nursing workqueue and human tasks | task events, queue, UI | Unit/integration/e2e | Build Week candidate work | Manual task/follow-up |
| `108b334` | 2026-07-21 21:07 | Granular caregiver access and immediate revocation | caregiver schema/service/portal | Unit/integration/e2e/audit | Build Week candidate work | Authorized, revocable sharing |
| `[FINAL SHA]` | 2026-07-21 | Home Safety, deterministic SBAR, crisis safe state, demo/release | Build Week docs, schema, seed, UI | Focused + full suite | Build Week closing branch | Reproducible submission |

Replace `[FINAL SHA]` after the final commit. Git dates are evidence of repository activity, not proof of event eligibility by themselves.
