# ADR-0003: Identidad demo local frente a SSO institucional futuro

- **Estado:** Aceptada para desarrollo sintético; no aprobada para producción
- **Fecha:** 2026-07-15
- **Decisores:** equipo técnico de la fundación; Dirección TI conserva la autoridad sobre DEC-013 y el gate aplicable

## Contexto

La fundación necesita probar sesiones, roles, auditoría y autorizaciones negativas antes de que exista un proveedor institucional verificado. Inventar OAuth, MFA o una imitación de SSO produciría una falsa evidencia de seguridad y acoplaría el dominio a una decisión local pendiente.

## Decisión

La aplicación separa dos contratos para no convertir una credencial demo en requisito del futuro proveedor:

- `DemoIdentityProvider` recibe únicamente una credencial sintética con `syntheticAlias`;
- `InstitutionalIdentityProvider<AuthenticationContext>` es un port genérico futuro cuyo contexto permanece sin concretar. No define claims, protocolo, tokens ni mecanismo de autenticación.

En esta fase solo existe un adaptador para `DemoIdentityProvider`, con estas restricciones:

- funciona solo con `DEMO_MODE=true`, fuera de producción, con `APP_BASE_URL` en loopback y con el servidor local enlazado a `127.0.0.1`;
- cada ruta demo valida también que el `Host` efectivo sea loopback y rechaza cualquier `X-Forwarded-Host` no loopback;
- falla de forma segura en LAN, staging, Internet o cualquier host no loopback;
- acepta exclusivamente aliases creados por el seed sintético;
- no almacena contraseñas, secretos, tokens externos ni atributos clínicos;
- crea una sesión revocable y guarda solo el hash SHA-256 del token;
- entrega el token en cookie HttpOnly, SameSite Strict y Secure cuando corresponde;
- audita el login dentro de la misma transacción que crea la sesión;
- se identifica en código y UI como `demo-local` y `NO PRODUCTIVO`.
- usa un TTL configurable entre 1 y 12 horas; las ocho horas del ejemplo son un supuesto demo, no una política institucional.

El futuro adaptador institucional implementará el port institucional separado. No se especifican todavía protocolo, claims, MFA, ciclo de vida, acceso de emergencia ni mapeo final de roles. Esas decisiones siguen bloqueadas por DEC-013 y requieren verificación de Dirección TI.

## Consecuencias

### Positivas

- El dominio no depende de un proveedor concreto y el caso de uso demo no condiciona el contrato institucional.
- Las pruebas pueden verificar denegación por defecto, cookies, sesiones y auditoría sin fingir controles institucionales.
- No se introducen contraseñas propias ni OAuth improvisado.

### Costes y límites

- El modo demo no demuestra autenticación reforzada, SSO, MFA, cierre de sesión global ni revocación del proveedor.
- No puede habilitarse en producción ni con identidades o datos reales.
- No puede exponerse en una interfaz LAN, staging o Internet.
- Los roles técnicos no equivalen a puestos institucionales hasta que se apruebe su mapeo.

## Criterios para sustituir el adaptador demo

Antes de un adaptador productivo deben existir, como mínimo, decisión versionada de proveedor y protocolo, validación de issuer/audience/firmas, mapeo restrictivo de claims a roles y scopes, sesiones/revocación, MFA aprobada, acceso de emergencia, pruebas negativas y evidencia del gate institucional. La sustitución no puede relajar la autorización server-side ni conceder acceso por ausencia de claim.

## Relación con requisitos

Implementa parcialmente la base técnica de REQ-12. No constituye su validación técnica ni resuelve DEC-013.
