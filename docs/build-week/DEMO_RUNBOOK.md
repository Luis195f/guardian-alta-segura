# OpenAI Build Week 2026 — procedimiento único de demo

> **DEMO SINTÉTICA · NO USO CLÍNICO.** Ejecución local exclusiva en
> `127.0.0.1`. Proyecto personal independiente, sin patrocinio, respaldo,
> validación, integración, despliegue ni autorización institucional.

`DEC-016 = Pendiente` y `REAL PILOT = NO_GO`. No existe validación clínica,
jurídica, RGPD, MDR o AI Act.

## Requisitos y límites

- Node.js 22.14–24, pnpm 11.7 y Docker con Compose.
- Puertos `5432` y `3000` libres en loopback para el flujo normal.
- Solo datos, aliases y texto sintéticos. No introducir datos, teléfonos,
  correos, identidades, cuentas o credenciales reales.
- No exponer por LAN, túnel, staging, cloud ni URL pública.
- Node es la única fuente de verdad del tooling. PowerShell, bash y zsh llaman
  los mismos scripts `pnpm`.

## Contrato de comandos

| Comando | Contrato |
| --- | --- |
| `pnpm demo:prepare` | Crea `.env` solo si falta, conserva uno existente byte a byte, inicia PostgreSQL 16 en loopback, instala frozen, genera Prisma, despliega/comprueba 14 migraciones, ejecuta el único seed, valida trazabilidad y ejecuta `verify`. Nunca elimina datos. |
| `pnpm demo:verify` | Falla de forma cerrada si entorno, Compose, PostgreSQL, migraciones, seis identidades, fixtures, flags, badge, health, host efectivo, trazabilidad o fingerprint derivable presentan drift. |
| `pnpm demo:start` | Ejecuta `verify`, inicia la app únicamente en `127.0.0.1`, espera readiness real mediante `GET /api/health` y permanece en foreground propagando señales y exit code. |
| `pnpm demo:reset -- --confirm=RESET_SYNTHETIC_DEMO` | Operación destructiva protegida: exige confirmación exacta, ownership P15, markers sintéticos y destino loopback; muestra alcance, recrea solo el schema `public` de `guardian_demo`, aplica las 14 migraciones, un seed y `verify`. |
| `pnpm demo:clean` | Detiene solo app/PostgreSQL registrados como iniciados por P15. Conserva base y volumen. Es idempotente. |
| `pnpm demo:smoke` | Crea un proyecto Compose PostgreSQL 16 efímero P15, migra base vacía, ejecuta y repite el seed, compara fingerprints, inicia la app, ejecuta el recorrido Playwright y destruye solo sus recursos efímeros. |

### PowerShell

```powershell
pnpm demo:prepare
pnpm demo:verify
pnpm demo:start
pnpm demo:smoke
pnpm demo:reset -- --confirm=RESET_SYNTHETIC_DEMO
pnpm demo:clean
```

### bash

```bash
pnpm demo:prepare
pnpm demo:verify
pnpm demo:start
pnpm demo:smoke
pnpm demo:reset -- --confirm=RESET_SYNTHETIC_DEMO
pnpm demo:clean
```

### zsh

```zsh
pnpm demo:prepare
pnpm demo:verify
pnpm demo:start
pnpm demo:smoke
pnpm demo:reset -- --confirm=RESET_SYNTHETIC_DEMO
pnpm demo:clean
```

Abrir exclusivamente `http://127.0.0.1:3000` después de que `demo:start`
imprima `DEMO_START_READY`.

## Dataset y fingerprint

El único seed es `prisma/seed.mjs`. El manifiesto versionado
`config/synthetic-demo-manifest.json` reserva:

- `demo-admin`, `demo-nurse`, `demo-clinician`, `demo-patient`,
  `demo-caregiver` y `demo-support`, cada uno con exactamente un rol activo;
- `SYNTH-PATIENT-001` y `synthetic-demo-episode-buildweek`;
- Plan de Seguridad v1 activo, protocolo/check-in respondido y Domicilio Seguro
  v1 pendiente de revisión humana;
- cuatro reglas sintéticas `DRAFT`, no aprobadas;
- un fixture técnico separado `synthetic-demo-flow-mechanics`, activado solo
  para persistir el aviso inicial reproducible. Su referencia
  `SYNTHETIC-DEMO-TECHNICAL-ONLY` no es aprobación clínica o institucional;
- políticas institucionales `PENDING`, semáforo apagado, 5B apagado, cero
  compromisos, crisis no accionable y cero comunicaciones.

El fingerprint SHA-256 emitido por `demo:verify` incluye el estado material canónico,
contenido/configuración
de fixtures, relaciones mediante claves sintéticas estables y estado inicial del
aviso. Excluye CUID/UUID técnicos, timestamps, `AuditEvent`, correlation IDs,
sesiones/tokens y artefactos operativos posteriores al seed. El seed falla ante
deriva incompatible de configuración append-only y `verify` falla ante cualquier
deriva del estado material esperado. Dos seeds consecutivos seguidos por
`verify` deben producir el mismo fingerprint.

## Escenarios reproducibles por rol

| Rol | Estado y recorrido permitido | Denegación/límite demostrado |
| --- | --- | --- |
| Patient | Ve solo su episodio, Plan de Seguridad y check-in sintético. | Sin diagnóstico, predicción, recomendación automática ni superficies profesionales. |
| Nurse | Ve cola y aviso; revisa humanamente, crea manualmente una tarea y registra seguimiento trazable. | Revisar no crea tarea o actuación automática. |
| Clinician | Accede solo a episodios bajo responsabilidad y genera preview SBAR minimizado. | Preview no firmado; no cierra episodios automáticamente. |
| Caregiver | El flujo implementado exige autorización, scope, invitación y sesión válidos; la revocación corta nuevas lecturas y conserva historia. | El seed no preautoriza al cuidador y no existe acceso transversal. |
| Admin | Administra únicamente configuración demo versionada. | No hereda acceso clínico ni puede asignarse capacidades clínicas reservadas. |
| Support | Consulta exclusivamente health técnico sanitizado. | No puede leer datos o notas clínicas en texto plano. |

## Separación honesta de capacidades

| Estado | Incluye |
| --- | --- |
| `IMPLEMENTADO` | Demo local, RBAC, Plan, check-in, revisión humana, tarea manual, cuidador revocable, SBAR no firmado y health sanitizado. |
| `SIMULADO` | Identidades, paciente/episodio, contenido de fixtures, aviso técnico y guion de seguimiento. |
| `DOCUMENTADO` | Puertos institucionales, decision packs, trazabilidad y gate de piloto; no son implementación ni aprobación. |
| `FUTURO-NO_AUTORIZADO` | Comunicaciones/proveedores externos, HCE/EHR/FHIR productivo, SSO, crisis accionable, 5C y despliegue real. |

Esta misma matriz se muestra antes del login y en las vistas autenticadas. El
badge persistente también forma parte del preview SBAR imprimible.

## Reset y limpieza

`demo:reset` rechaza confirmaciones genéricas, `DEMO_MODE` distinto de `true`,
flags activados, host/LAN/remoto, base o usuario diferentes, contenedor sin labels
Compose exactas del worktree, identidad de contenedor cambiada, ausencia del
registro runtime P15 o falta de markers sintéticos. No usa `prisma migrate reset`,
no elimina volúmenes y no toca otros schemas, bases, proyectos o worktrees.

`demo:clean` informa por separado el proceso detenido y PostgreSQL conservado.
Solo detiene el contenedor si el flujo P15 registró que lo inició; nunca ejecuta
`down --volumes` sobre la demo normal. El borrado de volumen existe únicamente
dentro del smoke y queda restringido al proyecto efímero aleatorio
`gas-p15-smoke-*` creado por esa ejecución.

## Recuperación ante fallos

- Código `2`: corregir `.env` para que coincida con `.env.example`; no reemplazar
  un `.env` existente automáticamente.
- Código `3`: comprobar Docker/PostgreSQL y ejecutar `pnpm demo:verify`; no borrar
  datos para forzar un PASS.
- Código `4`: liberar exclusivamente el puerto local `3000` y repetir `demo:start`.
- Código `5`: revisar el alcance mostrado. No eludir ownership o confirmación de reset.
- Código `6`: revisar el archivo runtime/identidad del proceso o contenedor; no
  terminar procesos desconocidos.
- Código `7`: el smoke intenta limpiar en `finally`; inspeccionar únicamente el
  proyecto efímero nombrado en el output si la comprobación de orfandad falla.

| Exit code | Significado |
| --- | --- |
| `0` | PASS del contrato solicitado. |
| `1` | Fallo no clasificado o subproceso heredado. |
| `2` | Configuración/boundary local inválido. |
| `3` | PostgreSQL, Compose, migraciones o estado material no verificable. |
| `4` | Start/readiness/terminación de aplicación. |
| `5` | Reset rechazado de forma segura. |
| `6` | Clean rechazado por identidad inconsistente. |
| `7` | Smoke o limpieza efímera fallidos. |
| `64` | Uso de comando no reconocido. |

## Grabación segura

Puede grabarse el badge, alias `demo-*`, IDs `SYNTH-*`, matriz de capacidades,
explicación del aviso, confirmación de revisión humana, tarea/historial sintéticos,
health sanitizado y SBAR sin firma. No mostrar `.env`, `DATABASE_URL`, contraseñas,
cookies, tokens, hashes de sesión, logs internos, datos reales, dominios
institucionales o material que sugiera aprobación/uso clínico.
