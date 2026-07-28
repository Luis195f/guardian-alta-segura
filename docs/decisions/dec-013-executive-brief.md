# Qué debe decidir Dirección TI antes de habilitar autenticación productiva

## Decisión solicitada

DEC-013 debe definir, con evidencia institucional versionada, quién puede
autenticarse, mediante qué servicio y nivel de assurance, cómo se enlaza una
identidad externa con una cuenta interna y cómo se limita, revisa y revoca el
acceso. La autoridad primaria es Dirección TI. El estado canónico permanece
`Pendiente`; el gate actual es `READY_FOR_INSTITUTIONAL_DECISION`.

Este brief es evidencia de apoyo a la decisión, no su aprobación.

Dirección TI es la única autoridad primaria de DEC-013. Privacidad, la función
institucional de seguridad/IAM, operaciones clínicas, Responsable del
Tratamiento y las autoridades de otras decisiones actúan como consultas o
dependencias, no como coautoridades de DEC-013.

## Qué existe hoy

El repositorio contiene exclusivamente un flujo demo no productivo con seis
aliases sintéticos y roles fijos. Las sesiones demo usan un token aleatorio
almacenado solo como hash, cookie `HttpOnly`/`SameSite=Strict`, TTL absoluto,
logout de una sesión y revalidación de usuario y roles en cada lectura.

La autorización profesional exige además responsabilidad sobre el episodio.
`admin` y `support` no tienen acceso clínico. El acceso caregiver añade
invitación, autorización legal, scope versionado, una sesión separada y
revocación transaccional que preserva la historia.

No existen adapter de IdP institucional, OIDC/SAML, MFA, refresh tokens,
timeouts productivos, linking de subject externo, recovery, break-glass,
impersonation, service identities ni tenant/organization scope.

Los únicos roles runtime actuales son `admin`, `nurse`, `clinician`, `patient`,
`caregiver` y `support`. La función institucional de seguridad/IAM no es un rol
de aplicación.

Los approved capability scopes son `WORKFORCE_AUTHENTICATION`,
`PATIENT_AUTHENTICATION`, `CAREGIVER_AUTHENTICATION`,
`ADMIN_SUPPORT_ACCESS`, `PRIVILEGED_ACCESS`, `BREAK_GLASS` y
`SERVICE_IDENTITY`. Cada uno se incluye, excluye o difiere separadamente.

## Qué debe decidirse

| Ámbito | Decisión institucional mínima |
|---|---|
| Capability scopes | Workforce, patient, caregiver, admin/support, privileged, break-glass y service identity en scope, excluidos o diferidos por separado |
| IdP y protocolo | Proveedor o federation boundary, protocolo, issuer/audience y evidencia de pruebas |
| Subject y linking | Identificador estable, unicidad, relinking, merge/split y protección frente a account takeover |
| Lifecycle | Provisioning, cambios, desactivación, revocación y recertificación |
| Assurance | Mecanismo reforzado para workforce y proporcional para patient/caregiver; MFA/step-up siguen sin seleccionar |
| Sesiones | Idle y absolute timeout, renovación/rotación, concurrencia, logout y revocación global |
| Roles y recursos | Claims aceptados, mapping versionado, relación/responsabilidad y policy/scope antes de autorizar |
| Admin/support | Acceso técnico ordinario por función, con clinical denial por defecto |
| Privilegio | Standing, temporal, JIT o elevated privilege como scope separado |
| Break-glass | Acceso excepcional de emergencia como scope separado, si se aprueba |
| Evidencia | Eventos mínimos, retención, acceso a audit y prohibición de secretos o contenido clínico |
| Disponibilidad | Comportamiento ante caída del IdP, credencial inválida, clock skew y fallo de revocación |

## Condiciones no negociables

- Identity proofing, authentication y authorization siguen siendo controles
  distintos.
- Un rol técnico no equivale automáticamente a una función institucional ni a
  acceso clínico.
- La cadena es IdP identity → role mapping → technical role → resource
  relationship/responsibility → policy/scope → authorization.
- `nurse` y `clinician` no reciben acceso global; `admin` y `support` no
  heredan acceso clínico.
- Password-only no es elegible para workforce profesional bajo el REQ-12
  vigente. Esto no selecciona MFA ni el mecanismo reforzado definitivo.
- Patient login no resuelve DEC-001/003; caregiver login no resuelve DEC-004.
- No se reutilizan aliases, TTL ni cookies demo como política productiva.
- No se usan emails como subject estable sin decisión y evidencia explícitas.
- Break-glass, si se aprueba, debe ser limitado, temporal, auditable y revisado.
- No se registran tokens, cookies, secretos, PHI/PII ni notas clínicas.

## Salida requerida

Dirección TI debe completar y aprobar una instancia del
[formulario DEC-013](dec-013-decision-form.md), respaldada por la
[matriz de opciones](dec-013-option-matrix.md). Cada opción necesita alcance,
versión, rationale, approver role, evidence reference, fecha efectiva, revisión,
dependencias y blockers.

Solo una DEC-013 formalmente aprobada para un scope concreto permite pasar a
`READY_FOR_TECHNICAL_SPECIFICATION`. No debe iniciarse la implementación de un
IdP hasta completar esa especificación y las revisiones IAM, seguridad,
privacidad y arquitectura aplicables. Un scope incluido no habilita los scopes
omitidos, excluidos o diferidos.
