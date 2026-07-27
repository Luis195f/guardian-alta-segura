# DEC-017 — Matriz neutral de opciones

## Uso

Esta matriz presenta alternativas para decisión institucional. Ninguna opción
está recomendada, preseleccionada o aprobada. Los placeholders `OPTION_*` deben
sustituirse únicamente por evidencia institucional versionada.

`DEC-017-A` a `DEC-017-I` son identificadores internos de descomposición de la
decisión canónica `DEC-017`; no son registros canónicos independientes.

Seleccionar una opción en esta matriz no cambia `Canonical DEC-017 status =
Pendiente` ni autoriza avanzar desde `READY_FOR_INSTITUTIONAL_DECISION`.

Clasificación común: DEC-017-C, D, E y F son `BLOCKING_FOR_SLA`.
DEC-017-H es `BLOCKING_FOR_ESCALATION` y
`BLOCKING_FOR_PROCESS_SAFETY` cuando Process Safety depende de escalation.
DEC-017-C, D, E, F, G e I son
`CONDITIONAL_BLOCKER_FOR_ESCALATION` cuando la condición aprobada depende de
esa dimensión. DEC-017-A, B, G e I son `CONDITIONAL_BLOCKER`, con `CAN_DEFER`
solo cuando el alcance aprobado no usa esa dimensión.

Leyenda de soporte actual:

- `SUPPORTED`: el modelo técnico actual puede representarlo sin semántica nueva;
- `PARTIAL`: existe una base, pero falta contrato o lifecycle;
- `ABSENT`: el concepto no existe;
- `CONDITIONAL`: depende de otra decisión.

## Matriz

| ID | DECISION | OPTION | CURRENT SUPPORT | CODE IMPACT | SCHEMA IMPACT | SAFETY RISK | OPERATIONAL RISK | TEST IMPACT | AUTHORITY | EVIDENCE REQUIRED |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Taxonomía | A1. Sin taxonomía en el primer alcance | `SUPPORTED` | Bajo | Ninguno | Trabajo heterogéneo sin distinción explícita | Menor capacidad de segmentación | Probar ausencia de inferencia | Dirección de Enfermería | Alcance aprobado |
| A | Taxonomía | A2. Catálogo institucional versionado | `ABSENT` | Alto | Candidato | Categoría ambigua o usada como proxy clínico | Gobierno y migración de catálogo | Versiones, RBAC, historia, UI/API | Dirección de Enfermería | Catálogo, definiciones, autoridad, vigencia |
| A | Taxonomía | A3. `CUSTOM_OPTION` | `ABSENT` | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Especificación completa |
| B | Prioridad administrativa | B1. Sin prioridad | `SUPPORTED` | Bajo | Ninguno | La UI no distingue urgencia operativa | Ordenación limitada | Probar que no se infiere prioridad | Dirección de Enfermería | Decisión explícita |
| B | Prioridad administrativa | B2. Selección humana desde catálogo versionado | `ABSENT` | Alto | Candidato | Sesgo de automatización si se presenta como riesgo clínico | Inconsistencia de selección | RBAC, auditoría, cambios, UI/API | Dirección de Enfermería | Catálogo, definiciones, actor y revisión |
| B | Prioridad administrativa | B3. Regla operativa determinista aprobada | `ABSENT` | Alto | Candidato | Deriva hacia scoring o prioridad clínica | Regla incorrecta o no explicable | Explicabilidad, versionado, inputs permitidos, abstención, human override y auditabilidad | Dirección de Enfermería; consulta según inputs | Regla, inputs permitidos, autoridad, validación |
| C | Assignment | C1. Se permite `UNASSIGNED` | `SUPPORTED` | Bajo | Ninguno | Tarea visible sin holder institucional | Omisión si no existe vigilancia de cola | Visibilidad, permisos y métricas | Dirección de Enfermería | Procedimiento de vigilancia |
| C | Assignment | C2. Assignee obligatorio desde creación | `PARTIAL` | Medio | Posible constraint/migración | Asignación nominal sin capacidad real | Creación bloqueada o asignación obsoleta | Creación, revocación, concurrencia, error | Dirección de Enfermería | Roles, suplencia y excepción |
| C | Assignment | C3. Asignación individual con transferencia formal | `PARTIAL` | Medio/alto | Posible evento/campos | Transferencia incompleta | Doble responsabilidad o pérdida de ownership | Lifecycle, concurrencia, historia | Dirección de Enfermería | Procedimiento y actores |
| C | Assignment | C4. Equipo/turno además de persona | `ABSENT` | Alto | Candidato | Ambigüedad entre equipo y persona | Ausencias, handoff y turnos no resueltos | Modelo, RBAC, calendario, concurrencia | Dirección de Enfermería; consulta TI | Modelo operativo aprobado |
| D | Acceptance | D1. Sin acceptance explícita | `SUPPORTED` como comportamiento actual | Bajo/medio | Puede ser ninguno | Assignment puede confundirse con conocimiento efectivo | No hay evidencia de recepción | Probar semántica elegida y ausencia de estado ficticio | Dirección de Enfermería | Declaración de obligación y vigilancia |
| D | Acceptance | D2. Acceptance explícita | `ABSENT` | Alto | Candidato de evento/campos | Falsa seguridad si aceptar no implica capacidad | Tareas sin aceptar y reasignaciones | Actor, tiempo, revocación, idempotencia, UI/API | Dirección de Enfermería | Evento, actor, consecuencia, excepción |
| D | Acceptance | D3. Acknowledgement distinto de acceptance | `ABSENT` | Alto | Candidato | Términos confundidos | Lifecycle más complejo | Transiciones y reglas de precedencia | Dirección de Enfermería | Definiciones inequívocas |
| E | Tiempo objetivo | E1. Desde creación hasta evento final aprobado | `CONDITIONAL` | Medio | Posible proyección/campo | Creación previa a assignment puede distorsionar responsabilidad | Reloj corre sin holder | Cálculo, zonas, cambios de policy | Dirección de Enfermería | Evento final, calendario, excepciones |
| E | Tiempo objetivo | E2. Desde assignment hasta evento final aprobado | `CONDITIONAL` | Medio | Posible proyección/campo | Reassignment puede reiniciar indebidamente | Incentivo a dejar sin asignar | Transferencias, reintentos, historia | Dirección de Enfermería | Regla de reassignment y pausas |
| E | Tiempo objetivo | E3. Desde acceptance hasta evento final aprobado | `ABSENT` | Alto | Acceptance + policy | Depende de una transición inexistente | Falta de acceptance impide iniciar | Lifecycle completo | Dirección de Enfermería | Decisión D y semántica temporal |
| E | Tiempo objetivo | E4. `CUSTOM_OPTION` | `ABSENT` | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Definición reproducible |
| F | SLA | F1. Solo target informativo | `ABSENT` | Medio | Posible proyección | Puede percibirse como garantía clínica | Sin consecuencia formal | Cálculo, presentación y disclaimers | Dirección de Enfermería | Definición, alcance, calendario |
| F | SLA | F2. SLA operativo con consecuencia aprobada | `ABSENT` | Alto | Policy/versionado candidatos | Automatización indebida si la consecuencia es clínica | Incumplimiento, excepciones y disputa | Versiones, calendario, concurrencia, fallo seguro | Dirección de Enfermería; consulta TI | Compromiso, actor, consecuencia, evidencia |
| F | SLA | F3. Deadline por tarea seleccionado humanamente | `ABSENT` | Alto | Candidato | Fecha puede presentarse como urgencia clínica | Fechas inconsistentes | RBAC, auditoría, edición, timezone | Dirección de Enfermería | Autoridad, cambio y excepción |
| G | Contacto | G1. Mantener valores técnicos actuales con definiciones aprobadas | `SUPPORTED` técnicamente | Medio documental/UI | Ninguno si no cambian | Significado actual ambiguo | Uso inconsistente | Semántica, API/UI, historia | Dirección de Enfermería; consulta según finalidad | Definiciones y evidencia mínima |
| G | Contacto | G2. Sustituir por catálogo versionado | `ABSENT` | Alto | Migración candidata | Categorías pueden inferir estado clínico | Migración y equivalencia histórica | Compatibilidad, versiones, reporting | Dirección de Enfermería | Catálogo y mapping histórico |
| G | Contacto | G3. Resultado técnico + detalle estructurado separado | `ABSENT` | Alto | Candidato | Captura excesiva de datos | Carga y calidad de registro | Minimización, permisos, validación | Dirección de Enfermería; Responsable del Tratamiento si aplica | Campos, finalidad, retención |
| H | Escalation | H1. Solo visibilidad; sin mutación automática | `ABSENT` | Medio | Puede ser proyección | Hallazgo puede confundirse con alarma clínica | Requiere vigilancia humana | Cálculo, UI, permisos, deduplicación | Dirección de Enfermería | Condición y responsable de revisión |
| H | Escalation | H2. Notificación operativa aprobada | `ABSENT` | Alto | Estado/outbox candidatos | Notificación puede provocar acción no revisada | Entrega, duplicados, indisponibilidad | Canal, reintentos, audit, fallo seguro | Dirección de Enfermería; consulta TI y privacidad | Canal, destino, finalidad, contingencia |
| H | Escalation | H3. Nueva tarea organizativa explícita | `ABSENT` | Alto | Eventos/vínculos candidatos | Recursión o automatización percibida como clínica | Duplicados y ownership | Idempotencia, ciclos, trazabilidad | Dirección de Enfermería | Tipo, actor responsable y límite |
| H | Escalation | H4. Reasignación | `PARTIAL` manual; automática ausente | Alto | Posible policy/evento | Reasignación autónoma indebida | Pérdida de contexto y doble ownership | Concurrencia, autorización, historia | Dirección de Enfermería | Autoridad, trigger, aceptación y handoff |
| I | Resolution | I1. `resolved` terminal, sin reapertura | `SUPPORTED` | Bajo | Ninguno | Cierre prematuro si significado no está definido | Corrección exige nueva tarea | Actor, motivo y vínculo externo | Dirección de Enfermería | Definición y actores |
| I | Resolution | I2. Reapertura explícita | `ABSENT` | Alto | Evento/migración candidatos | Historia confusa si se sobrescribe | Repetición y métricas | Evento append-only, RBAC, concurrencia | Dirección de Enfermería | Motivos, autoridad y efectos |
| I | Resolution | I3. Nueva tarea vinculada en vez de reapertura | `PARTIAL` por creación manual | Medio | Posible vínculo | Fragmentación de contexto | Duplicación de trabajo | Enlace, idempotencia, UI | Dirección de Enfermería | Regla y trazabilidad |

## Consecuencias específicas de acceptance

### OPTION D1 — Sin acceptance explícita

| Aspecto | Consecuencia |
|---|---|
| Ventaja | Menor complejidad de lifecycle y de interacción |
| Riesgo operativo | Assignment no demuestra recepción o conocimiento efectivo |
| Evidencia disponible | Assignment/reassignment append-only y elegibilidad actual |
| Impacto en modelo | Podría no exigir persistencia adicional |
| Impacto en tests | Debe probarse que ninguna vista lo presenta como acceptance |
| Impacto en UI | Lenguaje inequívoco sobre “asignado”, no “aceptado” |
| Process Safety | `UNACKNOWLEDGED_TASK` no sería definible; habría que elegir otro indicador |

### OPTION D2 — Acceptance explícita

| Aspecto | Consecuencia |
|---|---|
| Ventaja | Evidencia separada de assignment y recepción |
| Riesgo operativo | Click formal sin capacidad real; tareas pendientes de acceptance |
| Evidencia disponible | No existe actualmente |
| Impacto en modelo | Nuevo evento o campos; relación con reassignment y resolución |
| Impacto en tests | Idempotencia, concurrencia, revocación, actor, tiempo y fallo seguro |
| Impacto en UI | Acción y estado nuevos, con vacío/error y lenguaje no clínico |
| Process Safety | Podría permitir un hallazgo futuro, solo tras aprobar umbral y consecuencia |

## Reglas de selección

Para cada opción seleccionada, el formulario institucional debe registrar
rationale, autoridad, evidencia, versión, vigencia, alcance y revisión. Una
selección no autoriza implementación hasta superar los gates técnicos, de
seguridad y trazabilidad aplicables.

La secuencia aplicable es `READY_FOR_INSTITUTIONAL_DECISION → institutional
evidence/approval → READY_FOR_TECHNICAL_SPECIFICATION → technical design review
→ READY_FOR_IMPLEMENTATION`.

`READY_FOR_TECHNICAL_SPECIFICATION` requiere
`Canonical DEC-017 status = Aprobada` para la policy version y el approved scope
que se pretende especificar. Ninguna selección de esta matriz sustituye esa
aprobación.
