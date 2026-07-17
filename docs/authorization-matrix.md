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
| Editar o activar Plan de Seguridad | No | Sí | No | No; aporta información por flujo autorizado | No | No |
| Ver historial permitido del Plan | No por defecto | Sí, asignado | No | Propio | Autorizado por sección | No |
| Responder check-ins | No | No | No | Propio | No | No |
| Revisar avisos explicables | No | Sí, asignado | No | No | No | No |
| Crear/cerrar tareas tras revisión | No | Sí, asignado | Sí, asignado | Solo acciones propias si se habilitan | Solo tareas autorizadas | No |
| Registrar/revisar Domicilio Seguro | No | Sí, revisión humana | No | No | Autorizado | No |
| Gestionar autorización de cuidador | No | No | No | Propio dentro del protocolo | No | No |
| Registrar revocación | No | No | Sí, según protocolo | Propio dentro del protocolo | No | No |
| Abrir recurso de crisis aprobado | No | No | No | Propio | No | No |
| Redactar/validar SBAR | No | Sí, si el protocolo lo permite | Sí | No | No | No |
| Exportar PDF clínico minimizado | No por defecto | Sí, con perfil aprobado | Sí, con perfil aprobado | Solo si una política futura lo autoriza | No | No |
| Autenticarse y usar capacidades asignadas | Sí, según alcance | Sí, según alcance | Sí, según alcance | Sí, según alcance | Sí, según alcance | Sí, según alcance técnico |
| Consultar auditoría | Metadatos autorizados | Solo trazabilidad necesaria | Solo trazabilidad necesaria | No | No | Técnico, sin texto clínico |
| Gestionar incidente técnico | No | No | No | No | No | Técnico |
| Acceder a notas clínicas en texto plano | No por defecto | Sí, asignado y necesario | Sí, asignado y necesario | Solo contenido propio permitido | No salvo sección autorizada explícita | **No** |
| Crear una versión del Plan de Seguridad | No | Sí, episodio asignado | Sí, episodio asignado | No | No | No |
| Activar o invalidar una versión del Plan de Seguridad | No | Sí, episodio asignado y revisión humana | Sí, episodio asignado y revisión humana | No | No | No |
| Consultar Plan de Seguridad | No | Todas las versiones del episodio asignado | Todas las versiones del episodio asignado | Activa e historial sustituido, solo secciones permitidas | Portal no disponible; política por sección preparada y denegada por defecto | **No** |
| Activar contingencia o acceder al censo | No | Solo con alcance verificado de Enfermería Gestora | No | No | No | No |

## Controles obligatorios

- Un rol no concede acceso global: también se comprueban relación con el episodio, alcance, vigencia y finalidad.
- `admin` gestiona la plataforma, pero no hereda acceso clínico por su función técnica.
- `support` no puede impersonar a otro rol ni consultar notas, respuestas, planes, SBAR o exportaciones clínicas.
- `caregiver` solo ve módulos, secciones y acciones enumerados en una autorización vigente; revocarla invalida de inmediato sus sesiones.
- `patient` no puede aprobar reglas, firmar cierres profesionales ni ampliar permisos fuera del protocolo.
- `Todos` en REQ-12 significa que cada categoría necesita autenticación; no concede a ningún rol todas las capacidades de la matriz.
- Solo una revisión humana autorizada puede originar una tarea o decisión asistencial.
- Los cambios de rol, permisos, scopes, sesiones y accesos críticos producen auditoría inmutable y minimizada.

## Pendientes de verificación y aprobación

El proveedor de identidad, autenticación reforzada, ciclo de vida de cuentas, separación de funciones, acceso de emergencia y mapeo final de roles a puestos institucionales están pendientes de verificación técnica y aprobación local. Esta matriz es una restricción de diseño, no evidencia de que esos controles estén implementados.
