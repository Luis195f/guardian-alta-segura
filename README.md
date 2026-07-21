# Guardián Alta Segura

MVP técnico de continuidad postalta en salud mental. Esta rama contiene infraestructura, identidad demo sintética, autorización, auditoría, episodio postalta, Plan de Seguridad, check-ins configurables/versionados, avisos explicables y una cola profesional con tareas humanas trazables; no es apta para uso asistencial real.

> **SINTÉTICO / NO USO CLÍNICO.** No diagnostica, prescribe ni predice riesgo. No sustituye decisiones profesionales ni acredita validación clínica, jurídica, institucional, RGPD o MDR.

## Stack y requisitos

- Node.js 22.14–24 y pnpm 11.7 (único gestor; `pnpm-lock.yaml` es obligatorio).
- PostgreSQL 16. Docker Compose es la vía local documentada.
- Next.js App Router, TypeScript estricto, Prisma, Vitest y Playwright.

No se usan contraseñas propias, OAuth, SSO o MFA simulados. El proveedor institucional sigue pendiente en DEC-013. El demo se sirve en `127.0.0.1`, valida además el host efectivo de cada petición y falla de forma segura fuera de loopback; no puede exponerse en LAN, staging o Internet.

## Puesta en marcha local

Desde un clon limpio del repositorio y con `main` actualizado:

```powershell
Copy-Item .env.example .env
# Edita .env y sustituye ambos placeholders de contraseña por el mismo valor local.
docker compose up -d postgres
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

Abrir `http://127.0.0.1:3000`. El healthcheck técnico está en `GET /api/health` y solo responde `status` y `service`.

El seed es idempotente y crea estas seis identidades ficticias con exactamente un rol activo esperado:

- `demo-admin`
- `demo-nurse`
- `demo-clinician`
- `demo-patient`
- `demo-caregiver`
- `demo-support`

Todas muestran la etiqueta `SINTÉTICO / NO USO CLÍNICO`. No existe contraseña: el adaptador demo acepta el alias únicamente cuando `DEMO_MODE=true`, fuera de producción, con `APP_BASE_URL` en loopback y con el `Host` efectivo de la petición también en loopback. Las seis identidades fijas no admiten roles adicionales mediante la API. Si una ejecución anterior dejó roles demo activos inesperados, el seed los revoca y audita sin borrar su historial.

## Verificación

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium  # una vez por equipo
pnpm test:e2e
pnpm build
pnpm traceability:check
pnpm db:migrate:status
```

CI ejecuta instalación congelada, generación de Prisma, despliegue/estado de migraciones sobre PostgreSQL, trazabilidad, formato, lint, tipos, unit/integration, build y e2e en Chromium.

## Arquitectura

- `src/domain`: roles, principal, recursos protegidos y política de denegación por defecto.
- `src/application`: casos de uso de identidad, episodio, Plan de Seguridad, check-ins, avisos explicables y tareas; dependen de ports.
- `src/infrastructure`: Prisma, `DemoIdentityProvider`, sesiones, entorno, CSRF, rate limit, correlation ID y errores sanitizados.
- `src/presentation` y `src/app`: UI accesible y adaptadores HTTP de Next.js; no contienen reglas de autorización.
- `prisma`: modelos, migraciones versionadas, controles append-only y seed exclusivamente sintético.

El Plan de Seguridad implementa los seis pasos Stanley-Brown como documento ligado a `DischargeEpisode`. Crear o editar produce una versión nueva; los estados se derivan de eventos append-only. La UI incluye edición por pasos, revisión, comparación, historial y vista paciente filtrada por sección. No hay portal de cuidador, PDF, firma automática, scoring ni recurso de crisis definitivo en esta rama.

Cada episodio nuevo referencia una versión exacta de protocolo de check-in. Claves compuestas impiden cruzar versiones y un outcome terminal único excluye respuesta, omisión y vencimiento entre sí. Preguntas, cadencia, zona, ventanas, asignaciones, outcomes, respuestas y eventos de no respuesta conservan historial append-only. El seed incluye ocho temas exclusivamente sintéticos y rotulados como no aprobados. No existe interpretación automática, alertas, comunicaciones reales ni scheduler; DEC-006 mantiene bloqueado el uso clínico de cualquier contenido o frecuencia.

El motor de avisos usa un DSL JSON v1 validado con inputs permitidos explícitos, ventanas temporales y operadores deterministas. Cada evaluación conserva versión, timestamp, snapshot estructurado, hash reproducible y resultado `matched`, `not-matched` o `abstained`; si falta un input requerido se abstiene. `Idempotency-Key` evita duplicar una evaluación o aviso por reintento y rechaza reutilizar la clave con otro payload. Un aviso coincidente conserva evaluación, regla, versión, referencias de origen y explicación visible, pero permanece `open` hasta una revisión humana. Las revisiones son append-only y no crean tareas ni acciones clínicas. El seed incluye cuatro reglas `draft` sintéticas y no aprobadas; DEC-008 mantiene pendiente su validación clínica local.

La cola profesional filtra episodios visibles por estado, fecha, responsable y elementos pendientes. Muestra solo el último check-in sin respuestas, los avisos no cerrados con versión/origen y las tareas del episodio. Una tarea siempre pertenece a un episodio y puede referenciar un aviso del mismo episodio; solo se crea mediante una petición profesional explícita. Asignación, reasignación, intento de contacto, nota breve y resolución generan historia; resolver exige motivo, actor y timestamp. `expectedRevision`, idempotencia e índices únicos evitan dobles procesamientos silenciosos. No hay prioridad ni SLA definitivo, comunicaciones reales, derivación, recomendación, SBAR o cierre automático.

Las rutas protegidas vuelven a comprobar sesión y autorización en servidor. `admin` no hereda acceso clínico y `support` queda denegado ante el recurso clínico simulado de las pruebas.

## Seguridad y límites operativos

- El token de sesión se entrega solo en cookie `HttpOnly`, `SameSite=Strict` y `Secure` en producción; la base almacena su SHA-256. Nunca se usa `localStorage`.
- `DEMO_SESSION_TTL_HOURS` admite de 1 a 12 horas y vale 8 en el ejemplo local. Es un supuesto exclusivo del demo, no una política institucional de sesión.
- Las mutaciones exigen `Origin` de la aplicación. Los headers base bloquean framing, MIME sniffing, geolocalización, cámara y micrófono.
- `pnpm dev` enlaza Next.js exclusivamente a `127.0.0.1`; las rutas demo rechazan `Host` ausente o no loopback y cualquier `X-Forwarded-Host` no loopback. Esta defensa no confía únicamente en `APP_BASE_URL`.
- Los logs técnicos contienen solo código, componente y correlation ID; no registran bodies, mensajes de excepción, secretos ni contenido clínico.
- La auditoría de reglas y avisos registra por separado evaluación y creación de aviso, además de acción, actor, rol, recurso, resultado y correlation ID; no duplica snapshots ni explicaciones clínicas.
- La auditoría de tareas registra creación, asignación/reasignación, contacto, nota y resolución sin copiar resumen, nota, explicación ni motivo. Las métricas de cola son agregadas y técnicas.
- `EXPLAINABLE_TRAFFIC_LIGHT=false` por defecto. La interfaz ordena por estado y texto; DEC-009 bloquea habilitar el semáforo visual sin decisión local.
- `AuditEvent` es append-only mediante triggers PostgreSQL. Login, logout y asignación de rol se auditan en la misma transacción que su mutación.
- La asignación de rol revalida en esa transacción que el actor siga activo con `admin`; el objetivo debe existir, estar activo, ser sintético y no ser una de las seis identidades demo reservadas.
- El rate limit de login es local al proceso y sirve solo como defensa de desarrollo. Un despliegue futuro necesita control distribuido/perimetral, proxy confiable, TLS/HSTS y una política CSP con nonces.
- No existe autenticación productiva. Cookies seguras y CSRF no sustituyen la verificación del proveedor institucional, la gestión central de sesiones, MFA aprobada ni controles perimetrales.
- PostgreSQL de Docker publica únicamente `127.0.0.1:5432`; no debe cambiarse a una interfaz LAN para ejecutar el demo.

Véanse [docs/platform-foundation-security.md](docs/platform-foundation-security.md) y [ADR-0003](docs/adr/0003-demo-identity-vs-institutional-sso.md).
