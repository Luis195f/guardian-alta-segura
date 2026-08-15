# GAS 2.0 final evidence index

## Evidence hierarchy

Runtime code, schema/migrations and executed tests were treated as primary
evidence. ADRs and traceability explain intent and ownership. Decision Packs are
`DECISION_SUPPORT_EVIDENCE` and never institutional approval.

## Architecture and configuration

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `package.json` | `CODE` | Exact stack, scripts and package versions | Does not prove commands pass |
| `tsconfig.json` | `CODE` | Strict TypeScript settings | Compile evidence comes from executed typecheck |
| `next.config.ts` | `CODE` | Security headers and dev-origin configuration | Not a production deployment policy |
| `vitest.config.ts` | `CI` | Unit suite boundary | Counts require actual run |
| `vitest.integration.config.ts` | `CI` | Serial PostgreSQL integration boundary | Local DB required |
| `playwright.config.ts` | `CI` | E2E environment, workers, retries and loopback | Not production browser certification |
| `.github/workflows/ci.yml` | `CI` | Intended PR/main verification with PostgreSQL 16 | Repository workflow is not evidence of a specific remote run |
| `.env.example` | `DOCUMENTATION` | Synthetic loopback demo defaults | Local `.env` is not versioned/productive config |
| `docker-compose.yml` | `DEMO_SCRIPT` | Loopback PostgreSQL 16 demo service | Volume is not a governed backup |
| `scripts/prepare-demo.mjs` | `DEMO_SCRIPT` | Reproducible cross-platform local setup without deletion | Requires Docker/pnpm/local environment |
| `config/synthetic-demo-manifest.json` | `DEMO_CONFIGURATION` | Versioned identities, fixtures, flags, migrations and capability taxonomy | Synthetic/local contract only |
| `scripts/demo.mjs` and `scripts/demo-runtime.mjs` | `DEMO_SCRIPT` | Verify/start/fail-closed reset/non-destructive clean with loopback and ownership guards | Not production operations tooling |
| `scripts/demo-state.mjs` | `DEMO_SCRIPT` | Material-state validation and SHA-256 fingerprint | Deliberately excludes technical IDs, timestamps, audits and sessions |
| `scripts/smoke-demo.mjs` and `tests/e2e/demo-smoke.p15.ts` | `DEMO_SCRIPT` / `E2E_TEST` | Isolated PostgreSQL 16 smoke, seed reproducibility, six roles, main flow, denials and cleanup | Local Chromium and synthetic data only |

## Persistence and lifecycle

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `prisma/schema.prisma` | `CODE` | 50 models, 35 enums, 128 `RESTRICT` relations | Schema alone does not prove deployed state |
| `prisma/migrations/**` | `DATABASE_CONSTRAINT` | 14-version history, FKs, uniques and triggers | Does not approve lifecycle policy |
| `20260715000100_platform_foundation` | `DATABASE_CONSTRAINT` | Immutable audit events | Retention/access procedure absent |
| `20260716000100_consent_legal_basis` | `DATABASE_CONSTRAINT` | Append-only legal history | Legal applicability pending |
| `20260716000200_discharge_episode` | `DATABASE_CONSTRAINT` | Episode/patient no-delete and transition history | Closure policy pending |
| `20260717000100_safety_plan_versioning` | `DATABASE_CONSTRAINT` | Safety Plan version immutability | Clinical content validation pending |
| `20260717000200_check_in_protocols` | `DATABASE_CONSTRAINT` | Protocol/assignment/outcome history | Cadence/content pending |
| `20260717000300_explainable_alerts` | `DATABASE_CONSTRAINT` | Rule/evaluation/alert/review invariants | Clinical rules pending |
| `20260720000100_nursing_workqueue_tasks` plus reconciliation migrations | `DATABASE_CONSTRAINT` | Task/Event chain and reviewed-alert link | Institutional task policy pending |
| `20260721000100_caregiver_access_revocation` | `DATABASE_CONSTRAINT` | Cross-reference integrity, revocation locks and history | Legal/IAM policy pending |
| `20260721000200_home_safety_and_sbar` | `DATABASE_CONSTRAINT` | Append-only Home Safety | Demo template only |
| `pnpm db:migrate:status` | `CI` | 14 migrations expected; execution evidence recorded below | Local synthetic DB only |

## Episode governance

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `src/domain/episode/discharge-episode.ts` | `CODE` | Explicit state machine and program lengths | Length semantics not institutionally approved |
| `src/domain/episode/activation-policy.ts` | `CODE` | Governance blockers and DEC-002 fail-closed policy | Pending policy cannot authorize closure |
| `src/application/episode/manage-discharge-episode.ts` | `CODE` | Idempotency, fingerprint, expected version, responsibility and audit | Real close mutation deliberately absent |
| `src/infrastructure/persistence/prisma-episode-unit-of-work.ts` | `CODE` | Transactional episode/transition/audit persistence | Future close atomicity needs review |
| Episode domain/application/integration/E2E tests | `UNIT_TEST` / `INTEGRATION_TEST` / `E2E_TEST` | Creation, transitions, stale version, idempotency and fail-closed close | Synthetic policy/records only |
| ADR-0004 | `ADR` | Episode source of truth and concurrency rationale | Intent, not runtime proof |
| DEC-002 pack | `DECISION_SUPPORT_EVIDENCE` | Institutional decision questions and future gate | Not approved/implemented |

## Provenance and alerts

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `src/domain/provenance/signal-provenance.ts` | `CODE` | Canonical v1 schema, parser, source/derived mappings and lineage invariants | Internal source kinds only |
| `src/application/alerts/manage-explainable-alerts.ts` | `CODE` | Stored-source resolution, matched-only alert and explicit review | Synthetic active rules only |
| `src/infrastructure/persistence/prisma-explainable-alerts-unit-of-work.ts` | `CODE` | Source lookup and persisted evaluation/alert lineage | No external source trust |
| Provenance/rule/alert tests | `UNIT_TEST` / `INTEGRATION_TEST` / `E2E_TEST` | Invalid lineage rejection, idempotency, explanation and review | Does not clinically validate rules |
| ADR-0007 and ADR-0011 | `ADR` | Deterministic-rule and canonical-provenance decisions | Documentary intent |

## Human authorization and task accountability

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `src/domain/authorization/human-authorization.ts` | `CODE` | Current explicit action/policy/blockers | One action; pure result not persisted |
| `src/application/workqueue/manage-nursing-tasks.ts` | `CODE` | Explicit task request after review/current authorization | Direct tasks are separately human-initiated |
| `src/domain/workqueue/task-accountability.ts` | `CODE` | Creator/assignee/actor/resolver projection | Assignment is not acceptance/SLA |
| `src/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work.ts` | `CODE` | Global participant lock order, revision and event persistence | Institutional team/SLA model absent |
| Task migrations | `DATABASE_CONSTRAINT` | Event sequence and reviewed-alert link | DB cannot supply pending institutional semantics |
| Authorization/task/accountability tests | `UNIT_TEST` / `INTEGRATION_TEST` / `E2E_TEST` | Review guard, role/resource checks, races, revocation and history | No clinical effectiveness evidence |
| ADR-0012/0013 | `ADR` | Review-vs-authorization and accountability semantics | Documentary |
| DEC-017 pack | `DECISION_SUPPORT_EVIDENCE` | SLA/priority/assignment/escalation questions | Pending; no policy values approved |

## Governance evidence

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `src/domain/governance/governance-evidence.ts` | `CODE` | Integrity taxonomy and minimized projection | Technical consistency only |
| `src/application/governance/get-governance-evidence.ts` | `CODE` | Professional/resource authorization | No institutional auditor role |
| `src/infrastructure/persistence/prisma-governance-evidence-reader.ts` | `CODE` | Repeatable-read snapshot, 100-row limits, no writes | Not an independent evidence store |
| Governance evidence tests | `UNIT_TEST` / `INTEGRATION_TEST` / `E2E_TEST` | Authorization, consistency, truncation and no mutation | Instance authorization/reviewer historical role unavailable |
| ADR-0014 | `ADR` | Read-model rationale and limitations | Documentary |

## Security, privacy and caregiver

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `src/domain/auth/authorization.ts` | `CODE` | Deny-by-default role-resource matrix | Productive role mapping pending |
| `src/infrastructure/http/demo-episode-request.ts` | `CODE` | Demo mode, loopback, session and resource gates | Demo routes only |
| `src/infrastructure/auth/session-reader.ts` | `CODE` | Per-request expiry/revocation/active-role checks | No central session/global logout |
| `src/infrastructure/config/env.ts` | `CODE` | Production rejects demo/insecure origin/cookie | Does not provide productive IAM |
| Session cookies and CSRF modules | `CODE` | HttpOnly/Strict cookies and same-origin mutation guard | Local demo threat boundary |
| `src/infrastructure/http/error-handler.ts` | `CODE` | Static public/log error envelope | No external telemetry pipeline |
| `prisma/seed-error.mjs` and tests | `UNIT_TEST` | Closed seed-error remediation | Does not test every future logging sink |
| Caregiver domain/application/persistence | `CODE` | Granular scope, portal filtering, immediate revocation | DEC-004/005/013 pending |
| Caregiver/security tests | `INTEGRATION_TEST` / `E2E_TEST` | Cross-episode isolation, races, logout and support denial | Synthetic identities only |
| DEC-005 and DEC-013 packs | `DECISION_SUPPORT_EVIDENCE` | Lifecycle/IAM decision preparation | No approval or implementation |

## Continuity, incidents, connectors and FHIR

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `src/app/api/health/route.ts` | `CODE` | Process liveness and correlation ID | No DB readiness |
| Error/correlation modules and tests | `CODE` / `UNIT_TEST` | Sanitized technical signal | No metrics/tracing/incident workflow |
| Repository search for browser offline stores | `CODE` | No clinical `localStorage`/IndexedDB path found | Static absence check |
| Repository search for connector/FHIR runtime | `CODE` | No external/FHIR adapter found | Documentation contains future boundaries |
| ADR-0017 | `DOCUMENTATION` | Provider-neutral future boundary, recipient separation, minimization, conservative failures and threat/test plan | `DOCUMENTED_ONLY`; no transport, delivery, provider, approval or operational evidence |
| ADR-0018 | `DOCUMENTATION` | Future inbound/read-only FHIR anti-corruption boundary, candidate mappings, open decisions, failure contract, threat model and future test plan | `DOCUMENTED_ONLY / NOT_IMPLEMENTED`; no FHIR runtime, profile, provider, writeback, interoperability or conformance evidence |
| DEC-014 pack | `DECISION_SUPPORT_EVIDENCE` | Incident-operation decision preparation | Pending |
| DEC-015 pack | `DECISION_SUPPORT_EVIDENCE` | Continuity decision preparation and known health gap | Pending |
| DEC-016 pack | `DECISION_SUPPORT_EVIDENCE` | Real-pilot gate; `NO_GO` | Not pilot approval |

## Requirements, decisions and claims

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `docs/requirements-traceability.md/.csv` | `TRACEABILITY` | Canonical REQ-01–14 and technical follow-up | Canonical status is not implementation proof |
| `scripts/check-requirements-traceability.mjs` | `CI` | Exact Markdown/CSV equivalence without a shell-specific runtime | Does not validate clinical content |
| `docs/audit/gas2-claims-register.md` | `TRACEABILITY` | Canonical claim IDs, permitted status taxonomy and explicit REQ/DEC/control/hazard/test/SHA chain | A technical chain is not clinical, legal, regulatory or institutional proof |
| `scripts/check-governance-evidence.mjs` | `CI` | Fails explicitly on unsupported claim status, broken REQ/DEC/control/hazard/test references, malformed SHA or broken local Markdown links | Validates repository references and taxonomy, not truth outside the inspected baseline |
| `scripts/check-traceability.mjs` | `CI` | Single cross-platform entrypoint for requirement equivalence and governance-evidence validation | Aggregates deterministic repository checks only |
| `docs/decision-register.md` | `DOCUMENTATION` | DEC-001–18 authorities/status/blockers and P09/P12 decision-support references | All remain pending; P12 does not select FHIR version, profile, terminology, security model, provider or operation |
| `docs/decisions/**` | `DECISION_SUPPORT_EVIDENCE` | Seven prepared packs and workshop/form evidence | No approval |
| `README.md`, build-week demo docs and UI copy | `DOCUMENTATION` | Synthetic/no-clinical-use limitations | Presentation qualifiers must remain attached |

## Executed baseline evidence

### GAS2-P12 local execution — 2026-08-15 — read-only FHIR documentary boundary

Baseline inspected: `3be58f6566a00293bc3ad33f8f520286b6727bf0`;
tree `edbc1830f941d09fc2821dbf7dc0453d67b81af4`; branch
`docs/fhir-interoperability-boundary-12`. CI run `31868000944` was
`completed/success` for that exact SHA. The P12 delta changes documentation only:
it does not add FHIR runtime, schema, migrations, dependencies, endpoints,
feature flags, workflows, services or tests.

| Command / evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| `pnpm install --frozen-lockfile` | PASS; 409 packages reused, downloads 0, lockfile unchanged | 0 | Existing dependency graph only |
| `pnpm prisma:generate` | PASS; Prisma Client 6.19.0 | 0 | No schema or migration change |
| Empty PostgreSQL 16 base | PASS; public tables 0 | 0 | Isolated loopback container/network, port 55420 and tmpfs; no persistent volume |
| `pnpm db:migrate:deploy` | PASS; 14/14 migrations | 0 | P12 synthetic database only |
| `pnpm db:seed` | PASS | 0 | Canonical synthetic seed only |
| `pnpm db:migrate:status` | PASS; schema up to date | 0 | Same isolated database |
| `pnpm format:check` | PASS | 0 | P12 documentary delta |
| `pnpm lint` | PASS | 0 | Static analysis |
| `pnpm typecheck` | PASS | 0 | Next route types and TypeScript |
| `pnpm test` | PASS; 401 unit + 103 integration + 26 tooling = 530/530 | 0 | Synthetic fixtures and PostgreSQL 16 |
| `pnpm test:tooling` | PASS; 26/26 | 0 | Includes governance and traceability negative tests |
| `pnpm traceability:check` | PASS; 37 claims and Markdown/CSV drift 0 | 0 | Repository taxonomy/references only |
| P11 governance evidence checker | PASS; 37 claims and local references resolved | 0 | Does not validate external truth or FHIR conformance |
| `pnpm build` | PASS; 18 static pages generated and dynamic routes compiled | 0 | Local build, not deployment |
| `git diff --check` | PASS | 0 | No whitespace errors |
| `pnpm audit --prod` | EXPECTED NONZERO; inherited 5 high + 2 moderate; P12 attributable = 0 | 1 | No dependency or lockfile change |
| `pnpm test:e2e` | `NOT_EXECUTED` | `NOT_APPLICABLE` | Delta is exclusively documentary; no runtime, config, script or test change |

The integration suites deliberately create synthetic negative-control rows whose
`isSynthetic` field is false to test fail-closed rejection; their labels and
values remain synthetic and are not real data. The temporary container used
tmpfs and was removed with its network after validation. Port 55420 was free,
`.env` remained absent, no P12 volume/resource remained, and the pre-existing P15
container, network and volume were unchanged.

### GAS2-P15 local execution — 2026-08-13

Windows was the only platform executed. Linux and macOS remain `NOT_EXECUTED`;
no compatibility is inferred and CI was not modified.

| Command / evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged | 0 | Windows local |
| `pnpm audit --prod` | EXPECTED NONZERO; inherited 4 high + 2 moderate, P15 new = 0 | 1 | No dependency changed; advisories remain unresolved |
| `pnpm format:check` | PASS | 0 | Rerun required after final evidence edit |
| `pnpm lint` | PASS | 0 | Static analysis |
| `pnpm typecheck` | PASS | 0 | Next route types + TypeScript |
| `pnpm test` | PASS: 401 unit + 103 integration + 22 tooling = 526 | 0 | Baseline 516; P15 adds 10 tooling tests |
| `pnpm traceability:check` | PASS | 0 | Markdown/CSV canonical and synchronized |
| `pnpm build` | PASS | 0 | Local build, not deployment |
| `pnpm test:e2e` | PASS: 74/74, skips 0, retries 0 | 0 | Existing Chromium/mobile-Chromium suite |
| `pnpm demo:prepare` | PASS; repeated idempotently | 0 | Normal volume preserved |
| `pnpm demo:verify` | PASS; 14 migrations, PostgreSQL 16, 6 identities, providers 0 | 0 | Canonical local demo |
| `pnpm demo:start` + `GET /api/health` + `demo:clean` | PASS; readiness and parent exit 0 | 0 | Loopback only; volume preserved |
| `pnpm demo:reset` without confirmation | PASS (rejected fail-closed) | 5 | No destructive access attempted |
| reset without P15 runtime marker | PASS (rejected fail-closed) | 5 | `RESET_RESOURCE_NOT_CREATED_BY_P15` |
| confirmed `pnpm demo:reset -- --confirm=RESET_SYNTHETIC_DEMO` | PASS | 0 | Exact P15 schema only; 14 migrations + one seed + verify |
| `pnpm demo:smoke` | PASS: 1/1 P15 smoke, six roles, external requests 0 | 0 | Separate empty PostgreSQL 16 project; all ephemeral resources removed |
| Prisma migrate diff with `guardian_demo_shadow_p15` | PASS: no difference | 0 | Shadow DB removed |

Canonical material fingerprint:
`a890494bbd9919d64f366a443459a476512db6f256fffe73813c774d04b7cf1d`.
It was identical after consecutive seeds and after protected reset. Technical IDs,
timestamps, audit/correlation records, sessions/tokens and post-seed operational
state are explicitly excluded; fixture content, roles, policies, relations and
initial flow state are included.

The table below is retained as a superseded pre-P15 local snapshot. Its counts
must not be used as the current baseline; the dated P15 execution above replaces
it without deleting the historical record.

| Command | Evidence type | Result | Limitation |
| --- | --- | --- | --- |
| `pnpm demo:prepare` | `DEMO_SCRIPT` | PASS | Audited local environment only |
| `pnpm format:check` | `CI` | PASS before audit docs | Rerun after docs required |
| `pnpm lint` | `CI` | PASS | Static rules only |
| `pnpm typecheck` | `CI` | PASS | Type safety is not behavioral proof |
| `pnpm test:unit` | `UNIT_TEST` | 304/304 | In-memory/unit scope |
| `pnpm test:integration` | `INTEGRATION_TEST` | 69/69 | Local PostgreSQL synthetic scope |
| `pnpm test:e2e` | `E2E_TEST` | 44/44 | Local Chromium demo scope |
| `pnpm build` | `CI` | PASS | Not deployment qualification |
| `pnpm traceability:check` | `TRACEABILITY` | PASS | Documentary consistency only |
| `pnpm db:migrate:status` | `DATABASE_CONSTRAINT` | PASS | Local synthetic DB |

### GAS2-P11 local execution — 2026-08-14 — blocked gate

Baseline inspected: `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b`.
The P11 delta changes documentation and deterministic repository validation only;
it does not change runtime, schema, migrations, dependencies or feature flags.

| Command / evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| `git fetch origin --prune` | PASS | 0 | `origin/main` remained at the exact baseline SHA |
| CI run `31698359702` | `completed/success` | 0 | GitHub run for the exact baseline SHA |
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged | 0 | Existing dependency graph only |
| `pnpm prisma:generate` | PASS | 0 | Prisma 6.19.0 |
| `pnpm db:migrate:deploy` on empty P11 PostgreSQL 16 | PASS; 14/14 migrations | 0 | Isolated container, network, volume and port 55411 |
| `pnpm db:seed` | PASS | 0 | Synthetic seed only |
| `pnpm db:migrate:status` | PASS; schema up to date | 0 | Same isolated database |
| `node --test scripts/check-governance-evidence.test.mjs` | PASS; 4/4 | 0 | Taxonomy, broken REQ/DEC/hazard/test and malformed SHA negatives |
| `pnpm format:check` | PASS | 0 | Final evidence edit included |
| `pnpm lint` | PASS | 0 | Static analysis |
| `pnpm typecheck` | PASS | 0 | Next route types and TypeScript |
| `pnpm test` | PASS; 401 unit + 103 integration + 26 tooling = 530 | 0 | PostgreSQL 16 synthetic scope |
| `pnpm traceability:check` | PASS; 35 claims and Markdown/CSV drift 0 | 0 | Repository references and taxonomy only |
| `pnpm build` | PASS | 0 | Local build, not deployment |
| `pnpm test:e2e` | BLOCKED before tests | 1 | Required port 3000 occupied by an unrelated `NurManOS` process; it was not stopped |
| Temporary port-3001 diagnostic run | INVALID AS GATE: 30 passed, 30 failed, 14 did not run | 1 | Tests and network boundary intentionally fix port 3000; temporary config removed |
| `pnpm audit --prod` | EXPECTED NONZERO; inherited 5 high + 2 moderate; P11 attributable = 0 | 1 | One additional high advisory is visible versus P15; no dependency or lockfile change in P11 |

Because the canonical E2E command could not start against its required port,
P11 does not claim a passing full validation. This is an environmental blocker,
not evidence that the failed port-3001 diagnostic changed product behavior.

### GAS2-P09 publication validation — 2026-08-15 — documentary boundary

Baseline inspected: `92eb7e9a37f2c46ee2209b7a30ad9b9ea45fddef`.
The P09 delta changes documentation only. It does not change runtime, schema,
migrations, dependencies, feature flags, CI, scripts or tests.

| Command / evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| Corrected tree validation | PASS; tree `93c7438b97f657ab386a964bb6b45b3bc234d4d0`, parent `5c6a0b61d341b573c3dac9b0a12c0d229fdd288b` | 0 | Both `git show -s --format='%T' HEAD` and `git rev-parse 'HEAD^{tree}'` agreed |
| CI run `31839963551` | `completed/success` | 0 | Exact main SHA `92eb7e9a37f2c46ee2209b7a30ad9b9ea45fddef` |
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged, 409 packages reused, downloads 0 | 0 | Existing dependency graph only |
| Empty PostgreSQL 16 base | PASS; public tables 0 | 0 | Isolated loopback project `gas2-p09-validation-20260815`; synthetic database only |
| `pnpm prisma:generate` | PASS | 0 | No schema or migration change |
| `pnpm db:migrate:deploy` | PASS; 14/14 migrations | 0 | Isolated PostgreSQL 16.14 on loopback port 55419 |
| `pnpm db:seed` | PASS | 0 | Canonical synthetic seed only |
| `pnpm db:migrate:status` | PASS; schema up to date | 0 | Same isolated database |
| `pnpm format:check` | PASS | 0 | Final evidence edit included |
| `pnpm lint` | PASS | 0 | Static analysis |
| `pnpm typecheck` | PASS | 0 | Next route types and TypeScript |
| `pnpm test` | PASS; 401 unit + 103 integration + 26 tooling = 530/530 | 0 | PostgreSQL 16 synthetic scope |
| `pnpm test:tooling` | PASS; 26/26 | 0 | Includes governance evidence negatives and traceability fixtures |
| `pnpm traceability:check` | PASS; 36 claims and Markdown/CSV drift 0 | 0 | Repository references and taxonomy only |
| `node scripts/check-governance-evidence.mjs` | PASS; 36 claims | 0 | P11 checker executed directly |
| Local Markdown reference verification over the five P09 documents | PASS; broken references 0 | 0 | Local targets only; no external URL validation |
| `pnpm build` | PASS; 18/18 static pages generated | 0 | Local build, not deployment |
| `pnpm test:e2e` | `NOT_EXECUTED` | — | Delta is exclusively documentary; runtime, configuration, scripts and tests are unchanged; no PASS claimed |
| `pnpm audit --prod` | EXPECTED NONZERO; inherited 5 high + 2 moderate; P09 attributable = 0 | 1 | No dependency or lockfile change; advisories remain unresolved |
| Isolated resource cleanup | PASS; container, network and volume removed; port 55419 free; temporary `.env` absent | 0 | P15 container `d156f1601592` and volume `gas-p15_guardian_postgres_data` remained intact |

P09 does not claim E2E PASS. Integration validation passed against an isolated,
synthetic PostgreSQL instance that was removed after execution. Communications
remain unimplemented, no persistent external resource was created and the
documented future boundary does not authorize delivery behavior.
