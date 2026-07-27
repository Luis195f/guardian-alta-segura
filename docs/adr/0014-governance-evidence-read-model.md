# ADR-0014 — Evidencia de gobernanza como proyección read-only

- Estado: Aceptada para el MVP técnico sintético
- Fecha: 2026-07-27
- Alcance: evidencia técnica minimizada por episodio
- Validación clínica, jurídica, regulatoria o institucional: no acreditada

## Contexto

El episodio, su timeline, la gobernanza, la procedencia de señales, las revisiones
humanas, las tareas, su accountability y la auditoría ya tienen fuentes de verdad
separadas. No existía una consulta autorizada capaz de proyectar esas referencias
en una vista reproducible. Crear un `EvidenceLog`, otra tabla o un event store
duplicaría historia y permitiría deriva entre fuentes.

`HumanAuthorizationDecision` es un resultado puro de policy. El contrato de
creación de tareas derivadas exige `DefaultHumanAuthorizationPolicy`, pero la
decisión por instancia no se persiste. `AlertReview` tampoco conserva el rol
histórico del reviewer. La vista no puede inventar ninguno de esos datos.

## Decisión

Se implementa `EpisodeGovernanceEvidenceView` como read model efímero:

- reutiliza `EpisodeGovernanceView` sin recalcular blockers;
- valida `CanonicalProvenanceLineageV1` mediante su lector existente y contrasta
  sus metadatos con `RuleEvaluation` y `Alert` persistidos;
- proyecta `AlertReview` sin motivo ni rol histórico inferido;
- consume `TaskAccountabilityProjection` sin reconstruir su lógica;
- referencia `AuditEvent` existente por ID, acción, resultado, actor técnico,
  recurso, tiempo y correlation ID;
- no persiste la vista ni genera auditoría por componerla;
- se expone únicamente mediante `GET` dentro del workspace profesional asignado.

El servicio exige rol técnico `nurse` o `clinician`, rol activo y responsabilidad
actual sobre el episodio. `admin`, `patient`, `caregiver`, `support` y el
profesional no responsable fallan cerrado. El reader usa una transacción
read-only lógica con snapshot `REPEATABLE READ`. Autorización, episodio,
elegibilidad, hechos de gobernanza y fuentes de evidencia se leen en esa misma
transacción; la policy existente se evalúa antes de cerrarla. La comprobación de
ID, versión y estado permanece como defensa estructural, pero no se usa como
sustituto de la frontera transaccional.

## Semántica de verificación de fuentes

El lineage canónico persistido es la evidencia histórica. Su creación ocurre
después de que el resolver de evaluación haya verificado en PostgreSQL el tipo,
ID y pertenencia al episodio de la fuente interna. Por ello la vista declara
`SOURCE_REFERENCE_VERIFIED_AT_EVALUATION`.

La composición de evidencia no vuelve a consultar la fila fuente y declara
`SOURCE_RECORD_NOT_REVERIFIED_DURING_EVIDENCE_READ`. No existe ni se inventa un
flag persistido de verificación por instancia. El contexto de observación
declarado por la regla conserva su semántica propia y no implica validación
clínica del valor.

## Integridad técnica

Los estados significan exclusivamente:

- `COMPLETE`: todas las referencias persistidas esperadas para el workflow
  técnico soportado están presentes y son coherentes;
- `PARTIAL`: la evidencia disponible es coherente, pero existe evidencia no
  persistida por diseño, procedencia legacy o truncamiento explícito;
- `INCONSISTENT`: las referencias persistidas contradicen el workflow o sus
  invariantes estructurales;
- `NOT_APPLICABLE`: la categoría no es necesaria para ese workflow;
- `UNAVAILABLE`: la evidencia no se persiste o no puede proyectarse desde una
  fuente existente.

Una tarea humana directa usa `NOT_APPLICABLE` para señal, review y autorización
derivada. Una tarea vinculada a aviso exige fuente → evaluación → aviso → review
→ tarea; una referencia obligatoria ausente o contradictoria produce
`INCONSISTENT`. La existencia del enforcement contract se separa del
`HumanAuthorizationDecision` histórico por instancia, que se declara
`UNAVAILABLE`.

Estos estados no significan `SAFE`, `UNSAFE`, cumplimiento, riesgo ni validación
clínica.

## Límites de consulta y minimización

Cada colección (`EpisodeTransition`, `Alert`, `AlertReview`, `Task`, `TaskEvent`
y `AuditEvent`) devuelve como máximo 100 filas. El reader solicita una fila
adicional solo para detectar truncamiento; la respuesta publica por colección
`returned`, `limit`, `truncated` y estado `PARTIAL` cuando procede.

La ausencia de una cola de `TaskEvent` no leída puede explicar blockers derivados
del estado final y se declara `PARTIAL`. Una contradicción ya visible en el
prefijo —identidad de tarea, revisión, creación, estado, assignment o resolución—
permanece `INCONSISTENT`.

La proyección no selecciona ni copia `inputSnapshot`, respuestas, texto de
cuidador, explicación de aviso, resumen/nota/motivo de resolución de tarea,
contenido del Plan de Seguridad o Domicilio Seguro, nombre/contacto del paciente,
diagnóstico o medicación. `RuleEvaluation.inputHash` se selecciona únicamente
para contrastar el lineage canónico y se elimina del response público.

## Consecuencias

- No hay tabla, migración, dependencia, exportación ni segundo AuditLog.
- La consulta es side-effect-free y no habilita cierre o mutación clínica.
- La procedencia legacy se declara `PARTIAL`; un formato inválido falla cerrado.
- La ausencia de decisión histórica de autorización sigue visible y no se
  “corrige” mediante persistencia nueva.
- Retención, exportación y acceso auditor institucional siguen pendientes de
  decisiones locales; no se crea un rol `auditor`.
- DEC-002, DEC-014 y DEC-017 permanecen `Pendiente`.
