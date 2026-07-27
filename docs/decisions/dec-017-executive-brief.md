# Qué necesitamos decidir antes de implementar SLA y escalado

## Estado actual

Guardián Alta Segura ya permite organizar tareas humanas de continuidad
postalta con datos sintéticos. Cada tarea pertenece a un episodio; puede nacer de
una iniciativa profesional directa o vincularse a un aviso previamente revisado
por una persona. El sistema registra quién la creó, a quién está asignada, quién
realizó cada acción y quién la resolvió. Conserva historia, evita dobles cambios y
no ejecuta actuaciones clínicas automáticamente.

Hoy solo existen tareas abiertas o resueltas. También puede verse si una tarea
está sin asignar, asignada o resuelta. Assignment significa únicamente quién es
el holder técnico actual: no demuestra que la persona haya aceptado la tarea ni
le concede autoridad clínica exclusiva.

## Por qué no se han codificado tiempos

Un plazo aparentemente simple incorpora decisiones institucionales: cuándo
empieza, qué hecho lo detiene, quién responde, qué calendario se aplica, qué
ocurre en una ausencia y qué consecuencia tiene el incumplimiento. El software no
debe inventar esas reglas ni reutilizar como prioridad de tarea una etiqueta de
otro módulo.

DEC-017 permanece `Pendiente` y su autoridad primaria registrada es Dirección de
Enfermería. Por ello no existe todavía prioridad de tarea, acceptance, SLA,
deadline, vencimiento ni escalado.

El paquete documental está `FINAL` como estado de trabajo no canónico y en
`READY_FOR_INSTITUTIONAL_DECISION`. Ninguna de esas etiquetas cambia el estado
canónico `Pendiente`.

## Decisiones mínimas necesarias

Los identificadores DEC-017-A a DEC-017-I descomponen el trabajo dentro de la
DEC-017 canónica; no son decisiones canónicas independientes. Dirección debe
resolver para el alcance completo:

1. DEC-017-C: quién puede recibir, asignar y transferir una tarea;
2. DEC-017-D: si assignment es suficiente o se exige acceptance;
3. DEC-017-E: qué eventos inician y terminan la medición;
4. DEC-017-F: objetivo, SLA, deadline, calendario y excepciones;
5. DEC-017-H: qué activa escalation, destinatario, acción y cierre.

DEC-017-C, D, E y F son `BLOCKING_FOR_SLA`. DEC-017-H es
`BLOCKING_FOR_ESCALATION` y `BLOCKING_FOR_PROCESS_SAFETY` cuando corresponda.
DEC-017-C, D, E, F, G e I son
`CONDITIONAL_BLOCKER_FOR_ESCALATION` cuando la condición aprobada depende de
esa dimensión.

DEC-017-A, B y G son blockers condicionales si la política usa taxonomía,
prioridad o resultados de contacto. DEC-017-I también lo es si resolución o
reapertura participa como evento terminal, regla de escalation o Process Safety.

## Qué no cambiará

- Toda actuación clínica seguirá requiriendo juicio y acción humana.
- Resolver una tarea no resolverá automáticamente un aviso ni cerrará un
  episodio.
- No se usará diagnóstico para asignar prioridad.
- No habrá scoring, predicción de suicidio, recomendación terapéutica, contacto
  automático de emergencia ni modificación automática de tratamiento.
- La historia no se sobrescribirá y los logs no contendrán contenido clínico.

## Evidencia que conservará el sistema

Una futura implementación deberá poder reconstruir qué versión de política
estaba vigente, su autoridad y alcance, los eventos que iniciaron y terminaron la
medición, assignment y transferencias, cualquier acceptance, las excepciones y
las acciones humanas posteriores. La política deberá ser versionada y no podrá
aplicarse retrospectivamente de forma ambigua.

## Después de aprobar

Crear el formulario o celebrar el workshop no autoriza implementación. Se
requiere `Canonical DEC-017 status = Aprobada` para la policy version y el
approved scope que se pretende especificar, referencia de evidencia, versión de
política, alcance y fecha efectiva, blockers resueltos, consultas aplicables y
opciones sin contradicción. Otro estado canónico no permite avanzar para esa
versión; la historia se conserva.

La secuencia es `READY_FOR_INSTITUTIONAL_DECISION → institutional
evidence/approval → READY_FOR_TECHNICAL_SPECIFICATION → technical design review
→ READY_FOR_IMPLEMENTATION`. Solo al final podrá abrirse la rama de
implementación. El estado actual de DEC-017 sigue siendo `Pendiente`.
