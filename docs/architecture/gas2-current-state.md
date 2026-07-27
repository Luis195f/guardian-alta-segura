# Guardián Alta Segura 2.0 — estado actual verificado

## Alcance de la auditoría

Auditoría diferencial iniciada el 25 de julio de 2026 sobre la rama
`audit/gas2-architecture-delta`, en el commit base `88be7da`, y actualizada tras
implementar `refactor/gas2-episode-governance-policy` y
`feat/gas2-signal-provenance-boundary`, y tras formalizar
`refactor/gas2-human-authorization-policy`. Las conclusiones se basan en el
código, esquema, migraciones, pruebas, CI y documentación presentes en el
repositorio. No acreditan validación clínica, jurídica, institucional, RGPD o
MDR.

El refactor añade una proyección y política de gobernanza sin modificar Prisma,
añadir dependencias ni crear arquitectura paralela. Solo cambia la consulta
organizativa y el mecanismo fail-closed del cierre; no habilita ninguna mutación
de cierre ni actuación clínica automática.

El boundary de procedencia añade contratos/mappers v1 y una lectura compatible
de `Alert.inputReferences`, también sin cambiar Prisma o dependencias. No añade
otra fuente clínica, conectores, FHIR ni acciones automáticas.

La autorización humana añade una policy pura sobre `AlertReview`, actor actual y
responsabilidad del episodio. No persiste otra decisión, no ejecuta tareas y no
modifica Prisma, migraciones o dependencias.

`TECHNICAL TASK ACCOUNTABILITY = implemented`: una proyección pura sobre
`Task`/`TaskEvent` reconstruye la historia y la autorización mutante toma locks
en orden episodio, conjunto de `User` participantes ordenado globalmente por ID,
roles y mutación. No añade tabla, migración o dependencia.

`INSTITUTIONAL RESPONSIBILITY / ACCOUNTABILITY POLICY = not validated,
conditioned on DEC-017`: no existe acceptance, SLA ni política institucional de
asignación.

`GOVERNANCE EVIDENCE VIEW = implemented`: `EpisodeGovernanceEvidenceView`
compone por referencia el episodio/timeline, `EpisodeGovernanceView`, provenance
V1, revisiones humanas, `TaskAccountabilityProjection` y `AuditEvent`. Es
read-only, minimizada, limitada explícitamente y no persistida. Distingue
integridad técnica de seguridad clínica; la decisión histórica por instancia de
autorización humana y el rol histórico del reviewer se declaran no disponibles.

## Stack real

| Área | Implementación verificada |
|---|---|
| Runtime web | Next.js 16.2.10 App Router, React 19.2.7 |
| Lenguaje | TypeScript 5.9.3 estricto, con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` |
| Persistencia | PostgreSQL, Prisma 6.19.0, 11 migraciones aplicadas |
| Pruebas | Vitest unitario e integración; Playwright E2E |
| Calidad | Prettier, ESLint, TypeScript, build Next.js y trazabilidad REQ-01 a REQ-14 |
| CI | GitHub Actions con PostgreSQL 16, instalación congelada, migraciones, seed sintético, calidad, pruebas, build y E2E |
| Identidad | Proveedor demo local detrás de `DemoIdentityProvider`; contrato institucional sin implementación |
| Operación | Demo loopback, cookies HttpOnly, CSRF por origen, correlation ID, errores y logs sanitizados |

No existe un directorio `app/` raíz; el App Router está en `src/app`. Tampoco
existen backend separado, microservicios, FHIR, conectores productivos, mensajería
real, scheduler, IA generativa o ML.

## Arquitectura actual

El repositorio ya aplica una arquitectura por capas dentro de un monolito modular:

```mermaid
flowchart LR
  UI["src/presentation<br/>componentes y navegación"]
  HTTP["src/app<br/>rutas y adaptadores HTTP"]
  APP["src/application<br/>casos de uso y ports"]
  DOMAIN["src/domain<br/>reglas y tipos"]
  INFRA["src/infrastructure<br/>Prisma, sesión, HTTP y adaptadores"]
  DB[("PostgreSQL")]

  UI --> HTTP
  HTTP --> APP
  APP --> DOMAIN
  INFRA -. implementa ports .-> APP
  INFRA --> DB
```

Las reglas de autorización, transición y validación relevantes residen en dominio
o aplicación. Las rutas vuelven a validar sesión, rol activo y pertenencia al
episodio. Los unit of work Prisma agrupan mutación, historia y auditoría.

## Contextos y responsabilidades existentes

| Contexto | Código principal | Responsabilidad real |
|---|---|---|
| Identidad y RBAC | `src/domain/auth`, `src/application/auth`, `src/application/admin`, `src/infrastructure/auth` | Sesión demo, roles, denegación por defecto y asignación auditada |
| Autorización legal | `src/domain/legal`, `src/application/legal` | Políticas versionadas, registros específicos, decisión fail-closed y revocación append-only |
| Episodio | `src/domain/episode`, `src/application/episode` | Alta sintética, responsables, estado, versión, timeline e idempotencia |
| Plan de Seguridad | `src/domain/safety-plan`, `src/application/safety-plan` | Documento por episodio, versiones N+1, estados y visibilidad por audiencia |
| Check-in | `src/domain/check-in`, `src/application/check-in` | Protocolo versionado, asignaciones, respuestas y no respuesta terminal |
| Avisos explicables | `src/domain/alerts`, `src/application/alerts` | DSL determinista, aprobación/activación, evaluación reproducible, procedencia y revisión humana |
| Cola y tareas | `src/domain/workqueue`, `src/application/workqueue` | Proyección profesional, tarea manual y eventos humanos concurrentes |
| Cuidador | `src/domain/caregiver`, `src/application/caregiver` | Invitación local, scope por episodio, sesión independiente, revocación y observación |
| Domicilio Seguro | `src/domain/home-safety`, `src/application/home-safety` | Registro informativo versionado con procedencia y marca de revisión humana |
| SBAR | `src/application/sbar`, `src/infrastructure/persistence/prisma-sbar-preview.ts` | Preview determinista, minimizado y no firmado |
| Auditoría | `src/domain/audit` y escrituras desde los unit of work | `AuditEvent` técnico minimizado, además de historias de dominio y auditoría específica de cuidador |
| Evidencia de gobernanza | `src/domain/governance`, `src/application/governance`, reader Prisma y panel del episodio | Proyección read-only autorizada sobre fuentes existentes, con integridad y cobertura explícitas |

Los nombres anteriores son contextos funcionales observados, no bounded contexts
formalmente aislados por paquetes o despliegues. Comparten una base de datos y un
runtime.

## Modelo y agregados relevantes

### Episodio y continuidad

`DischargeEpisode` ya actúa como raíz de continuidad. Conserva paciente
seudonimizado, fecha, duración explícita, responsables de enfermería y clínico,
estado, versión y versión exacta del protocolo de check-in. Se relaciona con
transiciones, Plan de Seguridad, check-ins, evaluaciones, avisos, tareas, accesos
de cuidador y Domicilio Seguro.

La máquina de estados es:

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> ACTIVE
  ACTIVE --> PAUSED
  PAUSED --> ACTIVE
  ACTIVE --> CLOSED
  PAUSED --> CLOSED
```

Las transiciones usan actualización condicional por `expectedVersion`, huella de
petición, idempotencia por actor, `EpisodeTransition` append-only y `AuditEvent` en
la misma transacción. La activación exige verificación humana de identidad bajo
una política versionada.

La gobernanza organizativa se calcula mediante `EpisodeGovernancePolicy` y
`EpisodeGovernanceView` sobre el episodio actual, responsables activos, referencia
exacta del protocolo de check-in, evidencia técnica de identidad, avisos no
terminales y tareas abiertas. No existe tabla ni agregado paralelo. La ruta de
detalle expone la proyección minimizada y la transición de cierre la evalúa dentro
del `EpisodeUnitOfWork`.

`PendingInstitutionalEpisodeGovernancePolicy` diferencia blockers técnicos u
operativos de `LOCAL_POLICY_PENDING`. DEC-002 permanece pendiente y el caso de uso
no contiene un camino de mutación de cierre: política ausente, excepción, vista
inconsistente o decisión local pendiente producen `NOT_AUTHORIZED`. Los avisos y
tareas son obligaciones visibles, no criterios clínicos definitivos.

### Señales, avisos y procedencia

No hay ni se necesita un `SignalRecord` canónico. Existe un boundary de
procedencia interno `CanonicalProvenanceLineageV1`, compuesto únicamente por
value objects, validación y mappers sobre estas fuentes de verdad:

- `CheckInAssignment`, `CheckInOutcome`, `CheckInResponse` y `CheckInAnswer`
  conservan protocolo, pregunta y tiempo;
- `RuleEvaluation` conserva versión, instante, snapshot estructurado, hash,
  resultado e inputs ausentes;
- `Alert` conserva evaluación, regla/versión, referencias estructuradas de origen,
  explicación, responsable de revisión y tiempo. Los avisos nuevos guardan un
  lineage v1 minimizado dentro del array JSON existente;
- Plan de Seguridad y Domicilio Seguro incluyen procedencia por sección o ítem;
- `CaregiverObservation` conserva autoría indirecta por autorización, perfil y
  sesión, pero no crea avisos o tareas.

El contrato distingue `SOURCE` de `DERIVED` y reconstruye una o varias fuentes →
`RuleEvaluation` → `Alert` sin copiar valores, respuestas, explicaciones ni
documentos. Los lectores marcan arrays históricos como `LEGACY_UNVERSIONED` y
versiones o formas desconocidas como `INVALID`. Las referencias de una evaluación
siguen entregándose explícitamente en la petición. Para las fuentes internas
soportadas, Prisma resuelve la referencia y la pertenencia real al episodio; el
`ruleInputContext` conserva aparte `inputKey`, `sourceField` y `observedAt` como
datos declarados por la evaluación y explícitamente no verificados contra el
contenido fuente. No hay extracción automática, conectores externos ni contrato
FHIR.

El lineage canónico se persiste dentro de `Alert.inputReferences` cuando una
evaluación `matched` crea un aviso. No existe persistencia canónica separada para
evaluaciones `not-matched` o `abstained`: `RuleEvaluation`, con su snapshot, hash,
regla/versión y outcome actuales, continúa siendo su fuente de verdad.

### Tareas y responsabilidad

`Task` pertenece a un episodio y puede enlazar un `Alert` del mismo episodio.
`TaskEvent` registra creación, asignación, reasignación, intento de contacto, nota
y resolución. La responsabilidad actual se expresa mediante:

- `responsibleNurseId` y `responsibleClinicianId` en el episodio;
- `reviewOwner` en la versión de regla y el aviso;
- `assignedToId`, `createdById` y `resolvedById` en la tarea;
- actor, rol y tiempo en transiciones, revisiones y eventos.

`TaskAccountabilityProjection` reconstruye la cadena técnica de asignación desde
`CREATED`, `ASSIGNED` y `REASSIGNED`; conserva actor/rol/tiempo, valida revisión,
estado, igualdad entre `Task.createdAt` y el `CREATED.occurredAt`, extremos y
proyección final, y separa creator, assignee, actor, resolver y responsables del
episodio. `CONTACT_ATTEMPT`, `NOTE_RECORDED` y `RESOLVED` no transfieren
assignment. Una tarea sin assignee es `UNASSIGNED`, no un error.

No existe acceptance, suplencia, equipo, guardia, escalado, SLA ni una regla
institucional sobre quién debería actuar. Assignment describe el holder técnico
actual y no concede autoridad exclusiva para mutar.

### Consentimiento y cuidador

El modelo ya separa `PolicyVersion`, registros de participación, permiso de
comunicación, autorización de cuidador, base de tratamiento y
`RevocationEvent`. `LegalAuthorizationService` falla de forma cerrada ante
registro ausente, pendiente, vencido, revocado o política no aprobada.

`CaregiverAuthorizationScope` añade versiones append-only por autorización y
episodio. Cada petición del portal revalida identidad, política, vigencia, última
versión del scope y revocación. La revocación serializa contra accesos, invalida
sesiones y conserva historia.

La implementación sigue limitada al demo sintético y no resuelve las decisiones
institucionales DEC-003, DEC-004, DEC-005 y DEC-013.

## Superficies HTTP existentes

El build expone rutas para:

- sesión demo y asignación administrativa de roles;
- episodios, detalle con gobernanza organizativa y transición;
- Plan de Seguridad, Domicilio Seguro y preview SBAR;
- protocolos, asignaciones, respuesta, omisión y vencimiento de check-ins;
- catálogo/versiones de reglas, aprobación, activación, evaluación, avisos y
  revisiones;
- cola de enfermería, creación de tareas y eventos de tarea;
- registros legales, acceso de cuidador, invitación, portal y observaciones;
- healthcheck técnico y recursos demo protegidos.

Son APIs internas del monolito y del demo. No constituyen una API de conectores ni
un contrato institucional.

## Human-in-the-loop verificado

El camino implementado es:

```mermaid
sequenceDiagram
  participant P as Profesional
  participant R as Evaluación determinista
  participant A as Alert
  participant H as AlertReview humano
  participant G as HumanAuthorizationPolicy
  participant T as Task/TaskEvent

  P->>R: POST explícito con regla, inputs y procedencia
  R->>A: crea Alert open solo si matched
  P->>H: revisión humana explícita
  H->>A: transición append-only
  P->>G: solicita CREATE_TASK_FROM_REVIEWED_ALERT
  G-->>P: AUTHORIZED o NOT_AUTHORIZED + evidencia/códigos
  P->>T: POST explícito para crear tarea
  P->>T: asignar/contactar/anotar/resolver
```

No se encontró un camino `signal → clinical action` sin autorización humana
explícita. En concreto:

- evaluar una regla no crea tareas, comunicaciones, derivaciones, cierres, SBAR o
  firmas;
- revisar un aviso no crea una tarea;
- crear una tarea vinculada exige que el aviso no esté `open`, tenga una revisión
  humana real, que el guard independiente autorice rol activo y responsabilidad
  actual y que después la policy autorice la acción derivada;
- la restricción anterior existe en aplicación y en un trigger PostgreSQL;
- resolver una tarea no resuelve el aviso ni cierra el episodio;
- una observación de cuidador no crea aviso o tarea.

La garantía está formalizada para la única acción downstream real de este
alcance: `CREATE_TASK_FROM_REVIEWED_ALERT`. La decisión es pura, minimizada y no
persistida. `AlertReview` conserva la review y `Task`/`TaskEvent` la acción.
Reviewer y acting actor pueden diferir; el rol histórico del reviewer no está
ligado de forma inequívoca a la review y no se infiere. `actioned` sigue siendo un
estado administrativo sin referencia estructurada a una acción y no acredita por
sí solo una tarea. Una tarea sin aviso permanece como iniciación humana directa,
no como acción derivada de señal. La evidencia de autorización conserva solo
identificadores técnicos minimizados, timestamps y referencias de versión; no
copia payload clínico ni texto libre y el demo usa identidades sintéticas.

Los estados elegibles `reviewed`, `actioned`, `resolved` y
`dismissed-with-reason` preservan el comportamiento técnico actual del demo. No
son una política institucional aprobada para crear tareas; DEC-017 sigue
pendiente.

El demo expone asignación administrativa de roles, pero no un endpoint de
revocación de `RoleAssignment`. La carrera de seguridad se verifica contra la
actualización PostgreSQL real de `revokedAt`; cualquier workflow futuro deberá
mutar esa misma fila para conservar el orden.

## Concurrencia de la cola de enfermería

| Protección | Implementación verificada |
|---|---|
| Revision control | `Task.revision`, `expectedRevision` y actualización condicional |
| Locking de tarea | No hay lock pesimista de tarea; se usa control optimista con unicidad y transacción |
| Acting actor vs revocación | La mutación bloquea las filas `User` y `RoleAssignment` activa del actor; la revocación concurrente se serializa contra ese lock |
| Identidades y revocación | Las mutaciones bloquean episodio, `User` participantes únicos en orden global y después `RoleAssignment`; si revocación gana primero se deniega, y si la mutación gana primero la revocación espera |
| Idempotencia | Clave única por actor + fingerprint para creación y cada evento |
| Conflicto de asignación | Un evento por `taskId/resultingRevision`; una carrera tiene un ganador |
| Conflicto de resolución | Tarea resuelta es terminal; revisión obsoleta devuelve conflicto |
| Orden | `resultingRevision` define el orden causal por tarea; `occurredAt` aporta tiempo |
| Integridad | Triggers impiden borrar tareas/eventos, mutar origen o cambiar proyección sin evento coincidente |
| Vínculo a aviso | Clave compuesta episodio/aviso y trigger que exige revisión humana previa |

Las pruebas de integración cubren ambos órdenes de create-assigned/assign/reassign
contra revocación del target, ambos órdenes de revocación del acting actor, el
cruce actor/target A→B y B→A dentro del mismo episodio y entre episodios,
self-assignment y paralelismo entre participantes disjuntos. También cubren
carreras de asignación contra resolución, nota contra resolución, reasignación
contra resolución, creación concurrente idempotente, rol revocado e inserciones
SQL con semántica falsa. Después de una revocación válida posterior, la
proyección conserva el evento y marca
`CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED` sin convertirlo en inconsistencia
estructural. Las E2E cubren doble resolución, creación HTTP concurrente y el
contrato minimizado de accountability.

La prueba de integración del episodio cubre además dos transiciones concurrentes
con la misma `expectedVersion`: una sola actualiza episodio, timeline y auditoría.
No se simula una carrera de cierres porque DEC-002 impide legítimamente alcanzar
la mutación.

El orden global de `User` participantes cubre exclusivamente las mutaciones de la
workqueue, incluso entre episodios. No se extiende automáticamente a otros
módulos; tampoco existe cursor de eventos, inbox/outbox ni garantía de entrega a
sistemas externos.

## Auditoría y observabilidad

`AuditEvent` conserva actor, rol, acción, recurso, resultado, correlation ID y
tiempo, sin copiar contenido clínico. Es append-only por trigger. Los historiales
de episodio, Plan de Seguridad, check-in, aviso y tarea aportan evidencia de
dominio. `CaregiverAccessAudit` registra accesos y denegaciones específicas.

La vista de evidencia referencia únicamente `AuditEvent` cuyo recurso es el
episodio consultado o una evaluación, aviso o tarea seleccionados de ese mismo
episodio. No crea eventos de lectura. `EpisodeTransition`, `Alert`,
`AlertReview`, `Task`, `TaskEvent` y `AuditEvent` se consultan con límite público
de 100 referencias por colección más detección de truncamiento. Un truncamiento
produce `PARTIAL`, nunca completitud silenciosa, pero no oculta contradicciones
ya observadas en el prefijo. Evidencia, elegibilidad y hechos de gobernanza
proceden de una única transacción PostgreSQL `REPEATABLE READ`. El lineage
canónico se contrasta con `RuleEvaluation` y `Alert`; el hash se mantiene interno
y la fila fuente no se revalida durante esta lectura.

La observabilidad operativa es parcial:

- existe `GET /api/health`;
- los errores y logs técnicos contienen código, componente y correlation ID;
- la cola publica recuentos agregados y antigüedad técnica;
- no existen métricas exportables, trazas distribuidas, SLO, alertas operativas,
  detección de proceso omitido ni un flujo de incidentes.

## Interoperabilidad y conectores

No existe FHIR, HL7, HCE/EHR, LAGUN, Tucuvi, Huma, MeMind, wearable, RPM o
mensajería real. Tampoco hay registro de conectores, outbox o contratos canónicos
de entrada.

Existen seams reutilizables:

- `DemoIdentityProvider` y `InstitutionalIdentityProvider`;
- el adaptador local de invitación de cuidador, que no envía mensajes;
- ports de aplicación y unit of work;
- `SafetyPlanExporter`, que es un contrato no conectado y no una capacidad PDF.

Estos seams demuestran el patrón ports/adapters, pero no deben presentarse como
integraciones implementadas.

## Baseline técnico

| Comprobación | Resultado |
|---|---|
| `pnpm format:check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:unit` | PASS — 30 archivos, 290 pruebas |
| `pnpm test:integration` | PASS — 10 archivos, 69 pruebas |
| `pnpm test:e2e` | PASS — 44 pruebas |
| `pnpm build` | PASS — 18 páginas generadas y rutas dinámicas compiladas |
| `pnpm traceability:check` | PASS — REQ-01 a REQ-14 |
| `pnpm db:migrate:status` | PASS — 11 migraciones; esquema actualizado |

Los mensajes `FORBIDDEN`, `UNAUTHENTICATED`, `CONFLICT` y `NOT_FOUND` observados
en la salida E2E corresponden a casos negativos esperados; la suite terminó sin
fallos.

## Conclusión

Guardián Alta Segura ya contiene un núcleo modular y trazable para continuidad
postalta sintética. GAS 2.0 debe ser una evolución de ese núcleo, no un nuevo
árbol de código ni un segundo modelo de datos. Las fronteras fundacionales de
gobernanza de episodio, procedencia, autorización humana y accountability técnica
ya están compuestas sobre los módulos actuales. La responsabilidad institucional,
SLA/escalado y cualquier process safety dependiente de reglas operativas
permanecen no validados y condicionados a DEC-017.
