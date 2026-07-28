# DEC-013 — Agenda del workshop institucional

## Propósito y resultado esperado

Sesión de decisión de 60 minutos para que Dirección TI delimite la identidad y
el acceso productivos que podrán pasar a especificación técnica. La sesión no
selecciona automáticamente un proveedor, protocolo, política MFA, timeout,
mapping de roles, break-glass, identidad de servicio ni impersonation.

Resultado esperado:

- opciones y alcance registrados en el
  [formulario institucional](dec-013-decision-form.md);
- evidencia pendiente y responsables identificados por función, sin datos
  nominales;
- DEC-013 conservada como `Pendiente` hasta aprobación institucional formal;
- gate mantenido en `READY_FOR_INSTITUTIONAL_DECISION` o, solo si se satisfacen
  todos los criterios, promovido a `READY_FOR_TECHNICAL_SPECIFICATION`.

## Participantes por función

| Función | Papel en la sesión |
|---|---|
| Dirección TI | Autoridad primaria de DEC-013 |
| Seguridad / IAM institucional | Evidencia de IdP, protocolo, assurance, sesiones y acceso privilegiado |
| Privacidad / DPO | Minimización de atributos, linking, evidencia y retención |
| Arquitectura | Integración, disponibilidad, lifecycle y dependencias |
| Operaciones clínicas | Consulta sobre responsabilidad y continuidad; no aprueba identidad |
| Responsable de producto | Límites del MVP, pacientes y cuidadores |
| Legal / gobernanza | Consulta para caregiver, consentimiento y autoridades relacionadas |
| Secretaría técnica | Registra versiones, evidencia, bloqueos y alcance; no decide |

Dirección TI es la única autoridad primaria de DEC-013. Las demás funciones son
consultivas o aportan dependencias; conservan autoridad únicamente sobre sus
propias decisiones.

No registrar nombres, emails, tenant/client IDs, endpoints, secretos, PHI/PII ni
contenido clínico en el acta o en esta plantilla.

## Preparación previa

- Leer el
  [decision pack](dec-013-identity-access-decision-pack.md), la
  [matriz neutral](dec-013-option-matrix.md) y este formulario.
- Aportar referencias versionadas a políticas o pruebas institucionales.
- Separar claramente `WORKFORCE_AUTHENTICATION`, `PATIENT_AUTHENTICATION`,
  `CAREGIVER_AUTHENTICATION`, `ADMIN_SUPPORT_ACCESS`, `PRIVILEGED_ACCESS`,
  `BREAK_GLASS` y `SERVICE_IDENTITY`.
- Identificar qué decisiones pueden aprobarse ahora y qué scopes deben quedar
  `EXCLUDED` o `DEFERRED`.

## Agenda — 60 minutos

| Minutos | Tema | Pregunta de salida |
|---:|---|---|
| 0–5 | Apertura, autoridad y reglas | ¿Se acepta que DEC-013 sigue `Pendiente` y que el objetivo es decisión, no implementación? |
| 5–10 | Baseline técnico verificable | ¿Se reconoce que hoy solo existe identidad demo sintética y no hay autenticación institucional? |
| 10–15 | Poblaciones y capability scope | ¿Qué poblaciones están `IN_SCOPE`, `EXCLUDED` o `DEFERRED`? |
| 15–21 | IdP, protocolo y subject | ¿Qué opción y evidencia se aceptan para cada población, sin usar email como subject por defecto? |
| 21–26 | Provisioning y lifecycle | ¿Cómo nacen, enlazan, desactivan y revisan las cuentas? |
| 26–31 | Assurance / MFA | ¿Qué mecanismo satisface REQ-12 sin tratar password-only como elegible para workforce ni preseleccionar MFA? |
| 31–36 | Sesiones y revocación | ¿Qué reglas de idle/absolute timeout, renovación, concurrencia y revocación aplican? |
| 36–42 | Role mapping y resource authorization | ¿Cómo se conservan relación/responsabilidad y policy/scope después del rol? |
| 42–46 | Admin/support y privileged access | ¿Cómo se separa acceso técnico ordinario de privilegio elevado y se mantiene clinical denial? |
| 46–50 | Patient y caregiver | ¿Qué queda bloqueado por DEC-001/003/004 y qué evidencia adicional falta? |
| 50–54 | Break-glass y service identities | ¿Se excluyen, difieren o especifican con límites y auditoría propios? |
| 54–57 | Audit, privacidad y fallos | ¿Qué evidencia mínima se conserva y qué ocurre ante indisponibilidad o revocación fallida? |
| 57–60 | Cierre y gate | ¿Qué opciones, versiones, blockers y próximo gate quedan formalmente registrados? |

Si la sesión debe durar 45 minutos, unir los bloques de provisioning con
assurance, admin/support con break-glass/service identities, y audit con cierre.
No omitir poblaciones, sesiones, resource authorization ni blockers.

## Reglas de facilitación

1. Resolver primero alcance y población; después opciones técnicas.
2. Registrar una opción por working subdecision o declarar el scope diferido.
3. No trasladar valores demo a producción por conveniencia.
4. Un role claim nunca concede por sí solo acceso a un episodio.
5. Patient y caregiver se deciden separadamente del workforce.
6. La autoridad primaria es Dirección TI; una consulta no crea coautoridad.
7. Una opción sin evidencia suficiente permanece bloqueada.
8. Una contradicción entre opciones impide avanzar de gate.
9. Las objeciones se registran como riesgo o blocker, no como dato clínico.

## Checklist de cierre

- [ ] Los siete capability scopes están `IN_SCOPE`, `EXCLUDED` o `DEFERRED`.
- [ ] `ADMIN_SUPPORT_ACCESS`, `PRIVILEGED_ACCESS` y `BREAK_GLASS` permanecen separados.
- [ ] DEC-013-A a DEC-013-P resueltas o diferidas explícitamente.
- [ ] Authority, approver role y evidence reference completos.
- [ ] Policy/design version, effective date y review date registrados.
- [ ] Dependencias DEC-001/003/004/014/015/016 preservadas.
- [ ] Sin acceso clínico global para `nurse`, `clinician`, `admin` o `support`.
- [ ] “Institutional security/IAM function” no se registra como rol runtime.
- [ ] Los roles runtime siguen siendo exactamente `admin`, `nurse`, `clinician`, `patient`, `caregiver`, `support`.
- [ ] Password-only no se registra como elegible para workforce bajo REQ-12.
- [ ] Sin impersonation ni break-glass implícitos.
- [ ] Sin identificadores, secretos ni PHI/PII en las evidencias técnicas.
- [ ] Blockers y siguiente gate registrados.

## Criterio de salida

El workshop no cambia por sí solo el estado canónico. El gate solo puede pasar
a `READY_FOR_TECHNICAL_SPECIFICATION` si Dirección TI aprueba formalmente un
scope y una versión coherentes, con evidencia suficiente y sin blockers
incompatibles. La implementación requiere después revisión IAM y de seguridad
de aplicación; no queda autorizada por esta agenda. Solo quedan habilitados para
especificación los capability scopes expresamente incluidos.
