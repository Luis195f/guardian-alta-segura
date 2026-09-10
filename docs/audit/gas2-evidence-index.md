# GAS 2.0 final evidence index

## Evidence hierarchy

Runtime code, schema/migrations and executed tests were treated as primary
evidence. ADRs and traceability explain intent and ownership. Decision Packs are
`DECISION_SUPPORT_EVIDENCE` and never institutional approval.

## C09-SEC dependency remediation — 2026-09-09

### Anchor and baseline

The isolated worktree was anchored at
`c5a0574e1e29299364a2cca6ec0b2bfdbc910429`, equal to `origin/main`, with zero
branch commits, a clean worktree and index, no upstream and no remote
`fix/c09-critical-dependencies` branch. Initial blobs were
`package.json=fbdad0f88243e4861876e60c4ec45d382ef7a973` and
`pnpm-lock.yaml=baa535e822b7a63649c37b674915004a43478a38`. PR #60 remained open, Draft,
unmerged and pinned to `2b1eb504419da413defe5000fb35c30a4038c459`; it was
not modified.

Initial `pnpm audit --prod --json` reported exactly **2 critical, 9 high and 3
moderate** advisories. The chains below are the exact `paths` reported by pnpm;
all affected packages are transitive except direct dependency `next`.

| Advisory / CVE | Severity | Installed; vulnerable; first fixed | Exact introduction chain | Applicable surface and phase | Official source |
| --- | --- | --- | --- | --- | --- |
| GHSA-38f7-945m-qr2g / CVE-2026-32887 | high | `effect` 3.18.4; `<3.20.0`; 3.20.0 | `.>@prisma/client>prisma>@prisma/config>effect` | Prisma configuration/CLI concurrency; build, migration and tooling, not application runtime | [Effect advisory](https://github.com/Effect-TS/effect/security/advisories/GHSA-38f7-945m-qr2g) |
| GHSA-qx2v-qp2m-jg93 / CVE-2026-41305 | moderate | `postcss` 8.4.31; `<8.5.10`; 8.5.10 | `.>next>postcss` | Next CSS processing; build path and possible generated style output. The repository does not call PostCSS with user-controlled CSS, but that absence was not treated as irrelevance | [PostCSS advisory](https://github.com/postcss/postcss/security/advisories/GHSA-qx2v-qp2m-jg93) |
| GHSA-f88m-g3jw-g9cj / CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 | high | `sharp` 0.34.5; `<0.35.0`; 0.35.0 | `.>next>sharp` | Optional Next image optimization runtime and native codec surface; no current `next/image` use was found, but framework/deployment exposure was not assumed absent | [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) |
| GHSA-6g55-p6wh-862q / CVE-2026-45623 | high | `postcss` 8.4.31; `<=8.5.11`; 8.5.12 | `.>next>postcss` | Next CSS/source-map processing; primarily build/tooling, with arbitrary-file-read impact if attacker-controlled CSS reaches the affected parser | [PostCSS advisory](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q) |
| GHSA-fxqj-rqcc-2cmp / CVE-2026-69153 | moderate | `postcss` 8.4.31; `<=8.5.22`; 8.5.23 | `.>next>postcss` | Incomplete source-map fix in Next CSS processing; build/tooling surface, without assuming untrusted input is impossible | [PostCSS advisory](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) |
| GHSA-2v37-7h3g-55p8 / CVE-2026-67213 | high | `nanoid` 3.3.17; `<3.3.18`; 3.3.18 | `.>next>postcss>nanoid` | PostCSS transitive identifier generation; build/tooling. The application does not invoke the affected custom size-zero API directly | [nanoid advisory](https://github.com/advisories/GHSA-2v37-7h3g-55p8) |
| GHSA-r28c-9q8g-f849 / CVE-2026-73646 | high | `postcss` 8.4.31; `<=8.5.17`; 8.5.18 | `.>next>postcss` | Previous source-map auto-loading in Next CSS processing; build/tooling file-read surface | [PostCSS advisory](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849) |
| GHSA-ggr8-5vv4-36mx / CVE-2026-40345 | high | `deepmerge-ts` 7.1.5; `<8.0.0`; 8.0.0 | `.>@prisma/client>prisma>@prisma/config>deepmerge-ts` | Prisma configuration merging; migration/build/tooling, not application runtime. Recursive attacker-controlled configuration graphs are not a public input in this repository | [deepmerge-ts advisory](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx) |
| GHSA-c83g-rgw3-j3cx / CVE-2026-73089 | high | `browserslist` 4.28.6; `<=4.28.6`; 4.28.7 | `.>next>styled-jsx>@babel/core>@babel/helper-compilation-targets>browserslist` | Babel/styled-jsx target resolution; build/tooling. Public runtime does not submit distinct Browserslist queries | [Browserslist advisory](https://github.com/browserslist/browserslist/security/advisories/GHSA-c83g-rgw3-j3cx) |
| GHSA-73wf-gq98-2v4g / CVE-2026-73088 | high | `browserslist` 4.28.6; `<=4.28.6`; 4.28.7 | `.>next>styled-jsx>@babel/core>@babel/helper-compilation-targets>browserslist` | Babel/styled-jsx target resolution; build/tooling. No untrusted `browserslist-stats.json` input is accepted by the application | [Browserslist advisory](https://github.com/browserslist/browserslist/security/advisories/GHSA-73wf-gq98-2v4g) |
| GHSA-p293-qw3h-jr36 / CVE-2026-75604 | critical | direct `next` 16.2.11; `>=16.0.0 <16.3.3`; 16.3.3 | `.>next` | Unauthenticated Windows-hosted server RCE; directly applicable if this Next server is exposed from Windows. Local Windows execution is not public-deployment qualification | [Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) |
| GHSA-w5vr-8v7q-w6rv / CVE-2026-45819 | moderate | `baseline-browser-mapping` 2.10.43; `>=2.0.0 <2.11.0`; 2.11.0 | `.>next>baseline-browser-mapping`; `.>next>styled-jsx>@babel/core>@babel/helper-compilation-targets>browserslist>baseline-browser-mapping` | Browser-target mapping used by Next and Babel; build/tooling. The application has no public API for this parser | [baseline-browser-mapping advisory](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) |
| GHSA-rgj7-g3m4-5g8c / no CVE assigned to the aggregate GHSA | high | `sharp` 0.34.5; `<0.35.4`; 0.35.4 | `.>next>sharp` | Optional Next image optimization runtime and native libheif surface; aggregate advisory references GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 | [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) |
| GHSA-2xp9-vwfh-vxw4 / no CVE assigned | critical | direct `next` 16.2.11; `>=16.0.0 <16.3.3`; 16.3.3 | `.>next` | Unauthenticated RCE through the Image Optimization API with AVIF input; direct runtime framework surface. No current `next/image` use was found, but deployment-level disablement was not demonstrated | [Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) |

### Minimal update and final audit

The supported direct updates are `next` 16.2.11 → 16.3.3 and both
`@prisma/client` and `prisma` 6.19.0 → 6.19.3. No production dependency,
override, allowlist or advisory suppression was added. Compatible lockfile
resolution selected `effect` 3.21.0, `postcss` 8.5.23, `nanoid` 3.3.18,
`sharp` 0.35.4, `baseline-browser-mapping` 2.11.21 and `browserslist` 4.28.9.

Final `pnpm audit --prod --json` reports **0 critical, 1 high and 0 moderate**:
a delta of **-2 critical, -8 high and -3 moderate**, with zero new advisories.
The remaining finding is GHSA-ggr8-5vv4-36mx / CVE-2026-40345 in
`deepmerge-ts` 7.1.5 through
`.>@prisma/client>prisma>@prisma/config>deepmerge-ts`. Prisma 6.19.3 declares
that version exactly; the available fix is major `deepmerge-ts` 8.0.0. Forcing
it with an override would be an unsupported compatibility assumption, while a
Prisma major migration would exceed this remediation. The high advisory remains
open and unaccepted under GAS2-R-022.

### Local validation

Validation used PostgreSQL 16.14 in an auto-remove ephemeral container, bound only to
`127.0.0.1:55440`, with tmpfs storage and no volume. The base was explicitly
recreated empty before migration validation and again before E2E.

| Command or evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| `pnpm install --frozen-lockfile` | PASS; exact corrected lock installed | 0 | Supply-chain policy check also passed |
| `pnpm prisma:generate` | PASS; Prisma Client 6.19.3 | 0 | No schema change |
| Empty PostgreSQL 16 + `pnpm db:migrate:deploy` | PASS; 0 initial public tables and 20/20 migrations applied | 0 | Synthetic, loopback, tmpfs only |
| `pnpm db:seed` and `pnpm db:migrate:status` | PASS; synthetic seed; schema up to date | 0 | Same isolated base |
| DB → Prisma migrate diff | PASS; no difference detected | 0 | `--to-schema-datamodel` comparison |
| `pnpm format:check` | PASS final | 0 | Final dependency and evidence delta included |
| `pnpm lint` | PASS | 0 | Static analysis |
| `pnpm typecheck` | PASS | 0 | Next type generation plus strict TypeScript |
| `pnpm test` | PASS; 556 unit + 120 integration + 35 tooling = 711/711 | 0 | Synthetic fixtures and PostgreSQL 16 |
| `pnpm traceability:check` | PASS; 14 requirements, 44 claims, Markdown/CSV drift 0 | 0 | Repository consistency, not external truth |
| Governance evidence checker | PASS; 44 claims and local references resolved | 0 | No institutional authorization inferred |
| `pnpm calle:boundary:check` | PASS; SDK absent, live entrypoint absent, network/helper surfaces absent | 0 | CALL-E remains disabled; zero live calls |
| `pnpm build` | PASS; Next 16.3.3, 18/18 static pages | 0 | Local build, not deployment qualification |
| `pnpm test:e2e -- --workers=1 --retries=0` | PASS; 83/83 in 6.7 min | 0 | Chromium/mobile Chromium; loopback; no retries |
| `pnpm audit --prod --json` | 0 critical, 1 high, 0 moderate | 1 expected | Remaining high is open, not accepted; audit is not a zero-vulnerability claim |
| `git diff --check` | PASS | 0 | Dependency and evidence delta only |
| Sensitive-data and artifact scans | Delta: E.164 0, emails 0, valid DNI/NIE 0, high-confidence secrets 0, C07 PHI markers 0; `.env` absent | 0 | Whole tracked tree retains two synthetic `.invalid` test emails; `gitleaks` unavailable, so no gitleaks PASS is claimed |
| Ephemeral cleanup | PASS; C09 container absent, port 55440 free, `.next` and `test-results` removed | 0 | P15 container ID/status, volume and network unchanged |

No functional code, Prisma schema, migration, auth, lifecycle, CALL-E, UI, E2E
or workflow file is changed by this remediation. It does not establish total
security, production readiness, clinical validation, institutional authorization
or public-deployment readiness.

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
| `prisma/schema.prisma` | `CODE` | 54 models, 42 enums, 136 `RESTRICT` relations | Schema alone does not prove deployed state |
| `prisma/migrations/**` | `DATABASE_CONSTRAINT` | 20-version history, FKs, uniques and triggers | Does not approve lifecycle policy |
| `20260715000100_platform_foundation` | `DATABASE_CONSTRAINT` | Immutable audit events | Retention/access procedure absent |
| `20260716000100_consent_legal_basis` | `DATABASE_CONSTRAINT` | Append-only legal history | Legal applicability pending |
| `20260716000200_discharge_episode` | `DATABASE_CONSTRAINT` | Episode/patient no-delete and transition history | Closure policy pending |
| `20260717000100_safety_plan_versioning` | `DATABASE_CONSTRAINT` | Safety Plan version immutability | Clinical content validation pending |
| `20260717000200_check_in_protocols` | `DATABASE_CONSTRAINT` | Protocol/assignment/outcome history | Cadence/content pending |
| `20260717000300_explainable_alerts` | `DATABASE_CONSTRAINT` | Rule/evaluation/alert/review invariants | Clinical rules pending |
| `20260720000100_nursing_workqueue_tasks` plus reconciliation migrations | `DATABASE_CONSTRAINT` | Task/Event chain and reviewed-alert link | Institutional task policy pending |
| `20260721000100_caregiver_access_revocation` | `DATABASE_CONSTRAINT` | Cross-reference integrity, revocation locks and history | Legal/IAM policy pending |
| `20260721000200_home_safety_and_sbar` | `DATABASE_CONSTRAINT` | Append-only Home Safety | Demo template only |
| `pnpm db:migrate:status` | `CI` | 20 migrations expected; execution evidence recorded below | Local synthetic DB only |

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
| `docs/decision-register.md` | `DOCUMENTATION` | DEC-001–19 authorities/status/blockers and P09/P12/C01 decision-support references | All remain pending; C01 only documents future sandbox gates, without selecting productive provider, approving terms or authorizing a call |
| `docs/decisions/**` | `DECISION_SUPPORT_EVIDENCE` | Seven prepared packs and workshop/form evidence | No approval |
| `docs/audit/gas2-final-prepilot-readiness-audit.md` — extensión P16A | `DOCUMENTATION` | Cinco niveles de readiness, matriz única de gates y protocolo de usabilidad exclusivamente sintética preparado para revisión humana | `READY_FOR_HUMAN_REVIEW` califica el paquete documental; no autoriza ejecución, participantes, piloto, datos reales o producción |
| `README.md`, build-week demo docs and UI copy | `DOCUMENTATION` | Synthetic/no-clinical-use limitations | Presentation qualifiers must remain attached |

<a id="call-e-c01--evidencia-documental-y-limites"></a>

## CALL-E C01 — evidencia documental y límites

Corte 2026-08-27. Base C01: `e1cf37f4088c30e03d8c47297359c1444fe1cbf4`;
[CI base 31901762633](https://github.com/Luis195f/guardian-alta-segura/actions/runs/31901762633)
verificado `completed/success` para ese SHA. El SHA es anclaje de inspección,
no commit de C01 ni prueba de la integración. En ese corte del 27-08-2026, C01
aún no se había commiteado ni publicado; la reconciliación posterior se registra
separadamente más abajo y no altera el alcance de esta evidencia histórica.

`C00_PREREQUISITE = SATISFIED_BY_HUMAN_REVIEW`;
`C00_REVIEW = ACCEPTED_FOR_C01_DOCUMENTATION_ONLY`. Los estados estáticos
`DIVERGENT`, live `NOT_RUN` y resultado del spike `DIVERGENT`, situados antes
de los anexos, fueron aceptados por revisión humana del proyecto solo para C01.
No se reproduce ni enlaza el informe privado/local, sus anexos, código o hashes.
No hay llamada probada, validación clínica, cumplimiento o riesgo aceptado.

### Reconocimiento y delta demostrado

| Capacidad | Evidencia actual | Delta demostrado por C00 | Documento canónico previsto |
| --- | --- | --- | --- |
| Comunicaciones paciente/profesional | ADR-0017 y schema sin voz ni recipientKind; no adapter | Contrato Calls inspeccionado; no capacidad operativa probada | ADR-0019, enlace mínimo ADR-0017 y ownership |
| Acción humana | Revisión/acción separadas en GAS; no confirmación de llamada | Nuevos gates de intención, preview, confirmación one-use y revisión aún por construir | ADR-0019; DEC-019 en decision register |
| Recuperación/cancelación | Sin transporte externo | create separado de wait, Call.id durable y GET; no cancelación API; replay incierto | ADR-0019; HAZ-GAS-021/022 |
| Destinatario/intentos | Sin destino operativo | XOR/cardinalidad local requeridos; singleton no limita attempts | ADR-0019; HAZ-GAS-024/025/028/032 |
| Webhooks/resultados | Sin integración | Sin firma actual; resultValidation ausente; structuredResult nullable y sin autoridad clínica | ADR-0019; HAZ-GAS-023/030/031 |
| Versión/regiones/términos | Sin paquete/configuración CALL-E | 0.6.0 inspeccionada, 0.7.0 no adoptada; ES observado, Chile no acreditado; términos pendientes | ADR-0019; DEC-019; HAZ-GAS-027/036/038 |
| Privacidad/demo | Sintético, loopback, historial y logs minimizados | Payloads externos excluidos de persistencia; demo pública live OFF, no mecanismo runtime implementado | ADR-0019; system boundary; README; HAZ-GAS-029/037 |
| Claims/hazards | 39 claims, 20 hazards previos; sin validación clínica | Una frontera documental, controles C02/C03 `IMPLEMENTED_UNVALIDATED` y 18 escenarios abiertos, sin prueba live ni controles clínicos efectivos | CLAIM-GAS2-038/039; Hazard Log; GAP-DCB-025; GAS2-R-021 |

No cambia ningún requisito canónico REQ-01–REQ-14. Markdown y CSV de requisitos
permanecen intactos; no se añade una matriz paralela de requisitos. Los números
de hazards y referencias del Safety Case se sincronizan sin emitirlo/aprobarlo.

### Fuentes y fuerza de evidencia

Son las fuentes públicas inspeccionadas por C00, con `verifiedAt=2026-08-27`
(tabla regional: `2026-08-27T18:35:50.6934815+02:00`). C01 documenta esa
observación aceptada; no repite el provider probe ni convierte URLs mutables en
configuración aprobada. Una fase futura debe revalidar fuentes y discrepancias.

| Fuente | Tipo / sostiene | Límite |
| --- | --- | --- |
| [Registry npm](https://registry.npmjs.org/@call-e%2Fcalle) y [tarball exacto 0.6.0](https://registry.npmjs.org/@call-e/calle/-/calle-0.6.0.tgz) | Inspección estática C00: versión y contrato del paquete | No versión estable oficial, licencia resuelta, instalación C01 ni comportamiento live |
| [Calls](https://docs.heycall-e.com/calls) y [OpenAPI](https://docs.heycall-e.com/openapi/calle.openapi.yaml) | Contrato documentado de creación/consulta, idempotencia, resultados y ausencia de cancelación | Fuentes mutables; sin garantías probadas de TTL, concurrencia, marcado único o entrega |
| [Webhooks](https://docs.heycall-e.com/webhooks) y [changelog](https://docs.heycall-e.com/changelog) | Entregas sin firma, contrato legado y Stop en Dashboard | Event-Id no autentica; helpers deprecados no verifican contrato actual; Dashboard no es Calls API |
| [Errors](https://docs.heycall-e.com/errors) y [SDKs](https://docs.heycall-e.com/sdks) | Clasificación de errores y divergencias documentales | Calls failure_code no equivale a enum de Goal Runs; no inventar resultValidation o motivo de null |
| [Regiones e idiomas](https://github.com/CALLE-AI/call-e-integrations#supported-regions-and-languages) | ES, prefijo +34, español/inglés, International; Chile no figuraba en el corte | No prueba cuenta, crédito, carrier, autorización de destino ni éxito; ningún número completo se incorpora |
| `docs/adr/0019-calle-hackathon-sandbox-boundary.md` | `DOCUMENTATION`: frontera, decisiones derivadas y gates humanos futuros | Runtime/controles live `NOT_IMPLEMENTED`; demo pública `LIVE OFF`; piloto/producción `NO_GO` |
| [Hazard Log](../clinical-safety/dcb0129/hazard-log-initial.md#ampliacion-c01--call-e-solo-diseno) | `DOCUMENTATION`: 18 escenarios nuevos HAZ-GAS-021–038, causas/controles/autoridades | Provisionales; sin estimación, aceptación, CSO ni verificación clínica |

### Validación local C01

Las referencias ADR se conservan como identificador/ruta, siguiendo las filas
ADR-0017/0018 del índice. El fixture de tooling copia solo un subconjunto fijo
de documentos, no los ADR; no se modifica ese fixture en C01. La comprobación
adicional de enlaces, anchors y rutas documentales se ejecuta sobre el worktree
completo para verificar también ADR-0019. Tooling por sí solo no acredita esa
cobertura adicional.

La suite actual prueba GAS sintético, no CALL-E. E2E queda `NOT_EXECUTED`
porque el delta es exclusivamente documental: no cambian runtime, dependencias,
configuración, scripts, fixtures ni tests. No se atribuye E2E PASS ni se sustituye
la integración por las pruebas unitarias/tooling.

| Comando / comprobación | Resultado real | Exit | Alcance / límite |
| --- | --- | --- | --- |
| `git fetch origin --prune` en la primera comprobación C01 | Falló por permisos; repetición autorizada correcta | 1 → 0 | Sin rebase ni adaptación de base |
| `git ls-remote --heads origin refs/heads/docs/calle-hackathon-boundary-c01 refs/heads/main` | Solo main en la base exacta; C01 remoto ausente | 0 | Revalidación de reanudación y cierre |
| `gh run view 31901762633 --repo Luis195f/guardian-alta-segura --json databaseId,headSha,status,conclusion,url` | CI base completed/success y SHA exacto | 0 tras fallo de permisos 1 | Consulta ya realizada en la fase inicial; no CI de un commit C01 |
| `pnpm install --frozen-lockfile` | 409 paquetes reutilizados, 0 descargados; pnpm 11.7.0; sin cambios de lock | 1 por Corepack en sandbox → 0 autorizado | Solo dependencias existentes, no CALL-E |
| `pnpm prisma:generate` | Prisma Client 6.19.0 generado | 1 por Corepack en sandbox → 0 autorizado | Sin cambio de schema/migración; no prueba conectividad DB |
| `pnpm format:check` | Primer intento detectó README; corregido con Prettier; repetición PASS | 1 → 0 | `docs` está excluido por configuración existente; tablas/enlaces se comprueban adicionalmente |
| `pnpm lint` | PASS | 0 | Sin cambios de reglas |
| `pnpm typecheck` | PASS | 0 | Next typegen y TypeScript |
| `pnpm test` | 401/401 unitarias PASS; 103/103 integración fallan, 12 archivos, por PostgreSQL inaccesible en loopback:55431 | 1 | No prueba regresión funcional ni comportamiento PostgreSQL; etapa tooling no alcanzada dentro del agregado |
| `pnpm test:tooling` separado | Primer intento 25/26 por enlaces ADR fuera del fixture; convención documental corregida; repetición 26/26 PASS | 1 → 0 | Tests y fixture intactos; cobertura adicional de rutas verificada aparte |
| `pnpm traceability:check` | PASS; REQ-01–14 equivalentes y 38 claims | 0 | Drift Markdown/CSV 0; no validación clínica |
| `node scripts/check-governance-evidence.mjs` | PASS; 38 claims, taxonomía y referencias | 0 | Checker canónico, no modificado |
| Comprobación adicional Node en memoria de enlaces/anchors/rutas/tablas y delta | PASS; 13 documentos, 62 enlaces locales, 4 anchors, 82 rutas literales, 38 hazards y 38 claims | 0 | Sin guardar scripts; sin revalidar fuentes públicas mutables de C00 |
| `pnpm build` | PASS; compilación y 18/18 páginas estáticas | 0 | Variables sintéticas de proceso y telemetría desactivada; no despliegue |
| `git diff --check` | PASS | 0 | Delta documental sin errores de whitespace |
| `pnpm audit --prod --json` | 6 high + 2 moderate heredados; sin cambio de dependencias C01 | 1 | No se acepta ni remedia el riesgo en esta rama |
| `pnpm test:e2e` | `NOT_EXECUTED` | — | Exención documental explícita; no PASS |
| Comprobación de integridad C00 y stage en modo lectura | Checksum idéntico al inicio de reanudación; informe solo untracked; stage vacío | 0 | No se publica checksum, contenido ni ruta local |
| Verificación de procesos/puerto al cierre | Cero procesos asociados a ruta C01, cero procesos Docker y cero listeners en 55431; sin `.env` | 0 | Sin matar procesos ni tocar recursos ajenos |

Los fallos de entorno se repitieron con autorización cuando el sandbox impedía
Corepack/Git/Docker. Un lote exploratorio de PowerShell tuvo un error de sintaxis;
una lectura exploratoria apuntó a un nombre de seed inexistente; no se usaron
como evidencia de PASS. El primer comprobador ad hoc contó referencias P10
adicionales como duplicados de hazards: se corrigió para comprobar por separado
resumen, detalle y matriz canónicos. El checker del repositorio no se alteró.

### Bloqueo de PostgreSQL y recursos C01

El daemon Docker no estaba disponible. `docker desktop start --detach` y el
inicio directo autorizado de Docker Desktop con ventana oculta devolvieron 0,
pero **no** acreditaron readiness: las consultas del daemon terminaron con
exit 1. WSL mostró docker-desktop detenido. No se modificó Docker/WSL ni se
intentó reparación, reset, reinstalación o eliminación de recursos ajenos.

No se llegó a crear base, contenedor, red ni volumen C01; no se usó P15 ni otra
base. La URL de tests apuntó exclusivamente al puerto local reservado 55431,
comprobado libre. Base vacía PostgreSQL 16, despliegue de las 14 migraciones,
seed y estado de migración: **NOT_EXECUTED / BLOCKED**. Los errores de la suite
fueron de inicialización/conexión, sin evidencia de las invariantes DB.

Limpieza: no hay recursos C01 creados que eliminar; todas las sesiones de
comandos finalizaron, no quedan procesos C01 ni Docker y el puerto está libre.
No se emitió ningún comando de creación, modificación o eliminación de recursos
Docker/P15. El daemon inaccesible impidió inventariar sus recursos persistentes;
no se afirma que no existan recursos ajenos. `node_modules` y `.next` son
artefactos locales ignorados de validación, no servicios activos ni delta Git.

Estado de salida: frontera CALL-E **DOCUMENTED**, integración **NOT_IMPLEMENTED**,
validación completa C01 **BLOCKED** por PostgreSQL no disponible. Se conserva
la rama original, HEAD en la base, stage vacío, upstream ausente y cero commits
C01; únicamente 13 documentos cambiados. Cero llamadas, números completos,
secretos añadidos o publicaciones. C00 intacto; ningún riesgo aceptado.
Siguiente paso: recuperar Docker fuera de este delta y, con nueva revisión
humana, repetir validación sobre PostgreSQL 16 vacío, sintético y desechable,
con contenedor/red/puerto exclusivos y sin volumen persistente. No iniciar
C02/C10 ni publicar C01.

### Recuperación y revalidación C01 — 2026-08-27

El fallo ambiental inicial se conserva íntegro en la subsección anterior. En
esta reanudación, `docker version` y `docker info` confirmaron cliente y servidor:
Docker Desktop 4.65.0, Engine 29.2.1 y contexto `desktop-linux`. La comprobación
aislada inicial no tuvo permisos para leer la configuración ni el pipe de
Docker; la repetición autorizada devolvió exit 0 y
`DOCKER_SERVER_READY=29.2.1`. No se efectuó reparación, reset, reinstalación,
prune ni modificación de Docker/WSL.

Antes de crear recursos C01 se inventariaron el contenedor P15 detenido
`gas-p15-postgres-1`, la red `gas-p15_default` y el volumen persistente
`gas-p15_guardian_postgres_data`. No se iniciaron, detuvieron, conectaron,
montaron ni utilizaron. El puerto 55431 estaba libre y no existían contenedores,
redes ni volúmenes de la revalidación C01.

Se creó el proyecto lógico exclusivo `gas-calle-c01-validation-20260827`, con
la red `gas-calle-c01-validation-20260827-net` y el contenedor
`gas-calle-c01-validation-20260827-postgres`. El contenedor publicó PostgreSQL
solo en `127.0.0.1:55431`, utilizó credenciales locales sintéticas y montó
`/var/lib/postgresql/data` mediante `tmpfs`; `docker inspect` mostró `Mounts=[]`,
por lo que no se creó ni montó un volumen persistente.

| Comando / comprobación de recuperación | Resultado observado | Exit | Alcance / límite |
| --- | --- | ---: | --- |
| `docker exec ... psql ... 'SHOW server_version;'` | PostgreSQL 16.14 | 0 | Instancia C01 temporal y exclusiva |
| Consulta inicial de tablas en `public` | 0 | 0 | Base vacía antes de migraciones |
| `pnpm prisma:generate` | Prisma Client 6.19.0 generado | 1 por Corepack en sandbox → 0 autorizado | Sin cambios de schema ni dependencias |
| `pnpm db:migrate:deploy` | 14 migraciones encontradas y 14 aplicadas | 0 | La consulta posterior de `_prisma_migrations` confirmó 14 finalizadas y no revertidas; 51 tablas públicas resultantes |
| `pnpm db:seed` | PASS | 0 | Seed canónico exclusivamente sintético; sin datos CALL-E ni reales |
| `pnpm db:migrate:status` | `Database schema is up to date!`; 14 migraciones | 0 | Misma base temporal C01 |
| Primera ejecución completa de `pnpm test` tras recuperar PostgreSQL | PASS: 401/401 unitarias, 103/103 integraciones y 26/26 tooling | 0 | GAS sintético; no prueba CALL-E ni sustituye E2E |
| `pnpm audit --prod --json` previo a la evidencia final | 6 high + 2 moderate heredados; 0 critical/low/info | 1 | Grafo fijado e intacto; no aceptación ni remediación |

La validación posterior a la primera edición de esta subsección produjo los
resultados siguientes. La comprobación documental en memoria usó un matcher de
ficheros literales más amplio que el comprobador inicial de 82 rutas y, por
tanto, sus 97 ocurrencias no sustituyen ni reinterpretan aquel recuento; ambos
validaron que sus respectivos targets existían.

| Comando / comprobación final | Resultado observado | Exit | Alcance / límite |
| --- | --- | ---: | --- |
| `pnpm format:check` | PASS | 0 | Incluye esta evidencia canónica; `docs` conserva la exclusión existente de Prettier |
| `pnpm lint` | PASS | 0 | Sin cambios de reglas ni runtime |
| `pnpm typecheck` | PASS; Next typegen y TypeScript | 0 | Sin inferir comportamiento CALL-E |
| Segunda ejecución completa de `pnpm test` | PASS: 401/401 unitarias, 103/103 integraciones y 26/26 tooling | 0 | PostgreSQL C01 sintético; tests, timeouts, retries, puertos, aserciones y configuración intactos |
| `pnpm test:tooling` separado | PASS: 26/26 | 0 | Fixture y scripts intactos; no acredita por sí solo ADR-0019 |
| `pnpm traceability:check` | PASS; REQ-01–14 equivalentes y 38 claims | 0 | `TRACEABILITY_DRIFT = 0`; no validación clínica |
| `node scripts/check-governance-evidence.mjs` | PASS; 38 claims y referencias locales resueltas | 0 | Checker P11 canónico, no modificado |
| Comprobación Node en memoria de enlaces, anchors, rutas, tablas y delta | PASS; 13 documentos, 62 enlaces locales, 4 anchors, 97 ocurrencias de rutas literales de fichero y 103 tablas; resumen/detalle/matriz con 38 hazards cada uno y 38 claims | 0 | Sin guardar scripts ni consultar fuentes públicas mutables; dos intentos previos con falsos positivos no se usan como PASS |
| `pnpm build` | PASS; compilación y 18/18 páginas estáticas | 0 | Variables sintéticas de proceso, telemetría desactivada y sin despliegue |
| `git diff --check` | PASS | 0 | Sin errores de whitespace; avisos informativos LF/CRLF no alteraron archivos |
| `pnpm audit --prod --json` | 6 high + 2 moderate heredados; 0 critical/low/info | 1 | Dependencias y lockfile intactos; no aceptación ni remediación |
| `pnpm test:e2e` | `NOT_EXECUTED` | — | Delta final exclusivamente documental; no se atribuye PASS |

La limpieza eliminó únicamente el contenedor y la red C01 después de comprobar
su etiqueta de propiedad. El almacenamiento `tmpfs` desapareció con el
contenedor: quedaron cero contenedores, redes y volúmenes C01, cero procesos
asociados al worktree y cero listeners en 55431. `.env` permanece ausente. La
comparación estructurada del inventario P15 confirmó sin cambios su contenedor
detenido, red, volumen, identificadores, estado, montajes y etiquetas. El
informe local C00 conserva su SHA-256, sigue siendo el único untracked de C00 y
su stage continúa vacío; no se publica su ruta, contenido ni checksum.

El delta final continúa limitado a los 12 documentos modificados y ADR-0019
nuevo: runtime, Prisma, dependencias, configuración, scripts, fixtures y tests
permanecen intactos. Se mantienen `CALL_E_RUNTIME = NOT_IMPLEMENTED`,
`LIVE_CALLS = NOT_EXECUTED`, `REAL_CLINICAL_PILOT = NO_GO`,
`REAL_DATA_PRODUCTION = NO_GO`, `RESIDUAL_RISK_ACCEPTANCE = NONE` y
`TRACEABILITY_DRIFT = 0`. Resultado contractual definitivo:
`C01_RESULT = PASS`. En ese corte no se publicó C01 ni se inició C02/C10.

### Advisories de dependencias existentes — C01

`pnpm audit --prod --json` devolvió exit 1: **6 high + 2 moderate**, sin critical,
low o info. Son hallazgos del grafo ya fijado; `package.json` y `pnpm-lock.yaml`
permanecen idénticos a la base. Atribuibles a cambios de dependencias C01: cero;
no equivale a aceptación ni prueba de que sean inexplotables. Se requiere una
revisión posterior de dependencias, fuera del alcance documental C01.

| Advisory | Paquete observado | Severidad reportada por audit |
| --- | --- | --- |
| [GHSA-38f7-945m-qr2g](https://github.com/advisories/GHSA-38f7-945m-qr2g) | effect 3.18.4 | high |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | postcss 8.4.31 | moderate |
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | sharp 0.34.5 | high |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | postcss 8.4.31 | high |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | postcss 8.4.31 | moderate |
| [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | nanoid 3.3.17 | high |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | postcss 8.4.31 | high |
| [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | deepmerge-ts 7.1.5 | high |

### Reconciliación C01 sobre P16A — 2026-08-28

El delta C01 se preservó primero en el commit local
`94f90a00c8467555f90ed50dcf3f2a169a56cc2e` sobre la base antigua
`e1cf37f4088c30e03d8c47297359c1444fe1cbf4`. Después se rebaseó su único commit
sobre P16A, `a28cdb5e1300f61e76e09e1ca6938475d3c768cb`. El único fichero modificado por
ambas líneas fue este índice; Git lo compuso sin conflicto textual y no apareció
solapamiento fuera de él. La revisión humana posterior confirmó que las dos
evidencias permanecen presentes y no duplicadas.

La subsección P16A conserva abajo su fotografía de 37 claims y 5 high +
2 moderate observados en aquel corte. Las subsecciones C01 conservan su estado
posterior de 38 claims y 6 high + 2 moderate observados antes del rebase. Esos
recuentos son históricos y no se sustituyen entre sí. La validación PostgreSQL
C01 de 530/530 permanece como evidencia previa, no como ejecución post-rebase.
El audit actual y el CI del commit reconciliado deben registrarse por separado;
ningún advisory se acepta y los atribuibles a cambios de dependencias C01 son
cero porque C01 no modifica `package.json` ni `pnpm-lock.yaml`.

La publicación permitida tras esta reconciliación se limita a una rama y Draft
PR para revisión humana. No marca Ready, no fusiona y no autoriza C02/C10,
runtime CALL-E, llamadas, datos reales, piloto, producción ni aceptación de
riesgo. La integración y E2E post-rebase quedan pendientes del CI remoto.

<a id="call-e-c02-rest--adapter-deshabilitado"></a>

## CALL-E C02 REST — adapter deshabilitado y sin entrypoint

Corte contractual: 2026-08-29. Base y HEAD anclados en
`8a539159427e1bf57f0c66092ecbd2d3ba0400f1`; `origin/main` idéntico antes de
editar. El intento SDK previo terminó `BLOCKED_BY_LICENSE` sin delta: el paquete
`@call-e/calle` permanece ausente de manifest y lockfile. La decisión humana
posterior autorizó código original del proyecto contra REST oficial, no el SDK.

### Evidencia primaria REST y snapshot efímero

| Evidencia | Observación fechada | Límite |
| --- | --- | --- |
| [OpenAPI oficial CALL-E](https://docs.heycall-e.com/openapi/calle.openapi.yaml) | Descargado `2026-08-29T21:21:13.4674376+02:00`; 63 998 bytes; SHA-256 `ccd47cc490afa12ef75d01c6c95be5c39a5051f0185dade886a8635d0f105ca5`; OpenAPI 3.1.0, `info.version: 0.6.0` | Lectura estática; temporal eliminado; no vendorizado; no prueba live |
| [Referencia oficial Calls](https://docs.heycall-e.com/api-reference/calls) | Bearer, creación y consulta de llamadas | Documentación mutable; el adapter se limita al OpenAPI verificado |
| [Repositorio oficial de integraciones](https://github.com/CALLE-AI/call-e-integrations) | Base `https://api.heycall-e.com`; API como modo de integración | No se copia código ni se infieren capacidades fuera de Calls |
| [Reglas oficiales del hackathon](https://call-e.devpost.com/rules) | Permiten proyectos que usen CALL-E API o SDK y exigen trabajo original/autorizado | No resuelven la licencia del paquete SDK ni autorizan llamadas/datos reales |
| [Términos del servicio CALL-E](https://www.heycall-e.com/terms-of-service/) | Términos vigentes consultados el 29-08-2026; incluyen servicios/API y obligaciones del usuario | No se ofrece conclusión jurídica definitiva ni se infiere licencia del tarball |

La superficie C02 confirmada es exclusivamente `POST /v1/calls` y
`GET /v1/calls/{call_id}`. La creación requiere task y admite
`recipients[].phones[]`, region/locale; C02 restringe cardinalidad a 1/1 y omite
schema, metadata y webhook. La respuesta mínima requiere `id`; los estados
allowlisted son queued, in_progress, completed, failed y canceled. El contrato
global también documenta superficies fuera de alcance que no se usan.

### Evidencia implementada

| Control técnico | Implementación / prueba | Estado honesto |
| --- | --- | --- |
| Port neutral y orquestación | `src/application/ports/outbound-call.ts`; `src/application/outbound-call/execute-outbound-call.ts`; prueba de orden, replay, conflicto y concurrencia | `IMPLEMENTED_UNVALIDATED`; application no conoce URL, header ni schema CALL-E |
| Adapter REST server-only | `src/infrastructure/call-transport/call-e-rest-adapter.ts`; config/runtime lazy y guard server-only en el mismo directorio | `IMPLEMENTED_DISABLED`; base fija, redirects rechazados, timeout de request máximo 30 s, respuesta máxima 64 KiB, flag default false y sin entrypoint |
| Fingerprint protegido | `src/infrastructure/call-transport/keyed-call-fingerprint.ts` | HMAC-SHA-256 keyed server-only, clave mínima 32 bytes y comparación constante; no hash simple del teléfono |
| Persistencia mínima | `prisma/schema.prisma`; migración `20260829000100_calle_rest_disabled_adapter`; `prisma-outbound-call-intent-store.ts` | Intención, idempotencyRef, fingerprint, providerRef, estado/código técnico, reconciliación y timestamps; eventos append-only, claim atómico y estados terminales no regresivos; sin payload/contenido |
| Mapper y errores | Pruebas `call-e-rest-adapter.test.ts` | Allowlist; null = abstención; respuestas acotadas; cuerpos, mensajes y campos sensibles descartados |
| Ausencia de superficies live | `scripts/check-calle-rest-boundary.mjs`; bloqueo global de dominios en `tests/support/block-call-e-network.ts` | SDK, helper de creación/espera, webhook, Goals, batch, UI/API/action y red real ausentes |

No hay `providerRef` antes de una aceptación externa; por tanto la brecha entre
POST aceptado y persistencia local no puede eliminarse transaccionalmente. El
claim atómico impide un segundo POST local; si esa brecha falla queda
`UNCERTAIN / REVIEW_REQUIRED`, sin recreación. Un recipient no prueba un único
intento físico. El adapter no valida identidad, autorización, contenido de voz,
retención del proveedor, comprensión, seguridad clínica o eficacia.

La revisión de publicación del 30-08-2026 corrigió antes del commit cinco bordes
fail-closed: redirects externos, límite de cuerpo de respuesta, comparación HMAC
constante, máximos de polling y no regresión concurrente de estados terminales.
No añadió rutas, dependencias, reintentos de POST ni capacidad live.

### Validación C02

Entorno PostgreSQL final exclusivo: contenedor
`gas-calle-c02-publication-postgres`, red
`gas-calle-c02-publication-net`, PostgreSQL 16.14, loopback 55432 y
almacenamiento tmpfs sin volumen. `.env` permaneció ausente; los comandos
recibieron exclusivamente configuración sintética efímera de proceso.

| Comando/comprobación | Resultado | Exit | Nota |
| --- | --- | --- | --- |
| `pnpm install --frozen-lockfile` | Already up to date; pnpm 11.7.0 | 0 | Manifest/lock sin cambios ni SDK |
| `pnpm prisma:generate` | Prisma Client 6.19.0 generado | 0 | Schema C02 válido |
| `pnpm db:migrate:deploy` | 15/15 migraciones aplicadas desde base vacía | 0 | Incluye `20260829000100_calle_rest_disabled_adapter` |
| `pnpm db:seed` | Seed ejecutado | 0 | Exclusivamente sintético |
| `pnpm db:migrate:status` | Database schema is up to date | 0 | PostgreSQL 16.14 en 55432 |
| `pnpm format:check` / `pnpm lint` / `pnpm typecheck` | PASS / PASS / PASS | 0 / 0 / 0 | Sin relajación de configuración |
| `pnpm test` | 435 unitarias + 107 integración + 29 tooling = 571 PASS | 0 | Red CALL-E bloqueada; incluye límites, redirects, HMAC y estado terminal |
| `pnpm traceability:check` | 14 requisitos, 38 claims y Markdown/CSV coherentes | 0 | Drift cero |
| Governance y boundary checkers | PASS / PASS | 0 / 0 | SDK/entrypoint/superficies prohibidas ausentes |
| `pnpm build` | Next 16.2.11; 18 páginas estáticas; sin ruta CALL-E | 0 | Runtime C02 no expuesto |
| `pnpm test:e2e` final | 74/74 PASS; artefacto `status: passed`, cero fallos | 0 | Chromium y mobile Chromium; loopback; warning informativo NO_COLOR/FORCE_COLOR |
| `pnpm audit --prod --json` | 6 high + 2 moderate + 0 critical | 1 | Baseline C01 exacto; cero dependencia/advisory atribuible a C02 |
| Escaneo final de 386 archivos | 0 teléfonos E.164 completos; 0 asignaciones secretas CALL-E; 0 claves `sk-*` de alta confianza | 0 | La búsqueda inicial amplia confundía la cadena inglesa `risk-`; patrón refinado, cero secretos |

El primer `prisma:generate` prevalidación y el primer Prettier dirigido devolvieron
1 por límites locales no atribuibles al delta: Corepack no podía leer su estado
fuera del sandbox, y Prettier no tiene parser para Prisma/`.env`. Se repitieron
con el permiso mínimo, `prisma format` y targets compatibles, todos PASS. La
prueba de integración inicial devolvió 1 porque su teardown intentó borrar el
evento que el trigger append-only protege; se corrigió el aislamiento sin
debilitar el trigger y pasó 3/3.

El contenedor y la red C02 se eliminaron; no existieron volúmenes persistentes.
Puerto 55432 quedó libre y `.env` recuperó su ausencia inicial. Ninguna suite
contactó CALL-E. Cero claves, números reales, cuentas, créditos, webhooks,
recursos o llamadas fueron usados.

<a id="call-e-c03--continuity-relay-core-interno"></a>

## CALL-E C03 — Continuity Relay core interno y desactivado

Corte contractual: 2026-08-30. Base, HEAD y `origin/main` anclados en
`893cb8b0b555d59128369d965d3b908d942ae414`; PR C02 #51 merged y run
33328317143/job 99302289540 `completed/success` para ese SHA. C03 permaneció sin
upstream, rama remota, commit o stage antes de editar.

| Control C03 | Implementación / prueba | Límite honesto |
| --- | --- | --- |
| Tipos y parejas | `src/domain/relay/continuity-relay.ts`; tests negativos de cruce | Solo PATIENT + PATIENT_CALLBACK_OFFER y PROFESSIONAL + PROFESSIONAL_REVIEW_REQUEST |
| Autoridad server-side | Port `continuity-relay.ts`; adapter `UnavailableRelayAuthorityResolver`; actor por `RelayActorContext` | El modelo no contiene voz/region/locale/Line Region/attestation canónicos; runtime deny-all, fakes solo test-only |
| Preview | `ContinuityRelayService.preview`; policy obligatoria sin default productivo | Cero red/CALL-E; mask, referencias opacas, task contract, fingerprint, revision y expiración sintética; el aviso de no cancelación está presente solo en el contrato sintético de preview, sin UI |
| Confirmación | CSPRNG 256-bit, SHA-256 del token, HMAC del binding y CAS PostgreSQL | Token nunca en claro en DB/audit; consumo previo al executor; policy/attestation productivas `PENDING_LOCAL_DECISION` |
| Lifecycle | `RelayAttempt/RelayEvent`; migraciones `20260830000100_continuity_relay_core` y `20260830000200_continuity_relay_review_guards` | Solo estados técnicos y revisión registrada; eventos por estado únicos y atribución de revisión inmutable; no duplica payload/estado CALL-E ni otorga autoridad clínica |
| Composición C02 | Executor inyectado después del consumo; `OutboundCallIntent/Event` sigue siendo fuente del transporte | Runtime C02 sigue disabled; sin entrypoint, llamada, retry POST, webhook, batch o fan-out |
| Privacidad/auditoría | columnas allowlisted, triggers append-only y AuditEvent minimizado | Sin teléfono, mask, token, prompt, transcript, summary, evidence, payload, metadata o contenido clínico |

La comprobación con PostgreSQL 16 desechable en loopback 55433 aplicó 17/17
migraciones desde vacío, ejecutó el seed sintético y confirmó schema al día. La
primera ejecución dirigida descubrió un fixture de 7 días incompatible con la
regla canónica 30/60/90; se corrigió a 30 sin relajar el dominio y la repetición
pasó 9/9.

La revisión final de publicación rechazó `taskRef` en las solicitudes públicas
de preview y confirmación: el cliente solo aporta `episodeRef` opaco y cualquier
contexto de tarea profesional se deriva de la autoridad server-side, se persiste
minimizado y se revalida desde ese snapshot. La prueba unitaria adicional cubre
derivación profesional y rechazo del override. La misma revisión confirmó que la
frase ajena del informe previo no estaba en el delta C03 y precisó que el aviso
de no cancelación está presente solo en el contrato sintético de preview, sin UI.

### Validación C03

| Comando/comprobación | Resultado real | Exit | Nota |
| --- | --- | --- | --- |
| `pnpm install --frozen-lockfile` | Already up to date; pnpm 11.7.0 | 0 | Manifest/lock sin cambios; SDK ausente |
| `pnpm prisma:generate` | Prisma Client 6.19.0 generado | 0 | Schema C03 válido |
| `pnpm db:migrate:deploy` | 17/17 migraciones desde base vacía | 0 | Incluye el core `20260830000100_continuity_relay_core` y el hardening aditivo `20260830000200_continuity_relay_review_guards` |
| `pnpm db:seed` / `pnpm db:migrate:status` | Seed sintético / schema al día | 0 / 0 | PostgreSQL 16 en loopback 55433 y tmpfs |
| Prisma migrate diff DB→schema | No difference detected | 0 | La primera invocación usó una opción 6.19 inexistente; la repetición con sintaxis soportada pasó |
| `pnpm format:check` / `pnpm lint` / `pnpm typecheck` | PASS / PASS / PASS | 0 / 0 / 0 | Fallos intermedios de formato y firmas test-only corregidos sin relajar configuración |
| `pnpm test` | 450 unitarias + 116 integración + 29 tooling = 595 PASS | 0 | Incluye 24 unit dirigidas y 9 integración C03; red CALL-E bloqueada |
| `pnpm test:tooling` | 29/29 PASS | 0 | Checker rechaza SDK, superficies y entrypoint Relay/CALL-E |
| Trazabilidad / governance / CALL-E boundary | 14 requisitos, 39 claims, referencias resueltas y boundary PASS | 0 / 0 / 0 | Drift Markdown/CSV cero; HAZ-GAS-021–038 continúan abiertos |
| Referencias Markdown locales | Todos los targets bajo `docs` resueltos | 0 | Comprobación read-only de enlaces relativos |
| `pnpm build` | Next 16.2.11; 18 páginas estáticas | 0 | Sin ruta Relay/CALL-E |
| `pnpm test:e2e` | Repetición final limpia: 74/74 PASS en 6.6 min | 0 | Una repetición intermedia sobre la DB ya mutada dio 73/74 por orden de auditorías heredado; se recreó solo `guardian_c03`, se reaplicaron 17/17 + seed y pasó sin cambiar pruebas ni configuración; warning NO_COLOR/FORCE_COLOR informativo |
| `git diff --check` | PASS | 0 | Solo warnings informativos LF/CRLF de autocrlf |
| `pnpm audit --prod --json` | 6 high + 2 moderate + 0 critical | 1 | Baseline C02 exacto; manifest/lock intactos, cero advisory atribuible a C03 |
| Escaneo final de 411 archivos versionados o nuevos | 0 E.164 completos; 0 secretos reales o no clasificados; 0 claves `sk-*` de alta confianza; 0 columnas prohibidas en schema, SQL y DB aplicada | 0 | Dos emails `.invalid` heredados en tests y credenciales C02 explícitamente sintéticas; cero dato real |

No se usó ni creó `.env`. Ninguna suite dispuso de credencial o entrypoint y el
bloqueo global de dominios CALL-E permaneció activo. No hubo número completo,
cuenta, crédito, llamada, request ni tráfico real CALL-E. La limpieza final del
contenedor/red/puerto C03 se confirma en el informe de entrega.

<a id="call-e-c04--patient-relay-sintetico"></a>

## CALL-E C04 — Patient Relay y fixture técnico sintéticos

Corte contractual: 2026-09-01; revisión independiente final: 2026-09-02. Base,
HEAD y `origin/main` anclados en
`7614195020733a5c7fab4ec3c9a85b7b4df7cf31`, árbol
`f87e05fc63b974355bde758eb071f1d96620b1ae`; PR C03 #52 merged y run
33519644679/job 99895351346 `completed/success` para ese SHA. C04 permaneció sin
upstream, rama remota, commit o stage antes de editar.

| Control C04 | Implementación / prueba | Límite honesto |
| --- | --- | --- |
| Entrada y autoridad | API demo bajo el episodio, sesión/RBAC/scope existentes y `SyntheticDemoPatientRelayAuthority`; solicitudes con cuerpo cerrado | Solo fixture demo marcado sintético; `UnavailableRelayAuthorityResolver` continúa deny-all para runtime no sintético; no autoridad institucional |
| Preview y confirmación | UI `PatientRelayPanel`, preview C03 sin executor/red, token solo en cookie HttpOnly, SameSite Strict y path del Relay exacto; CAS one-use | Sin saldo/precio ni cancelación API; confirmación no autoriza llamada real |
| Task contract | `synthetic-patient-relay-v1`, allowlist estática ordenada sin texto clínico ni prompt libre | Especifica límites esperados; no ejecuta ni prueba conversación, voz, modelo o proveedor |
| Result schema | Cuatro enums obligatorios, `additionalProperties=false`; null/malformado se abstiene y `unknown` permanece unknown | Fixture técnico predeterminado y normalizado, no observación conversacional ni decisión clínica; completed no equivale a resultado válido |
| Ejecución | `LocalSyntheticPatientRelayProvider`, sin `fetch` ni adapter CALL-E; checker limita la excepción a cinco rutas exactas y rechaza transporte; carrera concurrente prueba una ejecución | Determinista y local; devuelve un fixture predeterminado sin número real, cuenta, crédito, conversación, proveedor o red CALL-E |
| Revisión humana | Estado técnico separado y acción posterior autorizada; tests verifican invariancia de Task y RoleAssignment | Revisado no significa aprobado, seguro, resuelto ni clínicamente validado |
| Privacidad/auditoría | Resultado normalizado en enums; eventos mínimos; escaneo de columnas y UI/E2E | Sin teléfono completo, token, contract, resultado crudo, prompt, transcript, summary, evidence o payload |

C04 añade una migración aditiva mínima porque el store C03 no podía reconstruir
de forma durable la validez ni los cuatro enums después de recargar. Un CHECK
cerrado y un trigger de inmutabilidad impiden resultados parciales o reescritos.
No se modifican `Task`, `RoleAssignment`, consentimiento, notas clínicas ni el
modelo de contacto del paciente.

`SYNTHETIC_FIXTURE_DISPLAY = PASS`. El E2E prueba presentación del fixture,
persistencia normalizada, lifecycle, one-use/carrera, RBAC, ausencia de red y
teléfono expuesto, e invariancia de Task/RoleAssignment. No prueba una respuesta
conversacional: `VOICE_CONTAINMENT = NOT_TESTED`,
`WRONG_RECIPIENT_DISCLOSURE_LIVE = NOT_TESTED` y
`CLINICAL_ADVICE_LIVE = NOT_TESTED`.

La validación final usa PostgreSQL 16 exclusivo en loopback 55434 y tmpfs. Los
recuentos y exits reales, incluida la recreación previa a E2E y el audit heredado,
se resumen a continuación. `CONTAINMENT_REHEARSAL = NOT_RUN`:
`CALL_E_REST_ENABLED` permanece ausente/false, no se usa `CALL_E_API_KEY`, no se
solicita teléfono y no se ejecuta ninguna llamada.

| Comando/comprobación | Resultado real | Exit |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` / `pnpm prisma:generate` | Lock al día; Prisma Client 6.19.0 | 0 / 0 |
| Migraciones / seed / status / DB→Prisma / columnas prohibidas | PostgreSQL 16.14; 18/18 desde vacío; seed sintético; schema al día y drift 0; 0 columnas prohibidas | 0 |
| `pnpm format:check` / `pnpm lint` / `pnpm typecheck` | PASS / PASS / PASS | 0 / 0 / 0 |
| `pnpm test` | 457 unitarias + 116 integración + 32 tooling = 605/605 PASS | 0 |
| `pnpm test:tooling` | 32/32 PASS en ejecución separada | 0 |
| Trazabilidad / governance / boundary / referencias | 14 requisitos, 40 claims, drift 0; CALL-E live/SDK/webhook/transporte sintético ausentes; 56 enlaces Markdown relativos del delta y referencias canónicas resueltos | 0 |
| `pnpm build` | Next 16.2.11; 18 páginas estáticas; rutas Relay solo demo | 0 |
| `pnpm test:e2e` | 76/76 PASS desde base recreada, incluido C04 2/2 | 0 |
| `git diff --check` | PASS | 0 |
| `pnpm audit --prod --json` | 8 high + 2 moderate + 0 critical en dependencias heredadas; manifest/lock sin cambios C04 | 1 |

La revisión independiente endureció el checker para que solo permita las cinco
rutas Patient Relay exactas y el executor local sin red; añadió pruebas negativas
de rutas y transporte, limitó la cookie al path exacto del Relay y alineó la
documentación para Draft PR. El primer lint C04 detectó la carga síncrona dentro de un effect React; se
separó en una carga inicial asíncrona cancelable y el gate completo pasó, sin
suprimir la regla. Un primer E2E focalizado detectó que la prueba no esperaba la
navegación de sesión; se corrigió esa sincronización de prueba sin cambiar
workers, retries, timeouts o comportamiento productivo. El audit actual añade dos
high respecto al baseline declarado de seis; el catálogo cambió, no el manifest
o lockfile de C04.

<a id="call-e-c05--professional-relay-sintetico"></a>

## CALL-E C05 — Professional Relay sintético

Corte y validación final: 2026-09-03. Base, HEAD y `origin/main` anclados en
`834ddecd7edbfc21bf20c50a3d641f627ab221dc`; PR C04 #53 `MERGED` con ese
`mergeCommit` y run push/main 33666254743/job 100368636385
`completed/success` para el mismo SHA.
Antes de editar, C05 no tenía upstream, rama remota, commit, stage ni delta.

| Control C05 | Implementación / prueba | Límite honesto |
| --- | --- | --- |
| Autoridad y target | `SyntheticDemoProfessionalRelayAuthority` deriva server-side la Task opaca abierta, su profesional sintético asignado, episodio/scope y RoleAssignment activos; cuerpos `{}` | No existe fuente institucional o contacto real; el teléfono no es autoridad y el resolver no sintético continúa deny-all |
| Revalidación concurrente | Binding HMAC incorpora revisiones y RoleAssignment; CAS PostgreSQL comprueba episodio, Task, assignment, actor y target; segunda resolución justo antes del executor | Una revocación detectada en cualquiera de esas revalidaciones produce cero ejecución; no demuestra control frente a proveedor o llamada real |
| Preview y confirmación | UI/API separadas de Patient Relay; token CSPRNG one-use solo en cookie HttpOnly/SameSite Strict/path exacto; replay y carrera producen un éxito | No hay saldo/precio actual ni cancelación API; confirmación no autoriza una llamada real |
| Task contract y schema | `synthetic-professional-relay-v1`; cinco enums obligatorios, objeto cerrado, sin texto libre; null/arrays/tipos/enums/campos extra inválidos | El contrato prescribe límites, pero fixture e instrucciones no prueban conversación, identidad verbal, divulgación, agente, voz o proveedor |
| Ejecución | `LocalSyntheticProfessionalRelayExecutor` devuelve un único fixture predeterminado; checker limita cinco rutas exactas y rechaza transporte de red | Aplicación local determinista; `PROFESSIONAL_RELAY_EVIDENCE = SYNTHETIC_FIXTURE_ONLY`, live `NOT_TESTED` |
| Persistencia y semántica | Solo enums normalizados y referencias opacas autorizadas; CHECK cerrado, trigger inmutable y lifecycle append-only; E2E compara Task/RoleAssignment antes y después | acknowledged/availability/taskCompleted/HUMAN_REVIEWED no significan aceptación, assignment, resolución o aprobación clínica |
| Privacidad | UI identifica inequívocamente el fixture; rutas no devuelven token, targetRef/userId o teléfono completo; logs de errores contienen código/correlación/componente | No hubo divulgación o interacción live; retención/residencia del proveedor siguen sin evaluar |

C05 añade una migración aditiva para `intended_professional`, `acknowledged` y
`availability_to_review`, conservando los campos Patient Relay separados. El
CHECK discrimina ambos recipientKind y el trigger impide reescribir un resultado
normalizado. No se añade almacenamiento de teléfono, prompt, transcript, summary,
evidence, payload o contenido clínico a RelayAttempt. La Task sintética del seed
permanece `OPEN`, asignada al mismo profesional y con revisión 1 durante todo el
recorrido; ningún `TASK_REASSIGNED` o `TASK_RESOLVED` es producido por Relay.

La validación final usa PostgreSQL 16.10 exclusivo, contenedor/red C05 y loopback
55435, con 19/19 migraciones reales desde vacío. La base fue recreada otra vez
antes del E2E completo. No se modificaron manifest, dependencias ni lockfile.

| Comando/comprobación | Resultado real | Exit |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` / `pnpm prisma:generate` | Lock al día, cero descargas; Prisma Client 6.19.0 | 0 / 0 |
| Migraciones / seed / status / DB→Prisma | PostgreSQL 16.10; 19/19 desde vacío; seed sintético; schema al día y drift 0 | 0 / 0 / 0 / 0 |
| `pnpm format:check` / `pnpm lint` / `pnpm typecheck` | PASS / PASS / PASS | 0 / 0 / 0 |
| `pnpm test` | 473 unitarias + 118 integración + 34 tooling = 625/625 PASS | 0 |
| `pnpm test:tooling` | 34/34 PASS en ejecución separada | 0 |
| Trazabilidad / governance / boundary / referencias | 14 requisitos, 41 claims, drift 0; SDK/live/webhook/transporte de los executors ausentes; 10 documentos, 57 enlaces y 8 anchors verificados | 0 |
| `pnpm build` | Next 16.2.11; 18/18 páginas estáticas; rutas Relay solo demo | 0 |
| `pnpm test:e2e` | 79/79 PASS desde base recreada, incluido C05 3/3; un worker, cero retries | 0 |
| `git diff --check` | PASS; warning autocrlf informativo | 0 |
| `pnpm audit --prod --json` | 8 high + 2 moderate + 0 critical heredados; manifest/lock sin cambios C05 | 1 |

Los intentos focalizados intermedios detectaron dos selectores Playwright no
únicos y una repetición sobre estado one-use ya consumido. Se corrigieron solo
los selectores, se recreó `guardian_c05` y el E2E focalizado pasó 3/3 antes de la
ejecución completa 79/79. No se relajaron workers, retries, timeouts, RBAC ni
controles. Proveedor, conversación, voz, divulgación live, piloto y producción
no fueron probados; DEC-019, GAP-DCB-025, GAS2-R-021 y HAZ-GAS-021–038 siguen
abiertos, sin aceptación residual.

La revisión final prepublicación detectó y corrigió un bypass del checker por
alias de transporte: ahora rechaza cualquier referencia a `fetch` e imports
HTTP(S)/socket, incluidos imports bare, dentro de rutas Relay sintéticas y sus
executors. La regresión específica elevó tooling a 34 sin cambiar dependencias.

<a id="call-e-c06--gobernanza-de-resultados"></a>

## CALL-E C06 — errores reales, validación y revisión humana

Corte y validación local: 2026-09-07. Base, HEAD inicial y `origin/main`
anclados en `6a56391dfc7588b2669ff7a584a2a0852331bfb7`, árbol
`cd2a2a3bcb089a357601e8b02a0b95eba5a43397`; PR C05-FIX #55 `MERGED`
con ese `mergeCommit` y run 34126041032/job 101754820163
`completed/success` para el mismo SHA, sin CI posterior invalidante al iniciar.
El informe C00 fue leído sin modificar y su SHA-256 coincidió exactamente con
`E84E9FA341411EDB69B54675CD793F3291BD93ED20CA8FEA62639442FD53AD2D`.

| Control C06 | Implementación / prueba | Límite honesto |
| --- | --- | --- |
| Errores reales | Frontera canónica por código exacto para no iniciado, canal indisponible, conflicto, policy, not-ready, schema y desconocido; todos los códigos C00 tienen caso | Los códigos C00 no asignados por el contrato C06 permanecen unknown; no hay clasificación por texto o status inventado |
| Resultado estructurado | Objetos estrictos Patient/Professional, propiedades exactas, tipos y enums cerrados, sin coerción ni inferencia | Calls 0.6.0 no contiene `resultValidation`; null/evento de fallo/schema no conforme producen abstención, no causa inventada |
| Timeout e idempotencia | `providerRef` persistido antes de GET; timeout/not-ready reconcilian el mismo intent; conflicto no regenera key; carreras dejan un terminal/evento | No prueba exactamente un intento físico ni garantía externa; la brecha create/commit sigue abierta |
| Persistencia | Se extienden `OutboundCallIntent/Event` y `RelayAttempt/Event`; solo referencias, región/locale/Line Region, enums, tiempos y review | Cero Call/payload, teléfono, prompt, transcript, summary, evidence, confidence, metadata o contenido clínico almacenado |
| Revisión y GAS | Todo terminal queda `RESULT_*` hasta review; Task permanece idéntica ante resultado Professional y campos no accionables | Review no es aprobación clínica, decisión operativa, conformidad ni aceptación de riesgo |
| Runtime | Adapter sigue server-only y desactivado; tests usan fakes/executors locales; checker prohíbe SDK, entrypoint, webhook, batch, worker y red Relay | Proveedor, voz, conversación, divulgación y tráfico live `NOT_TESTED`; llamadas reales 0 |

La migración aditiva número 20 crea un enum normalizado y columnas nullable con
CHECKs; amplía los triggers del ledger existente para error terminal pre-create,
resultado inmutable y transición append-only. No backfillea ni elimina datos y no
afirma rollback destructivo seguro. PostgreSQL 16 fue exclusivo de C06 en
`127.0.0.1:55436`, con tmpfs y sin volúmenes.

| Comando/comprobación | Resultado real | Exit |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` / `pnpm prisma:generate` | Lock al día; Prisma Client 6.19.0 | 0 / 0 |
| Migraciones / seed / status / DB→Prisma | 20/20 desde vacío; seed sintético; schema al día; drift 0 | 0 / 0 / 0 / 0 |
| `pnpm format:check` / `pnpm lint` / `pnpm typecheck` | PASS / PASS / PASS | 0 / 0 / 0 |
| Pruebas focalizadas C06 | 104/104 unitarias; 13/13 integración PostgreSQL | 0 / 0 |
| `pnpm test` | 532 unitarias + 120 integración + 34 tooling = 686/686 PASS | 0 |
| `pnpm test:tooling` | 34/34 PASS en ejecución separada | 0 |
| Trazabilidad / governance / boundary | 14 requisitos; 42 claims; Markdown/CSV drift 0; SDK/live ausentes | 0 / 0 / 0 |
| `pnpm build` | Next 16.2.11; 18/18 páginas estáticas | 0 |
| `pnpm test:e2e` desde base recreada | 79/79 PASS; un worker; cero retries | 0 |
| `git diff --check` | PASS; avisos autocrlf informativos | 0 |
| Scan delta | E.164 0, emails 0, DNI/NIE 0, secretos reales 0 | 0 |
| `pnpm audit --prod --json` | 0 critical, 8 high, 2 moderate heredados; C06 atribuibles 0; manifest/lock intactos | 1 esperado, no PASS |

Advisories abiertos: `effect` GHSA-38f7-945m-qr2g; `postcss`
GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp y
GHSA-r28c-9q8g-f849; `sharp` GHSA-f88m-g3jw-g9cj; `nanoid`
GHSA-2v37-7h3g-55p8; `deepmerge-ts` GHSA-ggr8-5vv4-36mx; y
`browserslist` GHSA-c83g-rgw3-j3cx y GHSA-73wf-gq98-2v4g. No se
resuelven ni aceptan en C06. DEC-019, GAP-DCB-025, GAS2-R-021 y
HAZ-GAS-021–038 permanecen abiertos; no hay aceptación residual.

<a id="call-e-c07--adversarial-proof"></a>

## CALL-E C07 — prueba adversarial del Continuity Relay

Corte y validación local: 2026-09-08. Base, HEAD inicial y `origin/main`
anclados en `3c476c70a8700e4adab3a33aaff5f28aa6c96469`, árbol
`4c306bb6e4f3335de85ccf94a42597b7570dc0e2`; PR C06 #56 `MERGED`
con ese `mergeCommit` y run 34190861190/job 101948461782
`completed/success` para el mismo SHA. La rama C07 partió sin commits, stage,
upstream ni rama remota.

| Control C07 | Evidencia reproducible | Límite honesto |
| --- | --- | --- |
| Autorización | Negativos patient/caregiver/support/admin, episodio ajeno, profesional/target/teléfono del cliente, Task stale/reasignada y revision/fingerprint alterados; revocación persistida entre preview y confirmación se revalida justo antes del executor | El modelo actual no contiene unidad institucional; se acredita aislamiento por episodio y responsable vigente, no aislamiento multiunidad |
| Carreras e idempotencia | Confirmaciones concurrentes y replay producen un solo intent/evento terminal; conflicto de key/fingerprint falla cerrado; create aceptado + timeout queda `UNCERTAIN` y no recrea; GET usa el mismo `providerRef`; `call_not_ready` no es terminal | Pruebas sobre repositorios/executors locales y fixture sintético; no prueban garantías de proveedor ni llamada real |
| Cardinalidad y destino | Schemas HTTP cerrados rechazan destinatarios o teléfonos plurales; adapters exigen exactamente un recipient/phone y separan Patient de Professional; target y teléfono proceden del snapshot server-side | No hay fan-out ni target arbitrario, pero tampoco transporte live |
| Contención | Sentinelas sintéticos verifican HTTP, HTML, consola, DB y artefactos; no se persisten teléfono completo, API key, token claro, prompt, transcript, summary, evidence, confidence, metadata libre, Call/payload o body crudo | Acredita el contrato y la persistencia local; no acredita voz, conversación o divulgación live |
| Contenido | Casos deterministas de prompt injection, destinatario incorrecto, medicación/tratamiento, emergencia, cambio de voz/policy, insistencia y respuestas ambiguas/no allowlisted terminan en schema cerrado o abstención para revisión humana | Solo parser/policy/fixtures locales; no se afirma cómo respondería un agente o una llamada real |
| Región y accesibilidad | Región/locale incompatibles fallan cerrado; `verifiedAt=2026-08-27T18:35:50.6934815+02:00`; Line Region `SYNTHETIC_LOCAL_NO_PROVIDER`; axe serious/critical 0 en Patient Relay y Professional Relay | Line Region no es evidencia de proveedor; el axe focalizado no equivale a conformidad WCAG general |
| Boundary | Checker y regresión adversarial rechazan ingress/webhook/config CALL-E además de SDK, red, worker, scheduler y fan-out | Llamadas reales 0; C08 no autorizado ni iniciado |

El único hardening runtime de C07 exige que el actor siga activo, sintético y
con `RoleAssignment` nurse/clinician no revocado en cada resolución de autoridad,
incluida la revalidación inmediatamente anterior al executor, y que la identidad
del paciente tenga `identityVerifiedAt`. No se añadieron dependencias,
migraciones, schema, transporte, entrypoint ni funcionalidad clínica.

| Comando/comprobación | Resultado real | Exit |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` / `pnpm prisma:generate` | Lock al día; Prisma Client 6.19.0 | 0 / 0 |
| PostgreSQL 16 / migraciones / seed / status / DB→Prisma | 16.14, base vacía y exclusiva en loopback 55437; 20/20; seed sintético; schema al día; drift 0 | 0 / 0 / 0 / 0 / 0 |
| Pruebas focalizadas C07 | 81/81 unitarias; 17/17 integración PostgreSQL; 4/4 E2E focalizadas con axe | 0 / 0 / 0 |
| `pnpm format:check` / `pnpm lint` / `pnpm typecheck` | PASS / PASS / PASS | 0 / 0 / 0 |
| `pnpm test` | 556 unitarias + 120 integración + 35 tooling = 711/711 PASS | 0 |
| `pnpm test:tooling` | 35/35 PASS en ejecución separada | 0 |
| Trazabilidad / governance / boundary | 14 requisitos; 43 claims; Markdown/CSV drift 0; SDK/red/ingress live ausentes | 0 / 0 / 0 |
| `pnpm build` | Next 16.2.11; 18/18 páginas estáticas | 0 |
| Tres `pnpm test:e2e -- --workers=1` desde base recreada | 83/83 PASS en 6,7 min; 83/83 PASS en 6,7 min; 83/83 PASS en 7,8 min; retries 0, skips 0 | 0 / 0 / 0 |
| `git diff --check` | PASS; avisos autocrlf informativos | 0 |
| Scan delta y artefactos | E.164 0, emails 0, DNI/NIE 0, valores secretos 0, sentinelas C07 en artefactos 0; `.env` ausente | 0 |
| `pnpm audit --prod --json` | 0 critical, 8 high, 2 moderate heredados en 10 advisories; C07 atribuibles 0; manifest/lock intactos | 1 esperado, no PASS |

Un intento E2E previo no se contabilizó: primero encontró un servidor Next.js
huérfano y luego reveló contaminación de un fixture append-only por el orden de
la nueva suite. Se finalizó únicamente ese proceso local, se movió la suite C07
al final sin borrar historia ni relajar aserciones, el caso heredado se reprodujo
aislado con PASS y después se obtuvieron las tres ejecuciones limpias anteriores.
DEC-019, GAP-DCB-025, GAS2-R-021 y HAZ-GAS-021–038 permanecen abiertos, sin
aceptación residual.

<a id="call-e-c08--live-proof-blocked"></a>

## CALL-E C08 — reconocimiento actual y live proof bloqueada

Corte read-only: `2026-09-08T13:15:00.991Z`. Base, HEAD inicial y
`origin/main` anclados en `219fe413afbff6947ad863967a3697a249ad1b6a`, árbol
`b0b8c20ed1528f47577cdb3f5a8434f8d7cd9d6d`; PR C07 #57 `MERGED` con ese
`mergeCommit` y run 34227147596/job verify 102063940225
`completed/success` para el mismo SHA. La rama C08 partió limpia, sin commits,
stage, upstream ni rama remota.

### Fuentes oficiales actuales

| Fuente consultada | Evidencia observada | Límite aplicado |
| --- | --- | --- |
| [Authentication](https://docs.heycall-e.com/authentication) | API keys de proyecto server-to-server; Bearer; comprobación read-only sugerida `GET /v1/goals?limit=1`; 200 acredita la petición y 403 puede indicar falta de proyecto/capacidad/región/operación | No había `CALLE_API_KEY`; no se hizo petición y cuenta/capacidad siguen no verificadas |
| [Calls guide](https://docs.heycall-e.com/calls) y [Calls reference](https://docs.heycall-e.com/api-reference/calls) | `POST /v1/calls`, `GET /v1/calls/{call_id}`, `Idempotency-Key` estable y ausencia de operación cliente de cancelación | C08 no crea, consulta ni cancela Calls; país listado no equivale a autorización |
| [Goals reference](https://docs.heycall-e.com/api-reference/goals) y [Goal Runs guide](https://docs.heycall-e.com/goal-runs) | `GET /v1/goals` y `GET /v1/goals/{goal_id}` son owner-scoped; publicación de Goal no es operación Developer API | Goals/Goal Runs quedan fuera del runtime C08 y no se creó recurso alguno |
| [Supported Regions and Languages](https://github.com/CALLE-AI/call-e-integrations#-supported-regions-and-languages) | España `ES`, `+34`, inglés/español, Line Region `International`; la nota define International como principalmente para pruebas | Observación mutable y read-only; no acredita cuenta, carrier, KYC, presupuesto, destino autorizado o llamada |
| [CALL-E FAQ](https://www.heycall-e.com/#faq) | Outbound puede requerir KYC antes de activación y controles adicionales según región/carrier | KYC y capacidad de esta cuenta no verificados |
| [Terms of Service](https://www.heycall-e.com/terms-of-service/) | El usuario debe asegurar autorización, consentimiento/notices, revisión de outputs y tratamiento lícito; datos regulados/sensibles requieren autorización escrita y salvaguardas adicionales | No es validación jurídica; C08 prohíbe PHI/PII clínica y mantiene piloto/producción NO_GO |

La consulta no convierte fuentes mutables en configuración productiva. La
superficie REST C02 continúa limitada al adapter existente; la documentación
actual más amplia no autoriza batch, webhook, Goals, Goal Runs o SDK en GAS.
`SDK_LICENSE = UNRESOLVED`; `SDK_DEPENDENCY = ABSENT`.

### Gates, ledger y evidencia negativa

| Gate o evidencia C08 | Estado observado | Consecuencia |
| --- | --- | --- |
| `CALLE_API_KEY` | `ABSENT`, comprobación de presencia únicamente; valor nunca leído ni expuesto | `CALL_E_ACCOUNT_CAPABILITY = NOT_VERIFIED`; GET read-only no ejecutado |
| Cuenta operativa, capacidad, KYC | `NOT_VERIFIED` | No contacto con CALL-E |
| Región/idioma/línea publicados | `ES / +34 / es,en / International`, observado en fuente oficial | Solo aptitud regional publicada para pruebas; no autorización operativa |
| Destino y permiso del titular | `BLOCKED`; no existe attestation local segura | `SUPPORTED_AUTHORIZED_NUMBER = BLOCKED` |
| Identidad/rol del tester, consentimiento IA, ventana, recording notice | `NOT_ATTESTED` | No dry-run ni llamada |
| PHI/PII clínica o pacientes reales | `PROHIBITED`; no se recibió ni persistió contenido | `RAW_CONTENT_PERSISTED = 0` |
| Presupuesto C08 | máximo global aprobado por instrucción: 4; capacidad/saldo no verificados; consumidas 0 | Ledger `0/4`; no se reserva ni consume llamada |
| Confirmación humana inmediatamente anterior | No solicitada: los gates previos fallaron | Confirmaciones recibidas 0; ninguna ejecución posible |

No hubo payload, teléfono completo, providerRef, prompt, audio, transcript,
summary, datos personales o contenido clínico que persistir o publicar. No se
creó evidencia local protegida de providerRef porque nunca existió. Dry-run,
Patient, Professional y contención live son `NOT_EXECUTED`.

### Validación local C08

La validación usó PostgreSQL `16.14` efímero, aislado en loopback y tmpfs, puerto
`55438`. CI y E2E conservaron `CALL_E_REST_ENABLED=false`; no hubo red real de
CALL-E ni modificación de P15.

| Comando o evidencia | Resultado | Exit | Alcance o limitación |
| --- | --- | ---: | --- |
| `pnpm install --frozen-lockfile` | PASS; 409 paquetes reutilizados, descargas 0, lockfile intacto | 0 | Grafo existente; el primer intento quedó bloqueado por permisos de Corepack y pasó sin cambios en contexto permitido |
| `pnpm prisma:generate` | PASS; Prisma Client 6.19.0 | 0 | Sin cambio de schema o migración |
| Base PostgreSQL 16 vacía, deploy, seed, status y drift | PASS; 20/20 migraciones, seed correcto, schema al día, drift 0 | 0 | El primer intento de drift usó la opción no soportada `--to-schema`; el rerun correcto con `--to-schema-datamodel` pasó |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | PASS | 0 | Documentación, análisis estático y TypeScript |
| `pnpm test` | PASS; 556 unitarias + 120 integración + 35 tooling = 711/711 | 0 | Solo fakes y fixtures sintéticos; el primer intento de integración omitió `DATABASE_URL`, y el rerun con la DSN C08 aislada pasó sin cambio de producto |
| `pnpm test:tooling` | PASS; 35/35 | 0 | Invocación separada requerida |
| `pnpm traceability:check` | PASS; 14 requisitos, 44 claims, drift Markdown/CSV 0 | 0 | Taxonomía y referencias del repositorio |
| Governance checker | PASS; 44 claims y referencias locales resueltas | 0 | No acredita verdad externa o autorización live |
| `pnpm calle:boundary:check` | PASS; SDK ausente y REST server-only | 0 | Sin entrypoint live, ingress, webhook, Goals, batch ni ampliación de superficie |
| `pnpm build` | PASS; 18/18 páginas estáticas | 0 | Build local, no despliegue |
| `pnpm test:e2e`, 1 worker, 0 retries | PASS final; 83/83 en base C08 nueva | 0 | Primera pasada 82/83 por fallo heredado de hidratación; el caso focal pasó 1/1 y el rerun completo desde otra base vacía pasó 83/83; no se ocultó ni cambió el test |
| `pnpm audit --prod --json` | EXPECTED NONZERO; 8 high + 2 moderate, critical 0, atribuibles a C08 = 0 | 1 | Advisories heredados; manifest y lockfile sin cambios |
| `git diff --check` y escaneos del delta | PASS; E.164 0, emails 0, DNI 0, NIE 0, asignaciones de secretos 0; `.env` ausente | 0 | `gitleaks` no estaba disponible; no existió dato live que escanear |
| Limpieza aislada | PASS; contenedor C08 autoremove ausente y puerto 55438 libre | 0 | Las bases sintéticas tmpfs se eliminaron por diseño; contenedor y volumen P15 preservados |

Resultado documental: `LIVE_PROOF = BLOCKED_NO_AUTHORIZED_DESTINATION`, con el
bloqueo adicional independiente `CALL_E_ACCOUNT_CAPABILITY = NOT_VERIFIED` por
ausencia de key. `CALL_E_RUNTIME_PROOF = NOT_EVIDENCED` y
`NO_FAKE_LIVE_CLAIM = PASS`. DEC-019, GAP-DCB-025, GAS2-R-021 y
HAZ-GAS-021–038 permanecen abiertos; no se acepta riesgo residual.

<a id="call-e-c09--judge-submission-package"></a>

## CALL-E C09 — judge demo and submission package

Cut-off: `2026-09-09`. Exact pinned base and PR #58 merge commit:
`c5a0574e1e29299364a2cca6ec0b2bfdbc910429`; push/main run
[34277781896](https://github.com/Luis195f/guardian-alta-segura/actions/runs/34277781896)
was `completed/success` for that SHA. C09 began with 0 commits, a clean
worktree/stage, no upstream and no remote branch. Community PR
[CALL-E #280](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/280)
was observed read-only as merged at
`c93b7b6f0359091701870e9e5ecc40d8e0829e25`. No automatic rebase occurred.

This section preserves the historical C09 evidence for source head
`2b1eb504419da413defe5000fb35c30a4038c459`. The current reconciled package is
built instead on C09-SEC squash
`6a64564599369b24f2d00fe9ceca1093d1a5c92f`; the dependency state and executed
validation for those two baselines are not interchangeable.

### Submission artifacts and evidence boundaries

| Artifact | Evidence | Boundary |
| --- | --- | --- |
| `docs/build-week/PROBLEM_EVIDENCE.md` | Four bounded claims cover repeated attempts/non-contact and published 48-hour, 72-hour and seven-day windows, each with source, URL/DOI, date, consultation date, population and limits | Published context only; no GAS workload, reach, effectiveness, outcome or Spanish-policy claim |
| `docs/build-week/JUDGE_DEMO_RUNBOOK.md` | Exact Patient/Professional Relay walk-through in the existing C03–C07 UI and contracts | Local fixture/fake/dry-run; CALL-E live off; no parallel application or public URL |
| `docs/build-week/JUDGING_EVIDENCE.md` | Maps claim to competition criterion, code path, test, proof type, timestamp and limitation | Synthetic/local proof is distinguished from missing runtime proof |
| `docs/build-week/VIDEO_SCRIPT.md` and `docs/build-week/VIDEO_SHOT_LIST.md` | English 0:00–2:50 narrative, screen text, capture order and post-export inspection checklist | No real video was present or inspected; duration/audio/legibility/privacy remain `NOT_VERIFIED` |
| `docs/build-week/DEVPOST_SUBMISSION_EN.md` | Complete copy-ready English draft led by practical phone work; separates pre-existing baseline, hackathon delta, synthetic evidence and live gap | Draft only; human fields, video publication and submission remain human actions |
| `docs/build-week/BUILD_WEEK_CHANGELOG.md` | Treats exact pre-period commit `88be7da66c38f32f319e0fefc57f8246a1739a51` and earlier functionality as pre-existing | Git history supports repository timing, not organizer eligibility or independent-creation proof |
| `docs/build-week/C09_SUBMISSION_STATUS.md` | Pins preconditions, gates and real validation counts | Commit/PR/remote CI are read after publication from immutable remote metadata, not self-referentially embedded |

Problem sources were consulted on 2026-09-09: Patel et al. (2026), DOI
`10.7759/cureus.112101`; Soong et al. (2014), DOI
`10.1371/journal.pone.0112230`; NICE NG53 (published 2016-08-30); and NHS
England Digital's 72-hour measure (last edited 2026-06-09). Applicability and
study limitations are recorded beside each exact claim in Problem Evidence.

### Historical local validation C09 — before C09-SEC

Validation used isolated PostgreSQL 16.14 databases on loopback/tmpfs. C09
changes documentation only; no runtime, domain, Prisma, migration,
authentication, lifecycle, dependency, lockfile, workflow, flag or test file is
changed. The results in this table belong to the pre-remediation C09 source
head and its Next 16.2.11 / Prisma 6.19.0 graph; they are not validations of the
versions introduced later by C09-SEC.

| Command or evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| `pnpm install --frozen-lockfile` | PASS; 409 reused, downloads 0, lockfile unchanged | 0 | Initial sandbox attempt was blocked by Corepack global-state permissions; authorized rerun passed |
| `pnpm prisma:generate` | PASS; Prisma Client 6.19.0 | 0 | No schema/migration change |
| Empty PostgreSQL 16, deploy, seed, status and drift | PASS; public tables initially 0; 20/20 migrations; seed; schema current; drift 0 | 0 | Isolated synthetic DB on `127.0.0.1:55439`, tmpfs |
| Format, lint and typecheck | PASS | 0 | Documentation formatting corrected; strict types unchanged |
| `pnpm test` | PASS; 556 unit + 120 integration + 35 tooling = 711/711 | 0 | Local fakes/fixtures and synthetic PostgreSQL only |
| `pnpm test:tooling` | PASS; 35/35 | 0 | Separate required invocation |
| Traceability and governance | PASS; 14 requirements, 44 claims, references resolved, Markdown/CSV drift 0 | 0 | Does not validate external truth |
| `pnpm calle:boundary:check` | PASS; SDK absent and no live entrypoint/ingress/webhook/Goals/batch/helper surface | 0 | Confirms repository boundary, not provider behavior |
| `pnpm build` | PASS; 18/18 static pages | 0 | Local build, not deployment qualification |
| Full E2E, one worker, zero retries | PASS final; 83/83 | 0 | First full pass was 82/83 from one transient login `ECONNRESET`; without code/config changes, full rerun from another empty PostgreSQL 16 base passed 83/83 |
| Initial Draft CI run 34359524453 | FAIL in 1/35 tooling; unit 556/556 and integration 120/120 passed before failure | 1 | The new index used eight local Markdown links absent from the checker's isolated fixture; final C09 represents them as path text and reruns the tooling test before publication replacement |
| `pnpm audit --prod --json` | EXPECTED NONZERO; 2 critical + 9 high + 3 moderate, C09 attributable 0 | 1 | Unchanged dependency graph; GAS2-R-022 blocks a public-deployment-readiness claim |
| Diff and content scans | PASS after final cleanup; C09 delta sensitive-pattern matches 0 | 0 | Whole tracked tree: E.164 0, DNI/NIE 0, two `.invalid` test emails; secret-shaped hits are documented placeholders/test fixtures; `gitleaks` unavailable; manual delta review found aggregate research and synthetic content only |

C09 does not add or accept a canonical product claim; the claims register stays
at 44. It prepares externally reviewable wording without asserting clinical
effect, adoption, compliance, institutional support or live provider behavior.

### Current reconciled evidence after C09-SEC

The current base preserves the complete C09-SEC section above, including
GAS2-R-022 and its completed remediation evidence: Next 16.3.3, Prisma and
`@prisma/client` 6.19.3, `browserslist` 4.28.9, and a production audit of **0
critical, 1 high and 0 moderate**. The remaining `deepmerge-ts` 7.1.5 advisory
GHSA-ggr8-5vv4-36mx / CVE-2026-40345 remains open and unaccepted. Current
reconciliation validation is recorded only after execution against exact base
`6a64564599369b24f2d00fe9ceca1093d1a5c92f`; it is not inferred from either
earlier run.

Validation on 2026-09-10 used an exclusive PostgreSQL 16.14 container bound to
`127.0.0.1:55441`, with tmpfs storage, no volume and synthetic data only.

| Current C09-RECON command or evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| `pnpm install --frozen-lockfile` | PASS; lock current, 412 reused and downloads 0 | 0 | Initial sandbox attempt was blocked by Corepack global-state permissions; authorized rerun passed without lockfile change |
| `pnpm prisma:generate` | PASS; Prisma Client 6.19.3 | 0 | No schema or migration change |
| Empty PostgreSQL 16, deploy, seed, status and drift | PASS; initial public tables 0; 20/20 migrations; seed; schema current; drift 0 | 0 | Loopback, tmpfs, no volume |
| Format, lint and strict typecheck | PASS | 0 | Documentation plus unchanged application baseline |
| `pnpm test` | PASS; 556 unit + 120 integration + 35 tooling = 711/711 | 0 | Synthetic fixtures and PostgreSQL 16 only |
| `pnpm test:tooling` | PASS; 35/35 | 0 | Separate required invocation |
| Traceability and governance | PASS; 14 requirements, 44 claims, references resolved, Markdown/CSV drift 0 | 0 | Repository consistency, not external truth |
| `pnpm calle:boundary:check` | PASS; SDK and live entrypoint absent; no ingress, webhook, Goals, batch or helper surface | 0 | Real CALL-E network calls remain 0 |
| `pnpm build` | PASS; Next 16.3.3, 18/18 static pages | 0 | Local build, not deployment qualification |
| Full E2E, one worker, zero retries | PASS; 83/83 in 6.8 minutes | 0 | Fresh ephemeral schema; no assertion, retry, worker, gate or timeout relaxation |
| `pnpm audit --prod --json` | 0 critical, 1 high, 0 moderate | 1 expected | Only `deepmerge-ts` 7.1.5; open and unaccepted under GAS2-R-022 |
| Local Markdown references | PASS; 10 checked, broken 0 | 0 | Intended 13-file documentary scope |
| Scope and sensitive-pattern scans | PASS; intended Markdown files 13, unexpected 0; E.164, Spanish phone, email, DNI/NIE and high-confidence secret patterns 0; `.env` absent | 0 | One initial phone-pattern false positive was a numeric substring inside the documented lockfile hash; corrected alphanumeric boundaries returned 0 |
| `git diff --check` | PASS | 0 | Final tracked documentary diff; untracked Markdown is covered by final formatting and staged checks |
| Ephemeral cleanup | PASS; validation container absent, port 55441 free, `.next` and `test-results` removed | 0 | No persistent volume was created; no other container or worktree was modified |

The reconciliation changes documentation only. Public demo/video verification,
public-deployment readiness and live CALL-E proof remain blocked or unverified;
no residual dependency or regulatory risk is accepted.

### Preserved C08 result and external gates

```text
LIVE_PROOF = BLOCKED_NO_AUTHORIZED_DESTINATION
CALL_E_RUNTIME_PROOF = NOT_EVIDENCED
LIVE_CALLS = NOT_EXECUTED
```

No API key, full telephone number, authenticated CALL-E request, provider
response, dry-run or call was used. A public demo URL does not exist, and no
video file was present or inspected. Public deployment, video publication and
Devpost submission require separate human authorization/action and are not
performed by C09.

## Executed baseline evidence

### GAS2-P16A local execution — 2026-08-15 — synthetic usability readiness documents

Baseline inspected: `e1cf37f4088c30e03d8c47297359c1444fe1cbf4`;
tree `d6a99c93fd415c5237c508e56b1b54204bb99ccb`; branch
`docs/pilot-readiness-gates-16a`. CI run `31901762633` was
`completed/success` for that exact SHA. P16A modifies only this index and the
canonical readiness audit. It does not change runtime, Prisma, migrations,
dependencies, lockfile, workflows, tests, scripts, flags or E2E configuration.

| Command / evidence | Result | Exit | Scope / limitation |
| --- | --- | ---: | --- |
| `pnpm install --frozen-lockfile` | PASS; 409 reused, downloads 0, lockfile unchanged | 0 | Existing dependency graph |
| `pnpm prisma:generate` | PASS; Prisma Client 6.19.0 | 0 | No schema change |
| Empty PostgreSQL 16 base | PASS; 16.10, public tables 0, tmpfs and mounts 0 | 0 | Isolated loopback container/network/project, port 55421 |
| `pnpm db:migrate:deploy` | PASS; 14/14 migrations | 0 | No P16A migration |
| `pnpm db:seed` | PASS | 0 | Canonical synthetic seed only |
| `pnpm db:migrate:status` | PASS; schema up to date | 0 | Same isolated database |
| `pnpm format:check` | PASS | 0 | P16A documents included |
| `pnpm lint` | PASS | 0 | Static analysis |
| `pnpm typecheck` | PASS | 0 | Next route types and TypeScript |
| `pnpm test` | PASS; 401 unit + 103 integration + 26 tooling = 530/530 | 0 | Synthetic fixtures and PostgreSQL 16 |
| `pnpm test:tooling` | PASS; 26/26 | 0 | Separate required invocation |
| `pnpm traceability:check` | PASS; 37 claims and Markdown/CSV drift 0 | 0 | Repository taxonomy/references only |
| P11 governance evidence checker | PASS; 37 claims and local references resolved | 0 | Does not validate external truth |
| P16A local Markdown reference verification | PASS; one local reference, broken 0 | 0 | Two modified documents; no external URL validation |
| `pnpm build` | PASS; 18 static pages generated | 0 | Local build, not deployment |
| `git diff --check` | PASS | 0 | No whitespace errors |
| `pnpm audit --prod` | EXPECTED NONZERO; inherited 5 high + 2 moderate; P16A attributable = 0 | 1 | No dependency or lockfile change |
| `pnpm test:e2e` | `NOT_EXECUTED` | `NOT_APPLICABLE` | Exclusively documentary delta; no P16A E2E PASS claimed |
| Isolated resource cleanup | PASS; container/network removed, P16A volumes 0, port 55421 free, `.env` absent | 0 | P15 container/network/volume remained unchanged |

The P16A artifact is `READY_FOR_HUMAN_REVIEW` only as a synthetic-usability
document package. It does not authorize participants or execution and does not
change `REAL CLINICAL PILOT = NO_GO`, `REAL DATA / PRODUCTION = NO_GO`, any DEC,
gap, hazard, risk or claim. Two initial unprivileged pnpm attempts were blocked
by the runner's Corepack file permissions and passed unchanged in the permitted
context; they are runner diagnostics rather than product gate failures.

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
