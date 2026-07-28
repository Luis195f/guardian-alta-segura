# Qué falta para pasar de prepiloto sintético a piloto real de Guardián Alta Segura

## Decisión ejecutiva actual

```text
DEC-016 = Pendiente
Decision pack = FINAL
Current gate = READY_FOR_INSTITUTIONAL_DECISION
REAL PILOT = NO_GO
Primary authority = Gerencia del Hospital como Responsable del Tratamiento
```

Guardián tiene un prepiloto técnico controlado con datos e identidades sintéticas.
Organiza episodios, documentos versionados, check-ins, avisos deterministas,
revisión humana, tareas y evidencia técnica. Incluye controles fail-closed,
autorización por recurso, idempotencia, concurrencia y pruebas unitarias, de
integración y E2E.

Eso demuestra capacidad técnica en un entorno de desarrollo; no demuestra
seguridad clínica, legalidad, conformidad, efectividad ni preparación operativa
para personas reales.

## Qué no está validado o disponible

- No existe identidad productiva ni mapeo IAM institucional aprobado.
- No están aprobados población, site, periodo, capacity, módulos o datos.
- DEC-001 a DEC-017 siguen pendientes; cada una puede bloquear capabilities.
- No existe infraestructura de piloto, deployment validation, monitoring,
  soporte/incidentes o continuidad aprobados y probados.
- No hay programa institucional de formación/competencia.
- No hay safety case completo para un scope aprobado.
- Privacidad, seguridad, intended purpose, regulatory applicability y
  ethics/research applicability requieren evaluación competente.
- No existe enrolment real, comunicaciones reales ni integración clínica.

Por ello el nivel actual es `LEVEL_2_CONTROLLED_PREPILOT` dentro del modelo
conceptual de este expediente, no `LEVEL_3_REAL_PILOT_AUTHORIZED`.

## Por qué CI verde y HITL no bastan

CI confirma contratos técnicos en la release probada. No aprueba protocolos,
datos, población, responsabilidades, entorno, soporte, continuidad o
applicability jurídica/regulatoria. La revisión humana reduce automatización, pero
no decide si MDR, AI Act, CE, CEIm, AEMPS u otro marco resulta aplicable.

## Qué debe existir antes del primer enrolment

1. Pilot version + scope completos: purpose/use, site, population, roles,
   modules, data classes, integrations, capacity y period.
2. DEC dependientes aprobadas para ese scope.
3. Protocolos/configuraciones exactos y release freeze.
4. IAM, privacy, security, safety, regulatory y ethics/research evidence.
5. Formación y competencia por rol.
6. Soporte/incidentes, continuidad, deployment y monitoring probados.
7. Stop/pause/resume, rollback y post-pilot plans.
8. `REAL_PILOT_RELEASE_CONTRACT` completo y approval evidence de DEC-016.
9. Revisión técnica de release y final pre-enrollment safety check.

## GO, GO_WITH_CONDITIONS y NO_GO

`GO` solo puede aplicar al scope exacto sin blockers. `GO_WITH_CONDITIONS` puede
limitar scope o añadir reviews/monitoring, pero nunca aplazar un blocker clínico,
jurídico, regulatorio aplicable, IAM, continuidad requerida o de seguridad
determinado por una evaluación aprobada. Cualquier blocker abierto produce
`NO_GO`.

El estado canónico y el outcome se registran por separado:

- `Pendiente` o `Propuesta`: no authorization.
- `Aprobada + NO_GO`: decisión formal de no iniciar; el piloto sigue `NO_GO`.
- `Aprobada + GO`: solo permite pasar al technical release gate.
- `Aprobada + GO_WITH_CONDITIONS`: igual, pero solo sin blockers y con
  condiciones justificadamente no bloqueantes.
- `Retirada` o `Sustituida`: esa versión no autoriza.

`Aprobada` no implica `GO`; `GO` no implica `AUTHORIZED_REAL_PILOT`.

Hoy existe un blocker universal: DEC-016 está `Pendiente`. También permanecen
abiertos identity, real-data lifecycle, incident/support, deployment, training,
safety/privacy/security/regulatory assessments y las dependencies que determine
el scope. Por tanto:

```text
REAL PATIENTS = BLOCKED
REAL CLINICAL DATA = BLOCKED
REAL CAREGIVER ACCESS = BLOCKED
REAL PRODUCTION IDENTITY = BLOCKED
REAL CLINICAL USE = BLOCKED
```

## Qué sucede después de `Aprobada + GO` o `GO_WITH_CONDITIONS` válido

El outcome no despliega ni activa:

```text
DEC-016 = Aprobada with GO / valid GO_WITH_CONDITIONS for pilot version + scope
→ READY_FOR_PILOT_TECHNICAL_RELEASE_REVIEW
→ environment/configuration verification
→ final pre-enrollment safety check
→ AUTHORIZED_REAL_PILOT
```

Solo el scope explícito queda autorizado. Producción o escala requieren decisiones
y gates posteriores.
