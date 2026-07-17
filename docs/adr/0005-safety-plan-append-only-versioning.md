# ADR-0005 — Versionado append-only del Plan de Seguridad

## Estado

Aceptada para el MVP técnico con datos sintéticos. No constituye validación clínica, jurídica ni institucional del contenido.

## Contexto

REQ-03 exige conservar cada edición del Plan de Seguridad Stanley-Brown de seis pasos. Una mutación de texto o estado sobre una versión existente destruiría trazabilidad clínica. El portal de cuidador todavía no existe y los recursos oficiales de crisis de REQ-10 continúan pendientes de aprobación clínica y verificación técnica local.

## Decisión

- `SafetyPlan` es la identidad lógica única de un `DischargeEpisode` y mantiene únicamente revisión de concurrencia, último número y versión activa.
- `SafetyPlanVersion`, sus seis `SafetyPlanSection` y los permisos por audiencia son append-only. Editar crea `N+1` basada en `N`; nunca actualiza `N`.
- El estado se deriva del último `SafetyPlanVersionStateChange`: `DRAFT`, `ACTIVE`, `SUPERSEDED` o `INVALIDATED`. Activar e invalidar añaden eventos; no reescriben la versión.
- La invalidación exige motivo de 3 a 500 caracteres y actor `nurse` o `clinician` asignado.
- La creación y cada cambio de estado reclaman una revisión de `SafetyPlan` mediante actualización condicional. Un editor con una revisión obsoleta recibe conflicto y no escribe contenido ni timeline.
- Cada sección guarda procedencia `PATIENT`, `NURSE` o `CLINICIAN` y permisos separados para paciente y cuidador. La política de acceso es de dominio y no depende de una UI de cuidador.
- El paciente vinculado al episodio solo puede consultar versiones `ACTIVE` o `SUPERSEDED` y únicamente secciones permitidas. El cuidador sigue sin endpoint o portal.
- Los triggers PostgreSQL impiden `UPDATE` y `DELETE` de versiones, secciones, permisos y eventos, y prohíben el hard-delete de la identidad lógica.
- `AuditEvent` registra actor, rol, acción, recurso, resultado y correlación; no copia texto del plan.
- El paso 5 rechaza URI `tel:` y secuencias con apariencia de número telefónico mientras no exista configuración versionada y aprobada de REQ-10.
- Se define `SafetyPlanExporter` para PR 11, sin generar PDF en esta rama.

## Consecuencias

La UI profesional ofrece editor por pasos, revisión final, activación/invalidation, historial y comparación. No hay firma automática, scoring, inferencia de riesgo, recurso de crisis definitivo ni exportación PDF. La visibilidad de cuidador queda preparada pero denegada hasta que existan autorización vigente y portal.
