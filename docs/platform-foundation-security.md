# Fundación de plataforma: arquitectura y controles de seguridad

## Alcance

Este documento describe la implementación técnica de la rama `feat/01-platform-foundation`. No acredita un entorno productivo ni validación clínica, jurídica, RGPD, MDR o institucional. Solo se permiten datos sintéticos.

## Capas y fronteras

| Capa            | Responsabilidad                                                                 | Dependencias permitidas                       |
| --------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| Dominio         | Roles, recursos protegidos y decisión allow/deny                                | Ninguna dependencia de Next.js o Prisma       |
| Aplicación      | Login/logout, asignación de rol y auditoría transaccional                       | Ports separados de identidad y persistencia   |
| Infraestructura | Prisma/PostgreSQL, identidad demo, cookies, entorno, CSRF, rate limit y errores | Implementa ports; no contiene reglas clínicas |
| Presentación    | UI y adaptadores HTTP                                                           | Invoca aplicación y autorización server-side  |

No existe modelo de paciente, episodio, nota, plan, check-in, alerta, SBAR ni integración clínica. `simulated-clinical-record` es únicamente un identificador de autorización usado para probar que `support` y `admin` no reciben acceso clínico implícito.

## Autorización

La autorización se evalúa en servidor contra una lista cerrada de recursos. Un recurso desconocido no se convierte en permiso; la ruta lo rechaza. Un usuario sin asignación activa queda no autenticado y un principal sin roles queda denegado.

| Recurso técnico/simulado    | Roles permitidos                      |
| --------------------------- | ------------------------------------- |
| Sesión autenticada          | todos los roles con asignación activa |
| Administración de roles     | admin                                 |
| Registro clínico simulado   | nurse, clinician                      |
| Registro propio simulado    | patient                               |
| Sección autorizada simulada | caregiver                             |
| Metadatos técnicos          | admin, support                        |

Estos permisos no conceden alcance global. Los futuros módulos deberán añadir organización, episodio, relación, vigencia, finalidad y autorización por campo sin ampliar esta matriz por defecto.

## Sesión e identidad

- `DemoIdentityProvider` recibe `syntheticAlias`; el port genérico `InstitutionalIdentityProvider<AuthenticationContext>` permanece separado y no presupone claims ni protocolo.
- El adaptador demo verifica `isSynthetic`, cuenta activa y roles activos.
- El token aleatorio de 256 bits solo sale del servidor como cookie HttpOnly; se persiste su hash.
- El TTL demo se valida entre 1 y 12 horas; ocho horas es solo el valor del ejemplo local, no una política institucional.
- `DEMO_MODE=true` en producción o con un host no loopback es un error de configuración. Next.js enlaza el servidor demo a `127.0.0.1` y cada ruta demo rechaza además un `Host` ausente/no loopback. El `X-Forwarded-Host` interno de Next.js solo se acepta como un valor único cuya autoridad canónica coincide exactamente con ese `Host`; no existe confianza general en forwarded headers ni se confía únicamente en `APP_BASE_URL`.
- `admin` no puede autoasignarse roles clínicos.
- La asignación administrativa recibe `actingRole=admin` explícito y revalida dentro de la misma transacción que el actor siga activo y conserve el rol.
- Un objetivo administrativo debe existir, estar activo y ser sintético. Las seis identidades demo reservadas no aceptan roles adicionales mediante la API.

## Auditoría y errores

`AuditEvent` registra actor técnico, rol, acción, tipo/ID técnico de recurso, resultado, fecha y correlation ID. No dispone de campo de texto libre. Triggers PostgreSQL impiden `UPDATE` y `DELETE`. Las mutaciones críticas usan la misma transacción para estado y evento.

Las pruebas de integración ejecutan estas garantías contra PostgreSQL real: un fallo al insertar auditoría revierte sesión o rol, UPDATE/DELETE fallan y mutación/evento se confirman juntos. Los mocks unitarios no se presentan como evidencia de atomicidad.

El error público contiene solo código, mensaje estable y correlation ID. El log técnico contiene solo nivel, código, componente y correlation ID. Nunca se registra el body, el mensaje original o el stack, ni siquiera en desarrollo, para evitar que datos sensibles lleguen a trazas.

## Controles HTTP y limitaciones

- Mutaciones: comprobación estricta del valor canónico de `Origin`; cookies SameSite Strict.
- Demo: comprobación server-side del host efectivo, incluso cuando `APP_BASE_URL` ya es loopback.
- Headers: CSP acotada que bloquea `base`, objetos y framing, frame denial, no-sniff, no-referrer, COOP y desactivación de cámara/micrófono/geolocalización.
- Login demo: cinco intentos por minuto y alias sintético validado como clave, almacenado solo en memoria; no se particiona por `User-Agent` ni otras cabeceras controladas por el cliente.
- Docker publica PostgreSQL únicamente en `127.0.0.1:5432`.
- Healthcheck: sin base de datos, secretos, versión interna ni datos de usuario.
- Correlation ID: UUID generado en el proxy, propagado a respuestas y auditoría.

El rate limiter no es distribuido, se reinicia con el proceso y no sustituye WAF/API gateway. HSTS requiere terminación TLS verificada. La CSP acotada no declara una política de scripts; una CSP estricta con nonces se aplaza hasta definir el despliegue y no se simula mediante `unsafe-inline`. Estos controles son bloqueos pendientes de infraestructura, no defectos ocultos como controles completos.

## Seed demo determinista

Cada ejecución deja exactamente un rol activo esperado en cada uno de los seis aliases demo. Los roles activos adicionales se revocan de forma explícita y generan `ROLE_REVOKED`; las asignaciones ausentes se crean con `ROLE_ASSIGNED`. Los registros anteriores permanecen como historial y una segunda ejecución sin cambios no añade mutaciones.

## Dependencias de producción justificadas

- `next`, `react`, `react-dom`: runtime de presentación solicitado.
- `@prisma/client`: acceso tipado a PostgreSQL y transacciones.

El resto son dependencias de desarrollo. Se mantiene Prisma 6.19 en esta fundación para evitar añadir el driver adapter requerido por el cambio mayor de Prisma 7 sin una necesidad funcional.
