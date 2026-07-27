# ADR-0012 — Autorización humana como policy sobre evidencia de revisión existente

- Estado: Aceptada para el MVP técnico sintético
- Fecha: 2026-07-26
- Alcance: creación explícita de tareas derivadas de avisos revisados
- Validación clínica/institucional: no acreditada

## Contexto

`AlertReview` ya conserva la historia humana append-only del aviso. `Task` y
`TaskEvent` conservan la acción downstream y su lifecycle. La creación de una
tarea vinculada ya comprobaba en aplicación y PostgreSQL que el aviso pertenecía
al episodio, no estuviera `open` y tuviera al menos una revisión. También
revalidaba el rol activo y la responsabilidad actual del actor.

Esos controles estaban dispersos y no producían una decisión tipada capaz de
explicar qué acción se autorizaba, qué objeto y revisión constituían evidencia o
por qué se denegaba. Crear otra tabla de aprobación habría duplicado las fuentes
de verdad existentes.

## Decisión

Se añade `DefaultHumanAuthorizationPolicy` como evaluación pura, minimizada y
fail-closed. La única acción soportada es
`CREATE_TASK_FROM_REVIEWED_ALERT`.

Antes de invocar la policy, `CreateNursingTaskService` ejecuta siempre el guard
independiente de recurso que verifica episodio existente y sintético,
responsabilidad del actor y rol profesional actualmente activo. Esto se aplica
tanto a tareas manuales como derivadas y una policy inyectada no puede ampliar
esos privilegios.

Después, para una tarea derivada, la policy recibe una proyección reconstruida
dentro del mismo unit of work de creación:

- principal autenticado y rol profesional actualmente activo;
- episodio y responsables actuales;
- `Alert`, estado y referencia de `RuleVersion`;
- un `AlertReview` real del mismo aviso;
- instante de evaluación.

Devuelve exclusivamente `AUTHORIZED` o `NOT_AUTHORIZED`, acción, episodio, actor,
instante, evidencia técnica y reason codes estables. La evidencia contiene IDs,
versión de regla y timestamps. No copia payload clínico ni texto libre. Conserva
identificadores técnicos minimizados del reviewer y del acting actor porque son
necesarios para trazabilidad; todas las identidades del demo actual son
sintéticas.

Una review con `reviewedAt` posterior a `evaluatedAt` es evidencia temporalmente
incoherente y produce `INVALID_REVIEW_EVIDENCE`.

`Alert` no tiene versión propia y no se inventa `alertVersion`. La referencia de
versión corresponde exclusivamente a `RuleVersion`.

`AlertReview` no conserva `actorRole` ni `correlationId`. Aunque `AuditEvent`
registra rol, acción y aviso, no existe una relación estructurada inequívoca entre
una fila concreta de review y su evento de auditoría. Por ello la evidencia
declara `HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED` y no reconstruye el rol histórico
desde el rol actual.

Reviewer y acting actor son identidades distintas. Una revocación posterior del
reviewer no borra ni invalida retrospectivamente la revisión; el actor que solicita
la nueva tarea sí debe conservar rol activo y responsabilidad actuales.

La comprobación del acting actor bloquea con `SELECT ... FOR UPDATE` la fila de
`User` y la fila activa de `RoleAssignment` durante la transacción de workqueue.
Una revocación concurrente de esa asignación espera a que la creación termine o,
si obtiene primero el lock, la comprobación observa `revokedAt` y deniega. No se
afirma serialización por el mero hecho de compartir un unit of work: la garantía
procede de esas filas bloqueadas.

El MVP actual expone asignación administrativa de roles, pero no un servicio o
endpoint de revocación de `RoleAssignment`. La prueba de carrera usa la mutación
PostgreSQL real de `revokedAt`; un workflow futuro de revocación deberá actualizar
esa misma fila para conservar esta serialización.

La policy no crea tareas, revisa avisos, modifica estados, audita consultas ni
ejecuta otra acción. `CreateNursingTaskService` continúa siendo la mutación
explícita y conserva `Task`, `TaskEvent`, `AuditEvent`, idempotencia y concurrencia.
El trigger `tasks_require_reviewed_alert` permanece como defensa en profundidad.

## Semántica de `actioned`

`actioned` es una transición administrativa histórica de `AlertReview`. No
contiene una referencia estructurada a `Task` u otra actuación y no demuestra por
sí sola que una acción ocurrió. La evidencia de una tarea está en `Task` y
`TaskEvent`. La policy puede aceptar un aviso no abierto conforme a las reglas
existentes, pero nunca presenta el estado como prueba de una acción.

El conjunto elegible `reviewed`, `actioned`, `resolved` y
`dismissed-with-reason` conserva exclusivamente la semántica técnica actual del
demo. No constituye una política institucional aprobada sobre cuándo crear una
tarea; DEC-017 continúa pendiente.

## Consecuencias

- Authentication, RBAC, human review, human authorization y action permanecen
  responsabilidades separadas.
- Una tarea manual sin `alertId` sigue siendo iniciación humana directa; no recibe
  review, provenance o autorización derivados ficticios.
- No se añade tabla, migración, dependencia, catálogo clínico universal ni
  automatización.
- La policy puede ampliarse con otra acción real futura, pero cada acción deberá
  declarar su evidencia y pruebas; no se preautorizan capacidades inexistentes.
- DEC-002 y DEC-017 permanecen pendientes. La policy no habilita cierre, SLA ni
  escalado.
