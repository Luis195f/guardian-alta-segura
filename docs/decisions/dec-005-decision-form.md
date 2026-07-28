# DEC-005 — Formulario institucional de decisión

## Instrucciones

Completar únicamente con información institucional aprobable y referencias
versionadas. No incluir nombres, firmas, patient IDs, professional IDs, registros
reales, PHI/PII, teléfonos, direcciones, secretos o contenido clínico.

`DEC-005-A` a `DEC-005-R` son identificadores de trabajo de la única decisión
canónica DEC-005. No son decisiones canónicas independientes.

| Plano | Estado actual / valores |
|---|---|
| Decision pack document status | `FINAL` — no canónico |
| Decision form template status | `FINAL` |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` — no canónico |
| Canonical DEC-005 status | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Readiness gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` |

La plantilla está `FINAL`; una instancia nace normalmente `DRAFT`; DEC-005 sigue
`Pendiente` y el gate actual es `READY_FOR_INSTITUTIONAL_DECISION`.

## Cabecera del expediente

| Campo | Valor |
|---|---|
| Decision pack version | |
| Decision form template status | `FINAL` — read-only |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` |
| Canonical decision ID | `DEC-005` |
| Canonical decision status | `Pendiente` — read-only hasta evidencia formal |
| Primary authority | Responsable del Tratamiento |
| Consulted functions by role | |
| Organization / scope | |
| Approval evidence repository reference | |
| Applicable evaluation reference | |
| Workshop/reference | |

```text
DEC-005 PRIMARY APPROVER = Responsable del Tratamiento
```

Consultative functions: DPO/DPD, privacidad, asesoría jurídica, seguridad,
records management, Dirección Médica, Dirección de Enfermería y Dirección TI,
según competencia. Dependency authorities: DEC-001/002 Dirección Médica;
DEC-003/004 Responsable del Tratamiento; DEC-012 Dirección Médica;
DEC-013/014 Dirección TI; DEC-015 Dirección de Enfermería; DEC-016 Gerencia del
Hospital como Responsable del Tratamiento. Cada una aprueba únicamente su
decisión; una dependencia puede bloquear scope, pero no aprobar DEC-005.

## Approved data-class scope

Marcar cada fila `IN_SCOPE`, `EXCLUDED` o `DEFERRED`. Hasta que exista una
selección formal, todas permanecen `DEFERRED`. La aprobación de una fila no
aprueba otra y una fila omitida se trata como `DEFERRED`.

| ID | Data class | Scope status | Purpose / record role reference | Unresolved blockers |
|---|---|---|---|---|
| DC-01 | Identity and account | `DEFERRED` | | |
| DC-02 | Session evidence | `DEFERRED` | | |
| DC-03 | Patient identity link | `DEFERRED` | | |
| DC-04 | Identity verification configuration | `DEFERRED` | | |
| DC-05 | Episode and timeline | `DEFERRED` | | |
| DC-06 | Participation policy configuration | `DEFERRED` | | |
| DC-07 | Participation and authorization evidence | `DEFERRED` | | |
| DC-08 | Safety Plan | `DEFERRED` | | |
| DC-09 | Home Safety | `DEFERRED` | | |
| DC-10 | Check-in configuration | `DEFERRED` | | |
| DC-11 | Check-in interaction evidence | `DEFERRED` | | |
| DC-12 | Rule configuration | `DEFERRED` | | |
| DC-13 | Rule evaluation and alert evidence | `DEFERRED` | | |
| DC-14 | Task workflow | `DEFERRED` | | |
| DC-15 | Caregiver access and session evidence | `DEFERRED` | | |
| DC-16 | Caregiver contribution | `DEFERRED` | | |
| DC-17 | Caregiver access audit | `DEFERRED` | | |
| DC-18 | Technical AuditEvent | `DEFERRED` | | |
| DC-19 | Governance evidence projections | `DEFERRED` | | |
| DC-20 | SBAR preview | `DEFERRED` | | |
| DC-21 | Browser print/download copy | `DEFERRED` | | |
| DC-22 | Safety Plan PDF candidate | `DEFERRED` | | |
| DC-23 | Rights access export | `DEFERRED` | | |
| DC-24 | Portability package | `DEFERRED` | | |
| DC-25 | Institutional report | `DEFERRED` | | |
| DC-26 | Operational telemetry | `DEFERRED` | | |
| DC-27 | Incident/support evidence | `DEFERRED` | | |
| DC-28 | Downstream copies | `DEFERRED` | | |
| DC-29 | Backup/restore copies | `DEFERRED` | | |

## Registro común por subdecisión y clase

Crear una entrada por working subdecision y data class aplicable.

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-005` |
| Working subdecision ID | |
| Data class | |
| Purpose / record role | |
| Selected option | |
| Custom option | |
| Retention trigger | |
| Retention criterion/value reference | `INSTITUTIONAL_VALUE_REQUIRED` hasta aprobación |
| Archive rule | |
| Disposition rule | |
| Rights handling | |
| Export handling | |
| Exception/hold | |
| Rationale | |
| DEC-005 approver role | Responsable del Tratamiento |
| Consultative function | |
| Dependency decision / authority | Solo para registrar el blocker o evidencia de esa decisión; no aprueba DEC-005 |
| Consulted roles | |
| Approval evidence reference | |
| Policy version | |
| Approved scope | |
| Effective date | |
| Review date | |
| Dependencies | |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

No registrar un periodo numérico sin evidencia institucional. No usar
`anonymous` para UUID, cuid, hash o ID seudónimo sin assessment formal.

## DEC-005-A — Data classification

| Campo | Valor |
|---|---|
| Question | ¿Qué clases reconoce la política y cómo se mapean a objetos del repositorio? |
| Required output | Catálogo versionado + mapping + included/excluded scope |
| Dependencies | Data inventory |
| Blocker classes | `BLOCKING_FOR_REAL_DATA`, `BLOCKING_FOR_RETENTION` |

## DEC-005-B — Purpose / record role

| Campo | Valor |
|---|---|
| Question | ¿Qué finalidad y papel tiene cada clase? |
| Required output | operational state / care documentation / legal evidence / technical evidence / security evidence / configuration / temporary processing / other approved role |
| Dependencies | DEC-005-A; consultative clinical authority when applicable |
| Guardrail | No declarar que todo es o que nada es historia clínica |

## DEC-005-C — Retention start event

| Campo | Valor |
|---|---|
| Question | ¿Qué evento inicia el cómputo por clase? |
| Candidate values | record creation / episode closure / end of care / last interaction / revocation / account closure / policy supersession / incident closure / export creation / other approved event |
| Dependencies | DEC-005-A/B; DEC-002 when closure is considered |
| Guardrail | Candidate is not selection |

## DEC-005-D — Retention period / criteria

| Campo | Valor |
|---|---|
| Question | ¿Qué criterio o referencia aplica por clase? |
| Candidate values | fixed approved period / criterion-based / external schedule reference / until approved superseding event / custom |
| Required value before approval | `INSTITUTIONAL_VALUE_REQUIRED` |
| Guardrail | No legal default or unapproved number |

## DEC-005-E — Archive

| Campo | Valor |
|---|---|
| Question | ¿Qué significa archive y qué clases entran/salen? |
| Required output | read-only, operational separation, location model, access, searchability, integrity, entry/exit and evidence |
| Dependencies | A–D, security/records management |
| Guardrail | No hot/warm/cold selection by software |

## DEC-005-F — Disposition / deletion

| Campo | Valor |
|---|---|
| Question | ¿Qué disposición aplica por clase? |
| Candidate values | hard-delete / logical deactivation / tombstone / anonymization / external archive / other approved disposition |
| Dependencies | A–E/H; relational integrity review |
| Required gate | `DELETION_DESIGN_REVIEW_REQUIRED` before implementation |

## DEC-005-G — Pseudonymization / anonymization

| Campo | Valor |
|---|---|
| Question | ¿Qué mecanismos son seudonimización y qué scope podría considerarse anonimizado? |
| Required output | Method, reidentification assessment, scope, irreversibility, downstream and verification |
| Current baseline | Technical pseudonymization only |
| Guardrail | UUID/cuid/hash/pseudonymous ID ≠ anonymous |

## DEC-005-H — Preservation hold / exception

| Campo | Valor |
|---|---|
| Question | ¿Qué categorías suspenden disposition y quién las aplica/libera? |
| Candidate categories | legal/institutional hold / security investigation / clinical review / litigation/claim / research/archive |
| Required output | Authority, scope, start/end evidence and interaction with rights/restore |
| Guardrail | No legal procedure is selected here |

## DEC-005-I — Access right workflow

| Campo | Valor |
|---|---|
| Question | ¿Dónde reside y cómo funciona el workflow de acceso? |
| Required output | identity, representation, scope, discovery, review, assembly, delivery and evidence |
| Dependencies | DEC-004/013; third-party review |
| Guardrail | No response deadline or endpoint selected |

## DEC-005-J — Rectification

| Campo | Valor |
|---|---|
| Question | ¿Cómo se corrige cada clase sin destruir trazabilidad? |
| Candidate values | corrected version / amendment / superseding event / annotation/reference / mutable field + evidence / custom |
| Required output | Field/class matrix and historical correction behavior |
| Guardrail | Do not rewrite append-only history silently |

## DEC-005-K — Restriction / objection

| Campo | Valor |
|---|---|
| Question | ¿Qué efectos aplican y sobre qué tratamientos? |
| Required output | future processing, communication, optional processing, evidence preservation and disposition interaction |
| Dependencies | Legal applicability by class |
| Guardrail | Restriction ≠ deletion |

## DEC-005-L — Erasure / suppression

| Campo | Valor |
|---|---|
| Question | ¿Qué clases son evaluables, qué se preserva y cómo queda evidencia mínima? |
| Required output | Per-class eligibility, preservation reason, third-party/downstream/backup handling |
| Dependencies | A–H/J/K/O/P/Q |
| Guardrail | Erasure request ≠ unconditional hard-delete |

## DEC-005-M — Data portability

| Campo | Valor |
|---|---|
| Question | ¿Qué scope, formato, recipient and delivery apply when legally applicable? |
| Required output | Provided-by-subject scope, format, direct transmission, security and provenance |
| Dependencies | Identity/representation/legal assessment |
| Guardrail | Portability ≠ clinical interoperability ≠ SBAR |

## DEC-005-N — Exports / copies

| Campo | Valor |
|---|---|
| Question | ¿Cómo se gobierna cada export/copia? |
| Required output | requester, authorization, purpose, fields, format, provenance, storage, expiry, delivery, download evidence and revocation limits |
| Dependencies | DEC-012 for SBAR; O/P/Q |
| Guardrail | No PDF universal, public link, email or indefinite storage selected |

## DEC-005-O — Third parties / caregivers

| Campo | Valor |
|---|---|
| Question | ¿Qué review y tratamiento requiere información de cuidadores/profesionales/terceros? |
| Required output | Scope, redaction/review authority, representation and evidence |
| Dependencies | DEC-004/013 + privacy/legal review |
| Guardrail | Caregiver revocation ≠ erasure of historical contribution |

## DEC-005-P — Downstream / processor propagation

| Campo | Valor |
|---|---|
| Question | ¿Qué responsabilidades y capacidades existen por recipient? |
| Required output | Controller/processor role, contract/API, request/ack, failure and evidence |
| Dependencies | Selected real integration only |
| Guardrail | No claim that Guardián can delete third-party copies without capability |

## DEC-005-Q — Backup / disaster recovery copies

| Campo | Valor |
|---|---|
| Question | ¿Cómo interactúan retention/disposition con backup and restore? |
| Required output | Backup retention, encryption, access, immutability, restore behavior, replay and evidence |
| Dependencies | DEC-015 |
| Guardrail | Backup ≠ archive; no RTO/RPO selected |

## DEC-005-R — Automated enforcement

| Campo | Valor |
|---|---|
| Question | ¿La política se aplica report-only, manual, automated or hybrid? |
| Required output | Approved classes, evaluation explanation, approval, holds, idempotency, failure, rollback and evidence |
| Dependencies | A–Q + technical specification/threat model |
| Guardrail | Policy approval does not automatically authorize cron/purge/cascade |

## Legal applicability worksheet

Usar solo `LEGAL_ASSESSMENT_REQUIRED`, `INSTITUTIONAL_POLICY_REQUIRED`,
`DEPENDENT_ON_SCOPE` o `NOT_APPLICABLE_TECHNICALLY`.

`NOT_APPLICABLE_TECHNICALLY` no significa `LEGALLY_NOT_APPLICABLE`: solo indica
que no existe una source persistida independiente o que el artefacto aún no
existe. Deben evaluarse las fuentes subyacentes y cualquier copia futura.

| ID | Data class | Access | Rectification | Erasure | Restriction | Portability | Retention / third-party | DEC-005 authority | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| DC-01 | Identity and account | | | | | | | Responsable del Tratamiento | |
| DC-02 | Session evidence | | | | | | | Responsable del Tratamiento | |
| DC-03 | Patient identity link | | | | | | | Responsable del Tratamiento | |
| DC-04 | Identity verification configuration | | | | | | | Responsable del Tratamiento | |
| DC-05 | Episode and timeline | | | | | | | Responsable del Tratamiento | |
| DC-06 | Participation policy configuration | | | | | | | Responsable del Tratamiento | |
| DC-07 | Participation and authorization evidence | | | | | | | Responsable del Tratamiento | |
| DC-08 | Safety Plan | | | | | | | Responsable del Tratamiento | |
| DC-09 | Home Safety | | | | | | | Responsable del Tratamiento | |
| DC-10 | Check-in configuration | | | | | | | Responsable del Tratamiento | |
| DC-11 | Check-in interaction evidence | | | | | | | Responsable del Tratamiento | |
| DC-12 | Rule configuration | | | | | | | Responsable del Tratamiento | |
| DC-13 | Rule evaluation and alert evidence | | | | | | | Responsable del Tratamiento | |
| DC-14 | Task workflow | | | | | | | Responsable del Tratamiento | |
| DC-15 | Caregiver access and session evidence | | | | | | | Responsable del Tratamiento | |
| DC-16 | Caregiver contribution | | | | | | | Responsable del Tratamiento | |
| DC-17 | Caregiver access audit | | | | | | | Responsable del Tratamiento | |
| DC-18 | Technical AuditEvent | | | | | | | Responsable del Tratamiento | |
| DC-19 | Governance evidence projections | | | | | | | Responsable del Tratamiento | |
| DC-20 | SBAR preview | | | | | | | Responsable del Tratamiento | |
| DC-21 | Browser print/download copy | | | | | | | Responsable del Tratamiento | |
| DC-22 | Safety Plan PDF candidate | | | | | | | Responsable del Tratamiento | |
| DC-23 | Rights access export | | | | | | | Responsable del Tratamiento | |
| DC-24 | Portability package | | | | | | | Responsable del Tratamiento | |
| DC-25 | Institutional report | | | | | | | Responsable del Tratamiento | |
| DC-26 | Operational telemetry | | | | | | | Responsable del Tratamiento | |
| DC-27 | Incident/support evidence | | | | | | | Responsable del Tratamiento | |
| DC-28 | Downstream copies | | | | | | | Responsable del Tratamiento | |
| DC-29 | Backup/restore copies | | | | | | | Responsable del Tratamiento | |

## Confirmaciones obligatorias

| Confirmación | Sí / No / evidencia |
|---|---|
| DEC-005 remains `Pendiente` until formal evidence | |
| Primary authority remains Responsable del Tratamiento | |
| No retention period/default was selected | |
| Retention, archive and backup remain distinct | |
| Revocation/withdrawal/closure/deactivation are not deletion | |
| Pseudonymization is not called anonymization | |
| Append-only is not interpreted as retain forever | |
| Access, portability and SBAR export remain distinct | |
| Erasure is assessed per class, not unconditional hard-delete | |
| Third-party/caregiver review is defined where applicable | |
| Backup/restore resurrection is addressed | |
| Exports have requester, scope, delivery, expiry and evidence | |
| No new role, endpoint, table, scheduler, purge or cascade was authorized | |
| No PHI/PII, name, signature or real record is included | |
| Excluded/deferred classes remain blocked | |

## Resultado del gate institucional

| Campo | Valor |
|---|---|
| Canonical DEC-005 status after review | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Policy version | |
| Approved data-class scope | |
| Approved purpose/record role scope | |
| Retention trigger definitions | |
| Retention criteria/value references | |
| Archive rules | |
| Disposition rules | |
| Rights handling scope | |
| Export handling | |
| Holds/exceptions | |
| Approval evidence reference | |
| Effective date | |
| Review date | |
| Dependencies resolved | |
| Explicitly excluded/deferred scope | |
| Unresolved blockers | |
| Contradictory selections | |
| Next gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` |

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ privacy + data architecture review
→ relational integrity / deletion / export threat model
→ migration + rollback design when applicable
→ READY_FOR_IMPLEMENTATION
```

Marking the workbook `FINAL` does not itself approve DEC-005 or authorize
implementation.
