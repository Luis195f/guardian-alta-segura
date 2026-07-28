# DEC-016 — Matriz institucional de readiness del piloto

## Control

Esta matriz es `FINAL` como plantilla de evidencia. DEC-016 permanece
`Pendiente`; `REAL PILOT = NO_GO`. No usa puntuación ni semáforo agregado.

```text
DEC-016 DECISION AUTHORITY =
Gerencia del Hospital como Responsable del Tratamiento
```

La última columna de ownership identifica autoridades de decisiones
dependientes, owners de assessments o evidencia y funciones consultivas. Ninguna
entrada convierte a esas funciones en coapprover de DEC-016.

Estados de dominio: `BLOCKED`, `READY_FOR_REVIEW`, `CONDITIONALLY_READY` y
`READY`. Solo describen readiness documental del dominio; no deciden GO.

| Domain | Current evidence | Current status | Required for scope? | Blocker? | Dependency / assessment / evidence owner | Evidence required | Pilot gate |
|---|---|---|---|---|---|---|---|
| Governance | Decision register, ADR, packs y este expediente | `BLOCKED` | Siempre | Sí: DEC-016 pendiente | Evidence owner: institutional governance function, `UNRESOLVED` | Scope/version y approval evidence | Institutional decision |
| Clinical protocols | Versionado técnico; DEC-001/002/006–012 pendientes | `BLOCKED` | Por capability | Sí si in scope | Dependency authority: autoridad canónica de cada DEC clínica | Protocol version/approval/test | Protocol review |
| Clinical safety | HITL/fail-closed y hazards candidates | `READY_FOR_REVIEW` | Siempre | Sí hasta safety case | Assessment owner: competent clinical-safety function, `UNRESOLVED` | Hazard-control-test-owner-residual uncertainty | Safety case |
| Privacy | Minimización parcial; DEC-003/005 pendientes | `BLOCKED` | Siempre con datos/personas | Sí | Assessment owner: Responsable del Tratamiento; DPO/DPD consultative | Purpose, basis assessment, DPIA applicability, flows, rights | Privacy review |
| Security | RBAC demo, loopback, cookies, sanitización parcial | `READY_FOR_REVIEW` | Siempre | Sí hasta assessment/environment | Assessment owner: Dirección TI / security function según gobernanza institucional | Threat model, IAM, TLS, secrets, access review, tests | Security review |
| Identity | Demo-only; port institucional sin adapter | `BLOCKED` | Cualquier usuario real | Sí | Dependency authority: Dirección TI, DEC-013 | DEC-013 approved scope + implementation validation | IAM release |
| Data lifecycle | Inventario/pack DEC-005 | `BLOCKED` | Cualquier dato real | Sí | Dependency authority: Responsable del Tratamiento, DEC-005 | Approved classes/purposes/retention/rights/export | Data release |
| Incident/support | Correlation ID, health y sanitización parcial | `BLOCKED` | Siempre | Sí | Dependency authority: Dirección TI, DEC-014 | DEC-014 scope, plan, ownership, handoff y tests | Operations review |
| Continuity | Pack DEC-015; contingencia desactivada | `BLOCKED` | Por capability | Sí si required | Dependency authority: Dirección de Enfermería, DEC-015 | Plan scope, restore/reconciliation/test evidence | Continuity review |
| Training | No programa institucional | `BLOCKED` | Roles in scope | Sí | Evidence/competency owner: `UNRESOLVED` | Material version, delivery, competency and exclusions | Competency review |
| Technical quality | Suites unit/integration/E2E/CI documentadas | `READY_FOR_REVIEW` | Siempre | No suficiente por sí sola | Technical evidence owner: `UNRESOLVED` | Release-specific CI/build/migrations/security evidence | Technical release |
| Deployment | Solo demo local loopback | `BLOCKED` | Siempre | Sí | Assessment owner: Dirección TI según gobernanza institucional | Environment, network, TLS, DB, secrets, ownership, verification | Deployment validation |
| Regulatory | Sin evaluación competente | `BLOCKED` | Siempre | Sí | Assessment owner: competent institutional/regulatory function, `UNRESOLVED` | Intended purpose/use/claims/functions/jurisdiction assessment | Applicability gate |
| Ethics/research | Sin categorización competente | `BLOCKED` | Según propósito | Sí hasta applicability | Assessment owner: competent ethics/research function, `UNRESOLVED` | Category/protocol/approvals if applicable | Ethics/research gate |
| Rollback | Modelo documental, sin plan local probado | `BLOCKED` | Siempre | Sí | Evidence/operations owner: `UNRESOLVED` | Triggers/actions/access/history/comms/test | Rollback review |
| Monitoring | Capacidades técnicas parciales; sin plan | `BLOCKED` | Siempre | Sí | Evidence owners by domain: `UNRESOLVED` | Metrics, owners, cadence, thresholds approved, escalation | Monitoring review |
| Post-pilot | Modelo documental, sin plan aprobado | `BLOCKED` | Siempre | Sí | Evidence/dependency owners: `UNRESOLVED` | Episodes/tasks/data/access/report/next decision | Closure review |

## Matriz de capabilities del scope

La institución debe completar cada fila. Ninguna omisión autoriza.

| Capability | `IN_SCOPE / EXCLUDED / DEFERRED` | DEC dependencies | Evidence reference | Conditions |
|---|---|---|---|---|
| Episode governance | `DEFERRED` | 001, 002, 005, 013 | — | — |
| Safety Plan | `DEFERRED` | 003, 005, 013 | — | — |
| Home Safety | `DEFERRED` | 007, 005, 013 | — | — |
| Check-ins | `DEFERRED` | 003, 005, 006, 013 | — | — |
| Alerts/rules | `DEFERRED` | 005, 008, 009, 013 | — | — |
| Task workflow | `DEFERRED` | 005, 013, 017 | — | — |
| Caregiver portal | `DEFERRED` | 003, 004, 005, 013 | — | — |
| SBAR | `DEFERRED` | 005, 012, 013 | — | — |
| Crisis resource | `DEFERRED` | 010, 011, 013 | — | — |
| Identity/RBAC | `DEFERRED` | 013 | — | — |
| Audit/evidence | `DEFERRED` | 005, 013, 014 | — | — |
| Incident handling | `DEFERRED` | 014 | — | — |
| Continuity | `DEFERRED` | 005, 013, 014, 015 | — | — |
| Exports | `DEFERRED` | 005, 012, 013 | — | — |
| External integrations | `DEFERRED` | 003, 005, 013, 014, 015 + contract | — | — |

## Training / competency worksheet

| Role | Pilot responsibility | Required training | Competency evidence | Refresher? | Untrained behavior | Owner |
|---|---|---|---|---|---|---|
| Nurse | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | No pilot access/capability | `UNRESOLVED` |
| Clinician | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | No pilot access/capability | `UNRESOLVED` |
| Patient | If in scope | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | No enrollment/access | `UNRESOLVED` |
| Caregiver | If in scope | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | No caregiver access | `UNRESOLVED` |
| Support | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | No pilot support privilege | `UNRESOLVED` |
| Admin | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | `UNRESOLVED` | No pilot administration | `UNRESOLVED` |

## Hard blockers review

Cada blocker se registra como `NOT_APPLICABLE_BY_APPROVED_SCOPE`,
`APPLICABILITY_REVIEW_REQUIRED`, `OPEN_BLOCKER` o `RESOLVED_WITH_EVIDENCE`.
`GO_WITH_CONDITIONS` no admite `OPEN_BLOCKER`.

| Blocker category | Status | Evidence / rationale |
|---|---|---|
| DEC-016 primary authority/scope/version/approval evidence | `OPEN_BLOCKER` | DEC-016 pendiente |
| Real-data lifecycle | `OPEN_BLOCKER` | DEC-005 pendiente |
| Institutional identity | `OPEN_BLOCKER` | DEC-013 pendiente |
| Incident/support | `OPEN_BLOCKER` | DEC-014 pendiente |
| Continuity required by scope | `APPLICABILITY_REVIEW_REQUIRED` | DEC-015 pendiente |
| Clinical protocols | `APPLICABILITY_REVIEW_REQUIRED` | Scope no seleccionado |
| Regulatory | `OPEN_BLOCKER` | Assessment required |
| Ethics/research | `APPLICABILITY_REVIEW_REQUIRED` | Purpose no seleccionado |
| Privacy/security/safety | `OPEN_BLOCKER` | Assessments/evidence absent |
| Training/deployment/rollback/monitoring | `OPEN_BLOCKER` | Plans/evidence absent |
