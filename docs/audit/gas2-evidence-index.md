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
| `scripts/prepare-demo.ps1` | `DEMO_SCRIPT` | Reproducible local setup without deletion | Requires Docker/pnpm/local environment |

## Persistence and lifecycle

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `prisma/schema.prisma` | `CODE` | 45 models, 32 enums, 113 `RESTRICT` relations | Schema alone does not prove deployed state |
| `prisma/migrations/**` | `DATABASE_CONSTRAINT` | 11-version history, FKs, uniques and triggers | Does not approve lifecycle policy |
| `20260715000100_platform_foundation` | `DATABASE_CONSTRAINT` | Immutable audit events | Retention/access procedure absent |
| `20260716000100_consent_legal_basis` | `DATABASE_CONSTRAINT` | Append-only legal history | Legal applicability pending |
| `20260716000200_discharge_episode` | `DATABASE_CONSTRAINT` | Episode/patient no-delete and transition history | Closure policy pending |
| `20260717000100_safety_plan_versioning` | `DATABASE_CONSTRAINT` | Safety Plan version immutability | Clinical content validation pending |
| `20260717000200_check_in_protocols` | `DATABASE_CONSTRAINT` | Protocol/assignment/outcome history | Cadence/content pending |
| `20260717000300_explainable_alerts` | `DATABASE_CONSTRAINT` | Rule/evaluation/alert/review invariants | Clinical rules pending |
| `20260720000100_nursing_workqueue_tasks` plus reconciliation migrations | `DATABASE_CONSTRAINT` | Task/Event chain and reviewed-alert link | Institutional task policy pending |
| `20260721000100_caregiver_access_revocation` | `DATABASE_CONSTRAINT` | Cross-reference integrity, revocation locks and history | Legal/IAM policy pending |
| `20260721000200_home_safety_and_sbar` | `DATABASE_CONSTRAINT` | Append-only Home Safety | Demo template only |
| `pnpm db:migrate:status` on 2026-07-28 | `CI` | 11 migrations applied; schema up to date | Local synthetic DB only |

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
| DEC-014 pack | `DECISION_SUPPORT_EVIDENCE` | Incident-operation decision preparation | Pending |
| DEC-015 pack | `DECISION_SUPPORT_EVIDENCE` | Continuity decision preparation and known health gap | Pending |
| DEC-016 pack | `DECISION_SUPPORT_EVIDENCE` | Real-pilot gate; `NO_GO` | Not pilot approval |

## Requirements, decisions and claims

| Source | Type | Supports | Limitation |
| --- | --- | --- | --- |
| `docs/requirements-traceability.md/.csv` | `TRACEABILITY` | Canonical REQ-01–14 and technical follow-up | Canonical status is not implementation proof |
| `scripts/check-requirements-traceability.ps1` | `CI` | Exact Markdown/CSV equivalence | Does not validate clinical content |
| `docs/decision-register.md` | `DOCUMENTATION` | DEC-001–17 authorities/status/blockers | All remain pending |
| `docs/decisions/**` | `DECISION_SUPPORT_EVIDENCE` | Seven prepared packs and workshop/form evidence | No approval |
| `README.md`, build-week demo docs and UI copy | `DOCUMENTATION` | Synthetic/no-clinical-use limitations | Presentation qualifiers must remain attached |

## Executed baseline evidence

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

