# Qué debe decidir Dirección de Enfermería antes de habilitar contingencia en Guardián Alta Segura

## Estado actual

Guardián es un MVP técnico local y sintético. Organiza episodio, Plan de
Seguridad, check-ins, avisos, tareas, cuidador, SBAR y evidencia con autorización
server-side, historias append-only y auditoría minimizada. No está autorizado
para uso asistencial real.

Existe `GET /api/health`, pero solo confirma que la ruta de aplicación responde:
no consulta PostgreSQL ni identidad/dependencias. Si DB está indisponible, las
rutas y sesiones que usan Prisma fallan con un error técnico sanitizado mientras
health todavía podría responder 200.

No existen readiness/liveness separados, contingency mode, read-only fallback,
offline mode, cache clínica local, censo alternativo, cola temporal, backup,
restore, réplica, failover o reconciliación. El volumen Docker conserva datos
locales, pero no es backup. El preview SBAR no es un registro de contingencia.

## Qué significa contingencia

Contingencia es una operación institucional excepcional, declarada por autoridad
humana, para un scope, plan version y capacidades expresamente aprobados. No es
un error, una degradación, un incidente ni un healthcheck fallido. DEC-014
gobierna incident operations; DEC-015 gobierna continuidad/degraded
operation/recovery.

También deben separarse:

- business continuity de disaster recovery;
- backup de archive y offline mode;
- read-only de “seguro para cualquier uso”;
- cached de current;
- restore de reconciliation y operational release;
- RTO de RPO y SLA;
- RPO de retention.

## Qué debe decidirse

Dirección de Enfermería es la autoridad primaria y debe aprobar, con consultas
institucionales cuando proceda:

1. trigger y autoridad de activación;
2. scope global, unidad, servicio, módulo, dependencia o población;
3. funciones `ALLOWED`, `READ_ONLY`, `BLOCKED` o `NOT_APPLICABLE`;
4. operaciones prohibidas cuando no puede probarse freshness, autorización,
   consistencia, policy o auditoría;
5. si no existe dataset local, se usa una fuente institucional externa o se
   autoriza una vista mínima;
6. identidad/sesiones durante outage, sin fallback demo o credencial compartida;
7. si se prohíben writes o existe un workflow manual/externo/temporal aprobado;
8. restore, post-restore integrity, reconciliation y release;
9. RTO/RPO por capability y data class;
10. backup/restore dependencies, lifecycle de copias y evidencia de pruebas;
11. comunicación, human factors y ejercicios;
12. approved capability scope: cada capacidad `IN_SCOPE`, `EXCLUDED` o
    `DEFERRED`.

## Datos offline y continuidad asistencial

No se recomienda ni implementa almacenamiento offline en este paquete. Cualquier
copia futura debe identificar source/version, `generatedAt`, last successful
sync y staleness; además requiere decisión sobre acceso, cifrado, dispositivo,
purge, pérdida, shared workstation, screenshots, printing, exfiltration,
incorrect patient y Safety Plan sustituido.

La continuidad asistencial no obliga a permitir writes digitales sin source of
truth. Puede apoyarse en un procedimiento institucional manual o externo
aprobado. El repositorio no inventa ese procedimiento ni formularios clínicos.

## Restore no es release

Un restore futuro debe comprobar migration/schema level, constraints, historias
append-only, revisions, idempotency, AuditEvent, provenance, policy/config e IAM.
También debe tratar registros dispuestos que reaparezcan desde una copia antigua.

No se presume un único recovery point atómico. La política futura debe separar
consistencia del workflow clínico, consistencia de autorización y estado efímero
de sesiones. Restaurar una base clínica no exige restaurar sesiones activas:
`RESTORE`, `RECONSTRUCT`, `INVALIDATE`, `REAUTHENTICATE` u otro mecanismo
aprobado son opciones todavía no seleccionadas.

```text
TECHNICAL_RESTORE_COMPLETE
→ POST_RESTORE_INTEGRITY_REVIEW_REQUIRED
→ reconciliation when applicable
→ READY_FOR_OPERATIONAL_RELEASE
→ human authorization
→ NORMAL_OPERATION
```

“El servicio responde” no demuestra que los datos estén reconciliados ni que el
workflow esté clínicamente listo.

## Por qué RTO/RPO no deben inventarse

RTO es el target máximo para restaurar una capability; RPO es la pérdida temporal
aceptable respecto de un recovery point consistente. Requieren business impact,
arquitectura y evidencia institucional. Un test mide actual recovery time/point,
pero no aprueba el target.

Este paquete usa `INSTITUTIONAL_VALUE_REQUIRED`: no fija números, un valor global,
frecuencia de backup, retención, tecnología o proveedor.

`RESTORE CAPABILITY ≠ RTO TARGET ≠ RPO TARGET`. Un restore test requiere backup o
recovery reference y criterios de consistencia, pero no presupone targets RTO/RPO
aprobados. Los blockers de operational release proceden únicamente de los
capability scopes aprobados; todo scope excluido, diferido u omitido permanece
deshabilitado.

## Dependencias y siguiente gate

El Responsable del Tratamiento conserva autoridad sobre DEC-005 y
retention/disposition; Dirección TI sobre DEC-013
IdP/sessions/roles/break-glass y DEC-014 incident detection/support; Dirección
Médica sobre DEC-002 episode closure; Dirección de Enfermería conserva DEC-017
como decisión operativa separada; DEC-016 mantiene su gate de piloto. Son
dependency authorities, no coapprovers de DEC-015. Aprobar DEC-015 no aprueba
ninguno de esos ámbitos ni autoriza pacientes/datos reales.

Estado:

- `Decision pack document status = FINAL`;
- `Canonical DEC-015 status = Pendiente`;
- `Primary authority = Dirección de Enfermería`;
- `Canonical REQ-14 status = Pendiente de protocolo local`;
- `REQ-14 technical implementation tracking = No implementado`;
- `REQ-14 technical validation tracking = No validado`;
- `CONTINGENCIA DESACTIVADA`;
- `Current gate = READY_FOR_INSTITUTIONAL_DECISION`.

Tras una aprobación formal para plan version y approved capability scope
concretos todavía se requiere:

```text
READY_FOR_TECHNICAL_SPECIFICATION
→ continuity + clinical safety + infrastructure design review
→ restore and reconciliation threat model
→ READY_FOR_IMPLEMENTATION
```

Hasta entonces no debe abrirse una rama de contingency mode.
