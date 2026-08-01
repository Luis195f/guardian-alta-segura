# Índice inicial del Clinical Risk Management File — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`
> `RISK ACCEPTABILITY CRITERIA = NO APROBADOS`
> `RESIDUAL RISK ACCEPTANCE = NINGUNA`
> `REAL PILOT = NO_GO`

## 1. Control documental

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-CRMF-INDEX-INITIAL-001` |
| Versión | `0.1-draft` |
| Fecha de corte | 2026-08-01 |
| Rama | `docs/clinical-risk-management-plan` |
| Commit base | `4d120c5a46c9e72fdf15279462db3a64350583d8` |
| Estado del índice | `DRAFT` |
| Estado del Clinical Risk Management File | `PARTIAL / NOT_ESTABLISHED_AS_AN_APPROVED_REPOSITORY` |
| Clasificación | `DOCUMENTED_CONTROL_ONLY` |
| Aprobación | `PENDING_APPROVAL` |

Este documento es un índice controlado inicial. No afirma que el Clinical Risk
Management File (CRMF) esté completo, establecido, aprobado o conforme. Git
aporta historial técnico, pero no demuestra por sí solo autorización, retención,
backup, control de acceso, retrieval durante todo el lifecycle, firma o emisión
formal.

DCB0129 se usa como metodología; no se declara cumplimiento, aplicabilidad
jurídica automática en España ni conformidad DCB0160. La versión oficial
verificada sigue siendo DCB0129 Specification v4.2 / Implementation Guidance
v3.2, Amd 24/2018, y
[DCB0129/DCB0160 continúan en revisión por NHS England](https://www.england.nhs.uk/long-read/national-review-of-clinical-risk-management-standardsdcb0129-and-dcb0160-supporting-information/).

## 2. Reglas de inclusión y configuración

1. Incluir artefactos que documenten decisiones, actividades, resultados o
   evidencia del proceso de clinical risk management, aunque estén pendientes.
2. Registrar ubicación exacta, ID/versión, baseline/release, owner, revisores,
   aprobadores, dependencias y evidencia faltante.
3. Usar referencias recuperables; un conjunto de archivos debe declarar patrón
   y criterio de selección.
4. No convertir `DRAFT`, test técnico, propuesta o fixture en artefacto aprobado.
5. Preservar historia: una corrección crea nueva versión; no se borra ni
   sobrescribe una versión emitida o evidencia histórica.
6. Mantener separado `CURRENT_BASELINE`, `DOCUMENTED_CONTROL_ONLY`,
   `DESIGN_FORESEEABLE`, `DEPLOYMENT_CONTROL_CANDIDATE`,
   `INSTITUTIONAL_CONTROL_PENDING`, `INSUFFICIENT_EVIDENCE` y `NOT_APPLICABLE`.
7. Para documentos/procesos usar `DRAFT`, `PARTIAL`, `NOT_EVIDENCED`,
   `PENDING_APPROVAL`, `NOT_OPERATIONAL`, `APPROVED` solo con evidencia formal y
   `CLOSED` solo con cierre competente. Ningún nuevo artefacto está `APPROVED` o
   `CLOSED`.
8. Toda baseline futura debe fijar commit, release, schema, migraciones,
   dependencias, configuración, reglas, infraestructura, artefactos y approvals.
9. PHI/PII, texto clínico real, secretos, credenciales y datos reales quedan
   prohibidos en este índice y en evidencia técnica/operativa.
10. Quality/Configuration y el CSO futuros deberán establecer ubicación
    autorizada, permisos, backup, archivo, retrieval y lifecycle. Hoy están
    `INSTITUTIONAL_CONTROL_PENDING`.

## 3. Registro controlado de artefactos

“Versión/commit” identifica la evidencia inspeccionada, no una release clínica.
Todos los owners/revisores/aprobadores son propuestos y no aceptados.

| Artefacto / clasificación | Ubicación exacta | Versión o commit aplicable | Owner propuesto | Revisor requerido | Aprobador requerido | Estado documental | Evidencia faltante / dependencias | Próxima acción por evento o gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Clinical Risk Management Plan / `DOCUMENTED_CONTROL_ONLY` | `docs/clinical-safety/dcb0129/clinical-risk-management-plan-initial.md` | `0.1-draft`; working tree basado en `4d120c5a…` | Project/Quality owner futuro | Equipo multidisciplinar + CSO futuro | CSO + Top Management futuros según autoridad definida | `DRAFT / PENDING_APPROVAL / NOT_OPERATIONAL` | CSO, criterios, RACI aceptada, competencias y proceso aprobados | Revisar cuando se designe CSO o cambie scope/fase/personas clave |
| Hazard Log / `DOCUMENTED_CONTROL_ONLY` | `docs/clinical-safety/dcb0129/hazard-log-initial.md` | `0.1-draft`; incluido en `4d120c5a…` | CSO futuro | Taller multidisciplinar | CSO futuro | `DRAFT / PARTIAL` | Taller, estimación, efectividad, residual y aprobación | Reemitir tras Plan/criterios aprobados y taller |
| Clinical Safety Case Report / `DOCUMENTED_CONTROL_ONLY` | `docs/clinical-safety/dcb0129/clinical-safety-case-report-initial.md` | `0.1-draft`; incluido en `4d120c5a…` | CSO futuro | Clínicos, Engineering, Quality, Test, Security, Operations | CSO futuro | `DRAFT / PARTIAL` | Claims completos, Hazard Log emitido, controles/efectividad, residual, formal review | Actualizar al cambiar fase, hazards, release o evidencia |
| DCB0129 Gap Register / `DOCUMENTED_CONTROL_ONLY` | `docs/clinical-safety/dcb0129/dcb0129-gap-register.md` | `0.2-draft`; working tree basado en `4d120c5a…` | Quality/Clinical Safety futuro | Owners de cada gap + CSO | Autoridad definida por gap | `DRAFT / PARTIAL` | Cierres/aprobaciones formales; todos los requisitos siguen abiertos | Revisar cuando un gate produzca evidencia nueva o invalide evidencia |
| Safety Incident Management Plan / `DOCUMENTED_CONTROL_ONLY` | `docs/clinical-safety/dcb0129/safety-incident-management-plan-initial.md` | `0.1-draft`; working tree basado en `4d120c5a…` | Operations + CSO futuros | TI, Clinical Safety, Security, Privacy, Quality, desplegador futuro | Dirección TI para DEC-014 + autoridades clínicas/jurídicas en su competencia; CSO para safety process | `DRAFT / PENDING_APPROVAL / NOT_OPERATIONAL` | Canal, roles, lifecycle, handoffs, retención, pruebas y aprobaciones | Someter cuando DEC-014 tenga scope/version y CSO esté designado |
| Safety Incident Management Log / `DOCUMENTED_CONTROL_ONLY` | `docs/clinical-safety/dcb0129/safety-incident-log-template.md` | `0.1-draft`; working tree basado en `4d120c5a…` | Operations/Quality futuros | CSO + Security/Privacy | Autoridad de proceso futura | `DRAFT / EMPTY_TEMPLATE / NOT_OPERATIONAL` | Sistema source-of-truth, acceso, retención, procedimiento y pruebas | Instanciar solo después de aprobar proceso/canal y baseline |
| System assurance boundary / `DOCUMENTED_CONTROL_ONLY` | `docs/system-assurance-boundary.md` | Estado `PROPUESTA`; presente en `4d120c5a…` | Arquitectura/Product futuros | Clínicos, Safety, Regulatory, Engineering | Autoridad regulatoria/institucional futura | `PARTIAL / PENDING_APPROVAL` | Intended purpose, claims, evaluación regulatoria y separación verificable | Revisar antes de cualquier implementación dependiente |
| ADR-0015 / `DOCUMENTED_CONTROL_ONLY` | `docs/adr/0015-guardian-core-clinical-rules-boundary.md` | `Propuesta`; presente en `4d120c5a…` | Arquitectura | Clinical Safety/Regulatory/Engineering | Autoridad ADR futura | `PENDING_APPROVAL` | Aceptación formal y evidencias de gate | Mantener bloqueo hasta pasar a estado aceptado con autoridad |
| ADR-0016 / `DESIGN_FORESEEABLE` | `docs/adr/0016-commitment-evaluation-concurrency.md` | `PROPUESTA DE DISEÑO / NO IMPLEMENTADA`; presente en `4d120c5a…` | Arquitectura/Engineering | Test, DB, Clinical Safety | Autoridad ADR futura | `PENDING_APPROVAL / NOT_OPERATIONAL` | Schema real, implementación y pruebas PostgreSQL de carrera | Reabrir al aprobar gates del motor o cambiar aggregate/locking |
| Commitment engine specification / `DESIGN_FORESEEABLE` | `docs/architecture/commitment-engine-spec.md` | `DISEÑO INTERNO / NO IMPLEMENTADO`; presente en `4d120c5a…` | Arquitectura/Product | Clinical Safety, Engineering, Test, Security, Operations | Autoridades DEC/ADR aplicables | `PARTIAL / NOT_OPERATIONAL` | ADR-0015, DEC-002/005/013–017, hazards, código y tests | No implementar hasta superar fase 0 y stop conditions |
| Requirements traceability Markdown / `CURRENT_BASELINE` documental | `docs/requirements-traceability.md` | Presente en `4d120c5a…` | Product/Quality | Owners/autoridades canónicas REQ | Autoridades canónicas REQ | `PARTIAL` | Validación/implementación variable; estados canónicos sin cambio | Actualizar solo ante cambio canónico autorizado y junto con CSV |
| Requirements traceability CSV / `CURRENT_BASELINE` documental | `docs/requirements-traceability.csv` | Presente en `4d120c5a…` | Product/Quality | Owners/autoridades canónicas REQ | Autoridades canónicas REQ | `PARTIAL` | Igualdad Markdown/CSV y evidencia futura | Ejecutar trazabilidad en cada cambio aplicable |
| Decision Register / `CURRENT_BASELINE` documental | `docs/decision-register.md` | DEC-001–017 `Pendiente`; presente en `4d120c5a…` | Gobierno institucional futuro | Autoridades canónicas | Autoridad de cada DEC | `PARTIAL / PENDING_APPROVAL` | Evidencias versionadas y atribuibles; DEC-016 bloquea piloto | Actualizar solo tras decisión formal; preservar historial |
| Decision Packs aplicables / `DOCUMENTED_CONTROL_ONLY` | `docs/decisions/dec-002-episode-closure-decision-pack.md`; `dec-005-data-lifecycle-decision-pack.md`; `dec-013-identity-access-decision-pack.md`; `dec-014-incident-operations-decision-pack.md`; `dec-015-continuity-decision-pack.md`; `dec-016-real-pilot-gate-decision-pack.md`; `dec-017-task-policy-decision-pack.md` | `FINAL` no canónico; DEC correspondientes `Pendiente`; presentes en `4d120c5a…` | Owner canónico DEC | Funciones consultivas indicadas | Autoridad canónica DEC | `PARTIAL / PENDING_APPROVAL` | Formularios completados, scope/version y approval evidence | Activar gate siguiente solo tras decisión formal válida |
| Registros de pruebas unitarias / `CURRENT_BASELINE` | `src/**/*.test.ts`; `prisma/**/*.test.mjs`; configuración `vitest.config.ts` | Código en `4d120c5a…`; resultados de esta rama por validar | Test/Engineering | Quality + control owner | Release authority futura | `PARTIAL` | Resultado reproducible de baseline exacta y mapping por control | Ejecutar en cada cambio/release candidata |
| Registros de integración / `CURRENT_BASELINE` | `src/**/*.integration.test.ts`; configuración `vitest.integration.config.ts` | Código en `4d120c5a…`; resultados de esta rama por validar | Test/Engineering | Quality + DB/control owner | Release authority futura | `PARTIAL` | Entorno representativo, resultados y defectos vinculados | Ejecutar con PostgreSQL en cada release candidata |
| Registros E2E / `CURRENT_BASELINE` | `tests/e2e/*.spec.ts`; `playwright.config.ts` | Código en `4d120c5a…`; resultados de esta rama por validar | Test/Product | Quality, Accessibility, Clinical users futuros | Release authority futura | `PARTIAL` | Factores humanos/entorno real no cubiertos | Ejecutar baseline; ampliar tras protocolo aprobado |
| CI / `CURRENT_BASELINE` | `.github/workflows/ci.yml` | Presente en `4d120c5a…` | Engineering/Quality | Security/Configuration | Release authority futura | `PARTIAL` | Run asociado a artefacto/release; CI no es approval | Vincular run inmutable durante formal release review |
| Evidencia de configuración/release / `INSUFFICIENT_EVIDENCE` | `package.json`; `pnpm-lock.yaml`; `.env.example`; `prisma/schema.prisma`; `prisma/migrations/**`; `.github/workflows/ci.yml`; no existe release manifest clínico | Baseline `4d120c5a…`; package `0.1.0` no es release clínica | Configuration/Release futuro | Quality, Engineering, Security, CSO | Top Management/release authority futuros | `PARTIAL / NOT_EVIDENCED_FOR_CLINICAL_RELEASE` | Artefact hashes, infra, rules/config, approvals, rollback y formal review | Crear manifest solo para release candidata autorizada |
| Evidencia de revisión clínica / `INSUFFICIENT_EVIDENCE` | `NOT_EVIDENCED` — no existe ubicación aprobada | No aplicable | Clinical owner + CSO futuros | Usuarios/panel multidisciplinar | CSO/autoridad clínica competente | `NOT_EVIDENCED` | Protocolo, participantes, resultados, decisiones y conflictos | Crear al completar revisión clínica autorizada |
| Evidencia de factores humanos/accesibilidad / `INSUFFICIENT_EVIDENCE` | Tests técnicos en `tests/e2e/**`; evidencia clínica de factores humanos `NOT_EVIDENCED` | Baseline `4d120c5a…` para tests técnicos | Human Factors/UX + Clinical Safety futuros | Usuarios representativos, Accessibility, CSO | Autoridad clínica/producto futura | `PARTIAL` | Protocolo, escenarios degradados, muestra, hallazgos, actions | Ejecutar antes de gate usabilidad/piloto |
| Evidencia de continuidad / `INSTITUTIONAL_CONTROL_PENDING` | `docs/decisions/dec-015-continuity-decision-pack.md`; implementación/pruebas de backup/restore `NOT_EVIDENCED` | DEC-015 `Pendiente`; presente en `4d120c5a…` | Enfermería + TI/Operations futuros | Clinical Safety, Security, Quality | Dirección de Enfermería para DEC-015 y autoridades aplicables | `PARTIAL / NOT_OPERATIONAL` | Plan aprobado, RTO/RPO, backup/restore/reconciliation/drills | Producir tras aprobar scope DEC-015; antes de real release |
| Evidencia de seguridad/privacidad / `CURRENT_BASELINE` + `INSTITUTIONAL_CONTROL_PENDING` | `docs/platform-foundation-security.md`; `docs/data-classification.md`; `docs/authorization-matrix.md`; DEC-005/013/014 packs; tests security | Presente en `4d120c5a…` | Security + Privacy futuros | DPO/DPD, TI, Clinical Safety, Quality | Autoridades DEC/jurídicas aplicables | `PARTIAL` | Evaluaciones institucionales, threat model actualizado, IAM/ops productivos | Revisar ante scope/data/interface/release change |
| Defect register / `INSUFFICIENT_EVIDENCE` | `NOT_EVIDENCED` como registro controlado único | No aplicable | Quality/Engineering futuros | CSO/control owners | Release authority futura | `NOT_EVIDENCED` | IDs, impacto safety, hazards, disposition y approvals | Establecer antes de formal release review |
| Transferencias al desplegador / `DEPLOYMENT_CONTROL_CANDIDATE` | Candidatos en Hazard Log/Safety Case/Plan; acuerdo de transferencia `NOT_EVIDENCED` | Baseline `4d120c5a…` | Fabricante futuro + desplegador futuro | CSO de ambas partes/autoridades locales | Autoridades formales futuras | `NOT_EVIDENCED / NOT_OPERATIONAL` | Organización, contrato, owner, prueba, aceptación y feedback DCB0160/local | Crear paquete al identificarse desplegador y scope |
| Registros de aprobación / `INSUFFICIENT_EVIDENCE` | `NOT_EVIDENCED` — no existe ubicación aprobada | No aplicable | Quality/Configuration futuro | CSO/autoridad competente | Autoridad correspondiente | `NOT_EVIDENCED / PENDING_APPROVAL` | Firmas, competencia, scope, versión, decisión y fecha | Incorporar solo al existir evidencia formal verificable |

## 4. Dependencias entre artefactos

```text
Gobierno + CSO + competencias
  → Plan + criterios aprobados
    → scope/intended use/configuración exactos
      → identificación/estimación/control en Hazard Log
        → verificación + efectividad + defectos
          → Safety Case por fase
            → transferencias DCB0160/locales
              → formal release review
                → monitoring/incidents/change control
```

El Safety Incident Log alimentará Hazard Log, defect register, change control y
Safety Case cuando exista un proceso operativo. El diseño futuro del motor no
entra en una baseline implementada hasta superar sus gates.

## 5. Estado de completitud y gate

| Comprobación | Estado |
| --- | --- |
| Índice inicial creado | `DRAFT` |
| Repositorio CRMF formalmente establecido | `NOT_EVIDENCED` |
| Artefactos obligatorios completos | `NO` |
| Control de acceso/retención/backup/retrieval aprobado | `NOT_EVIDENCED` |
| Clinical Risk Management Plan aprobado | `NO` |
| Hazard Log/Safety Case emitidos por CSO | `NO` |
| Criterios y riesgos residuales aprobados | `NO / NONE` |
| Incident process/log operativo | `NO` |
| Transferencias aceptadas | `NONE` |
| Release/piloto autorizado | `NO` |

Este índice permanece `DRAFT / PARTIAL`; `REAL PILOT = NO_GO`.

## 6. Revisión y aprobación pendiente

| Función | Persona | Decisión | Estado |
| --- | --- | --- | --- |
| Preparación técnica documental | `NOT_ASSIGNED_TO_A_PERSON_IN_THIS_DOCUMENT` | Preparación del índice | `DRAFT` |
| Quality/Configuration | `NOT_ASSIGNED` | Establecer/controlar CRMF | `PENDING_APPROVAL` |
| CSO | `NO DESIGNADO` | Revisar completitud y aprobar safety documentation | `PENDING_APPROVAL` |
| Top Management futuro | `NOT_IDENTIFIED` | Autorizar governance/recursos/release | `PENDING_APPROVAL` |

La siguiente revisión se activa por designación de CSO, decisión de repositorio,
cambio de fase/release/scope o incorporación/sustitución de evidencia; no se
inventa periodicidad.
