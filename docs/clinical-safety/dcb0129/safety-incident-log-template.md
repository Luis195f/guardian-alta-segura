# Plantilla controlada del Safety Incident Management Log — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**
> `TEMPLATE ONLY / EMPTY LOG / NOT_OPERATIONAL`
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`
> `RISK ACCEPTABILITY CRITERIA = NO APROBADOS`
> `RESIDUAL RISK ACCEPTANCE = NINGUNA`
> `REAL PILOT = NO_GO`

## 1. Control documental

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-SIML-TEMPLATE-INITIAL-001` |
| Versión | `0.1-draft` |
| Fecha de corte | 2026-08-01 |
| Rama | `docs/clinical-risk-management-plan` |
| Commit base | `4d120c5a46c9e72fdf15279462db3a64350583d8` |
| Estado documental | `DRAFT / PENDING_APPROVAL` |
| Estado operacional | `NOT_OPERATIONAL / INSTITUTIONAL_APPROVAL REQUIRED` |
| Contenido real | Ningún incidente; solo diccionario y ejemplo de esquema sintético |
| Clasificación | `DOCUMENTED_CONTROL_ONLY` |

Esta plantilla no establece un Safety Incident Management Log operativo, no
registra incidentes y no sustituye al
[Safety Incident Management Plan](safety-incident-management-plan-initial.md).
No declara cumplimiento DCB0129/DCB0160 ni autoriza piloto, producción o uso
clínico.

## 2. Reglas de uso

1. Instanciar únicamente después de aprobar proceso, canal, system of record,
   roles, acceso, retención, sanitización y autoridades.
2. Un error técnico no se registra automáticamente como incidente clínico; el
   triage humano determina si existe vía clínica.
3. Usar ID estable y conservar toda transición/corrección/reapertura; nunca
   sobrescribir historia.
4. Registrar hechos observables, incertidumbre y decisiones por referencia.
5. No inventar severidad, score, probabilidad, SLA, umbral, periodicidad,
   autoridad, obligación externa o canal.
6. No cerrar automáticamente. La autoridad de cierre debe estar formalmente
   definida y evidenciada.
7. No incluir nombres, documentos de identidad, números de historia clínica,
   diagnósticos identificables, texto libre clínico real, teléfonos, correos,
   direcciones, credenciales, tokens, secretos ni PHI/PII real.
8. Las referencias de auditoría contienen metadatos técnicos minimizados, nunca
   contenido clínico.

## 3. Diccionario controlado de campos

| Campo | Obligación/formato propuesto | Regla de minimización y validación | Estado inicial permitido |
| --- | --- | --- | --- |
| `recordClassification` | Marcador de registro | En esta plantilla solo `SYNTHETIC_SCHEMA_EXAMPLE / NOT AN INCIDENT` | Obligatorio para el ejemplo |
| `incidentId` | ID estable bajo convención institucional futura | No codificar paciente, hospital, fecha clínica o identidad | `UNASSIGNED` hasta recepción real autorizada |
| `receivedAt` | Fecha/hora de recepción con zona inequívoca | No inferir hora del evento clínico | `NOT_RECORDED` |
| `source` | Tipo de fuente allowlisted | Sin identidad directa ni canal inventado | `NOT_RECORDED` |
| `reporterRole` | Rol/función del reportante | Sin nombre, correo, teléfono o identificador innecesario | `NOT_RECORDED` |
| `affectedReleaseConfiguration` | Commit/release/schema/config/dependency | Referencias técnicas controladas, sin secretos | `NOT_RECORDED` |
| `functionWorkflow` | Función/workflow afectado | Catálogo versionado futuro; no texto clínico | `NOT_RECORDED` |
| `sanitizedDescription` | Hechos técnicos sanitizados | Sin payload, diagnosis, note, Task summary, Alert explanation o PII | `NOT_RECORDED` |
| `patientAffected` | `UNKNOWN / NONE / POSSIBLE / CONFIRMED` | Sin identificadores; `CONFIRMED` exige proceso competente | `UNKNOWN` |
| `potentialClinicalPathway` | Posible secuencia hacia daño/deterioro | `PENDING_HUMAN_REVIEW` hasta análisis competente | `PENDING_HUMAN_REVIEW` |
| `harmOrNearMiss` | Daño, near miss o ninguno, pendiente de revisión | No diagnosticar ni copiar detalle clínico | `PENDING_HUMAN_REVIEW` |
| `preliminaryClassification` | Incidente safety/técnico/security/queja/señal/defecto/datos/disponibilidad/local/por determinar | Solo triage humano; no escala de severidad | `PENDING_HUMAN_TRIAGE` |
| `relatedHazards` | IDs `HAZ-GAS-*` o hazard nuevo propuesto | No cerrar ni estimar hazard desde esta celda | `NOT_LINKED` |
| `preservedEvidence` | Referencias controladas a evidencia | Sin copiar PHI/PII, secretos o contenido clínico | `NOT_LINKED` |
| `containment` | Acción/decisión de contención y autoridad | Separar técnica de clínica; no ejecutar sin autoridad | `NOT_APPLIED` |
| `proposedOwner` | Función propuesta, no nombre | No implica assignment/acceptance | `NOT_ASSIGNED` |
| `status` | Estado del proceso aprobado futuro | En esta plantilla no usar `APPROVED`/`CLOSED` | `DRAFT_RECORD` |
| `investigation` | Referencia/resultados sanitizados | Causas múltiples y uncertainties; sin texto clínico | `NOT_STARTED` |
| `causes` | Causa(s) y contributing factors | Separar técnica, clínica, humana, workflow, entorno, interfaz, dependencia, configuración, formación y uso previsible | `NOT_DETERMINED` |
| `actions` | Acciones con owner, dependencia y evidencia | No acción clínica automática; vincular CAPA futura si existe | `NONE_RECORDED` |
| `associatedChanges` | Change/defect/release references | Preservar baseline/rollback; no borrar historia | `NONE_RECORDED` |
| `verification` | Pruebas y resultado | Técnica ≠ efectividad clínica | `NOT_PERFORMED` |
| `hazardLogUpdate` | Versión/cambio o justificación | Requiere CSO según proceso; no editar history | `PENDING_REVIEW` |
| `safetyCaseUpdate` | Versión/cambio o justificación | Revisar validez de claims/controls | `PENDING_REVIEW` |
| `deployerCommunication` | Referencia a comunicación autorizada | Desplegador no identificado; no inventar canal | `NOT_APPLICABLE_CURRENTLY` |
| `externalNotificationAssessment` | Aplicabilidad, autoridad y decisión | No afirmar obligación/plazo/destino sin determinación | `NOT_DETERMINED` |
| `closureAuthority` | Función/persona autorizada por referencia | No existe hoy; sin cierre automático | `NOT_ASSIGNED` |
| `closedAt` | Fecha/hora de cierre formal | Solo tras criterios completos y aprobación | `NOT_CLOSED` |
| `reopeningReason` | Nueva evidencia/recurrencia/fallo de control/etc. | Nueva entrada append-only; no sobrescribe cierre previo | `NOT_REOPENED` |
| `auditReferences` | IDs técnicos permitidos de `AuditEvent`/correlation/evidence | Sin contenido clínico; acceso/retención pendientes | `NONE_RECORDED` |
| `uncertainties` | Hechos no demostrados y limitaciones | No resolver por inferencia o valor por defecto | `NOT_ASSESSED` |
| `lastReviewedByFunction` | Función revisora, no identidad si no es necesaria | Autoridad y evidencia requeridas | `NOT_REVIEWED` |

## 4. Esquema de una fila lógica

Una implementación futura debe almacenar una fila lógica append-only o un
registro versionado equivalente. La disposición física depende del system of
record aprobado; no se diseña schema de producción en esta rama.

```text
incidentId
  + reception/source/reporterRole
  + affectedReleaseConfiguration/functionWorkflow/sanitizedDescription
  + patientAffected/potentialClinicalPathway/harmOrNearMiss
  + preliminaryClassification/relatedHazards/preservedEvidence
  + containment/proposedOwner/status
  + investigation/causes/actions/associatedChanges/verification
  + hazardLogUpdate/safetyCaseUpdate/deployerCommunication
  + externalNotificationAssessment/closureAuthority/closedAt/reopeningReason
  + auditReferences/uncertainties/lastReviewedByFunction
```

## 5. Fila de ejemplo controlada

Las cuatro filas físicas siguientes representan **una única fila lógica**
dividida para legibilidad. Todos los segmentos usan el mismo ID y están marcados
`SYNTHETIC_SCHEMA_EXAMPLE / NOT AN INCIDENT`. No describen un evento ocurrido.

### 5.1. Recepción y clasificación

| `recordClassification` | `incidentId` | `receivedAt` | `source` | `reporterRole` | `affectedReleaseConfiguration` | `functionWorkflow` | `sanitizedDescription` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SYNTHETIC_SCHEMA_EXAMPLE / NOT AN INCIDENT` | `SYNTHETIC-SCHEMA-ROW` | `NOT_RECORDED_IN_SCHEMA_EXAMPLE` | `SYNTHETIC_TEST_INPUT` | `SYNTHETIC_TEST_ROLE` | `SYNTHETIC_RELEASE_CONFIGURATION_REFERENCE` | `SYNTHETIC_WORKFLOW_REFERENCE` | `NO_EVENT_DESCRIPTION / SCHEMA EXAMPLE ONLY` |

### 5.2. Vía clínica, hazards y contención

| `incidentId` | `patientAffected` | `potentialClinicalPathway` | `harmOrNearMiss` | `preliminaryClassification` | `relatedHazards` | `preservedEvidence` | `containment` | `proposedOwner` | `status` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SYNTHETIC-SCHEMA-ROW` | `UNKNOWN` | `PENDING_HUMAN_REVIEW` | `PENDING_HUMAN_REVIEW` | `PENDING_HUMAN_TRIAGE` | `NOT_LINKED` | `NONE / SCHEMA EXAMPLE` | `NOT_APPLIED` | `NOT_ASSIGNED` | `DRAFT_RECORD / NOT AN INCIDENT` |

### 5.3. Investigación, acciones y verificación

| `incidentId` | `investigation` | `causes` | `actions` | `associatedChanges` | `verification` | `hazardLogUpdate` | `safetyCaseUpdate` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SYNTHETIC-SCHEMA-ROW` | `NOT_STARTED` | `NOT_DETERMINED` | `NONE_RECORDED` | `NONE_RECORDED` | `NOT_PERFORMED` | `PENDING_REVIEW` | `PENDING_REVIEW` |

### 5.4. Comunicación, cierre, reapertura y auditoría

| `incidentId` | `deployerCommunication` | `externalNotificationAssessment` | `closureAuthority` | `closedAt` | `reopeningReason` | `auditReferences` | `uncertainties` | `lastReviewedByFunction` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SYNTHETIC-SCHEMA-ROW` | `NOT_APPLICABLE_CURRENTLY` | `NOT_DETERMINED` | `NOT_ASSIGNED` | `NOT_CLOSED` | `NOT_REOPENED` | `NONE_RECORDED` | `NOT_ASSESSED` | `NOT_REVIEWED / NOT AN INCIDENT` |

## 6. Estados documentales y operacionales

| Elemento | Estado |
| --- | --- |
| Plantilla redactada | `DRAFT` |
| Plantilla aprobada | `NO / PENDING_APPROVAL` |
| Proceso aprobado | `NO` |
| Canal/system of record seleccionados | `NO` |
| Log operativo establecido | `NO` |
| Incidentes reales registrados | `NONE` |
| CSO/autoridad de cierre | `NOT_ASSIGNED` |
| Riesgos residuales aceptados | `NONE` |

## 7. Gate de activación

No instanciar esta plantilla con un evento real hasta que el Safety Incident
Management Plan esté aprobado y operativo; DEC-005/013/014 aplicables estén
resueltas; existan canal, system of record, roles, permisos, retención,
sanitización, handoffs y criterios de cierre/reapertura; y un CSO/autoridades
competentes estén formalmente designados.

Hasta entonces: `TEMPLATE ONLY / EMPTY LOG / NOT_OPERATIONAL` y
`REAL PILOT = NO_GO`.
