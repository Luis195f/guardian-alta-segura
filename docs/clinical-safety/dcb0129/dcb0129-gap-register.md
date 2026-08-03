# DCB0129 Gap Register inicial — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`
> `RISK ACCEPTABILITY CRITERIA = NO APROBADOS`
> `RESIDUAL RISK ACCEPTANCE = NONE`
> `REAL PILOT = NO_GO`

## Control y criterio de uso

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-GAP-INITIAL-001` |
| Versión | `0.3-draft` |
| Fecha de corte | 2026-08-02 |
| Rama / commit base | `docs/commitment-sandbox-implementation-gate` / `26190a66554274665f4042c8497da9f403d4f578` |
| Fase | Diseño / prepiloto sintético |
| Safety Case | [Clinical Safety Case Report inicial](clinical-safety-case-report-initial.md) |
| Hazard Log | [Hazard Log inicial](hazard-log-initial.md) |
| Clinical Risk Management Plan | [Borrador inicial](clinical-risk-management-plan-initial.md) |
| Clinical Risk Management File | [Índice inicial](clinical-risk-management-file-index.md) |
| Safety Incident Management | [Plan inicial](safety-incident-management-plan-initial.md) / [plantilla de log](safety-incident-log-template.md) |

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
| GAP-DCB-001 | DCB0129 2.1–2.2 | Proceso organizativo de clinical risk management y governance no definido/aprobado. | `AGENTS.md`, ADR y Decision Packs contienen límites. El [Clinical Risk Management Plan inicial](clinical-risk-management-plan-initial.md) documenta una propuesta de lifecycle, gobierno, RACI, gates y actividades. `DRAFT ONLY / NOT APPROVED / NOT OPERATIONAL`; no constituye proceso implantado. | Constituir entidad/Top Management aplicables, designar CSO competente, asignar recursos/autoridades, integrar con QMS y aprobar/operar el proceso para un scope exacto. | Top Management/fabricante futuro + CSO futuro | `OPEN`; existe evidencia documental parcial, pero el requisito completo sigue abierto y bloquea safety case formal y release. |
| GAP-DCB-002 | DCB0129 2.3 | CSO no designado o sin evidencia de cualificación, experiencia, formación y autoridad. | No se encontró nombramiento verificable. | Nombrar formalmente un clínico competente, registrar cualificación/experiencia/formación, autoridad y disponibilidad. | Top Management/fabricante futuro | `NOT_EVIDENCED`; `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`. |
| GAP-DCB-003 | DCB0129 2.4–2.6 | Competencia/formación del personal y revisión periódica del proceso no evidenciadas. | Pruebas y documentación técnica; sin competency matrix ni revisión de proceso. | Definir competencias de seguridad clínica, formación, registros, evaluación y calendario de revisión. | CSO futuro + Quality/People owner futuro | `OPEN`. |
| GAP-DCB-004 | DCB0129 3.1 | Clinical Risk Management File incompleto/no establecido como repositorio controlado durante todo el lifecycle. | Git contiene artefactos dispersos y existe un [índice inicial controlado](clinical-risk-management-file-index.md). `DRAFT ONLY / NOT APPROVED / NOT OPERATIONAL`; el índice declara documentos y evidencias ausentes. | Establecer el CRM File autorizado con ownership, configuración, retención, backup, acceso, retrieval, firmas y lifecycle; completar y aprobar artefactos. | CSO futuro + Quality/Configuration owner futuro | `PARTIAL`; el requisito completo sigue abierto y Git/índice no prueban un CRM File establecido o completo. |
| GAP-DCB-005 | DCB0129 3.2 | Clinical Risk Management Plan no aprobado ni operativo. | Existe [Clinical Risk Management Plan inicial](clinical-risk-management-plan-initial.md) con scope, intended use, lifecycle, roles propuestos, métodos, gates, change/incident process y plantilla vacía de criterios. `DRAFT ONLY / NOT APPROVED / NOT OPERATIONAL`; criterios `NOT APPROVED / DO NOT USE`. | Designar CSO/autoridades, completar criterios y recursos, revisar multidisciplinariamente, resolver dependencias y obtener aprobación formal antes de uso. | CSO futuro + Project/Quality owner futuro | `PARTIAL`; cambia desde `NOT_EVIDENCED` solo por evidencia documental real. El requisito completo sigue abierto y bloquea estimación/aceptación. |
| GAP-DCB-006 | DCB0129 3.2, 4.4, 5.1, 6.1 | Criterios de severidad, probabilidad, riesgo y aceptabilidad no aprobados. | Risk registers existentes evitan escalas inventadas; Hazard Log usa `NOT_ESTIMATED`. | Definir en el Plan criterios cualitativos/quantitativos, meanings, método de combinación, autoridad y tratamiento de incertidumbre. | CSO futuro + panel multidisciplinar | `NOT_EVIDENCED`; todos los riesgos siguen sin estimar/no aceptados. |
| GAP-DCB-007 | DCB0129 3.3 | Hazard Log no aprobado. | Existe [borrador inicial](hazard-log-initial.md) repository-grounded. | Taller, revisión de completitud, estimación, controles, efectividad, ownership, acciones y aprobación de cada versión por CSO. | CSO futuro | `PARTIAL`; borrador no emitido. |
| GAP-DCB-008 | DCB0129 4.1 | Taller multidisciplinar de peligros pendiente; participantes clínicos y desplegador no han intervenido. | Revisión documental/técnica por una sola actividad de ingeniería. | Incluir CSO, usuarios clínicos, paciente/cuidador, arquitectura, testing, safety, quality, privacidad, operaciones y desplegador candidato. | CSO futuro + Project owner futuro | `OPEN`; identificación no puede declararse completa. |
| GAP-DCB-009 | DCB0129 4.2 | Scope clínico/intended use real, entorno, población, interfaces, número/tipo de usuarios y workflow local no aprobados. | README y boundary limitan demo sintética; DEC-016 mantiene `NO_GO`. | Aprobar release scope exacto e intended use; documentar interfaces, procesos, supuestos, exclusiones y configuración. | Product owner + autoridades clínicas/institucionales futuras | `PARTIAL`; solo scope de demo es verificable. |
| GAP-DCB-010 | DCB0129 4.3 | Identificación de peligros no validada como completa para condiciones normales/fallo. | 20 peligros iniciales y screening de escenarios exigidos. | Taller multidisciplinar, experiencia de uso, análisis por interfaz/cambio/dependencia y revisión CSO. | CSO futuro | `PARTIAL`. |
| GAP-DCB-011 | DCB0129 4.4–6.4 | No existe estimación/evaluación inicial, option analysis, evaluación residual, control effectiveness o aceptación. | Celdas `NOT_ESTIMATED`; no hay autoridad/criterios. | Completar análisis bajo Plan aprobado; convertir controles en requisitos verificables; probar implementación y efectividad; reanalizar nuevos hazards. | CSO futuro + Engineering/Test/Clinical owners futuros | `OPEN`; ningún residual risk está aceptado. |
| GAP-DCB-012 | DCB0129 3.4–3.5 | Clinical Safety Case/Report no aprobado. | Existe [informe inicial](clinical-safety-case-report-initial.md) con `Claim → Argument → Evidence → Gap`. | Completar safety case, resolver/justificar gaps, adjuntar Hazard Log emitido, formal review y aprobación CSO por fase. | CSO futuro | `PARTIAL`; no es CSCR emitido. |
| GAP-DCB-013 | DCB0129 3.6, 7.2 | Safety Incident Management Log y proceso de safety incident management no establecidos. | `AuditEvent`, correlation ID y logs sanitizados no son incident log/workflow. Existen [Safety Incident Management Plan inicial](safety-incident-management-plan-initial.md) y [plantilla controlada del log](safety-incident-log-template.md). `DRAFT ONLY / NOT APPROVED / NOT OPERATIONAL`; la plantilla está vacía y DEC-014 sigue `Pendiente`. | Aprobar scope DEC-014; designar CSO/roles; seleccionar/probar canal y system of record; definir reporting, triage, ownership, investigación, comunicación, cierre/reapertura, retención, feedback, sanitización y handoffs; establecer y operar el log. | Dirección TI/Operations + CSO futuro, propuestos | `PARTIAL`; cambia desde `NOT_EVIDENCED` solo por evidencia documental real. El requisito completo sigue abierto y bloquea operación real. |
| GAP-DCB-014 | DCB0129 7.2 | Monitorización postdespliegue y revisión continua del safety case no implementadas. | `/api/health` solo liveness de proceso; no metrics/traces/SLO/alerts/incident feedback. | Definir métricas clínicas/operativas apropiadas y minimizadas, trigger de revisión, feedback desplegador y action process. | Operations + CSO futuro | `NOT_EVIDENCED`; DEC-014/015 pendientes. |
| GAP-DCB-015 | DCB0129 6.3, Guidance 7.1 | Controles potencialmente transferidos no han sido acordados ni aceptados por hospital alguno. | Safety Case/Hazard Log solo identifican `DEPLOYMENT_CONTROL_CANDIDATE`. | Identificar organización, contrato, control, owner, prueba, fecha, feedback y aceptación; integrar con gestión local/DCB0160. | Fabricante y organización desplegadora futuras | `OPEN`; ningún control = `TRANSFERRED`. |
| GAP-DCB-016 | DCB0129 7.1 | Formal review previo a delivery y autoridad de release no identificados. | DEC-016 = Pendiente; `REAL PILOT = NO_GO`; no hay CSO/Top Management release record. | Definir autoridad y criterios; revisar Plan, hazards, residual risks, defects, monitoring, configuration y transferencias; registrar decisión. | Top Management/fabricante futuro | `NOT_EVIDENCED`; ausencia de liberación clínica identificada. |
| GAP-DCB-017 | DCB0129 7.1.3, 7.3.4 | Configuration/release record clínico y audit trail de releases/patches insuficientes. | Git commit, lockfile, CI y versión package; sin manifest de artefacto/infra/config clínica. | Release manifest, artefactos/hashes, schema/config/rules/dependencies, environment, approvals y patch history. | Configuration/Release owner futuro | `PARTIAL`; commit no equivale a release clínica. |
| GAP-DCB-018 | DCB0129 7.3 | Change/modification safety process no formalizado. | ADR, PR template y tests; el [Clinical Risk Management Plan inicial](clinical-risk-management-plan-initial.md) documenta clasificación, impacto sobre hazards, actualización de Plan/HL/CSCR, pruebas, aprobación, rollback y monitorización. `DRAFT ONLY / NOT APPROVED / NOT OPERATIONAL`; no existe workflow implantado. | Aprobar e implantar change control con owners, trigger, records, autoridades y pruebas; demostrar su uso sobre una modificación/release concreta. | CSO futuro + Change/Release owner futuro | `OPEN`; evidencia documental parcial sin reducir el requisito ni el gate. |
| GAP-DCB-019 | DCB0129 6.3.2–6.3.3 | Verificación técnica existe para algunos controles, pero la efectividad clínica no se ha verificado. | 50 archivos de prueba y controles técnicos; sin entorno/usuarios clínicos. | Definir evidencia de efectividad proporcional: clinical simulation, human factors, workflow/failure drills y acceptance criteria aprobados. | Test/Clinical Safety owners futuros | `PARTIAL`; tests no prueban clinical safety. |
| GAP-DCB-020 | Dependencia DCB0160 | No existe organización desplegadora, gestión local, acceptance de controles ni feedback interface. | Decision Packs describen candidatos; ningún hospital está identificado. | Paquete de entrega y colaboración fabricante/desplegador; hazard handoff, control acceptance, local testing, incidents y change communications. | Fabricante/desplegador futuros | `OPEN`; no se afirma DCB0160. |
| GAP-DCB-021 | Safety en continuidad | Continuidad, backup, restore, readiness, contingencia y reconciliación no aprobados/probados. | DEC-015 y GAS2 risk register documentan ausencia; health no consulta DB. | Aprobar/probar RTO/RPO, backup/restore, degraded/alternative workflow, reconciliation, release after restore y drills. | Dirección TI + Dirección de Enfermería, propuestas | `OPEN`; HAZ-GAS-010/018. |
| GAP-DCB-022 | Safety de identidad/acceso | Identidad productiva y autoridad institucional de roles no existen. | Demo aliases; port institucional sin adapter; DEC-013 pendiente. | IdP, subject linking, role/resource mapping, lifecycle, MFA/assurance, service identity, break-glass y tests. | Dirección TI + clinical governance, propuestas | `OPEN`; HAZ-GAS-001/004/012. |
| GAP-DCB-023 | Safety del motor futuro | El núcleo interno 5B existe únicamente como implementación de sandbox sintético; el evaluador y los controles clínicos, institucionales y operativos continúan no implementados y no existe evidencia de efectividad. | Esta rama añade los cuatro comandos 5B, tres estados/eventos alcanzables, persistencia append-only, gate `COMMITMENT_ENGINE_ENABLED` deny-by-default, policy runtime deny-all y pruebas técnicas unitarias/estáticas/de integración exclusivamente sintéticas. La validación de migración e integración requiere PostgreSQL 16 desechable y debe registrarse como bloqueada si ese entorno no está disponible. ADR-0016 mantiene el evaluador no autorizado. Esta evidencia técnica no prueba efectividad, seguridad clínica, autorización operativa ni uso real. | Verificar la migración y las pruebas de integración sobre PostgreSQL sintético desechable; mantener evaluator/API/UI/datos reales bloqueados. La verificación clínica de controles, autoridades, aceptabilidad, intended use y gates de release sigue pendiente antes de cualquier claim o uso real. | Arquitectura/Engineering + CSO futuro | `OPEN`; implementación sintética parcial sin verificación clínica, ninguna aprobación clínica/institucional y uso real no autorizado. No presentar el sandbox como capacidad operativa. |
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

Este orden no autoriza trabajo funcional operativo ni reemplaza las decisiones
canónicas. ADR-0015 cambia solo su gate arquitectónico interno; ADR-0016 mantiene
el evaluador no autorizado y DEC-001–DEC-017 conservan exactamente sus estados
canónicos.

## Gates explícitos

| Gate | Estado |
| --- | --- |
| Demo sintética controlada | `CONDITIONALLY_ALLOWED` dentro de límites actuales |
| Núcleo interno 5B para sandbox sintético | `CONDITIONALLY_ALLOWED`; implementación técnica futura limitada por la especificación, no uso operativo |
| Evaluador de vencimientos | `NO_GO` |
| Evaluación automática | `NO_GO` |
| Scheduler / worker | `NO_GO` |
| Exposición API/UI | `NO_GO` |
| Datos o identidades reales | `NO_GO` |
| Piloto real | `NO_GO` |
| Producción/uso clínico | `NO_GO` |
| Afirmar conformidad DCB0129 | `NOT_AUTHORIZED` |
| Afirmar conformidad DCB0160 | `NOT_AUTHORIZED` |
| Aceptar riesgo residual | `NONE`; no existe aceptación |

## Próxima revisión

La próxima versión requiere como mínimo CSO designado, Plan y criterios
aprobados, scope/release definido y taller multidisciplinar. Hasta entonces, los
gaps permanecen abiertos y este registro no puede utilizarse para autorizar un
piloto o liberación.

