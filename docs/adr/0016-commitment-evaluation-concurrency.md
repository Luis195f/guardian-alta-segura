# ADR-0016 — Concurrencia de la evaluación de compromisos vencidos

- Estado: `PROPOSED DESIGN / NOT IMPLEMENTED / DUE EVALUATOR NOT AUTHORIZED`
- Fecha: 2026-08-02
- Alcance: coordinación PostgreSQL/Prisma de una futura evaluación de
  compromisos; no define plazos ni autoriza un disparador
- Baseline: `ae6ee97643cfba628dafa0fef31bf2fcf6ec8e20`
- Decisiones institucionales/regulatorias: pendientes

Este ADR documenta exclusivamente un algoritmo futuro. No autoriza resolver
evidencia, clasificar puntualidad, crear eventos de ausencia, ejecutar evaluación
automática ni exponer una capacidad. `DUE EVALUATOR = NO_GO` y
`AUTOMATIC EVALUATION = NO_GO`.

No bloquea la única migración aditiva ni el ciclo de vida mínimo del slice 5B
sintético definido en la especificación. 5B puede usar revisión optimista y
concurrencia transaccional mediante los patrones existentes para
`CREATE_COMMITMENT_DRAFT`, `ACTIVATE_COMMITMENT`, `SUPERSEDE_DRAFT` y
`SUPERSEDE_ACTIVE_VERSION`; no puede implementar el algoritmo de este ADR.

## Contexto

La [especificación del motor](../architecture/commitment-engine-spec.md) define el
contrato conceptual `evaluateDueCommitments(now, batchSize)`. El baseline real
usa PostgreSQL/Prisma, un monolito Next.js y units of work transaccionales. Para
tareas ya existen revisión optimista, idempotencia, índices únicos y locks de
filas en orden estable. Para check-ins existen claims con unicidad. No existe
scheduler, worker, lease, inbox/outbox o tabla de compromisos.

La carrera crítica futura no es solo «dos evaluadores crean el mismo evento».
También puede ocurrir:

1. un evaluador observa que no hay evidencia;
2. otra transacción enlaza una evidencia compatible;
3. el evaluador registra ausencia usando una lectura obsoleta.

El mecanismo elegido debe ordenar la evaluación y el **enlace validado de
evidencia** sobre la misma versión de compromiso. La escritura del registro
fuente por sí sola no cambia el estado del compromiso hasta que el resolver crea
su referencia validada, pero su `recordedAt` autoritativo conserva íntegramente la
clasificación temporal. El momento posterior del enlace no lo vuelve tardío.

Este ADR usa los cuatro ejes definidos por la especificación: `occurredAt`
(acción), `recordedAt` (constancia fuente), `discoveredAt`/`linkedAt`
(visibilidad y vínculo Core) y `evaluatedAt` (evaluación del vencimiento).

## Criterios

- compatibilidad con PostgreSQL 16 y Prisma 6.19;
- patrón coherente con los locks de fila ya usados por la workqueue;
- paralelismo entre compromisos independientes;
- recuperación automática tras caída sin lease huérfano;
- idempotencia semántica y una sola auditoría de éxito;
- transacción corta y sin mutex global;
- comportamiento explicable y comprobable con pruebas de carrera;
- ninguna dependencia, servicio o mecanismo combinado sin necesidad.

## Alternativas

### A. `FOR UPDATE SKIP LOCKED`

El evaluador lee candidatos ordenados y, para cada uno, intenta bloquear la fila
de la versión actual mediante `FOR UPDATE SKIP LOCKED`. El enlace de evidencia,
la activación/corrección y la evaluación bloquean esa misma fila antes de leer o
escribir hechos del compromiso.

Ventajas:

- serializa exactamente el recurso con riesgo de TOCTOU;
- permite varios ejecutores sin espera ni claim persistente;
- un crash libera el lock con el rollback;
- conserva paralelismo entre compromisos;
- coincide con el uso actual de SQL explícito `FOR UPDATE` dentro de adapters
  Prisma.

Costes:

- requiere `$queryRaw` encapsulado en persistencia;
- todos los writers del compromiso deben respetar el mismo lock;
- un lote grande puede retener locks demasiado tiempo si se procesa en una única
  transacción.

Mitigación: leer una página candidata sin lock y procesar cada candidato en una
transacción corta que vuelve a comprobar elegibilidad tras adquirir el lock. Un
item bloqueado se cuenta como `SKIPPED_CONCURRENT_EVALUATION` y queda para el
siguiente run.

### B. Advisory lock transaccional

`pg_try_advisory_xact_lock` podría coordinar por un hash estable del ID del
compromiso.

Ventajas:

- no necesita bloquear una fila concreta;
- se libera al terminar la transacción;
- permite coordinación antes de que exista un registro materializado adicional.

Costes y rechazo:

- introduce una convención global de claves que no existe en el repositorio;
- colisiones, namespacing y disciplina de todos los writers deben demostrarse;
- la relación entre lock y fila queda fuera de la integridad relacional;
- añade complejidad sin ventaja frente a una fila de versión que necesariamente
  existirá.

No se selecciona.

### C. Restricción o índice único + reintento

Una clave única semántica puede impedir dos eventos
`AUSENCIA_DE_EVIDENCIA_EN_PLAZO` para la misma versión, plazo y policy.

Ventajas:

- simple, robusta ante reintentos y alineada con idempotencia existente;
- un único insert gana sin coordinación previa;
- necesaria como invariant de datos incluso con un solo ejecutor.

Costes y rechazo como estrategia principal:

- evita duplicados, pero no ordena evidencia contra evaluación;
- ambos procesos pueden tomar decisiones sobre snapshots distintos;
- el reintento resuelve el conflicto de insert, no el TOCTOU semántico.

Se conserva la unicidad como invariant/idempotencia de defensa, no como mecanismo
primario de exclusión.

### D. Serialización transaccional (`SERIALIZABLE`)

Cada evaluación y enlace de evidencia podría ejecutarse a isolation level
`SERIALIZABLE`, con reintentos ante `40001`.

Ventajas:

- PostgreSQL detecta ciclos y anomalías de serialización;
- no exige elegir manualmente una fila de lock para cada query.

Costes y rechazo:

- mayor tasa de abort/retry para scans temporales y fuentes múltiples;
- obliga a una política de reintento más amplia y difícil de observar;
- Prisma ya usa `SERIALIZABLE` en adapters puntuales, pero no es el nivel global
  ni el patrón de la workqueue;
- sigue siendo necesario limitar el batch y razonar sobre consultas a fuentes.

Es más fuerte de lo necesario para un agregado con fila de versión bloqueable.
No se selecciona por defecto.

## Decisión

> `DOCUMENTED FOR FUTURE PHASE / NOT REACHABLE IN 5B`.

Se propone seleccionar `FOR UPDATE SKIP LOCKED` sobre la futura fila coordinadora
`EpisodeCommitmentVersion` actual como estrategia mínima de coordinación del
evaluador, con una transacción corta por compromiso. La propuesta no autoriza
schema, raw SQL ni ejecución.

La secuencia conceptual es:

```text
1. leer IDs candidatos ordenados por dueAt, id, sin afirmar que están evaluados;
2. para cada ID, abrir transacción;
3. SELECT versión actual ... FOR UPDATE SKIP LOCKED;
4. si no se obtiene, devolver SKIPPED_CONCURRENT_EVALUATION;
5. revalidar estado, dueAt, policy, episodio y evaluatedAt=now;
6. resolver referencias autorizadas y obtener recordedAt desde la fuente;
7. clasificar por recordedAt, nunca por el orden del lock, y hacer append de
   CommitmentEvent y AuditEvent, o abstenerse sin conclusión falsa;
8. commit;
9. continuar hasta batchSize o fin de la página.
```

El enlace de una nueva `EvidenceReferenceV1`, la corrección y la sustitución de
versión deben adquirir la misma fila mediante `FOR UPDATE` antes de revalidar y
escribir. Así:

- si el enlace Core confirma primero, el evaluador ve la referencia al adquirir
  el lock y la clasifica exclusivamente mediante el `recordedAt` autoritativo de
  la fuente;
- si la ausencia confirma primero, un enlace posterior conserva el evento de
  ausencia y abre conciliación humana: `recordedAt <= dueAt` puede terminar en
  `EVIDENCE_RECONCILED_ON_TIME`, mientras que solo `recordedAt > dueAt` permite
  `LATE_EVIDENCE_RECORDED`/`EVIDENCE_RECONCILED_LATE`;
- si otro evaluador mantiene el lock, no hay espera ni doble decisión.

El lock solo ordena mutaciones dentro de Core. No serializa el instante en que una
fuente externa o proyección autoritativa creó la constancia, ni convierte el
orden de descubrimiento en orden clínico o registral. En particular, una
constancia puede tener `recordedAt <= dueAt` y hacerse visible al resolver después
de `evaluatedAt` por latencia, reconciliación o defecto de visibilidad. Esa carrera
no se resuelve etiquetándola como tardía: exige conservar la ausencia, registrar
`discoveredAt`/`linkedAt` y una disposición humana que explique la discrepancia.
`occurredAt`, `discoveredAt`, `linkedAt` y `evaluatedAt` nunca sustituyen a
`recordedAt` para clasificar puntualidad.

La clave única semántica y el fingerprint siguen siendo obligatorios para
idempotencia, pero no constituyen un segundo algoritmo de locking. Protegen el
contrato de reintento y la base frente a writers defectuosos.

No se toma lock sobre `DischargeEpisode` durante el scan: el compromiso ya está
ligado por FK y la evaluación no muta el episodio. Si una futura policy requiere
que el estado del episodio afecte la elegibilidad, deberá especificar un orden de
locks compatible y reabrir este ADR; no se hereda silenciosamente el orden de la
workqueue.

## Idempotencia y auditoría

La identidad semántica de una evaluación que registra ausencia es:

```text
(commitmentVersionId, dueAt, evidencePolicyVersionId,
 eventKind=AUSENCIA_DE_EVIDENCIA_EN_PLAZO)
```

Repetirla:

- con el mismo fingerprint devuelve el evento y la revisión resultante;
- con fingerprint incompatible produce conflicto;
- no crea un segundo evento ni un segundo `AuditEvent` de éxito.

El primer evento confirmado conserva su `evaluatedAt`. Un replay posterior no lo
refecha con el `now` del nuevo run. El enlace o conciliación posterior tiene su
propio `discoveredAt`/`linkedAt` y revisión, sin mutar el evento de ausencia.

Una abstención o fallo transitorio no crea un evento de ausencia. Puede producir
telemetría agregada sanitizada conforme a una futura policy DEC-014. Un error de
integridad persistente solo crea un evento de error cuando la transición y su
auditoría confirman juntas.

## Recuperación y fallos

- Crash antes de commit: rollback libera el lock; el siguiente run reintenta.
- Crash después de commit: la clave semántica devuelve replay idempotente.
- Dos jobs: cada item tiene un ganador o se omite; no existe lease huérfano.
- Fuente no disponible: abstención; no ausencia falsa.
- Deadlock: no esperado en el camino de una sola fila. Si aparece, rollback,
  código técnico sanitizado y reintento limitado; detener rollout si se repite.
- Starvation: orden estable y runs repetidos; medir `oldestRemainingDueAt` y
  `skippedLockedCount` sin fijar un SLO no aprobado.
- Batch excesivo: límites técnicos configurados y una transacción por item.

## Pruebas futuras obligatorias

1. dos evaluadores sobre el mismo compromiso producen un evento y una auditoría;
2. evidencia gana el lock con `recordedAt <= dueAt` y la evaluación observa
   evidencia on-time;
3. evaluación gana el lock y un enlace posterior con `recordedAt <= dueAt` abre
   conciliación humana, termina en `EVIDENCE_RECONCILED_ON_TIME` y conserva la
   ausencia;
4. evaluación gana el lock y un enlace posterior con `recordedAt > dueAt` queda
   tardío y conserva la ausencia;
5. `occurredAt <= dueAt` con `recordedAt > dueAt` sigue siendo tardío aunque el
   enlace ocurra antes de evaluar;
6. variaciones de `discoveredAt`, `linkedAt` y `evaluatedAt` no cambian una
   clasificación fijada por `recordedAt`;
7. un item bloqueado no bloquea otros compromisos;
8. rollback antes de commit permite recuperación;
9. replay tras commit devuelve el resultado existente y el `evaluatedAt`
   original;
10. misma clave con fingerprint distinto produce conflicto;
11. fuente no disponible o `recordedAt` no fiable produce abstención;
12. corrección y conciliación concurrentes se serializan con evaluación;
13. episodios y profesionales disjuntos mantienen paralelismo;
14. ningún error/log contiene acción, evidencia o contenido clínico;
15. el evaluador no muta `Task`, `Alert` ni `DischargeEpisode`.

## Consecuencias y gate

La decisión evita mutex global, advisory-lock conventions y `SERIALIZABLE` como
default. Exige que todo writer del compromiso use el port transaccional común y
que las pruebas SQL demuestren la carrera real.

Este ADR no autoriza raw SQL de evaluación, `FOR UPDATE SKIP LOCKED` operativo,
endpoint, batch evaluator, scheduler o worker. Tampoco autoriza eventos de
ausencia, resolución de evidencia, clasificación de puntualidad ni claims de
evaluación automática.

La autorización separada de 5B sí permite schema/migración mínimos y la
concurrencia de sus cuatro comandos mediante patrones existentes, sin usar el
algoritmo aquí propuesto. Antes de implementar el evaluador deben aprobarse las
decisiones enumeradas en la especificación, revisarse el schema concreto y
obtenerse un gate posterior. Si esa fase futura no materializa una fila de versión
bloqueable o requiere evidencia multiagregado atómica, este ADR vuelve a
`REVISIÓN`.

```text
DUE EVALUATOR = NO_GO
AUTOMATIC EVALUATION = NO_GO
SCHEDULER / WORKER = NO_GO
EXTERNAL API / UI EXPOSURE = NO_GO
```
