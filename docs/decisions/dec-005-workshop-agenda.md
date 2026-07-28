# DEC-005 — Agenda de workshop institucional

## Propósito y resultado esperado

Workshop de 60 minutos para que el Responsable del Tratamiento, como autoridad
primaria, resuelva o acote las decisiones necesarias por clase de datos. Las
funciones consultivas aportan evidencia dentro de su competencia; no se
convierten en coautoridad canónica de DEC-005.

```text
DEC-005 PRIMARY APPROVER = Responsable del Tratamiento
```

Resultado esperado: workbook DEC-005 con policy version, approved data-class
scope, opciones, evidencia, exclusiones, dependencias y blockers. La reunión no
cambia por sí sola `Canonical DEC-005 status = Pendiente`.

## Participantes por función

- Responsable del Tratamiento — autoridad primaria;
- DPO/DPD, privacidad y asesoría jurídica — consulta cuando corresponda;
- Dirección Médica y Dirección de Enfermería — autoridad sobre decisiones
  clínicas/protocolarias dependientes y función consultiva para DEC-005;
- Dirección TI y seguridad — integridad, acceso, export y enforcement;
- records management — conservación, archivo y disposición institucional;
- producto/arquitectura — baseline, dependencias y gate técnico.

No registrar nombres, firmas, contactos o datos reales en el repositorio.

Las dependency authorities conservan competencia únicamente sobre sus
decisiones:

- DEC-001/002 y DEC-012 — Dirección Médica;
- DEC-003/004 — Responsable del Tratamiento;
- DEC-013/014 — Dirección TI;
- DEC-015 — Dirección de Enfermería;
- DEC-016 — Gerencia del Hospital como Responsable del Tratamiento.

Su evidencia puede bloquear scope, pero no las convierte en aprobadoras de
DEC-005.

## Preparación previa

Distribuir:

- [executive brief](dec-005-executive-brief.md);
- [decision pack](dec-005-data-lifecycle-decision-pack.md);
- [option matrix](dec-005-option-matrix.md);
- [decision form](dec-005-decision-form.md).

Solicitar referencias versionadas de inventario institucional, políticas,
evaluación aplicable, records schedule, derechos, terceros, exports, incidentes y
backup. No copiar contenido sensible o datos reales al repositorio.

## Agenda — 60 minutos

### 0–3 min — 1. Authority and scope

- Confirmar Responsable del Tratamiento como autoridad primaria.
- Definir organización, policy version y clases candidatas in-scope.
- Confirmar que no se seleccionarán valores jurídicos por conveniencia técnica.

### 3–7 min — 2. Real inventory

- Revisar los 45 modelos persistentes y las clases no persistidas.
- Confirmar ausencias: archivo, purge, scheduler, rights workflow, stored export
  y backup gobernado.
- Distinguir fixtures sintéticos de production disposition.

### 7–11 min — 3. Data classes

- Resolver DEC-005-A.
- Revisar uno por uno los IDs `DC-01` a `DC-29` del catálogo canónico.
- Marcar cada clase `IN_SCOPE / EXCLUDED / DEFERRED`; una omisión se trata como
  `DEFERRED`.
- Identificar clases institucionales que no aparecen en el repositorio.

### 11–15 min — 4. Purpose and source of truth

- Resolver DEC-005-B.
- Separar source of truth, projection, export, cache y audit reference.
- No clasificar todo o nada como historia clínica.

### 15–19 min — 5. Retention triggers

- Resolver DEC-005-C por clase.
- Evaluar candidatos: creation, closure, end of care, last interaction,
  revocation, supersession, incident closure y export creation.
- Confirmar que episode closure no es trigger por defecto.

### 19–23 min — 6. Retention criteria

- Resolver DEC-005-D.
- Registrar criterio o referencia; cualquier valor pendiente queda
  `INSTITUTIONAL_VALUE_REQUIRED`.
- No introducir periodos generales o defaults legales.

### 23–26 min — 7. Archive

- Resolver DEC-005-E.
- Definir read-only, separación operativa, acceso, búsqueda, integridad,
  entrada/salida y evidencia.
- Mantener archive separado de backup.

### 26–30 min — 8. Deletion / disposition

- Resolver DEC-005-F.
- Evaluar hard-delete, deactivation, tombstone, anonymization, external archive
  u otra opción por clase.
- Registrar `DELETION_DESIGN_REVIEW_REQUIRED`.

### 30–33 min — 9. Pseudonymization / anonymization

- Resolver DEC-005-G.
- Confirmar que UUID, cuid, hash y pseudonymous ID no son anónimos por defecto.
- Si se contempla anonimización, exigir método, irreversibilidad y assessment.

### 33–38 min — 10. Rights workflows

- Resolver DEC-005-I/J/K/L/M.
- Separar access, rectification, restriction/objection, erasure and portability.
- Confirmar identity/representation, scope, discovery, review, fulfillment,
  delivery y evidence.

### 38–41 min — 11. Third parties / caregiver

- Resolver DEC-005-O.
- Distinguir authorization, session, contribution y legal/access evidence.
- Definir `THIRD_PARTY_REVIEW_REQUIRED` cuando corresponda.

### 41–44 min — 12. SBAR and exports

- Resolver DEC-005-N.
- Separar SBAR, access copy, portability package, institutional report,
  incident evidence, browser print/download, support artifact y backup.
- Definir generación, storage, expiry, delivery, download evidence y límites.
- Confirmar que una copia fuera del control server-side sigue requiriendo
  política de generación, autorización y entrega, y que Guardián no puede
  revocarla técnicamente una vez exportada.

### 44–47 min — 13. Logs, audit and incidents

- Revisar `AuditEvent`, runtime log y artefactos DEC-014.
- No tratar log, metric, trace, incident, support ticket o postmortem como una
  clase única.
- Resolver retention/disposition aplicable sin copiar contenido clínico.

### 47–50 min — 14. Backups

- Resolver DEC-005-Q con DEC-015.
- Cubrir retention, immutable copies, access, encryption, restore resurrection,
  disposition replay y evidence.
- No decidir RTO/RPO en DEC-005.

### 50–52 min — 15. Holds / exceptions

- Resolver DEC-005-H.
- Definir autoridad, scope y evidencia de inicio/fin.
- No convertir categorías candidatas en procedimiento jurídico automático.

### 52–55 min — 16. Approved scope

- Revisar todas las clases incluidas, excluidas y diferidas.
- Confirmar policy version, effective/review dates y evidence reference.
- Comprobar ausencia de opciones contradictorias.

### 55–60 min — 17. Next gate

- Revisar minimum blocking set por outcome.
- Decidir enforcement posture DEC-005-R sin autorizar implementación.
- Confirmar blockers de DEC-002/004/012/013/014/015/016.
- Confirmar que DEC-005 `Pendiente` bloquea todos los datos reales y que una
  futura aprobación scoped solo desbloquea clases y propósitos `IN_SCOPE`,
  aprobados, versionados y respaldados por evidencia.
- Confirmar `READY_FOR_INSTITUTIONAL_DECISION` hasta evidencia formal.

## Preguntas de control

1. ¿Puede explicarse por qué un registro sería elegible hoy sin heurística
   oculta?
2. ¿Se ha confundido expiry/revocation/closure con deletion?
3. ¿Cada projection hereda el lifecycle de una source identificada?
4. ¿Cada export crea una copia con lifecycle definido?
5. ¿Una rights request verifica identidad y representación, no solo login?
6. ¿La rectificación preserva trazabilidad?
7. ¿Se contempla restore resurrection?
8. ¿Existe sistema institucional que deba ser source of truth?
9. ¿Los diferidos permanecen realmente bloqueados?

## Criterio de salida

El workshop es satisfactorio si:

- autoridad, policy version y approved scope son inequívocos;
- cada clase en scope tiene propósito, trigger, criterio, disposition y rights
  assessment o blocker explícito;
- exports, terceros, incidents y backups están separados;
- no se han seleccionado periodos, excepciones, formatos o herramientas sin
  evidencia;
- las funciones consultivas y dependencias conservan su autoridad;
- el siguiente gate es inequívoco.

No abrir una rama de implementación. Primero:

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ privacy + data architecture review
→ relational integrity / deletion / export threat model
→ migration + rollback design when applicable
→ READY_FOR_IMPLEMENTATION
```
