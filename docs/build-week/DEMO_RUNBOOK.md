# OpenAI Build Week 2026 — demo runbook

> DATOS SINTÉTICOS / NO USO CLÍNICO. Ejecución local exclusivamente en `127.0.0.1`.

## Requisitos

- Node.js 22.14–24, pnpm 11.7, PowerShell 7 y Docker con Compose.
- Puerto 5432 libre en loopback.
- No usar datos, correos, teléfonos, historias o credenciales reales.

## Preparación segura desde un clon

```powershell
git clone https://github.com/Luis195f/guardian-alta-segura.git
Set-Location guardian-alta-segura
git switch buildweek/final-submission
pnpm demo:prepare
pnpm dev
```

`demo:prepare` crea `.env` desde la plantilla solo si falta, rechaza `0.0.0.0`, arranca PostgreSQL publicado en `127.0.0.1`, instala con lockfile, genera Prisma, despliega y comprueba migraciones, ejecuta el seed idempotente y valida trazabilidad. No borra ni reinicializa bases de datos.

Abrir `http://127.0.0.1:3000`. Nunca compartir esta demo por LAN o Internet.

## Dataset preparado

El seed crea identidades `demo-*`, `SYNTH-PATIENT-001` y el episodio `synthetic-demo-episode-buildweek`. Incluye un alta activa, Plan de Seguridad v1 activo, protocolo v1, check-in sintético respondido, Domicilio Seguro v1 pendiente de revisión y un aviso abierto procedente de un fixture técnico. La regla especial de ese aviso está rotulada como sintética y su referencia indica aprobación técnica exclusiva de demo; no es validación clínica. Las cuatro reglas clínicas de ejemplo permanecen `draft` y no aprobadas.

## Recorrido principal

1. Iniciar sesión como `demo-nurse`; verificar que la UI muestra `rol: nurse`.
2. En Alta estructurada, pulsar **Cargar episodios asignados** y abrir `SYNTH-PATIENT-001 — Activo`.
3. Cargar el Plan de Seguridad y mostrar v1/historial; no editar durante el vídeo.
4. Iniciar sesión como `demo-patient`; en Check-ins pulsar **Cargar mis check-ins** para mostrar el resultado sintético existente.
5. Volver a `demo-nurse`; en Avisos pulsar **Cargar avisos**. Mostrar explicación, versión, origen y “Pendiente de revisión”.
6. Pulsar **Registrar revisión humana**. Confirmar que no se creó ninguna tarea automáticamente.
7. En Cola enfermera, pulsar **Cargar cola**. En el episodio, escribir `Seguimiento sintético tras revisión humana`, seleccionar el aviso revisado y `demo-nurse`, y pulsar **Crear tarea**.
8. Registrar **Sin respuesta** o **Contacto alcanzado**, añadir `Nota sintética minimizada`, y resolver con `Cierre organizativo sintético por revisión humana`.
9. Mostrar el timeline de la tarea con actor, timestamp y motivo.
10. En el episodio, cargar Domicilio Seguro; destacar el disclaimer y crear v2 solo si se desea. Generar el preview SBAR y mostrar “Sin valoración clínica adicional registrada”, referencias y “no firmada”.
11. Mostrar el recurso de crisis deshabilitado y el mensaje de protocolo local pendiente.

## Cuidador (momento opcional)

El flujo exige una autorización legal demo vigente, scope del episodio, invitación local y sesión de cuidador coincidente. Usar únicamente si ya se preparó siguiendo la UI. Revocar como `demo-patient` corta nuevas lecturas y conserva el historial. No improvisar scopes para el vídeo.

## Recuperación no destructiva

- Si una prueba e2e dejó sesiones, volver a iniciar sesión con el alias requerido.
- Si el aviso del seed ya fue revisado en esa base, usar una base demo nueva o volver a desplegar en un volumen nuevo creado conscientemente; no ejecutar borrados automáticos.
- `pnpm db:seed` es idempotente respecto a la configuración canónica y falla si detecta deriva histórica.

## Comprobación previa a grabar

```powershell
pnpm traceability:check
pnpm run ci
pnpm test:e2e
pnpm db:migrate:status
```
