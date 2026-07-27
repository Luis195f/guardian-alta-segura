# Flujo clínico-organizativo de continuidad postalta

## Principios del flujo

El flujo organiza información y deja evidencia de revisión humana. No diagnostica, no predice, no decide actuaciones clínicas y no reemplaza los procedimientos locales. Toda referencia a uso asistencial real queda condicionada a los gates aplicables y a las decisiones registradas como pendientes.

## Secuencia del episodio

### 1. Alta estructurada e identidad

Una persona autorizada registra el alta estructurada. Antes de validar el episodio, verifica la identidad conforme al protocolo local y lo vincula a un ID seudonimizado. El sistema no inventa el método de identidad ni activa el episodio por inferencia.

El episodio comienza en borrador y solo transita mediante la máquina explícita `draft → active`, `active ⇄ paused` y `active|paused → closed`. Cada transición conserva actor, rol, fecha, versión resultante y motivo cuando corresponda, y produce auditoría minimizada. La activación revalida dentro de la transacción la política versionada de identidad y los dos profesionales responsables; la idempotencia y la versión optimista evitan dobles activaciones y escrituras obsoletas.

### 2. Participación y base jurídica separadas

Se registran de forma independiente y granular:

1. participación en el piloto;
2. participación digital;
3. permiso para comunicaciones telemáticas por canal y alcance;
4. base jurídica del tratamiento asistencial determinada por la institución.

Un estado no implica los demás. Ninguna comunicación se habilita sin la base o el consentimiento específico vigente que corresponda. La evaluación jurídica y los textos definitivos permanecen pendientes.

### 3. Autorización del cuidador

El acceso de un cuidador requiere autorización explícita `caregiver:portal`, política aprobada, vigencia, invitación local de un uso, identidad coincidente y sesión separada. El scope append-only es específico por episodio, enumera capacidades, secciones del Plan y recursos, y se versiona N+1 dentro de autorización + episodio; cada petición usa la última versión del episodio ligado a la sesión. La ausencia de cualquiera de esos elementos produce denegación. La autorización no concede acceso general a diagnósticos, notas, check-ins completos ni contenido no autorizado, y no presume capacidad o representación legal.

### 4. Revocación

La retirada de participación digital detiene futuras interacciones digitales según la configuración aprobada. La revocación del cuidador serializa contra lecturas y mutaciones, invalida de inmediato sus sesiones vigentes y bloquea nuevos accesos. Cerrar sesión también invalida solo esa sesión persistida. Ninguna revocación borra el alta, planes, invitaciones, scopes, sesiones, observaciones, revisiones ni documentación clínica histórica, ni modifica la base jurídica asistencial.

### 5. Plan de Seguridad versionado

El Plan de Seguridad Stanley-Brown contiene seis secciones: señales de alarma, estrategias internas, distracción, red de apoyo, profesionales/recursos y reducción de acceso a medios. Una edición profesional crea `v.N+1`; `v.N` continúa disponible según autorización e historial. El guardado crea un borrador y una revisión humana posterior lo activa. Activar, sustituir o invalidar añade un evento append-only; invalidar exige motivo. El sistema no sobrescribe, firma, puntúa ni completa automáticamente contenido ausente.

Cada sección conserva procedencia (`patient`, `nurse` o `clinician`) y permisos separados para paciente y cuidador. El paciente vinculado ve la versión activa y el historial sustituido permitido. El cuidador solo puede ver una sección de la versión activa cuando coinciden capability, sección enumerada en el scope vigente y permiso documental `CAREGIVER`. La revisión optimista impide que dos editores sobrescriban silenciosamente una base desactualizada.

### 6. Domicilio Seguro informativo

El módulo registra información, comprensión del disclaimer, elementos pendientes y revisión humana. Su resultado es informativo: no genera un score global, una clasificación «apto/no apto» ni certifica que el domicilio sea seguro.

### 7. Check-ins configurables

Los cuestionarios y su frecuencia dependen de una configuración local versionada. Cada respuesta conserva la versión aplicable. Una falta de respuesta se registra como evento, no como interpretación clínica. No se fijan en esta base documental frecuencias, ventanas ni umbrales.

### 8. Avisos explicables

Solo reglas deterministas, versionadas, trazables y aprobadas localmente pueden generar avisos. El aviso muestra la regla, su versión y el dato desencadenante; no contiene puntuación predictiva ni diagnóstico. Si faltan datos necesarios, la regla se abstiene. El semáforo visual permanece desactivado por defecto mediante feature flag hasta validación clínica local.

### 9. Revisión humana

Una persona profesional autorizada revisa el aviso y registra actor, fecha, resultado y motivo cuando corresponda. «Revisado» no significa «resuelto» ni activa por sí solo un contacto, una derivación, una firma o el cierre del episodio.

La revisión es evidencia histórica; no es permiso actual ni acción. Para crear una tarea derivada, la policy de autorización humana combina esa evidencia con el rol activo, la responsabilidad de episodio y el actor que solicita ahora la operación. Reviewer y acting actor pueden ser personas distintas. El rol histórico del reviewer no se infiere desde su rol actual.

### 10. Tareas vinculadas

Después de la revisión humana, la interfaz puede permitir crear una tarea vinculada al aviso y al episodio. Crear o asignar la tarea es una decisión humana y no equivale a una actuación clínica automática. El origen y los cambios de estado quedan auditados sin copiar contenido clínico innecesario.

En la demo técnica, toda tarea se vincula obligatoriamente al episodio y puede vincularse opcionalmente a un aviso. Revisar un aviso nunca crea una tarea. La asignación, reasignación, intento de contacto, nota breve y resolución se registran mediante acciones explícitas con historial append-only; la resolución exige actor, motivo y timestamp. La revisión optimista e idempotencia evitan resolución doble y actualización perdida. Resolver una tarea no cierra el episodio ni genera SBAR, derivación, comunicación o recomendación.

Existen dos caminos distintos: `señal → evaluación → aviso → revisión humana → autorización → POST explícito de tarea`, y `profesional → POST explícito de tarea manual sin aviso`. El segundo no recibe procedencia ni review ficticias. `actioned` es un estado administrativo del aviso y no acredita por sí solo una tarea o actuación; esa prueba exige `Task`/`TaskEvent`.

### 11. Botón de crisis

El botón abre el marcador nativo únicamente cuando existe un recurso oficial aprobado localmente y verificado por TI. Dirección Médica es la autoridad final única sobre el destino. El paso 5 del Plan de Seguridad no es una fuente de configuración: mientras DEC-010 y DEC-011 sigan pendientes, rechaza URI `tel:` y secuencias con apariencia de teléfono. No se inventa teléfono, destino ni consejo.

### 12. SBAR y exportación PDF

El profesional redacta y valida manualmente Situation, Background, Assessment y Recommendation. Solo pueden prellenarse datos estructurados deterministas con origen visible; los ausentes permanecen vacíos o pendientes. No hay inferencias, firma automática ni generación mediante IA. La exportación PDF incluye exclusivamente los campos permitidos por un perfil local versionado y minimizado.

### 13. Incidentes técnicos

Los fallos se registran en un circuito técnico segregado mediante código sanitizado, componente, entorno, marca temporal y correlation ID. Los tickets, logs y trazas no incluyen diagnósticos, notas, respuestas de check-in, identificadores directos ni otro contenido clínico.

### 14. Contingencia ante caída

El censo de contingencia es opcional, está desactivado por defecto y solo puede habilitarse conforme al plan local de continuidad. Su activación, acceso y desactivación requieren autorización y auditoría. No se presuponen RTO, RPO, retención ni procedimientos manuales definitivos.

### 15. Cierre

Una persona autorizada cierra el episodio con motivo y conforme al protocolo local. El sistema no cierra automáticamente por fecha, puntuación o ausencia de actividad. El cierre conserva el historial, las versiones, las autorizaciones y revocaciones y las evidencias de revisión sujetas a la política institucional pendiente.

La vista de gobernanza consulta los avisos no terminales y tareas abiertas actuales, pero no los convierte en criterio clínico definitivo. DEC-002 sigue pendiente y mantiene el cierre en denegación segura. Política ausente, error de evaluación o estado inconsistente también deniegan; ninguna de esas condiciones se interpreta como ausencia de blockers.

## Excepciones seguras

- Falta de identidad verificada: no validar el alta.
- Falta de base o permiso específico: no enviar la comunicación.
- Autorización de cuidador ausente, vencida o revocada: denegar acceso.
- Regla no aprobada o dato requerido ausente: no generar el aviso.
- Recurso de crisis no aprobado: no abrir el marcador.
- Perfil de exportación no aprobado: no generar el PDF para uso real.
- Caída sin plan de continuidad aprobado: no habilitar un censo improvisado.
