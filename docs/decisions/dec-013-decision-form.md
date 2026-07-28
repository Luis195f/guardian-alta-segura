# DEC-013 — Formulario institucional de decisión

## Instrucciones

Completar únicamente con información institucional aprobable y referencias
versionadas. No incluir nombres, firmas, emails, tenant/client IDs, endpoints,
hostnames, tokens, secretos, datos clínicos ni otra PHI/PII. Las identidades
nominales y firmas permanecen en el sistema institucional correspondiente.

`DEC-013-A` a `DEC-013-P` son identificadores de trabajo dentro de la única
decisión canónica DEC-013. No son decisiones canónicas independientes.

| Plano | Estado actual / valores |
|---|---|
| Decision pack document status | `FINAL` |
| Decision form template status | `FINAL` |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` |
| Canonical DEC-013 status | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Readiness gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` |

La plantilla está `FINAL`; una instancia nace normalmente `DRAFT`; DEC-013 sigue
`Pendiente` y el gate actual es `READY_FOR_INSTITUTIONAL_DECISION`.

## Cabecera del expediente

| Campo | Valor |
|---|---|
| Decision pack version | |
| Decision form template status | `FINAL` — read-only |
| Workshop/reference | |
| Organization / scope | |
| Prepared by role | |
| Reviewers by role | |
| Institutional decision workbook status | `DRAFT / UNDER_REVIEW / FINAL` — no canónico |
| Canonical decision ID | `DEC-013` |
| Canonical decision status | `Pendiente` — read-only hasta evidencia formal |
| Primary authority | Dirección TI |
| Consultative/dependency authorities | Solo referencias por disciplina o decisión; no coautoridades de DEC-013 |
| Evidence repository reference | |

## Approved capability scope

Cada población/capacidad debe marcarse de forma independiente:

| Scope | `IN_SCOPE / EXCLUDED / DEFERRED` | Límites, versión y evidencia |
|---|---|---|
| `WORKFORCE_AUTHENTICATION` | | |
| `PATIENT_AUTHENTICATION` | | |
| `CAREGIVER_AUTHENTICATION` | | |
| `ADMIN_SUPPORT_ACCESS` | | |
| `PRIVILEGED_ACCESS` | | |
| `BREAK_GLASS` | | |
| `SERVICE_IDENTITY` | | |

`ADMIN_SUPPORT_ACCESS` es acceso técnico ordinario permitido por función;
`PRIVILEGED_ACCESS` es privilegio standing, temporal, JIT o elevado; y
`BREAK_GLASS` es acceso excepcional de emergencia, si se aprueba. Son scopes
distintos.

Una población o capability aprobada no aprueba las demás. Nada `EXCLUDED`,
`DEFERRED` u omitido queda habilitado.

## Campos comunes

Cada bloque debe completar:

- population;
- selected option o custom option;
- rationale;
- approver role;
- approval evidence reference;
- policy/design version;
- approved scope;
- effective date y review date;
- dependencies;
- excluded/deferred scope;
- unresolved blockers;
- notes without PHI/PII.

`Approver role` debe pertenecer al circuito autorizado por Dirección TI para
DEC-013. Las aportaciones de otras autoridades se registran como
consultative/dependency evidence, no como aprobación compartida.

## DEC-013-A — Identity populations / realms

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-A` |
| Population | |
| Question | ¿Qué poblaciones y realms están en scope y cuáles se difieren? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Registrar workforce, admin/support, patient, caregiver y service identities por
separado; indicar si comparten IdP/realm sin presumirlo.

## DEC-013-B — Institutional identity provider

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-B` |
| Population | |
| Question | ¿Cuál es el IdP/source of truth y qué protocolo real soporta? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-A |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

No registrar secretos, IDs reales, endpoints o vendor sin evidencia aprobada.

## DEC-013-C — Subject identifier / account linking

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-C` |
| Population | |
| Question | ¿Qué issuer/identifier es estable y cómo se enlaza a `User`? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-A/B |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar estabilidad, rename, email, collision, múltiples organizaciones,
unlink/relink y recuperación.

## DEC-013-D — Account provisioning / lifecycle

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-D` |
| Population | |
| Question | ¿Cómo se provisiona y gobierna joiner/mover/leaver? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-B/C |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Registrar pre-provisioning, JIT, sync, SCIM o manual solo si existe; incluir
suspensión, reactivación, terminación y reconciliation.

## DEC-013-E — Authentication assurance

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-E` |
| Population | |
| Question | ¿Qué assurance, factores, dispositivo y step-up se exigen? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-A/B |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Para `nurse`, `clinician` y workforce profesional, password-only debe registrarse
como `NOT_ELIGIBLE_UNDER_CURRENT_REQ_12`: no satisface la autenticación reforzada
canónica. Esto no selecciona MFA; Dirección TI todavía debe decidir qué
assurance/mecanismo concreto satisface REQ-12. Para patient/caregiver, registrar
la decisión institucional pendiente sobre autenticación proporcional. Definir
reauthentication/freshness por operación cuando aplique.

## DEC-013-F — Session lifecycle

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-F` |
| Population | |
| Question | ¿Cómo se crean, expiran, rotan, revocan y cierran sesiones? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-B/C/D/E |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar absolute lifetime, idle timeout, refresh, rotation, concurrency, local
y global logout, credential/role/account changes y termination. No usar el TTL
demo como valor productivo.

## DEC-013-G — Role mapping

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-G` |
| Population | |
| Question | ¿Cómo se mapea función institucional a rol técnico? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-C/D |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Adjuntar tabla versionada:

```text
IdP identity
→ role mapping
→ application technical role
→ resource relationship/responsibility
→ policy/scope
→ authorization
```

Registrar autoridad, conflictos, precedence, revocación y access review. Confirmar
que no concede acceso clínico global ni acceso directo a un recurso.

## DEC-013-H — Resource / responsibility authorization

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-H` |
| Population | |
| Question | ¿Qué fuente acredita responsabilidad/relación con cada recurso? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-G; owners de recurso |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir episode responsibility, scope, purpose, freshness, revocación y failure
mode sin inventar HCE.

## DEC-013-I — Admin / support segregation

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-I` |
| Population | `admin / support`; institutional security/IAM function como consulta, no rol runtime |
| Question | ¿Qué privilegios y artefactos corresponden a cada función? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-E/F/G/M/O; DEC-014-G |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar grant, dual control, metadata, export, JIT, expiry, review,
impersonation (si se estudia por separado) y clinical-content denial.

## DEC-013-J — Patient authentication

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-J` |
| Population | `patient` |
| Question | ¿Cómo se autentica, verifica y enlaza una cuenta paciente? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-001, DEC-003, DEC-013-B–F/H |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir recovery y account takeover. Confirmar que login no sustituye DEC-001 o
DEC-003.

## DEC-013-K — Caregiver authentication

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-K` |
| Population | `caregiver` |
| Question | ¿Cómo se autentica, invita, enlaza y recupera una cuenta cuidadora? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-004, DEC-013-B–F/H |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Confirmar que authentication no concede scope, episode, capability o document
permission.

## DEC-013-L — Break-glass / emergency access

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-L` |
| Population | |
| Question | ¿Existe break-glass y con qué scope, duración y review? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-E/F/H/I/M/O/P; DEC-015 |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar requester, user, reason, scope, step-up, duration, notification,
export, audit y post-review. `Universal unrestricted admin access` no es una
opción válida.

## DEC-013-M — Privileged access / JIT

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-M` |
| Population | `admin / support`; institutional security/IAM function como consulta, no rol runtime |
| Question | ¿El privilegio es standing, temporal, JIT o dual-controlled? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-013-E/F/G/I/O |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

## DEC-013-N — Non-human / service identities

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-N` |
| Population | `service identity` |
| Question | ¿Existe necesidad real de identidad no humana y cómo se limita? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | Contrato real de integración/job |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir workload/client mechanism, owner, no-interactive login, scopes, rotation,
revocación y evidencia. No incluir secretos.

## DEC-013-O — Audit / access evidence

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-O` |
| Population | |
| Question | ¿Qué evidencia mínima se conserva para identidad y acceso? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-005, DEC-014 |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Completar success/failure, mapping version, role grant/revoke, session revoke,
privileged/break-glass use, account disablement y access review. Prohibir
credential/token/cookie y contenido clínico.

## DEC-013-P — Identity failure / availability

| Campo | Valor |
|---|---|
| Canonical decision ID | `DEC-013` |
| Working subdecision ID | `DEC-013-P` |
| Population | |
| Question | ¿Qué ocurre ante indisponibilidad, credencial inválida o revocación fallida? |
| Selected option | |
| Custom option | |
| Rationale | |
| Approver role | |
| Approval evidence reference | |
| Policy/design version | |
| Approved scope | |
| Effective date / review date | |
| Dependencies | DEC-015 |
| Excluded/deferred scope | |
| Unresolved blockers | |
| Notes without PHI/PII | |

Definir IdP outage, clock skew, invalid/expired credential, role/account change,
session replay, logout/revocation failure y recovery. Prohibir fallback demo.

## Confirmaciones obligatorias

| Confirmación | Sí / No / evidencia |
|---|---|
| Identity proofing, authentication y authorization permanecen separados | |
| Role mapping no sustituye resource authorization | |
| Role mapping conserva relación/responsabilidad y policy/scope antes del acceso | |
| Technical role no se presenta como función institucional | |
| Los únicos roles runtime son `admin`, `nurse`, `clinician`, `patient`, `caregiver`, `support` | |
| `nurse/clinician` no reciben acceso global | |
| `admin` no hereda acceso clínico | |
| `support` no hereda acceso clínico ni impersonation | |
| Password-only para workforce es `NOT_ELIGIBLE_UNDER_CURRENT_REQ_12` sin seleccionar MFA | |
| Patient login no resuelve DEC-001/003 | |
| Caregiver login no resuelve DEC-004 | |
| No se ha usado email como subject estable sin aprobación | |
| No se han seleccionado vendor o protocolo sin evidencia | |
| No se ha seleccionado MFA/assurance sin evidencia | |
| No se han reutilizado TTL demo como timeouts productivos | |
| Break-glass, si aplica, es limitado, auditable y revisado | |
| No existe universal unrestricted admin access | |
| Tokens/cookies/secrets no aparecen en logs, audit o tickets | |
| Las pruebas usan exclusivamente datos sintéticos | |
| Se preservan DEC-014/015/016 y las autoridades aplicables | |
| La autoridad primaria de DEC-013 sigue siendo exclusivamente Dirección TI | |
| Cada capability scope está incluido, excluido o diferido expresamente | |

## Resultado del gate institucional

| Campo | Valor |
|---|---|
| Canonical DEC-013 status after review | `Pendiente / Propuesta / Aprobada / Retirada / Sustituida` |
| Working subdecisions resolved for scope | |
| Working subdecisions deferred with explicit exclusion | |
| Blocking evidence still missing | |
| Approved populations | |
| Approved capability scope | |
| Policy/design version | |
| Approval evidence reference | |
| Effective date | |
| Review date | |
| Required consultative evidence | |
| Security/privacy dependencies | |
| Contradictions between selected options | |
| Explicitly excluded scope | |
| Unresolved items that remain blocked | |
| Technical test evidence reference | |
| Next gate | `READY_FOR_INSTITUTIONAL_DECISION / READY_FOR_TECHNICAL_SPECIFICATION / READY_FOR_IMPLEMENTATION` |

Marcar el workbook `FINAL` no cambia DEC-013 ni autoriza autenticación. Para
`READY_FOR_TECHNICAL_SPECIFICATION`, DEC-013 debe estar `Aprobada` para una
policy/design version y approved scope concretos, con poblaciones, IdP/protocolo,
subject, assurance, session, role mapping, resource authorization, revocación,
evidencia, effective date y blockers resueltos sin contradicción.

La aprobación solo alcanza los capability scopes marcados expresamente
`IN_SCOPE`: `WORKFORCE_AUTHENTICATION`, `PATIENT_AUTHENTICATION`,
`CAREGIVER_AUTHENTICATION`, `ADMIN_SUPPORT_ACCESS`, `PRIVILEGED_ACCESS`,
`BREAK_GLASS` y/o `SERVICE_IDENTITY`. Los demás permanecen bloqueados.

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ IAM + application security design review
→ READY_FOR_IMPLEMENTATION
```
