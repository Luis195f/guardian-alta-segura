# OpenAI Build Week 2026 — demo runbook

> DATOS SINTÉTICOS / NO USO CLÍNICO. Ejecución local exclusivamente en `127.0.0.1`.

## Requisitos

- Node.js 22.14–24, pnpm 11.7 y Docker con Compose.
- Puerto 5432 libre en loopback.
- No usar datos, correos, teléfonos, historias o credenciales reales.

## Preparación segura desde un clon

Los tres entornos usan los mismos scripts `pnpm`; no existe una implementación específica por
plataforma.

### PowerShell

```powershell
git clone https://github.com/Luis195f/guardian-alta-segura.git
Set-Location guardian-alta-segura
git switch main
pnpm demo:prepare
pnpm dev
```

### bash

```bash
git clone https://github.com/Luis195f/guardian-alta-segura.git
cd guardian-alta-segura
git switch main
pnpm demo:prepare
pnpm dev
```

### zsh

```zsh
git clone https://github.com/Luis195f/guardian-alta-segura.git
cd guardian-alta-segura
git switch main
pnpm demo:prepare
pnpm dev
```

`demo:prepare` crea `.env` desde la plantilla solo si falta, rechaza `0.0.0.0`, arranca PostgreSQL publicado en `127.0.0.1`, instala con lockfile, genera Prisma, despliega y comprueba migraciones, ejecuta el seed idempotente y valida trazabilidad. No borra ni reinicializa bases de datos.

Abrir `http://127.0.0.1:3000`. Nunca compartir esta demo por LAN o Internet.

## Dataset preparado

El seed crea identidades `demo-*`, `SYNTH-PATIENT-001` y el episodio `synthetic-demo-episode-buildweek`. Incluye un alta activa, Plan de Seguridad v1 activo, protocolo v1, check-in sintético respondido, Domicilio Seguro v1 pendiente de revisión y un aviso abierto procedente de un fixture técnico. La regla especial de ese aviso está rotulada como sintética y su referencia indica aprobación técnica exclusiva de demo; no es validación clínica. Las cuatro reglas clínicas de ejemplo permanecen `draft` y no aprobadas.

## Recorrido principal

1. En la landing, explicar el circuito visual Alta → Plan de Seguridad → Check-in → Aviso → Revisión humana → Tarea → Seguimiento.
2. Seleccionar `demo-nurse` y pulsar **INICIAR DEMO**. Verificar el badge persistente, el rol y el alias sintético.
3. En el dashboard, mostrar episodios activos, avisos pendientes, tareas abiertas y check-ins; son métricas organizativas, no clínicas.
4. Abrir `SYNTH-PATIENT-001` y recorrer **Resumen** y **Plan de Seguridad**; mostrar v1/historial sin editar durante el vídeo.
5. Usar **Cambiar usuario demo**, seleccionar `demo-patient` y abrir **Mis Check-ins** para mostrar el resultado sintético existente. Destacar que no aparecen controles profesionales.
6. Volver a `demo-nurse`, abrir el episodio y seleccionar **Avisos**. Mostrar estado, fecha, origen, regla/version y explicación.
7. Pulsar **Revisar**. Confirmar el mensaje “Revisar el aviso no ha creado ninguna actuación automática”.
8. Abrir **Seguimiento**. Escribir `Seguimiento sintético tras revisión humana`, seleccionar el aviso revisado y `demo-nurse`, y pulsar **Crear tarea**.
9. Registrar **Sin respuesta** o **Contacto alcanzado**, añadir `Nota sintética minimizada`, y resolver con `Cierre organizativo sintético por revisión humana`.
10. Mostrar el historial de la tarea con actor, timestamp y motivo.
11. En las pestañas del episodio, abrir **Domicilio Seguro**; destacar el disclaimer y crear v2 solo si se desea. Abrir **SBAR**, generar el preview y mostrar “Sin valoración clínica adicional registrada”, referencias y “no firmada”.

## Cuidador (momento opcional)

El flujo exige una autorización legal demo vigente, scope del episodio, invitación local y sesión de cuidador coincidente. Usar únicamente si ya se preparó siguiendo la UI. Revocar como `demo-patient` corta nuevas lecturas y conserva el historial. No improvisar scopes para el vídeo.

## Recuperación no destructiva

- Si una prueba e2e dejó sesiones, volver a iniciar sesión con el alias requerido.
- Si el aviso del seed ya fue revisado en esa base, usar una base demo nueva o volver a desplegar en un volumen nuevo creado conscientemente; no ejecutar borrados automáticos.
- `pnpm db:seed` es idempotente respecto a la configuración canónica y falla si detecta deriva histórica.

## Comprobación previa a grabar

Estos mismos comandos son válidos en PowerShell, bash y zsh:

```text
pnpm traceability:check
pnpm run ci
pnpm test:e2e
pnpm db:migrate:status
```
