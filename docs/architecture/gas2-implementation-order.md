# Guardián Alta Segura 2.0 — orden incremental de implementación

## Rama fundacional completada

La primera rama fundacional es:

```text
refactor/gas2-episode-governance-policy
```

El prefijo `refactor` es intencional: episodio, transiciones, responsables,
versiones y ports ya existían. La rama compone y endurece esa arquitectura sin
presentar `Episode Contract` como una feature o tabla nueva.

### Resultado implementado

- `EpisodeGovernancePolicy/View` consulta `DischargeEpisode`, responsables,
  protocolo exacto, avisos no terminales y tareas abiertas;
- la ruta de detalle expone blockers técnicos/operativos y decisiones locales
  pendientes sin contenido clínico;
- el caso de uso de transición evalúa gobernanza en el `EpisodeUnitOfWork`, pero
  DEC-002 pendiente conserva cierre `NOT_AUTHORIZED`;
- política ausente, error o estado inconsistente falla cerrado;
- idempotencia, versión optimista, timeline y auditoría permanecen intactos;
- no se creó tabla, migración, dependencia ni flujo de acción automática.

### Definition of Done específica

1. Una única política compone estado, versión, responsables, protocolo y blockers.
2. Política ausente o DEC-002 pendiente deniega el cierre.
3. Avisos o tareas abiertos no se ignoran.
4. Dos cierres concurrentes no pueden ganar.
5. La evidencia usa IDs, estados y correlation ID; no copia contenido sensible.
6. No cambia el alcance sintético ni habilita automatización clínica.

## Segunda rama fundacional completada

La segunda rama es:

```text
feat/gas2-signal-provenance-boundary
```

Define `CanonicalProvenanceLineageV1`, mappers sobre evidencia actual y linaje
fuente → `RuleEvaluation` → `Alert`. Reutiliza el array JSON existente con lectura
histórica compatible; no crea conectores, tabla `SignalRecord`, migración o
dependencia.

## Tercera rama fundacional completada

La tercera rama es:

```text
refactor/gas2-human-authorization-policy
```

Formaliza `CREATE_TASK_FROM_REVIEWED_ALERT` como policy pura sobre
`AlertReview`, rol activo y responsabilidad actual. No crea `ReviewGate`, tabla,
migración, dependencia ni automatización.

## Cuarto incremento fundacional completado

Tras completar gobernanza, procedencia y autorización humana, el incremento
implementado es:

```text
feat/gas2-task-accountability
```

`TECHNICAL TASK ACCOUNTABILITY = implemented`. `INSTITUTIONAL RESPONSIBILITY /
ACCOUNTABILITY POLICY = not validated, conditioned on DEC-017`.

## Paquete de decisión DEC-017 preparado

La rama documental:

```text
docs/gas2-dec017-decision-pack
```

prepara evidencia, opciones neutrales, preguntas, formulario, agenda y resumen
ejecutivo para Dirección de Enfermería. No implementa ni selecciona taxonomía,
prioridad, acceptance, tiempos, SLA, resultados institucionales de contacto o
escalado.

`DEC-017` continúa `Pendiente`. El paquete es `DECISION SUPPORT EVIDENCE`, no una
decisión ni autorización para abrir `feat/gas2-task-sla-escalation`.

## Vista de evidencia de gobernanza completada

El incremento:

```text
feat/gas2-governance-evidence-view
```

implementa `EpisodeGovernanceEvidenceView` como proyección read-only sobre las
fuentes existentes. Reutiliza gobernanza, provenance V1, revisión humana,
accountability y auditoría; aplica autorización profesional por recurso, límites
explícitos y minimización. No crea tabla, migración, dependencia, exportación,
observabilidad productiva ni process safety. La ausencia de decisión histórica
de autorización por instancia se declara, no se rellena.

## Paquete de decisión DEC-002 preparado

La rama exclusivamente documental:

```text
docs/gas2-dec002-episode-closure-decision-pack
```

prepara baseline, opciones neutrales, minimum blocking decision set, análisis
TOCTOU, formulario, agenda y resumen ejecutivo para Dirección Médica. No
selecciona duración, autoridad, motivo, tratamiento de Alerts/Tasks, override o
reopening y no habilita cierre.

`DEC-002` continúa `Pendiente`. El paquete es `DECISION SUPPORT EVIDENCE` y sitúa
el trabajo en `READY_FOR_INSTITUTIONAL_DECISION`; no autoriza especificación
técnica ni implementación. Tras una aprobación formal todavía se exige revisión
de dominio y concurrencia antes de `READY_FOR_IMPLEMENTATION`.

`Decision pack document status = FINAL` y
`Decision form template status = FINAL` describen artefactos documentales. Una
futura instancia del workbook usa `DRAFT / UNDER_REVIEW / FINAL`; DEC-002 conserva
una única cabecera canónica y los valores `READY_FOR_*` siguen siendo gates.

Una futura `Aprobada` debe quedar cualificada por policy version, approved scope,
approval evidence reference, exclusiones/diferidos explícitos y unresolved items
que continúan bloqueados. Nada fuera del approved scope se desbloquea; si la
institución no admite aprobación scoped, solo cabe `Aprobada` para todo el scope
canónico aplicable de duración y cierre. Además,
`INCONSISTENT → NON_OVERRIDABLE_TECHNICAL_FAIL_CLOSED`: no es policy clínica
seleccionable ni admite override, mientras los otros cuatro estados de integridad
pueden recibir tratamiento institucional sin convertirse en safe/unsafe.

## Paquete de decisión DEC-005 preparado

La rama exclusivamente documental:

```text
docs/gas2-dec005-data-lifecycle-decision-pack
```

prepara inventario repository-grounded, source-of-truth mapping, opciones
neutrales, lifecycle matrix, análisis append-only/relacional, derechos, exports,
terceros, backups, formulario, agenda y resumen ejecutivo para el Responsable
del Tratamiento. No selecciona periodos, criterios jurídicos, archivo,
disposición, aplicabilidad de derechos o enforcement; tampoco implementa código,
schema, migraciones, roles, exports, purge o scheduler.

`DEC-005` continúa `Pendiente`. El paquete es `DECISION SUPPORT EVIDENCE` y sitúa
el trabajo en `READY_FOR_INSTITUTIONAL_DECISION`; no autoriza especificación
técnica ni implementación.

Una futura `Aprobada` debe quedar cualificada por policy version, approved
data-class scope, propósitos, triggers, criterios, archive/disposition, rights,
exports, holds, evidence reference, effective/review dates, exclusiones y
blockers. Después se exige revisión conjunta de privacidad y arquitectura de
datos, más threat model relacional de deletion/export antes de
`READY_FOR_IMPLEMENTATION`.

## Paquete de decisión DEC-013 preparado

La rama exclusivamente documental:

```text
docs/gas2-dec013-identity-access-decision-pack
```

prepara el baseline, las poblaciones, las subdecisiones, las opciones neutrales,
el minimum blocking decision set, el formulario, la agenda y el resumen
ejecutivo para Dirección TI. No selecciona IdP, vendor, protocolo, subject,
MFA/assurance, timeouts, role mapping, break-glass, service identities o
impersonation; tampoco implementa autenticación institucional.

`DEC-013` continúa `Pendiente`. El paquete es `DECISION SUPPORT EVIDENCE` y sitúa
el trabajo en `READY_FOR_INSTITUTIONAL_DECISION`; no autoriza especificación
técnica ni implementación.

Una futura `Aprobada` debe quedar cualificada por policy/design version, approved
scope, poblaciones, approval evidence reference, effective date,
exclusiones/diferidos y blockers resueltos. Después se exige especificación
capability-scoped y revisión conjunta de IAM, seguridad, privacidad y
arquitectura antes de `READY_FOR_IMPLEMENTATION`.

## Paquete de decisión DEC-014 preparado

La rama exclusivamente documental:

```text
docs/gas2-dec014-incident-operations-decision-pack
```

prepara el baseline, la descomposición, las opciones neutrales, las matrices de
sanitización y ownership, el formulario, la agenda y el resumen ejecutivo para
Dirección TI. No selecciona taxonomía, severidad técnica, SLI/SLO/SLA, tiempos,
acceso, escalado, canal, herramienta, ITSM o vendor; tampoco implementa logging,
monitoring, tracing o alertado.

`DEC-014` continúa `Pendiente`. El paquete es `DECISION SUPPORT EVIDENCE` y sitúa
el trabajo en `READY_FOR_INSTITUTIONAL_DECISION`; no autoriza implementación ni
reserva el nombre de una rama futura.

Una futura `Aprobada` debe quedar cualificada por policy version, approved scope,
approval evidence reference, effective date, exclusiones/diferidos y blockers
resueltos. El scope debe distinguir foundation, detección de candidatos,
alerting/escalation e incident management/support. Después se exige especificación
capability-scoped y revisión conjunta de observabilidad y seguridad antes de
`READY_FOR_IMPLEMENTATION`.

## Paquete de decisión DEC-015 preparado

La rama exclusivamente documental:

```text
docs/gas2-dec015-continuity-decision-pack
```

prepara el baseline repository-grounded, failure scenarios, dominios,
subdecisiones, opciones neutrales, threat model offline, restore,
reconciliación, RTO/RPO, scopes, formulario, agenda y resumen ejecutivo para
Dirección de Enfermería. No implementa contingency/offline/read-only mode,
dataset local, temporary writes, backup, restore, reconciliation, health/
readiness, RTO/RPO o fallback auth.

`Canonical DEC-015 status = Pendiente`. `Canonical REQ-14 status = Pendiente de
protocolo local`. El seguimiento técnico no canónico mantiene
`REQ-14 technical implementation tracking = No implementado` y
`REQ-14 technical validation tracking = No validado`.
`CONTINGENCIA DESACTIVADA`. El paquete es `DECISION SUPPORT EVIDENCE` y sitúa el
trabajo en `READY_FOR_INSTITUTIONAL_DECISION`; no autoriza especificación
técnica ni reserva una rama de implementación.

Una futura `Aprobada` debe quedar cualificada por plan version, approved
capability scope, approval evidence reference, effective/review dates,
exclusiones/diferidos y blockers resueltos. Después se exige especificación
capability-scoped, revisión conjunta de continuidad, seguridad clínica e
infraestructura y threat model de restore/reconciliation antes de
`READY_FOR_IMPLEMENTATION`.

## Expediente de gate DEC-016 preparado

La rama exclusivamente documental:

```text
docs/gas2-dec016-real-pilot-gate-decision-pack
```

prepara baseline, modelo conceptual de madurez, `PILOT_SCOPE_MANIFEST`,
dependencias DEC-001–017, readiness REQ-01–14, hard NO-GO, condiciones, gates de
safety/privacy/security/identity/protocol/training/incident/continuity/quality/
deployment/regulatory/ethics, monitoring, stop/pause, rollback, post-pilot,
review board y `REAL_PILOT_RELEASE_CONTRACT`. No selecciona propósito, intended
use, población, capacity, periodo, site, módulos, datos, base jurídica, RTO/RPO,
SLA, vendor, deployment o clasificación regulatoria; no implementa enrolment,
identidad, infraestructura o producción.

`Canonical DEC-016 status = Pendiente`. `Current gate =
READY_FOR_INSTITUTIONAL_DECISION`. `REAL PILOT = NO_GO`. La autoridad primaria
permanece en Gerencia del Hospital como Responsable del Tratamiento. Los otros
Decision Packs conservan autoridad propia y no quedan aprobados por referencia.

Una futura `Aprobada` debe ligarse a pilot version, approved site, population,
modules, data classes, roles, dependencies y evidence. Incluso entonces el
siguiente gate es `READY_FOR_PILOT_TECHNICAL_RELEASE_REVIEW`, seguido de
environment/configuration verification y final pre-enrollment safety check; no
existe activación automática.

## Revisión de la secuencia inicial

| Orden | Rama inicial | Decisión | Rama recomendada / condición |
|---:|---|---|---|
| 1 | `feat/gas2-episode-governance` | Modificar | `refactor/gas2-episode-governance-policy`; ya existe el agregado |
| 2 | `feat/gas2-signal-provenance` | Mantener con alcance menor | `feat/gas2-signal-provenance-boundary`; completada con value objects, mappers y lineage sobre evidencia actual |
| 3 | `refactor/gas2-human-authorization-policy` | Mantener | Completada; reutiliza `AlertReview` y guards, sin `ReviewGate` persistente |
| 4 | `feat/gas2-accountability-sla` | Dividir por bloqueo | `feat/gas2-task-accountability` completada como proyección; SLA/escalado solo después de DEC-017 |
| 4.1 | Vista de evidencia gobernada | Añadir sin persistencia | `feat/gas2-governance-evidence-view`; completada como proyección read-only sobre fuentes actuales |
| 5 | `feat/gas2-process-safety` | Retirar del plan | Nombre y alcance mezclan aseguramiento organizativo con reglas clínicas. No iniciar trabajo hasta aprobar ADR-0015; después, usar ramas distintas para Core y Clinical Rules según el contrato aprobado |
| 6 | `feat/gas2-integration-boundary` | Mantener condicionado | Contratos solo al seleccionar una integración real; no crear registry especulativo |
| 7 | `feat/gas2-fhir-boundary` | Eliminar del plan comprometido | Crear `feat/gas2-fhir-anti-corruption` únicamente si existe perfil/requisito institucional |
| 8 | `security/gas2-hardening` | Fusionar | Threat model y hardening dentro de cada rama; rama separada solo para hallazgos transversales concretos |
| 9 | `feat/gas2-observability` | Mantener condicionado | Después de DEC-014 y contratos operativos; métricas sin PHI |
| 10 | `test/gas2-architecture-safety` | Fusionar | Pruebas críticas son DoD de cada rama; una rama final solo si existe un gap de suite verificable |

## Orden recomendado

### 1. `refactor/gas2-episode-governance-policy`

Completada. Reutiliza episodio y cierra la deriva entre ADR-0004 y los módulos de
avisos/tareas existentes. No decide reglas clínicas de cierre y sigue denegando
mientras falta la política local.

### 2. `feat/gas2-signal-provenance-boundary`

Completada. Define tipos canónicos y mappers internos para check-in, observación
de cuidador, Plan de Seguridad, Domicilio Seguro, evaluación y aviso. Prueba
linaje, minimización, compatibilidad y fallo cerrado. No añade conectores externos
ni una tabla `SignalRecord` universal.

### 3. `refactor/gas2-human-authorization-policy`

Completada. Extrae el contrato común de actor, asignación, objeto/version
revisados, decisión y acción permitida. Mantiene `AlertReview` y `TaskEvent` como
historias reales. Las pruebas negativas demuestran que ninguna señal salta el
gate y que reviewer y acting actor no se confunden.

### 4. `feat/gas2-task-accountability`

Completada técnicamente como `TaskAccountabilityProjection` sobre
`Task`/`TaskEvent`. Reconstruye assignment/reassignment, separa
creator/assignee/actor/resolver, valida consistencia y verifica elegibilidad
técnica actual. Serializa por episodio y después por el conjunto de identidades
participantes ordenado globalmente, sin migración. No crea `TaskCase` ni
`AccountabilityGraph`. No valida quién debería actuar: acceptance, política
institucional, SLA y escalado quedan bloqueados por DEC-017.

### 5. Rama SLA tras DEC-017

Nombre recomendado una vez aprobada la decisión:

```text
feat/gas2-task-sla-escalation
```

Implementa configuración versionada, tiempos objetivo y escalado organizativo.
Los valores deben proceder de evidencia local; no se usan defaults clínicos.

### 6. Aseguramiento del circuito y Clinical Rules

La rama genérica `feat/gas2-process-safety` queda retirada. No debe iniciarse
mientras estén pendientes ADR-0015, DEC-017 y las decisiones que definan
compromiso, responsable, plazo, evidencia y excepción. La ausencia de evidencia
no puede codificarse como incumplimiento.

Tras aprobar la frontera, cualquier incremento debe pertenecer a un solo carril:

- Guardián Core: aseguramiento organizativo del circuito, sin interpretación
  clínica, scoring ni acción autónoma;
- Clinical Rules: módulo separado, con finalidad prevista, expediente, evaluación
  regulatoria y validación propios.

El primer PR posterior seguirá siendo documental y de contrato; ADR-0015 no
autoriza por sí solo cambios de esquema o runtime.

### 7. `feat/gas2-integration-boundary`

Solo cuando exista al menos un sistema seleccionado y ejemplos sintéticos de su
contrato. Define port, autenticidad, idempotencia, versionado, cuarentena y
observabilidad. El adapter concreto debe ir en una rama posterior con nombre del
proveedor.

### 8. FHIR condicional

No reservar una rama hasta conocer HCE, versión, perfiles, operaciones y scopes.
Si la institución exige FHIR:

```text
feat/gas2-fhir-anti-corruption
```

Debe implementar mappers y pruebas de contrato, no un servidor FHIR.

### 9. Observabilidad e incident operations posteriores a DEC-014

No se reserva ahora un nombre de rama. Mientras DEC-014 siga `Pendiente` no puede
abrirse una implementación. Tras aprobación para una policy version y approved
scope concretos, `READY_FOR_TECHNICAL_SPECIFICATION` debe mapear por separado
`OBSERVABILITY_FOUNDATION`, `INCIDENT_CANDIDATE_DETECTION`,
`OPERATIONAL_ALERTING_ESCALATION` e `INCIDENT_MANAGEMENT_SUPPORT` a arquitectura,
controles, ownership y pruebas.

La revisión de diseño puede elegir una única rama de observabilidad para el scope
aprobado o incrementos separados para foundation, detección de candidatos y
alerting/escalation. Para la foundation sin automatización de incidentes, los
blockers principales son scope institucional de telemetría, sanitización,
identificadores permitidos, acceso/segregación y evidencia/retención aplicable;
incident definition, detection sources y escalado no son blockers universales.
Nada excluido o diferido queda habilitado y este orden no preselecciona SLI, SLO,
SLA, herramienta o integración.

## Ramas que no deben abrirse ahora

- cualquier rama de conector asociada a un proveedor no contratado y no autorizado;
- cualquier rama que presuponga telemonitorización, mensajería o telefonía seleccionadas;
- `feat/gas2-fhir-server`
- `feat/gas2-rpm-platform`
- `feat/gas2-accountability-graph`
- `feat/gas2-signal-record-table`
- `feat/gas2-audit-log`

No existe evidencia contractual o técnica que justifique esas implementaciones;
varias duplicarían responsabilidades actuales.

## Gates por rama

Cada rama debe:

1. partir de archivos reales y nombrar la fuente de verdad reutilizada;
2. conservar revisión humana, autorización y auditabilidad;
3. incluir pruebas de permisos negativos, idempotencia y concurrencia cuando
   aplique;
4. no introducir PHI/PII ni datos reales;
5. actualizar ADR, decisiones y trazabilidad cuando cambie un contrato;
6. ejecutar formato, lint, typecheck, unit, integración, E2E y build;
7. declarar decisiones locales que siguen bloqueando activación.

## Resultado

La secuencia ha completado gobernanza, procedencia, autorización humana,
accountability técnica y su evidence view gobernada sin una segunda arquitectura.
Los paquetes de apoyo a DEC-002, DEC-005, DEC-013, DEC-014, DEC-015, DEC-016 y DEC-017
están preparados y sus gates son `READY_FOR_INSTITUTIONAL_DECISION`. Sus estados
canónicos continúan `Pendiente`: cierre/duración, ciclo de vida de datos,
identidad/acceso, incident operations/observability, continuidad/contingencia y
responsabilidad/SLA/escalado siguen esperando evidencia real de sus autoridades.
DEC-016 mantiene `REAL PILOT = NO_GO` y datos/personas reales bloqueados. Las
integraciones continúan aplazadas hasta disponer de contratos reales.

`READY_FOR_INSTITUTIONAL_DECISION` es un gate de preparación, no un estado
canónico. La secuencia posterior es evidencia/aprobación institucional →
`READY_FOR_TECHNICAL_SPECIFICATION` → revisión de diseño técnico y seguridad →
`READY_FOR_IMPLEMENTATION`. Cada decisión requiere estado `Aprobada` para la
policy version y el approved scope que se pretende especificar; otro estado no
habilita ese gate para esa versión.
