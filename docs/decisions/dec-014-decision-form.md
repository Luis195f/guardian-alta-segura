# DEC-014 — Formulario institucional de decisión

## Instrucciones

Completar únicamente con información institucional aprobable y referencias
versionadas. No incluir nombres, firmas, datos de pacientes o profesionales,
direcciones, teléfonos, hostnames, IP reales, secretos, capturas con PHI/PII ni
contenido clínico. Las identidades nominales y firmas permanecen en el sistema
institucional; el repositorio conserva solo roles y referencias minimizadas.

`DEC-014-A` a `DEC-014-N` son identificadores de trabajo dentro de la única
decisión canónica DEC-014. No son decisiones canónicas independientes.

| Plano | Estado actual / valores | Efecto |
|---|---|---|
| Decision pack document status | `FINAL` | Estado del paquete; no canónico |
| Decision form template status | `FINAL` | Estado de esta plantilla |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` | Estado de una instancia completada; no cambia DEC-014 |
| Canonical DEC-014 status | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` | Único estado canónico |
| Readiness gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` | Preparación técnica; no es aprobación |

La plantilla está `FINAL`; una instancia nace normalmente `DRAFT`; DEC-014 sigue
`Pendiente` y el gate actual es `READY_FOR_INSTITUTIONAL_DECISION`.

## Cabecera del expediente

| Campo | Valor |
|---|---|
| Decision pack version | |
| Decision form template status | `FINAL` — read-only |
| Workshop/reference | |
| Organization / scope | |
| Prepared by role | |
| Reviewers by role | |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` — no canónico |
| Canonical decision ID | `DEC-014` |
| Canonical decision status | `Pendiente` — read-only hasta evidencia formal |
| Primary authority | Dirección TI |
| Evidence repository reference | |

## Campos comunes por subdecisión

Cada bloque debe completar:

- selected option o custom option;
- rationale;
- approver role;
- approval evidence reference;
- policy version;
- approved scope;
- effective date y review date;
- dependencies;
- excluded/deferred scope;
- unresolved blockers;
- notes without PHI/PII.

El approved scope debe marcar por separado cada capacidad:

| Capacidad | `IN_SCOPE / EXCLUDED / DEFERRED` | Límites y evidencia |
|---|---|---|
| `OBSERVABILITY_FOUNDATION` | | |
| `INCIDENT_CANDIDATE_DETECTION` | | |
| `OPERATIONAL_ALERTING_ESCALATION` | | |
| `INCIDENT_MANAGEMENT_SUPPORT` | | |

La foundation aporta health/readiness, logs sanitizados, métricas, tracing y
correlación. No implica por sí sola detección, notificación, escalado o lifecycle
de incidentes.

## DEC-014-A — Incident definition

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-A` |
| Question | ¿Qué distingue error transitorio, candidato e incidente técnico institucional? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir por separado application error, technical incident, security event,
privacy event, infrastructure degradation, dependency failure, data integrity
incident y possible clinical-safety-impacting technical incident.

## DEC-014-B — Incident taxonomy

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-B` |
| Question | ¿Existe taxonomía institucional y cómo se versiona? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-A |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

No registrar P1/P2/P3/P4, SEV1/SEV2 o Critical/High/Medium/Low sin evidencia
aprobada. Usar placeholders durante el workbook.

## DEC-014-C — Technical severity

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-C` |
| Question | ¿Existe severidad técnica, qué hechos usa y quién la asigna/cambia? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-A/B cuando corresponda |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Confirmar que technical severity no usa ni expresa patient severity, diagnosis,
suicide risk o clinical urgency.

## DEC-014-D — Incident candidate detection sources

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-D` |
| Question | ¿Qué fuentes de detección crean candidatos a incidente y quién confirma? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-A/C/E |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar por fuente: manual report, error rate, database, authentication,
authorization, queue, latency, build/deployment y dependency. Ninguna está
aprobada por aparecer aquí. DEC-014-D es
`BLOCKING_FOR_INCIDENT_DETECTION`; no es un catálogo general de telemetría ni un
blocker de `OBSERVABILITY_FOUNDATION`.

## DEC-014-E — Sanitization

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-E` |
| Question | ¿Qué campos permite cada artefacto y qué prueba demuestra redacción? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-005; privacy/security consultation |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Adjuntar matriz aprobada para log, structured error, metric label, trace
attribute, ticket, incident record, postmortem, screenshot y export. Adjuntar plan
de pruebas con payload sintético y evidencia de outputs reales.

## DEC-014-F — Technical identifiers

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-F` |
| Question | ¿Qué identificadores pueden aparecer en soporte y para qué finalidad? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-E; DEC-005 |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar individualmente para correlation ID, request ID, technical resource ID,
episode ID, error code, timestamp y component. Clasificar cada UUID por contexto.

## DEC-014-G — Access / segregation

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-G` |
| Question | ¿Quién accede a cada artefacto y mediante qué control? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013; DEC-014-E/F |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Adjuntar matriz separada de application/security logs, AuditEvent, metrics,
traces, incident records, tickets y postmortems. Incluir grant, review, expiry,
export y break-glass. No crear roles runtime desde el formulario.

## DEC-014-H — Incident lifecycle

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-H` |
| Question | ¿Qué estados, actores y evidencia gobiernan el lifecycle? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-A/B/C |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir creación, triage, investigación, mitigación, resolución, cierre,
reapertura, duplicado y postmortem sin asumir los nombres ilustrativos del pack.

## DEC-014-I — Technical escalation

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-I` |
| Question | ¿Qué condición escala, a qué función y con qué acknowledgement/fallback? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-C/H/J |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

No registrar tiempos, guardias, on-call o reintentos hasta evidencia aprobada.
Confirmar que no es DEC-017 ni escalado clínico.

## DEC-014-J — Communication

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-J` |
| Question | ¿Qué canales se permiten y qué contenido admite cada uno? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-E/F/G/I |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

No incluir direcciones, números, webhooks o canales reales. Registrar por canal
allowlist, destinatarios, acknowledgement, fallback y prohibiciones.

## DEC-014-K — Clinical-safety handoff

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-K` |
| Question | ¿Cómo se transfiere una posible afectación asistencial a la autoridad competente? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | `CONSULTATIVE_AUTHORITY_REQUIRED` |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir solo identificación y handoff técnico. La autoridad clínica determina
impacto, severidad y respuesta. Prohibidos scoring y decisión clínica automática.

## DEC-014-L — Security / privacy handoff

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-L` |
| Question | ¿Qué evento se entrega a security/privacy y quién conserva la decisión? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | Responsable del Tratamiento / DPO-DPD / security governance cuando aplique |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

No registrar conclusión jurídica, obligación o plazo sin fuente institucional.

## DEC-014-M — Retention / evidence

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-M` |
| Question | ¿Qué evidencia mínima se conserva y dónde reside la source of truth? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-005 |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar por log, metric, trace, ticket, incident record y postmortem. DEC-014 no
fija por sí sola periodos de retención.

## DEC-014-N — Post-incident / learning

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-014` |
| Working subdecision ID | `DEC-014-N` |
| Question | ¿Cuándo se exige RCA/postmortem y cómo se demuestra el cierre de acciones? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-014-B/C/H/M cuando corresponda |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir participantes por función, enfoque no culpabilizante, vínculo a change
management y evidencia de cierre. No seleccionar issue tracker o CAPA.

## Decisiones de automatización separadas

| Capacidad | Selected option / rationale / evidence |
|---|---|
| Automated detection | |
| Automated technical notification | |
| Automated ticket creation | |
| Automated escalation | |
| Automated mitigation | |

Una respuesta en una fila no aprueba las demás. Automated mitigation requiere
análisis técnico y de seguridad independiente.

## Confirmaciones obligatorias

| Confirmación | Sí / No / evidencia |
|---|---|
| Application error no se equipara automáticamente a incidente | |
| Technical incident no se equipara a deterioro clínico | |
| Technical severity no usa ni expresa severidad clínica | |
| `src/domain/alerts` no se reutiliza para monitoring | |
| Logs/tickets/incidentes/postmortems no contienen payload clínico | |
| Secret, token, cookie y Authorization están prohibidos | |
| IDs se clasifican por contexto; UUID no se considera anónimo por defecto | |
| Support, admin, security y profesional clínico siguen segregados | |
| No se han creado roles runtime | |
| No se han seleccionado SLI/SLO/SLA numéricos | |
| No se han inventado tiempos, on-call, pager o canales | |
| No hay decisión clínica, contacto o mitigación asistencial automática | |
| Se han identificado dependencias DEC-005/013/016 | |
| Las pruebas usan exclusivamente datos sintéticos | |
| Se conserva referencia, versión, scope y effective date de la aprobación | |

## Resultado del gate institucional

| Campo | Valor |
|---|---|
| Canonical DEC-014 status after review | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Working subdecisions resolved for scope | |
| Working subdecisions deferred with explicit exclusion | |
| Blocking evidence still missing | |
| Approved scope | |
| Policy version | |
| Approval evidence reference | |
| Effective date | |
| Review date | |
| Required consultative evidence | |
| Security/privacy dependencies | |
| Contradictions between selected options | |
| Explicitly excluded scope | |
| Unresolved items that remain blocked | |
| Sanitization test evidence reference | |
| Next gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` |

Marcar el workbook `FINAL` no cambia DEC-014 ni autoriza soporte u observabilidad.
`READY_FOR_TECHNICAL_SPECIFICATION` exige DEC-014 `Aprobada` para policy version y
approved scope, evidencia, effective date, blockers resueltos, dependencias
identificadas, pruebas de sanitización especificadas y ausencia de contradicción.
La especificación posterior debe mapear cada capacidad en scope a arquitectura,
flujos, controles, ownership y pruebas concretos; nada excluido o diferido queda
habilitado.

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ observability + security architecture review
→ READY_FOR_IMPLEMENTATION
```
