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
| Claims/hazards | 37 claims, 20 hazards previos; sin validación clínica | Una frontera documental y 18 escenarios de diseño, sin prueba live ni controles clínicos efectivos | CLAIM-GAS2-038; Hazard Log; GAP-DCB-025; GAS2-R-021 |

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
