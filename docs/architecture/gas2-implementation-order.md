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

## Siguiente rama exacta

Tras completar gobernanza de episodio y procedencia, la siguiente rama continúa
siendo:

```text
refactor/gas2-human-authorization-policy
```

## Revisión de la secuencia inicial

| Orden | Rama inicial | Decisión | Rama recomendada / condición |
|---:|---|---|---|
| 1 | `feat/gas2-episode-governance` | Modificar | `refactor/gas2-episode-governance-policy`; ya existe el agregado |
| 2 | `feat/gas2-signal-provenance` | Mantener con alcance menor | `feat/gas2-signal-provenance-boundary`; completada con value objects, mappers y lineage sobre evidencia actual |
| 3 | `refactor/gas2-human-authorization-policy` | Mantener | Después de provenance; reutilizar `AlertReview` y guards, sin `ReviewGate` persistente |
| 4 | `feat/gas2-accountability-sla` | Dividir por bloqueo | `feat/gas2-task-accountability`; SLA/escalado solo después de DEC-017 |
| 5 | `feat/gas2-process-safety` | Mantener condicionado | Proyección determinista tras lifecycle/SLA; sin scoring ni acción autónoma |
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

Extrae el contrato común de actor, asignación, objeto/version revisados, decisión
y acción permitida. Mantiene `AlertReview` y `TaskEvent` como historias reales.
Añade pruebas negativas que demuestren que ninguna señal salta el gate.

### 4. `feat/gas2-task-accountability`

Extiende `Task`/`TaskEvent` para expresar propiedad operativa y transferencia
cuando exista semántica aprobada. No crea `TaskCase` ni
`AccountabilityGraph`. La parte SLA queda bloqueada por DEC-017.

### 5. Rama SLA tras DEC-017

Nombre recomendado una vez aprobada la decisión:

```text
feat/gas2-task-sla-escalation
```

Implementa configuración versionada, tiempos objetivo y escalado organizativo.
Los valores deben proceder de evidencia local; no se usan defaults clínicos.

### 6. `feat/gas2-process-safety`

Evalúa missed-process a partir de ventanas de check-in, revisiones, tareas y SLA.
Primera implementación preferida: proyección determinista y explicable. Persistir
hallazgos solo si necesitan acknowledgement e historia propia.

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

La secuencia reduce diez ramas inicialmente propuestas a tres trabajos inmediatos
fundacionales, dos evoluciones condicionadas por DEC-017 y varias integraciones
aplazadas hasta disponer de contratos reales. Evita financiar una segunda
arquitectura y concentra la IP en gobernanza, procedencia, autorización humana,
responsabilidad y seguridad de proceso.
