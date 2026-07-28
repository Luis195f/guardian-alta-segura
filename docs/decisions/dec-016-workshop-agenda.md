# DEC-016 — Agenda del review board GO / NO-GO

## Control

- Duración: 60–90 minutos.
- Autoridad primaria: Gerencia del Hospital como Responsable del Tratamiento.
- Outcome posible: `GO`,
  `GO_WITH_CONDITIONS` o `NO_GO` sobre una pilot version + scope.
- Estado de entrada: DEC-016 `Pendiente`; `REAL PILOT = NO_GO`.

Participantes consultivos o autoridades de dependencias según scope: Dirección
Médica, Dirección de Enfermería, Dirección TI, DPO/DPD, privacidad, seguridad,
calidad, investigación/CEIm liaison cuando aplique, responsables asistenciales,
arquitectura/producto y soporte/operaciones. Mantienen sus competencias; no son
coautoridad automática de DEC-016.

El board registra por separado el estado canónico de DEC-016 y el pilot
authorization outcome. `Aprobada` no implica `GO`, y `GO` no implica
`AUTHORIZED_REAL_PILOT`.

## Prelecturas y condiciones de entrada

- expediente, readiness matrix y decision form;
- manifest de scope y baseline de release;
- outcomes/evidence references de DEC dependientes;
- safety, privacy, security, regulatory y ethics/research assessments;
- training/competency, support, incident, continuity, deployment, monitoring,
  rollback y post-pilot evidence.

Si falta el scope o no puede identificarse un blocker, registrar `NO_GO` o
reprogramar sin interpretar silencio como aprobación.

## Agenda

| Min | Tema | Resultado requerido |
|---:|---|---|
| 0–5 | Autoridad, propósito y reglas | Confirmar que el board decide solo el scope presentado |
| 5–10 | Baseline del prepiloto | Separar implementation/validation/authorization |
| 10–15 | Población, site, capacity y periodo | Scope explícito o blocker |
| 15–20 | Module/data/integration manifest | Cada capability `IN_SCOPE/EXCLUDED/DEFERRED` |
| 20–25 | DEC-001–017 | Dependencies aplicables y evidence |
| 25–30 | Real data, privacy y legal | Classes/purposes y assessment |
| 30–34 | Identity/access | IAM, roles, sessions, resource scope |
| 34–38 | Clinical protocols y human authorization | Versions, claims y no autonomous action |
| 38–43 | Clinical safety/human factors | Hazards, controls, tests, uncertainty |
| 43–47 | Security | Threat model, environment, secrets, logs, revocation |
| 47–51 | Incident/support | Intake, ownership, handoffs, communication |
| 51–55 | Continuity | Required capability, tests, restore/release |
| 55–59 | Training/competency | Roles, evidence y untrained behavior |
| 59–63 | Technical/deployment baseline | CI/release/config/environment evidence |
| 63–67 | Regulatory applicability | Assessment and applicable requirements |
| 67–71 | Ethics/research applicability | Category, protocol and approvals if required |
| 71–75 | Monitoring/success | Technical/workflow/usability/process only as approved |
| 75–79 | Stop/pause/resume | Triggers, authority, evidence, no auto-resume |
| 79–83 | Rollback/post-pilot | Workflow, history, access, open work and data |
| 83–87 | Conditions and hard blockers | Conditions cannot mask blockers |
| 87–90 | Decision record | Canonical status + GO / GO_WITH_CONDITIONS / NO_GO + evidence reference |

## Facilitation rules

1. No usar score ni votación para compensar blockers.
2. No convertir CI verde, HITL, deployment o un pack preparado en GO.
3. No seleccionar base jurídica, clasificación regulatoria, population, duration,
   RTO/RPO, SLA o vendor por defecto.
4. Una capability omitida queda `DEFERRED`.
5. `GO_WITH_CONDITIONS` solo admite condiciones no bloqueantes.
6. Incidente cerrado no permite resume automático.
7. Rollback y fin de piloto preservan historia y no cierran episodios.
8. `Aprobada + NO_GO` formaliza que el piloto no se inicia.
9. `Aprobada + GO / GO_WITH_CONDITIONS` solo abre el technical release gate.

## Salida

El secretario institucional registra únicamente approver role, evidence
reference, decision version/scope, effective/review dates, conditions, blockers y
estado canónico + pilot outcome. No registra nombres, firmas, patient IDs,
contactos o PHI/PII en el repositorio.
