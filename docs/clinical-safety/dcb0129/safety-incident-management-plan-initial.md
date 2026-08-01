# Safety Incident Management Plan inicial — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**
> `NOT_OPERATIONAL / INSTITUTIONAL_APPROVAL REQUIRED`
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`
> `RISK ACCEPTABILITY CRITERIA = NO APROBADOS`
> `RESIDUAL RISK ACCEPTANCE = NINGUNA`
> `REAL PILOT = NO_GO`

## 1. Control documental, scope y límites

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-SIMP-INITIAL-001` |
| Versión | `0.1-draft` |
| Fecha de corte | 2026-08-01 |
| Rama | `docs/clinical-risk-management-plan` |
| Commit base | `4d120c5a46c9e72fdf15279462db3a64350583d8` |
| Autoría técnica documental | Preparación técnica asistida por Codex; no es autoridad clínica u operativa |
| Estado documental | `DRAFT / PENDING_APPROVAL` |
| Estado del proceso | `NOT_OPERATIONAL / INSTITUTIONAL_APPROVAL REQUIRED` |
| Clasificación | `DOCUMENTED_CONTROL_ONLY` |
| Canal de recepción | `[INSTITUTIONAL_CHANNEL_NOT_SELECTED]` |
| Sistema de registro | `[INSTITUTIONAL_SYSTEM_OF_RECORD_NOT_SELECTED]` |
| CSO | `NO DESIGNADO / APROBACIÓN PENDIENTE` |

Este plan prepara un proceso futuro para eventos asociados a Guardián Alta
Segura. No existe canal, herramienta, equipo, on-call, autoridad de cierre,
procedimiento aprobado o integración operacional. No habilita soporte
productivo, notificaciones, actuación clínica, piloto ni datos reales.

La referencia metodológica verificada es DCB0129 Specification v4.2 /
Implementation Guidance v3.2, Amd 24/2018. NHS England confirma que
[DCB0129 y DCB0160 están en revisión](https://www.england.nhs.uk/long-read/national-review-of-clinical-risk-management-standardsdcb0129-and-dcb0160-supporting-information/).
No se declara cumplimiento DCB0129, DCB0160 ni obligación jurídica automática
en España.

## 2. Taxonomía y triage humano

Un error técnico no es automáticamente un incidente clínico. El triage humano
debe determinar si existe una vía plausible hacia daño al paciente o deterioro
de la atención.

| Concepto | Definición de trabajo | Frontera obligatoria |
| --- | --- | --- |
| Incidente de seguridad clínica | Evento no intencionado o inesperado que pudo o llegó a causar daño a uno o más pacientes | Requiere evaluación humana; no se infiere de un HTTP status |
| Incidente técnico | Interrupción/degradación gestionada bajo proceso TI aprobado | Puede no tener vía clínica; DEC-014 sigue pendiente |
| Incidente de ciberseguridad | Evento confirmado por el proceso de seguridad aplicable | No equivale automáticamente a daño clínico ni notificación externa |
| Evento de auditoría | Evidencia técnica append-only de una mutación/decisión | No es incidente, ticket ni historia clínica completa |
| Defecto | Comportamiento o requisito no satisfecho en una configuración | Puede abrir investigación safety si existe vía clínica |
| Queja | Expresión de insatisfacción recibida por proceso futuro | Requiere triage; no prueba defecto o daño |
| Señal | Información que merece evaluación por patrón, fuente o preocupación | No es incidente confirmado ni `Alert` clínico de dominio |
| Near miss | Secuencia que pudo causar daño pero no lo produjo según revisión autorizada | No se clasifica automáticamente desde telemetría |
| Daño real | Daño confirmado por proceso clínico competente | TI no diagnostica ni confirma daño |
| Problema de datos | Integridad, calidad, correspondencia, disponibilidad, temporalidad o procedencia defectuosas | Requiere separar error técnico, impacto y posible vía clínica |
| Problema de disponibilidad | Capacidad o dependencia no accesible/degradada | No es incidente clínico por sí solo; revisar continuidad y workflow |
| Incidente local del desplegador | Evento originado o gestionado en contexto local | Requiere coordinación futura; no existe desplegador identificado |
| Evento con vía clínica por determinar | Hecho técnico/operativo que necesita análisis para saber si pudo afectar atención | Estado de triage, no conclusión clínica |

Clasificaciones de capacidad aplicables: `CURRENT_BASELINE` para correlation ID,
errores/logs sanitizados y `AuditEvent`; `DOCUMENTED_CONTROL_ONLY` para este
plan; `INSTITUTIONAL_CONTROL_PENDING` para canal, roles, workflow y retención;
`DEPLOYMENT_CONTROL_CANDIDATE` para procesos locales; `INSUFFICIENT_EVIDENCE`
para operación real.

## 3. Recepción y registro futuro

El canal futuro debe permitir a usuarios, personal interno y desplegadores
reportar preocupaciones, pero no se inventa correo, teléfono, formulario,
vendor, sistema ITSM o destino. La organización competente deberá seleccionar,
probar, comunicar y controlar `[INSTITUTIONAL_CHANNEL_NOT_SELECTED]`.

Cada recepción debe obtener un ID estable no reutilizable conforme a una
convención aprobada. La
[plantilla de Safety Incident Management Log](safety-incident-log-template.md)
define el esquema, pero no constituye un log operativo ni contiene incidentes.

### 3.1. Datos mínimos necesarios

- ID estable y fecha/hora de recepción;
- fuente y reportante únicamente por rol/función cuando baste;
- release, commit, schema, configuración, dependencia y entorno afectados;
- función/workflow y descripción sanitizada de hechos observables;
- estado de paciente afectado `UNKNOWN / NONE / POSSIBLE / CONFIRMED`, sin
  identidad;
- posible vía clínica y daño/near miss pendientes de revisión;
- clasificación preliminar humana y hazards relacionados;
- evidencia preservada por referencia controlada;
- contención, owner propuesto, estado, investigación, causas y acciones;
- cambios, verificación, Hazard Log/Safety Case, comunicaciones, evaluación de
  notificación, cierre/reapertura y referencias de auditoría.

Aplicar minimización estricta. Están prohibidos nombres, documentos de
identidad, números de historia clínica, diagnósticos identificables, texto libre
clínico real, teléfonos, correos, direcciones, credenciales, tokens, secretos y
PHI/PII innecesaria. Si el análisis asistencial necesita información clínica,
debe permanecer en el sistema clínico autorizado y el log solo referenciar la
evidencia conforme a política aprobada.

## 4. Atención urgente al paciente frente a gestión del incidente

```text
necesidad asistencial urgente
  → canal/protocolo clínico oficial local aprobado (fuera de este plan)

evento técnico/safety concern
  → recepción y triage del incidente (este proceso futuro)
```

Gestionar un registro nunca sustituye atención urgente, evaluación clínica,
recurso de crisis o procedimiento asistencial. Guardián no tiene recurso de
crisis accionable: DEC-010/011 siguen pendientes y no se inventa ningún destino.
La persona que recibe una preocupación no debe retrasar una actuación clínica
autorizada para completar un ticket; tampoco debe usar el ticket para decidir
tratamiento, riesgo o prioridad clínica.

## 5. Flujo propuesto

```text
recepción
  → registro mínimo e ID estable
    → triage humano
      → preservar evidencia y separar vías técnica/clínica/security/privacy
        → investigar causas y relación con hazards/controles
          → contención/pausa/rollback solo por autoridad definida
            → acciones y change control
              → verificación + reevaluación de riesgo
                → aprobación competente de cierre o reapertura
                  → feedback a Hazard Log / Safety Case / desplegador
```

Ningún paso es automático. El flujo está `DRAFT / NOT_OPERATIONAL`.

## 6. Criterios cualitativos de triage e investigación

No se crea escala, score, probabilidad, severidad, SLA o umbral. El triage humano
considerará cualitativamente:

- si ocurrió o pudo ocurrir daño o deterioro de atención;
- si existe paciente posible/confirmado sin registrar identidad;
- si el evento realiza un hazard existente, revela uno nuevo o muestra fallo de
  control;
- alcance funcional/configuracional y posibilidad de repetición;
- wrong-patient, integridad, procedencia, acceso, automatización, control humano,
  disponibilidad, continuidad e interfaces;
- estado de evidencia y nivel de incertidumbre;
- necesidad de separar vías clínica, técnica, seguridad y privacidad;
- si el cambio reciente, dependencia, configuración o workflow contribuyeron;
- si se requiere contención o stop antes de completar la investigación.

Los criterios de estimación/aceptabilidad del riesgo siguen `NOT_APPROVED`; el
triage no puede inventarlos ni declarar aceptabilidad.

## 7. Roles propuestos y no asignados

| Función propuesta | Responsabilidad futura | Estado |
| --- | --- | --- |
| Intake/incident coordinator | Registrar, deduplicar por evidencia, coordinar y mantener estado | `NOT_ASSIGNED / PENDING_APPROVAL` |
| Technical responder | Diagnóstico técnico, contención y corrección dentro de autoridad | `NOT_ASSIGNED / PENDING_APPROVAL` |
| CSO/clinical safety review | Determinar vía safety, hazards, risk reassessment y safety documentation | `CSO = NO DESIGNADO` |
| Clinical liaison/authority | Separar respuesta asistencial y valorar impacto/daño dentro de competencia | `NOT_ASSIGNED / PENDING_APPROVAL` |
| Security responder | Evaluación y handoff de ciberseguridad | `NOT_ASSIGNED / PENDING_APPROVAL` |
| Privacy/DPO/DPD liaison | Evaluación jurídica/privacidad dentro de competencia | `NOT_ASSIGNED / PENDING_APPROVAL` |
| Quality/Configuration | Evidencia, defect/change/CAPA futura, baselines y cierre documental | `NOT_ASSIGNED / PENDING_APPROVAL` |
| Operations | Disponibilidad, continuidad, comunicación y restore/rollback aprobados | `NOT_ASSIGNED / NOT_OPERATIONAL` |
| Desplegador futuro | Gestión local, respuesta clínica/operativa, DCB0160/local y feedback | `NOT_IDENTIFIED` |

Esta tabla no constituye nombramiento, RACI aceptada ni autoridad.

## 8. Preservación de evidencias

Al recibir un evento, preservar de forma proporcional y autorizada:

- baseline de commit/release, schema/migraciones, dependencias, configuración y
  feature flags;
- timestamps y correlation/audit references minimizadas;
- logs/metrics/traces sanitizados que existan y sean permitidos;
- requests/responses solo si se pueden sanitizar bajo policy aprobada; nunca
  copiar payload clínico al log;
- estado de DB/infra/dependencias y pasos reproducibles sintéticos;
- decisiones, comunicaciones y cadena de custodia por función;
- evidencia de contención, cambio, pruebas y restore/rollback.

No alterar evidencia original. Las correcciones crean nuevos registros. Acceso,
retención, exportación y legal hold dependen de DEC-005/013/014 y no están
aprobados. Si no existe medio autorizado, escalar la necesidad a la autoridad
competente sin improvisar repositorios o copiar datos sensibles.

## 9. Investigación multidimensional

La investigación debe evaluar y distinguir:

| Dimensión | Preguntas mínimas |
| --- | --- |
| Causa técnica | ¿Qué función, código, DB, dependencia, clock, concurrencia o configuración falló? |
| Causa clínica | ¿Existe vía clínica plausible/confirmada según autoridad competente? ¿Qué supuesto asistencial falló? |
| Factores humanos | ¿La interfaz, lenguaje, carga, accesibilidad o automation bias influyeron? |
| Workflow | ¿Responsabilidad, acceptance, handoff, excepción o procedimiento eran inexistentes/ambiguos? |
| Entorno | ¿Red, dispositivo, infraestructura, staffing o contexto local contribuyeron? |
| Interfaz | ¿Autenticidad, versión, mapping, pertenencia al episodio, tiempo o contrato fallaron? |
| Dependencia/supplier | ¿Versión, vulnerabilidad, disponibilidad o cambio de tercero contribuyeron? |
| Configuración | ¿Feature flag, regla, protocolo, identidad, datos o infraestructura diferían de baseline? |
| Formación/competencia | ¿Existía material/competencia aprobados y fueron adecuados? No inferir culpa individual. |
| Uso previsible | ¿Fue uso normal, fallo, error humano o mal uso razonablemente previsible? |

Aplicar análisis de causas múltiples; no forzar una única root cause. Separar
causa, contributing factor, estado peligroso, secuencia y daño.

## 10. Relación con otros registros y procesos

| Artefacto/proceso | Actualización requerida cuando aplique | Estado actual |
| --- | --- | --- |
| Hazard Log | Nuevo hazard, causa, control fallido, evidencia o cambio de estado | Borrador; aprobación CSO pendiente |
| Clinical Safety Case | Revisar validez de claims, supuestos y controles; reemitir si procede | Borrador |
| Defect register | Crear/vincular defecto sin PHI y mantener disposition | `NOT_EVIDENCED` |
| Change control | Vincular corrección/configuración, hazards, pruebas y approvals | Documentado en CRMP; `NOT_OPERATIONAL` |
| CAPA futura | Acciones correctivas/preventivas, owner, verificación y efectividad | `DESIGN_FORESEEABLE / NOT_OPERATIONAL` |
| Clinical Risk Management File | Incluir incident record, decisiones y evidencia controlada | Índice draft; File no establecido |
| Desplegador futuro | Handoff, contención local, feedback, DCB0160/local | No identificado |
| Obligaciones externas | Evaluar aplicabilidad, autoridad, contenido y canal | `INSTITUTIONAL/LEGAL_DETERMINATION_REQUIRED` |

`AuditEvent`, application log, support ticket, security event y clinical record
no son intercambiables.

## 11. Escalado y posibles obligaciones externas

No se fijan tiempos, niveles, autoridades, destinatarios, canales, vendors o
obligaciones. El plan usa placeholders explícitos:

- `[INSTITUTIONAL_TECHNICAL_ESCALATION_AUTHORITY_NOT_DEFINED]`;
- `[CLINICAL_SAFETY_ESCALATION_AUTHORITY_NOT_DEFINED]`;
- `[SECURITY_PRIVACY_HANDOFF_NOT_DEFINED]`;
- `[DEPLOYER_ESCALATION_PATH_NOT_DEFINED]`;
- `[EXTERNAL_REPORTING_APPLICABILITY_NOT_DETERMINED]`;
- `[EXTERNAL_REPORTING_AUTHORITY_NOT_DETERMINED]`;
- `[EXTERNAL_REPORTING_CHANNEL_NOT_SELECTED]`.

La autoridad jurídica/institucional competente debe determinar si existe una
obligación de notificación, bajo qué marco, quién decide, qué datos mínimos se
comparten y cómo se conserva evidencia. Este borrador no afirma ninguna
obligación ni sustituye evaluación local. DCB0160 solo orienta futuras
responsabilidades de un desplegador no identificado.

## 12. Contención, pausa, stop y rollback

Acciones candidatas: aislar función/configuración, deshabilitar enrolment o
capability, revertir a baseline conocida, recuperar servicio, activar workflow
alternativo aprobado o suspender release. Solo se ejecutan mediante autoridad y
procedimiento definidos para el scope.

- respuesta técnica no equivale a decisión clínica;
- TI puede contener un componente dentro de autoridad, pero no decidir
  tratamiento, derivación, prioridad clínica o cierre de episodio;
- pausa/stop de piloto no puede ser automática ni existe hoy;
- rollback preserva historia, incident evidence y documentación clínica;
- no se activa contingencia improvisada; DEC-015 sigue pendiente;
- la reanudación requiere revisión humana/autoridad competente, no el simple
  cierre técnico del incidente.

## 13. Comunicación

La estrategia futura debe distinguir comunicación a usuarios, desplegador,
entidad responsable/fabricante futuro, funciones clínicas, seguridad/privacidad
y autoridades externas si aplican. Debe definir owner, audiencia, hechos
confirmados, incertidumbre, acciones, contenido prohibido, canal y aprobación.

No existe fabricante formalmente constituido para este fin ni desplegador
identificado. No se inventan nombres, hospitales, contactos o canales. Toda
comunicación evita PHI/PII y no atribuye culpa, diagnóstico, seguridad o cierre
sin evidencia competente.

## 14. Criterios de cierre

No hay cierre automático. `CLOSED` solo podrá usarse cuando exista:

1. investigación documentada y alcance/configuración identificados;
2. causas y uncertainties registradas, o justificación competente de lo que no
   pudo determinarse;
3. acciones y decisiones trazadas con owners autorizados;
4. controles implementados y técnicamente verificados;
5. efectividad evaluada en la medida aprobada;
6. Hazard Log actualizado y riesgo reevaluado con criterios aprobados;
7. Safety Case/defect/change/CAPA y CRM File actualizados cuando aplique;
8. comunicaciones y notificación externa evaluadas;
9. evidencia de contención/rollback/restore y condiciones de reanudación;
10. aprobación de la autoridad de cierre competente y CSO cuando afecte safety.

Hoy la autoridad de cierre y los criterios de riesgo no están definidos. Ningún
registro nuevo debe marcarse `CLOSED` por el mero hecho de documentarlo.

## 15. Reapertura

Reabrir por nueva evidencia, recurrencia, fallo de control/acción, cambio de
causa, hazard nuevo/modificado, impacto previamente desconocido, configuración
adicional afectada, notificación/feedback del desplegador o invalidez del cierre.
La reapertura conserva el cierre previo y su motivo; no sobrescribe historia.

## 16. Tendencias y aprendizaje futuro

Un proceso operativo futuro podrá revisar patrones de hazards, causas,
componentes, configuraciones, defects, near misses, tiempo de detección,
controles y reincidencia usando datos minimizados. Los indicadores, filtros,
acceso, retención, umbrales y frecuencia requieren aprobación DEC-005/014 y
clinical safety. No se inventan periodicidad ni objetivos.

El aprendizaje debe alimentar training, diseño, tests, supplier management,
change control, Hazard Log, Safety Case y transferencias. Ausencia de incidentes
registrados en una demo sintética no es evidencia de seguridad.

## 17. Trazabilidad inicial

| Área del plan | Hazard/gap principal | Evidencia actual | Dependencia | Estado |
| --- | --- | --- | --- | --- |
| Wrong-patient/datos/acceso | HAZ-GAS-001/003/004/005; GAP-DCB-022 | Schema, RBAC, audit y tests técnicos | DEC-005/013 | `PARTIAL / DEMO_ONLY` |
| Avisos/UI/control humano | HAZ-GAS-006–009/012; GAP-DCB-024 | Human review, flags y disclaimers probados | DEC-006–012/017 + CSO/human factors | `PARTIAL` |
| Disponibilidad/dependencias | HAZ-GAS-010/011/014/018; GAP-DCB-014/021 | Health/logs mínimos; no continuity/monitoring | DEC-014/015 | `NOT_OPERATIONAL` |
| Diseño/concurrencia/cambio | HAZ-GAS-013–020; GAP-DCB-018/023 | Spec y ADR documentales | ADR-0015/0016; DEC-013–017 | `DESIGN_FORESEEABLE` |
| Proceso/log de incidentes | GAP-DCB-013 | Este plan + plantilla | CSO, DEC-005/013/014, canal y system of record | `DRAFT ONLY / NOT APPROVED / NOT OPERATIONAL` |
| Piloto/release | GAP-DCB-016/020 | DEC-016 pack y gates | Autoridades, Safety Case, deployer | `REAL PILOT = NO_GO` |

## 18. Gate de activación del proceso

El proceso no pasa a operativo hasta que existan, como mínimo:

- CSO y autoridades competentes designados con competencia evidenciada;
- DEC-014 aprobada para scope/version aplicable;
- canal y system of record aprobados/probados;
- roles, acceso, segregación, suplencia y comunicación definidos;
- sanitización end-to-end probada con datos sintéticos;
- lifecycle, handoffs, retención, evidencia, cierre/reapertura y notificación
  evaluados;
- integración con Hazard Log, Safety Case, defect/change/CAPA y desplegador;
- continuidad, pause/stop/rollback y formación probadas para el scope;
- revisión y aprobación formal de este plan.

Hasta entonces: `NOT_OPERATIONAL / INSTITUTIONAL_APPROVAL REQUIRED` y
`REAL PILOT = NO_GO`.

## 19. Revisión y aprobación

| Función | Persona | Evidencia/decisión | Estado |
| --- | --- | --- | --- |
| Preparación técnica documental | `NOT_ASSIGNED_TO_A_PERSON_IN_THIS_DOCUMENT` | Borrador repository-grounded | `DRAFT` |
| Dirección TI / DEC-014 | `NOT_ASSIGNED` | Scope/version/aprobación | `PENDING_APPROVAL` |
| Clinical Safety Officer | `NO DESIGNADO` | Revisión/aprobación safety | `PENDING_APPROVAL` |
| Autoridad clínica | `NOT_ASSIGNED` | Handoff y respuesta clínica | `PENDING_APPROVAL` |
| Security/Privacy | `NOT_ASSIGNED` | Handoffs y obligaciones aplicables | `PENDING_APPROVAL` |
| Quality/Configuration | `NOT_ASSIGNED` | System of record y control | `PENDING_APPROVAL` |
| Desplegador | `NOT_IDENTIFIED` | Proceso local/feedback | `NOT_OPERATIONAL` |

La revisión se activa por cambio de scope, release, dependencia, proceso,
autoridad, hazard, incidente, legislación/metodología o gate; no se fija
periodicidad.
