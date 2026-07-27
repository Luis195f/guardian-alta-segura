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
- Los eventos de tarea son append-only. Cada mutación exige `expectedRevision` e `Idempotency-Key`; un índice por tarea/revisión hace que una carrera tenga un único ganador.
- La cola solo publica métricas técnicas agregadas. No se implementan prioridad ni SLA mientras DEC-017 siga pendiente.
- Revisar un aviso no crea tareas. Resolver una tarea no resuelve automáticamente el aviso, no cierra el episodio y no genera SBAR, comunicación, derivación o recomendación clínica.

## Decisiones técnicas provisionales de cierre Build Week

- REQ-07 usa exclusivamente `synthetic-home-safety-information/demo-v1`, estados informativos no certificadores y versiones append-only. El acceso de cuidador no se amplía hasta disponer de un scope explícito aprobado; DEC-007 sigue pendiente.
- REQ-10 muestra un recurso visible pero deshabilitado, sin teléfono ni URI. DEC-010/011 siguen siendo bloqueadores absolutos de cualquier acción.
- REQ-11 ofrece `synthetic-minimized-sbar/demo-v1` como preview efímero e imprimible. Assessment usa un fallback explícito y R solo refleja tareas existentes. No existe PDF institucional, envío o firma; DEC-005/012 siguen pendientes.
- La regla `synthetic-demo-flow-mechanics` activa del seed sirve solo para demostrar la mecánica aviso → revisión humana. Su nombre y referencia declaran que no está clínicamente validada. Las cuatro reglas de contenido permanecen `draft` y no aprobadas.
