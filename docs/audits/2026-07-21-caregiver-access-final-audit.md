# Auditoría final REQ-05 / REQ-06 — autorización del cuidador

## Resumen ejecutivo

La auditoría identificó siete defectos confirmados en la implementación técnica previa a integración. Cuatro afectaban directamente a autorización o sesiones y se clasificaron como altos: relaciones cruzadas incoherentes, scope ambiguo/global, logout solo cliente y carreras con revocación. Todos se corrigieron en esta rama. El resultado sigue limitado a demo sintética y no acredita validación clínica, jurídica, institucional, RGPD ni MDR.

## Hallazgos altos corregidos

### CG-SEC-001 — relaciones válidas por separado permitían identidades cruzadas

- Regla: NEXT-AUTH-001 / mínimo privilegio relacional.
- Ubicación corregida: `prisma/schema.prisma:970`, `prisma/schema.prisma:989`, `prisma/schema.prisma:1010`, `prisma/schema.prisma:1033` y `prisma/migrations/20260721000100_caregiver_access_revocation/migration.sql:196`.
- Impacto previo: una combinación manual de FKs válidas podía asociar invitaciones, sesiones u observaciones a otra autorización, perfil o sujeto.
- Corrección: FKs y claves compuestas para invitación → sesión → observación, más trigger de autorización/perfil/sujeto/episodio. Las escrituras negativas se prueban con SQL directo.

### CG-SEC-002 — el scope no tenía límite inequívoco por episodio

- Regla: autorización de mínimo privilegio y denegación por defecto.
- Ubicación corregida: `prisma/schema.prisma:970` y `src/infrastructure/persistence/prisma-caregiver-access-unit-of-work.ts:116`.
- Impacto previo: cambiar el scope bajo una autorización podía alterar permisos efectivos de sesiones de otros episodios.
- Corrección: versionado N+1 por `(caregiverAuthorizationId, dischargeEpisodeId)` y consulta siempre filtrada por ambos valores.

### CG-SEC-003 — logout permitía replay del token persistido

- Regla: NEXT-SESS-002.
- Ubicación corregida: `src/infrastructure/persistence/prisma-caregiver-access-unit-of-work.ts:583` y `src/app/api/demo/caregiver/portal/route.ts:86`.
- Impacto previo: borrar la cookie no revocaba `CaregiverSession`; quien conservara el token podía reutilizarlo.
- Corrección: invalidación transaccional de la sesión persistida, auditoría minimizada y posterior expiración de cookie.

### CG-SEC-004 — revocación y operaciones del portal no compartían un orden transaccional

- Regla: NEXT-AUTH-001 y consistencia de sesión.
- Ubicación corregida: `src/infrastructure/persistence/prisma-caregiver-access-unit-of-work.ts:54`, `src/infrastructure/persistence/prisma-legal-records-unit-of-work.ts:114` y `prisma/migrations/20260721000100_caregiver_access_revocation/migration.sql:318`.
- Impacto previo: una observación, aceptación o cambio de scope podía usar una lectura anterior y confirmar después de una revocación ya confirmada.
- Corrección: bloqueo compartido para acceso/mutación, bloqueo exclusivo para revocación y revalidación posterior al bloqueo. Las cuatro carreras se ejercitan contra PostgreSQL real.

## Hallazgos medios corregidos

### CG-TEST-005 — la prueba de support usaba un token ficticio inválido

- Ubicación corregida: `tests/e2e/caregiver-access.spec.ts:76`.
- Riesgo previo: la prueba podía pasar por validación de token sin demostrar la frontera RBAC.
- Corrección: invitación real, vigente y persistida; `support` recibe 403 y `consumedAt` permanece `NULL`.

### CG-GOV-006 — TTL presentados como constantes implícitas

- Ubicación corregida: `src/infrastructure/config/env.ts:68` y `.env.example:9`.
- Riesgo previo: 30 minutos y 8 horas podían confundirse con política institucional.
- Corrección: configuración validada y rotulada como supuesto técnico de demo.

### CG-GOV-007 — trazabilidad REQ-03/REQ-05 contradictoria

- Ubicación corregida: `docs/requirements-traceability.md` y `docs/requirements-traceability.csv`.
- Riesgo previo: REQ-03 decía que cuidador no estaba implementado y REQ-05 sobrestimaba el grado de cierre.
- Corrección: REQ-03 reconoce la vista técnica limitada; REQ-05 figura como parcialmente implementado y no validado.

## Riesgos residuales

- DEC-004 y DEC-013 permanecen pendientes: representación, alcance jurídico, autenticación institucional y roles finales no están resueltos.
- `caregiver:portal` del seed continúa `PENDING`; no habilita uso real.
- El adapter de invitaciones es local y no envía email, SMS ni push.
- Los TTL son valores de demo configurables, no una decisión institucional.
- No existe un flujo aprobado para asignar tareas a cuidadores; el portal solo filtra tareas ya asignadas por una fuente futura autorizada.
