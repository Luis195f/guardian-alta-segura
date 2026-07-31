# Clinical Safety Case Report inicial — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**  
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`  
> `REAL PILOT = NO_GO`

## 1. Control del documento

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-CSCR-INITIAL-001` |
| Versión | `0.1-draft` |
| Fecha de corte | 2026-07-31 |
| Rama | `docs/clinical-safety-dcb0129` |
| Commit base | `975d7db8b54193ed5352e8b535763a92fc047324` |
| Commit base subject | `docs: specify verifiable commitment engine (#28)` |
| Fase de ciclo de vida | Diseño / prepiloto sintético; no existe fase clínica aprobada |
| Configuración | Monolito Next.js/TypeScript + Prisma/PostgreSQL; demo loopback y datos sintéticos |
| Estado | `BORRADOR DE TRABAJO / NO APROBADO` |
| CSO | `NO DESIGNADO / APROBACIÓN PENDIENTE` |
| Aprobador de release clínico | `INSUFFICIENT_EVIDENCE`; no identificado ni autorizado |
| Hazard Log asociado | [Hazard Log inicial](hazard-log-initial.md) |
| Gap Register asociado | [DCB0129 Gap Register](dcb0129-gap-register.md) |

Este informe es una presentación inicial e incompleta de un argumento de seguridad.
No es una declaración de que Guardián Alta Segura sea seguro, cumpla DCB0129 o
esté listo para despliegue. DCB0129 se usa metodológicamente; no se afirma que sea
una obligación jurídica automática en España.

La referencia oficial publicada es DCB0129 Amd 24/2018, Specification v4.2 e
Implementation Guidance v3.2. NHS England informa de que DCB0129 y DCB0160 están
sometidos a revisión: [release oficial](https://digital.nhs.uk/data-and-information/information-standards/governance/latest-activity/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/),
[Specification v4.2](https://digital.nhs.uk/binaries/content/assets/website-assets/data-and-information/information-standards/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/0129242018spec.pdf) y
[Implementation Guidance v3.2](https://digital.nhs.uk/binaries/content/assets/website-assets/data-and-information/information-standards/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/0129242018impguid.pdf).

## 2. Propósito, fase y decisión que este informe no toma

El propósito es registrar, en la fase de diseño/prepiloto sintético, qué posición
de seguridad puede y no puede sostenerse desde el commit evaluado. El informe:

- identifica funciones reales y controles técnicamente probados;
- separa controles documentales y diseño futuro de capacidad actual;
- identifica peligros previsibles y gaps;
- no estima severidad, probabilidad o riesgo porque no existe Clinical Risk
  Management Plan con criterios aprobados;
- no acepta riesgo residual;
- no reemplaza revisión multidisciplinar, CSO, autoridad de release, evaluación
  jurídica/regulatoria, validación clínica o DCB0160 de un desplegador.

## 3. Definición del sistema, límites e interfaces

La [frontera de aseguramiento](../../system-assurance-boundary.md) y el
[estado actual GAS 2.0](../../architecture/gas2-current-state.md) describen un
monolito modular:

```text
Next.js App Router / React UI
        ↓
HTTP routes under src/app/api
        ↓
Application services + ports
        ↓
Domain rules and policies
        ↓
Prisma unit-of-work adapters
        ↓
PostgreSQL 16
```

Dentro del scope de evaluación:

- `src/domain`, `src/application`, `src/infrastructure`, `src/presentation` y
  `src/app`;
- `prisma/schema.prisma` y once migraciones;
- configuración, seed/fixtures exclusivamente sintéticos, CI y pruebas;
- documentación, ADR, Decision Register/Packs y trazabilidad REQ-01–REQ-14;
- especificación y ADR de concurrencia del motor futuro.

Fuera del sistema implementado:

- IdP/SSO/MFA institucional, HCE/EHR/FHIR/HL7, mensajería, telefonía y conectores;
- scheduler, worker, job, inbox/outbox, backup/restore/failover y modo offline;
- infraestructura hospitalaria, staffing, protocolos locales y procedimientos
  alternativos;
- cualquier paciente, cuidador, profesional, dato, canal o entorno real.

Interfaces actuales: navegador local loopback, API interna Next.js y PostgreSQL.
No hay interfaces clínicas productivas. El contrato `SafetyPlanExporter` y el
port `InstitutionalIdentityProvider` no tienen adaptador y no son capacidades.

## 4. Intended use y usos excluidos

### Intended use evaluado

El baseline solo puede usarse como demo técnica local controlada, con identidades
y datos sintéticos, para mostrar partes de un circuito postalta: episodio,
documentos versionados, check-in, evaluación determinista, aviso, revisión
humana, tarea explícita y trazabilidad técnica.

### Usos excluidos

- atención, seguimiento o decisión sobre pacientes reales;
- producción, piloto real, despliegue institucional o integración clínica;
- diagnóstico, pronóstico, predicción de suicidio/deterioro o scoring;
- recomendación, prescripción, tratamiento, derivación, firma o cierre automático;
- sustitución de revisión o juicio profesional;
- certificación de domicilio seguro, SBAR clínico aprobado o recurso de crisis;
- interpretación de ausencia/no respuesta como incumplimiento o riesgo;
- claim de seguridad clínica, efectividad, cumplimiento DCB0129/RGPD/MDR o
  aprobación hospitalaria.

## 5. Usuarios y entorno previsto

Usuarios implementados: seis identidades demo fijas con roles técnicos `admin`,
`nurse`, `clinician`, `patient`, `caregiver` y `support`. No representan mapping
institucional. El cuidador requiere además autorización/scope/sesión propia.

Entorno implementado: desarrollo/demo local en `127.0.0.1`, sin exposición LAN,
staging o Internet. PostgreSQL local es la única persistencia. No existe entorno
clínico previsto aprobado, población, unidad, número de usuarios/pacientes,
formación, soporte, horario operativo o workflow alternativo. Esos datos son
`INSUFFICIENT_EVIDENCE` y bloquean cualquier conclusión sobre uso real.

## 6. Release y configuración analizadas

| Elemento | Configuración observada | Clasificación |
| --- | --- | --- |
| Aplicación | Next.js 16.2.10, React 19.2.7 | `CURRENT_BASELINE` |
| Lenguaje | TypeScript 5.9.3 estricto, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | `CURRENT_BASELINE` |
| Persistencia | Prisma 6.19.0, PostgreSQL 16, once migraciones | `CURRENT_BASELINE` |
| Identidad | Alias demo local, cookie HttpOnly, roles revalidados | `CURRENT_BASELINE / DEMO_ONLY` |
| Datos | Seed y fixtures sintéticos | `CURRENT_BASELINE / DEMO_ONLY` |
| Semáforo | `EXPLAINABLE_TRAFFIC_LIGHT=false` por defecto | `CURRENT_BASELINE` |
| Crisis | Visible y deshabilitada, sin teléfono/URI | `CURRENT_BASELINE / DEMO_ONLY` |
| Compromisos | Sin modelos, casos de uso, ruta, UI, scheduler o pruebas | `DESIGN_FORESEEABLE / NOT_IMPLEMENTED` |
| Release clínico | No existe | `NOT_APPLICABLE` al baseline / `INSTITUTIONAL_DECISION_REQUIRED` |

La configuración exacta de un futuro release clínico, sus hashes de artefacto,
infraestructura y change control no existen.

## 7. Frontera Guardián Core / Clinical Rules

El [ADR-0015](../../adr/0015-guardian-core-clinical-rules-boundary.md) está en
estado Propuesta y establece una frontera documental:

- Core debe limitarse a constancia organizativa de compromisos explícitos,
  responsable, plazo, referencia de evidencia y revisión humana;
- Clinical Rules procesa inputs individuales de significado clínico mediante
  reglas deterministas y produce una solicitud explicable de revisión;
- Clinical Rules no debe mutar Core ni ejecutar una acción clínica;
- ausencia registral, no respuesta del paciente, actuación del equipo, excepción,
  evidencia tardía e incumplimiento confirmado son hechos distintos.

El código actual no está separado de forma desplegable: reglas, avisos, tareas,
sesión, UI y DB comparten monolito y `Task.alertId` acopla el workflow. El baseline
sí exige revisión y petición humana explícita antes de la única acción derivada
implementada —crear una tarea—, pero esto no prueba independencia regulatoria ni
seguridad del conjunto.

## 8. Funciones implementadas frente a diseñadas

| Función | Estado real | Evidencia resumida | Límite clínico/institucional |
| --- | --- | --- | --- |
| Episodio y responsables | `CURRENT_BASELINE / PARTIALLY_IMPLEMENTED` | `DischargeEpisode`, transición versionada/idempotente/auditada | Identidad, duración y cierre pendientes DEC-001/002/013 |
| Cierre de episodio | `CURRENT_BASELINE` fail-closed | `TransitionDischargeEpisodeService` siempre bloquea `CLOSED` | No existe política de cierre aprobada |
| Plan de Seguridad | `CURRENT_BASELINE / DEMO_ONLY` | seis pasos, N+1, state events append-only | Contenido/proceso no validados; no firma automática |
| Check-ins | `CURRENT_BASELINE / PARTIALLY_IMPLEMENTED` | protocolo/versiones/asignaciones/outcomes | Contenido/cadencia/no respuesta no aprobados; sin scheduler |
| Reglas/avisos | `CURRENT_BASELINE / DEMO_ONLY` | DSL determinista, abstención, hash, aviso y revisión | Clinical Rules; fixtures no validados; no claim clínico |
| Tareas/accountability | `CURRENT_BASELINE / PARTIALLY_IMPLEMENTED` | tarea/eventos, revision/idempotencia/locks/proyección | Sin acceptance, SLA, equipos, suplencia o escalado |
| Cuidador | `CURRENT_BASELINE / PARTIALLY_IMPLEMENTED` | scope N+1, sesión, revocación y filtros | Política/identidad real pendientes |
| Domicilio Seguro | `CURRENT_BASELINE / DEMO_ONLY` | checklist versionado, informativo y sin score | No certifica seguridad; DEC-007 |
| SBAR | `CURRENT_BASELINE / PARTIALLY_IMPLEMENTED` | preview determinista, efímero, `signed=false` | Sin perfil/PDF/destino/firma aprobados |
| Crisis | `CURRENT_BASELINE / SAFE BLOCKED DEMO STATE` | constante sin teléfono/URI | Sin capacidad accionable; DEC-010/011 |
| Auditoría/evidencia | `CURRENT_BASELINE / TECHNICALLY_VERIFIED` | `AuditEvent` y histories; evidence view read-only | No equivale a historia clínica completa ni safety evidence suficiente |
| IAM productivo | `NOT_IMPLEMENTED` | port sin adaptador | DEC-013 |
| Observabilidad/continuidad | `PARTIALLY_IMPLEMENTED` / `NOT_IMPLEMENTED` | correlation ID, errores/log mínimos, health de proceso | Sin readiness, metrics, incidents, backup/restore/DR |
| Motor de compromisos | `DESIGN_FORESEEABLE / NOT_IMPLEMENTED` | especificación CE-01–CE-20 y ADR-0016 | Gates institucionales/regulatorios y hazards abiertos |

## 9. Método de identificación de peligros

Se aplicaron:

1. Functional Failure Analysis por función: ausencia, duplicación, ejecución
   incorrecta, demasiado pronto/tarde, dato erróneo y output mal interpretado.
2. HAZID sobre información, acceso, temporalidad, automatización, interfaz humana,
   continuidad, dependencias y change/configuration control.
3. Structured What-If, incluidos source down, DB down, role revoked, duplicate
   request, stale snapshot, wrong episode, job silent, clock/DST y correction race.
4. Revisión de uso normal, condiciones de fallo, mal uso razonablemente previsible
   y dependencia de controles humanos/organizativos.

El análisis separó causa técnica, estado peligroso y daño clínico potencial. Los
riesgos solo financieros/reputacionales/jurídicos quedaron fuera si no existía
una secuencia clínica plausible.

Limitaciones: análisis realizado sobre repositorio y documentos, sin taller
multidisciplinar, usuarios clínicos, pacientes/cuidadores, entorno real, datos
operativos, incidentes o CSO. Por tanto la identificación no puede declararse
completa.

## 10. Resumen del Hazard Log

El [Hazard Log inicial](hazard-log-initial.md) contiene 20 peligros abiertos:

- 12 del baseline: wrong-patient/episode, omisión/duplicación, calidad/procedencia,
  autorización, historia/auditoría, automation bias de avisos, no respuesta,
  falsa confianza, cierre, continuidad, dependencias y control humano;
- 8 del diseño del motor: ausencia como incumplimiento, fuente caída como ausencia,
  clasificación temporal/conciliación, tiempo/DST/reloj, carreras, job silencioso,
  mutación Clinical Rules→Core y compromiso omitido/duplicado/mal vinculado.

Para los 20: severidad, probabilidad, riesgo inicial y residual =
`NOT_ESTIMATED`; aceptabilidad = `NOT_DEMONSTRATED`; aceptación residual =
ninguna. Las consecuencias clínicas son `PROVISIONAL / CSO REVIEW REQUIRED`.

## 11. Argumento de seguridad estructurado

Los estados permitidos son `SUPPORTED_BY_TECHNICAL_EVIDENCE`,
`PARTIALLY_SUPPORTED`, `NOT_DEMONSTRATED`, `CSO_REVIEW_REQUIRED` e
`INSTITUTIONAL_DECISION_REQUIRED`.

### C1 — El baseline está acotado técnicamente a una demo sintética

| Elemento | Contenido |
| --- | --- |
| Claim | La configuración evaluada contiene barreras técnicas y mensajes que limitan su ejecución prevista a una demo local sintética. |
| Argument | El demo exige loopback, `DEMO_MODE`, usuarios sintéticos y cookies server-side; la UI/README declaran no uso clínico. |
| Evidence | `README.md`; `.env.example`; `src/infrastructure/security/loopback.ts::assertLoopbackRequestHost`; `src/infrastructure/identity/demo-identity-provider.ts::PrismaDemoIdentityProvider`; `src/app/page.tsx`; `security-controls.test.ts`; `foundation-http.spec.ts`. |
| Gap | Un disclaimer/loopback no evita uso indebido de capturas, forks o despliegues modificados; no hay release governance formal. |
| Estado | `PARTIALLY_SUPPORTED`; solo sostiene el baseline/configuración observados. |

### C2 — El baseline preserva historia y reduce duplicaciones técnicas en workflows críticos

| Elemento | Contenido |
| --- | --- |
| Claim | Los workflows inspeccionados aplican versionado/eventos, transacciones, idempotencia y/o concurrencia para evitar overwrites y duplicaciones silenciosas. |
| Argument | Estado, historia y auditoría se confirman juntos; constraints/triggers protegen append-only y replays. |
| Evidence | `prisma/schema.prisma`; once migraciones; `manage-discharge-episode.ts`; `manage-check-ins.ts`; `manage-explainable-alerts.ts`; `manage-nursing-tasks.ts`; integration tests de episodio/check-in/workqueue/security/safety plan. |
| Gap | No hay backup/restore/reconciliación; no todas las omisiones humanas son detectables; cobertura técnica no demuestra efectividad clínica. |
| Estado | `SUPPORTED_BY_TECHNICAL_EVIDENCE` para invariantes probados; `CSO_REVIEW_REQUIRED` para relevancia clínica. |

### C3 — El acceso inspeccionado es deny-by-default y por recurso, pero solo demo

| Elemento | Contenido |
| --- | --- |
| Claim | Las rutas/casos de uso inspeccionados revalidan sesión, rol activo y relación/scope del recurso; admin/support no heredan acceso clínico. |
| Argument | El rol es una primera puerta y la relación con episodio/scope se verifica server-side. |
| Evidence | `src/domain/auth/authorization.ts`; `src/infrastructure/http/demo-episode-request.ts`; `src/infrastructure/auth/session-reader.ts`; casos de uso; tests auth/security/caregiver/E2E. |
| Gap | No hay IdP, MFA, subject linking, tenant/organization scope, provisioning, break-glass ni role mapping institucional. |
| Estado | `SUPPORTED_BY_TECHNICAL_EVIDENCE` para demo; `INSTITUTIONAL_DECISION_REQUIRED` para cualquier uso real. |

### C4 — No se encontró acción clínica automática en el baseline auditado

| Elemento | Contenido |
| --- | --- |
| Claim | Evaluar/revisar un aviso no crea tareas, comunicaciones, derivaciones, tratamiento, firmas o cierre; la tarea derivada requiere review y POST humano autorizado. |
| Argument | `EvaluateRuleService`, `ReviewAlertService` y `CreateNursingTaskService` están separados; la policy es pura y fail-closed. |
| Evidence | `src/application/alerts/manage-explainable-alerts.ts`; `src/domain/authorization/human-authorization.ts`; `src/application/workqueue/manage-nursing-tasks.ts`; ADR-0012; tests de alert/human authorization/workqueue. |
| Gap | Una tarea directa humana existe; la separación Core/Clinical Rules no es desplegable; no hay validación clínica del workflow ni garantía sobre cambios futuros. |
| Estado | `SUPPORTED_BY_TECHNICAL_EVIDENCE` para commit base; no implica “sistema seguro”. |

### C5 — Los outputs clínicamente sensibles muestran algunos límites explícitos

| Elemento | Contenido |
| --- | --- |
| Claim | Semáforo off, crisis deshabilitada, Home Safety informativo y SBAR no firmado reducen ciertas interpretaciones erróneas en la demo. |
| Argument | La configuración y el dominio prohíben número/URI no aprobados, scoring/certificación y contenido SBAR inventado. |
| Evidence | `.env.example`; `crisis-resource.ts`; `home-safety.ts`; `generate-deterministic-sbar.ts`; unit/E2E asociados. |
| Gap | No existe estudio de factores humanos, validación clínica, protocolo, formación o prueba de que usuarios comprendan los límites. |
| Estado | `PARTIALLY_SUPPORTED / CSO_REVIEW_REQUIRED`. |

### C6 — La evidencia técnica se presenta con estados de integridad, no como seguridad clínica

| Elemento | Contenido |
| --- | --- |
| Claim | `EpisodeGovernanceEvidenceView` distingue `COMPLETE`, `PARTIAL`, `INCONSISTENT`, `NOT_APPLICABLE` y `UNAVAILABLE` y declara límites. |
| Argument | La proyección es read-only, minimizada, bounded y usa snapshot `REPEATABLE READ`; contradicciones visibles fallan cerradas. |
| Evidence | ADR-0014; `governance-evidence.ts`; `prisma-governance-evidence-reader.ts`; domain/app/integration tests. |
| Gap | La decisión histórica de autorización por instancia y el rol histórico del reviewer no se persisten; UI/humano puede sobreinterpretar `COMPLETE`; límite de 100. |
| Estado | `SUPPORTED_BY_TECHNICAL_EVIDENCE` para integridad técnica; seguridad clínica `NOT_DEMONSTRATED`. |

### C7 — El motor de compromisos contiene un diseño que reconoce hazards clave

| Elemento | Contenido |
| --- | --- |
| Claim | El diseño futuro separa ausencia, no respuesta, evidencia tardía/puntual, error de fuente y non-fulfilment humano; propone idempotencia, locks y observabilidad. |
| Argument | La especificación define estados, cuatro tiempos, abstención y gates; ADR-0016 ordena evaluación/enlace. |
| Evidence | [especificación del motor](../../architecture/commitment-engine-spec.md) CE-01–CE-20; [ADR-0016](../../adr/0016-commitment-evaluation-concurrency.md). |
| Gap | No hay código, schema, migración, caso de uso, UI, scheduler, service identity, pruebas, decisión local ni aprobación. |
| Estado | `NOT_DEMONSTRATED`; evidencia documental de diseño solamente. |

### C8 — Existe un proceso completo de gestión de riesgo clínico y autoridad de release

| Elemento | Contenido |
| --- | --- |
| Claim | Clinical risk management lifecycle, CSO, plan, criterios, hazard workshop, incident log, monitoring y aceptación residual están establecidos. |
| Argument | DCB0129 requiere estos elementos para sostener una conclusión formal. |
| Evidence | No existe evidencia suficiente en el repositorio. |
| Gap | Todos los elementos principales están ausentes/no aprobados; véase Gap Register. |
| Estado | `NOT_DEMONSTRATED / INSTITUTIONAL_DECISION_REQUIRED`. |

### Argumento superior

| Claim superior | Argumento | Evidencia | Gap | Estado |
| --- | --- | --- | --- | --- |
| La configuración evaluada puede mostrarse únicamente como demo sintética controlada, sin inferir preparación clínica. | C1–C6 aportan controles técnicos limitados; C7 es diseño; C8 no está demostrado. Los peligros siguen abiertos y no estimados. | Código, schema, pruebas y documentos citados; Hazard Log. | Sin CSO, plan, criterios, workshop, aceptación, operación, continuidad, IAM, validación clínica o release formal. | `PARTIALLY_SUPPORTED` para demo; uso real `NOT_DEMONSTRATED`. |

## 12. Controles existentes y fuerza de evidencia

| Familia de control | Estado | Fuerza de evidencia | Qué demuestra | Qué no demuestra |
| --- | --- | --- | --- | --- |
| Loopback/demo/sintético | `IMPLEMENTED / TECHNICALLY_VERIFIED` | Código + unit/E2E + seed | Configuración demo restringida observada | Imposibilidad absoluta de mal uso o release governance |
| RBAC/recurso/scope/revocación | `IMPLEMENTED / TECHNICALLY_VERIFIED` | Domain/app/integration/E2E | Decisiones técnicas en paths probados | IAM institucional, least privilege operativo o seguridad clínica |
| Versionado/append-only | `IMPLEMENTED / TECHNICALLY_VERIFIED` | Schema + triggers + integration | Historia protegida en invariantes probados | Retención legal, backup o corrección clínica suficiente |
| Idempotencia/concurrencia | `IMPLEMENTED / TECHNICALLY_VERIFIED` | Unit/integration con carreras | No duplicación/lost update en casos probados | Entrega completa, ausencia de todos los fallos o proceso humano ejecutado |
| Revisión antes de tarea derivada | `IMPLEMENTED / TECHNICALLY_VERIFIED` | Policy + service + DB + tests | Gate técnico del único path derivado implementado | Calidad/competencia/timeliness de la revisión |
| Abstención/input/provenance | `IMPLEMENTED / TECHNICALLY_VERIFIED` | Domain + persistence + tests | Comportamiento determinista interno | Validez clínica de regla/input/fuente |
| Semáforo off/crisis bloqueada | `IMPLEMENTED / TECHNICALLY_VERIFIED` | Config/constants + tests | Features no autorizadas bloqueadas | Disponibilidad de recursos clínicos alternativos |
| Error/log minimizados | `IMPLEMENTED / TECHNICALLY_VERIFIED` parcial | Unit/E2E y code review | Paths probados no reflejan contenido | Observabilidad/incidentes end-to-end productivos |
| CI/calidad | `IMPLEMENTED` | Workflow, scripts y suites | Baseline técnico reproducible | Safety validation, cobertura completa o clinical risk acceptance |

## 13. Controles documentados o pendientes

| Control | Estado real | Dependencia |
| --- | --- | --- |
| Clinical Risk Management Plan y criterios | `ABSENT / INSTITUTIONAL_PENDING` | CSO + gobierno del fabricante |
| Taller de peligros y aprobación del Hazard Log | `ABSENT / INSTITUTIONAL_PENDING` | Equipo multidisciplinar + CSO |
| IAM/roles/subject linking productivos | `DOCUMENTED / INSTITUTIONAL_PENDING` | DEC-013 |
| Protocolos clínicos, reglas, semáforo, crisis, SBAR | `DOCUMENTED / INSTITUTIONAL_PENDING` | DEC-006–012 |
| Assignment/acceptance/SLA/escalado | `DOCUMENTED / INSTITUTIONAL_PENDING` | DEC-017 |
| Incident management/monitoring | `DOCUMENTED / INSTITUTIONAL_PENDING` | DEC-014 |
| Continuidad, backup/restore y reconciliación | `DOCUMENTED / INSTITUTIONAL_PENDING` | DEC-015 |
| Data lifecycle/retention/rights | `DOCUMENTED / INSTITUTIONAL_PENDING` | DEC-005 |
| Core/Clinical Rules separada | `DOCUMENTED / PLANNED` | ADR-0015 + evaluación regulatoria |
| Motor de compromisos | `DOCUMENTED / PLANNED / NOT_IMPLEMENTED` | ADR-0015/0016, DEC-002/005/013–017 |
| Controles de desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`; ninguno `TRANSFERRED` | Acuerdo formal + gestión local/DCB0160 |

## 14. Defectos, incertidumbres y decisiones abiertas

- `/api/health` prueba respuesta de proceso, no DB readiness.
- No hay backup, restore, failover, degraded mode, contingency ni reconciliación.
- No hay IdP productivo, subject linking, role mapping, service identity o
  break-glass.
- No se persisten la decisión histórica por instancia de human authorization ni
  el rol histórico fiable del reviewer.
- Evidence view limita colecciones a 100 y puede ser `PARTIAL`.
- No hay métricas, tracing, SLO, alertas, on-call o incident workflow.
- No hay scheduler para check-ins ni motor futuro; expiración actual requiere
  petición profesional explícita.
- No existe contrato de commitment/deadline/evidence en el baseline.
- No hay validación clínica de fixtures, contenido, UX, Home Safety o SBAR.
- No existe procedimiento de release/rollback clínico ni autoridad identificada.
- DEC-001–017 aplicables siguen pendientes; ADR-0015/0016 son propuestas.

## 15. Riesgos no estimados y no aceptados

No se aplicó la matriz ilustrativa de la Implementation Guidance. DCB0129 exige
que los criterios de estimación/aceptabilidad estén en el Clinical Risk
Management Plan; ese plan no existe ni está aprobado. Asignar categorías ahora
inventaría una metodología local.

Por tanto:

- los 20 peligros permanecen `NOT_ESTIMATED`;
- no se ha evaluado aceptabilidad inicial o residual;
- no se declara ningún peligro cerrado o control efectivo clínicamente;
- no se ha realizado risk-benefit analysis;
- no existe aceptación de riesgo residual ni autoridad que pueda otorgarla.

## 16. Riesgos y controles potencialmente transferibles al desplegador

La transferencia es solo candidata. Ningún hospital ha aceptado nada.

| Área | Riesgo/control candidato | Requisito antes de transferencia |
| --- | --- | --- |
| Identidad | Patient matching, altas/bajas, roles, MFA, break-glass | Contrato, responsable, pruebas y evidencia DEC-013 |
| Workflow | Dotación, turnos, acceptance, suplencia, escalado y canales alternativos | Política versionada y formación DEC-017 |
| Configuración clínica | Protocolos, reglas, crisis, SBAR y wording UI | Aprobación clínica/TI y change control |
| Infraestructura | Hosting, TLS/proxy, DB, time sync, scheduler, monitoring | Baseline, SLO/runbook, drills y ownership |
| Continuidad | Backup/restore, RTO/RPO, contingencia y reconciliación | DEC-015 aprobada/probada |
| Fuente/evidencia futura | Availability, freshness, `recordedAt`, coverage y conciliación | Contrato de interfaz y prueba end-to-end |
| Incidentes | Recepción, triage, escalado, comunicación y feedback al fabricante | Proceso conjunto y Safety Incident Log |
| Formación/factores humanos | Interpretación de avisos, estados, ausencia/no respuesta y limitaciones | Competencia, material aprobado y evaluación |

## 17. Dependencias de DCB0160

DCB0160 es la referencia relacionada para la organización que despliega y usa el
sistema. Este informe no afirma conformidad DCB0160 ni descarga responsabilidades
del fabricante. Una organización candidata necesitaría, como mínimo:

- definir entorno, workflows, interfaces, usuarios, población y uso local;
- analizar riesgos locales e interfaces con el safety case del fabricante;
- aceptar explícitamente y verificar controles transferidos;
- aprobar configuración, formación, soporte, continuidad e incident reporting;
- proporcionar feedback de incidentes/cambios al fabricante.

No hay organización desplegadora identificada, acuerdo, DCB0160, aceptación o
evidencia de implementación local.

## 18. Monitorización e incidentes futuros

Antes de cualquier despliegue se requiere:

1. Safety Incident Management Log versionado, sin PHI/PII innecesaria.
2. Canal y proceso para usuarios/fabricante/desplegador con ownership, triage,
   resolución, comunicación y feedback al safety case.
3. Métricas y alertas técnicas aprobadas: disponibilidad de dependencias,
   errores, backlog, última ejecución/heartbeat, skips/conflicts y freshness.
4. Separación entre telemetría, `AuditEvent`, incidente, ticket y registro clínico.
5. Revisión de supuestos y efectividad de controles; triggers de reevaluación por
   cambio de código, dependencia, regla, interfaz, población o workflow.
6. Stop/pause/rollback y procedimiento alternativo probado.

Los actuales correlation IDs, stderr sanitizado, `/api/health` y agregados de cola
son insuficientes para estas funciones.

## 19. Limitaciones de la demo sintética

- Los fixtures no representan distribución, complejidad, errores, sesgos o
  comportamiento de datos/personas reales.
- Las seis identidades no prueban identity assurance, organización, equipos,
  turnos o privilegios reales.
- Un navegador loopback no representa red, proxy, dispositivos, disponibilidad,
  latencia ni seguridad hospitalarias.
- Las pruebas automatizadas no observan carga cognitiva, fatiga, accesibilidad
  clínica, interpretación, workaround o coordinación interprofesional.
- La ausencia de incidentes reales no es evidencia de seguridad.
- El happy path de demo no demuestra completitud del workflow, capacidad,
  recuperación, outcomes ni efectividad clínica.

## 20. Quality assurance y control de configuración

Existe control técnico en Git, lockfile, TypeScript estricto, Prettier, ESLint,
Vitest, Playwright, build y CI con PostgreSQL. La trazabilidad canónica REQ-01–14
tiene script propio. Este documento registra commit y rama.

No existe evidencia de QMS/clinical safety governance, approver list, CSO,
Clinical Risk Management File completo, criterios de release clínico, firma de
documentos, artifact manifest o auditoría de un release entregable. El estado de
QA de software no se convierte en aprobación clínica.

## 21. Conclusión de seguridad estrictamente limitada

La evidencia inspeccionada sostiene únicamente que el baseline del commit
`975d7db8b54193ed5352e8b535763a92fc047324` puede utilizarse como **demo
sintética controlada**, en loopback y sin pacientes/datos reales, para mostrar
determinados comportamientos técnicos versionados, autorizados y trazables.

No existe evidencia suficiente para declarar seguridad para pacientes reales. El
motor de compromisos es diseño no implementado y sus controles no son actuales.
Este informe no autoriza piloto, producción, integración ni uso clínico; no
declara cumplimiento DCB0129 y no contiene aceptación de riesgo residual.

Se requiere revisión multidisciplinar, un Clinical Risk Management Plan con
criterios aprobados y la revisión/aprobación de un CSO competente antes de emitir
una versión formal. Hasta entonces: `REAL PILOT = NO_GO`.

