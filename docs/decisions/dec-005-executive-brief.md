# Qué debe decidir el Responsable del Tratamiento antes de utilizar datos reales y fijar su ciclo de vida

## Autoridad

`DEC-005 PRIMARY APPROVER = Responsable del Tratamiento`.

DPO/DPD, privacidad, jurídico, seguridad y records management son funciones
consultivas. Dirección Médica, Dirección de Enfermería y Dirección TI también
pueden aportar consulta y son autoridad únicamente de sus decisiones
dependientes. Una dependencia puede bloquear un scope de DEC-005; nunca
convierte a su autoridad en coaprobadora de DEC-005.

## Qué conserva hoy Guardián

El demo usa exclusivamente datos sintéticos. PostgreSQL contiene cuentas,
sesiones, paciente seudónimo, episodios, políticas y autorizaciones, Plan de
Seguridad, check-ins, reglas/evaluaciones/avisos, tareas, cuidador, Domicilio
Seguro y auditoría. Gran parte de la historia es versionada o append-only.

Las 113 relaciones Prisma usan `onDelete: Restrict`. No existe hard-delete
productivo, cascade, archivo, purge job, retention scheduler o rights workflow.
Los logout revocan sesiones y expiran cookies; no borran filas.

## Por qué no hay una política definitiva

Los invariantes actuales protegen trazabilidad técnica, pero no deciden:

- qué clase es un registro clínico, jurídico, técnico o temporal;
- desde qué evento se computa retención;
- qué criterio o periodo aplica;
- qué se archiva, elimina, anonimiza o preserva;
- qué derechos son aplicables y con qué excepciones;
- qué ocurre con terceros, exports, incidents y backups.

Esas decisiones requieren al Responsable del Tratamiento y la evidencia
jurídica/institucional aplicable. El software no puede escogerlas.

## Distinciones críticas

- revoke bloquea acceso futuro; no elimina historia;
- withdrawal of consent no determina por sí solo todos los tratamientos;
- closed episode no significa delete ni inicia automáticamente un reloj;
- pseudonymous ID no significa anonymous;
- append-only no significa retain forever;
- SBAR es transferencia asistencial, no access/portability package;
- archive no es backup;
- erasure no es unconditional hard-delete.

## Clases que necesitan política

El approved scope usa el mismo catálogo estable que el inventario, la lifecycle
matrix y la legal applicability matrix:

- DC-01 Identity and account; DC-02 Session evidence;
- DC-03 Patient identity link; DC-04 Identity verification configuration;
- DC-05 Episode and timeline;
- DC-06 Participation policy configuration; DC-07 Participation and
  authorization evidence;
- DC-08 Safety Plan; DC-09 Home Safety;
- DC-10 Check-in configuration; DC-11 Check-in interaction evidence;
- DC-12 Rule configuration; DC-13 Rule evaluation and alert evidence;
- DC-14 Task workflow;
- DC-15 Caregiver access and session evidence; DC-16 Caregiver contribution;
  DC-17 Caregiver access audit;
- DC-18 Technical AuditEvent; DC-19 Governance evidence projections;
- DC-20 SBAR preview; DC-21 Browser print/download copy; DC-22 Safety Plan PDF
  candidate; DC-23 Rights access export; DC-24 Portability package; DC-25
  Institutional report;
- DC-26 Operational telemetry; DC-27 Incident/support evidence;
- DC-28 Downstream copies; DC-29 Backup/restore copies.

Cada clase necesita source of truth, propósito, trigger, criterio, archive,
disposition, rights assessment, exceptions y evidence.

Cada ID debe marcarse individualmente `IN_SCOPE`, `EXCLUDED` o `DEFERRED`; una
omisión permanece `DEFERRED`. El catálogo es técnico y no decide si un objeto es
historia clínica, clase legal de registro o categoría de retención. Tampoco usa
una escala ordinal de sensibilidad.

## Rights workflows

Acceso, rectificación, restricción/oposición, supresión y portabilidad necesitan
identity/representation verification, scope, data discovery, legal/institutional
review, third-party review, decision, fulfillment, secure delivery and evidence.

DEC-013 aporta identidad técnica futura, pero login no prueba representación
legal. DEC-004 gobierna caregiver authorization. Guardián no debe duplicar una
plataforma institucional de privacidad o records management que ya sea source of
truth.

## Exports create copies

Hoy solo existe un preview SBAR efímero, imprimible desde el navegador y auditado
como generación. No hay PDF server-side, download, envío, access export o
portability package. Si una persona imprime o guarda, aparece una copia fuera del
control server-side.

DEC-012 decide campos y destino del SBAR. DEC-005 debe decidir generación,
autorización, storage, expiry, delivery, download evidence y disposición de la
copia.

Salir del control server-side no elimina la necesidad de una política
institucional de generación, autorización y entrega. Guardián tampoco puede
revocar técnicamente una copia ya exportada. SBAR, rights access export,
portability package, institutional report, incident evidence, browser
print/download y backup conservan boundaries separados.

## Dependencias

- DEC-002: closure, no retention trigger automático;
- DEC-003/004: participación y cuidador;
- DEC-012: SBAR;
- DEC-013: identity/access;
- DEC-014: incident semantics and sanitization;
- DEC-015: backup/continuity;
- DEC-016: final gate para pacientes y datos reales.

## Qué debe aprobarse

Una aprobación válida identifica policy version, approved data-class scope,
purpose/record role, trigger, criterion/reference, archive/disposition, rights,
exports, holds, evidence reference, effective/review dates, dependencies,
exclusions and unresolved blockers.

Una clase aprobada no aprueba las demás. Los periodos permanecen
`INSTITUTIONAL_VALUE_REQUIRED` hasta evidencia formal.

`NOT_APPLICABLE_TECHNICALLY` no significa `LEGALLY_NOT_APPLICABLE`: una
proyección no persistida o artefacto inexistente carece de source independiente,
pero sus fuentes y cualquier copia futura siguen sujetos a la evaluación
aplicable.

## Qué ocurre después

El paquete está documentalmente `FINAL` y
`READY_FOR_INSTITUTIONAL_DECISION`; DEC-005 continúa `Pendiente`.

Por tanto, todos los datos reales siguen bloqueados. Una futura aprobación
scoped solo podría desbloquear clases y propósitos explícitamente `IN_SCOPE`,
aprobados, versionados y respaldados por evidencia. Todo `EXCLUDED`, `DEFERRED`,
omitido o no resuelto continúa bloqueado.

Una aprobación institucional no autoriza directamente un purge, cascade,
anonymization, rights endpoint, stored export o scheduler:

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ privacy + data architecture review
→ relational integrity / deletion / export threat model
→ migration + rollback design when applicable
→ READY_FOR_IMPLEMENTATION
```

DEC-016 sigue siendo el gate final para usar pacientes o datos reales.
