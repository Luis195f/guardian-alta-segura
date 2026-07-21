# ADR-0009 — Acceso granular del cuidador y revocación inmediata

- Estado: Aceptada para demo técnica sintética
- Fecha: 2026-07-21
- Alcance: REQ-05 y REQ-06
- Validación jurídica/operativa: Pendiente (DEC-004, DEC-005 y DEC-013)

## Contexto

Una autorización genérica por rol no basta para compartir información postalta. El acceso debe depender simultáneamente del paciente, cuidador, episodio, política vigente, autorización explícita, versión de scope y permiso del campo o sección. Revocar no puede borrar documentación previa y debe cortar todas las sesiones concurrentes sin esperar a su expiración.

## Decisión

`CaregiverProfile` conserva únicamente un identificador externo seudonimizado y su vínculo interno con la identidad sintética. `CaregiverInvitation` guarda hash del token y solo admite una transición atómica de no consumida a consumida. Los valores predeterminados de 30 minutos para invitación y 8 horas para sesión son supuestos técnicos configurables de la demo (`CAREGIVER_DEMO_INVITATION_TTL_MINUTES` y `CAREGIVER_DEMO_SESSION_TTL_HOURS`), no políticas institucionales. El adapter local devuelve el token a la UI demo y no envía comunicaciones reales.

Aceptar una invitación exige además una sesión general con rol técnico `caregiver` que coincida con el perfil. Crea `CaregiverSession` y una cookie HttpOnly separada. Cerrar sesión invalida la fila persistida, registra auditoría minimizada y expira la cookie; el mismo token no vuelve a ser válido. La sesión general, el rol o el conocimiento del token por sí solos no conceden acceso al portal. `support` no puede aceptar ni impersonar.

`CaregiverAuthorizationScope` es append-only, específico por episodio y versionado N+1 dentro de `(caregiverAuthorizationId, dischargeEpisodeId)`. Enumera capacidades, secciones concretas del Plan y claves de recursos locales. Cada petición toma la última versión de la autorización y el episodio de su sesión, y revalida server-side la autorización legal `caregiver:portal`, su política, vigencia, revocación, identidad y sesión. Para mostrar una sección deben coincidir la capability, la lista del scope y el permiso `CAREGIVER` de esa sección en la versión activa exacta del Plan.

La base impide identidades cruzadas mediante FKs compuestas entre invitación, sesión y observación, más triggers que verifican autorización → sujeto → episodio y autorización → cuidador → perfil. Inserciones de scope, invitación, sesión u observación toman un bloqueo compartido de la autorización; crear `RevocationEvent` toma el bloqueo exclusivo. Así, una operación iniciada con lectura previa obsoleta no puede confirmar después de una revocación ya confirmada.

La revocación reutiliza `RevocationEvent` y, en la misma transacción, fija `revokedAt` en todas las sesiones activas de esa autorización. Cada petición vuelve a comprobar también el evento, de modo que una sesión no recupera acceso por un fallo de sincronización. Invitaciones, scopes, sesiones, observaciones y auditoría no se borran físicamente.

`CaregiverObservation` se limita a registrar texto para revisión humana. No invoca el motor de reglas, no crea `Alert`, tarea, derivación ni actuación. `CaregiverAccessAudit` guarda solo acción, resultado, IDs técnicos y correlation ID; nunca copia el Plan ni la observación.

## Consecuencias y límites

- El portal solo puede mostrar secciones autorizadas del Plan activo, tareas ya asignadas a la identidad cuidadora, recursos enumerados y el formulario de observación según scope.
- Diagnósticos, notas, check-ins completos y otros campos clínicos no forman parte de la consulta del portal.
- El flujo para asignar tareas a cuidadores no se define aquí; la cola profesional existente mantiene sus propias reglas. El portal únicamente aplica el filtro de lectura si una fuente futura autorizada las asigna.
- La política `caregiver:portal` sembrada permanece `PENDING`; la demo falla de forma segura hasta registrar una política local aprobada. Esto no resuelve capacidad, representación legal, autenticación institucional ni retención.
- Los dos recursos locales son material sintético de límites/observaciones; no incluyen números ni destinos de crisis. DEC-010/011 permanecen sin resolver.
