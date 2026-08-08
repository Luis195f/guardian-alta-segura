# Hazard Log inicial — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**  
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`  
> `REAL PILOT = NO_GO`

## Control del documento

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-HL-INITIAL-001` |
| Versión | `0.1-draft` |
| Fecha de corte | 2026-07-31 |
| Rama | `docs/clinical-safety-dcb0129` |
| Commit base evaluado | `975d7db8b54193ed5352e8b535763a92fc047324` (`docs: specify verifiable commitment engine (#28)`) |
| Fase | Diseño / prepiloto sintético |
| Intended use evaluado | Demo técnica local y controlada, exclusivamente con datos e identidades sintéticos |
| Aprobación | Ninguna |
| Riesgo residual aceptado | Ninguno |

Este registro aplica DCB0129 como método de seguridad clínica, no como afirmación
de obligación jurídica automática en España ni como declaración de conformidad.
La referencia publicada vigente es DCB0129, Specification v4.2 e Implementation
Guidance v3.2, release Amd 24/2018. NHS England declara que DCB0129 y DCB0160
están sometidos a revisión: [página oficial de DCB0129](https://digital.nhs.uk/data-and-information/information-standards/governance/latest-activity/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/),
[Specification v4.2](https://digital.nhs.uk/binaries/content/assets/website-assets/data-and-information/information-standards/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/0129242018spec.pdf) e
[Implementation Guidance v3.2](https://digital.nhs.uk/binaries/content/assets/website-assets/data-and-information/information-standards/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/0129242018impguid.pdf).

## Método, taxonomía y límites

La identificación combinó Functional Failure Analysis, HAZID, Structured What-If
y revisión de uso normal, condición de fallo, mal uso razonablemente previsible y
dependencias externas. Cada entrada usa la cadena:

`causa → estado peligroso → secuencia de acontecimientos → daño clínico potencial`

Se excluyen los fallos puramente financieros, reputacionales o jurídicos que no
tengan una vía plausible hacia daño al paciente o deterioro de la atención. Una
vulnerabilidad, bug o caída técnica solo entra cuando existe esa vía clínica.

Estados de capacidad:

| Estado | Significado |
| --- | --- |
| `CURRENT_BASELINE` | Existe en el código del commit evaluado. |
| `DOCUMENTED_CONTROL_ONLY` | Está documentado, pero no implementado. |
| `DESIGN_FORESEEABLE` | Pertenece al diseño futuro; no es un defecto actual. |
| `DEPLOYMENT_CONTROL_CANDIDATE` | Podría corresponder a una organización desplegadora; no está transferido ni aceptado. |
| `NOT_APPLICABLE` | No aplica al scope evaluado, con justificación. |
| `INSUFFICIENT_EVIDENCE` | No hay evidencia verificable suficiente. |

Estados de control usados en este registro:

| Estado real del control | Significado |
| --- | --- |
| `IMPLEMENTED` | Existe una medida técnica en el baseline. |
| `TECHNICALLY_VERIFIED` | Existe prueba técnica identificada; no demuestra seguridad clínica. |
| `DOCUMENTED` | Existe solo en especificación, ADR, runbook o decisión. |
| `PLANNED` | Acción futura propuesta, todavía sin implementación. |
| `INSTITUTIONAL_PENDING` | Requiere decisión, configuración, formación o aprobación local. |
| `TRANSFERRED` | Transferencia formalmente aceptada por un desplegador; no hay ninguna en esta versión. |
| `ABSENT` | No existe el control. |

No existe un Clinical Risk Management Plan aprobado ni criterios de estimación y
aceptabilidad aprobados. Por ello, para todos los peligros:

- severidad, probabilidad, riesgo inicial y riesgo residual = `NOT_ESTIMATED`;
- descripción clínica = `PROVISIONAL / CSO REVIEW REQUIRED`;
- aceptabilidad y aceptación residual = `NOT_DEMONSTRATED`;
- una prueba técnica solo sostiene el comportamiento probado, no la efectividad
  clínica del control.

## Resumen del registro

| ID | Peligro | Alcance | Severidad | Probabilidad | Riesgo inicial | Riesgo residual | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HAZ-GAS-001 | Asociación con paciente o episodio incorrecto | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-002 | Omisión o duplicación de episodio, check-in, revisión o tarea | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-003 | Información incompleta, obsoleta, contradictoria o con procedencia insuficiente | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-004 | Acceso o actuación fuera del ámbito autorizado | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-005 | Pérdida o duplicación de historia, auditoría o efecto idempotente | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-006 | Aviso determinista interpretado como diagnóstico, pronóstico o prioridad clínica | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-007 | No respuesta atribuida erróneamente al paciente o al equipo | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-008 | UI, demo o proyección técnica producen falsa confianza u ocultan incertidumbre | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-009 | Cierre o abandono de seguimiento por estado incorrectamente interpretado | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-010 | Indisponibilidad y recuperación/continuidad insuficientes | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-011 | Dependencia, configuración o componente de terceros altera la seguridad | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-012 | Control humano no accesible, no autorizado o no ejecutado | `CURRENT_BASELINE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / CSO_REVIEW_REQUIRED` |
| HAZ-GAS-013 | Ausencia de evidencia interpretada como incumplimiento | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |
| HAZ-GAS-014 | Fuente no disponible interpretada como ausencia | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |
| HAZ-GAS-015 | Evidencia puntual descubierta después o evidencia tardía presentada como puntual | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |
| HAZ-GAS-016 | Plazo, zona horaria, DST o reloj incorrectos | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |
| HAZ-GAS-017 | Carrera entre evaluación, evidencia y corrección | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |
| HAZ-GAS-018 | Job futuro deja de ejecutarse sin detección | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |
| HAZ-GAS-019 | Clinical Rules muta Core o genera acción clínica automática | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |
| HAZ-GAS-020 | Compromiso omitido, duplicado o ligado al episodio/responsable equivocado | `DESIGN_FORESEEABLE` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `NOT_ESTIMATED` | `OPEN / DESIGN REVIEW REQUIRED` |

## Entradas detalladas

### HAZ-GAS-001 — Asociación con paciente o episodio incorrecto

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; creación y acceso a episodio, Plan, check-in, aviso, tarea, cuidador y Domicilio Seguro. |
| Estado peligroso | Información o actuación organizativa se presenta o registra bajo otro paciente/episodio. |
| Causas | `C001-A` ID de episodio/paciente erróneo en petición; `C001-B` vínculo cruzado entre recurso y episodio; `C001-C` identidad demo confundida con identidad real; `C001-D` fallo futuro de subject linking institucional. |
| Secuencia previsible | Selección/vínculo equivocado → autorización o constraint insuficiente → datos del episodio incorrecto se muestran o mutan → profesional toma una decisión de seguimiento sobre contexto ajeno → atención correcta se retrasa o se actúa sobre otra persona. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: seguimiento omitido o erróneo, exposición que altera la relación asistencial, retraso en revisión o actuación inapropiada. |
| Expuestos / tipo de uso | Paciente sintético representado, profesionales, cuidador; uso normal con error humano, condición de fallo y mal uso previsible. |
| Controles existentes | `CTRL-001-A` FK y claves compuestas same-episode (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-001-B` responsabilidad por recurso y scope cuidador (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-001-C` identidad/seed sintéticos (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-001-D` IdP/subject linking institucional (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | `prisma/schema.prisma` (`DischargeEpisode`, claves compuestas de `Alert`, `Task`, check-in y cuidador); `src/application/workqueue/manage-nursing-tasks.ts::authorizeEpisode`; `src/application/alerts/manage-explainable-alerts.ts::assertAssignedToEpisode`; `src/infrastructure/persistence/caregiver-access.integration.test.ts`; DEC-013. Commit base indicado arriba. |
| Prueba relevante | `check-in.integration.test.ts` rechaza cruces de protocolo/pregunta; `manage-nursing-tasks.test.ts` rechaza aviso de otro episodio; `caregiver-access.integration.test.ts` rechaza combinaciones relacionales imposibles; `foundation-http.spec.ts` recorre roles. |
| Controles adicionales | Definir subject/issuer/tenant y reconciliación de identidad; pruebas de wrong-patient end-to-end con IdP real; UX de confirmación contextual; verificación local de identificadores y formación. |
| Propietario propuesto / decisión | Dirección TI + Dirección Médica, **propuestos, no aprobados**; DEC-001/013/016. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: patient matching, gestión de duplicados, formación, revisión de accesos. No transferido/aceptado. |
| Estado / supuestos / evidencia faltante | `OPEN`; no hay IdP, pacientes reales, MPI ni protocolo local. No hay estimación ni aceptación. |

### HAZ-GAS-002 — Omisión o duplicación de episodio, check-in, revisión o tarea

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; episodios, asignaciones/outcomes, evaluaciones/avisos/revisiones y tareas/eventos. |
| Estado peligroso | Un elemento necesario falta o se duplica y la cola/historia no representa el trabajo real. |
| Causas | `C002-A` reintento o doble submit; `C002-B` carrera de outcomes o resolución; `C002-C` fallo antes/después de commit; `C002-D` ausencia de scheduler para expiraciones; `C002-E` error humano al no crear/revisar una tarea. |
| Secuencia previsible | Solicitud repetida/perdida o trabajo no iniciado → historial incompleto/duplicado → usuario cree que existe cobertura o no ve un pendiente → revisión/contacto se omite o se repite → retraso, carga duplicada o comunicación contradictoria. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: retraso de seguimiento, pérdida de continuidad, duplicación de contactos o decisiones basadas en una historia incorrecta. |
| Expuestos / tipo de uso | Paciente, profesional, cuidador; uso normal, fallo técnico y error humano razonablemente previsible. |
| Controles existentes | `CTRL-002-A` idempotency key + fingerprint (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-002-B` revisión optimista/unicidad terminal (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-002-C` transacciones (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-002-D` scheduler/entrega garantizada (`ABSENT`). |
| Evidencia exacta | `src/application/episode/manage-discharge-episode.ts`; `src/application/check-in/manage-check-ins.ts`; `src/application/alerts/manage-explainable-alerts.ts`; `src/application/workqueue/manage-nursing-tasks.ts`; modelos `CheckInOutcome`, `RuleEvaluation`, `TaskEvent`, `EpisodeTransition` en `prisma/schema.prisma`. |
| Prueba relevante | `discharge-episode.integration.test.ts`; carreras response/omit/expire en `check-in.integration.test.ts`; idempotencia de evaluación en `manage-explainable-alerts.test.ts`; carreras/idempotencia en `nursing-workqueue.integration.test.ts`. |
| Controles adicionales | Proceso operativo que detecte elementos no creados/no revisados; monitorización de fallos transaccionales; reconciliación; criterios y ownership institucionales sin automatizar decisiones clínicas. |
| Propietario propuesto / decisión | Dirección de Enfermería + Dirección TI, **propuestos**; DEC-006/014/017. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: supervisión de cola, dotación, reconciliación y procedimientos alternativos. |
| Estado / supuestos / evidencia faltante | `OPEN`; la idempotencia reduce duplicación técnica, pero no prueba completitud del proceso ni que una persona ejecute la acción. |

### HAZ-GAS-003 — Información incompleta, obsoleta, contradictoria o con procedencia insuficiente

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; check-ins, procedencia de avisos, evidence view, Plan, Home Safety y SBAR. |
| Estado peligroso | La UI presenta un snapshot parcial, legado o inconsistente sin que el usuario comprenda el límite. |
| Causas | `C003-A` inputs requeridos ausentes; `C003-B` lineage legacy/invalid; `C003-C` truncamiento a 100 referencias; `C003-D` rol histórico/revisión de autorización no persistidos; `C003-E` datos cambiantes leídos fuera de un snapshot; `C003-F` resumen SBAR derivado de fuentes incompletas. |
| Secuencia previsible | Dato no disponible/contradictorio → proyección o resumen parcial → incertidumbre pasa desapercibida o se interpreta como completitud → revisión se orienta con información insuficiente → retraso u omisión de atención. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: decisión de seguimiento mal informada, handover incompleto o falsa tranquilidad. |
| Expuestos / tipo de uso | Profesionales y pacientes/cuidadores según vista; uso normal y condición de fallo. |
| Controles existentes | `CTRL-003-A` abstención de regla por input ausente (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-003-B` estados `PARTIAL/INCONSISTENT/UNAVAILABLE` (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-003-C` `REPEATABLE READ` en evidence view (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-003-D` proceso de conciliación (`ABSENT`). |
| Evidencia exacta | `src/domain/alerts/explainable-rule.ts::evaluateExplainableRule`; `src/domain/governance/governance-evidence.ts::projectEpisodeGovernanceEvidence`; `src/infrastructure/persistence/prisma-governance-evidence-reader.ts`; ADR-0014; GAS2-R-009/010. |
| Prueba relevante | `explainable-rule.test.ts` (abstención); `governance-evidence.test.ts` (truncamiento, contradicción y evidencia no persistida); `governance-evidence.integration.test.ts` (snapshot concurrente); `generate-deterministic-sbar.test.ts`. |
| Controles adicionales | Human-factors review de estados de incertidumbre; criterios de freshness por fuente; reconciliación formal; persistir evidencia adicional solo si se aprueba y minimiza. |
| Propietario propuesto / decisión | Dirección Médica, Dirección de Enfermería y Dirección TI, **propuestos**; DEC-005/006/008/012/014/017. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: disponibilidad/freshness de fuentes, formación y conciliación con HCE. |
| Estado / supuestos / evidencia faltante | `OPEN`; no hay estudio de usabilidad clínica ni fuentes reales. |

### HAZ-GAS-004 — Acceso o actuación fuera del ámbito autorizado

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; sesión demo, RBAC, autorización por episodio, cuidador, admin/support. |
| Estado peligroso | Una persona ve o modifica información o trabajo de un episodio fuera de su relación autorizada. |
| Causas | `C004-A` confiar solo en rol; `C004-B` rol revocado/stale; `C004-C` scope cuidador obsoleto; `C004-D` cookie/token reutilizado; `C004-E` IdP/mapeo institucional inexistentes; `C004-F` acceso privilegiado futuro sin segregación. |
| Secuencia previsible | Autenticación/role mapping incorrecto → control de recurso no aplicado o desactualizado → lectura/mutación ajena → información o workflow alterado → decisiones o seguimiento incorrectos. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: pérdida de confidencialidad con efecto asistencial, modificación indebida, pérdida de confianza o retraso en la atención correcta. |
| Expuestos / tipo de uso | Paciente, cuidador, profesionales; fallo y mal uso previsible. |
| Controles existentes | `CTRL-004-A` RBAC deny-by-default (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-004-B` responsabilidad/scope por recurso (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-004-C` revalidación de sesión/roles/revocación (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-004-D` IAM productivo/break-glass/JIT (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | `src/domain/auth/authorization.ts::authorize`; `src/infrastructure/http/demo-episode-request.ts`; `src/infrastructure/auth/session-reader.ts`; `src/application/workqueue/manage-nursing-tasks.ts::authorizeEpisode`; `src/infrastructure/persistence/prisma-caregiver-access-unit-of-work.ts`; DEC-013. |
| Prueba relevante | `authorization.test.ts`; `security-services.test.ts`; `security-transactions.integration.test.ts`; `caregiver-access.integration.test.ts`; `foundation-http.spec.ts`; `role-based-navigation.spec.ts`. |
| Controles adicionales | IdP y role mapping aprobados; tenant/organization scope; access review; break-glass y soporte segregados; pruebas con configuración institucional. |
| Propietario propuesto / decisión | Dirección TI + Responsable del Tratamiento, **propuestos**; DEC-004/005/013/016. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: altas/bajas, role mapping, access review, dispositivos y acceso de emergencia. |
| Estado / supuestos / evidencia faltante | `OPEN`; controles actuales son demo loopback y no autenticación clínica real. |

### HAZ-GAS-005 — Pérdida o duplicación de historia, auditoría o efecto idempotente

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; todas las mutaciones críticas y sus historias/auditoría. |
| Estado peligroso | El estado visible y la evidencia histórica/auditoría divergen, se pierden o se duplican. |
| Causas | `C005-A` estado confirma sin evento/auditoría; `C005-B` mutación directa SQL; `C005-C` replay duplica evento; `C005-D` corrupción/restauración parcial; `C005-E` cobertura de auditoría incompleta para denegaciones. |
| Secuencia previsible | Mutación parcial o historia inconsistente → accountability/procedencia erróneas → el equipo no puede reconstruir qué ocurrió → trabajo se repite, se omite o se atribuye mal → deterioro de continuidad. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: retraso, repetición de actuación, incapacidad de detectar una omisión o handover inseguro. |
| Expuestos / tipo de uso | Profesionales y pacientes; condición de fallo y modificación no autorizada. |
| Controles existentes | `CTRL-005-A` UoW transaccional (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-005-B` triggers append-only/guarded update (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-005-C` claves/fingerprints (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-005-D` backup/restore/reconciliación (`ABSENT`). |
| Evidencia exacta | `prisma/schema.prisma::AuditEvent/TaskEvent/EpisodeTransition`; migraciones `20260715000100_platform_foundation`, `20260717000300_explainable_alerts`, `20260720000100_nursing_workqueue_tasks`, `20260721000300_reconcile_task_integrity_guards`, `20260721000400_enforce_task_event_semantics`; adapters Prisma. |
| Prueba relevante | `security-transactions.integration.test.ts`; `discharge-episode.integration.test.ts`; `nursing-workqueue.integration.test.ts` SQL negatives y auditoría minimizada. |
| Controles adicionales | Restore/reconciliation test; cobertura explícita y monitoreo de fallos de auditoría; revisión de retención; incident log de seguridad clínica. |
| Propietario propuesto / decisión | Dirección TI + propietario clínico del workflow, **propuestos**; DEC-005/014/015. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: backup, restore, retención, acceso a audit y reconciliación postincidente. |
| Estado / supuestos / evidencia faltante | `OPEN`; no hay backup/restore, monitorización productiva ni prueba clínica de efectividad. |

### HAZ-GAS-006 — Aviso determinista interpretado como diagnóstico, pronóstico o prioridad clínica

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; RuleDefinition/Version/Evaluation, Alert y presentación. Pertenece materialmente a Clinical Rules según ADR-0015. |
| Estado peligroso | Un resultado `matched` o `administrativeSeverity` se usa como diagnóstico, score, pronóstico o urgencia clínica validada. |
| Causas | `C006-A` sesgo de automatización; `C006-B` fixture sensible confundido con regla validada; `C006-C` explicación percibida como recomendación; `C006-D` color/orden como riesgo; `C006-E` disclaimers ignorados fuera de demo. |
| Secuencia previsible | Regla sintética coincide → aviso visible con explicación/severidad → usuario sobreconfía o desplaza juicio clínico → prioriza/omite revisión indebidamente → atención retrasada o inapropiada. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: retraso de respuesta ante situación relevante, actuación innecesaria, estigmatización o falsa tranquilidad. |
| Expuestos / tipo de uso | Paciente indirectamente y profesionales; uso normal y mal uso previsible. |
| Controles existentes | `CTRL-006-A` motor determinista/versionado/abstención (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-006-B` revisión humana idempotente, con estado esperado y fingerprint, antes de tarea derivada (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-006-C` semáforo off (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-006-D` validación clínica local (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | `src/domain/alerts/explainable-rule.ts`; `src/application/alerts/manage-explainable-alerts.ts`; `src/domain/authorization/human-authorization.ts`; `prisma/migrations/20260808000100_alert_review_idempotency/migration.sql`; `.env.example`; ADR-0007/0012/0015; DEC-008/009. |
| Prueba relevante | `explainable-rule.test.ts`; `manage-explainable-alerts.test.ts` prueba abstención, RBAC y “sin crear acción clínica”; `human-authorization.test.ts`; `explainable-alerts.integration.test.ts` prueba replay/fingerprint y revisión concurrente; `explainable-alerts.spec.ts` semáforo apagado, stale y acción humana separada. |
| Controles adicionales | Intended purpose por regla, validación clínica y human-factors; lenguaje y jerarquía visual aprobados; formación; seguimiento de falsos positivos/negativos/abstenciones; separación técnica Core/Clinical Rules. |
| Propietario propuesto / decisión | Dirección Médica + CSO futuro, **propuestos**; DEC-008/009 y evaluación regulatoria. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: aprobar catálogo, competencia del usuario, workflow y respuesta local. |
| Estado / supuestos / evidencia faltante | `OPEN`; no hay validación clínica, población/intended purpose aprobados ni estudio de factores humanos. |

### HAZ-GAS-007 — No respuesta atribuida erróneamente al paciente o al equipo

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; check-ins, non-response y task contact-attempt. |
| Estado peligroso | `OMITTED`, `EXPIRED` o `no-answer` se interpreta como deterioro, incumplimiento del paciente o cumplimiento/incumplimiento del equipo. |
| Causas | `C007-A` semántica clínica no aprobada; `C007-B` outcome terminal sin contexto de canal; `C007-C` confundir intento con respuesta; `C007-D` vencimiento registrado manualmente con retraso; `C007-E` lenguaje culpabilizador. |
| Secuencia previsible | Falta respuesta/resultado de contacto → estado técnico se muestra → se atribuye causa o significado clínico no observado → se omite revisar factores técnicos/sociales o actuación del equipo → seguimiento inadecuado. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: estigmatización, pérdida de oportunidad de contacto, escalado inapropiado o atención omitida. |
| Expuestos / tipo de uso | Paciente, cuidador y equipo; uso normal y mal uso previsible. |
| Controles existentes | `CTRL-007-A` outcome de no respuesta separado de respuesta (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-007-B` revisar aviso no crea tarea (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-007-C` política clínica de no respuesta (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | modelos `CheckInOutcome`, `NonResponseEvent`, `TaskEvent` en `prisma/schema.prisma`; `src/application/check-in/manage-check-ins.ts::RecordExpiredCheckInNonResponseService`; `src/domain/workqueue/nursing-task.ts`; ADR-0006; DEC-006/017. |
| Prueba relevante | `manage-check-ins.test.ts` registra vencimiento como NonResponseEvent, no respuesta; carreras terminales en `check-in.integration.test.ts`; `manage-nursing-tasks.test.ts` registra contacto explícito. |
| Controles adicionales | Política y lenguaje local aprobados; distinguir canal no disponible, omisión voluntaria, vencimiento e intento; revisión humana y procedimiento alternativo. |
| Propietario propuesto / decisión | Dirección Médica y Dirección de Enfermería, **propuestos**; DEC-006/017. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: protocolo de no respuesta, canales alternativos, formación y dotación. |
| Estado / supuestos / evidencia faltante | `OPEN`; no hay comunicaciones reales, scheduler ni protocolo clínico aprobado. |

### HAZ-GAS-008 — UI, demo o proyección técnica producen falsa confianza u ocultan incertidumbre

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; Home Safety, SBAR, crisis, evidence view, dashboard, labels de demo. |
| Estado peligroso | Una representación técnica/sintética se interpreta como seguridad, completitud, validación clínica o capacidad productiva. |
| Causas | `C008-A` etiqueta/disclaimer poco visible; `C008-B` `COMPLETE` interpretado como “seguro”; `C008-C` checklist de domicilio como certificación; `C008-D` SBAR preview como handover aprobado/firmado; `C008-E` demo sintética presentada fuera del contexto; `C008-F` health 200 como readiness. |
| Secuencia previsible | UI muestra resultado ordenado/completo → límite no se comprende → usuario confía en que el flujo está validado/disponible → omite revisión o canal alternativo → atención se retrasa o se basa en información no autorizada. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: falsa tranquilidad, handover incompleto, falta de respuesta de crisis o dependencia de una capacidad no disponible. |
| Expuestos / tipo de uso | Pacientes, cuidadores, profesionales, demostradores; uso normal y mal uso razonablemente previsible. |
| Controles existentes | `CTRL-008-A` banners sintéticos/disclaimers (`IMPLEMENTED / TECHNICALLY_VERIFIED` parcialmente); `CTRL-008-B` Home Safety sin score/certificación (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-008-C` SBAR `signed=false`/sin contenido inventado (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-008-D` crisis deshabilitada (`IMPLEMENTED / TECHNICALLY_VERIFIED`); human-factors clínico (`ABSENT`). |
| Evidencia exacta | `src/app/page.tsx`; `src/domain/home-safety/home-safety.ts::HOME_SAFETY_DISCLAIMER`; `src/application/sbar/generate-deterministic-sbar.ts`; `src/domain/crisis/crisis-resource.ts`; `src/domain/governance/governance-evidence.ts::EVIDENCE_INTEGRITY_DEFINITIONS`; GAS2 claims register. |
| Prueba relevante | `home-safety.test.ts`; `generate-deterministic-sbar.test.ts`; `crisis-resource.test.ts`; `build-week-modules.spec.ts`; `foundation-ui.spec.ts`; `governance-evidence.test.ts`. |
| Controles adicionales | Evaluación de usabilidad clínica y accesibilidad con escenarios de error/vacío; prohibición de reutilizar capturas sin watermark; claims control; readiness diferenciada. |
| Propietario propuesto / decisión | Product owner, Dirección Médica/Enfermería y CSO futuro, **propuestos**; DEC-007/009/010/011/012/014/016. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: formación, materiales, contexto de demo, configuración/validación local. |
| Estado / supuestos / evidencia faltante | `OPEN`; no hay estudio de factores humanos ni uso real observado. |

### HAZ-GAS-009 — Cierre o abandono de seguimiento por estado incorrectamente interpretado

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; episode governance, `openObligations`, alert/task states. |
| Estado peligroso | Un estado técnico `resolved`, `actioned`, `COMPLETE` o una vista parcial se interpreta como aptitud para cerrar/abandonar controles. |
| Causas | `C009-A` equivalencia errónea entre task/alert/episode; `C009-B` política de cierre ausente; `C009-C` futura habilitación que no reevalúe snapshot atómico; `C009-D` cierre manual fuera del sistema. |
| Secuencia previsible | Pendiente técnico parece terminado → profesional/organización concluye que el episodio puede cerrarse → deja de vigilar tareas/avisos o canal alternativo → necesidad de seguimiento queda desatendida. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: interrupción prematura de continuidad y retraso en revisión/intervención humana. |
| Expuestos / tipo de uso | Paciente y profesionales; uso normal y cambio futuro previsible. |
| Controles existentes | `CTRL-009-A` cierre siempre `NOT_AUTHORIZED` (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-009-B` blockers técnicos visibles (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-009-C` política institucional/contrato atómico (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | `src/application/episode/manage-discharge-episode.ts::TransitionDischargeEpisodeService`; `src/domain/episode/activation-policy.ts::PendingInstitutionalEpisodeGovernancePolicy`; DEC-002 decision pack; GAS2-R-007/008. |
| Prueba relevante | tests de cierre fail-closed y policy permisiva en `manage-discharge-episode.test.ts`; concurrencia del episodio en `discharge-episode.integration.test.ts`. |
| Controles adicionales | Política local aprobada; especificación atómica de cierre/reapertura; UX que no equipare integridad con seguridad; prueba multidisciplinar de excepciones. |
| Propietario propuesto / decisión | Dirección Médica, **propuesta**; DEC-002. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: criterio y autoridad de cierre, revisión de pendientes y procedimiento externo. |
| Estado / supuestos / evidencia faltante | `OPEN`; el control actual bloquea cierre en software, pero no controla decisiones fuera del sistema ni autoriza uso real. |

### HAZ-GAS-010 — Indisponibilidad y recuperación/continuidad insuficientes

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; aplicación monolítica, PostgreSQL, sesión y todas las funciones. |
| Estado peligroso | La información/cola no está disponible, está desactualizada tras restore o el health indica disponibilidad falsa. |
| Causas | `C010-A` app/DB/red caída; `C010-B` health no comprueba DB; `C010-C` sin backup/restore/failover; `C010-D` sin modo contingencia/reconciliación; `C010-E` recuperación parcial o schema mismatch. |
| Secuencia previsible | Dependencia falla → UI/API no entrega información o health 200 induce confianza → equipo no activa procedimiento alternativo o trabaja con copia desactualizada → seguimiento se omite/duplica → atención se retrasa. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: pérdida temporal de acceso al Plan/cola, retraso en contacto o revisión y duplicación tras recuperación. |
| Expuestos / tipo de uso | Todos los usuarios; condición de fallo y dependencia externa. |
| Controles existentes | `CTRL-010-A` errores sanitizados/fail-closed (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-010-B` liveness técnica `/api/health` (`IMPLEMENTED / TECHNICALLY_VERIFIED`, no readiness); `CTRL-010-C` idempotencia para reintentos (`IMPLEMENTED / TECHNICALLY_VERIFIED`); continuidad/backup/restore (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | `src/app/api/health/route.ts`; `src/infrastructure/http/error-handler.ts`; DEC-015 decision pack; GAS2-R-001/012; `docker-compose.yml` (volumen local no es backup). |
| Prueba relevante | `foundation-ui.spec.ts` health técnico; `error-handler.test.ts`; pruebas de idempotencia. No existe restore/DR test. |
| Controles adicionales | Readiness por dependencia; backup/restore probado; RTO/RPO y contingency runbook aprobados; reconciliación; pruebas de caída y comunicación. |
| Propietario propuesto / decisión | Dirección TI + Dirección de Enfermería, **propuestos**; DEC-014/015/016. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: hosting, HA, backup, DR, procedimiento manual, comunicaciones y drills. |
| Estado / supuestos / evidencia faltante | `OPEN`; no hay entorno productivo, SLO, backup, restore ni continuidad clínica aprobada. |

### HAZ-GAS-011 — Dependencia, configuración o componente de terceros altera la seguridad

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; Node/Next/React/Prisma/PostgreSQL y configuración local. Integraciones clínicas productivas = `NOT_APPLICABLE` hoy. |
| Estado peligroso | Cambio/fallo de runtime, DB, paquete o configuración modifica validación, seguridad, persistencia o disponibilidad sin detectarse. |
| Causas | `C011-A` actualización de dependencia; `C011-B` configuración/env errónea; `C011-C` DB incompatible; `C011-D` cadena de suministro; `C011-E` integración futura sin contrato. |
| Secuencia previsible | Componente/config cambia → control deja de comportarse como probado → datos/roles/estados se procesan mal o el servicio falla → usuario confía en el workflow → retraso o actuación incorrecta. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: pérdida de disponibilidad/integridad/autorización que deteriora continuidad. |
| Expuestos / tipo de uso | Todos; condición de fallo y cambio de mantenimiento. |
| Controles existentes | `CTRL-011-A` lockfile/versiones fijas/CI (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-011-B` TypeScript estricto, lint, tests y build (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-011-C` configuration/change control clínico (`ABSENT`). |
| Evidencia exacta | `package.json`; `pnpm-lock.yaml`; `tsconfig.json`; `.github/workflows/ci.yml`; `src/infrastructure/config/env.ts`; no hay adaptadores HCE/FHIR/mensajería. |
| Prueba relevante | `env.test.ts`; suites unit/integration/E2E; CI. Las pruebas locales no cubren infraestructura hospitalaria. |
| Controles adicionales | SBOM/vulnerability/change impact; versión de release aprobada; qualificación de plataforma; contratos y fail-safe por interfaz; regresión en entorno representativo. |
| Propietario propuesto / decisión | Dirección TI, **propuesta**; DEC-013/014/015 y change control futuro. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: infraestructura, parches, proxy/TLS, DB y gestión de proveedores. |
| Estado / supuestos / evidencia faltante | `OPEN`; integraciones clínicas de terceros son `NOT_APPLICABLE` en baseline, pero dependencias técnicas sí existen. |

### HAZ-GAS-012 — Control humano no accesible, no autorizado o no ejecutado

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `CURRENT_BASELINE`; revisión de aviso, creación/gestión de tarea, Home Safety, SBAR y cierre bloqueado. |
| Estado peligroso | El diseño depende de revisión/acción humana que ninguna persona competente puede ver, aceptar o ejecutar a tiempo. |
| Causas | `C012-A` responsable revocado/inactivo; `C012-B` tarea sin assignee; `C012-C` assignment confundido con acceptance; `C012-D` sin equipo/turno/suplencia/SLA; `C012-E` UI/servicio no disponible; `C012-F` rol institucional no mapeado. |
| Secuencia previsible | Sistema crea/muestra pendiente → no hay persona autorizada/disponible o nadie acepta responsabilidad → el pendiente permanece sin acción y sin escalado → oportunidad de seguimiento se pierde. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: omisión o demora de revisión/contacto y deterioro de continuidad. |
| Expuestos / tipo de uso | Paciente y profesionales; uso normal, fallo organizativo y mal uso previsible. |
| Controles existentes | `CTRL-012-A` responsables activos para activación y checks actuales (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-012-B` `UNASSIGNED`/eligibilidad visible (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-012-C` sin autoassignment/escalado (`ABSENT` deliberado); `CTRL-012-D` política/dotación/aceptación (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | `src/domain/workqueue/task-accountability.ts`; `src/application/workqueue/manage-nursing-tasks.ts`; `src/domain/authorization/human-authorization.ts`; DEC-017; GAS2-R-005. |
| Prueba relevante | `task-accountability.test.ts`; `manage-nursing-tasks.test.ts`; `nursing-workqueue.integration.test.ts` revocación/concurrencia; `nursing-workqueue.spec.ts`. |
| Controles adicionales | Política institucional de assignment/acceptance/turnos/suplencia/escalado; accesibilidad y formación; supervisión independiente de pendientes; continuidad. |
| Propietario propuesto / decisión | Dirección de Enfermería + Dirección TI, **propuestos**; DEC-013/015/017. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: staffing, roles, acceptance, turnos, cobertura, formación y procedimientos alternativos. |
| Estado / supuestos / evidencia faltante | `OPEN`; el software demuestra trazabilidad técnica, no accountability institucional ni ejecución del control. |

### HAZ-GAS-013 — Ausencia de evidencia interpretada como incumplimiento

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; futuro motor de compromisos. No existe en Prisma/código. |
| Estado peligroso | `AUSENCIA_DE_EVIDENCIA_EN_PLAZO` se presenta o consume como incumplimiento, culpa o riesgo clínico. |
| Causas | `C013-A` nomenclatura/UX culpabilizadora; `C013-B` transición automática a non-fulfilment; `C013-C` política amplia/débil; `C013-D` downstream convierte estado en prioridad/acción. |
| Secuencia previsible | Evaluador no encuentra constancia → estado de ausencia se emite → humano/sistema lo interpreta como incumplimiento → escalado o decisión clínica/organizativa indebida → paciente/equipo sufren actuación inadecuada o se oculta una causa técnica. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: estigmatización, priorización errónea, contacto/derivación inapropiados o retraso al investigar la causa real. |
| Expuestos / tipo de uso | Paciente y equipo; uso normal y mal uso previsible futuro. |
| Controles existentes | `CTRL-013-A` semántica y estados separados (`DOCUMENTED`); `CTRL-013-B` non-fulfilment solo humano (`DOCUMENTED / PLANNED`); `CTRL-013-C` pruebas futuras negativas (`PLANNED`); implementación (`ABSENT`). |
| Evidencia exacta | `docs/architecture/commitment-engine-spec.md` §§ máquina de estados, semántica de ausencia, CE-07/CE-12; ADR-0015. |
| Prueba relevante | Ninguna ejecutable; lista de pruebas futuras en la especificación. |
| Controles adicionales | Aprobación de vocabulario, autoridad y policy; human-factors; interfaz neutral; prohibición técnica de transición/acción automática; monitorización de mal uso. |
| Propietario propuesto / decisión | CSO futuro + Dirección de Enfermería/Médica, **propuestos**; ADR-0015 y DEC-017. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: formación, workflow y autoridad de confirmación. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; controles son documentales, no implementados ni verificados. |

### HAZ-GAS-014 — Fuente no disponible interpretada como ausencia

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; resolver de evidencia y fuentes futuras. |
| Estado peligroso | Fallo, latencia o falta de autorización de una fuente produce una ausencia falsa. |
| Causas | `C014-A` timeout/caída; `C014-B` credencial/permiso; `C014-C` adapter incompatible; `C014-D` coverage incompleta; `C014-E` error atrapado como colección vacía. |
| Secuencia previsible | Fuente no responde → resolver devuelve “sin evidencia” → evaluador registra ausencia → humano interpreta omisión → seguimiento/prioridad se altera indebidamente. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: actuación innecesaria, distracción de recursos o retraso al no distinguir fallo técnico. |
| Expuestos / tipo de uso | Paciente/equipo; condición de fallo futuro. |
| Controles existentes | `CTRL-014-A` abstención/error ante fuente indisponible (`DOCUMENTED / PLANNED`); `CTRL-014-B` cobertura/version del resolver en evento (`DOCUMENTED / PLANNED`); `CTRL-014-C` observabilidad/SLO (`ABSENT / INSTITUTIONAL_PENDING`). |
| Evidencia exacta | `commitment-engine-spec.md` §§ política de evidencia, definición de ausencia, abstenciones, CE-11; DEC-014/015. |
| Prueba relevante | Ninguna ejecutable; pruebas futuras de fuente caída. |
| Controles adicionales | Contrato por fuente, health/freshness/coverage, códigos distintos, reintento y reconciliación; no emitir ausencia en degradación. |
| Propietario propuesto / decisión | Dirección TI + owner de fuente + CSO futuro, **propuestos**. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: disponibilidad, credenciales, monitorización y procedimientos de conciliación. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; no existen fuentes externas ni adapters en baseline. |

### HAZ-GAS-015 — Evidencia puntual descubierta después o evidencia tardía presentada como puntual

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; temporalidad y conciliación del futuro motor. |
| Estado peligroso | Se confunden `occurredAt`, `recordedAt`, `discoveredAt/linkedAt` y `evaluatedAt`, borrando o falseando puntualidad/historia. |
| Causas | `C015-A` clasificar por hora de enlace/lock; `C015-B` usar `occurredAt` como registro; `C015-C` fuente con `recordedAt` mutable/no fiable; `C015-D` conciliación sobrescribe ausencia; `C015-E` evidencia tardía backdated. |
| Secuencia previsible | Evidencia aparece alrededor/después del corte → timestamp equivocado decide → se presenta como puntual/tardía incorrectamente → revisión atribuye cumplimiento/incumplimiento erróneo → seguimiento y accountability se distorsionan. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: retraso u omisión de revisión, atribución injusta y decisiones basadas en historia falsa. |
| Expuestos / tipo de uso | Paciente/equipo; fallo, carrera y mal uso futuro. |
| Controles existentes | `CTRL-015-A` solo `recordedAt` clasifica (`DOCUMENTED / PLANNED`); `CTRL-015-B` conciliaciones on-time/late separadas (`DOCUMENTED / PLANNED`); `CTRL-015-C` ausencia append-only (`DOCUMENTED / PLANNED`); implementación (`ABSENT`). |
| Evidencia exacta | `commitment-engine-spec.md` §§ cuatro ejes temporales, máquina, CE-10; ADR-0016 §§ decisión/idempotencia. |
| Prueba relevante | Ninguna ejecutable; matriz futura de cuatro tiempos y carreras documentada. |
| Controles adicionales | Fuente autoritativa aprobada; integridad/immutability del timestamp; UX con cuatro tiempos; revisión humana/segregación; pruebas de backdating y latency. |
| Propietario propuesto / decisión | Owner de fuente + Dirección de Enfermería + CSO futuro, **propuestos**. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: autoridad del timestamp, sincronización y reconciliación local. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; semántica no aprobada, código y pruebas inexistentes. |

### HAZ-GAS-016 — Plazo, zona horaria, DST o reloj incorrectos

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; activación/evaluación temporal de compromisos. |
| Estado peligroso | Un compromiso se evalúa antes/después del plazo real o se muestra con una hora ambigua. |
| Causas | `C016-A` zona de navegador usada como autoridad; `C016-B` DST ambiguo/inexistente; `C016-C` clock drift; `C016-D` default/plazo universal no aprobado; `C016-E` corrección silenciosa de dueAt; `C016-F` calendario laboral no definido. |
| Secuencia previsible | dueAt se resuelve/muestra mal → evaluación se dispara fuera de tiempo → ausencia o puntualidad falsas → revisión/seguimiento ocurre demasiado pronto o tarde → oportunidad de atención se pierde o recursos se desvían. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: retraso de seguimiento o respuesta organizativa incorrecta. |
| Expuestos / tipo de uso | Paciente/equipo; uso normal en cambios DST y fallo de reloj. |
| Controles existentes | `CTRL-016-A` dueAt UTC + zona IANA congelados (`DOCUMENTED / PLANNED`); `CTRL-016-B` Clock inyectable/abstención (`DOCUMENTED / PLANNED`); `CTRL-016-C` sin default universal (`DOCUMENTED`); implementación (`ABSENT`). |
| Evidencia exacta | `commitment-engine-spec.md` §§ plazo/zona/reloj, CE-04/05; ADR-0016. El baseline solo implementa cálculo de check-in en `src/domain/check-in/check-in.ts`, no compromisos. |
| Prueba relevante | No hay prueba del motor; pruebas futuras UTC/IANA/DST documentadas. |
| Controles adicionales | Política temporal local; source of time; tolerancias y calendar rules; pruebas de DST/clock skew; presentación explícita de zona. |
| Propietario propuesto / decisión | Dirección de Enfermería + Dirección TI, **propuestos**; DEC-014/017. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: NTP, zona/configuración, calendario y soporte operativo. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; no existe dueAt de compromiso ni criterio institucional. |

### HAZ-GAS-017 — Carrera entre evaluación, evidencia y corrección

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; `evaluateDueCommitments`, enlace y corrección. |
| Estado peligroso | Para el mismo corte coexisten conclusiones incompatibles o una lectura obsoleta registra ausencia. |
| Causas | `C017-A` dos evaluadores; `C017-B` evidencia enlaza entre lectura y write; `C017-C` corrección concurrente; `C017-D` writers no usan lock común; `C017-E` unicidad usada como sustituto de coordinación. |
| Secuencia previsible | transacciones leen snapshots distintos → ambas confirman estados/eventos incompatibles → UI/historia divergen → revisión humana actúa sobre conclusión errónea → atención/recursos se retrasan o duplican. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: demora, duplicación o cierre organizativo incorrecto de revisión. |
| Expuestos / tipo de uso | Paciente/equipo; fallo concurrente futuro. |
| Controles existentes | `CTRL-017-A` `FOR UPDATE SKIP LOCKED` sobre versión (`DOCUMENTED / PLANNED`); `CTRL-017-B` transacción corta/revalidación (`DOCUMENTED / PLANNED`); `CTRL-017-C` unicidad semántica/fingerprint (`DOCUMENTED / PLANNED`); implementación (`ABSENT`). |
| Evidencia exacta | ADR-0016 §§ decisión, idempotencia y pruebas futuras; `commitment-engine-spec.md` CE-14. El patrón existente de tareas está en `prisma-nursing-workqueue-unit-of-work.ts`, pero no prueba el motor futuro. |
| Prueba relevante | Ninguna ejecutable para compromisos; pruebas de carrera de workqueue son evidencia de patrón, no verificación del nuevo control. |
| Controles adicionales | Port único de writers; constraints/triggers; pruebas reales PostgreSQL de todos los órdenes; métricas de skip/conflict y stop condition. |
| Propietario propuesto / decisión | Arquitectura/Ingeniería + CSO futuro, **propuestos**. |
| Transferible al desplegador | Normalmente control de fabricante; `DEPLOYMENT_CONTROL_CANDIDATE` solo para límites de carga/DB si se acuerda. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; ADR-0016 es propuesta no implementada. |

### HAZ-GAS-018 — Job futuro deja de ejecutarse sin detección

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; job protegido/scheduler futuro. |
| Estado peligroso | Compromisos vencidos no se evalúan mientras la UI/operación presupone detección automática. |
| Causas | `C018-A` scheduler no invoca; `C018-B` auth/service identity falla; `C018-C` job parcial/backlog; `C018-D` deployment sin trigger; `C018-E` dashboard sin heartbeat; `C018-F` alarma no atendida. |
| Secuencia previsible | job se detiene → no se generan revisiones de ausencia → equipo cree que no hay pendientes → compromiso omitido no se detecta → continuidad se deteriora. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: retraso u omisión de seguimiento organizativo. |
| Expuestos / tipo de uso | Paciente/equipo; condición de fallo futuro. |
| Controles existentes | `CTRL-018-A` estrategia de job y necesidad de heartbeat/run history (`DOCUMENTED / PLANNED`); `CTRL-018-B` claim limitado a evaluación manual hasta entonces (`DOCUMENTED`); scheduler/monitorización (`ABSENT`). |
| Evidencia exacta | `commitment-engine-spec.md` §§ observabilidad, estrategia de disparo, CE-17; DEC-013/014/015. |
| Prueba relevante | Ninguna ejecutable; pruebas futuras de job caído/timeout/backlog. |
| Controles adicionales | Heartbeat independiente, lag/backlog, alarmas con owner y prueba, runbook/recovery, service identity, capacity test; UI debe mostrar última evaluación/freshness. |
| Propietario propuesto / decisión | Dirección TI/Operaciones + Dirección de Enfermería, **propuestos**. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: scheduler, monitorización, on-call y runbook; no aceptado. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; no hay job, scheduler, service identity, SLO ni incident workflow. |

### HAZ-GAS-019 — Clinical Rules muta Core o genera acción clínica automática

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; frontera Core/Clinical Rules y evolución del monolito. Baseline actual evaluado para rutas existentes. |
| Estado peligroso | Un resultado clínico modifica compromiso, tarea, episodio, prioridad, comunicación, tratamiento o cierre sin revisión humana autorizada. |
| Causas | `C019-A` FK/acoplamiento actual Alert→Task; `C019-B` severity heredada como SLA/prioridad; `C019-C` shortcut de integración; `C019-D` review meramente nominal; `C019-E` cierre condicionado automáticamente. |
| Secuencia previsible | regla coincide → interfaz directa muta Core → acción se ejecuta sin contexto/autoridad humana → error de regla se convierte en error asistencial → actuación inapropiada o seguimiento omitido. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: acción, contacto, derivación o cierre inapropiados; retraso ante falso negativo. |
| Expuestos / tipo de uso | Paciente/equipo; cambio de diseño y mal uso futuro. |
| Controles existentes | `CTRL-019-A` en baseline, review idempotente + POST humano separado para tarea (`IMPLEMENTED / TECHNICALLY_VERIFIED`); `CTRL-019-B` frontera y salida unidireccional (`DOCUMENTED / PLANNED`); `CTRL-019-C` pruebas de dependencia/mutación negativas futuras (`PLANNED`). |
| Evidencia exacta | `src/application/alerts/manage-explainable-alerts.ts`; `src/domain/authorization/human-authorization.ts`; `src/application/workqueue/manage-nursing-tasks.ts`; `prisma/migrations/20260808000100_alert_review_idempotency/migration.sql`; ADR-0012/0015; `system-assurance-boundary.md`; commitment spec CE-19. |
| Prueba relevante | `manage-explainable-alerts.test.ts` sin acción clínica y abstención sin aviso; `human-authorization.test.ts` pureza; `explainable-alerts.integration.test.ts` una sola transición/auditoría concurrente; `nursing-workqueue.integration.test.ts` revisar no crea tarea y PostgreSQL rechaza tarea ligada a aviso abierto; `explainable-alerts.spec.ts` exige un POST humano separado para crear la tarea. No existen tests de separación desplegable. |
| Controles adicionales | Interface neutral versionada; prohibición de dependencias y mutaciones; separación técnica/configurable; threat/hazard tests; revisión de intended purpose y regulación. |
| Propietario propuesto / decisión | Arquitectura + Dirección Médica + CSO futuro, **propuestos**; ADR-0015 sigue Propuesta. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: configuración y workflow local; la prohibición de mutación automática sigue siendo control de producto. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; separación actual es documental/lógica, no desplegable. |

### HAZ-GAS-020 — Compromiso omitido, duplicado o ligado al episodio/responsable equivocado

| Campo | Registro |
| --- | --- |
| Alcance / workflow | `DESIGN_FORESEEABLE`; definición, instancia, versión y adopción de compromisos. |
| Estado peligroso | Una obligación necesaria no existe, aparece dos veces o se atribuye al episodio/rol/usuario equivocado. |
| Causas | `C020-A` inferencia/backfill desde tareas/notas; `C020-B` doble activación/reintento; `C020-C` FK same-episode ausente; `C020-D` roleRef confundido con assignee; `C020-E` versión/policy equivocada; `C020-F` catálogo no aprobado/commitment no creado por error humano. |
| Secuencia previsible | definición/instancia incorrecta → motor evalúa conjunto equivocado → pendiente real no se detecta o se duplica → equipo cree que el circuito está cubierto → actuación se omite o repite. |
| Daño clínico potencial | `PROVISIONAL / CSO REVIEW REQUIRED`: pérdida o duplicación de seguimiento y accountability incorrecta. |
| Expuestos / tipo de uso | Paciente/equipo; uso normal, fallo y backfill/mal uso futuro. |
| Controles existentes | `CTRL-020-A` creación humana explícita/no inferencia (`DOCUMENTED / PLANNED`); `CTRL-020-B` identidad/versiones/FK/uniqueness (`DOCUMENTED / PLANNED`); `CTRL-020-C` roleRef separado de assignee (`DOCUMENTED / PLANNED`); detección de omisión de creación (`ABSENT`). |
| Evidencia exacta | `commitment-engine-spec.md` §§ modelo conceptual, invariantes, migración, CE-01/02/03/14/20; ADR-0015. |
| Prueba relevante | Ninguna ejecutable; pruebas futuras de FK, idempotencia y legacy sin backfill. |
| Controles adicionales | Catálogo/version/autoridad aprobados; reconciliation entre alta y commitments; confirmación humana de completitud sin inferir contenido; constraint same-episode; monitor de duplicados/omisiones. |
| Propietario propuesto / decisión | Dirección Médica/Enfermería + Arquitectura, **propuestos**; ADR-0015, DEC-002/013/017. |
| Transferible al desplegador | `DEPLOYMENT_CONTROL_CANDIDATE`: autoría, reconciliación del alta, role mapping y revisión de completitud. |
| Estado / supuestos / evidencia faltante | `OPEN / DESIGN`; el motor y el concepto persistido de compromiso no existen. |

## Evaluación de los escenarios exigidos

| Escenario solicitado | Resultado de screening |
| --- | --- |
| Paciente/episodio incorrecto | HAZ-GAS-001 y HAZ-GAS-020. |
| Episodio/tarea/revisión/compromiso omitido o duplicado | HAZ-GAS-002 y HAZ-GAS-020. |
| Información incompleta/obsoleta/contradictoria | HAZ-GAS-003. |
| Autorización incorrecta/acceso fuera de ámbito | HAZ-GAS-004. |
| Auditoría/evento/idempotencia perdidos o duplicados | HAZ-GAS-005. |
| Aviso como diagnóstico/prioridad | HAZ-GAS-006. |
| Ausencia de evidencia como incumplimiento | HAZ-GAS-013 (`DESIGN_FORESEEABLE`). |
| No respuesta atribuida al paciente/equipo | HAZ-GAS-007 y HAZ-GAS-013. |
| Plazo/zona/DST/reloj | HAZ-GAS-016 (`DESIGN_FORESEEABLE`). |
| Fuente caída como ausencia | HAZ-GAS-014 (`DESIGN_FORESEEABLE`). |
| Evidencia puntual descubierta después / tardía presentada puntual | HAZ-GAS-015 (`DESIGN_FORESEEABLE`). |
| Carrera evaluación/evidencia/corrección | HAZ-GAS-017 (`DESIGN_FORESEEABLE`). |
| Job/scheduler sin detección | HAZ-GAS-018 (`DESIGN_FORESEEABLE`). |
| Clinical Rules mutando Core/acción automática | HAZ-GAS-019 (`DESIGN_FORESEEABLE`); el camino automático no se encontró en baseline. |
| UI falsa confianza/incertidumbre oculta | HAZ-GAS-008. |
| Cierre/abandono por estado incorrecto | HAZ-GAS-009. |
| Disponibilidad/recuperación/continuidad | HAZ-GAS-010. |
| Demo sintética confundida con validación clínica | HAZ-GAS-008. |
| Dependencia/tercero | HAZ-GAS-011; integraciones clínicas reales `NOT_APPLICABLE` hoy. |
| Control humano inaccesible/no autorizado/no ejecutado | HAZ-GAS-012. |

## Matriz de trazabilidad

La matriz no cambia estados canónicos de REQ o DEC. “Prueba” significa evidencia
técnica, no validación clínica.

| Peligro | Causa(s) | Control(es) | Evidencia | Prueba | REQ / ADR / DEC | Decisión/propietario propuesto | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HAZ-GAS-001 | C001-A–D | CTRL-001-A–D | Schema, autorización por recurso, DEC-013 | Check-in/workqueue/caregiver integration; foundation HTTP | REQ-01/05/12; DEC-001/004/013/016 | TI + Médica | `OPEN` |
| HAZ-GAS-002 | C002-A–E | CTRL-002-A–D | UoW, fingerprints, constraints | Episode/check-in/alert/task concurrency | REQ-01/04/08/09/13 | Enfermería + TI; DEC-006/014/017 | `OPEN` |
| HAZ-GAS-003 | C003-A–F | CTRL-003-A–D | ADR-0011/0014, evidence view | Rule abstention; governance projection/snapshot | REQ-03/04/08/09/11/13 | Médica + Enfermería + TI | `OPEN` |
| HAZ-GAS-004 | C004-A–F | CTRL-004-A–D | RBAC/session/scope, DEC-013 | Auth/security/caregiver/E2E | REQ-02/05/06/12 | TI + Responsable del Tratamiento | `OPEN` |
| HAZ-GAS-005 | C005-A–E | CTRL-005-A–D | Schema/migrations/UoW | Security transactions; SQL negative | REQ-01/03/04/06/08/09/13/14 | TI + workflow owner | `OPEN` |
| HAZ-GAS-006 | C006-A–E | CTRL-006-A–D | ADR-0007/0012/0015; DEC-008/009 | Rule/app/auth/E2E | REQ-08/09 | Médica + CSO futuro | `OPEN` |
| HAZ-GAS-007 | C007-A–E | CTRL-007-A–C | ADR-0006; check-in/task models | Check-in non-response/concurrency | REQ-04/09 | Médica + Enfermería; DEC-006/017 | `OPEN` |
| HAZ-GAS-008 | C008-A–F | CTRL-008-A–D | UI/domain constants/claims register | Home Safety/SBAR/crisis/UI/evidence | REQ-07/08/10/11/13 | Producto + autoridades clínicas | `OPEN` |
| HAZ-GAS-009 | C009-A–D | CTRL-009-A–C | Episode service; DEC-002 pack | Closure fail-closed tests | REQ-01/09 | Médica; DEC-002 | `OPEN` |
| HAZ-GAS-010 | C010-A–E | CTRL-010-A–C | Health/error handler; DEC-015 | Health/error/idempotency only | REQ-13/14 | TI + Enfermería; DEC-014/015/016 | `OPEN` |
| HAZ-GAS-011 | C011-A–E | CTRL-011-A–C | package/lock/config/CI | env + baseline suites | REQ-12/13/14 | TI | `OPEN` |
| HAZ-GAS-012 | C012-A–F | CTRL-012-A–D | Task accountability/human auth; DEC-017 | Workqueue/auth/concurrency | REQ-09/12/14 | Enfermería + TI | `OPEN` |
| HAZ-GAS-013 | C013-A–D | CTRL-013-A–C | Commitment spec CE-07/12; ADR-0015 | `PLANNED`; no executable test | REQ-09; ADR-0015; DEC-017 | CSO futuro + clínicos | `OPEN / DESIGN` |
| HAZ-GAS-014 | C014-A–E | CTRL-014-A–C | Commitment spec CE-11 | `PLANNED`; source-down cases | REQ-09/13/14; DEC-014/015 | TI + source owner | `OPEN / DESIGN` |
| HAZ-GAS-015 | C015-A–E | CTRL-015-A–C | Commitment spec CE-10; ADR-0016 | `PLANNED`; four-time matrix | REQ-09/13 | Source owner + Enfermería | `OPEN / DESIGN` |
| HAZ-GAS-016 | C016-A–F | CTRL-016-A–C | Commitment spec CE-04/05 | `PLANNED`; UTC/IANA/DST/skew | REQ-04/09/13 | Enfermería + TI | `OPEN / DESIGN` |
| HAZ-GAS-017 | C017-A–E | CTRL-017-A–C | ADR-0016; CE-14 | `PLANNED`; PostgreSQL races | REQ-09/13 | Arquitectura + CSO futuro | `OPEN / DESIGN` |
| HAZ-GAS-018 | C018-A–F | CTRL-018-A–B | Commitment spec CE-17 | `PLANNED`; job/backlog/recovery | REQ-09/13/14; DEC-013/014/015/017 | TI/Ops + Enfermería | `OPEN / DESIGN` |
| HAZ-GAS-019 | C019-A–E | CTRL-019-A–C | ADR-0012/0015; system boundary; CE-19 | Baseline no-auto-action; future tests planned | REQ-08/09; DEC-008/017 | Arquitectura + Médica | `OPEN / DESIGN` |
| HAZ-GAS-020 | C020-A–F | CTRL-020-A–C | Commitment spec CE-01/02/03/14/20 | `PLANNED`; FK/idempotency/legacy | REQ-01/09/12/13; ADR-0015/0016 | Médica/Enfermería + Arquitectura | `OPEN / DESIGN` |

## Acciones globales pendientes

1. Designar y acreditar un CSO competente; revisar y aprobar formalmente el
   alcance, los peligros, la terminología clínica y los daños provisionales.
2. Crear y aprobar un Clinical Risk Management Plan con método, lifecycle,
   criterios de severidad/probabilidad/riesgo y aceptabilidad.
3. Realizar taller multidisciplinar con usuarios clínicos, paciente/cuidador,
   seguridad, privacidad, arquitectura, pruebas, operaciones y organización
   desplegadora candidata.
4. Convertir cada control adicional aprobado en requisito verificable, propietario,
   evidencia, prueba de efectividad y estado; reanalizar peligros introducidos.
5. Mantener separados los peligros actuales de los riesgos de diseño del motor.
   No implementar el motor hasta superar sus gates documentados.
6. Acordar y documentar cualquier transferencia con una organización desplegadora
   bajo su gestión DCB0160/local, sin asumir aceptación por anticipado.
7. Establecer Clinical Risk Management File, Safety Incident Management Log,
   monitorización, change control y revisión de cada release.

## Declaración de estado

Este Hazard Log es una primera identificación basada en repositorio y documentos.
No está aprobado, no estima ni acepta riesgo, no demuestra que el sistema sea
seguro y no autoriza pacientes, datos reales, piloto, producción o uso clínico.

