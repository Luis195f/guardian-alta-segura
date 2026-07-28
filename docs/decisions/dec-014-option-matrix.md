# DEC-014 — Matriz neutral de opciones

## Uso

Ninguna opción está recomendada, preseleccionada o aprobada. `DEC-014-A` a
`DEC-014-N` son identificadores de trabajo dentro de la única decisión canónica
DEC-014.

El approved scope distingue `OBSERVABILITY_FOUNDATION`,
`INCIDENT_CANDIDATE_DETECTION`, `OPERATIONAL_ALERTING_ESCALATION` e
`INCIDENT_MANAGEMENT_SUPPORT`. Seleccionar una opción para una capacidad no
aprueba las demás.

Los nombres `CATEGORY_PLACEHOLDER_*`, `SEVERITY_LEVEL_PLACEHOLDER_*` y
`LIFECYCLE_STATE_PLACEHOLDER_*` son neutrales. P1/P2, SEV1/SEV2 o
Critical/High/Medium/Low solo podrían aparecer como
`ILLUSTRATIVE_ONLY_NOT_APPROVED`; esta matriz no los usa.

Leyenda de soporte:

- `SUPPORTED`: el baseline puede representar la opción sin semántica nueva;
- `PARTIAL`: existe un seam técnico, pero falta contrato o lifecycle;
- `ABSENT`: la capacidad no existe;
- `CONDITIONAL`: depende de otras decisiones.

## Matriz

| ID | Question | Option | Current technical support | Operational policy required | Security/privacy dependency | Code impact | Infrastructure impact | Schema impact | Safety risk | Audit impact | Authority | Evidence required |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | ¿Cuándo un error se convierte en incidente? | A1. Confirmación humana caso a caso desde candidatos | `PARTIAL`: errores/correlation ID existen; no hay candidatos | Definición, intake y confirmación | Sanitización del intake | Aplicación futura | Posible | Ninguno o externo | Subregistro o sobreclasificación | Evidencia de triage por decidir | Dirección TI | Procedimiento y ejemplos sintéticos |
| A | Igual | A2. Umbrales deterministas aprobados + confirmación humana | `ABSENT` | Hechos, ventanas, excepción y versionado | Métricas/labels permitidas | Aplicación | Sí | Posible configuración | Falsa confianza en umbral | Versión de regla y confirmación | Dirección TI | Especificación y pruebas |
| A | Igual | A3. `CUSTOM_OPTION` | Por evaluar | Completa | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección TI | Definición inequívoca |
| B | ¿Qué categorías utiliza la institución? | B1. Sin categoría en el primer scope | `SUPPORTED` por ausencia | Triage debe funcionar sin categoría | Ninguna adicional | Bajo | Ninguno | Ninguno | Menor capacidad de segmentación | Ninguno adicional | Dirección TI | Exclusión explícita |
| B | Igual | B2. Catálogo versionado `CATEGORY_PLACEHOLDER_A…N` | `ABSENT` | Definiciones, owner, vigencia y cambio | Evitar categorías que revelen datos | Alto | Posible | Candidato | Categoría usada como proxy clínico | Versión y cambios | Dirección TI | Catálogo y aprobación |
| B | Igual | B3. Taxonomía externa institucional referenciada | `ABSENT` | Source of truth y mapping | Acceso e intercambio | Integración | Sí | Posible referencia | Deriva entre sistemas | Referencia/versionado | Dirección TI | Contrato institucional |
| C | ¿Existe severidad técnica? | C1. Sin severidad; triage humano | `SUPPORTED` por ausencia | Criterio de orden y revisión | Ninguna adicional | Bajo | Ninguno | Ninguno | Priorización inconsistente | Decisión humana por decidir | Dirección TI | Procedimiento |
| C | Igual | C2. Matriz técnica versionada | `ABSENT` | Dimensiones y semántica | Minimización de alcance/usuarios | Alto | Posible | Candidato | Confusión con severidad clínica | Inputs, resultado y override | Dirección TI | Matriz y pruebas |
| C | Igual | C3. Asignación determinista desde hechos técnicos aprobados | `ABSENT` | Regla, abstención, revisión | Datos permitidos | Alto | Sí | Candidato | Automatización sesgada | Versión y evaluación | Dirección TI | Reglas y validación |
| D | ¿Qué fuentes de detección crean candidatos a incidente? | D1. Reporte manual de soporte | `PARTIAL`: superficie support sin intake | Formulario y triage | Campos y acceso | Aplicación | Posible integración | Externo/candidato | Texto libre con PHI | Intake y redacción | Dirección TI | Formulario sanitizado |
| D | Igual | D2. Señales técnicas automáticas seleccionadas | `ABSENT` | Fuentes de candidatos y umbrales | Labels/attributes permitidos | Aplicación | Sí | Posible configuración | Alert fatigue / omisión | Detección y confirmación | Dirección TI | Diseño de detección de candidatos |
| D | Igual | D3. Reporte manual + señales técnicas | `ABSENT` | Deduplicación y precedencia | Ambas anteriores | Alto | Sí | Posible | Duplicados/ruido | Lineage técnico | Dirección TI | Procedimiento integrado |
| E | ¿Qué contenido se permite? | E1. Allowlist única mínima para todos los artefactos | `PARTIAL`: error/log runtime ya usa allowlist de facto | Campos y redacción | DEC-005 y privacidad | Medio | Sí | No necesariamente | Pérdida de diagnóstico técnico | Evidencia de redacción | Dirección TI + consulta privacidad | Matriz + pruebas end-to-end |
| E | Igual | E2. Allowlist por artefacto/canal | `ABSENT` | Matriz log/metric/trace/ticket/postmortem | Alta | Alto | Sí | Posible configuración | Inconsistencia entre canales | Versiones por canal | Dirección TI + consulta privacidad | Matriz y test suite |
| E | Igual | E3. No soporte productivo hasta servicio externo sanitizador | `ABSENT` | Contrato y fallo seguro | Encargados/transferencias | Integración | Sí | Externo | Dependencia única | Evidencia del sanitizador | Dirección TI + privacidad/security | Contrato y pruebas |
| F | ¿Qué identificadores pueden compartirse? | F1. Solo correlation ID, error code, timestamp y component aprobados | `PARTIAL`: todos salvo timestamp explícito en log actual | Finalidad y validez | Correlación/reidentificación | Bajo/medio | Posible | Ninguno | Soporte insuficiente o vinculación | Uso del ID | Dirección TI | Clasificación contextual |
| F | Igual | F2. Referencias técnicas adicionales allowlisted | `PARTIAL`: existen IDs internos, no acceso support | Catálogo por finalidad | Privacidad y DEC-013 | Alto | Posible | Posible | Reidentificación | Accesos y consultas | Dirección TI + privacidad | Evaluación por ID |
| F | Igual | F3. Ningún ID de recurso; búsqueda mediada por función autorizada | `ABSENT` | Workflow de mediación | Identidad/segregación | Alto | Posible | Posible | Investigación más lenta | Evidencia de mediación | Dirección TI | Procedimiento y UX |
| G | ¿Quién accede a cada artefacto? | G1. Acceso permanente por función segregada | `PARTIAL`: RBAC demo; no roles productivos | Matriz por artefacto | DEC-013 y least privilege | Seguridad | Sí | IdP externo | Privilegio acumulado | Access review | Dirección TI | Role mapping aprobado |
| G | Igual | G2. Acceso temporal just-in-time | `ABSENT` | Solicitud, aprobación, caducidad | DEC-013/break-glass | Seguridad | Sí | Candidato/external | Fricción o acceso excesivo | Acceso y expiración | Dirección TI | Procedimiento y pruebas |
| G | Igual | G3. Sistema externo segregado; Guardián sin visor | `ABSENT` | Source of truth y acceso externo | Contrato/privacidad | Integración | Sí | Ninguno local | Dependencia externa | Referencias minimizadas | Dirección TI | Arquitectura institucional |
| H | ¿Qué lifecycle tiene un incidente? | H1. Lifecycle mínimo institucional | `ABSENT` | Estados, actores, evidencia, reapertura | Acceso/retención | Aplicación o integración | Sí | Candidato/external | Cierre prematuro | Transiciones append-only | Dirección TI | Procedimiento |
| H | Igual | H2. Lifecycle del ITSM institucional existente | `ABSENT` | Mapping y ownership | Contrato y roles | Integración | Sí | Externo | Deriva de estados | Referencias/versiones | Dirección TI | Contrato ITSM |
| H | Igual | H3. `CUSTOM_OPTION` | Por evaluar | Completa | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección TI | Especificación |
| I | ¿Cómo se escala técnicamente? | I1. Escalado manual por decisión de triage | `ABSENT` | Condición, destino, acknowledgement | Contenido/canal permitido | Aplicación/integración | Posible | Posible | Omisión humana | Decisión y recepción | Dirección TI | Procedimiento probado |
| I | Igual | I2. Escalado determinista desde hechos técnicos | `ABSENT` | Reglas, excepción y fallback | Minimización y acceso | Alto | Sí | Configuración candidata | Bucles/alert fatigue | Regla, envío, recepción | Dirección TI | Reglas versionadas |
| I | Igual | I3. Sin escalado en primer scope | `SUPPORTED` por ausencia | Límites y operación alternativa | Ninguna adicional | Bajo | Ninguno | Ninguno | Incidente sin destinatario | Declarar no aplicable | Dirección TI | Exclusión explícita |
| J | ¿Qué canales pueden utilizarse? | J1. Ticketing institucional | `ABSENT` | Canal, campos, fallback | Contrato y acceso | Integración | Sí | Externo | Ticket como segunda historia clínica | Entrega y acceso | Dirección TI + privacidad | Contrato |
| J | Igual | J2. Canal institucional de comunicación aprobado | `ABSENT` | Canal, plantilla, destinatario | Identidad/metadatos | Integración | Sí | Externo | Difusión excesiva | Envío/acknowledgement | Dirección TI | Procedimiento |
| J | Igual | J3. Sin comunicación automática | `SUPPORTED` por ausencia | Workflow manual si aplica | Sanitización igualmente obligatoria | Bajo | Ninguno | Ninguno | Latencia/omisión | Evidencia manual por decidir | Dirección TI | Declaración explícita |
| K | ¿Cómo se realiza el handoff por posible impacto asistencial? | K1. Handoff manual a proceso institucional competente | `ABSENT` | Trigger, autoridad y evidencia | Minimización | Aplicación/integración | Posible | Posible | TI decide indebidamente o no entrega | Solicitud/recepción | Dirección TI + autoridad clínica consultiva | Procedimiento conjunto |
| K | Igual | K2. Enlace desde ITSM a proceso clínico separado | `ABSENT` | Contrato y ownership | Segregación estricta | Integración | Sí | Externo | Mezcla de historias | Referencias cruzadas mínimas | Autoridades competentes | Contrato y prueba |
| K | Igual | K3. `CONSULTATIVE_AUTHORITY_REQUIRED` pendiente | `SUPPORTED` documentalmente | Mantener bloqueo | No compartir datos | Ninguno | Ninguno | Ninguno | Falta de proceso | Registrar blocker | Dirección TI | Identificación de autoridad |
| L | ¿Cómo se entrega a seguridad/privacidad? | L1. Triage técnico y handoff manual segregado | `ABSENT` | Trigger, evidencia y ownership | DPO/DPD/Responsable/security | Integración/proceso | Posible | Externo | Notificación tardía o excesiva | Handoff y recepción | Dirección TI + autoridades aplicables | Procedimiento |
| L | Igual | L2. Workflow institucional externo existente | `ABSENT` | Mapping y source of truth | Contrato/base aplicable | Integración | Sí | Externo | Duplicación o pérdida | Referencia externa | Autoridades aplicables | Contrato |
| L | Igual | L3. `CUSTOM_OPTION` | Por evaluar | Completa | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Autoridades aplicables | Especificación |
| M | ¿Qué evidencia se conserva? | M1. Registro mínimo en ITSM externo | `ABSENT` | Campos, ownership y exportación | DEC-005 | Integración | Sí | Externo | Evidencia insuficiente/excesiva | Historia externa | Dirección TI + Responsable del Tratamiento | Política de retención |
| M | Igual | M2. Referencia externa mínima en Guardián | `ABSENT` | Finalidad e integridad referencial | DEC-005/DEC-013 | Aplicación | Posible | Candidato | Correlación con episodio/persona | Mutación/referencia | Dirección TI + privacidad | Diseño y retención |
| M | Igual | M3. `IncidentRecord` local | `ABSENT` | Lifecycle completo | Alta; evitar PHI | Alto | Sí | Candidato fuerte | Duplicar ITSM | Append-only y acceso | Dirección TI + privacidad | Justificación arquitectónica |
| N | ¿Cuándo se exige RCA/postmortem? | N1. Criterio manual por función autorizada | `ABSENT` | Trigger, plantilla, participantes | Sanitización/retención | Proceso | Posible | Externo/candidato | Aprendizaje inconsistente | Decisión y acciones | Dirección TI | Procedimiento |
| N | Igual | N2. Criterio determinista desde categoría/severidad aprobadas | `ABSENT`; depende de B/C | Reglas y excepciones | Sanitización | Aplicación/integración | Sí | Posible | Automatismo mal calibrado | Regla y override | Dirección TI | Taxonomía/severidad aprobadas |
| N | Igual | N3. Sin postmortem en primer scope | `SUPPORTED` por ausencia | Exclusión y mecanismo de aprendizaje alternativo | Ninguna adicional | Bajo | Ninguno | Ninguno | Repetición de fallos | Declarar no aplicable | Dirección TI | Scope explícito |

## Decisiones transversales no seleccionadas

| Pregunta | Opciones neutrales |
|---|---|
| Automated detection | no / sí con hechos técnicos aprobados / custom |
| Automated technical notification | no / sí con canal aprobado / custom |
| Automated ticket creation | no / sí con sanitización y deduplicación / custom |
| Automated escalation | no / sí con política versionada / custom |
| Automated mitigation | no / análisis independiente / custom |
| SLI | no definidos / catálogo institucional / custom |
| SLO | no definidos / objetivos internos posteriores / custom |
| SLA | no definido / compromiso formal posterior cuando aplique / custom |

Ninguna opción de esta matriz autoriza herramientas, tiempos, canales, roles,
integraciones o producción.
