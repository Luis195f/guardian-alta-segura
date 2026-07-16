# ADR-0004 — Estado y concurrencia del episodio postalta

## Estado

Aceptada para el MVP técnico sintético. No constituye validación clínica, jurídica ni institucional.

## Contexto

REQ-01 necesita convertir un alta registrada por una persona profesional en un episodio trazable sin inferir eficacia, diagnóstico o riesgo. DEC-001, DEC-002, DEC-005 y DEC-013 siguen pendientes. El módulo de avisos todavía no existe, pero el cierre futuro no puede ignorar avisos abiertos.

## Decisión

- Separar `Patient`, identificado solo por `externalPseudonymousId`, de `DischargeEpisode`; no almacenar `diagnosisSummary`.
- Referenciar la evidencia de identidad a una `IdentityVerificationPolicyVersion` append-only con estado, proceso, versión y separación demo/institucional. Solo una política aprobada cuyo estado aceptado coincida con una verificación humana registrada permite activar, y una política demo nunca es válida para un paciente no sintético.
- Aplicar la máquina explícita `DRAFT → ACTIVE`, `ACTIVE → PAUSED|CLOSED`, `PAUSED → ACTIVE|CLOSED`; `CLOSED` es terminal.
- Exigir responsables activos de enfermería y clínico al crear y al activar/reactivar.
- Usar `version` y actualización condicional para concurrencia optimista. Toda transición usa una clave idempotente única por actor y una huella de la petición dentro de la misma transacción que estado, timeline y `AuditEvent`.
- Prohibir hard-delete de pacientes y episodios y hacer append-only políticas y transiciones mediante triggers PostgreSQL. La retención final sigue pendiente.
- Definir `EpisodeClosurePolicy`; el adaptador actual deniega si el módulo de avisos no está disponible. Los dobles permisivos existen únicamente en pruebas del contrato.

## Consecuencias

La UI puede crear, listar, detallar y mostrar el timeline, además de detectar conflictos 409. No puede cerrar episodios en la rama mientras falte la política real de avisos. No se implementan tareas, check-ins, avisos, plan de seguridad, FHIR ni automatismos clínicos.
