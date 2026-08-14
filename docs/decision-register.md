# Registro de decisiones institucionales pendientes

## Uso del registro

Una decisión solo cambia de `Pendiente` cuando existe evidencia versionada y atribuible a la autoridad indicada. El software no convierte una opción provisional en valor definitivo. Las decisiones resueltas deben conservar el historial de versiones, fecha, autoridad, alcance y evidencia; este documento no contiene PHI/PII.

| ID | Ámbito | Decisión pendiente | Requisitos | Autoridad/propietario | Evidencia mínima esperada | Estado | Bloqueo mientras esté pendiente |
|---|---|---|---|---|---|---|---|
| DEC-001 | Protocolo local | Método de verificación de identidad y validación del alta | REQ-01 | Dirección Médica | Protocolo versionado y aprobado | Pendiente | Activación para uso real |
| DEC-002 | Producto/protocolo | Criterio para asignar 30, 60 o 90 días, motivos admisibles y reglas de cierre, incluida la resolución de avisos abiertos | REQ-01 | Dirección Médica | Protocolo de episodio y cierre | Pendiente | Selección automática, valor por defecto clínico y cierre para uso real |
| DEC-003 | Jurídico | Separación, textos, evidencias y base aplicable a piloto, participación digital, comunicaciones y tratamiento asistencial | REQ-02 | Responsable del Tratamiento | Evaluación jurídica y políticas versionadas | Pendiente | Comunicaciones y participación real |
| DEC-004 | Jurídico | Alcance, representación, vigencia y revocación de autorización del cuidador | REQ-05, REQ-06 | Responsable del Tratamiento | Política jurídica y operativa aprobada | Pendiente | Acceso real de cuidadores |
| DEC-005 | Jurídico/privacidad | Retención, archivo, eliminación, exportación y ejercicio de derechos por clase de datos | REQ-01, REQ-02, REQ-06, REQ-11, REQ-13 | Responsable del Tratamiento | Política de conservación y evaluación aplicable | Pendiente | Tratamiento de datos reales y retención definitiva |
| DEC-006 | Protocolo local | Contenido, frecuencia, ventanas y gestión de no respuesta de check-ins | REQ-04 | Dirección Médica | Protocolo versionado | Pendiente | Cadencia clínica real |
| DEC-007 | Validación clínica | Plantilla, disclaimer, acciones y revisión de Domicilio Seguro | REQ-07 | Dirección de Enfermería | Validación clínica local documentada | Pendiente | Uso clínico del módulo |
| DEC-008 | Validación clínica | Reglas, inputs, umbrales deterministas, explicaciones y responsables de avisos | REQ-08 | Dirección Médica | Catálogo versionado, probado y aprobado | Pendiente | Ejecución de reglas en uso real |
| DEC-009 | Validación clínica | Habilitación del semáforo visual | REQ-08 | Dirección Médica | Validación local y decisión de feature flag | Pendiente | El flag permanece desactivado |
| DEC-010 | Protocolo local | Destino oficial del botón de crisis y ámbito de aplicación | REQ-10 | Dirección Médica, autoridad final única | Aprobación clínica del recurso y versión | Pendiente | Marcación real bloqueada |
| DEC-011 | Verificación técnica | Exactitud, formato y funcionamiento del recurso de crisis aprobado | REQ-10 | Dirección TI | Verificación técnica registrada | Pendiente | Marcación real bloqueada |
| DEC-012 | Protocolo/privacidad | Campos permitidos, identificadores mínimos, manejo y destino del PDF SBAR | REQ-11 | Dirección Médica | Perfil de exportación versionado y aprobado | Pendiente | Exportación real bloqueada |
| DEC-013 | Verificación técnica | Proveedor institucional, mapeo de roles, autenticación reforzada, sesiones y acceso de emergencia | REQ-12 | Dirección TI | Diseño y pruebas técnicas institucionales | Pendiente | Autenticación productiva |
| DEC-014 | Operación | Taxonomía, segregación, escalado y gestión de incidentes sin datos clínicos | REQ-13 | Dirección TI | Procedimiento y pruebas de sanitización | Pendiente | Operación productiva de soporte |
| DEC-015 | Protocolo local | Activación, acceso, contenido, restablecimiento, RTO/RPO y retención de contingencia | REQ-14 | Dirección de Enfermería | Plan local de continuidad aprobado y probado | Pendiente | Contingencia desactivada |
| DEC-016 | Gobierno institucional | Alcance, población, entorno, periodo, formación, soporte, rollback y continuidad de negocio del piloto | REQ-01 a REQ-14 | Gerencia del Hospital como Responsable del Tratamiento | Expediente de gate de Piloto Clínico completo | Pendiente | NO-GO para pacientes y datos reales |
| DEC-017 | Protocolo/operación | Taxonomía, prioridades administrativas, SLA, tiempos objetivo, resultados de contacto y reglas de asignación de tareas | REQ-09 | Dirección de Enfermería | Configuración versionada, explicable y validada localmente | Pendiente | Prioridades, SLA y valores operativos definitivos no se codifican |

### Evidencia de apoyo a DEC-003 y comunicaciones futuras

La [frontera documental de comunicaciones futuras](adr/0017-future-communications-boundary.md)
define separación paciente/profesional, autorización por canal y finalidad,
revalidación, minimización, fallos, amenazas y pruebas futuras de forma neutral
respecto del proveedor. Es `DOCUMENTED_ONLY / DECISION SUPPORT EVIDENCE`: no
selecciona destinatarios, canales, base jurídica, contenido, proveedor,
responsable o piloto; no implementa entrega y no modifica `DEC-003 = Pendiente`
ni las dependencias DEC-005/013/014/015/016/017.

### Evidencia de apoyo a DEC-002

El [paquete institucional de decisión sobre duración y cierre del
episodio](decisions/dec-002-episode-closure-decision-pack.md) documenta el
baseline técnico, las subdecisiones, opciones neutrales, riesgos de concurrencia,
impacto y formulario para Dirección Médica. Es `DECISION SUPPORT EVIDENCE`: no
selecciona una duración, motivo, autoridad o regla de cierre, no habilita
`CLOSED` y no modifica el estado `Pendiente` de DEC-002.

### Evidencia de apoyo a DEC-005

El [paquete institucional de decisión sobre ciclo de vida de
datos](decisions/dec-005-data-lifecycle-decision-pack.md) documenta el inventario
real, fuentes de verdad, lifecycle actual, opciones neutrales, derechos,
relaciones, exports, terceros, backups, blockers y gate posterior para el
Responsable del Tratamiento. Es `DECISION SUPPORT EVIDENCE`: no selecciona
periodos, criterios jurídicos, archivo, disposición o aplicabilidad de derechos;
no implementa hard-delete, purge, export o workflow y no modifica el estado
`Pendiente` de DEC-005.

### Evidencia de apoyo a DEC-013

El [paquete institucional de decisión sobre identidad y
acceso](decisions/dec-013-identity-access-decision-pack.md) documenta el baseline
técnico, poblaciones, subdecisiones, opciones neutrales, blockers, impacto y
formulario para Dirección TI. Es `DECISION SUPPORT EVIDENCE`: no selecciona IdP,
vendor, protocolo, subject, MFA/assurance, timeouts, role mapping, break-glass,
service identities o impersonation; no implementa autenticación institucional y
no modifica el estado `Pendiente` de DEC-013.

### Evidencia de apoyo a DEC-014

El [paquete institucional de decisión sobre incidentes, soporte y observabilidad
sanitizada](decisions/dec-014-incident-operations-decision-pack.md) documenta el
baseline real de errores, logs, correlation ID, auditoría, health, métricas y
soporte, junto con opciones neutrales, sanitización, segregación, handoffs y el
gate posterior. Es `DECISION SUPPORT EVIDENCE`: no selecciona taxonomía,
severidad, SLO, tiempos, acceso, escalado, canal, herramienta o vendor; no habilita
soporte u observabilidad productivos y no modifica el estado `Pendiente` de
DEC-014.

### Evidencia de apoyo a DEC-015

El [paquete institucional de decisión sobre continuidad y
contingencia](decisions/dec-015-continuity-decision-pack.md) documenta el
baseline real de health, PostgreSQL, fallos y capacidades ausentes; escenarios,
dominios, subdecisiones, opciones neutrales, scopes, restore, reconciliación,
RTO/RPO, amenazas offline, pruebas y release para Dirección de Enfermería. Es
`DECISION SUPPORT EVIDENCE`: no activa contingencia, no crea un censo o dataset
offline, no selecciona RTO/RPO o tecnología de backup/restore y no modifica el
estado `Pendiente` de DEC-015.

### Evidencia documental de apoyo al gate DEC-016

El [expediente institucional de gate para piloto
real](decisions/dec-016-real-pilot-gate-decision-pack.md), su [matriz de
readiness](decisions/dec-016-pilot-readiness-matrix.md), [formulario de
decisión](decisions/dec-016-decision-form.md), [agenda del review
board](decisions/dec-016-workshop-agenda.md) y [brief
ejecutivo](decisions/dec-016-executive-brief.md) organizan el baseline, scope
manifest, dependencias, blockers, safety case y evidencia para que Gerencia del
Hospital como Responsable del Tratamiento decida sobre una versión y un alcance
concretos. Son `DECISION SUPPORT EVIDENCE`: no aprueban un piloto, no seleccionan
población, periodo, datos, módulos o entorno y no modifican `DEC-016 =
Pendiente` ni `REAL PILOT = NO_GO`.

### Evidencia de apoyo a DEC-017

El [paquete institucional de decisión sobre política operativa de
tareas](decisions/dec-017-task-policy-decision-pack.md) documenta el baseline
técnico, subdecisiones, opciones neutrales, dependencias, impacto y formulario
para Dirección de Enfermería. Es `DECISION SUPPORT EVIDENCE`: no selecciona
valores, no acredita aprobación y no modifica el estado `Pendiente` de DEC-017.

## Estados permitidos

- `Pendiente`: falta una decisión o evidencia suficiente.
- `Propuesta`: existe una opción documentada, todavía no aprobada.
- `Aprobada`: la autoridad competente aprobó una versión y alcance concretos.
- `Retirada`: dejó de aplicar; se conserva el historial y se bloquea su uso futuro.
- `Sustituida`: existe una versión posterior; la anterior no se sobrescribe.

No se usa `Aprobada` para inferir cumplimiento RGPD, conformidad MDR, validación clínica global ni aprobación hospitalaria más allá del alcance explícito de la evidencia.

## Decisiones técnicas provisionales de REQ-02

- El seed registra una política `synthetic-demo-identity-verification/demo-v1` y un paciente inequívocamente sintético. Su estado `APPROVED` solo habilita pruebas locales; no resuelve DEC-001 ni representa protocolo institucional.
- La duración debe elegirse explícitamente entre 30, 60 y 90. No se asigna por diagnóstico, eficacia o riesgo y no existe valor clínico automático.
- El cierre exige actor, motivo y `expectedVersion`. `EpisodeGovernancePolicy` compone la vista técnica desde el episodio, responsables, protocolo, avisos no terminales y tareas abiertas, pero DEC-002 permanece `Pendiente` y la decisión de cierre es siempre `NOT_AUTHORIZED`. Política ausente, error o vista inconsistente también fallan de forma cerrada. Avisos y tareas se muestran como obligaciones organizativas, no como criterio clínico definitivo.
- Episodios, pacientes, políticas de identidad y transiciones no se borran físicamente. La conservación definitiva continúa bloqueada por DEC-005.
- `nurse` y `clinician` son roles técnicos provisionales; su correspondencia institucional continúa bloqueada por DEC-013.

## Decisiones técnicas provisionales de REQ-08

- El DSL `schemaVersion: 1` solo admite inputs explícitos de tipo número, booleano o enum cerrado, una ventana temporal y operadores deterministas `eq`, `lte` y `gte`; no admite texto libre, ML, LLM, scoring probabilístico ni clasificación diagnóstica.
- `admin` crea versiones `draft` y activa una versión previamente aprobada; `clinician` registra la aprobación con referencia local. Esta separación técnica no resuelve el mapeo institucional pendiente de DEC-013 ni constituye validación clínica.
- Las cuatro reglas sembradas son ejemplos técnicos sintéticos en estado `draft`, sin `RuleApproval`, rotulados como no aprobados. DEC-008 sigue pendiente y bloquea su activación para uso real.
- `EXPLAINABLE_TRAFFIC_LIGHT=false` es el valor predeterminado. DEC-009 sigue pendiente; cambiar el flag exige la decisión local correspondiente y no altera la lógica de evaluación.
- Cada petición de evaluación exige clave idempotente por actor; el mismo payload devuelve la evaluación existente y otro payload con la misma clave se rechaza. Evaluación y creación de aviso conservan eventos de auditoría separados y minimizados.
- `CanonicalProvenanceLineageV1` referencia fuentes internas, evaluación y aviso mediante IDs, tipos, tiempos y versiones. Los avisos nuevos usan el array JSON existente; los históricos se marcan como no versionados y los formatos desconocidos como inválidos. El boundary no copia valores clínicos ni resuelve DEC-008.
- Evaluar una regla es una operación profesional explícita. Un resultado coincidente crea un aviso `open`, pero nunca crea tareas, derivaciones, firmas, cierres ni otras acciones clínicas. Toda transición posterior exige `AlertReview` humano append-only.

## Decisiones técnicas provisionales de REQ-09

- La cola solo muestra episodios donde el actor es responsable de enfermería o clínico y revalida el rol activo tanto en lectura como en mutación. `admin`, `patient`, `caregiver` y `support` no reciben acceso clínico implícito.
- Toda tarea tiene episodio; el aviso es opcional y, si existe, una clave compuesta impide vincularlo a otro episodio. `DefaultHumanAuthorizationPolicy` exige una `AlertReview` real, estado compatible, rol profesional activo y responsabilidad actual para `CREATE_TASK_FROM_REVIEWED_ALERT`; el trigger PostgreSQL conserva la defensa. La tarea solo nace desde `CreateNursingTaskService`, invocado por un `POST` profesional explícito.
- La review histórica y el acting actor actual son distintos. `AlertReview` no persiste un snapshot fiable del rol histórico y no se infiere desde el rol actual. La revocación posterior del reviewer conserva la historia; la del acting actor deniega una nueva tarea.
- Una tarea sin aviso es iniciación humana directa, no signal-derived. `actioned` no demuestra una tarea o actuación; esa evidencia reside en `Task`/`TaskEvent`.
- `TaskAccountabilityProjection` reutiliza `Task` como estado actual y `TaskEvent` como historia. Separa creator, assignee, event actor, resolver y responsables del episodio; valida la cadena por revisión y no copia texto clínico.
- Una tarea sin assignee es `UNASSIGNED`. Assignment no equivale a acceptance, autoridad exclusiva, ownership de equipo o política sobre quién debería actuar.
- Los eventos de tarea son append-only. Cada mutación exige `expectedRevision` e `Idempotency-Key`; un índice por tarea/revisión hace que una carrera tenga un único ganador. El orden de locks de la workqueue es episodio, `User` participantes únicos ordenados globalmente por ID, roles y mutación; create-assigned, assign y reassign se serializan frente a revocación y cruces actor/target dentro o entre episodios, sin bloquear pares disjuntos. Una revocación posterior conserva historia, marca falta de autorización actual y no reasigna. Cualquier workflow futuro con múltiples identidades debe reutilizar este orden o demostrar que no crea ciclos.
- La cola solo publica métricas técnicas agregadas. No se implementan prioridad ni SLA mientras DEC-017 siga pendiente.
- Revisar un aviso no crea tareas. Resolver una tarea no resuelve automáticamente el aviso, no cierra el episodio y no genera SBAR, comunicación, derivación o recomendación clínica.

## Decisiones técnicas provisionales de cierre Build Week

- REQ-07 usa exclusivamente `synthetic-home-safety-information/demo-v1`, estados informativos no certificadores y versiones append-only. El acceso de cuidador no se amplía hasta disponer de un scope explícito aprobado; DEC-007 sigue pendiente.
- REQ-10 muestra un recurso visible pero deshabilitado, sin teléfono ni URI. DEC-010/011 siguen siendo bloqueadores absolutos de cualquier acción.
- REQ-11 ofrece `synthetic-minimized-sbar/demo-v1` como preview efímero e imprimible. Assessment usa un fallback explícito y R solo refleja tareas existentes. No existe PDF institucional, envío o firma; DEC-005/012 siguen pendientes.
- La regla `synthetic-demo-flow-mechanics` activa del seed sirve solo para demostrar la mecánica aviso → revisión humana. Su nombre y referencia declaran que no está clínicamente validada. Las cuatro reglas de contenido permanecen `draft` y no aprobadas.
