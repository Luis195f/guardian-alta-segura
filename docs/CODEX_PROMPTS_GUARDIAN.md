# Prompts ejecutables para Codex — Guardián Alta Segura

## Regla de ejecución

No pegues todos los prompts en una sola tarea. Cada prompt corresponde a una rama y a un PR independiente. Antes de crear una rama nueva, integra el PR anterior en `main`, ejecuta las pruebas y usa:

```powershell
.\new-guardian-branch.ps1 -BranchName "nombre/de-la-rama" -RepoPath "$HOME\source\repos\guardian-alta-segura"
```

En Codex, selecciona siempre el repositorio `Luis195f/guardian-alta-segura` y la rama remota recién publicada.

---

## Mapa de ramas

| Orden | Rama | Resultado |
|---:|---|---|
| 00 | `chore/00-governance-baseline` | Documentación normativa y matriz ejecutable |
| 01 | `feat/01-platform-foundation` | Base Next.js, Prisma, RBAC, auditoría y CI |
| 02 | `feat/02-consent-legal-basis` | Consentimientos, bases y autorizaciones granulares |
| 03 | `feat/03-discharge-episode` | Alta estructurada y ciclo del episodio |
| 04 | `feat/04-safety-plan-versioning` | Plan Stanley-Brown versionado |
| 05 | `feat/05-checkin-protocol-config` | Check-ins y cadencia configurable |
| 06 | `feat/06-explainable-alerts` | Reglas y avisos explicables |
| 07 | `feat/07-nursing-workqueue-tasks` | Cola enfermera y tareas vinculadas |
| 08 | `feat/08-caregiver-access-revocation` | Portal cuidador, permisos y revocación |
| 09 | `feat/09-home-safety-education` | Domicilio Seguro informativo |
| 10 | `feat/10-crisis-resource-routing` | Botón de crisis validado localmente |
| 11 | `feat/11-sbar-pdf-export` | SBAR manual y PDF minimizado |
| 12 | `feat/12-incidents-contingency` | Incidentes técnicos y contingencia opcional |
| 13 | `arch/13-fhir-boundaries` | Interfaces futuras sin integración productiva |
| 14 | `test/14-sandbox-hardening` | Sandbox sintético, seguridad y pruebas |
| 15 | `docs/15-usability-pilot-readiness` | Usabilidad y checklist NO-GO/GO |

---

# PROMPT 00 — Gobernanza y trazabilidad antes de programar

```text
Actúa como arquitecto principal de software sanitario, responsable de seguridad clínica, producto, privacidad y trazabilidad.

Trabaja únicamente en la rama chore/00-governance-baseline. Lee AGENTS.md completo antes de comenzar.

OBJETIVO
Transformar la documentación aprobada de Guardián Alta Segura en una base de gobernanza ejecutable por el equipo de desarrollo. En esta rama NO debes crear todavía la aplicación Next.js ni implementar funcionalidades.

CREA
1. docs/product-brief.md:
   - problema;
   - usuario principal;
   - población objetivo;
   - evento de inicio;
   - horizonte 30/60/90 días;
   - propuesta de valor;
   - intended use;
   - usos excluidos.
2. docs/clinical-workflow.md:
   - alta;
   - activación;
   - participación digital;
   - autorización de cuidador;
   - plan de seguridad;
   - check-ins;
   - revisión humana;
   - tareas;
   - SBAR;
   - cierre.
3. docs/requirements-traceability.csv y .md con REQ-01 a REQ-14. Conserva responsable, estado, riesgo, control y prueba de aceptación.
4. docs/stage-gates.md con cinco gates: infraestructura, módulos, sandbox, usabilidad y piloto.
5. docs/data-classification.md:
   - dato clínico;
   - administrativo;
   - autenticación;
   - auditoría;
   - soporte técnico;
   - sintético.
6. docs/authorization-matrix.md con roles admin, nurse, clinician, patient, caregiver y support.
7. docs/decision-register.md para decisiones locales pendientes.
8. ADR-0001 sobre el posicionamiento como plataforma de continuidad postalta y no como predictor, sistema diagnóstico ni chatbot.
9. ADR-0002 sobre el uso exclusivo de datos sintéticos hasta GO institucional.
10. Plantilla de PR con trazabilidad a requisitos, pruebas, riesgos, datos, migraciones y rollback.

REGLAS
- No declares cumplimiento RGPD, MDR, validación clínica o aprobación hospitalaria.
- No conviertas decisiones pendientes en requisitos cerrados.
- No inventes frecuencias, números de crisis, reglas clínicas, periodos de retención ni mecanismos MFA.
- Marca explícitamente qué elementos exigen protocolo local, evaluación jurídica, validación clínica o verificación técnica.
- Mantén una autoridad final única por gate.

CRITERIOS DE ACEPTACIÓN
- Cada REQ aparece al menos una vez en la matriz.
- Cada gate tiene condición GO, evidencia mínima, autoridad final y resultado NO-GO.
- Existe una tabla que vincula requisito → módulo futuro → prueba → autoridad.
- No hay código de aplicación.
- Markdown y CSV son coherentes entre sí.
- Se añade una comprobación automatizada simple que detecte IDs REQ duplicados o ausentes.

AL FINAL
Muestra archivos creados, decisiones no resueltas, validaciones ejecutadas y propone el PR 01 sin implementarlo.
```

---

# PROMPT 01 — Fundación técnica segura

```text
Actúa como senior full-stack engineer y security architect de software sanitario.

Trabaja únicamente en feat/01-platform-foundation. Lee AGENTS.md y la documentación de docs/. No amplíes el alcance.

OBJETIVO
Crear la base técnica del MVP sin implementar todavía módulos clínicos.

STACK
- Next.js App Router y TypeScript estricto.
- PostgreSQL y Prisma.
- Diseño responsive y accesible.
- Vitest o equivalente para unit/integration.
- Playwright para e2e.
- CI en GitHub Actions.
- Gestor de paquetes único y lockfile versionado.

IMPLEMENTA
1. Estructura por capas o módulos, evitando lógica de dominio en componentes UI.
2. Configuración validada de variables de entorno con `.env.example` sin secretos.
3. Modelo mínimo User, RoleAssignment, SessionMetadata y AuditEvent.
4. Roles: admin, nurse, clinician, patient, caregiver, support.
5. Autorización server-side con denegación por defecto.
6. Abstracción `IdentityProvider` para futuro SSO institucional.
7. Modo demo local claramente marcado NO PRODUCTIVO, solo con usuarios sintéticos.
8. Auditoría inmutable para login demo, cambio de rol administrativo y mutaciones críticas.
9. Correlation ID y manejo de errores tipado sin contenido clínico en logs.
10. Healthcheck técnico que no exponga secretos ni datos.
11. CI: instalación reproducible, lint, typecheck, tests, build y comprobación de migraciones.
12. ADR sobre autenticación demo vs SSO institucional futuro.

NO IMPLEMENTAR
- Contraseñas propias para producción.
- MFA inventada.
- OAuth improvisado.
- Plan de seguridad, check-ins, alertas o pacientes reales.
- FHIR, IA, push, websockets o analytics externos.

SEGURIDAD
- Support no puede acceder a campos clínicos futuros.
- No almacenar tokens en localStorage.
- Cookies seguras cuando corresponda.
- CSRF, headers y rate limiting documentados; implementa lo razonable sin fingir que sustituye controles perimetrales.
- No registrar request bodies sensibles.

PRUEBAS OBLIGATORIAS
- Cada rol intenta acceder a rutas permitidas y prohibidas.
- Usuario sin rol queda denegado.
- Support queda denegado ante un recurso clínico simulado.
- AuditEvent se crea en mutaciones críticas.
- Error handler no expone stack ni valores de entorno en producción.
- CI pasa desde un clon limpio.

DEFINITION OF DONE
- README permite levantar app y base de datos local.
- Existe seed puramente sintético.
- `lint`, `typecheck`, `test`, `test:e2e` y `build` pasan.
- La matriz de trazabilidad marca REQ-12 y REQ-13 como parcialmente implementados, no validados.
```

---

# PROMPT 02 — Consentimientos, bases jurídicas y autorizaciones

```text
Actúa como ingeniero de dominio y privacidad en software sanitario.

Trabaja únicamente en feat/02-consent-legal-basis.

OBJETIVO
Modelar por separado:
1. participación en piloto;
2. participación digital;
3. comunicaciones telemáticas;
4. autorización del cuidador;
5. base jurídica del tratamiento asistencial.

IMPORTANTE
No trates todos estos conceptos como un único booleano `consent`. No determines cuál es la base jurídica correcta: el sistema debe registrar la decisión institucional configurada y su evidencia.

MODELO
Crea entidades o value objects para:
- ParticipationRecord;
- DigitalParticipationRecord;
- CommunicationPermission;
- CaregiverAuthorization;
- ProcessingBasisRecord;
- RevocationEvent;
- PolicyVersion.

Cada registro debe incluir estado, alcance, versión del texto/política, actor, timestamp, origen y evidencia mínima. Evita almacenar documentos o firmas ficticias.

COMPORTAMIENTO
- Ninguna comunicación sale si no existe permiso/base específica vigente.
- La revocación del cuidador solo retira su acceso.
- La retirada digital detiene futuros check-ins según configuración, sin borrar historia.
- Revocaciones son append-only y auditadas.
- Las decisiones deben evaluarse server-side.
- Expón un servicio de autorización claro, no condicionales dispersos en UI.
- Permite estado pending cuando falta validación local.

UI
Crea panel demo para visualizar estados y registrar cambios con usuarios sintéticos. Debe mostrar claramente que el tratamiento asistencial y el consentimiento no son equivalentes.

PRUEBAS
- Comunicación denegada sin permiso específico.
- Autorización cuidador revocada invalida el acceso.
- Revocación no elimina episodios, planes ni registros previos.
- Cambio de versión de política conserva el registro anterior.
- Acceso concurrente con autorización vencida queda denegado.
- Auditoría no incluye contenido clínico.

NO IMPLEMENTAR
- Firma electrónica cualificada.
- Textos legales definitivos.
- Retención definitiva.
- Envío real de SMS, email o push.

ACTUALIZA
Matriz REQ-02, REQ-05 y REQ-06, indicando implementación técnica y pendientes jurídicos/institucionales.
```

---

# PROMPT 03 — Alta estructurada

```text
Actúa como ingeniero de producto clínico y desarrollador full-stack.

Trabaja únicamente en feat/03-discharge-episode.

OBJETIVO
Convertir un alta psiquiátrica en un episodio activo y trazable, sin inferir eficacia ni riesgo.

MODELO
Implementa Patient pseudonimizado y DischargeEpisode con:
- externalPseudonymousId;
- dischargeDate;
- programLengthDays configurable a 30/60/90;
- responsibleNurseId;
- responsibleClinicianId;
- status: draft, active, paused, closed;
- createdBy;
- closedReason;
- timestamps;
- version/concurrency control.

No incluyas `diagnosisSummary` salvo que exista una necesidad explícita documentada; para el MVP minimiza datos.

REGLAS
- No activar sin identidad verificada conforme a un estado/proceso configurable y profesionales responsables.
- No usar verificación biométrica ni inventar protocolo de identidad.
- Toda transición usa una máquina de estados explícita.
- No cerrar si existen avisos abiertos no resueltos cuando el módulo exista; mientras no exista, crea una interfaz de política, no un bypass.
- Cierre requiere motivo y actor.
- No eliminar episodios: usar estados y retención pendiente de política.
- Evitar doble activación mediante transacción e idempotency key.

UI
- Crear episodio.
- Listado y detalle.
- Timeline de transiciones.
- Estados vacíos, errores y conflicto de edición.
- Etiqueta visible: datos sintéticos / no uso clínico.

PRUEBAS
- Activación válida e inválida.
- Falta de responsables.
- transición ilegal;
- idempotencia;
- concurrencia optimista;
- RBAC por rol;
- audit trail de cada transición;
- no hard-delete.

NO IMPLEMENTAR
Tareas automáticas clínicas, plan de seguridad, check-ins, alertas o integración HCE.

ACTUALIZA
REQ-01 y REQ-14 solo en lo aplicable. Documenta decisiones locales pendientes.
```

---

# PROMPT 04 — Plan de Seguridad Stanley-Brown versionado

```text
Actúa como ingeniero de software sanitario con foco en integridad de documentación clínica.

Trabaja únicamente en feat/04-safety-plan-versioning.

OBJETIVO
Implementar el Plan de Seguridad de seis pasos como documento versionado ligado a DischargeEpisode.

SEIS PASOS
1. señales de alarma;
2. estrategias internas de afrontamiento;
3. personas/lugares para distracción;
4. familiares o amistades;
5. profesionales y recursos de crisis;
6. reducción de acceso a medios u objetos peligrosos.

MODELO
- SafetyPlan como identidad lógica.
- SafetyPlanVersion append-only.
- Estado de versión: draft, active, superseded, invalidated.
- `invalidated` solo con motivo documentado y actor autorizado.
- Nueva edición crea N+1; no sobrescribe N.
- Campo de procedencia por sección: patient, nurse, clinician.
- Permisos de compartición por sección, preparados para cuidador.
- No guardar secretos o números definitivos sin configuración aprobada.

REGLAS
- Solo nurse/clinician crean o activan versiones.
- Patient visualiza la versión activa y su historial permitido.
- Caregiver todavía no tiene portal, pero deja la política de visibilidad desacoplada.
- No firmar automáticamente.
- No mostrar el plan como sustituto de atención profesional.
- No convertir respuestas en scoring.

UI
Editor por pasos, revisión final, comparación de versiones y vista de historial.

PRUEBAS
- Edición crea versión nueva.
- Versión anterior permanece legible.
- Invalidación exige motivo.
- Acceso por rol y por sección.
- Dos editores no sobrescriben silenciosamente.
- Auditoría registra metadatos, no el texto íntegro del plan.
- No existe endpoint de hard-delete.

PDF
No implementarlo aún; define una interfaz de exportación para el PR 11.

ACTUALIZA
REQ-03 y dependencias de REQ-10.
```

---

# PROMPT 05 — Check-ins configurables por protocolo

```text
Actúa como ingeniero de dominio clínico y experiencia de paciente.

Trabaja únicamente en feat/05-checkin-protocol-config.

OBJETIVO
Implementar cuestionarios breves configurables, sin fijar en código frecuencia clínica ni interpretar respuestas automáticamente.

MODELO
- CheckInProtocolVersion;
- QuestionDefinition;
- ScheduleConfiguration;
- CheckInAssignment;
- CheckInResponse;
- NonResponseEvent.

TIPOS DE PREGUNTA
Escala, sí/no, opción única y texto corto restringido. Incluye fixtures sintéticos de sueño, ansiedad, ánimo, adherencia, consumo, ideación autolítica, irritabilidad y conflicto familiar, pero no los declares protocolo aprobado.

REGLAS
- Cada episodio referencia una versión de protocolo.
- La cadencia se configura por rol autorizado y permanece versionada.
- Una modificación no altera asignaciones históricas.
- La respuesta guarda la versión exacta de la pregunta.
- Registrar no respuesta como evento, no como respuesta clínica.
- No generar alertas todavía.
- No enviar comunicaciones reales.
- Participación digital revocada impide nuevas asignaciones, conserva histórico.
- Validar ventanas horarias y zona temporal sin inventar urgencia.

UI
- Panel admin clínico demo para versionar protocolos.
- Vista paciente accesible, objetivo aproximado de 60 segundos.
- Histórico por episodio.
- Estados pendiente, respondido, vencido y omitido.

PRUEBAS
- Cadencia configurable.
- Revocación detiene futuras asignaciones.
- Históricos no cambian al editar protocolo.
- Reintento idempotente.
- Accesibilidad de formulario.
- RBAC.
- Datos sintéticos únicamente.

ACTUALIZA
REQ-04 y parte técnica de REQ-06.
```

---

# PROMPT 06 — Reglas y avisos explicables

```text
Actúa como arquitecto de sistemas de apoyo clínico no predictivo.

Trabaja únicamente en feat/06-explainable-alerts.

OBJETIVO
Crear un motor determinista, versionado, localmente aprobable y auditable que organice información para revisión humana.

MODELO
- RuleDefinition;
- RuleVersion;
- RuleApproval;
- RuleEvaluation;
- Alert;
- AlertReview.
Estados de regla: draft, approved, active, retired.
Estados de aviso: open, reviewed, actioned, resolved, dismissed-with-reason.

REQUISITOS
- DSL o JSON Schema validado.
- Inputs permitidos explícitos.
- Ventana temporal, condición, severidad administrativa, explicación y responsable de revisión.
- Cada Alert guarda ruleId, ruleVersion, inputs referenciados, explicación, timestamp y estado de revisión.
- No copiar contenido clínico innecesario al log.
- La evaluación debe ser reproducible.
- La regla debe abstenerse si faltan datos requeridos.
- No usar ML, LLM, puntuaciones probabilísticas ni clasificación diagnóstica.
- Feature flag `EXPLAINABLE_TRAFFIC_LIGHT=false` por defecto.
- Aunque exista severidad interna, la UI inicial debe priorizar por texto y estado; no activar semáforo visual por defecto.

FIXTURES SINTÉTICOS, NO APROBADOS
- sueño <=4 h durante 2 días + no adherencia → aviso;
- ideación autolítica positiva → aviso de revisión prioritaria;
- no respuesta 48 h → aviso;
- conflicto familiar severo repetido → aviso.
Etiquétalos como ejemplos técnicos sujetos a validación local.

PRUEBAS
- caja negra por regla;
- abstención por dato ausente;
- versionado;
- reproducibilidad;
- regla no aprobada no ejecuta;
- explicación muestra datos de origen;
- no se crea acción clínica automática;
- feature flag apagado;
- permisos de aprobación.

ACTUALIZA
REQ-08 y registra explícitamente que la validación clínica sigue pendiente.
```

---

# PROMPT 07 — Cola enfermera y tareas vinculadas

```text
Actúa como diseñador de workflow clínico y desarrollador full-stack.

Trabaja únicamente en feat/07-nursing-workqueue-tasks.

OBJETIVO
Convertir episodios, check-ins y avisos en una cola de trabajo revisable sin automatizar decisiones asistenciales.

IMPLEMENTA
- NursingWorkQueue con filtros por estado, fecha, responsable y pendientes.
- Resumen del último check-in sin mostrar más datos de los necesarios.
- Vista de avisos abiertos con explicación y origen.
- Task ligada opcionalmente a Alert y DischargeEpisode.
- Acciones: marcar revisado, crear tarea, registrar contacto intentado, registrar nota breve, resolver con motivo.
- SLA o prioridades como configuración local pendiente, no valores clínicos definitivos.
- Bloqueo/concurrencia para evitar doble resolución silenciosa.
- AuditEvent por revisión, tarea, asignación y cierre.
- Métricas técnicas de cola sin datos personales.

REGLAS
- Marcar “revisado” no equivale a “resuelto”.
- Resolver requiere actor, motivo y timestamp.
- Crear tarea no implica derivación automática.
- No cerrar episodio desde el panel sin pasar la política de dominio.
- No autogenerar SBAR.
- Patient, caregiver y support no acceden a la cola.

PRUEBAS
- aislamiento entre profesionales;
- filtros;
- revisión vs resolución;
- tarea vinculada;
- doble procesamiento concurrente;
- autorización negativa por rol;
- auditoría;
- estados vacíos y error;
- accesibilidad básica.

ACTUALIZA
REQ-09 y los criterios aplicables de REQ-08.
```

---

# PROMPT 08 — Cuidador, permisos y revocación inmediata

```text
Actúa como ingeniero de autorización granular y privacidad.

Trabaja únicamente en feat/08-caregiver-access-revocation.

OBJETIVO
Permitir acceso limitado del cuidador únicamente con autorización explícita, vigente y revocable.

MODELO
- CaregiverProfile pseudonimizado;
- CaregiverInvitation;
- CaregiverAuthorizationScope;
- CaregiverSession;
- CaregiverObservation;
- CaregiverAccessAudit.

ALCANCES POSIBLES
- ver secciones permitidas del plan;
- ver tareas asignadas;
- enviar observaciones;
- ver recursos autorizados.
No concedas por defecto acceso a diagnósticos, notas, check-ins completos ni información clínica no autorizada.

REGLAS
- Denegación por defecto y evaluación server-side por campo/sección.
- Invitación expira y es de un solo uso.
- Revocación tumba sesiones y tokens activos de forma inmediata.
- Revocación no borra observaciones ni historia clínica.
- Cambiar un scope produce versión/auditoría.
- El paciente gestiona autorización dentro de límites del protocolo; el sistema no presume capacidad o representación legal.
- Support no puede impersonar al cuidador.
- No enviar invitaciones reales todavía: usar adapter fake/local.

UI
Portal simple, legible, accesible y con mensaje de límites.

PRUEBAS
- acceso antes/después de revocar;
- field-level authorization;
- invitación vencida/reutilizada;
- cambio de scope;
- sesión concurrente invalidada;
- no hard-delete;
- observación no se convierte en alerta automática;
- auditoría sin contenido clínico excesivo.

ACTUALIZA
REQ-05 y REQ-06.
```

---

# PROMPT 09 — Domicilio Seguro informativo

```text
Actúa como product engineer y especialista en safety-by-design.

Trabaja únicamente en feat/09-home-safety-education.

OBJETIVO
Implementar un checklist educativo y de registro que apoye la revisión humana. No debe certificar que el domicilio sea seguro.

ÁREAS
Dormitorio, baño, cocina, salón, ventanas/balcón/terraza, medicación, objetos de riesgo, alcohol/tóxicos/drogas, privacidad para teleconsulta, sueño/ruido/luz.

MODELO
- HomeSafetyTemplateVersion;
- HomeSafetyAssessment;
- HomeSafetyItemResponse;
- HomeSafetyAction;
- HumanReviewRecord.

ESTADOS POR ÍTEM
correct, action-required, not-applicable, not-assessed.

REGLAS
- Plantillas versionadas.
- Resultado no produce score global ni “apto/no apto”.
- No cerrar como “domicilio seguro”.
- Cada assessment muestra disclaimer explícito y checkbox de comprensión.
- Requiere revisión humana para marcarlo revisado.
- Acciones se asignan a cuidador o profesional, sin derivación automática.
- Historial append-only o versionado.
- Minimizar texto libre y no incluir fotografías/geolocalización en MVP.

UI
Checklist, plan de acciones, revisión humana e impresión futura mediante interfaz.

PRUEBAS
- no existe certificación;
- disclaimer visible;
- checkbox requerido;
- historial;
- permisos;
- acciones vinculadas;
- no scoring;
- no imágenes ni geolocalización;
- datos sintéticos.

ACTUALIZA
REQ-07.
```

---

# PROMPT 10 — Recurso de crisis y enrutamiento validado

```text
Actúa como ingeniero de seguridad clínica y mobile-web integration.

Trabaja únicamente en feat/10-crisis-resource-routing.

OBJETIVO
Implementar un botón de crisis que abra el marcador nativo con un número oficial configurado y aprobado localmente.

MODELO
- CrisisResource;
- CrisisResourceVersion;
- CrisisResourceApproval;
- CrisisRoutingConfiguration.

REGLAS
- Ningún número viene hardcodeado como definitivo.
- Seed demo usa número no operativo claramente ficticio o modo simulación que nunca realiza llamada real.
- Solo una autoridad final configurada puede aprobar una versión para un entorno.
- TI configura/verifica; autoridad clínica aprueba destino.
- La UI muestra nombre del recurso, ámbito, fecha de verificación y aviso de que no sustituye atención profesional.
- `tel:` se genera desde configuración validada.
- Si no hay recurso aprobado, mostrar estado bloqueado seguro; no improvisar destino.
- No dar consejos clínicos generados.
- No geolocalizar ni seleccionar recursos por algoritmo.

PRUEBAS
- recurso no aprobado no permite llamada;
- número exacto y sanitizado;
- cambio de versión;
- autorización de configuración/aprobación;
- auditoría;
- modo demo no llama;
- accesibilidad y confirmación;
- integración con versión activa del SafetyPlan.

ACTUALIZA
REQ-10.
```

---

# PROMPT 11 — SBAR manual y PDF minimizado

```text
Actúa como ingeniero de documentación clínica y privacidad.

Trabaja únicamente en feat/11-sbar-pdf-export.

OBJETIVO
Implementar un formulario SBAR editable y una exportación PDF minimizada. No usar IA generativa.

SBAR
- Situation;
- Background;
- Assessment;
- Recommendation.

REGLAS
- El profesional redacta manualmente.
- Se pueden prellenar solo datos estructurados deterministas y claramente identificados como fuente.
- No inventar datos ausentes.
- No inferir Assessment ni Recommendation.
- Campos faltantes quedan vacíos o marcados como pendientes.
- Guardado de borrador y versión final con validación humana explícita.
- No firma automática.
- Historial versionado.
- Support no accede al contenido.
- El PDF contiene solo identificadores mínimos configurados por política local.
- El archivo lleva clasificación, fecha, autor y aviso de manejo seguro.
- Evitar persistir PDFs si no es necesario; documentar estrategia.

IMPLEMENTA
- SBARDraft y SBARVersion.
- ExportProfileVersion para definir campos permitidos.
- Servicio PDF server-side.
- Registro de exportación sin guardar contenido en logs.
- Descarga autorizada y con expiración cuando aplique.

PRUEBAS
- no prellenar Assessment/Recommendation;
- dato ausente no inventado;
- export profile minimiza;
- rol no autorizado denegado;
- versión histórica;
- PDF no contiene campos excluidos;
- auditoría;
- test snapshot o extracción textual del PDF.

ACTUALIZA
REQ-11.
```

---

# PROMPT 12 — Incidentes y continuidad

```text
Actúa como arquitecto de resiliencia y seguridad operacional.

Trabaja únicamente en feat/12-incidents-contingency.

OBJETIVO
Separar incidentes técnicos del contenido clínico e implementar una capacidad de contingencia opcional, desactivada por defecto.

INCIDENTES
- TechnicalIncident;
- sanitized error code;
- component;
- environment;
- timestamps;
- severity técnica;
- correlation ID;
- estado.
No almacenar diagnóstico, texto de notas, respuestas de check-in ni identificadores directos.

CONTINGENCIA
- Feature flag `CONTINGENCY_CENSUS_ENABLED=false`.
- Interfaz y modelo mínimo para un censo cifrado solo si se habilita por política.
- Acceso exclusivo a rol autorizado y bajo modo de contingencia.
- Procedimiento de activación/desactivación auditado.
- No implementar sincronización offline clínica completa.
- No afirmar RTO/RPO sin decisión institucional.

IMPLEMENTA
- sanitización centralizada;
- redaction tests;
- runbook de caída;
- criterios para degradación segura;
- pantalla de estado técnico;
- exportación de contingencia solo si flag y política lo permiten;
- caducidad/retención configurable pendiente.

PRUEBAS
- error no arrastra payload clínico;
- support ve ticket técnico, no notas;
- feature flag apagada;
- acceso no autorizado;
- activación auditada;
- degradación segura;
- secretos no aparecen en errores.

ACTUALIZA
REQ-13 y REQ-14, manteniendo pendientes del plan local.
```

---

# PROMPT 13 — Fronteras para FHIR futuro, sin integración productiva

```text
Actúa como arquitecto de interoperabilidad sanitaria.

Trabaja únicamente en arch/13-fhir-boundaries.

OBJETIVO
Preparar límites de integración futura sin implementar conexión productiva a HCE, SMART on FHIR ni CDS Hooks.

CREA
- Interfaces/ports para importar o exportar datos estructurados.
- DTOs internos desacoplados de Prisma y UI.
- Mapeo preliminar documentado:
  Patient interno ↔ Patient;
  DischargeEpisode ↔ Encounter/EpisodeOfCare según decisión futura;
  SafetyPlan ↔ CarePlan/DocumentReference según perfil futuro;
  CheckInResponse ↔ QuestionnaireResponse/Observation;
  Task ↔ Task;
  CareNote/SBAR ↔ Composition/DocumentReference;
  AuditEvent ↔ AuditEvent.
- ADR sobre por qué se pospone la integración productiva.
- ADR sobre necesidad de perfiles locales, terminología, consentimiento y pruebas de conformidad.
- Contract tests con adapters fake, sin servidor externo.

REGLAS
- No afirmar que el mapeo es definitivo.
- No incluir credenciales, endpoints hospitalarios ni PHI.
- No instalar SDK FHIR pesado si interfaces simples bastan.
- No implementar SMART, CDS Hooks ni writeback.
- No mezclar modelos FHIR directamente con dominio.

PRUEBAS
- dominio funciona sin adapter;
- adapter fake cumple contrato;
- serialización no pierde identificadores técnicos;
- ningún endpoint externo;
- no writeback.

ACTUALIZA
Roadmap de fase posterior, sin cambiar el alcance MVP.
```

---

# PROMPT 14 — Sandbox, hardening y dataset sintético

```text
Actúa como QA lead, application security engineer y auditor de seguridad clínica.

Trabaja únicamente en test/14-sandbox-hardening.

OBJETIVO
Preparar una Release Candidate para sandbox con datos exclusivamente sintéticos. No preparar uso real.

REVISA
- threat model STRIDE adaptado;
- matriz RBAC y field-level access;
- logs, errores y auditoría;
- revocaciones;
- versionado e inmutabilidad;
- CSRF, XSS, SSRF, inyección, rate limits y gestión de secretos;
- dependencias;
- migraciones;
- backup/restore local;
- feature flags;
- exports;
- concurrencia e idempotencia.

CREA
- dataset sintético reproducible y etiquetado;
- generador que prohíba nombres, correos, teléfonos o IDs reales;
- casos nominales y edge cases;
- pruebas de autorización negativas;
- pruebas de invariantes clínicas;
- pruebas e2e por rol;
- security checklist;
- software bill of materials si es viable;
- reporte de cobertura sin usarla como única evidencia;
- tabla de riesgos residuales.

GATES
El sandbox solo pasa si:
- no hay datos reales;
- CI completa pasa;
- no hay P0/P1 abiertos;
- reglas no aprobadas no ejecutan;
- semáforo sigue apagado;
- contingencia sigue apagada;
- no existe IA ni integración productiva;
- exportaciones están minimizadas;
- revocación no borra historia;
- support no accede a texto clínico.

NO HACER
- pruebas con pacientes;
- afirmar validación clínica;
- desplegar producción;
- conectar servicios hospitalarios.

AL FINAL
Entrega un informe PASS/FAIL por gate y bloquea el GO si falta evidencia.
```

---

# PROMPT 15 — Usabilidad y readiness institucional

```text
Actúa como responsable de producto clínico, UX accesible y gobernanza de piloto.

Trabaja únicamente en docs/15-usability-pilot-readiness.

OBJETIVO
Preparar materiales para pruebas de usabilidad con datos sintéticos y un checklist institucional de piloto. No habilitar pacientes reales.

CREA
1. Protocolo de usabilidad:
   - perfiles;
   - tareas;
   - métricas;
   - errores críticos;
   - accesibilidad;
   - criterios de parada;
   - sin dependencia clínica real.
2. Guiones sintéticos para nurse, clinician, patient y caregiver.
3. Matriz de hallazgos y severidad UX.
4. Checklist GO/NO-GO para piloto:
   - teléfonos oficiales aprobados;
   - frecuencias y reglas firmadas;
   - bases jurídicas;
   - DPIA/evaluación requerida;
   - evaluación MDR/intended purpose;
   - SSO institucional;
   - retención;
   - continuidad;
   - responsables;
   - soporte;
   - formación;
   - aprobación ética si aplica;
   - pruebas de seguridad;
   - accesibilidad.
5. Registro de autoridades finales.
6. Plan de rollback del piloto.
7. Métricas exploratorias claramente separadas de eficacia:
   - activación de episodios;
   - plan completado;
   - respuesta a check-ins;
   - tiempo hasta revisión;
   - contacto a 7/30 días;
   - carga de trabajo;
   - incidencias;
   - aceptabilidad.
8. Declaración de coherencia documental final.

REGLAS
- Cualquier condición institucional ausente produce NO-GO.
- No afirmar eficacia, seguridad clínica demostrada ni conformidad.
- No convertir resultados exploratorios en causalidad.
- No cambiar código salvo correcciones documentales menores justificadas.
- Mantener datos sintéticos.

AL FINAL
Presenta una tabla única de gate, evidencia, autoridad, estado y bloqueo. El resultado esperado antes de validación institucional es NO-GO para pacientes reales y GO únicamente para sandbox/usabilidad sintética.
```

---

## Flujo de cierre de cada rama

Cuando Codex termine:

```powershell
git status
git diff --check
npm run lint
npm run typecheck
npm run test
npm run build
git add .
git commit -m "tipo: descripción concreta"
git push
gh pr create --draft --base main --head (git branch --show-current) --fill
```

Después, en el PR:

```text
@codex review for clinical-safety, authorization, privacy, immutable-history and test gaps
```

No mezcles el siguiente prompt hasta que el PR anterior esté revisado, corregido, con CI verde e integrado en `main`.
