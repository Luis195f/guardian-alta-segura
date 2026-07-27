# Guardián Alta Segura 2.0 — orden incremental de implementación

## Rama fundacional completada

La primera rama fundacional es:

```text
refactor/gas2-episode-governance-policy
```

El prefijo `refactor` es intencional: episodio, transiciones, responsables,
versiones y ports ya existían. La rama compone y endurece esa arquitectura sin
presentar `Episode Contract` como una feature o tabla nueva.

### Resultado implementado

- `EpisodeGovernancePolicy/View` consulta `DischargeEpisode`, responsables,
  protocolo exacto, avisos no terminales y tareas abiertas;
- la ruta de detalle expone blockers técnicos/operativos y decisiones locales
  pendientes sin contenido clínico;
- el caso de uso de transición evalúa gobernanza en el `EpisodeUnitOfWork`, pero
  DEC-002 pendiente conserva cierre `NOT_AUTHORIZED`;
- política ausente, error o estado inconsistente falla cerrado;
- idempotencia, versión optimista, timeline y auditoría permanecen intactos;
- no se creó tabla, migración, dependencia ni flujo de acción automática.

### Definition of Done específica

1. Una única política compone estado, versión, responsables, protocolo y blockers.
2. Política ausente o DEC-002 pendiente deniega el cierre.
3. Avisos o tareas abiertos no se ignoran.
4. Dos cierres concurrentes no pueden ganar.
5. La evidencia usa IDs, estados y correlation ID; no copia contenido sensible.
6. No cambia el alcance sintético ni habilita automatización clínica.

## Segunda rama fundacional completada

La segunda rama es:

```text
feat/gas2-signal-provenance-boundary
```

Define `CanonicalProvenanceLineageV1`, mappers sobre evidencia actual y linaje
fuente → `RuleEvaluation` → `Alert`. Reutiliza el array JSON existente con lectura
histórica compatible; no crea conectores, tabla `SignalRecord`, migración o
dependencia.

## Tercera rama fundacional completada

La tercera rama es:

```text
refactor/gas2-human-authorization-policy
```

Formaliza `CREATE_TASK_FROM_REVIEWED_ALERT` como policy pura sobre
`AlertReview`, rol activo y responsabilidad actual. No crea `ReviewGate`, tabla,
migración, dependencia ni automatización.

## Cuarto incremento fundacional completado

Tras completar gobernanza, procedencia y autorización humana, el incremento
implementado es:

```text
feat/gas2-task-accountability
```

`TECHNICAL TASK ACCOUNTABILITY = implemented`. `INSTITUTIONAL RESPONSIBILITY /
ACCOUNTABILITY POLICY = not validated, conditioned on DEC-017`.

## Paquete de decisión DEC-017 preparado

La rama documental:

```text
docs/gas2-dec017-decision-pack
```

prepara evidencia, opciones neutrales, preguntas, formulario, agenda y resumen
ejecutivo para Dirección de Enfermería. No implementa ni selecciona taxonomía,
prioridad, acceptance, tiempos, SLA, resultados institucionales de contacto o
escalado.

`DEC-017` continúa `Pendiente`. El paquete es `DECISION SUPPORT EVIDENCE`, no una
decisión ni autorización para abrir `feat/gas2-task-sla-escalation`.

## Revisión de la secuencia inicial

| Orden | Rama inicial | Decisión | Rama recomendada / condición |
|---:|---|---|---|
| 1 | `feat/gas2-episode-governance` | Modificar | `refactor/gas2-episode-governance-policy`; ya existe el agregado |
| 2 | `feat/gas2-signal-provenance` | Mantener con alcance menor | `feat/gas2-signal-provenance-boundary`; completada con value objects, mappers y lineage sobre evidencia actual |
| 3 | `refactor/gas2-human-authorization-policy` | Mantener | Completada; reutiliza `AlertReview` y guards, sin `ReviewGate` persistente |
| 4 | `feat/gas2-accountability-sla` | Dividir por bloqueo | `feat/gas2-task-accountability` completada como proyección; SLA/escalado solo después de DEC-017 |
| 5 | `feat/gas2-process-safety` | Mantener condicionado | Esperar semántica operativa aprobada cuando dependa de assignment/SLA; sin scoring ni acción autónoma |
| 6 | `feat/gas2-integration-boundary` | Mantener condicionado | Contratos solo al seleccionar una integración real; no crear registry especulativo |
| 7 | `feat/gas2-fhir-boundary` | Eliminar del plan comprometido | Crear `feat/gas2-fhir-anti-corruption` únicamente si existe perfil/requisito institucional |
| 8 | `security/gas2-hardening` | Fusionar | Threat model y hardening dentro de cada rama; rama separada solo para hallazgos transversales concretos |
| 9 | `feat/gas2-observability` | Mantener condicionado | Después de DEC-014 y contratos operativos; métricas sin PHI |
| 10 | `test/gas2-architecture-safety` | Fusionar | Pruebas críticas son DoD de cada rama; una rama final solo si existe un gap de suite verificable |

## Orden recomendado

### 1. `refactor/gas2-episode-governance-policy`

Completada. Reutiliza episodio y cierra la deriva entre ADR-0004 y los módulos de
avisos/tareas existentes. No decide reglas clínicas de cierre y sigue denegando
mientras falta la política local.

### 2. `feat/gas2-signal-provenance-boundary`

Completada. Define tipos canónicos y mappers internos para check-in, observación
de cuidador, Plan de Seguridad, Domicilio Seguro, evaluación y aviso. Prueba
linaje, minimización, compatibilidad y fallo cerrado. No añade conectores externos
ni una tabla `SignalRecord` universal.

### 3. `refactor/gas2-human-authorization-policy`

Completada. Extrae el contrato común de actor, asignación, objeto/version
revisados, decisión y acción permitida. Mantiene `AlertReview` y `TaskEvent` como
historias reales. Las pruebas negativas demuestran que ninguna señal salta el
gate y que reviewer y acting actor no se confunden.

### 4. `feat/gas2-task-accountability`

Completada técnicamente como `TaskAccountabilityProjection` sobre
`Task`/`TaskEvent`. Reconstruye assignment/reassignment, separa
creator/assignee/actor/resolver, valida consistencia y verifica elegibilidad
técnica actual. Serializa por episodio y después por el conjunto de identidades
participantes ordenado globalmente, sin migración. No crea `TaskCase` ni
`AccountabilityGraph`. No valida quién debería actuar: acceptance, política
institucional, SLA y escalado quedan bloqueados por DEC-017.

### 5. Rama SLA tras DEC-017

Nombre recomendado una vez aprobada la decisión:

```text
feat/gas2-task-sla-escalation
```

Implementa configuración versionada, tiempos objetivo y escalado organizativo.
Los valores deben proceder de evidencia local; no se usan defaults clínicos.

### 6. `feat/gas2-process-safety`

No debe iniciarse mientras una anomalía dependa de reglas de assignment, tiempos o
SLA todavía pendientes en DEC-017. Un incremento futuro independiente tendría que
demostrar semántica técnica ya aprobada; primera implementación preferida:
proyección determinista y explicable, sin scoring ni acción autónoma.

### 7. `feat/gas2-integration-boundary`

Solo cuando exista al menos un sistema seleccionado y ejemplos sintéticos de su
contrato. Define port, autenticidad, idempotencia, versionado, cuarentena y
observabilidad. El adapter concreto debe ir en una rama posterior con nombre del
proveedor.

### 8. FHIR condicional

No reservar una rama hasta conocer HCE, versión, perfiles, operaciones y scopes.
Si la institución exige FHIR:

```text
feat/gas2-fhir-anti-corruption
```

Debe implementar mappers y pruebas de contrato, no un servidor FHIR.

### 9. `feat/gas2-operational-observability`

Después de DEC-014 y de conocer los procesos/conectores que observar. Añade
métricas, SLO, runbooks y salud técnica sin payload clínico. Si no hay conectores,
prioriza gobernanza, cola y proceso seguro.

## Ramas que no deben abrirse ahora

- `feat/gas2-connector-lagun`
- `feat/gas2-connector-tucuvi`
- `feat/gas2-connector-huma`
- `feat/gas2-connector-memind`
- `feat/gas2-fhir-server`
- `feat/gas2-rpm-platform`
- `feat/gas2-accountability-graph`
- `feat/gas2-signal-record-table`
- `feat/gas2-audit-log`

No existe evidencia contractual o técnica que justifique esas implementaciones;
varias duplicarían responsabilidades actuales.

## Gates por rama

Cada rama debe:

1. partir de archivos reales y nombrar la fuente de verdad reutilizada;
2. conservar revisión humana, autorización y auditabilidad;
3. incluir pruebas de permisos negativos, idempotencia y concurrencia cuando
   aplique;
4. no introducir PHI/PII ni datos reales;
5. actualizar ADR, decisiones y trazabilidad cuando cambie un contrato;
6. ejecutar formato, lint, typecheck, unit, integración, E2E y build;
7. declarar decisiones locales que siguen bloqueando activación.

## Resultado

La secuencia ha completado gobernanza, procedencia, autorización humana y
accountability técnica sin una segunda arquitectura. El paquete de apoyo a
DEC-017 está preparado y el siguiente gate es
`READY_FOR_INSTITUTIONAL_DECISION`: la responsabilidad institucional,
SLA/escalado y cualquier process safety dependiente de reglas de asignación o
tiempos siguen esperando una aprobación real de DEC-017. Las integraciones
continúan aplazadas hasta disponer de contratos reales.

`READY_FOR_INSTITUTIONAL_DECISION` es un gate de preparación, no un estado
canónico de DEC-017. La secuencia posterior es evidencia/aprobación institucional
→ `READY_FOR_TECHNICAL_SPECIFICATION` → revisión de diseño técnico →
`READY_FOR_IMPLEMENTATION`. El estado canónico actual continúa `Pendiente`.
`READY_FOR_TECHNICAL_SPECIFICATION` requiere
`Canonical DEC-017 status = Aprobada` para la policy version y el approved scope
que se pretende especificar; otro estado no habilita ese gate para esa versión.
