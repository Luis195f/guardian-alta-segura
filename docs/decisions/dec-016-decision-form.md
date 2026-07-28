# DEC-016 — Formulario institucional de decisión de piloto

## Estado de la plantilla

| Campo | Valor |
|---|---|
| Decision form template | `FINAL` |
| Institutional workbook | `DRAFT / UNDER_REVIEW / FINAL` |
| Canonical DEC-016 | `Pendiente` |
| Current gate | `READY_FOR_INSTITUTIONAL_DECISION` |
| Current real-pilot status | `NO_GO` |
| Primary authority | Gerencia del Hospital como Responsable del Tratamiento |

No incluir nombres, firmas, patient IDs, contactos, PHI/PII o actas completas.
Usar referencias institucionales minimizadas.

```text
CANONICAL DECISION STATUS ≠ PILOT AUTHORIZATION OUTCOME
```

## A. Identificación y alcance

| Campo | Respuesta / evidencia |
|---|---|
| Canonical decision ID | `DEC-016` |
| Pilot version | |
| Pilot purpose | |
| Intended use during pilot | |
| Site / service / unit / environment | |
| Network and device/browser constraints | |
| Population inclusion/exclusion | |
| Enrollment limits | |
| Start/end/review points/extension process | |
| Approved roles | |
| Approved modules | |
| Excluded modules | |
| Deferred modules | |
| Approved data classes and purposes | |
| Approved integrations | |

Todo campo omitido queda `NOT_AUTHORIZED_FOR_PILOT`.

## B. Dependencias y evidencia

| Campo | Respuesta / evidence reference |
|---|---|
| DEC-001–017 applicability and outcomes | |
| Clinical protocols and versions | |
| Configuration baseline/release | |
| Training evidence | |
| Competency evidence | |
| Support plan | |
| Incident plan | |
| Continuity plan | |
| Privacy assessment | |
| Security assessment | |
| Regulatory applicability assessment | |
| Ethics/research assessment | |
| Pilot safety case | |
| Technical baseline / CI | |
| Deployment validation | |
| Monitoring plan | |
| Success criteria | |
| Stop/pause/resume criteria | |
| Rollback plan/test | |
| Post-pilot plan | |

## C. Human factors y safety review

Registrar evidencia y residual uncertainty para wrong patient, stale/incomplete
data, unauthorized/caregiver over-access, missing task, unreviewed signal,
configuration/rule error, unavailable crisis resource, outage, duplicate action,
loss of provenance, incomplete handover, automation bias, alert fatigue, role
confusion, shadow workflow y contingency confusion. No asignar severidad sin
metodología institucional.

## D. Hard NO-GO review

| Condición | Applicable? | Status | Evidence |
|---|---|---|---|
| Scope/version not approved | | | |
| Required DEC dependency pending | | | |
| Regulatory applicability unresolved | | | |
| Required ethics/research approval absent | | | |
| Privacy/legal blocker | | | |
| `UNRESOLVED_SECURITY_BLOCKER` determined by competent assessment | | | |
| Clinical safety blocker | | | |
| Institutional IAM absent | | | |
| Required continuity untested | | | |
| Incident/support insufficient | | | |
| Required user untrained/not competent | | | |
| Data integrity/wrong-patient failure | | | |
| Rollback or stop/pause path absent | | | |
| Deployment/configuration evidence absent | | | |

Si una fila aplicable permanece bloqueada, la recomendación solo puede ser
`NO_GO`.

## E. GO_WITH_CONDITIONS

| Condition | Why non-blocking | Owner role | Evidence | Due/review point | Failure effect |
|---|---|---|---|---|---|
| | | | | | |

Una condición no puede diferir un blocker clínico, jurídico, regulatorio
aplicable, IAM, continuidad requerida o de seguridad determinado por una
evaluación aprobada. Debe existir evidencia que justifique su carácter no
bloqueante.

## F. Decisión

| Campo | Valor |
|---|---|
| Approval evidence reference | |
| Approver role | `Gerencia del Hospital como Responsable del Tratamiento` |
| Decision version / scope | |
| Effective date | |
| Review date | |
| Conditions | |
| Unresolved blockers | |
| Canonical decision status | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Pilot authorization outcome | `GO / GO_WITH_CONDITIONS / NO_GO` |

`Aprobada` debe estar ligada a pilot version + site + population + modules + data
classes + roles + dependencies + evidence. No implica `GO` ni autoriza
producción.

### Compatibility matrix

| Canonical status | Pilot outcome | Authorization effect |
|---|---|---|
| `Pendiente` | No aplicable o no final | No authorization; `REAL PILOT = NO_GO` |
| `Propuesta` | Cualquiera | No authorization; `REAL PILOT = NO_GO` |
| `Aprobada` | Ausente/inválido | No authorization |
| `Aprobada` | `NO_GO` | Formaliza no iniciar; `REAL PILOT = NO_GO` |
| `Aprobada` | `GO` | Solo permite avanzar al technical release gate |
| `Aprobada` | `GO_WITH_CONDITIONS` | Solo permite avanzar sin blockers y con condiciones justificadamente no bloqueantes |
| `Retirada` | Cualquiera | Esa decisión/version no autoriza |
| `Sustituida` | Cualquiera | Esa versión no autoriza; usar la vigente |

## G. Post-approval release check

Solo `Aprobada + GO` o `Aprobada + GO_WITH_CONDITIONS` válido permite iniciar
`READY_FOR_PILOT_TECHNICAL_RELEASE_REVIEW`; no activa el piloto. Registrar release,
environment/configuration verification, final pre-enrollment safety check y
evidence reference antes de `AUTHORIZED_REAL_PILOT`.
