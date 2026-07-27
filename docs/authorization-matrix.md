# Matriz de autorización de referencia

## Principios

Esta matriz define límites de diseño para los roles técnicos `admin`, `nurse`, `clinician`, `patient`, `caregiver` y `support`. No sustituye a los responsables institucionales canónicos ni aprueba un modelo de identidad. Los valores institucionales de la columna `Rol autorizado` de la matriz de trazabilidad permanecen literales: un nombre técnico es solo una futura correspondencia de implementación, pendiente de verificación local, y no puede reemplazar ni ampliar esos valores. Hasta aprobar esa correspondencia prevalecen la denegación por defecto y el límite más restrictivo. Toda autorización se evalúa en servidor y se limita al episodio, organización, propósito y alcance vigente.

**Leyenda:** `Sí` = permitido dentro de alcance; `Propio` = solo información o acciones propias; `Autorizado` = solo alcance explícito vigente; `Técnico` = metadatos sanitizados; `No` = denegado.

| Capacidad | admin | nurse | clinician | patient | caregiver | support |
|---|---:|---:|---:|---:|---:|---:|
| Administrar cuentas y asignaciones de rol | Sí, sin autoasignarse acceso clínico | No | No | No | No | No |
| Configurar parámetros técnicos | Sí, sujeto a aprobación/versionado | No | No | No | No | No |
| Validar alta/identidad | No por rol administrativo | Sí, según protocolo | Sí, según protocolo | No | No | No |
| Crear y transicionar episodio asignado | No | Sí, asignado | Sí, asignado | No | No | No |
| Gestionar registros de participación y comunicaciones | No | No | Sí, según protocolo | Propio | No | No |
| Ver episodio y contenido clínico | No por defecto | Sí, asignado | Sí, asignado | Propio | Autorizado | No |
| Editar o activar Plan de Seguridad | No | Sí, asignado | Sí, asignado | No; aporta información por flujo autorizado | No | No |
| Ver historial permitido del Plan | No por defecto | Sí, asignado | Sí, asignado | Propio | Autorizado por sección | No |
| Responder check-ins | No | No | No | Propio | No | No |
| Versionar protocolos y cadencia de check-in | Sí, solo configuración sintética demo; no implica aprobación | No | No | No | No | No |
| Crear asignaciones desde la versión fijada al episodio | No | Sí, asignado y con participación digital vigente | Sí, asignado y con participación digital vigente | No | No | No |
| Consultar histórico de check-ins | No | Sí, asignado | Sí, asignado | Propio | No | **No** |
| Omitir un check-in como evento de no respuesta | No | No | No | Propio | No | No |
| Versionar reglas explicables | Sí, solo catálogo sintético demo; siempre crea `draft` | No | No | No | No | No |
| Aprobar una versión de regla | No | No | Sí, referencia local explícita | No | No | No |
| Activar una versión aprobada | Sí, sin acceso al contenido del episodio | No | No | No | No | No |
| Evaluar reglas activas y revisar avisos | No | Sí, episodio asignado | Sí, episodio asignado | No | No | No |
| Consultar cola y crear/asignar/resolver tareas | No | Sí, episodio asignado; assignment no concede autoridad exclusiva | Sí, episodio asignado; assignment no concede autoridad exclusiva | No | No | No |
| Registrar/revisar Domicilio Seguro | No | Sí, episodio asignado | Sí, episodio asignado | No | No; requiere scope futuro explícito | No |
| Gestionar autorización de cuidador | No | No | No | Propio dentro del protocolo | No | No |
| Crear/cambiar invitación y scope de cuidador | No | No | No | Propio, con autorización `caregiver:portal` vigente y limitado al episodio | No | No |
| Ver secciones del Plan en portal cuidador | No | No | No | No | Autorizado por capability, sección y permiso documental | **No** |
| Ver tareas asignadas en portal cuidador | No | No | No | No | Autorizado y solo asignadas a su identidad | **No** |
| Enviar observación para revisión humana | No | No | No | No | Autorizado; nunca genera alerta automática | **No** |
| Ver recursos del portal cuidador | No | No | No | No | Solo claves enumeradas en el scope vigente | **No** |
| Registrar revocación | No | No | Sí, según protocolo | Propio dentro del protocolo | No | No |
| Abrir recurso de crisis aprobado | No; recurso no configurado | No; recurso no configurado | No; recurso no configurado | No; recurso no configurado | No | No |
| Generar preview SBAR sintético no firmado | No | Sí, episodio asignado | Sí, episodio asignado | No | No | No |
| Exportar PDF clínico minimizado | No | No; solo impresión HTML demo | No; solo impresión HTML demo | No | No | No |
| Autenticarse y usar capacidades asignadas | Sí, según alcance | Sí, según alcance | Sí, según alcance | Sí, según alcance | Sí, según alcance | Sí, según alcance técnico |
| Consultar auditoría | Metadatos autorizados | Solo trazabilidad necesaria | Solo trazabilidad necesaria | No | No | Técnico, sin texto clínico |
| Gestionar incidente técnico | No | No | No | No | No | Técnico |
| Acceder a notas clínicas en texto plano | No por defecto | Sí, asignado y necesario | Sí, asignado y necesario | Solo contenido propio permitido | No salvo sección autorizada explícita | **No** |
| Crear una versión del Plan de Seguridad | No | Sí, episodio asignado | Sí, episodio asignado | No | No | No |
| Activar o invalidar una versión del Plan de Seguridad | No | Sí, episodio asignado y revisión humana | Sí, episodio asignado y revisión humana | No | No | No |
| Consultar Plan de Seguridad | No | Todas las versiones del episodio asignado | Todas las versiones del episodio asignado | Activa e historial sustituido, solo secciones permitidas | Solo versión activa y secciones autorizadas simultáneamente por scope y documento | **No** |
| Activar contingencia o acceder al censo | No | Solo con alcance verificado de Enfermería Gestora | No | No | No | No |

## Controles obligatorios

- Un rol no concede acceso global: también se comprueban relación con el episodio, alcance, vigencia y finalidad.
- El assignee actual no sustituye la autorización de recurso: creator, assignee, event actor, resolver y responsables del episodio pueden ser personas distintas.
- Una asignación nueva exige target activo, rol profesional vigente y responsabilidad actual del episodio; las mutaciones bloquean primero el episodio, después los `User` participantes únicos ordenados globalmente por ID y finalmente sus roles, serializando revocación y cruces de identidad incluso entre episodios.
- `admin` gestiona la plataforma, pero no hereda acceso clínico por su función técnica.
- `support` no puede impersonar a otro rol ni consultar notas, respuestas, planes, SBAR o exportaciones clínicas.
- `caregiver` solo ve módulos, secciones y acciones enumerados en el último scope de la autorización y episodio de su sesión; cambiar otro episodio no propaga permisos. Revocar invalida de inmediato todas las sesiones y el logout invalida la sesión persistida correspondiente.
- `patient` no puede aprobar reglas, firmar cierres profesionales ni ampliar permisos fuera del protocolo.
- `Todos` en REQ-12 significa que cada categoría necesita autenticación; no concede a ningún rol todas las capacidades de la matriz.
- Una tarea vinculada a aviso requiere revisión humana previa, autorización fail-closed del acting actor y una petición profesional explícita; la revisión por sí sola no crea tareas ni decisiones asistenciales. Reviewer y acting actor pueden ser personas distintas según las responsabilidades actuales.
- Aprobar y activar una regla son capacidades separadas; ninguna de ellas crea avisos ni actuaciones por sí sola.
- Los cambios de rol, permisos, scopes, sesiones y accesos críticos producen auditoría inmutable y minimizada.

## Pendientes de verificación y aprobación

El proveedor de identidad, autenticación reforzada, ciclo de vida de cuentas, separación de funciones, acceso de emergencia y mapeo final de roles a puestos institucionales están pendientes de verificación técnica y aprobación local. Esta matriz es una restricción de diseño, no evidencia de que esos controles estén implementados.
