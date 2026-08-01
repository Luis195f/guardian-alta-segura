# Clinical Risk Management Plan inicial — Guardián Alta Segura

> **BORRADOR DE TRABAJO / NO APROBADO / NO AUTORIZA LIBERACIÓN NI PILOTO**
> `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE`
> `RISK ACCEPTABILITY CRITERIA = NO APROBADOS`
> `RESIDUAL RISK ACCEPTANCE = NINGUNA`
> `REAL PILOT = NO_GO`

## 1. Control documental

| Campo | Valor |
| --- | --- |
| ID documental | `GAS-DCB0129-CRMP-INITIAL-001` |
| Versión | `0.1-draft` |
| Fecha de corte | 2026-08-01 |
| Rama | `docs/clinical-risk-management-plan` |
| Commit base evaluado | `4d120c5a46c9e72fdf15279462db3a64350583d8` (`docs: add initial DCB0129 clinical safety case (#29)`) |
| Autoría técnica documental | Preparación técnica asistida por Codex sobre evidencia del repositorio; no es autoría, revisión ni autoridad clínica |
| Revisión clínica | `PENDING_APPROVAL`; no realizada |
| Aprobación | `PENDING_APPROVAL`; no existe aprobador formal evidenciado |
| Estado del documento | `DRAFT` |
| Estado del proceso | `NOT_OPERATIONAL` |
| Clasificación | `DOCUMENTED_CONTROL_ONLY` |
| Fase | Diseño / prepiloto sintético / sin liberación clínica |

Este plan utiliza DCB0129 como metodología de seguridad clínica. No declara que
Guardián Alta Segura cumpla DCB0129, que DCB0129 sea automáticamente una
obligación jurídica en España, que exista conformidad DCB0160, un fabricante
formalmente constituido para este fin, una organización desplegadora identificada
o un CSO designado, cualificado o autorizado.

La referencia canónica verificada a la fecha de corte continúa siendo
[DCB0129 Amd 24/2018](https://digital.nhs.uk/data-and-information/information-standards/governance/latest-activity/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/),
[Specification v4.2](https://digital.nhs.uk/binaries/content/assets/website-assets/data-and-information/information-standards/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/0129242018spec.pdf)
e
[Implementation Guidance v3.2](https://digital.nhs.uk/binaries/content/assets/website-assets/data-and-information/information-standards/standards-and-collections/dcb0129-clinical-risk-management-its-application-in-the-manufacture-of-health-it-systems/0129242018impguid.pdf).
NHS England confirma que DCB0129 y DCB0160 están sometidos a
[revisión nacional](https://www.england.nhs.uk/long-read/national-review-of-clinical-risk-management-standardsdcb0129-and-dcb0160-supporting-information/).
No se encontró una versión posterior publicada; una futura discrepancia exigirá
evaluación de impacto y decisión de gobierno antes de sustituir esta referencia.

## 2. Propósito y condición de uso

Este plan describe cómo **se propone** organizar la gestión de riesgos clínicos
del sistema evaluado, qué evidencia existe y qué actividades siguen pendientes.
Su finalidad inmediata es preparar trabajo multidisciplinar y gates posteriores
sin convertir una plantilla en proceso, un plan en aprobación, una prueba técnica
en efectividad clínica o un control candidato en transferencia aceptada.

No puede utilizarse para estimar o aceptar riesgos, emitir el Hazard Log o el
Safety Case, aprobar una release, iniciar un piloto, emplear datos reales o
sustituir juicio profesional.

## 3. Fase del ciclo de vida

| Fase | Estado | Uso permitido por este plan |
| --- | --- | --- |
| Concepto y diseño | `PARTIAL` | Análisis repository-grounded y preparación de decisiones |
| Desarrollo técnico | `CURRENT_BASELINE` | Demo local sintética ya existente; este plan no autoriza cambios funcionales |
| Prepiloto sintético | `PARTIAL / NOT_OPERATIONAL` | Verificación técnica y simulación futura con datos sintéticos |
| Release clínica | `NOT_EVIDENCED` | Ninguna |
| Piloto real | `NOT_OPERATIONAL` | `REAL PILOT = NO_GO` |
| Producción/uso clínico | `NOT_OPERATIONAL` | Prohibido por los gates actuales |
| Mantenimiento postdespliegue | `DESIGN_FORESEEABLE` | Proceso futuro, no implantado |
| Decommissioning | `DESIGN_FORESEEABLE` | Plan futuro; sin sistema clínico desplegado que retirar |

## 4. Sistema y alcance evaluado

La fuente rectora es la
[frontera de aseguramiento](../../system-assurance-boundary.md). El alcance
técnico actual es un monolito modular Next.js/TypeScript con Prisma/PostgreSQL:

- dominio, aplicación, persistencia, presentación y rutas bajo `src/**`;
- esquema Prisma y once migraciones existentes, inspeccionados solo en lectura;
- demo local loopback, seis identidades sintéticas, RBAC y autorización por
  recurso;
- episodio, Plan de Seguridad versionado, check-ins, reglas/avisos
  deterministas, revisión humana, tareas, cuidador, Domicilio Seguro, preview
  SBAR, auditoría y evidencia técnica;
- configuración, dependencias, CI y pruebas unitarias, de integración y E2E;
- decisiones DEC-001–017, requisitos REQ-01–14 y diseño futuro del motor de
  compromisos.

Interfaces actuales: navegador local, rutas internas Next.js y PostgreSQL. No
existen interfaces clínicas productivas, IdP institucional, HCE/EHR/FHIR/HL7,
mensajería, telefonía, scheduler, worker, backup/restore, failover u operación
hospitalaria.

## 5. Intended use demostrable y usos excluidos

### 5.1. Intended use actualmente demostrable

Demo técnica local y controlada, exclusivamente con datos e identidades
sintéticos, para mostrar partes de un circuito organizativo postalta: registro y
versionado de información, check-in, aviso determinista, revisión humana, tarea
explícita y trazabilidad técnica.

### 5.2. Usos excluidos

- pacientes, cuidadores, profesionales, datos o entornos reales;
- piloto, producción, despliegue institucional o integración clínica;
- diagnóstico, pronóstico, predicción, scoring o clasificación opaca;
- recomendación, prescripción, tratamiento, derivación, firma, comunicación o
  cierre clínico automáticos;
- sustitución de revisión humana o juicio profesional;
- interpretar un aviso, una ausencia, una no respuesta o una evidencia técnica
  como riesgo, incumplimiento, prioridad o corrección clínica;
- certificar el domicilio, emitir SBAR institucional firmado o inventar un
  recurso de crisis;
- afirmar efectividad, seguridad clínica, validación, RGPD, MDR, DCB0129 o
  DCB0160.

## 6. Fronteras, interfaces y clasificación de capacidad

| Clasificación | Aplicación en este plan |
| --- | --- |
| `CURRENT_BASELINE` | Código, schema, migraciones, pruebas y comportamiento demostrable en el commit base |
| `DOCUMENTED_CONTROL_ONLY` | Invariantes, ADR, Decision Packs y este plan sin implementación/operación demostrada |
| `DESIGN_FORESEEABLE` | Motor de compromisos, separación Core/Clinical Rules y procesos futuros |
| `DEPLOYMENT_CONTROL_CANDIDATE` | Posible control local; no transferido ni aceptado |
| `INSTITUTIONAL_CONTROL_PENDING` | Requiere decisión, autoridad, recursos, formación o aprobación local |
| `INSUFFICIENT_EVIDENCE` | No se localizó evidencia verificable suficiente |
| `NOT_APPLICABLE` | Fuera del scope actual con justificación expresa |

El baseline implementado se describe en el Safety Case y Hazard Log. Este plan,
el índice del File y los planes de incidentes son `DOCUMENTED_CONTROL_ONLY`. El
[motor de compromisos](../../architecture/commitment-engine-spec.md) y
[ADR-0016](../../adr/0016-commitment-evaluation-concurrency.md) son
`DESIGN_FORESEEABLE / NO IMPLEMENTADO`. Las responsabilidades de un futuro
desplegador son `DEPLOYMENT_CONTROL_CANDIDATE`; ninguna está aceptada.

## 7. Organización y gobierno propuestos

No existe nombramiento mediante esta tabla. “Propuesto” expresa una función que
deberá ser constituida, dotada, aceptada y autorizada formalmente.

| Función propuesta | Responsabilidad futura | Estado/evidencia faltante |
| --- | --- | --- |
| Top Management de una entidad responsable futura | Recursos, personal competente, niveles de autorización, decisión de release y aceptación que legalmente corresponda | `INSUFFICIENT_EVIDENCE`; entidad/autoridad no constituidas |
| Clinical Safety Officer futuro | Asegurar el proceso; revisar/aprobar Plan, Hazard Log y Safety Case; elevar riesgos no aceptables | `CSO = NO DESIGNADO / APROBACIÓN PENDIENTE` |
| Ingeniería | Mantener arquitectura, controles, trazabilidad, defectos y cambios | Función técnica observable; asignación formal pendiente |
| Quality/Configuration | Control documental, CRM File, baseline, release manifest y approvals | `INSTITUTIONAL_CONTROL_PENDING` |
| Seguridad | Riesgos de seguridad, hardening, evidencias e incident handoff | Rol institucional y proceso pendientes DEC-013/014 |
| Privacidad/DPO/DPD aplicable | Minimización, data flows y evaluación jurídica dentro de su competencia | No designado en este scope; DEC-003/005 pendientes |
| Responsables clínicos | Intended use, contenido, hazards, controles, simulación y criterios | Autoridades canónicas DEC/REQ conservadas; participación pendiente |
| Test/QA | Verificación técnica, simulación, factores humanos y evidencia de defectos | Pruebas técnicas existen; plan safety V&V pendiente |
| Operaciones | Observabilidad, disponibilidad, incidentes, continuidad y rollback | `NOT_OPERATIONAL`; DEC-014/015 pendientes |
| Organización desplegadora futura | Contexto local, DCB0160/local, controles transferidos, formación, operación y feedback | No identificada; ninguna aceptación |

### 7.1. RACI propuesta

`A*` significa accountability futura que requiere autoridad formal. La matriz no
asigna nombres, no constituye nombramiento ni demuestra aceptación.

| Actividad | Top Management futuro | CSO futuro | Ingeniería | Quality/Config | Clínicos | Test/QA | Security/Privacy | Operaciones | Desplegador futuro |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aprobar este Plan | `A*` | `R*` | C | R | C | C | C | C | I |
| Definir scope/intended use | A* | C | C | R | R | C | C | C | C |
| Identificar/analizar peligros | I | A*/R* | R | C | R | R | C | C | C |
| Aprobar criterios de riesgo | A* | R* | C | C | R | C | C | I | C |
| Seleccionar/implementar controles | A* | C | R | C | C | R | C | C | C |
| Verificar implementación | I | C | C | C | C | R | C | C | C |
| Evaluar efectividad clínica | I | A*/R* | C | C | R | R | C | C | C |
| Evaluar/aceptar riesgo residual | A* | R* | I | C | C | C | C | I | C |
| Emitir Hazard Log/Safety Case | I | A*/R* | C | R | C | C | C | I | I |
| Formal release review | A*/R* | R* | C | R | C | R | C | R | C |
| Incidentes/change control | A* | R* | R | R | C | R | C | R | C |
| Transferencia/despliegue | A* | R* | C | R | C | C | C | C | A*/R* |

Todas las asignaciones están `PENDING_APPROVAL`; ninguna celda concede autoridad.

## 8. Competencias y formación requeridas

Antes de asignar tareas deberán definirse y conservarse evidencias de competencia
proporcionales al rol: práctica clínica relevante y vigente; seguridad clínica y
gestión de riesgos en health IT; DCB0129 y, para el desplegador, DCB0160;
ingeniería segura, arquitectura y configuración; testing y factores humanos;
seguridad, privacidad y minimización; gestión de incidentes, continuidad y
release. El CSO futuro deberá satisfacer los requisitos de cualificación,
experiencia, registro profesional y conocimiento de risk management aplicables.

No existe competency matrix, training record, evaluación o nombramiento
verificable: estado `NOT_EVIDENCED / PENDING_APPROVAL`.

## 9. Actividades por fase y gates

| Actividad | Producto esperado | Gate de inicio/cierre | Estado actual |
| --- | --- | --- | --- |
| Planificación | Plan versionado, recursos, roles, métodos y entregables | Aprobación CSO/Top Management futuros | `DRAFT / NOT_OPERATIONAL` |
| Scope e intended use | Baseline, interfaces, entorno, usuarios y exclusiones | Scope exacto aprobado | `PARTIAL`; solo demo verificable |
| Identificación | FFA, HAZID, SWIFT y taller multidisciplinar | Participantes competentes + minuta | Hazard Log inicial; taller `NOT_EVIDENCED` |
| Estimación | Severidad, likelihood y riesgo por criterios aprobados | Criterios aprobados | `NOT_ESTIMATED` |
| Evaluación | Comparación contra aceptabilidad aprobada | Autoridad/criterios | `NOT_EVIDENCED` |
| Control | Option analysis, selección y requisitos | Riesgo evaluado + justificación | Controles actuales/documentales distinguidos; análisis formal pendiente |
| Verificación | Evidencia de control implementado | Criterios de prueba aprobados | Técnica parcial; no clínica |
| Efectividad | Simulación, factores humanos y uso representativo | Protocolo/usuarios competentes | `NOT_EVIDENCED` |
| Evaluación residual | Riesgo restante y aceptabilidad | Verificación/efectividad completas | `NOT_ESTIMATED` |
| Safety Case | Claims, argumentos, evidencia, gaps y Hazard Log emitido | Revisión formal por fase | Borrador inicial `PARTIAL` |
| Formal release review | Configuración, defectos, hazards, monitoring, transferencias y approvals | Cero blocker incompatible; autoridades constituidas | `NOT_EVIDENCED`; release clínica inexistente |
| Mantenimiento/monitorización | Feedback, incidentes, tendencias y revalidación | Despliegue autorizado | `DESIGN_FORESEEABLE` |
| Modificación | Impact assessment y safety artefacts actualizados | Change gate aprobado | Documentado aquí; `NOT_OPERATIONAL` |
| Incidentes | Intake, triage, investigación, control y feedback | Proceso aprobado | Plan/plantilla draft; `NOT_OPERATIONAL` |
| Decommissioning | Plan de retirada, continuidad, datos, comunicación y archivo | Organización/sistema desplegado | `NOT_APPLICABLE` ahora; futuro pendiente |

## 10. Métodos de identificación de peligros

El método propuesto combina:

1. **Functional Failure Analysis (FFA):** función ausente, incorrecta,
   intempestiva, fuera de secuencia o ejecutada cuando no corresponde.
2. **HAZID:** taller estructurado sobre información, acceso, tiempo,
   automatización, workflow, interfaces, dependencias, mantenimiento y personas.
3. **Structured What-If (SWIFT):** escenarios “qué ocurre si” en uso normal,
   fallo, degradación, mal uso razonablemente previsible e interfaces.
4. Revisión end-to-end de proceso clínico-organizativo, arquitectura, mensajes,
   datos, configuración, infraestructura y controles humanos.

Fishbone, análisis de tareas, walkthrough, análisis de barreras u otros métodos
son solo candidatos si el CSO/equipo competente justifican su adecuación. No se
declara completa la identificación sin taller y revisión multidisciplinar.

## 11. Gestión del Hazard Log

El [Hazard Log inicial](hazard-log-initial.md) conserva `HAZ-GAS-001–020`.

- cada peligro mantiene ID estable; no se reutiliza ni renumera;
- causas separadas (`Cnnn-*`) y controles (`CTRL-nnn-*`) conservan identidad;
- cada entrada mantiene `causa → estado peligroso → secuencia → daño`;
- toda versión registra documento, commit/release, scope, fecha de corte,
  autoría, revisores y aprobaciones;
- peligro, control, requisito, decisión, evidencia, prueba, defecto, cambio e
  incidente se trazan por referencia, sin copiar PHI/PII;
- se abre un peligro por nueva fuente potencial de daño o vía clínica plausible;
- se revisa ante cambio de intended use, función, interfaz, dependencia,
  configuración, población, workflow, defecto, incidente o evidencia de control;
- se corrige por nueva versión/evento; nunca se elimina ni sobrescribe historia;
- duplicados se relacionan y conservan; no se cierran por conveniencia;
- `CLOSED` exige análisis completo, controles implementados, verificación y
  efectividad suficiente, riesgo residual evaluado/aceptado por autoridad
  competente, acciones resueltas, evidencia trazable y aprobación CSO;
- una versión formal del Hazard Log requiere aprobación CSO.

Hoy todos los peligros permanecen abiertos, `NOT_ESTIMATED` y sin aceptación.

## 12. Estimación y aceptabilidad del riesgo

No se adopta la matriz ilustrativa de la Implementation Guidance ni se importa
otra escala. Hasta que una autoridad competente apruebe criterios adecuados al
scope, todo peligro mantiene:

```text
severity = NOT_ESTIMATED
likelihood = NOT_ESTIMATED
initial risk = NOT_ESTIMATED
residual risk = NOT_ESTIMATED
acceptability = NOT_DEMONSTRATED
residual acceptance = NONE
```

La aprobación futura requiere: entidad responsable y Top Management definidos;
CSO competente designado; panel multidisciplinar; scope/intended use exactos;
definición de dimensiones, fuentes, incertidumbre, método de combinación,
aceptabilidad y autoridad por nivel; compatibilidad con gobierno local; versión,
aprobación y control de cambios. No se podrá usar un criterio retroactivamente
sin reanalizar cada peligro.

### 12.1. Plantilla vacía de criterios futuros

> `NOT_APPROVED / DO NOT USE`

| Elemento a decidir | Definición/valor futuro | Fuente y justificación | Autoridad | Estado |
| --- | --- | --- | --- | --- |
| Scope de aplicación | `TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |
| Dimensiones de severidad | `TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |
| Base de likelihood | `TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |
| Tratamiento de incertidumbre | `TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |
| Método de combinación | `TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |
| Criterios de aceptabilidad | `TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |
| Autoridad de aceptación residual | `TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |
| Revisión y cambio | `EVENT_BASED_RULE_TO_BE_DEFINED` | `TO_BE_PROVIDED` | `TO_BE_AUTHORIZED` | `NOT_APPROVED` |

## 13. Jerarquía y estados de controles

La selección debe considerar, en orden: eliminar la fuente de peligro cuando sea
posible; diseño seguro; controles técnicos/protectivos; controles de workflow;
información, formación y advertencias; y controles candidatos del desplegador.
Cada opción debe documentar por qué se elige o rechaza, nuevos peligros, requisito
verificable, owner, implementación, prueba, efectividad y evidencia residual.

| Estado del control | Evidencia mínima necesaria |
| --- | --- |
| Propuesto | Opción identificada; no seleccionada ni autorizada |
| Documentado | Contrato/ADR/plan controlado; no implementado |
| Implementado | Evidencia en una configuración exacta |
| Técnicamente verificado | Prueba técnica identificada y reproducible |
| Efectividad clínica evaluada | Protocolo, contexto representativo, resultado y revisión competente |
| Riesgo residual evaluado | Criterios aprobados aplicados tras controles |
| Riesgo residual aceptado | Autoridad competente, scope, versión y evidencia formal |

Ningún control del repositorio tiene demostrada efectividad clínica y ningún
riesgo residual está aceptado. Un control `DEPLOYMENT_CONTROL_CANDIDATE` no está
transferido hasta acuerdo, aceptación y verificación formales.

## 14. Verificación y validación

La estrategia futura debe cubrir, en proporción al peligro:

- pruebas unitarias, integración, PostgreSQL real, API, UI y E2E;
- constraints, autorización negativa, idempotencia, carreras y append-only;
- simulación clínica sintética de uso normal, fallo y mal uso previsible;
- factores humanos, carga cognitiva, automation bias y comprensión de estados;
- accesibilidad por teclado, lector de pantalla, foco, error y vacío;
- escenarios degradados: DB/IdP/dependencia/job/reloj/fuente caídos;
- continuidad, restore, reconciliación, rollback y procedimiento alternativo;
- interfaces, autenticidad, versiones, pertenencia al episodio y datos tardíos;
- validación por usuarios representativos y autoridades competentes.

La evidencia automatizada actual sostiene solo los contratos técnicos probados.
No demuestra seguridad, efectividad clínica, adecuación local ni readiness.

## 15. Defectos, incertidumbres, suppliers y dependencias

Todo defecto debe registrar ID, configuración, reproducción, impacto técnico,
posible vía clínica, hazards/controles asociados, workaround, decisión, prueba y
estado. Una incertidumbre no se convierte en ausencia ni resultado favorable;
puede exigir abstención, análisis adicional o stop. No se inventa severidad.

Componentes terceros actuales incluyen Node.js, Next.js, React, TypeScript,
Prisma, PostgreSQL y tooling de pruebas. Lockfile y CI son evidencia técnica, no
evaluación de supplier ni garantía clínica. Para cada release futura se requiere
inventario, versión, cambio, vulnerabilidades relevantes, compatibilidad,
licencia, soporte, configuración, prueba y impacto en hazards. Integraciones
clínicas siguen `NOT_APPLICABLE` al baseline y requerirán contrato y análisis
propios antes de existir.

## 16. Configuración, release y formal review

Una baseline futura deberá fijar como mínimo:

- commit y versión de aplicación;
- schema Prisma y todas las migraciones aplicables;
- dependencias y lockfile;
- configuración y feature flags, incluido semáforo desactivado si no está
  aprobado;
- catálogo/versiones de reglas y contenido local;
- infraestructura, red, DB, identidad, reloj y dependencias;
- artefactos/hashes y evidencia CI;
- scope/intended use, defectos, Hazard Log, Safety Case y transferencias;
- revisiones/aprobaciones; rollback sin borrar historia.

Antes de delivery se requiere formal release review por autoridades definidas.
En el estado actual: autoridad no identificada, criterios no aprobados, riesgos
no estimados, monitorización/continuidad no operativas y `REAL PILOT = NO_GO`.

## 17. Change control

Cada cambio propuesto se clasificará por funciones, datos, intended use, claims,
interfaz, dependencia, configuración, regla, workflow, infraestructura y
operación afectados. La clasificación no será una escala de riesgo.

El gate exige: baseline y motivo; peligros nuevos/modificados; impacto sobre
controles y transferencias; actualización de Plan, Hazard Log, Safety Case, File,
gaps y requisitos/DEC; pruebas técnicas y de efectividad necesarias; revisión y
aprobación competentes; plan de despliegue/rollback; monitorización posterior.
Cambios de emergencia no omiten revisión: preservan evidencia y pasan por
evaluación retrospectiva competente antes de normalizarse.

## 18. Incidentes, feedback y mantenimiento futuro

El
[Safety Incident Management Plan](safety-incident-management-plan-initial.md) y
la [plantilla de log](safety-incident-log-template.md) son borradores
`NOT_OPERATIONAL`. Incidentes y feedback futuros deberán contrastarse contra
Hazard Log, controles, defectos y Safety Case; pueden abrir nuevos peligros,
invalidar supuestos, exigir contención/change control o reemitir documentos.

Tras un despliegue autorizado, la monitorización incluiría funcionamiento real,
usuarios/workflow, incidentes/near misses, disponibilidad, interfaces, datos,
controles transferidos, cambios de dependencias y feedback del desplegador. No
se fija frecuencia, SLA, umbral o canal: siguen pendientes de decisión.

## 19. DCB0160 y controles candidatos del desplegador

[DCB0160](https://digital.nhs.uk/data-and-information/information-standards/governance/latest-activity/standards-and-collections/dcb0160-clinical-risk-management-its-application-in-the-deployment-and-use-of-health-it-systems/)
se considera únicamente como relación metodológica para una futura organización
que despliegue/use el sistema. Dicha organización deberá evaluar su entorno,
workflows, usuarios, configuración, interfaces, formación, continuidad,
incidentes y decommissioning; verificar y aceptar explícitamente cualquier
control transferido; y devolver feedback. No existe organización identificada,
conformidad DCB0160, aceptación o transferencia actual.

## 20. Clinical Risk Management File

El
[índice inicial del Clinical Risk Management File](clinical-risk-management-file-index.md)
es una lista controlada, no prueba de que el File esté establecido, completo,
aprobado o conforme. Quality/Configuration y el CSO futuros deberán decidir
repositorio autorizado, acceso, retención, backup, retrieval, versionado,
baselines, firmas y lifecycle. Git por sí solo no demuestra esas propiedades.

## 21. Gates y condiciones de parada

Detener o no iniciar trabajo afectado cuando ocurra cualquiera de estas
condiciones:

- rama/commit/scope no identificables o cambios fuera de baseline;
- CSO, autoridad, competencia o recursos requeridos ausentes;
- intended use, criterios de riesgo o configuración no aprobados;
- hazard sin análisis suficiente o residual no evaluado/aceptado;
- control crítico sin implementar/verificar o dependencia transferida no
  aceptada;
- PHI/PII, contenido clínico, secretos o credenciales en logs/tickets/evidencia;
- identidad, wrong-patient, integridad, concurrencia, disponibilidad o interfaz
  degradadas sin estado seguro;
- acción, firma, comunicación, derivación o cierre clínico automáticos;
- recurso de crisis no aprobado, semáforo habilitado o diseño futuro presentado
  como capacidad;
- continuidad, incidentes, rollback o formal release review no disponibles para
  el scope;
- cualquier blocker DEC/REQ aplicable o `DEC-016 = Pendiente`.

Siempre: `REAL PILOT = NO_GO`.

## 22. Trazabilidad integrada HAZ–CTRL–evidencia–REQ–DEC–gap

“Prueba” significa verificación técnica, nunca efectividad clínica. Owners y
revisores son propuestos y no aceptados.

| Actividad | Peligro | Controles actuales/propuestos | Evidencia/prueba | REQ / DEC | Gap | Owner propuesto / revisión requerida | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scope, identidad y enlace | HAZ-GAS-001 | CTRL-001-A–D | Schema; auth/resource/caregiver/check-in tests | REQ-01/05/12; DEC-001/004/013/016 | GAP-DCB-009/022 | TI + Médica / CSO y desplegador | `OPEN / PARTIAL` |
| Idempotencia y completitud | HAZ-GAS-002 | CTRL-002-A–D | UoW; episode/check-in/alert/task concurrency tests | REQ-01/04/08/09/13; DEC-006/014/017 | GAP-DCB-011/019 | Enfermería + TI / CSO | `OPEN / TECHNICALLY_VERIFIED_PARTIAL` |
| Calidad/procedencia | HAZ-GAS-003 | CTRL-003-A–D | ADR-0011/0014; abstention/evidence snapshot tests | REQ-03/04/08/09/11/13; DEC-005/006/008/012/014/017 | GAP-DCB-019/024 | Médica + Enfermería + TI / CSO, usuarios | `OPEN / PARTIAL` |
| Acceso | HAZ-GAS-004 | CTRL-004-A–D | RBAC/session/scope tests; DEC-013 | REQ-02/05/06/12; DEC-004/005/013/016 | GAP-DCB-022 | TI + Responsable del Tratamiento / Security, CSO | `OPEN / DEMO_ONLY` |
| Historia/auditoría | HAZ-GAS-005 | CTRL-005-A–D | Schema/migrations; security/task integration tests | REQ-01/03/04/06/08/09/13/14; DEC-005/014/015 | GAP-DCB-017/021 | TI + workflow owner / Quality, CSO | `OPEN / PARTIAL` |
| Automation bias | HAZ-GAS-006 | CTRL-006-A–D | ADR-0007/0012/0015; rule/auth/E2E tests | REQ-08/09; DEC-008/009 | GAP-DCB-024 | Médica + CSO futuro / human factors | `OPEN / CLINICAL_EFFECTIVENESS_NOT_EVIDENCED` |
| No respuesta | HAZ-GAS-007 | CTRL-007-A–C | Check-in/task models and tests | REQ-04/09; DEC-006/017 | GAP-DCB-024 | Médica + Enfermería / CSO, usuarios | `OPEN / PARTIAL` |
| Falsa confianza UI/demo | HAZ-GAS-008 | CTRL-008-A–D | Claims; Home Safety/SBAR/crisis/UI tests | REQ-07/08/10/11/13; DEC-007/009–012/014/016 | GAP-DCB-024 | Producto + clínicas / human factors, CSO | `OPEN / PARTIAL` |
| Cierre | HAZ-GAS-009 | CTRL-009-A–C | Episode service; DEC-002 pack/tests | REQ-01/09; DEC-002 | GAP-DCB-009/024 | Médica / CSO y gobierno institucional | `OPEN / FAIL_CLOSED_BASELINE` |
| Continuidad | HAZ-GAS-010 | CTRL-010-A–C | Health/error/idempotency; DEC-015 | REQ-13/14; DEC-014/015/016 | GAP-DCB-014/021 | TI + Enfermería / Operations, CSO | `OPEN / NOT_OPERATIONAL` |
| Terceros/configuración | HAZ-GAS-011 | CTRL-011-A–C | package/lock/config/CI/env tests | REQ-12/13/14; DEC-013/014/015 | GAP-DCB-017/018 | TI / Quality, Security, CSO | `OPEN / PARTIAL` |
| Control humano | HAZ-GAS-012 | CTRL-012-A–D | Task accountability/auth/concurrency tests | REQ-09/12/14; DEC-013/015/017 | GAP-DCB-003/024 | Enfermería + TI / CSO, users | `OPEN / INSTITUTIONAL_CONTROL_PENDING` |
| Ausencia ≠ incumplimiento | HAZ-GAS-013 | CTRL-013-A–C | Commitment spec CE-07/12; no executable test | REQ-09; DEC-017; ADR-0015 | GAP-DCB-023/024 | Clínicos + CSO futuro / human factors | `OPEN / DESIGN_FORESEEABLE` |
| Fuente caída | HAZ-GAS-014 | CTRL-014-A–C | Commitment spec CE-11; tests planned | REQ-09/13/14; DEC-014/015 | GAP-DCB-014/021/023 | TI + source owner / CSO, deployer | `OPEN / DESIGN_FORESEEABLE` |
| Evidencia temporal | HAZ-GAS-015 | CTRL-015-A–C | Commitment spec CE-10; ADR-0016 | REQ-09/13; DEC-005/014/017 | GAP-DCB-018/023 | Source owner + Enfermería / CSO | `OPEN / DESIGN_FORESEEABLE` |
| Tiempo/DST/reloj | HAZ-GAS-016 | CTRL-016-A–C | Commitment spec CE-04/05; future tests | REQ-04/09/13; DEC-014/017 | GAP-DCB-018/023 | Enfermería + TI / CSO | `OPEN / DESIGN_FORESEEABLE` |
| Carrera evaluación/evidencia | HAZ-GAS-017 | CTRL-017-A–C | ADR-0016; CE-14; PostgreSQL tests planned | REQ-09/13; DEC-014/017 | GAP-DCB-018/023 | Ingeniería + CSO futuro / Test, CSO | `OPEN / DESIGN_FORESEEABLE` |
| Job silencioso | HAZ-GAS-018 | CTRL-018-A–B | Commitment spec CE-17; no scheduler/test | REQ-09/13/14; DEC-013/014/015/017 | GAP-DCB-014/021/023 | TI/Ops + Enfermería / CSO, deployer | `OPEN / DESIGN_FORESEEABLE` |
| Clinical Rules → Core | HAZ-GAS-019 | CTRL-019-A–C | ADR-0012/0015; boundary; baseline no-auto-action tests | REQ-08/09; DEC-008/017 | GAP-DCB-018/023/024 | Arquitectura + Médica / regulatorio, CSO | `OPEN / DESIGN_FORESEEABLE` |
| Compromiso erróneo | HAZ-GAS-020 | CTRL-020-A–C | Commitment spec CE-01/02/03/14/20 | REQ-01/09/12/13; DEC-002/005/013–017 | GAP-DCB-018/022/023 | Médica/Enfermería + Arquitectura / CSO | `OPEN / DESIGN_FORESEEABLE` |

## 23. Entregables previstos

| Entregable | Estado actual |
| --- | --- |
| Clinical Risk Management Plan | Este documento: `DRAFT / NOT_OPERATIONAL` |
| Clinical Risk Management File index | `DRAFT`; File completo no demostrado |
| Hazard Log | Borrador inicial; todos los hazards abiertos/no estimados |
| Clinical Safety Case Report | Borrador inicial; argumento formal no aprobado |
| DCB0129 Gap Register | Borrador; ningún gap cerrado |
| Safety Incident Management Plan | `DRAFT / NOT_OPERATIONAL` |
| Safety Incident Management Log | Plantilla vacía; no es log operativo |
| Criterios de riesgo | `NOT_APPROVED / DO NOT USE` |
| Competency/training records | `NOT_EVIDENCED` |
| Taller HAZID y revisión clínica/human factors | `NOT_EVIDENCED` |
| Formal release/configuration/approval records | `NOT_EVIDENCED` |
| Transferencias DCB0160/locales | `NOT_EVIDENCED`; ninguna aceptada |

## 24. Revisión del plan

La revisión se activa por evento, fase o cambio: cambio de scope/intended use,
personas clave, ciclo de vida, arquitectura, función, interfaz, dependencia,
configuración, regla, hazard/control, defecto, incidente, evidencia de
efectividad, transferencias, normativa/metodología o gate. También se revisa
antes de cada fase/release formal y ante retirada/decommissioning.

No se inventa periodicidad. DCB0129 requiere revisión formal del proceso; la
frecuencia institucional, owner, agenda, quorum y evidencias permanecen
`INSTITUTIONAL_CONTROL_PENDING`.

## 25. Revisión y aprobación

| Función | Persona | Evidencia de competencia/autoridad | Decisión | Estado |
| --- | --- | --- | --- | --- |
| Autoría técnica documental | `NOT_ASSIGNED_TO_A_PERSON_IN_THIS_DOCUMENT` | Revisión de repositorio registrada en este draft | Preparación | `DRAFT` |
| Revisión clínica | `NOT_ASSIGNED` | `NOT_EVIDENCED` | Ninguna | `PENDING_APPROVAL` |
| Clinical Safety Officer | `NO DESIGNADO` | `NOT_EVIDENCED` | Ninguna | `PENDING_APPROVAL` |
| Quality/Configuration | `NOT_ASSIGNED` | `NOT_EVIDENCED` | Ninguna | `PENDING_APPROVAL` |
| Top Management/autoridad de release | `NOT_IDENTIFIED` | `NOT_EVIDENCED` | Ninguna | `PENDING_APPROVAL` |
| Organización desplegadora | `NOT_IDENTIFIED` | `NOT_EVIDENCED` | Ninguna | `NOT_OPERATIONAL` |

Este borrador no está emitido ni aprobado. No acepta riesgo residual y no
autoriza liberación, piloto, producción ni uso clínico.
