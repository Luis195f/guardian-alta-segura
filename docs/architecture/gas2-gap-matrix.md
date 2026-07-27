# Guardián Alta Segura 2.0 — matriz diferencial

## Criterio

Estados permitidos:

- `EXISTS`: responsabilidad implementada y verificable en el alcance técnico
  actual;
- `PARTIAL`: existe una base reutilizable, pero falta parte del contrato objetivo;
- `MISSING`: no existe una implementación equivalente;
- `DUPLICATE-RISK`: el concepto propuesto solaparía una fuente de verdad actual;
- `NOT-RECOMMENDED`: construirlo contradice el alcance o no tiene necesidad
  demostrada.

Acciones permitidas: `REUSE`, `EXTEND`, `REFACTOR`, `BUILD` y `DO-NOT-BUILD`.
`BUILD` no autoriza automáticamente una tabla, una integración ni una decisión
clínica; exige primero contrato, autoridad y evidencia.

## Matriz A–M

| ID | Concepto GAS 2.0 | Estado | Acción | Evidencia actual reutilizable | Brecha y límite |
|---|---|---|---|---|---|
| A | Episode Contract / episode governance | `EXISTS` | `REUSE` | `DischargeEpisode`, `EpisodeTransition`, versión optimista, responsables, protocolo fijo y `EpisodeGovernancePolicy/View` sobre avisos y tareas actuales | La proyección técnica está implementada sin tabla paralela. DEC-002 pendiente mantiene el cierre `NOT_AUTHORIZED`; avisos y tareas son obligaciones organizativas, no reglas clínicas definitivas. Una futura apertura exige decisión local y diseño de consistencia concurrente explícito. |
| B | Signal Provenance | `EXISTS` | `REUSE` | `CanonicalProvenanceLineageV1`, mappers de fuentes internas, `RuleEvaluation` con snapshot/hash y `Alert.inputReferences` compatible | Boundary v1 tipado y fail-closed. Las fuentes internas soportadas se resuelven contra PostgreSQL y se verifica referencia, tipo y pertenencia al episodio; el contexto de observación declarado por la regla queda diferenciado y no implica verificación semántica del valor. Autenticidad, contratos y semántica de fuentes externas siguen aplazados. |
| C | Human Authorization Gate | `EXISTS` | `REUSE` | `DefaultHumanAuthorizationPolicy`, `AlertReview`, guard transaccional de `CreateNursingTaskService` y trigger `tasks_require_reviewed_alert` | La única acción soportada es `CREATE_TASK_FROM_REVIEWED_ALERT`; decisión pura, minimizada y fail-closed. `actioned` sigue sin acreditar una acción y las tareas sin aviso permanecen como iniciación humana directa, no signal-derived. El rol histórico del reviewer no está ligado de forma fiable a la review. |
| D | Accountability / responsibility chain | `PARTIAL` | `EXTEND` | `TECHNICAL TASK ACCOUNTABILITY = implemented`: `TaskAccountabilityProjection` sobre `Task`, `TaskEvent`, responsables del episodio y rol técnico actual | Reconstruye creator, assignee, actor, resolver, assignment/reassignment y elegibilidad actual; falla ante inconsistencias y no copia payload clínico. `INSTITUTIONAL RESPONSIBILITY / ACCOUNTABILITY POLICY = not validated, conditioned on DEC-017`: assignment no equivale a acceptance o autoridad exclusiva y faltan equipo/turno, suplencia, autoassignment y política institucional. |
| E | Task lifecycle + SLA + escalation | `PARTIAL` | `EXTEND` | `Task`, `TaskEvent`, estado open/resolved, revisión, idempotencia, asignación, contacto, nota y resolución | Faltan prioridad operativa aprobada, `dueAt`, SLA versionado, acuse, escalado y vencimiento. DEC-017 es bloqueante. |
| F | Process Safety / missed-process detection | `MISSING` | `BUILD` | Ventanas y outcomes de check-in, tiempos de revisión, tareas abiertas y antigüedad agregada | No hay evaluación explícita de procesos omitidos, scheduler ni anomalía. Empezar como proyección/regla determinista sobre eventos existentes; no crear scoring clínico. |
| G | Connector boundary | `PARTIAL` | `EXTEND` | Patrón ports/adapters, proveedores de identidad y adaptador local de invitación | No existe contrato de ingestión, identidad de conector, idempotencia de mensaje, cuarentena, inbox/outbox o estado operativo. No asumir APIs de proveedores. |
| H | FHIR anti-corruption layer | `MISSING` | `BUILD` condicionado | Separación dominio/aplicación/adapters y modelo interno no FHIR | Solo construir DTOs/mappers/validación cuando exista requisito y perfil institucional. No exponer modelos FHIR al dominio ni construir un servidor FHIR completo. |
| I | Consent/caregiver authorization | `EXISTS` | `EXTEND` | Políticas, registros legales, revocación append-only, scope versionado por episodio, revalidación y auditoría de acceso | La mecánica existe para demo; faltan textos, representación, bases, retención e IdP aprobados. Extender por finalidad/conector solo tras DEC-003/004/005/013. |
| J | RBAC / authorization | `PARTIAL` | `EXTEND` | Roles, principal, matriz deny-by-default, sesión en servidor, rol activo y pertenencia al episodio | Es sólida en demo, pero no hay IdP productivo, mapeo institucional, MFA ni acceso de emergencia. No ampliar roles como sustituto de políticas de recurso. |
| K | Audit / evidence | `EXISTS` | `EXTEND` | `AuditEvent` append-only y minimizado; historias de dominio; `CaregiverAccessAudit`; correlation ID | Falta una consulta/evidence view gobernada, retención aprobada y exportación operativa. No duplicar en `AuditLog`. |
| L | Protocol/rule versioning | `EXISTS` | `REUSE` | Versiones de identidad, políticas legales, check-in, reglas/aprobaciones, Plan de Seguridad y Domicilio Seguro | Reutilizar patrones por contexto. No crear una tabla universal de protocolos que diluya autoridades e invariantes. |
| M | Operational observability | `PARTIAL` | `EXTEND` | Healthcheck, logs sanitizados, correlation ID y métricas agregadas de cola | Faltan métricas, SLO, tracing, alertado, runbooks e incidentes sin PHI. DEC-014/015/016 condicionan operación productiva. |

## Lectura ejecutiva

### Ya existe

- episodio versionado con responsables y timeline;
- gobernanza compuesta minimizada con blockers técnicos/locales y cierre fail-closed;
- procedencia canónica como contrato/value objects y lineage sobre fuentes
  actuales, sin duplicado persistente;
- reglas deterministas versionadas y procedencia reproducible;
- revisión humana append-only antes de tareas vinculadas;
- tareas humanas concurrentes y auditadas;
- consentimiento/autorización de cuidador fail-closed;
- RBAC deny-by-default para el demo;
- auditoría técnica minimizada;
- versionado contextual de políticas, reglas, protocolos y documentos.

### Debe evolucionar

- SLA, prioridad y política institucional de asignación sobre `Task`/`TaskEvent`,
  solo tras DEC-017;
- observabilidad a partir de correlation ID y eventos existentes;
- ports/adapters para futuras integraciones.

### Falta

- detección de procesos omitidos;
- frontera canónica de conectores;
- anti-corruption layer FHIR;
- SLA y escalado aprobados;
- observabilidad productiva e incidentes;
- identidad e integración institucional.

### No debe construirse

- `src/guardian2` o un segundo dominio;
- tablas paralelas para responsabilidades ya presentes;
- una HCE, wearable, RPM genérico o motor de voz propios;
- chatbot terapéutico, predictor opaco o scoring clínico;
- graph database sin consultas y escala demostradas;
- servidor FHIR completo sin requisito institucional.

## Dependencias institucionales

| Brecha | Decisión o evidencia bloqueante |
|---|---|
| Cierre y duración del episodio | DEC-002 |
| Autorización, comunicaciones y cuidador real | DEC-003, DEC-004, DEC-005 |
| Cadencia y no respuesta de check-in | DEC-006 |
| Reglas y responsables de avisos | DEC-008, DEC-009 |
| Crisis | DEC-010, DEC-011 |
| Exportación SBAR | DEC-012 |
| Identidad y roles institucionales | DEC-013 |
| Incidentes y observabilidad operativa | DEC-014 |
| Contingencia | DEC-015 |
| Piloto y datos reales | DEC-016 |
| Prioridad, SLA y escalado | DEC-017 |

Mientras estas decisiones estén pendientes, la arquitectura debe conservar valores
fail-closed, configuración sintética y ausencia de automatización clínica.
