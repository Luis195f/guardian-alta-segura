# DEC-013 — Matriz neutral de opciones

## Uso

Ninguna opción está recomendada, preseleccionada o aprobada. `DEC-013-A` a
`DEC-013-P` son identificadores de trabajo dentro de la única decisión canónica
DEC-013.

Seleccionar una fila no cambia `Canonical DEC-013 status = Pendiente`, no
selecciona vendor/protocolo/MFA/timeout y no autoriza implementación.

La columna `AUTHORITY` identifica siempre la única autoridad primaria de
DEC-013: Dirección TI. Otras disciplinas y autoridades aparecen únicamente en
`EVIDENCE REQUIRED` como consultas o dependencias y conservan la autoridad de
sus propias decisiones.

Leyenda de soporte:

- `SUPPORTED_DEMO_ONLY`: existe mecánica local sintética, no productiva;
- `PARTIAL`: existe un seam o control reutilizable;
- `ABSENT`: la capacidad no existe;
- `CONDITIONAL`: depende de evidencia u otra selección.

## Matriz

| ID | QUESTION | OPTION | CURRENT TECHNICAL SUPPORT | SECURITY IMPACT | PRIVACY IMPACT | APPLICATION IMPACT | INFRASTRUCTURE IMPACT | IDP DEPENDENCY | SCHEMA IMPACT | AUDIT IMPACT | AUTHORITY | EVIDENCE REQUIRED |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | ¿Qué poblaciones entran en el primer scope? | Solo workforce clinical | `PARTIAL`: roles `nurse`/`clinician` demo | Reduce superficie inicial; no resuelve otras poblaciones | Datos profesionales según finalidad | Delimitar rutas y gates | Realm/config por decidir | Alta | Puede ser ninguno | Evidencia por población | Dirección TI | Scope, exclusiones y owners |
| A2 | Igual | Workforce + admin/support | `PARTIAL` | Exige segregación privilegiada | Metadata de profesionales/operación | Matrices separadas | Posible realm/policy separado | Alta | Candidato | Access grants/reviews | Dirección TI | Scope y segregation |
| A3 | Igual | Scopes independientes: workforce, patient, caregiver, admin/support, privileged, break-glass y service | `PARTIAL` solo demo humano | Mayor complejidad, aislamiento explícito | Finalidades distintas | Flujos separados | Uno o varios realms/IdP | Alta | Posible | Evidencia separada | Dirección TI | Matriz de poblaciones y consultas aplicables |
| B1 | ¿Qué IdP/source of truth se usa? | IdP institucional existente, si se acredita | `ABSENT` | Trust y disponibilidad por diseñar | Claims y transferencias por definir | Nuevo adapter | Integración requerida | Directa | Posible | Auth evidence por definir | Dirección TI | Contrato, ownership y pruebas |
| B2 | Igual | Varios IdP/realms por población | `ABSENT` | Aislamiento y complejidad de trust | Separación de finalidades | Routing/linking nuevos | Integraciones múltiples | Directa | Candidato | Issuer/realm en evidencia | Dirección TI | Inventario y contratos |
| B3 | Igual | `CUSTOM_OPTION` sin vendor preseleccionado | `ABSENT` | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Directa | Por evaluar | Por evaluar | Dirección TI | Diseño y pruebas institucionales |
| C1 | ¿Qué identifica establemente al sujeto? | Issuer + subject estable aprobado | `ABSENT` | Reduce colisiones; exige validación estricta | Identificador seudónimo contextual | Account linking | Trust de issuer | Directa | `SCHEMA_CANDIDATE` | Linking/unlinking | Dirección TI | Semántica, unicidad y lifecycle |
| C2 | Igual | Identificador institucional distinto del email | `ABSENT` | Depende de garantía de estabilidad | Minimización por evaluar | Mapping/linking | Directory dependency | Directa | `SCHEMA_CANDIDATE` | Cambios y recuperación | Dirección TI | Contrato del identificador |
| C3 | Igual | Email como identificador estable | `ABSENT`; no admitido por conveniencia | Riesgo de reassignment/rename | Identificador directo | Alto | Directory policy | Directa | Candidato | Re-linking crítico | Dirección TI | Aprobación expresa, controles y consulta de privacidad |
| D1 | ¿Cómo se provisiona? | Pre-provisioning institucional | `ABSENT` | Menor JIT, riesgo de cuentas huérfanas | Minimización previa | Provisioning flow | Integración/sync | Alta | Candidato | Alta/cambio/baja | Dirección TI | JML y reconciliation |
| D2 | Igual | Just-in-time con allowlist/mapping aprobado | `ABSENT` | Riesgo de alta por claim erróneo | Creación en primer acceso | Login + linking | IdP claims | Alta | Candidato | Provisioning decision | Dirección TI | Reglas, fail closed y tests |
| D3 | Igual | Directory sync/SCIM si existe | `ABSENT` | Revocación y drift por diseñar | Atributos sincronizados mínimos | Sync/reconciliation | Integración requerida | Alta | Candidato | Eventos de lifecycle | Dirección TI | Contrato real y pruebas |
| D4 | Igual | Provisioning manual institucional | `PARTIAL`: admin demo asigna roles, no cuentas | Riesgo operativo/privilegio | Menor ingestión de directorio | UI/workflow futuro | Menor integración, mayor operación | Media | Candidato | Dual control/review | Dirección TI | Procedimiento JML |
| E1 | ¿Qué assurance requiere cada población? | Policy institucional: reforzada para workforce y proporcional para patient/caregiver | `ABSENT` | Assurance explícito y comparable sin seleccionar mecanismo | Datos de factor minimizados | Step-up/claims por diseñar | IdP/device dependency | Alta | Puede ser ninguno | Resultado, no secreto | Dirección TI | Policy y pruebas por población |
| E2 | Igual | Assurance condicionado por operación privilegiada | `ABSENT` | Step-up reduce standing risk; falla si no propaga | Evento de assurance contextual | Guards adicionales | IdP/PAM dependency | Alta | Posible | Step-up evidence | Dirección TI | Operaciones, freshness y fallo |
| E3 | Igual | Password-only para workforce profesional | `NOT_ELIGIBLE_UNDER_CURRENT_REQ_12` | No satisface la autenticación reforzada canónica; no implica seleccionar MFA | Menos factor data, mayor takeover risk | No elegible para `nurse`/`clinician`/workforce bajo REQ-12 vigente | IdP policy | Directa | Ninguno posible | Auth result | Dirección TI | Determinar assurance/mecanismo reforzado; patient/caregiver mantienen decisión proporcional separada |
| F1 | ¿Cómo vive una sesión? | Sesión server-side de aplicación | `PARTIAL`: `SessionMetadata` demo | Revocación local; sincronización IdP pendiente | Metadata de sesión | Auth/session services | Store y HA | Alta | `SCHEMA_CANDIDATE` | Create/revoke | Dirección TI | Lifecycle completo |
| F2 | Igual | Sesión gestionada principalmente por IdP + estado mínimo local | `ABSENT` | Depende de back-channel/front-channel/logout contract | Minimiza persistencia local | Rediseño de session reader | IdP availability | Alta | Por evaluar | Correlación mínima | Dirección TI | Contrato y negative tests |
| F3 | Igual | Combinación IdP + sesión local revocable | `PARTIAL` | Dos lifecycles a sincronizar | Metadata en dos sistemas | Integración + local store | Alta | Alta | Candidato | Ambos eventos referenciados | Dirección TI | Propagación y failure tests |
| F4 | ¿Qué tiempos/refresh se aplican? | `CUSTOM_OPTION` con valores institucionales | Demo tiene absolute TTL 1–12 h; no policy | Expiry/idle/rotation por evaluar | Minimizar activity metadata | Cambios según selección | Store/IdP | Alta | Posible | Expiry/revocation | Dirección TI | Valores, rationale y tests |
| G1 | ¿Cómo se mapean funciones a roles? | Mapping versionado de grupos/claims a roles técnicos | `ABSENT` | Riesgo de overmapping; requiere controles posteriores y deny-by-default | Claims mínimos | Mapper y policy; nunca acceso directo al recurso | IdP config | Directa | `SCHEMA_CANDIDATE` | Mapping version/effect | Dirección TI | Tabla aprobada y pruebas de relación/policy/resource denial |
| G2 | Igual | Provisioning asigna roles; login no los deriva directamente | `PARTIAL`: `RoleAssignment` local | Reduce claim→access directo; drift por controlar | Menos claims persistidos | Provisioning/reconciliation | Directory integration | Alta | Posible | Alta/revocación/review | Dirección TI | JML + mapping |
| G3 | Igual | Mapping manual institucional | `PARTIAL` demo | Error humano/privilege accumulation | Menor profile ingest | Workflow privilegiado | Menor IdP automation | Media | Candidato | Dual control/access review | Dirección TI | Procedimiento y evidence |
| H1 | ¿De dónde procede responsabilidad de episodio? | Fuente institucional externa aprobada | `ABSENT` | Integridad/freshness crítica | Relación profesional-paciente | Adapter/read model | Integración requerida | Indirecta | Candidato | Source/version/freshness | Dirección TI | Contrato, failure modes y consulta al owner del workflow |
| H2 | Igual | Asignación manual gobernada en Guardián | `PARTIAL`: IDs actuales se fijan al crear | Riesgo de stale assignment | Relación sensible | Lifecycle de responsabilidad | Menor integración | Baja | `SCHEMA_CANDIDATE` | Assignment/revocation | Dirección TI | Procedimiento, concurrencia y consulta a la autoridad operativa |
| H3 | Igual | `CUSTOM_OPTION` fail-closed | `PARTIAL` | Debe negar si no prueba relación | Minimización | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Decisión + evidence | Dirección TI | Contrato reproducible y consulta a la autoridad del recurso |
| I1 | ¿Cómo se segregan admin/support y funciones institucionales de seguridad/IAM? | Privilegio permanente por función; security/IAM no es rol runtime | `PARTIAL` demo admin/support | Acumulación y SoD | Acceso a metadata por función | Roles/policies futuras sin crear rol `security` | IdP groups | Alta | Candidato | Grant/review/revoke | Dirección TI | Matriz por artefacto y funciones |
| I2 | Igual | Acceso temporal/JIT | `ABSENT` | Menor standing privilege; flujo complejo | Ventana y motivo de acceso | Request/approval/expiry | PAM/IdP posible | Alta | Candidato/external | Solicitud, uso, expiry | Dirección TI | Procedimiento y tests |
| I3 | Igual | Sistema externo segregado; sin visor clínico para support | `PARTIAL` como límite, no integración | Reduce exposición de contenido | Minimización fuerte | Menos surface local | Integración/support tooling | Media | Ninguno local posible | Referencia externa | Dirección TI | Arquitectura y access policy |
| J1 | ¿Cómo se autentica/linka paciente? | IdP/proceso institucional específico de pacientes | `ABSENT` | Account takeover/recovery por diseñar | Identity proofing sensible | Flujos patient separados | Integración requerida | Directa | Candidato | Linking/recovery | Dirección TI | Proceso, pruebas y consultas a DEC-001/003 |
| J2 | Igual | Realm compartido con workforce pero policy diferenciada | `ABSENT` | Riesgo de confusión de población | Claims/finalidades separadas | Routing/policy | IdP config | Alta | Candidato | Population evidence | Dirección TI | Realm/policy evidence |
| J3 | Igual | Diferir patient authentication | `SUPPORTED` como bloqueo actual | Sin acceso productivo paciente | Sin nueva ingestión | Mantener bloqueo | Ninguno | Ninguna | Ninguno | Exclusión explícita | Dirección TI | Approved scope |
| K1 | ¿Cómo se autentica/linka caregiver? | Identidad institucional + invitación/scope DEC-004 | `PARTIAL`: invitación/scope demo | Linking y replay por diseñar | Relación caregiver-patient sensible | Adapter + flujo existente | IdP/messaging posible | Alta | Candidato | Invite/link/revoke | Dirección TI | Contratos DEC-004/013 y consulta al Responsable del Tratamiento como autoridad de DEC-004 |
| K2 | Igual | Realm específico caregiver | `ABSENT` | Aislamiento vs complejidad | Separación de población | Routing/session | Realm adicional | Alta | Candidato | Realm/link evidence | Dirección TI | Arquitectura institucional |
| K3 | Igual | Diferir caregiver authentication | `SUPPORTED` como bloqueo actual | Sin acceso productivo caregiver | Sin nueva ingestión | Mantener bloqueo | Ninguno | Ninguna | Ninguno | Exclusión explícita | Dirección TI | Approved scope |
| L1 | ¿Existe break-glass? | Excluirlo del primer scope | `SUPPORTED` por ausencia | Sin bypass; contingencia debe resolverse aparte | Sin nueva exposición | Ninguno | Ninguno | Ninguna | Ninguno | Exclusión | Dirección TI | Scope + DEC-015 dependency |
| L2 | Igual | Acceso excepcional limitado, aprobado y revisado | `ABSENT` | Alto; scope/step-up/expiry críticos | Acceso excepcional a datos | Lifecycle nuevo | IdP/PAM/notificación | Alta | Candidato | Uso y post-review | Dirección TI | Política, pruebas y consultas a autoridades dependientes |
| L3 | Igual | Mecanismo institucional externo referenciado | `ABSENT` | Trust/integración por probar | Flujo entre sistemas | Adapter/reference | Integración requerida | Alta | Posible referencia | Cross-system evidence | Dirección TI | Contrato, scope y rollback |
| M1 | ¿Cómo se otorga privilegio? | Standing privilege | `PARTIAL` demo | Privilege accumulation | Metadata/artefactos expuestos | Mapping/access review | IdP groups | Alta | Posible | Grant/review/revoke | Dirección TI | Matriz y review cadence |
| M2 | Igual | Temporary/JIT privilege | `ABSENT` | Expiry y approval reducen exposición | Motivo/tiempo minimizados | Workflow nuevo | PAM/IdP posible | Alta | Candidato | Request/use/expiry | Dirección TI | Procedimiento y tests |
| M3 | Igual | Dual control para privilegios seleccionados | `ABSENT` | Reduce self-grant; disponibilidad por evaluar | Evidencia de approver por rol | Approval workflow | IdP/PAM posible | Alta | Candidato | Dos decisiones separadas | Dirección TI | Operaciones y excepciones |
| N1 | ¿Se necesitan service identities? | No en el primer scope | `SUPPORTED` por ausencia | Evita credenciales preventivas | Sin datos adicionales | Ninguno | Ninguno | Ninguna | Ninguno | Declarar N/A | Dirección TI | Scope |
| N2 | Igual | Workload identity no interactiva | `ABSENT` | Reduce secret estático si existe plataforma | Metadata de workload | Auth de servicios | Infra/IdP workload | Alta | Candidato | Issuance/use/revoke | Dirección TI | Integración real y threat model |
| N3 | Igual | Client credentials/service account | `ABSENT` | Secreto/rotación/least privilege | Identidad técnica | Adapter/jobs | Secret manager/IdP | Alta | Candidato | Credential lifecycle sin secreto | Dirección TI | Contrato y rotation tests |
| O1 | ¿Qué evidencia de acceso se conserva? | Eventos mínimos locales append-only | `PARTIAL`: `AuditEvent`/caregiver audit | Buena trazabilidad; evitar overlogging | IDs contextualizables | Extender allowlist si se aprueba | Store existente | Indirecta | Puede ser ninguno | Versionado/mapping/revocation | Dirección TI | Event matrix y consulta a la autoridad de retención aplicable |
| O2 | Igual | Evidencia en sistema institucional externo + referencia mínima | `ABSENT` | Integridad y entrega cross-system | Minimización/retención | Integración | Sistema externo | Media | Posible referencia | Delivery/reference | Dirección TI | Source of truth y contract tests |
| O3 | Igual | `CUSTOM_OPTION` por población/capacidad | `PARTIAL` | Evitar huecos o duplicación | Data minimization | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección TI | Matriz de evidencia |
| P1 | ¿Qué ocurre si identidad no está disponible? | Fail closed para nuevo acceso; contingencia separada | `PARTIAL`: demo falla cerrado | Reduce bypass; impacto disponibilidad | Sin fallback de datos | Error/UX/runbook futuro | IdP dependency | Directa | Ninguno posible | Failure evidence | Dirección TI | Política, pruebas y dependencia consultiva DEC-015 |
| P2 | Igual | Read-only limitado bajo contrato aprobado | `ABSENT` | Riesgo de autorización stale | Cache/datos expuestos | Arquitectura nueva | Alta | Alta | Candidato | Entrada/uso/salida | Dirección TI | Scope, freshness, rollback y consultas DEC-015/privacidad |
| P3 | Igual | Fallback institucional separado | `ABSENT` | Alto; no puede usar demo credentials | Depende del contenido | Integración/contingencia | Infraestructura adicional | Posible | Por evaluar | Uso y revisión | Dirección TI | Plan probado y decisión dependiente DEC-015 |

## Reglas de selección

Cada selección debe registrar rationale, approver role, approval evidence
reference, policy/design version, approved scope, effective/review dates,
dependencies, excluded/deferred scope y unresolved blockers.

Las opciones deben ser coherentes entre poblaciones. Nada excluido o diferido
queda habilitado.

La selección se registra separadamente para `WORKFORCE_AUTHENTICATION`,
`PATIENT_AUTHENTICATION`, `CAREGIVER_AUTHENTICATION`,
`ADMIN_SUPPORT_ACCESS`, `PRIVILEGED_ACCESS`, `BREAK_GLASS` y
`SERVICE_IDENTITY`. Un scope aprobado no habilita los otros.

Toda selección de role mapping conserva:

```text
IdP identity
→ role mapping
→ application technical role
→ resource relationship/responsibility
→ policy/scope
→ authorization
```

Para `admin` y `support`, el resource layer deniega acceso clínico por defecto.
Los roles runtime continúan siendo exactamente `admin`, `nurse`, `clinician`,
`patient`, `caregiver` y `support`; la función institucional de seguridad/IAM
no añade un rol.

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ IAM + application security design review
→ READY_FOR_IMPLEMENTATION
```
