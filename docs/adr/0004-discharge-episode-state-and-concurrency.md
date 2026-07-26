# ADR-0004 — Estado y concurrencia del episodio postalta

## Estado

Aceptada para el MVP técnico sintético. No constituye validación clínica, jurídica ni institucional.

## Contexto

REQ-01 necesita convertir un alta registrada por una persona profesional en un episodio trazable sin inferir eficacia, diagnóstico o riesgo. DEC-001, DEC-002, DEC-005 y DEC-013 siguen pendientes. Los módulos de avisos y tareas ya existen, y el cierre no puede ignorar sus obligaciones abiertas ni convertirlas en criterio clínico definitivo mientras DEC-002 siga pendiente.

## Decisión

- Separar `Patient`, identificado solo por `externalPseudonymousId`, de `DischargeEpisode`; no almacenar `diagnosisSummary`.
- Referenciar la evidencia de identidad a una `IdentityVerificationPolicyVersion` append-only con estado, proceso, versión y separación demo/institucional. Solo una política aprobada cuyo estado aceptado coincida con una verificación humana registrada permite activar, y una política demo nunca es válida para un paciente no sintético.
- Aplicar la máquina explícita `DRAFT → ACTIVE`, `ACTIVE → PAUSED|CLOSED`, `PAUSED → ACTIVE|CLOSED`; `CLOSED` es terminal.
- Exigir responsables activos de enfermería y clínico al crear y al activar/reactivar.
- Usar `version` y actualización condicional para concurrencia optimista. Toda transición usa una clave idempotente única por actor y una huella de la petición dentro de la misma transacción que estado, timeline y `AuditEvent`.
- Prohibir hard-delete de pacientes y episodios y hacer append-only políticas y transiciones mediante triggers PostgreSQL. La retención final sigue pendiente.
- Evolucionar la abstracción de cierre a `EpisodeGovernancePolicy` y `EpisodeGovernanceView`, calculadas sin persistencia nueva desde `DischargeEpisode`, responsables, versión exacta del protocolo de check-in, evidencia técnica de identidad, `Alert` y `Task`.
- Consultar únicamente IDs, estados y revisiones necesarios. No copiar explicaciones, respuestas, resúmenes de tarea ni texto clínico a la vista, blockers, auditoría, errores o logs.
- Ejecutar la lectura de gobernanza del cierre dentro del `EpisodeUnitOfWork` que conserva la comprobación de `expectedVersion`. La rama no contiene un camino de mutación de cierre: DEC-002 pendiente, política ausente, excepción o vista inconsistente producen `NOT_AUTHORIZED`.
- Tratar avisos no terminales y tareas abiertas como obligaciones organizativas visibles, no como diagnóstico, pronóstico o regla clínica aprobada.

## Consecuencias

La UI puede crear, listar, detallar, mostrar el timeline y consultar gobernanza organizativa, además de detectar conflictos 409. No puede cerrar episodios en esta rama. Una futura habilitación exige resolver DEC-002 y diseñar explícitamente la consistencia entre versión del episodio y obligaciones concurrentes; no basta con cambiar un booleano o inyectar una política permisiva. No se introduce automatismo clínico, acción sobre avisos/tareas ni nueva fuente de verdad.
