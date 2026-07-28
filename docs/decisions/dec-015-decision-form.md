# DEC-015 — Formulario institucional de decisión

## Instrucciones

Completar con referencias institucionales versionadas. No incluir nombres,
firmas, contactos, hostnames, direcciones, secretos, datos de pacientes o
profesionales ni contenido clínico. Las identidades nominales permanecen en el
sistema institucional; este workbook conserva funciones y referencias.

`DEC-015-A` a `DEC-015-R` son identificadores de trabajo de una única decisión
canónica. La plantilla está `FINAL`; una instancia nace `DRAFT`; DEC-015
continúa `Pendiente`.

| Plano | Estado actual / valores | Efecto |
|---|---|---|
| Decision pack document status | `FINAL` | No canónico |
| Decision form template status | `FINAL` | Estado de la plantilla |
| Institutional workbook status | `DRAFT / UNDER_REVIEW / FINAL` | No cambia DEC-015 |
| Canonical DEC-015 status | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` | Único estado canónico |
| Canonical REQ-14 status | `Pendiente de protocolo local` | Estado canónico del requisito |
| REQ-14 technical implementation tracking | `No implementado` | No canónico |
| REQ-14 technical validation tracking | `No validado` | No canónico |
| Current gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` | Gate, no aprobación |

## Cabecera del expediente

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-015` |
| Canonical decision status | `Pendiente` — read-only hasta evidencia formal |
| Decision pack version | |
| Plan version | |
| Institutional workbook status | `DRAFT / UNDER_REVIEW / FINAL` |
| Primary authority | Dirección de Enfermería |
| Prepared/reviewed by roles | |
| Approval evidence reference | |
| Organization / approved scope | |
| Effective date | |
| Review date | |
| Current gate | `READY_FOR_INSTITUTIONAL_DECISION` |

`DEC-015 PRIMARY AUTHORITY` es siempre Dirección de Enfermería. Las autoridades
de decisiones dependientes y las funciones consultivas se registran como
dependencias; pueden bloquear el scope sin convertirse en coapprovers de
DEC-015.

| Authority type | Function / decision | Form use |
|---|---|---|
| `DEC-015 PRIMARY AUTHORITY` | Dirección de Enfermería | Único approver role de DEC-015 |
| `DEPENDENCY AUTHORITY` | Dirección TI — DEC-013/014 | IAM e incident operations |
| `DEPENDENCY AUTHORITY` | Responsable del Tratamiento — DEC-005 | Lifecycle/retention/disposition |
| `DEPENDENCY AUTHORITY` | Dirección Médica — DEC-002 | Episode closure |
| `DEPENDENCY AUTHORITY` | Dirección de Enfermería — DEC-017 | Decisión operativa separada |
| `CONSULTATIVE FUNCTION` | TI, infraestructura, seguridad, privacidad y responsables asistenciales | Evidencia, factibilidad y revisión sin coaprobación |

## Approved capability scope

Cada fila debe ser `IN_SCOPE`, `EXCLUDED` o `DEFERRED`. Omisión significa
`DEFERRED`.

| Capability scope | Estado | Límites | Evidencia / dependencias |
|---|---|---|---|
| `CONTINGENCY_ACTIVATION` | | | |
| `DEGRADED_READ_ONLY` | | | |
| `OFFLINE_DATASET` | | | |
| `TEMPORARY_WRITE_CAPTURE` | | | |
| `RESTORE` | | | |
| `RECONCILIATION` | | | |
| `RTO_RPO` | | | |
| `OPERATIONAL_RELEASE` | | | |
| `CONTINGENCY_TESTING` | | | |

## Registro común por subdecisión

Repetir este registro para cada A–R incluido. No dejar campos vacíos en un scope
que se pretenda aprobar.

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-015` |
| Working subdecision ID | |
| Continuity capability | |
| Failure scenario | |
| Selected option | |
| Custom option | |
| Allowed functionality | |
| Blocked functionality | |
| Data freshness requirement | |
| Activation authority | |
| Release authority | |
| RTO reference | `INSTITUTIONAL_VALUE_REQUIRED` o referencia aprobada; sin valor en esta plantilla |
| RPO reference | `INSTITUTIONAL_VALUE_REQUIRED` o referencia aprobada; sin valor en esta plantilla |
| Restore requirement | |
| Reconciliation requirement | |
| Test requirement | |
| Rationale | |
| Approver role | Dirección de Enfermería |
| Approval evidence reference | |
| Plan version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Dependencies | |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

## DEC-015-A — Contingency trigger

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-A` |
| Question | ¿Qué condición convierte una degradación técnica en contingency candidate y después en contingencia declarada? |
| Options | Declaración manual / recomendación técnica + autorización humana / otro mecanismo aprobado |
| Required distinctions | Application error / temporary degradation / dependency outage / incident / contingency activation |
| Selected option / rationale | |
| Blocking evidence | |
| Dependencies | DEC-014 |

No registrar thresholds sin evidencia aprobada. Un incidente no activa
automáticamente contingencia.

## DEC-015-B — Activation authority

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-B` |
| Question | ¿Qué función puede declarar `CONTINGENCY_ACTIVE` y qué suplencia/evidencia exige? |
| Options | Activación humana institucional / recomendación TI + autorización / otro mecanismo |
| Activation authority | |
| Technical recommender role | |
| Evidence / unresolved blockers | |
| Dependencies | DEC-013/014 cuando aplique |

Dirección de Enfermería conserva la autoridad primaria de DEC-015.

## DEC-015-C — Contingency scope

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-C` |
| Question | ¿Qué dimensión y población cubre cada declaración? |
| Scope candidates | Global / unidad / servicio / módulo / dependencia / población / custom |
| Selected scope | |
| Explicit exclusions/deferred scope | |
| Mapping evidence | |
| Test requirement | |

No asumir soporte runtime de tenant/unidad que no existe.

## DEC-015-D — Allowed functions

| Capability | `ALLOWED / READ_ONLY / BLOCKED / NOT_APPLICABLE` | Freshness | Authorization | Evidence |
|---|---|---|---|---|
| Episode list/details | | | | |
| Safety Plan | | | | |
| Check-ins | | | | |
| Alerts/reviews | | | | |
| Tasks/events | | | | |
| Caregiver portal | | | | |
| SBAR | | | | |
| Audit/evidence | | | | |
| Identity | | | | |
| Support | | | | |

Completar además el registro común `DEC-015-D`. Los valores son decisiones
futuras del workbook, no estado actual del software.

## DEC-015-E — Prohibited functions

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-E` |
| Question | ¿Qué operaciones deben bloquearse si no puede probarse freshness, autorización, consistencia, policy o audit? |
| Operations to evaluate | Clinical mutation / task resolution / Alert review / caregiver authorization / episode closure / export / identity change |
| Prohibited operations | |
| Preconditions for any exception | |
| Fail-closed test | |
| Dependencies | DEC-002/005/013/017 según operación |

## DEC-015-F — Minimum contingency dataset

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-F` |
| Options | `NO_LOCAL_CONTINGENCY_DATASET` / external institutional source / approved minimal read-only view / other |
| Selected option | |
| Source of truth | |
| Data classes/fields reference | |
| Explicitly excluded data | |
| Storage/device boundary | |
| Dependencies | DEC-005/012/013 |

No copiar campos clínicos a este documento ni construir un censo.

## DEC-015-G — Data freshness

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-G` |
| `generatedAt` requirement | |
| Source/version reference | |
| Last successful synchronization | |
| Staleness expression | |
| Expiry/block condition | |
| User-visible warning | |
| Evidence/test | |

No usar “latest” si la actualidad no puede demostrarse.

## DEC-015-H — Access during contingency

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-H` |
| Identity available behavior | |
| IdP unavailable behavior | |
| Existing-session behavior | |
| Read-only assurance | |
| Local fallback | `NOT_APPROVED` salvo decisión posterior de DEC-013; nunca demo credentials |
| Emergency access / break-glass reference | |
| Access evidence/test | |
| Dependencies | DEC-013 |

Confirmar expresamente que no se admiten shared credentials, universal local
password, anonymous clinical access o bypass RBAC.

## DEC-015-I — Write during outage

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-I` |
| Options | `NO_WRITES` / manual institutional workflow / external system / approved local queue / other |
| Selected option | |
| Data classes/operations | |
| Identity/encryption | |
| Timestamp/idempotency/ordering | |
| Conflict/replay/expiry | |
| Audit requirement | |
| Reconciliation dependency | DEC-015-J |

No se aprueba cola por completar este formulario.

## DEC-015-J — Reconciliation

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-J` |
| Source artifacts | |
| Manual verification / dual review | |
| Idempotency / duplicate prevention | |
| Conflict detection | |
| Temporal ordering | |
| Provenance / original actor and timestamp | |
| Reconciliation actor/timestamp | |
| Evidence/test | |

`Silent last-write-wins` está prohibido.

## DEC-015-K — Restoration criteria

| Criterio candidato | Required / not applicable / evidence |
|---|---|
| DB reachable | |
| Migrations current | |
| Integrity verified | |
| IAM functional | |
| Dependencies available | |
| Policy/config available | |
| Contingency work reconciled | |
| Clinical/operational readiness confirmed | |
| Support status | |

Completar el registro común `DEC-015-K`. La tabla no es un checklist aprobado.

### Recovery consistency domains

No asumir un único recovery point atómico para todos los objetos.

| Consistency domain | Objetos/referencias a evaluar | `RESTORE / RECONSTRUCT / INVALIDATE / REAUTHENTICATE / OTHER_APPROVED_MECHANISM` | Evidence / dependency |
|---|---|---|---|
| `CLINICAL_WORKFLOW_CONSISTENCY` | `Episode`, transiciones, reglas, avisos/reviews, tareas/eventos, audit/provenance y policy/config | | |
| `AUTHORIZATION_CONSISTENCY` | Role assignments, caregiver authorizations/scopes y access-policy references | | |
| `SESSION_EPHEMERAL_SECURITY_STATE` | Session metadata, caregiver sessions, tokens/session references | | |

No hay mecanismo preseleccionado. Restaurar la base clínica no exige restaurar
sesiones activas. La invalidación total y reautenticación posterior es una
opción futura, no una decisión de esta plantilla.

## DEC-015-L — Return to normal authority

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-L` |
| Technical recovery recommender | |
| Operational/clinical release authority | |
| Required evidence | |
| Partial-scope release | |
| Communication/change evidence | |
| Reversal criteria | |

`RESTORE_COMPLETE` no autoriza por sí solo `NORMAL_OPERATION`. Los blockers de
release se derivan exclusivamente de capabilities `IN_SCOPE`; todo scope
`EXCLUDED`, `DEFERRED` u `OMITTED` permanece deshabilitado.

## DEC-015-M — RTO

| Capability | RTO target reference | Evidence source | Test/actual recovery time reference |
|---|---|---|---|
| Application | `INSTITUTIONAL_VALUE_REQUIRED` | | |
| Database | `INSTITUTIONAL_VALUE_REQUIRED` | | |
| Identity | `INSTITUTIONAL_VALUE_REQUIRED` | | |
| Read-only access | `INSTITUTIONAL_VALUE_REQUIRED` | | |
| Task workflow | `INSTITUTIONAL_VALUE_REQUIRED` | | |
| Other approved capability | `INSTITUTIONAL_VALUE_REQUIRED` | | |

No registrar un RTO global por conveniencia. Actual recovery time no aprueba el
target.

## DEC-015-N — RPO

| Consistency domain/capability | RPO target reference | Consistency boundary | Backup/recovery evidence |
|---|---|---|---|
| `CLINICAL_WORKFLOW_CONSISTENCY` | `INSTITUTIONAL_VALUE_REQUIRED` | | |
| `AUTHORIZATION_CONSISTENCY` | `INSTITUTIONAL_VALUE_REQUIRED` | | |
| `SESSION_EPHEMERAL_SECURITY_STATE` | `INSTITUTIONAL_VALUE_REQUIRED` solo si se incluye | | |
| Other approved scope | `INSTITUTIONAL_VALUE_REQUIRED` | | |

Confirmar `RPO ≠ retention` y documentar el consistency boundary aplicable.
`RESTORE CAPABILITY`, `RTO TARGET` y `RPO TARGET` son decisiones distintas; una
prueba de restore no exige universalmente targets RTO/RPO aprobados.

## DEC-015-O — Backup / restore

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-O` |
| Coverage / exclusions | |
| Operator role | |
| Backup creation/integrity | |
| Encryption/immutability/location references | |
| Restore execution requirement | |
| Restore test requirement | |
| Post-restore integrity requirement | `POST_RESTORE_INTEGRITY_REVIEW_REQUIRED` o alternativa aprobada |
| Technology/vendor | No seleccionado por la plantilla |
| Evidence | |

Backup creation, integrity, restore test, restore execution y post-restore
verification son decisiones/evidencias separadas.

## DEC-015-P — Contingency retention

| Artifact | Needed? | Lifecycle/retention policy reference | Archive/disposition/purge | Dependency authority / consultation |
|---|---|---|---|---|
| Offline/local copy | | | | |
| Manual document | | | | |
| Temporary-write queue | | | | |
| Export | | | | |
| Reconciliation artifact | | | | |
| Restore/test evidence | | | | |

DEC-005 conserva autoridad sobre retention/disposition. No registrar periodos en
esta plantilla.

## DEC-015-Q — Test / exercise

| Category | Required / excluded / deferred | Scenario/scope | Evidence reference |
|---|---|---|---|
| `TABLETOP_ONLY` | | | |
| `TECHNICAL_RESTORE_TEST` | | | |
| `APPLICATION_RECOVERY_TEST` | | | |
| `WORKFLOW_EXERCISE` | | | |
| `RECONCILIATION_EXERCISE` | | | |
| DB outage exercise | | | |
| IdP outage exercise | | | |

Registrar entorno aislado, datos sintéticos, fallo controlado y reset/recovery.
Un plan documentado no se marca probado sin evidencia.

## DEC-015-R — Communication / human factors

| Campo | Valor |
|---|---|
| Working subdecision ID | `DEC-015-R` |
| Audience | |
| User-visible contingency/degraded state | |
| Blocked actions and rationale | |
| Freshness/staleness message | |
| Approved channel reference | |
| Contact-function reference | |
| Shadow-workflow prevention | |
| Start/change/end evidence | |

No incluir teléfonos, emails, canales o destinos reales.

## Confirmaciones obligatorias

| Confirmación | Sí / No / evidencia |
|---|---|
| DEC-015 mantiene una única autoridad primaria: Dirección de Enfermería | |
| Incident no se equipara automáticamente a contingency | |
| Health failure no activa contingency clínica automáticamente | |
| Read-only no se presenta como seguro por defecto | |
| Cached data no se presenta como current | |
| Backup no se equipara a archive u offline mode | |
| Restore complete no se equipara a reconciled/released | |
| Los blockers de operational release proceden solo de capabilities `IN_SCOPE` | |
| RTO no se equipara a RPO o SLA | |
| RPO no se equipara a retention | |
| Restore capability no se equipara a aprobación de RTO/RPO | |
| Restaurar datos clínicos no obliga a restaurar sesiones activas | |
| No shared credentials, demo fallback o anonymous clinical access | |
| No silent unaudited mutation o last-write-wins | |
| No closure, task escalation o clinical action automáticos por outage | |
| No se inventan recurso de crisis, canal o procedimiento clínico | |
| Todos los tests/ejemplos usan datos sintéticos | |
| Cada capability está `IN_SCOPE / EXCLUDED / DEFERRED` | |
| Plan version, evidence, effective/review dates y blockers están registrados | |

## Resultado del gate institucional

| Campo | Valor |
|---|---|
| Canonical DEC-015 status after review | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Institutional workbook status | |
| Working subdecisions resolved for scope | |
| Deferred/excluded subdecisions | |
| Approved capability scope | |
| Plan version | |
| Approval evidence reference | |
| Effective date | |
| Review date | |
| Primary authority evidence | |
| Consultative evidence | |
| RTO/RPO references | |
| Backup/restore dependencies | |
| Restore/reconciliation threat model reference | |
| Test evidence reference | |
| Contradictions | |
| Unresolved blockers | |
| Next gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` |

Marcar el workbook `FINAL` no aprueba DEC-015. Para
`READY_FOR_TECHNICAL_SPECIFICATION`, DEC-015 debe estar `Aprobada` para un plan
version y scope concretos y completarse después la revisión de continuidad,
seguridad clínica e infraestructura.
