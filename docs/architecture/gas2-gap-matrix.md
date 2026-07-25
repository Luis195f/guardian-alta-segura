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
| A | Episode Contract / episode governance | `PARTIAL` | `EXTEND` | `DischargeEpisode`, `EpisodeTransition`, versión optimista, responsables, protocolo fijo, política de activación y `EpisodeClosurePolicy` | Falta una vista/política compuesta de obligaciones del episodio. El cierre sigue conectado al adaptador fail-closed; DEC-002 impide codificar reglas definitivas. No crear `EpisodeContract` como tabla paralela. |
| B | Signal Provenance | `PARTIAL` | `EXTEND` | `RuleEvaluation` con snapshot/hash, `Alert.inputReferences`, protocolo/pregunta de check-in, procedencia de Plan y Domicilio Seguro, sesión de cuidador | No hay envelope canónico, identidad de fuente, esquema de versión ni normalización entre productores. Las referencias llegan manualmente. |
| C | Human Authorization Gate | `PARTIAL` | `REFACTOR` | `AlertReview`, transiciones append-only, guard de tarea en aplicación y SQL, actores humanos en casos de uso | El gate no es una política transversal. `actioned` no exige referencia de acción y las tareas sin aviso no comparten una decisión estructurada. Mantener siempre actor humano. |
| D | Accountability / responsibility chain | `PARTIAL` | `EXTEND` | Responsables del episodio, `reviewOwner`, creador/asignado/resolutor de tarea y actores de eventos | Faltan aceptación, equipo/turno, suplencia, escalado, transferencia y evidencia de quién debe actuar ahora. No se justifica un graph database. |
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
- reglas deterministas versionadas y procedencia reproducible;
- revisión humana append-only antes de tareas vinculadas;
- tareas humanas concurrentes y auditadas;
- consentimiento/autorización de cuidador fail-closed;
- RBAC deny-by-default para el demo;
- auditoría técnica minimizada;
- versionado contextual de políticas, reglas, protocolos y documentos.

### Debe evolucionar

- gobernanza compuesta del episodio usando los agregados actuales;
- procedencia canónica como contrato y value objects, no como duplicado inmediato;
- política reutilizable de autorización humana;
- responsabilidad y SLA sobre `Task`/`TaskEvent`;
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
