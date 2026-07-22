# Recorridos por rol

> Todos los recorridos usan identidades y datos sintéticos. Ninguna navegación descrita equivale a validación clínica, jurídica o institucional.

## Enfermería y profesional clínico

**Objetivo:** identificar qué revisar y dejar trazabilidad de una actuación organizativa humana.

1. Seleccionar `demo-nurse` o `demo-clinician` y pulsar **INICIAR DEMO**.
2. En `/dashboard`, revisar episodios activos, avisos pendientes, tareas abiertas y check-ins.
3. Abrir `SYNTH-PATIENT-001` desde la tabla.
4. Consultar **Resumen** y abrir **Avisos**.
5. Revisar el origen, la regla/version y la explicación; pulsar **Revisar**.
6. Confirmar el mensaje de que no se ha creado una actuación automática.
7. Abrir **Seguimiento**, crear una tarea humana opcional y registrar actividad.

El workspace también separa Plan de Seguridad, Check-ins, Domicilio Seguro, SBAR no firmado e Historial. No se muestran los módulos completos simultáneamente.

## Paciente

**Objetivo:** consultar información propia y completar una acción disponible sin controles profesionales.

1. Seleccionar `demo-patient`.
2. En `/my-follow-up`, abrir **Mi Plan**.
3. Consultar la versión activa y el historial permitido.
4. Abrir **Mis Check-ins** y responder solo si la ventana está disponible.
5. Consultar **Personas autorizadas** para ver o modificar el alcance y revocar accesos.

Mensaje persistente: la herramienta no sustituye la atención profesional ni es un canal de urgencias.

## Cuidador

**Objetivo:** acceder exclusivamente al contenido concedido por una autorización vigente.

1. Seleccionar `demo-caregiver`.
2. Sin cookie de acceso limitada, el portal muestra **Sin acceso autorizado** y no consulta contenido clínico.
3. Introducir un token local vigente creado por el paciente y aceptar la invitación.
4. El portal presenta paciente autorizante seudonimizado, alcance/version, secciones, tareas y recursos expresamente compartidos.
5. Si el scope lo permite, enviar una observación para revisión humana; no genera avisos ni actuaciones automáticas.

## Administración

**Objetivo:** gestionar configuración demo versionada sin acceso visual implícito a expedientes.

1. Seleccionar `demo-admin`.
2. En `/admin`, consultar o versionar protocolos sintéticos.
3. Consultar el catálogo de reglas deterministas y su estado.

No aparecen episodios, Plan de Seguridad, check-ins propios, avisos de pacientes ni SBAR.

## Soporte

**Objetivo:** comprobar el estado técnico sin exposición de información asistencial.

1. Seleccionar `demo-support`.
2. En `/support`, comprobar health y el estado sanitizado del servicio.
3. El bloque de incidentes permanece informativo hasta que exista el módulo futuro.

No aparecen pacientes, notas, Plan de Seguridad, check-ins, avisos ni SBAR.

## Cambio de identidad demo

Desde cualquier shell autenticado, **Cambiar usuario demo** revoca la sesión actual mediante `DELETE /api/demo/session` y vuelve a `/`. La siguiente identidad crea una sesión independiente; no existe impersonación ni cambio silencioso de rol.
