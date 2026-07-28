# DEC-015 — Agenda de workshop con Dirección de Enfermería

## Objetivo

Workshop de aproximadamente 60 minutos para completar o acotar el minimum
blocking decision set de DEC-015 y producir un workbook con plan version,
approved capability scope, evidencia faltante y siguiente gate.

El workshop no cambia por sí solo:

- `Canonical DEC-015 status = Pendiente`;
- `Primary authority = Dirección de Enfermería`;
- `Canonical REQ-14 status = Pendiente de protocolo local`;
- `REQ-14 technical implementation tracking = No implementado`;
- `REQ-14 technical validation tracking = No validado`;
- `CONTINGENCIA DESACTIVADA`.

No se seleccionarán por conveniencia técnica RTO, RPO, backup/restore technology,
campos clínicos, contactos, canales o procedimientos asistenciales.

## Participantes por función

- Dirección de Enfermería — autoridad primaria;
- responsables asistenciales — consulta de workflow y human factors;
- Dirección Médica — consulta cuando una opción afecta contenido/uso clínico;
- Dirección TI, infraestructura, arquitectura y operaciones — baseline,
  recovery, dependencias y factibilidad;
- seguridad — acceso, dispositivos, copias y restore;
- Responsable del Tratamiento y DPO/DPD — lifecycle, privacidad y datos;
- owners de DEC-002/005/013/014/017/016 cuando se afecte su ámbito.

La participación consultiva no convierte a otra función en coautoridad de
DEC-015. Dirección TI conserva autoridad sobre DEC-013/014, el Responsable del
Tratamiento sobre DEC-005, Dirección Médica sobre DEC-002 y Dirección de
Enfermería sobre la decisión operativa separada DEC-017. Estas dependencias
pueden bloquear scopes, pero `DEC-015 PRIMARY AUTHORITY` continúa siendo
Dirección de Enfermería. No registrar nombres o contactos reales.

## Preparación

Distribuir:

- [resumen ejecutivo](dec-015-executive-brief.md);
- [paquete completo](dec-015-continuity-decision-pack.md);
- [matriz neutral de opciones](dec-015-option-matrix.md);
- [formulario](dec-015-decision-form.md).

Solicitar solo referencias versionadas, no copias sensibles, del plan de
continuidad, BIA, arquitectura de backup/restore, IAM, incident operations,
procedimientos manuales y ejercicios existentes. Identificar qué evidencia
pertenece a Guardián y qué pertenece a la institución.

## Agenda — 60 minutos

### 0–3 min — 1. Baseline

- Health técnico responde sin comprobar PostgreSQL.
- No hay readiness/liveness separados, contingency/offline mode, backup,
  restore, failover, read replica o reconciliation.
- Las rutas DB fallan con error sanitizado y sin fallback de datos.

### 3–7 min — 2. Failure scenarios

- Revisar DB down, app down, ambos, IdP, red cliente, dependencia, fallo parcial,
  read-only DB, stale cache, restore y migration mismatch.
- Distinguir hechos del repositorio de capacidades institucionales externas.

### 7–10 min — 3. Trigger

- Resolver DEC-015-A.
- Separar application error, degradation, incident candidate, incident,
  contingency candidate y contingency activation.
- No seleccionar thresholds sin evidencia.

### 10–13 min — 4. Activation authority

- Resolver DEC-015-B.
- Definir quién recomienda, quién declara, suplencia y evidencia.
- Confirmar que detection no ejecuta activación clínica automática.

### 13–16 min — 5. Scope

- Resolver DEC-015-C.
- Marcar global/unidad/servicio/módulo/dependencia/población o custom.
- No asumir soporte de scope que Guardián no implementa.

### 16–20 min — 6. Allowed / blocked functions

- Resolver DEC-015-D/E por Episode, Safety Plan, check-ins, Alerts, Tasks,
  caregiver, SBAR, audit, identity y support.
- Usar `ALLOWED / READ_ONLY / BLOCKED / NOT_APPLICABLE`.
- Identificar freshness/auth/consistency/policy/audit preconditions.

### 20–23 min — 7. Minimum dataset

- Resolver DEC-015-F/G.
- Elegir entre no local dataset, external institutional source, approved minimal
  read-only view u otro mecanismo.
- Definir source/version, `generatedAt`, last sync, staleness y expiry sin
  seleccionar campos clínicos en el workshop.

### 23–26 min — 8. Identity during outage

- Resolver el scope DEC-015-H bajo autoridad de Dirección de Enfermería y
  registrar DEC-013/Dirección TI como dependencia de IAM.
- Revisar IdP available/unavailable, sesiones existentes y assurance.
- Confirmar prohibición de shared credentials, demo fallback, universal password
  y anonymous clinical access.

### 26–29 min — 9. Writes during outage

- Resolver DEC-015-I.
- Comparar `NO_WRITES`, workflow manual, sistema externo, cola aprobada u otro.
- Si se considera captura temporal, registrar blockers de encryption, identity,
  ordering, conflict, replay, audit, expiry y reconciliation.

### 29–33 min — 10. Restore

- Resolver DEC-015-K/O.
- Separar backup creation, integrity, restore test, execution e integrity review.
- Revisar schema/migrations, constraints, histories, revisions, policies e IAM.
- Separar `CLINICAL_WORKFLOW_CONSISTENCY`,
  `AUTHORIZATION_CONSISTENCY` y `SESSION_EPHEMERAL_SECURITY_STATE`.
- Confirmar que restaurar datos clínicos no obliga a restaurar sesiones activas;
  invalidar/reautenticar es una opción no preseleccionada.

### 33–37 min — 11. Reconciliation

- Resolver DEC-015-J.
- Definir verificación, duplicate prevention, idempotency, ordering, provenance,
  actor y timestamps.
- Prohibir silent last-write-wins.

### 37–40 min — 12. RTO

- Resolver DEC-015-M por capability.
- Usar `INSTITUTIONAL_VALUE_REQUIRED` mientras falte evidencia.
- Separar RTO target de actual recovery time y SLA.
- Confirmar que aprobar RTO no es prerequisite universal de un restore test.

### 40–43 min — 13. RPO

- Resolver DEC-015-N por consistency domain/capability.
- Separar RPO target de actual recovery point, backup age y retention.
- Definir el consistency boundary aplicable sin presumir un recovery point
  atómico común.
- Confirmar que el target RPO no es prerequisite universal del acto técnico de
  restore.

### 43–46 min — 14. Backup dependencies

- Completar DEC-015-O/P y su frontera con DEC-005.
- Identificar coverage, operator role, access, encryption, immutability,
  ubicación y evidencia sin seleccionar tecnología.
- Revisar reaparición de datos dispuestos tras restore.

### 46–49 min — 15. Release to normal

- Resolver DEC-015-L.
- Separar technical restore, integrity, reconciliation, operational readiness y
  autorización de Dirección de Enfermería.
- Definir release parcial/reversal si aplica.
- Derivar blockers solo de capabilities `IN_SCOPE`; todo scope
  `EXCLUDED / DEFERRED / OMITTED` permanece deshabilitado.

### 49–53 min — 16. Testing

- Resolver DEC-015-Q/R.
- Elegir categorías de tabletop, restore, application recovery, workflow y
  reconciliation exercise.
- Confirmar datos sintéticos, entorno aislado, fallo controlado y reset.
- Definir mensajes, blocked actions y staleness sin contactos reales.

### 53–56 min — 17. Approved capability scope

- Marcar cada capability `IN_SCOPE / EXCLUDED / DEFERRED`.
- Confirmar que restore no aprueba offline dataset y RTO/RPO no aprueba writes.
- Registrar plan version, evidence, effective/review dates y blockers.

### 56–60 min — 18. Next gate

- Revisar contradicciones y dependencias DEC-002/005/013/014/017/016.
- Confirmar qué evidencia falta y quién la aporta por función.
- Mantener `Pendiente` hasta aprobación formal.
- Registrar como máximo `READY_FOR_INSTITUTIONAL_DECISION`.

## Preguntas de control

1. ¿El health actual podría ocultar una DB no ready?
2. ¿Qué evidencia convierte una degradación en contingency candidate?
3. ¿Puede demostrarse freshness y autorización para cada lectura?
4. ¿Qué continuidad asistencial existe si se prohíben writes digitales?
5. ¿Cómo se evita que una copia se trate como source of truth?
6. ¿Cómo se identifica un recovery point consistente?
7. ¿Qué debe ocurrir con datos dispuestos que reaparecen tras restore?
8. ¿Quién separa technical recovery de operational release?
9. ¿Qué ejercicio prueba realmente restore y reconciliation?
10. ¿Qué scopes siguen bloqueados aunque otro scope sea aprobado?

## Criterio de salida

El workshop es satisfactorio cuando:

- cada blocker del scope está resuelto o vinculado a evidencia faltante;
- no se ha inventado RTO/RPO, tecnología, campo, canal o procedimiento;
- trigger, autoridad, scope, allowed/blocked functions y freshness son
  inequívocos;
- identity, writes, restore, reconciliation y release conservan revisión humana;
- cada capability tiene inclusión/exclusión/diferido explícito;
- no existen selecciones contradictorias;
- la relación con las decisiones dependientes conserva sus autoridades;
- el siguiente gate es inequívoco.

No recomendar ni reservar una rama de contingency mode al cerrar la reunión:

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / DEC-015 approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ continuity + clinical safety + infrastructure design review
→ restore and reconciliation threat model
→ READY_FOR_IMPLEMENTATION
```
