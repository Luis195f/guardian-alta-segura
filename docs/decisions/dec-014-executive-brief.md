# Qué debe decidir Dirección TI antes de habilitar soporte y observabilidad productiva

## Qué existe hoy

Guardián Alta Segura es un demo local con datos sintéticos. Cada request recibe
un correlation ID. Los errores públicos usan códigos y mensajes estables; el log
runtime solo registra nivel, código, componente y correlation ID. Las mutaciones
críticas crean `AuditEvent` minimizados y append-only.

Existe un healthcheck superficial y una página demo de soporte que solo muestra
ese estado. La workqueue calcula recuentos funcionales para profesionales. No hay
readiness, métricas exportables, tracing, SLO, alertas operativas, tickets,
incident records, on-call o workflow de incidentes.

## Qué falta decidir

Dirección TI debe definir:

1. cuándo un error se convierte en candidato y en incidente;
2. si existen taxonomía y severidad técnica;
3. qué señales pueden detectarlo;
4. qué campos e identificadores se permiten en cada canal;
5. quién accede a logs, auditoría, métricas, trazas, tickets e incidentes;
6. lifecycle, escalado, acknowledgement y comunicación;
7. handoff ante posible impacto asistencial o evento security/privacy;
8. evidencia, retención y aprendizaje posterior.

El paquete está documentalmente `FINAL` y
`READY_FOR_INSTITUTIONAL_DECISION`, pero DEC-014 continúa `Pendiente`.

## Cuatro capacidades separables

DEC-014 sigue siendo una única decisión canónica, pero la aprobación debe indicar
cuáles de estas capacidades están en scope:

- `OBSERVABILITY_FOUNDATION`: health, readiness, logs sanitizados, métricas,
  tracing y correlación; aporta hechos técnicos, no incidentes;
- `INCIDENT_CANDIDATE_DETECTION`: decide cuándo una señal o patrón entra en
  triage;
- `OPERATIONAL_ALERTING_ESCALATION`: notificación, escalado y comunicación;
- `INCIDENT_MANAGEMENT_SUPPORT`: lifecycle, ownership, ticketing, handoffs y
  cierre.

Una capacidad aprobada no habilita las demás.

## Qué puede contener un incidente

Solo los campos técnicos aprobados para una finalidad concreta. Candidatos
actuales a decidir incluyen error code, HTTP status, component, timestamp y
correlation ID. Un UUID no es anónimo por defecto y un episode ID puede permitir
vinculación.

## Qué nunca debe contener

- nombres o identificadores de pacientes;
- diagnósticos, medicación o notas;
- respuestas de check-in;
- Plan de Seguridad o Domicilio Seguro;
- explicación de un `Alert` de dominio;
- Task summary, note o resolution reason;
- caregiver text;
- password, secret, token, cookie, Authorization o connection string;
- payload clínico, stack, SQL o error Prisma sin una sanitización server-side
  aprobada.

Support ticket no es historia clínica. Observability no es vigilancia del
paciente.

## Quién necesita acceso

No se puede asumir que `admin = support = security = clinical professional`.
Dirección TI debe aprobar acceso por artefacto, función, necesidad, duración y
scope. La identidad productiva depende además de DEC-013. El rol demo `support`
solo demuestra denegación de acceso clínico; no constituye un modelo productivo.

## Error, incidente y Alert

- un error aislado no es automáticamente un incidente;
- una severidad técnica no expresa severidad clínica;
- un security event no es un clinical risk score;
- `src/domain/alerts` contiene avisos deterministas para revisión humana y no
  puede reutilizarse para monitorización de infraestructura.

Si TI identifica posible impacto asistencial, realiza un handoff. La autoridad
clínica competente determina la respuesta; el software no calcula daño, riesgo o
urgencia.

## Qué bloquea cada capacidad

La foundation requiere scope institucional de telemetría, sanitización,
identificadores permitidos, acceso/segregación y evidencia/retención aplicable.
No requiere por defecto definición de incidente, fuentes de detección o escalado.

La detección requiere A/D/E/F/G y M aplicable. El alerting/escalation requiere
I/E/F/G, M aplicable y J si comunica. Incident management requiere A/E/F/G/H/M;
I/J solo cuando incluye escalado/comunicación y K/L según los handoffs incluidos.
Taxonomía y severidad B/C son condicionales al scope.

Este paquete no selecciona herramienta, vendor, SLI/SLO/SLA, tiempos o canales.

## Qué ocurre después de aprobar DEC-014

Una aprobación debe indicar policy version, approved scope, evidence reference,
effective date, exclusiones y blockers resueltos. No autoriza por sí sola código
o piloto.

La especificación técnica posterior debe mapear solo las capacidades aprobadas a
arquitectura, flujos, controles, ownership y pruebas. La revisión de diseño podrá
usar una sola rama de observabilidad o incrementos separados para foundation,
detección y alerting/escalation; el paquete no reserva nombres. Nada fuera del
approved scope queda habilitado.

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ observability + security architecture review
→ READY_FOR_IMPLEMENTATION
```

DEC-005 seguirá gobernando retención, DEC-013 identidad/acceso y DEC-016 el uso
con pacientes o datos reales.
