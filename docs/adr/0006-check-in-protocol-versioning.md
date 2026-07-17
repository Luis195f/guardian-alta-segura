# ADR-0006 — Protocolos y check-ins append-only

## Estado

Aceptada para el MVP técnico con datos sintéticos. No constituye aprobación clínica, jurídica ni institucional de preguntas, frecuencia, ventanas o gestión de no respuesta.

## Contexto

REQ-04 exige cuestionarios breves configurables sin fijar una frecuencia clínica en código. REQ-06 exige que revocar la participación digital detenga nuevas asignaciones sin borrar las anteriores. DEC-006 mantiene pendientes el contenido, la cadencia, las ventanas y la gestión institucional de no respuesta.

## Decisión

- `CheckInProtocolVersion` contiene una definición inmutable de preguntas y una `ScheduleConfiguration`.
- Versionar crea una fila nueva con linaje `basedOnVersionId`; nunca actualiza preguntas o cadencia previas.
- Cada `DischargeEpisode` nuevo referencia obligatoriamente una versión. La migración vincula episodios preexistentes a un marcador `DRAFT` bloqueado y sin cadencia, no a una frecuencia inventada.
- `CheckInAssignmentBatch` reclama de forma idempotente y única el episodio antes de crear asignaciones. Claves foráneas compuestas impiden que batch o asignación usen una versión distinta de la fijada en el episodio.
- `CheckInAssignment` conserva las fechas UTC calculadas desde fecha local, hora y zona IANA configuradas.
- `CheckInOutcome` es la única resolución terminal por asignación. `RESPONDED` exige una `CheckInResponse`; `OMITTED` y `EXPIRED` exigen un `NonResponseEvent`. La exclusión está protegida por unicidad y un constraint trigger diferido.
- `CheckInResponse` conserva la versión de la asignación; cada `CheckInAnswer` referencia conjuntamente respuesta, pregunta y versión. PostgreSQL rechaza cualquier cruce entre versiones.
- Omitir o vencer genera no respuesta mediante `NonResponseEvent`; nunca crea una respuesta clínica vacía.
- La participación digital se revalida dentro de la transacción que crea asignaciones. Una revocación deniega nuevas asignaciones y no modifica el histórico.
- Los reintentos de generación, respuesta, omisión y vencimiento reclaman batch/outcome mediante `INSERT ... ON CONFLICT DO NOTHING`; la misma clave y fingerprint recupera el resultado, mientras cualquier reutilización incompatible produce conflicto estable. La auditoría conserva solo metadatos y no copia respuestas.
- `admin` puede versionar la configuración demo; profesionales asignados crean asignaciones; el paciente solo consulta y responde u omite las propias. `support` y cuidador quedan denegados.
- El fixture de sueño, ansiedad, ánimo, adherencia, consumo, ideación autolítica, irritabilidad y conflicto familiar está marcado `SYNTHETIC_DEMO` y `NO APROBADA`.
- No se ejecutan reglas, alertas, comunicaciones, decisiones o derivaciones automáticas.

## Consecuencias

La UI ofrece un panel admin de versionado, creación profesional de asignaciones y formulario/histórico paciente. La cadencia se aplica de forma determinista y trazable, pero no existe scheduler automático. Cualquier uso real continúa bloqueado hasta resolver DEC-003, DEC-005 y DEC-006 y contar con políticas aprobadas de participación, contenido, retención y operación.
