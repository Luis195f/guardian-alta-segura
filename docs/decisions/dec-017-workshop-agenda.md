# DEC-017 — Agenda de workshop con Dirección de Enfermería

## Objetivo

Reunión de 45–60 minutos para resolver o acotar las decisiones mínimas que
bloquean una futura implementación de tiempos operativos y escalado, sin decidir
cuestiones que el software todavía no necesita.

Resultado esperado: formulario DEC-017 con `Document working status` explícito,
lista de evidencia pendiente y acuerdo sobre el siguiente gate. El workshop no
convierte por sí solo una opción en aprobada ni cambia el estado canónico.

`DEC-017-A` a `DEC-017-I` son identificadores internos de descomposición de
DEC-017, no decisiones canónicas independientes.

## Participantes

- Dirección de Enfermería — autoridad primaria;
- facilitación de producto/arquitectura — explica evidencia técnica;
- representante operativo de enfermería — aporta workflow local;
- Dirección TI — consultiva cuando se trate calendario, timezone o notificación;
- Dirección Médica o Responsable del Tratamiento — solo si una opción invade su
  ámbito.

No se registran nombres reales en los artefactos de repositorio.

## Preparación previa

Enviar:

- [resumen ejecutivo](dec-017-executive-brief.md);
- [matriz de opciones](dec-017-option-matrix.md);
- [formulario](dec-017-decision-form.md);
- procedimientos institucionales versionados que puedan servir como evidencia.

Pedir a la autoridad que identifique por adelantado qué documento, comité o
sistema conserva la aprobación formal.

## Agenda

### 1. Apertura y límites

- Confirmar objetivo, autoridad y alcance.
- Recordar que Guardián organiza y evidencia trabajo; no decide actuaciones
  clínicas.
- Confirmar que no se seleccionarán plazos sin evidencia local.

### 2. Qué hace hoy Guardián

- Tarea obligatoriamente ligada a episodio y opcionalmente a aviso revisado.
- Creación, assignment, reassignment, contacto, nota y resolución humanos.
- Historia append-only, revisión optimista, idempotencia y auditoría minimizada.
- Distinción entre creator, assignee, actor, resolver y responsables.

### 3. Qué no decide hoy Guardián

- quién debe asumir institucionalmente una tarea;
- si assignment implica aceptación;
- cuándo empieza o termina un objetivo;
- qué es SLA, deadline o escalado;
- qué significado institucional tienen los resultados de contacto;
- qué categoría o prioridad debe aplicarse.

### 4. Decisiones bloqueantes

Tratar en este orden:

1. `DEC-017-C`: holder, autoridad de assignment y transferencia;
2. `DEC-017-D`: assignment suficiente o acceptance explícita;
3. `DEC-017-E`: evento inicial y evento final;
4. `DEC-017-F`: naturaleza del objetivo, calendario y excepciones;
5. `DEC-017-H`: condición, destinatario, acción y cierre del escalation.

DEC-017-C, D, E y F son `BLOCKING_FOR_SLA`. DEC-017-H es
`BLOCKING_FOR_ESCALATION` y `BLOCKING_FOR_PROCESS_SAFETY` cuando Process Safety
depende de escalation.

Para cada una:

- leer la pregunta;
- comparar opciones sin preselección;
- registrar riesgo operativo y de seguridad;
- anotar evidencia y autoridad;
- marcar `Document working status` como `DRAFT`, `UNDER_REVIEW` o `FINAL`;
- conservar `Canonical DEC-017 status = Pendiente` hasta evidencia formal.

### 5. Decisiones condicionales que pueden aplazarse

- `DEC-017-A` si la primera política no depende de categoría;
- `DEC-017-B` si no depende de prioridad;
- `DEC-017-G` si el resultado de contacto no termina el cómputo ni activa
  escalado;
- `DEC-017-I` si resolution/reopening no es evento terminal, regla de escalation
  ni input de Process Safety;
- equipos/turnos si quedan fuera del alcance aprobado.

Son `CONDITIONAL_BLOCKER`: si el alcance usa una de esas dimensiones, deja de ser
aplazable; en caso contrario puede clasificarse `CAN_DEFER`.

Para escalation, DEC-017-C, D, E, F, G e I son
`CONDITIONAL_BLOCKER_FOR_ESCALATION` solo cuando la condición institucional
aprobada depende de esa dimensión. Por ejemplo, una condición temporal necesita
E/F; una condición por falta de acceptance necesita D y su semántica temporal;
una condición por outcome necesita G; una condición por resolution/reopening
necesita I. Esta agenda no selecciona ninguna.

### 6. Riesgos que deben quedar explícitos

- assignment sin evidencia de recepción;
- acceptance meramente formal;
- tarea sin assignee y sin vigilancia;
- temporizador con timezone/calendario ambiguo;
- escalado que duplique trabajo o se interprete como decisión clínica;
- catálogo de contacto con significado no definido;
- política nueva aplicada retrospectivamente sin historia.

### 7. Cierre y próximos pasos

- Revisar campos incompletos del formulario.
- Identificar evidencia adicional y responsable de aportarla.
- Confirmar alcance, versión, fecha efectiva y revisión.
- Confirmar que DEC-017 sigue `Pendiente` hasta aprobación formal.
- Registrar el `Approval evidence reference` en lugar de identidad o firma.
- Acordar la revisión técnica posterior de implementabilidad y seguridad.

## Criterio de salida

El workshop es satisfactorio si:

- las decisiones bloqueantes están contestadas o marcadas con evidencia faltante;
- no se ha seleccionado ningún valor por conveniencia técnica;
- las autoridades consultivas necesarias están identificadas;
- el alcance diferido está escrito;
- el siguiente gate es inequívoco.

No abrir `feat/gas2-task-sla-escalation` hasta que exista evidencia institucional
real, versionada y atribuible. Después del workshop debe seguirse:

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence/approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ technical design review
→ READY_FOR_IMPLEMENTATION
```

Antes de `READY_FOR_TECHNICAL_SPECIFICATION` debe existir
`Canonical DEC-017 status = Aprobada` para la policy version y el approved scope
que se pretende especificar, además de referencia de evidencia, versión de
política, alcance aprobado, fecha efectiva, blockers del alcance resueltos,
evidencia consultiva aplicable y ninguna contradicción entre opciones.
`Pendiente`, `Propuesta` y `Retirada` no permiten avanzar; `Sustituida` tampoco
lo permite para la versión sustituida. La historia se conserva.
