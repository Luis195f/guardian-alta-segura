# DCB0129 Gap Register inicial — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**  
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`  
> `REAL PILOT = NO_GO`

## Control y criterio de uso

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-GAP-INITIAL-001` |
| Versión | `0.1-draft` |
| Fecha de corte | 2026-07-31 |
| Rama / commit base | `docs/clinical-safety-dcb0129` / `975d7db8b54193ed5352e8b535763a92fc047324` |
| Fase | Diseño / prepiloto sintético |
| Safety Case | [Clinical Safety Case Report inicial](clinical-safety-case-report-initial.md) |
| Hazard Log | [Hazard Log inicial](hazard-log-initial.md) |

Este registro compara la evidencia disponible con la metodología de DCB0129
Specification v4.2 e Implementation Guidance v3.2, Amd 24/2018. No constituye
una auditoría de conformidad y no afirma aplicabilidad jurídica automática en
España. NHS England declara que DCB0129 y DCB0160 están sometidos a revisión:
[release oficial](https://digital.nhs.uk/data-and-information/information-standards/governance/latest-activity/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/).

Estados:

- `OPEN`: gap identificado sin cierre ni aprobación.
- `PARTIAL`: existe evidencia limitada, insuficiente para el requisito completo.
- `NOT_EVIDENCED`: no se localizó evidencia verificable.
- `NOT_APPLICABLE`: no aplica al scope con justificación explícita.

Ningún gap está cerrado en esta versión.

## Registro

| ID | Referencia metodológica | Gap | Evidencia actual | Acción/evidencia necesaria | Propietario propuesto, no aprobado | Estado / efecto |
| --- | --- | --- | --- | --- | --- | --- |
| GAP-DCB-001 | DCB0129 2.1–2.2 | Proceso organizativo de clinical risk management y governance no definido/aprobado. | `AGENTS.md` contiene invariantes; ADR/Decision Packs contienen límites. No equivalen a un proceso DCB0129 aprobado. | Definir proceso, governance, roles, responsabilidades, lifecycle, revisiones, escalado y relación con QMS. | Top Management/fabricante futuro + CSO futuro | `OPEN`; bloquea safety case formal y release. |
| GAP-DCB-002 | DCB0129 2.3 | CSO no designado o sin evidencia de cualificación, experiencia, formación y autoridad. | No se encontró nombramiento verificable. | Nombrar formalmente un clínico competente, registrar cualificación/experiencia/formación, autoridad y disponibilidad. | Top Management/fabricante futuro | `NOT_EVIDENCED`; `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`. |
| GAP-DCB-003 | DCB0129 2.4–2.6 | Competencia/formación del personal y revisión periódica del proceso no evidenciadas. | Pruebas y documentación técnica; sin competency matrix ni revisión de proceso. | Definir competencias de seguridad clínica, formación, registros, evaluación y calendario de revisión. | CSO futuro + Quality/People owner futuro | `OPEN`. |
| GAP-DCB-004 | DCB0129 3.1 | Clinical Risk Management File incompleto/no establecido como repositorio controlado durante todo el lifecycle. | Git contiene documentos dispersos y esta carpeta inicial. | Establecer índice, ownership, configuración, retención, backup, acceso y retrieval de todos los safety artefacts/decisiones/evidencias. | CSO futuro + Quality/Configuration owner futuro | `PARTIAL`; no usar Git por sí solo como prueba de CRM File completo. |
| GAP-DCB-005 | DCB0129 3.2 | Clinical Risk Management Plan ausente o no aprobado. | No se localizó plan. | Crear plan con scope, intended use, lifecycle, actividades, participantes, métodos, criterios, deliverables, review/change/incident process y aprobación CSO. | CSO futuro + Project/Quality owner futuro | `NOT_EVIDENCED`; bloquea estimación y aceptación. |
| GAP-DCB-006 | DCB0129 3.2, 4.4, 5.1, 6.1 | Criterios de severidad, probabilidad, riesgo y aceptabilidad no aprobados. | Risk registers existentes evitan escalas inventadas; Hazard Log usa `NOT_ESTIMATED`. | Definir en el Plan criterios cualitativos/quantitativos, meanings, método de combinación, autoridad y tratamiento de incertidumbre. | CSO futuro + panel multidisciplinar | `NOT_EVIDENCED`; todos los riesgos siguen sin estimar/no aceptados. |
| GAP-DCB-007 | DCB0129 3.3 | Hazard Log no aprobado. | Existe [borrador inicial](hazard-log-initial.md) repository-grounded. | Taller, revisión de completitud, estimación, controles, efectividad, ownership, acciones y aprobación de cada versión por CSO. | CSO futuro | `PARTIAL`; borrador no emitido. |
| GAP-DCB-008 | DCB0129 4.1 | Taller multidisciplinar de peligros pendiente; participantes clínicos y desplegador no han intervenido. | Revisión documental/técnica por una sola actividad de ingeniería. | Incluir CSO, usuarios clínicos, paciente/cuidador, arquitectura, testing, safety, quality, privacidad, operaciones y desplegador candidato. | CSO futuro + Project owner futuro | `OPEN`; identificación no puede declararse completa. |
| GAP-DCB-009 | DCB0129 4.2 | Scope clínico/intended use real, entorno, población, interfaces, número/tipo de usuarios y workflow local no aprobados. | README y boundary limitan demo sintética; DEC-016 mantiene `NO_GO`. | Aprobar release scope exacto e intended use; documentar interfaces, procesos, supuestos, exclusiones y configuración. | Product owner + autoridades clínicas/institucionales futuras | `PARTIAL`; solo scope de demo es verificable. |
| GAP-DCB-010 | DCB0129 4.3 | Identificación de peligros no validada como completa para condiciones normales/fallo. | 20 peligros iniciales y screening de escenarios exigidos. | Taller multidisciplinar, experiencia de uso, análisis por interfaz/cambio/dependencia y revisión CSO. | CSO futuro | `PARTIAL`. |
| GAP-DCB-011 | DCB0129 4.4–6.4 | No existe estimación/evaluación inicial, option analysis, evaluación residual, control effectiveness o aceptación. | Celdas `NOT_ESTIMATED`; no hay autoridad/criterios. | Completar análisis bajo Plan aprobado; convertir controles en requisitos verificables; probar implementación y efectividad; reanalizar nuevos hazards. | CSO futuro + Engineering/Test/Clinical owners futuros | `OPEN`; ningún residual risk está aceptado. |
| GAP-DCB-012 | DCB0129 3.4–3.5 | Clinical Safety Case/Report no aprobado. | Existe [informe inicial](clinical-safety-case-report-initial.md) con `Claim → Argument → Evidence → Gap`. | Completar safety case, resolver/justificar gaps, adjuntar Hazard Log emitido, formal review y aprobación CSO por fase. | CSO futuro | `PARTIAL`; no es CSCR emitido. |
| GAP-DCB-013 | DCB0129 3.6, 7.2 | Safety Incident Management Log y proceso de safety incident management no establecidos. | `AuditEvent`, correlation ID y logs sanitizados no son incident log/workflow. DEC-014 está pendiente. | Definir reporting, triage, ownership, investigación, comunicación, resolución, retención, feedback y sanitización; establecer log. | Dirección TI/Operations + CSO futuro, propuestos | `NOT_EVIDENCED`; bloquea operación real. |
| GAP-DCB-014 | DCB0129 7.2 | Monitorización postdespliegue y revisión continua del safety case no implementadas. | `/api/health` solo liveness de proceso; no metrics/traces/SLO/alerts/incident feedback. | Definir métricas clínicas/operativas apropiadas y minimizadas, trigger de revisión, feedback desplegador y action process. | Operations + CSO futuro | `NOT_EVIDENCED`; DEC-014/015 pendientes. |
| GAP-DCB-015 | DCB0129 6.3, Guidance 7.1 | Controles potencialmente transferidos no han sido acordados ni aceptados por hospital alguno. | Safety Case/Hazard Log solo identifican `DEPLOYMENT_CONTROL_CANDIDATE`. | Identificar organización, contrato, control, owner, prueba, fecha, feedback y aceptación; integrar con gestión local/DCB0160. | Fabricante y organización desplegadora futuras | `OPEN`; ningún control = `TRANSFERRED`. |
| GAP-DCB-016 | DCB0129 7.1 | Formal review previo a delivery y autoridad de release no identificados. | DEC-016 = Pendiente; `REAL PILOT = NO_GO`; no hay CSO/Top Management release record. | Definir autoridad y criterios; revisar Plan, hazards, residual risks, defects, monitoring, configuration y transferencias; registrar decisión. | Top Management/fabricante futuro | `NOT_EVIDENCED`; ausencia de liberación clínica identificada. |
| GAP-DCB-017 | DCB0129 7.1.3, 7.3.4 | Configuration/release record clínico y audit trail de releases/patches insuficientes. | Git commit, lockfile, CI y versión package; sin manifest de artefacto/infra/config clínica. | Release manifest, artefactos/hashes, schema/config/rules/dependencies, environment, approvals y patch history. | Configuration/Release owner futuro | `PARTIAL`; commit no equivale a release clínica. |
| GAP-DCB-018 | DCB0129 7.3 | Change/modification safety process no formalizado. | ADR, PR template y tests; sin trigger/análisis DCB0129 por cambio. | Clasificar cambios, analizar nuevos/altered hazards, actualizar Plan/HL/CSCR, aprobar y monitorizar. | CSO futuro + Change/Release owner futuro | `OPEN`. |
| GAP-DCB-019 | DCB0129 6.3.2–6.3.3 | Verificación técnica existe para algunos controles, pero la efectividad clínica no se ha verificado. | 50 archivos de prueba y controles técnicos; sin entorno/usuarios clínicos. | Definir evidencia de efectividad proporcional: clinical simulation, human factors, workflow/failure drills y acceptance criteria aprobados. | Test/Clinical Safety owners futuros | `PARTIAL`; tests no prueban clinical safety. |
| GAP-DCB-020 | Dependencia DCB0160 | No existe organización desplegadora, gestión local, acceptance de controles ni feedback interface. | Decision Packs describen candidatos; ningún hospital está identificado. | Paquete de entrega y colaboración fabricante/desplegador; hazard handoff, control acceptance, local testing, incidents y change communications. | Fabricante/desplegador futuros | `OPEN`; no se afirma DCB0160. |
| GAP-DCB-021 | Safety en continuidad | Continuidad, backup, restore, readiness, contingencia y reconciliación no aprobados/probados. | DEC-015 y GAS2 risk register documentan ausencia; health no consulta DB. | Aprobar/probar RTO/RPO, backup/restore, degraded/alternative workflow, reconciliation, release after restore y drills. | Dirección TI + Dirección de Enfermería, propuestas | `OPEN`; HAZ-GAS-010/018. |
| GAP-DCB-022 | Safety de identidad/acceso | Identidad productiva y autoridad institucional de roles no existen. | Demo aliases; port institucional sin adapter; DEC-013 pendiente. | IdP, subject linking, role/resource mapping, lifecycle, MFA/assurance, service identity, break-glass y tests. | Dirección TI + clinical governance, propuestas | `OPEN`; HAZ-GAS-001/004/012. |
| GAP-DCB-023 | Safety del motor futuro | Motor de compromisos y todos sus controles permanecen diseño no implementado. | Spec CE-01–CE-20 y ADR-0016, ambos documentales/propuestos. | Resolver gates; actualizar hazard analysis; implementar solo en rama autorizada; verificar controls y effectiveness antes de claims. | Arquitectura/Engineering + CSO futuro | `OPEN`; no presentar diseño como capacidad. |
| GAP-DCB-024 | Clinical/human factors validation | Reglas, contenidos, UI y workflows sensibles no tienen validación clínica/human-factors local. | Fixtures sintéticos y unit/E2E; DEC-006–012/017 pendientes. | Intended purpose, content validation, formative/summative usability, training, error/empty/degraded scenarios y clinical simulation. | Autoridades clínicas + CSO futuro | `OPEN`; HAZ-GAS-006–009/012. |

## Dependencias y orden recomendado

```text
Gobierno + CSO
  → Clinical Risk Management Plan + criterios
    → scope/intended use/configuración exactos
      → taller multidisciplinar + Hazard Log estimado
        → requisitos/controles + verificación/efectividad
          → Safety Case + transferencias DCB0160/locales
            → formal release review + monitoring/incidents
```

Este orden no autoriza trabajo funcional ni reemplaza las decisiones canónicas.
ADR-0015, ADR-0016 y DEC-001–DEC-017 conservan exactamente su estado actual.

## Gates explícitos

| Gate | Estado |
| --- | --- |
| Demo sintética controlada | `CONDITIONALLY_ALLOWED` dentro de límites actuales |
| Implementar motor de compromisos | `NO_GO` hasta resolver gates de su especificación y hazards de diseño |
| Datos o identidades reales | `NO_GO` |
| Piloto real | `NO_GO` |
| Producción/uso clínico | `NO_GO` |
| Afirmar conformidad DCB0129 | `NOT_AUTHORIZED` |
| Aceptar riesgo residual | `NOT_AUTHORIZED` |

## Próxima revisión

La próxima versión requiere como mínimo CSO designado, Plan y criterios
aprobados, scope/release definido y taller multidisciplinar. Hasta entonces, los
gaps permanecen abiertos y este registro no puede utilizarse para autorizar un
piloto o liberación.

