# DEC-005 — Matriz neutral de opciones

## Uso

Ninguna opción está recomendada, preseleccionada o aprobada. `DEC-005-A` a
`DEC-005-R` son identificadores de trabajo de la única decisión canónica DEC-005.
Los valores temporales y periodos permanecen `INSTITUTIONAL_VALUE_REQUIRED`.

Soporte actual:

- `SUPPORTED`: el baseline puede representar la opción sin semántica nueva;
- `PARTIAL`: existe un seam, pero falta política o workflow;
- `ABSENT`: la capacidad no existe;
- `CONDITIONAL`: depende de una decisión o sistema externo.

`DEC-005 PRIMARY APPROVER = Responsable del Tratamiento`. La columna
`Authority` usa exactamente esa autoridad para todas las opciones. Las columnas
de dependencia registran funciones consultivas o decisiones que pueden bloquear
scope, nunca coautoridad de DEC-005. `Security impact` describe impacto técnico
de una opción; no es una taxonomía ordinal de sensibilidad de datos.

## Matriz

| ID | Question | Option | Current technical support | Legal/privacy decision required | Clinical governance dependency | Security impact | Application impact | Schema impact | Migration impact | Data integrity impact | Audit impact | Authority | Evidence required |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | ¿Qué clases reconoce la política? | A1. Catálogo institucional mapeado al inventario técnico | `PARTIAL` | Clasificación y scope | Por clase clínica | Access mapping | Policy/config | None | None | Bajo si mapping versionado | Version/scope | Responsable del Tratamiento | Política y mapping |
| A | Igual | A2. Catálogo externo de records management referenciado | `ABSENT` | Source of truth y aplicabilidad | Según clase | Integration/access | Integration | Possible reference | Possible | Drift risk | Reference/version | Responsable del Tratamiento | Contrato y catálogo |
| B | ¿Qué propósito/record role tiene cada clase? | B1. Matriz por clase y finalidad | `PARTIAL` | Sí; no declarar todo/nada historia clínica | Autoridad clínica cuando aplique | Purpose limitation | Policy | None | None | Reduce mezcla de roles | Decision evidence | Responsable del Tratamiento | Evaluación institucional |
| B | Igual | B2. Referencia a clasificación institucional existente | `ABSENT` | Scope/mapping | Cuando aplique | External access | Integration/policy | Possible reference | Possible | Mapping drift | Mapping changes | Responsable del Tratamiento | Catálogo versionado |
| C | ¿Qué inicia el cómputo? | C1. Evento único aprobado por clase | `PARTIAL`: varios timestamps | Selección y definición | DEC-002 si closure | Clock integrity | Evaluation logic | Candidate config | Possible | Ambiguity if missing | Trigger evidence | Responsable del Tratamiento | Trigger definitions |
| C | Igual | C2. Criterio compuesto por hechos aprobados | `ABSENT` | Selección, precedencia, fallback | Según hechos | Higher | Application | Candidate | Possible | Hidden heuristic risk | Inputs/result | Responsable del Tratamiento | Rule + tests |
| D | ¿Qué periodo/criterio aplica? | D1. Periodo fijo aprobado | `ABSENT` | `INSTITUTIONAL_VALUE_REQUIRED` | None by default | Eligibility correctness | Policy/evaluation | Candidate | Possible | Premature disposition | Policy version | Responsable del Tratamiento | Schedule/evaluation |
| D | Igual | D2. Criterio o schedule legal externo referenciado | `ABSENT` | Aplicabilidad/mapping | None by default | Integration/access | Integration | Possible reference | Possible | External drift | Reference/version | Responsable del Tratamiento | Source + assessment |
| E | ¿Qué significa archivo? | E1. Read-only fuera del dataset operativo | `ABSENT` | Entrada/salida/acceso | Según clase | High | Integration | Candidate | Likely | Referential integrity | Transfer/access | Responsable del Tratamiento | Records architecture |
| E | Igual | E2. Estado lógico read-only en mismo sistema | `ABSENT` | Scope/search/access | Según clase | Medium/high | Application | Candidate | Likely | Operational mixing | State transitions | Responsable del Tratamiento | Policy + threat model |
| F | ¿Qué disposition usa cada clase? | F1. Manual con aprobación humana | `ABSENT` | Elegibilidad y evidencia | Según clase | High | Workflow | Candidate | Possible | Ordering/FK risk | Approval/result | Responsable del Tratamiento | Procedure + design |
| F | Igual | F2. Logical deactivation/tombstone/anonymization/hard-delete según clase | `PARTIAL` only deactivation | Selection per class | Según clase | Critical | Application/security | Strong candidate | Likely | Provenance/FK risk | Disposition evidence | Responsable del Tratamiento | Legal assessment + threat model |
| G | ¿Qué boundary aplica a pseudonymization/anonymization? | G1. Conservar identificación seudónima bajo controles | `SUPPORTED` technically | Purpose/access | None by default | Reidentification | Policy/security | None/possible | Possible | Attribution preserved | Access evidence | Responsable del Tratamiento | Risk assessment |
| G | Igual | G2. Anonymization formal para scope aprobado | `ABSENT` | Method/irreversibility | Según contenido | Critical | New process | Candidate | Likely | Irreversible lineage loss | Verification evidence | Responsable del Tratamiento | Formal assessment |
| H | ¿Cómo operan holds/excepciones? | H1. Hold externo referenciado | `ABSENT` | Authority/scope/start/end | Clinical review when used | High | Integration | Possible reference | Possible | Prevent premature disposition | Hold history | Responsable del Tratamiento | Procedure/authority |
| H | Igual | H2. Hold workflow local | `ABSENT` | Complete policy | Clinical review when used | High | Workflow | Candidate | Likely | Concurrency/eligibility | Append-only events | Responsable del Tratamiento | Justification + tests |
| I | ¿Dónde se gestiona acceso? | I1. Privacy/ITSM platform as source of truth | `ABSENT` | Workflow and contract | Third-party review | High | Integration | None/reference | Possible | Discovery completeness | External reference | Responsable del Tratamiento | Procedure + contract |
| I | Igual | I2. Local request workflow | `ABSENT` | Full workflow | Third-party review | Critical | New application | Strong candidate | Likely | Scope/completeness | Full evidence | Responsable del Tratamiento | Duplication justification |
| J | ¿Cómo se rectifica? | J1. Corrected version/amendment/superseding event by class | `PARTIAL` patterns exist | Select per class | Clinical authority where applicable | Medium | Application | Candidate | Possible | Preserves history | Amendment evidence | Responsable del Tratamiento | Policy and examples |
| J | Igual | J2. Mutable current field + immutable correction evidence | `PARTIAL` | Eligible fields | Clinical authority where applicable | Medium | Application | Candidate | Possible | Dual-state consistency | Before/after reference | Responsable del Tratamiento | Field matrix |
| K | ¿Cómo se aplica restriction/objection? | K1. Block future optional processing, preserve evidence | `ABSENT` | Applicability/effects | Según workflow | High | Authorization/policy | Candidate | Possible | State conflicts | Decision/event | Responsable del Tratamiento | Legal assessment |
| K | Igual | K2. External restriction flag/reference | `ABSENT` | Source/latency/failure | Según workflow | High | Integration | Possible reference | Possible | Stale restriction | Sync evidence | Responsable del Tratamiento | Contract |
| L | ¿Cómo se evalúa erasure? | L1. Manual class-by-class decision | `ABSENT` | Eligibility/exceptions | Según clase | Critical | Workflow | Candidate | Possible | Partial inconsistent erase | Decision evidence | Responsable del Tratamiento | Legal evaluation |
| L | Igual | L2. Disposition candidates with mandatory approval | `ABSENT` | Rules and authority | Según clase | Critical | Evaluation/workflow | Candidate | Likely | False eligibility | Rule + approval | Responsable del Tratamiento | Threat model/tests |
| M | ¿Cómo se gestiona portability? | M1. External privacy workflow + approved package | `ABSENT` | Scope/format/recipient | None unless clinical semantics | Critical | Integration/export | Possible | Possible | Incomplete/excessive package | Delivery evidence | Responsable del Tratamiento | Applicability + profile |
| M | Igual | M2. Local package generation | `ABSENT` | Full applicability | Clinical mapping if used | Critical | Export feature | Candidate | Likely | Provenance/data leakage | Generation/download | Responsable del Tratamiento | Profile + security review |
| N | ¿Cómo se gobiernan exports/copies? | N1. Ephemeral generation with no server storage | `PARTIAL`: SBAR preview | Fields/delivery/expiry | DEC-012 for SBAR | High | Security/application | None/possible | Possible | Browser copy outside control | Generation/download | Responsable del Tratamiento | Export policy |
| N | Igual | N2. Stored encrypted export with expiry | `ABSENT` | Storage/expiry/revocation | DEC-012 for SBAR | Critical | New storage/workflow | Candidate | Likely | Duplicate lifecycle | Access/download/disposal | Responsable del Tratamiento | Threat model |
| O | ¿Cómo se revisan caregiver/third-party data? | O1. Human third-party review | `ABSENT` | Scope/redaction rules | DEC-004/clinical input | High | Workflow | None/possible | Possible | Over/under disclosure | Reviewer/decision | Responsable del Tratamiento | Legal procedure |
| O | Igual | O2. External specialist review workflow | `ABSENT` | Handoff/source of truth | DEC-004 | High | Integration | Reference possible | Possible | Handoff loss | Transfer/receipt | Responsable del Tratamiento | Contract/procedure |
| P | ¿Cómo se propaga downstream disposition? | P1. Contractual/manual propagation with evidence | `ABSENT` | Responsibility by recipient | According to system | High | Integration | None/possible | Possible | Copies remain | Request/ack | Responsable del Tratamiento | DPA/contract/API |
| P | Igual | P2. Automated propagation for approved connectors | `ABSENT` | Capability and exceptions | According to system | Critical | Integration/worker | Candidate | Likely | Partial failure/idempotency | Delivery/result | Responsable del Tratamiento | Contract + failure tests |
| Q | ¿Cómo se tratan backups? | Q1. Eventual expiry + disposition replay after restore | `ABSENT` | Backup lifecycle | DEC-015 | Critical | Infrastructure/integration | None/possible | Possible | Restore resurrection | Restore/replay | Responsable del Tratamiento | Backup policy/tests |
| Q | Igual | Q2. Selective deletion where infrastructure supports it | `ABSENT` | Applicability/capability | DEC-015 | Critical | Infrastructure | Possible | Possible | Backup integrity | Deletion evidence | Responsable del Tratamiento | Vendor evidence |
| R | ¿Cómo se ejecuta la política? | R1. Report-only/manual disposition | `ABSENT` | Approval/workflow | Según clase | High | Reporting/workflow | Possible | Possible | Human omission | Candidate/approval/result | Responsable del Tratamiento | Procedure/tests |
| R | Igual | R2. Hybrid/automated lifecycle for approved classes | `ABSENT` | Exact class/rule/hold behavior | Según clase | Critical | Background processing | Candidate | Likely | Mass deletion/restore race | Evaluation/run/result | Responsable del Tratamiento | Technical specification + threat model |

## Reglas de selección

1. Cada opción necesita policy version, approved data-class scope por ID
   `DC-01`–`DC-29`, authority, evidence reference, effective date, review date y
   exclusiones.
2. Una opción de una fila no selecciona ni aprueba otra.
3. Cada ID debe quedar `IN_SCOPE`, `EXCLUDED` o `DEFERRED`; una omisión equivale
   a `DEFERRED`, no a aprobación.
4. `CUSTOM_OPTION` es admisible si mantiene todos los invariantes y documenta el
   impacto con las mismas columnas.
5. No se incorporan periodos, defaults jurídicos, vendors, canales o formatos por
   conveniencia técnica.
6. Cualquier hard-delete, anonymization, stored export o automation exige
   revisión de privacidad, integridad relacional y threat model antes de
   implementación.
