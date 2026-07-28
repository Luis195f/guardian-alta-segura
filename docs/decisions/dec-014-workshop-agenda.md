# DEC-014 — Agenda de workshop con Dirección TI

## Objetivo

Reunión de 45–60 minutos para resolver o acotar el conjunto mínimo de decisiones
que bloquea soporte e incident management productivos y una futura especificación
de observabilidad sanitizada.

Resultado esperado: workbook DEC-014 con estado de trabajo explícito, scope,
evidencia pendiente y siguiente gate. El workshop no cambia por sí solo
`Canonical DEC-014 status = Pendiente`.

El scope debe marcar por separado `OBSERVABILITY_FOUNDATION`,
`INCIDENT_CANDIDATE_DETECTION`, `OPERATIONAL_ALERTING_ESCALATION` e
`INCIDENT_MANAGEMENT_SUPPORT`. DEC-014 permanece como una única decisión
canónica.

## Participantes por función

- Dirección TI — autoridad primaria;
- arquitectura/SRE — baseline y opciones técnicas;
- security governance — consultiva en eventos y acceso;
- Responsable del Tratamiento o DPO/DPD — cuando proceda en privacidad;
- autoridad/proceso clínico competente — consultiva solo para el handoff por
  posible impacto asistencial;
- operación de soporte — aporta workflow institucional.

No registrar nombres ni contactos reales en los artefactos del repositorio.

## Preparación

Distribuir:

- [resumen ejecutivo](dec-014-executive-brief.md);
- [paquete completo](dec-014-incident-operations-decision-pack.md);
- [matriz de opciones](dec-014-option-matrix.md);
- [formulario](dec-014-decision-form.md).

Solicitar referencias versionadas del procedimiento de incidentes, matriz de
acceso, clasificación de datos, política de retención, sistema institucional de
soporte y handoffs existentes. No copiar su contenido sensible al repositorio.

## Agenda

### 1. Apertura y límites — 3 minutos

- Confirmar autoridad, alcance y evidencia válida.
- Confirmar que no se elegirán herramientas, vendors, teléfonos o canales reales.
- Recordar `technical incident ≠ clinical deterioration`.

### 2. Baseline real — 5 minutos

- Error público: code, mensaje estable y correlation ID.
- Log runtime: level, code, component y correlation ID.
- AuditEvent append-only para mutaciones; no es log ni incidente.
- Health superficial y métricas funcionales de cola.
- Ausencias: readiness, exporter, tracing, SLO, operational alerts e incident
  workflow.

### 3. Definición error → candidato → incidente — 5 minutos

- Resolver DEC-014-A.
- Confirmar si incident detection o incident management están en scope; A no
  bloquea una foundation limitada a hechos técnicos.
- Separar error transitorio, degradación, dependencia, integridad, security y
  privacy.
- Identificar quién confirma un incidente y con qué evidencia.

### 4. Taxonomía y severidad técnica — 5 minutos

- Resolver o diferir explícitamente DEC-014-B/C.
- Si se usan categorías/niveles, registrar definiciones, versionado y autoridad.
- Prohibir que diagnosis, patient condition, clinical Alert o suicide risk sean
  inputs.

### 5. Sanitización e identificadores — 8 minutos

- Resolver DEC-014-E/F por artefacto.
- Revisar patient/professional/episode IDs, correlation ID, IP y user agent.
- Confirmar prohibición de texto clínico, Task/Alert/Plan/check-in, secretos,
  tokens, cookies y Authorization.
- Acordar evidencia de pruebas con payload sintético.

### 6. Acceso y segregación — 5 minutos

- Resolver DEC-014-G.
- Separar admin, support, security, privacy y profesional clínico.
- Decidir lectura, búsqueda, exportación, grant, caducidad, review y break-glass.
- Identificar dependencia con DEC-013.

### 7. Lifecycle — 4 minutos

- Resolver DEC-014-H.
- Definir creación, triage, investigación, mitigación, resolución, cierre,
  reapertura y duplicados.
- Acordar evidencia por transición sin aceptar nombres ilustrativos por defecto.

### 8. Escalado y comunicación — 5 minutos

- Resolver DEC-014-I/J.
- Definir condición, función destinataria, acknowledgement y fallback.
- No fijar tiempos ni on-call sin evidencia.
- Mantener separado el escalado de tareas DEC-017 y cualquier escalado clínico.

### 9. Handoffs — 5 minutos

- DEC-014-K: TI identifica posible impacto; autoridad clínica decide respuesta.
- DEC-014-L: definir frontera con security/privacy sin conclusiones jurídicas.
- Registrar `CONSULTATIVE_AUTHORITY_REQUIRED` donde falte autoridad.

### 10. Evidencia, retención y aprendizaje — 4 minutos

- Resolver DEC-014-M/N para el scope.
- Determinar source of truth institucional sin duplicar ITSM.
- Separar necesidad de evidencia de retención definitiva DEC-005.
- Decidir si RCA/postmortem es blocker o puede diferirse.

### 11. Observability gate y cierre — 4 minutos

- Revisar blockers por capacidad: foundation = scope de telemetría + E/F/G/M
  aplicable; detection = A/D/E/F/G/M aplicable; escalation = I/E/F/G/M aplicable
  y J cuando haya comunicación; incident management = A/E/F/G/H/M, I/J si
  incluye escalado/comunicación y K/L según los handoffs incluidos.
- Confirmar que B/C son condicionales al uso de taxonomía/severidad.
- Registrar exclusions, unresolved items, policy version, approved scope,
  effective date y evidence reference.
- Confirmar que DEC-014 sigue `Pendiente` hasta aprobación formal.
- Confirmar el siguiente gate.

## Preguntas de control

1. ¿Puede una persona de soporte investigar sin acceder a clinical text?
2. ¿Qué identificador permite correlación sin convertirse en un patient key?
3. ¿Qué sucede cuando la evidencia técnica sugiere posible impacto asistencial?
4. ¿Quién recibe un security/privacy handoff y dónde queda la decisión?
5. ¿Qué outputs inspeccionan realmente las pruebas de sanitización?
6. ¿Existe ITSM institucional que deba ser la source of truth?
7. ¿Qué queda bloqueado si DEC-005 o DEC-013 siguen pendientes?

## Criterio de salida

El workshop es satisfactorio si:

- cada blocker del scope está resuelto o marcado con evidencia faltante;
- no se ha elegido una taxonomía, nivel o tiempo por conveniencia técnica;
- la matriz de sanitización e identificadores es inequívoca;
- acceso, lifecycle, handoffs y source of truth están acotados;
- las autoridades consultivas están identificadas;
- los diferidos tienen exclusión explícita;
- no hay opciones contradictorias;
- el siguiente gate es inequívoco.

No reservar una rama de implementación al terminar la reunión. Primero se
requiere aprobación institucional versionada y después una especificación
capability-scoped:

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ observability + security architecture review
→ READY_FOR_IMPLEMENTATION
```
