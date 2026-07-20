# ADR-0008 — Cola profesional y eventos humanos de tarea

- Estado: Aceptada para demo técnica sintética
- Fecha: 2026-07-20
- Alcance: REQ-09

## Contexto

REQ-09 necesita organizar episodios, check-ins, avisos y tareas sin convertir un aviso determinista en una decisión asistencial. También debe impedir acceso transversal entre profesionales, actualización perdida y doble resolución silenciosa.

Prioridades, SLA, tiempos objetivo y taxonomías operativas siguen pendientes de validación local en DEC-017. No pueden presentarse como clasificación clínica ni codificarse como valores definitivos.

## Decisión

`NursingWorkQueue` es una proyección de lectura, no una nueva fuente clínica. Solo incluye episodios donde el actor conserva un rol profesional activo y es responsable de enfermería o clínico, y aplica filtros dentro de ese conjunto. «Último check-in relevante» significa el resultado terminal con `recordedAt` más reciente; excluye respuestas y texto libre. Los pendientes de check-in solo cuentan asignaciones sin resultado cuya ventana contiene el instante de consulta; las asignaciones futuras no incrementan ese contador. Los avisos conservan explicación, versión y referencias estructuradas de origen.

`Task` pertenece obligatoriamente a `DischargeEpisode`. Su relación con `Alert` es opcional y una clave foránea compuesta garantiza que ambos pertenezcan al mismo episodio. Si existe vínculo, aplicación y base de datos exigen que el aviso ya no esté `open` y tenga al menos un `AlertReview` humano. No existe creación desde el motor de reglas ni desde `AlertReview`: la única entrada es una petición profesional explícita al caso de uso de creación.

Las mutaciones crean primero un `TaskEvent` append-only y después actualizan la proyección de estado bajo la misma transacción. Cada petición exige idempotencia por actor y revisión esperada; los índices únicos por actor/clave y tarea/revisión hacen que una carrera tenga un único ganador. Un trigger impide cambios de estado o asignación sin evento coincidente.

La resolución requiere motivo, actor y timestamp. Revisar un aviso y resolver una tarea son operaciones distintas. Ninguna acción de tarea modifica el episodio o el aviso, envía comunicaciones, deriva, recomienda, firma o genera SBAR.

## Consecuencias

- `nurse` y `clinician` acceden únicamente a episodios asignados; `admin`, `patient`, `caregiver` y `support` quedan denegados.
- La auditoría contiene metadatos de acción y recurso, nunca el resumen, nota, explicación o motivo.
- Las métricas se limitan a recuentos y antigüedad técnica agregada de tareas visibles.
- La configuración de prioridad/SLA queda fuera del modelo hasta resolver DEC-017.
- La demo no constituye validación clínica, jurídica, institucional, RGPD, MDR ni preparación productiva.
