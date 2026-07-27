# ADR-0013 — Accountability de tareas como proyección sobre Task y TaskEvent

- Estado: Aceptada para el MVP técnico sintético
- Fecha: 2026-07-27
- Alcance: accountability operativa de tareas humanas
- Validación organizativa/institucional: no acreditada; DEC-017 pendiente

`TECHNICAL TASK ACCOUNTABILITY = implemented`.
`INSTITUTIONAL RESPONSIBILITY / ACCOUNTABILITY POLICY = not validated,
conditioned on DEC-017`.

## Contexto

`Task` ya conserva el estado actual, creador, assignee, revisión y resolución.
`TaskEvent` ya conserva la historia append-only, actor, rol histórico, extremos de
asignación, revisión resultante y tiempo. Añadir una tabla de ownership, un
`TaskCase` o un grafo duplicaría esas fuentes de verdad.

La comprobación previa del assignee objetivo verificaba usuario activo, rol
profesional y responsabilidad del episodio, pero era una lectura sin lock. Una
revocación concurrente de `RoleAssignment` podía confirmar después de esa lectura
y antes de la asignación.

## Decisión

Se implementa `TaskAccountabilityProjection` como función pura y minimizada:

- `Task` aporta estado actual, creador, assignee, resolución y revisión;
- `TaskEvent`, ordenado por `resultingRevision`, aporta lifecycle e historia de
  assignment/reassignment;
- `alertId` distingue iniciación humana directa de tarea derivada de aviso
  revisado, sin copiar review, autorización o procedencia;
- `User`, `RoleAssignment` y responsables actuales del episodio permiten
  clasificar la elegibilidad técnica del assignee actual;
- una incoherencia estructural produce `INCONSISTENT` y blockers deterministas;
- el evento `CREATED` debe compartir timestamp con `Task.createdAt`;
- una revocación posterior produce
  `CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED`, conserva la historia y no ejecuta
  reasignación; este blocker de elegibilidad actual no vuelve inconsistente la
  historia estructural.

La proyección no copia `summary`, notas, motivo de resolución, explicación del
aviso ni otro payload clínico. Su consulta no crea `AuditEvent`.

El invariant de locks de la workqueue es `DischargeEpisode → User de
participantes únicos ordenados globalmente por User.id → RoleAssignment de actor
y target → Task y TaskEvent`. Actor y target se convierten primero en un conjunto
de identidades, por lo que invertir sus papeles entre dos episodios no invierte el
orden de adquisición. El episodio continúa siendo el primer recurso de cada
mutación, pero no actúa como mutex global: episodios con participantes disjuntos
pueden mantener sus locks simultáneamente.

Si una mutación obtiene primero la evidencia del actor o target, la revocación
espera al commit; si la revocación obtiene primero el lock, la mutación observa
`revokedAt` y se deniega. Los replays idempotentes de una mutación ya confirmada
reconstruyen el evento existente y no revalidan retroactivamente al target ni
duplican historia.

## Distinciones y límites

`createdById`, `assignedToId`, `TaskEvent.actorUserId`, `resolvedById`,
`AlertReview.reviewedById` y los responsables del episodio son identidades
distintas. Assignment no concede autoridad exclusiva para mutar, no constituye
acceptance y no altera `UpdateNursingTaskService` más allá de validar el target de
una asignación nueva.

DEC-017 permanece pendiente. No se añaden prioridad, SLA, deadline, escalado,
autoassignment, equipo, turno, suplencia o resultados de contacto definitivos.

## Consecuencias

- Cero tablas, migraciones o dependencias nuevas.
- `Task` sigue siendo estado actual y `TaskEvent` historia append-only.
- Las defensas SQL, `expectedRevision`, idempotencia, auditoría y Human
  Authorization permanecen vigentes.
- Existe una vista reutilizable en el read path de la workqueue y una presentación
  sintética por alias, sin dashboard paralelo.
- La serialización añade contención localizada por episodio y por identidades
  profesionales realmente compartidas; no cambia el isolation level global.
- Este invariant pertenece a la workqueue. Cualquier workflow futuro que bloquee
  varias identidades profesionales debe reutilizar el mismo orden global o
  demostrar con pruebas deterministas que no introduce ciclos.
