# ADR-0011 — Frontera canónica de procedencia de señales

- Estado: Aceptada para el MVP técnico sintético
- Fecha: 2026-07-26
- Alcance: procedencia interna de evidencia fuente y derivada
- Validación clínica/institucional: no acreditada

## Contexto

Las fuentes de verdad ya estaban separadas por dominio. Check-ins, observaciones
de cuidador, versiones de Plan de Seguridad y Domicilio Seguro, evaluaciones de
regla y avisos conservaban IDs, tiempos y parte de su procedencia, pero no existía
un contrato común versionado. `RuleEvaluation.inputSnapshot` contenía los inputs
normalizados y su hash; `Alert.inputReferences` almacenaba arrays no versionados
con valor, tiempo y una referencia manual de origen.

La migración aplicada `20260717000300_explainable_alerts` exige mediante
`alerts_input_references_array_check` que la raíz de `Alert.inputReferences` sea
un array. Reescribir historia o relajar ese constraint habría requerido una
migración y no es necesario para este boundary.

## Fuentes verificadas antes del cambio

| Fuente | Fuente de verdad | Procedencia previa | Brecha | Acción |
|---|---|---|---|---|
| Respuesta de check-in | `CheckInResponse`, `CheckInOutcome`, `CheckInAssignment`, `CheckInProtocolVersion` | submitter, `submittedAt`, IDs y versión de protocolo | sin referencia canónica común | mapear por referencia |
| No respuesta | `NonResponseEvent`, `CheckInOutcome`, `CheckInAssignment` | `OMITTED`/`EXPIRED`, actor y `recordedAt` | sin tipo canónico común | mapear sin inferir riesgo |
| Observación de cuidador | `CaregiverObservation` y relaciones de autorización/perfil/sesión | autoría técnica y `submittedAt` | texto y referencia no estaban separados por contrato | referenciar IDs; no copiar `content` |
| Plan de Seguridad | `SafetyPlanVersion` | versión, creador y `createdAt` | sin referencia común | referenciar plan/versión |
| Domicilio Seguro | `HomeSafetyReviewVersion` | versión, plantilla, actor y `recordedAt` | sin referencia común | referenciar versión/plantilla |
| Evaluación de regla | `RuleEvaluation` | regla/versión, actor, `evaluatedAt`, snapshot, hash y outcome | parents no normalizados | derivación sobre referencias fuente |
| Aviso | `Alert` | evaluación, regla/versión y array manual de inputs | formato sin versión y con valores duplicados | lineage v1 compatible |
| Revisión/acción humana | `AlertReview`, `Task`, `TaskEvent` | historia humana append-only | fuera del alcance de esta decisión | no modificar |

## Decisión

Se añade un único módulo de dominio con value objects, validación y mappers. El
contrato `CanonicalProvenanceLineageV1` contiene:

- `schemaVersion: 1`, independiente de versiones de regla, protocolo o documento;
- episodio, sujeto y cero o más padres;
- clasificación `SOURCE` o `DERIVED`;
- tipo de evidencia, productor interno y referencia técnica;
- únicamente los timestamps cuya semántica existe en el registro fuente;
- actor/rol solo cuando están registrados;
- referencias de protocolo, regla, plantilla, documento, correlación e integridad
  cuando existen;
- tipo de derivación determinista para `RuleEvaluation` y `Alert`.

Los mappers soportan únicamente `CheckInResponse`, `NonResponseEvent`,
`CaregiverObservation`, `SafetyPlanVersion` y `HomeSafetyReviewVersion`. No hay un
tipo genérico que acepte productores desconocidos.

Un lineage de `RuleEvaluation` contiene como padres una o varias referencias
fuente. Un lineage de `Alert` contiene exactamente una evaluación padre y las
fuentes usadas por esa evaluación. Es una representación lógica sobre IDs
existentes; no es una fuente de verdad, un event store ni un grafo persistente.

Antes de persistir una evaluación, el adaptador Prisma resuelve cada ID contra su
tabla fuente dentro de la misma transacción, reconstruye la referencia desde el
registro encontrado y comprueba el episodio real. Una fuente inexistente,
incompatible o perteneciente a otro episodio se rechaza de forma cerrada.
`sourceField` y `observedAt` aportados por la evaluación no se mezclan con esa
metadata reconstruida: se conservan dentro de `ruleInputContext` con estado
`DECLARED_NOT_SOURCE_VERIFIED`. El boundary verifica la referencia interna, no la
equivalencia semántica entre el valor evaluado y el contenido clínico fuente.

## Persistencia y compatibilidad

`schema.prisma` y las migraciones no cambian. Para respetar el constraint aplicado,
un aviso nuevo guarda `[CanonicalProvenanceLineageV1]` dentro de
`Alert.inputReferences`.

Solo una `RuleEvaluation` con outcome `matched` puede ser padre de la derivación
`ALERT_FROM_MATCHED_RULE_EVALUATION`. Las evaluaciones `not-matched` y
`abstained` no tienen persistencia canónica separada de lineage: su fuente de
verdad continúa siendo `RuleEvaluation` y sus campos actuales de snapshot, hash,
regla/versión y outcome.

Los lectores:

1. validan ese elemento como v1 y publican `VALID`;
2. minimizan arrays históricos al cuádruple técnico
   `resourceType/resourceId/field/observedAt` y publican
   `LEGACY_UNVERSIONED`, sin exponer el valor histórico;
3. publican `INVALID` ante versión, forma o referencia no soportada.

No se reescribe ni borra ninguna fila histórica. Un formato desconocido nunca se
presenta como procedencia válida.

## Minimización e invariantes

El contrato rechaza campos desconocidos para evitar que se convierta en un
payload clínico paralelo. No copia respuestas, prompts, texto de cuidador,
contenido de planes, ítems de Domicilio Seguro, explicaciones, notas o resúmenes
de tarea.

La evaluación explícita sigue siendo determinista. Un resultado coincidente solo
crea un aviso `open`. La revisión humana y la creación posterior de una tarea
permanecen operaciones separadas y explícitas. Este boundary no envía
comunicaciones, deriva, trata, recomienda, firma ni cierra episodios.

## Consecuencias

- La procedencia interna es tipada, versionada, minimizada y fail-closed.
- Los avisos nuevos permiten reconstruir fuente → evaluación → aviso sin una
  segunda base clínica.
- Los avisos históricos siguen siendo legibles, pero se identifican como no
  versionados; no se eleva retrospectivamente su confianza.
- No se implementan conectores externos, FHIR, `SignalRecord`, outbox, broker,
  dependencias o migraciones.
- Los adaptadores futuros deberán resolver sus referencias contra su fuente de
  verdad autorizada antes de reutilizar el contrato; no basta con aceptar un ID
  aportado por el llamador.
- [ADR-0018](0018-future-read-only-fhir-boundary.md) documenta, sin implementar,
  cómo una futura importación FHIR de solo lectura debería mantener separadas la
  procedencia externa no confiable y esta procedencia interna. Un recurso válido
  o una referencia externa no se convierten por ello en lineage interno
  verificado.
