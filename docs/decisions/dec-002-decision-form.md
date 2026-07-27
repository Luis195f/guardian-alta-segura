# DEC-002 — Formulario institucional de decisión

## Instrucciones

Completar únicamente con información institucional aprobable y referencias
versionadas. No incluir nombres, firmas, datos de pacientes, diagnósticos,
teléfonos ni otra PHI/PII. La identidad nominal y firma permanecen en el sistema
institucional; este repositorio conserva solo rol y referencia minimizada.

`DEC-002-A` a `DEC-002-N` son identificadores de trabajo dentro de la decisión
canónica DEC-002. No son decisiones canónicas independientes.

Este archivo distingue cuatro planos:

| Plano | Estado actual / valores | Fuente y efecto |
|---|---|---|
| Decision form template status | `FINAL` | Estado de esta plantilla versionada; no es editable al completar una instancia |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` | Estado de trabajo de una futura instancia completada; no cambia DEC-002 |
| Canonical DEC-002 status | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` | Única cabecera canónica; procede del registro y no se decide por subbloque |
| Readiness gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` | Secuencia de preparación; no es estado documental ni canónico |

La plantilla actual está `FINAL`; una futura instancia nace normalmente con
`Institutional decision workbook status = DRAFT`; DEC-002 continúa `Pendiente` y
el gate actual es `READY_FOR_INSTITUTIONAL_DECISION`.

## Cabecera del expediente

| Campo | Valor |
|---|---|
| Decision pack version | |
| Decision form template status | `FINAL` — no editable en el workbook |
| Workshop/reference | |
| Organization / scope | |
| Prepared by role | |
| Reviewers by role | |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` — no canónico |
| Canonical decision ID | `DEC-002` |
| Canonical decision status | `Pendiente` — read-only desde `docs/decision-register.md` hasta evidencia formal |
| Evidence repository reference | |

## DEC-002-A — Program length options

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-A` |
| Question | ¿Qué significan 30/60/90, qué scope tienen y se admiten otros valores? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

## DEC-002-B — Length selection authority

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-B` |
| Question | ¿Qué autoridad selecciona la duración y bajo qué alcance? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

## DEC-002-C — Length selection semantics

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-C` |
| Question | ¿La selección es manual, determinista por protocolo u otro mecanismo aprobado? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

## DEC-002-D — Length change after activation

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-D` |
| Question | ¿Puede cambiar la duración tras activar y cómo se conserva la historia? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

Campos específicos: ampliación/reducción, solicitante, aprobador, motivo, fecha
prevista, versionado y tratamiento de concurrencia.

## DEC-002-E — Closure authority

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-E` |
| Question | ¿Quién solicita, autoriza y ejecuta el cierre y pueden coincidir? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

## DEC-002-F — Closure reasons

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-F` |
| Question | ¿Qué motivos de cierre son admisibles y qué evidencia exige cada uno? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

No registrar un catálogo definitivo en el repositorio hasta que exista referencia
de aprobación versionada.

## DEC-002-G — Minimum closure preconditions

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-G` |
| Question | ¿Qué condiciones bloquean, generan warning o admiten override humano? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

Adjuntar una tabla separada de invariantes técnicos, reglas institucionales,
warnings, blockers y evidencia requerida.

## DEC-002-H — Open alerts

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-H` |
| Question | ¿Qué estados/categorías de Alert son compatibles con cierre? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

Completar explícitamente para `open`, `reviewed`, `actioned`, `resolved` y
`dismissed-with-reason`; no asumir equivalencia clínica.

## DEC-002-I — Open tasks

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-I` |
| Question | ¿Qué Tasks abiertas bloquean o requieren transferencia/documentación? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

Indicar dependencia de DEC-017 si se usa categoría, prioridad, `OVERDUE`, SLA,
assignment o escalation.

## DEC-002-J — Closure with partial evidence

Technical integrity invariant — read-only:

```text
INCONSISTENT → NON_OVERRIDABLE_TECHNICAL_FAIL_CLOSED
```

`INCONSISTENT` no es una opción seleccionable, no admite override clínico y
requiere corrección mediante revisión arquitectónica formal antes de una nueva
evaluación.

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-J` |
| Question | ¿Qué tratamiento institucional reciben `COMPLETE`, `PARTIAL`, `UNAVAILABLE` y `NOT_APPLICABLE` sin convertirlos en `SAFE/UNSAFE`? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

Confirmar expresamente:

- `COMPLETE ≠ permission to close`;
- `PARTIAL ≠ unsafe`;
- `UNAVAILABLE ≠ automatic denial for clinical reasons`;
- el tratamiento seleccionado no puede alterar el invariant de `INCONSISTENT`.

## DEC-002-K — Closure time

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-K` |
| Question | ¿Qué relación existe entre duración, ventana de revisión y cierre manual? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

Campos específicos: evento habilitante, timezone, calendario, ventana,
excepciones y prohibición de autocierre.

## DEC-002-L — Reopening

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-L` |
| Question | ¿`CLOSED` es terminal, se reabre o se crea un nuevo Episode? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

## DEC-002-M — Exception / override

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-M` |
| Question | ¿Existe override y qué roles, motivos, evidencia y caducidad exige? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

No seleccionar un default. Si no se permite override, registrar esa exclusión
explícitamente.

## DEC-002-N — Post-closure effects

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-002` |
| Working subdecision ID | `DEC-002-N` |
| Question | ¿Qué efectos tiene `CLOSED` sobre módulos, acceso, historia y trabajo futuro? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Institutional decision workbook status | `INHERITED / READ-ONLY FROM WORKBOOK HEADER` |
| Canonical decision status | `INHERITED / READ-ONLY FROM CANONICAL DEC-002 HEADER` |
| Notes without PHI/PII | |

Completar por separado para Episode, Alerts, Tasks, caregiver access, check-ins,
SBAR, evidence/audit y documentación histórica. `CLOSED` nunca implica borrado.

## Confirmaciones obligatorias

| Confirmación | Sí / No / evidencia |
|---|---|
| No se usa diagnóstico, risk score, IA o pronóstico para duración o cierre | |
| No existe cierre automático por fecha o días transcurridos | |
| No existe cierre por ausencia de Alerts solamente | |
| No existe cierre por Tasks resueltas solamente | |
| Se conserva una decisión humana autorizada antes de mutar | |
| Se separan policy evaluation, autorización y mutación | |
| Se conserva historia y versionado | |
| No se borra documentación por cerrar | |
| No existe override silencioso | |
| No existe reapertura automática | |
| Logs, errores y auditoría no contienen PHI/PII | |
| Se han declarado dependencias con DEC-005, DEC-016 y DEC-017 | |

## Resultado del gate institucional

| Campo | Valor |
|---|---|
| Canonical DEC-002 status after review | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Working subdecisions resolved for scope | |
| Working subdecisions deferred with explicit exclusion | |
| Blocking evidence still missing | |
| Approved scope | |
| Policy version | |
| Approval evidence reference | |
| Effective date | |
| Required consultative evidence | |
| Contradictions between selected options | |
| Explicitly excluded scope | |
| Unresolved items that remain blocked | |
| Next gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` |

La plantilla permanece `FINAL`; marcar una futura instancia del workbook como
`FINAL` tampoco autoriza implementación ni cambia el estado canónico.
`READY_FOR_TECHNICAL_SPECIFICATION` requiere
`Canonical DEC-002 status = Aprobada` para la policy version y el approved scope,
referencia de evidencia, fecha efectiva, blockers resueltos y opciones no
contradictorias.

Este formulario aplica aprobación scoped: `Aprobada` siempre debe acompañarse de
policy version, approved scope inequívoco, approval evidence reference, explicit
excluded/deferred scope y unresolved items que permanecen bloqueados. Ninguna
funcionalidad fuera del approved scope se desbloquea. Si el proceso institucional
no admite aprobación scoped, DEC-002 solo puede pasar a `Aprobada` cuando todo el
scope canónico aplicable de duración y cierre esté resuelto.

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ concurrency + domain design review
→ READY_FOR_IMPLEMENTATION
```
