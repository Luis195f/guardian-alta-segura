# Product brief — Guardián Alta Segura

## Estado y alcance

Este documento define la base de producto del MVP. No acredita validación clínica, evaluación jurídica, conformidad regulatoria ni aprobación institucional. El desarrollo, las pruebas y las demostraciones usan exclusivamente datos sintéticos hasta que el gate institucional correspondiente autorice otra cosa.

## Problema

Tras un alta en salud mental, la información necesaria para la continuidad puede quedar repartida entre documentos, comunicaciones y tareas sin una vista común ni una trazabilidad uniforme. Esto dificulta organizar el seguimiento, conocer qué información fue revisada por una persona y conservar el historial de cambios.

## Usuario principal

El usuario principal es el profesional sanitario autorizado que organiza y revisa la continuidad postalta dentro del episodio. Paciente, cuidador autorizado, administración, TI y soporte participan con permisos limitados y finalidades distintas; ninguno recibe acceso por defecto a información que no necesite.

## Población objetivo

Personas dadas de alta de servicios de salud mental que cumplan los criterios que defina el protocolo local. La inclusión en esta población no implica diagnóstico, pronóstico, clasificación de riesgo ni elegibilidad automática para un piloto.

## Evento de inicio

El episodio comienza con un alta estructurada validada por una persona autorizada y vinculada a un identificador seudonimizado, después de completar la verificación de identidad conforme al protocolo local. La participación en piloto, la participación digital, las comunicaciones telemáticas y la base jurídica asistencial se registran por separado.

## Duración configurable del episodio

Cada episodio puede configurarse para **30, 60 o 90 días**. Estas opciones describen la duración de la continuidad postalta, no un calendario de desarrollo. El criterio para seleccionar una duración permanece pendiente de protocolo local; el sistema no la elige automáticamente.

## Intended use

Guardián Alta Segura está destinado a:

- organizar información de continuidad postalta;
- registrar decisiones, revisiones humanas, autorizaciones y revocaciones;
- presentar check-ins y avisos deterministas para revisión profesional;
- conservar versiones e historial sin sobrescritura clínica;
- vincular tareas posteriores a la revisión humana;
- facilitar una redacción SBAR manual y una exportación minimizada según protocolo local;
- mantener separados los incidentes técnicos del contenido clínico.

## No intended use

Guardián Alta Segura no está destinado a:

- diagnosticar, prescribir o recomendar tratamientos;
- predecir suicidio, crisis, reingreso o deterioro;
- producir scores probabilísticos, estratificación opaca o decisiones clínicas automáticas;
- sustituir el juicio profesional, la atención urgente ni los canales asistenciales oficiales;
- certificar que un domicilio es seguro;
- actuar como chatbot terapéutico o usar IA generativa;
- firmar, derivar, cerrar episodios o emitir comunicaciones de forma autónoma;
- afirmar cumplimiento RGPD, conformidad MDR, validación clínica o aprobación hospitalaria;
- conectarse de forma productiva a una HCE o a FHIR durante el MVP.

## Propuesta de valor

Una vista organizativa y trazable de la continuidad postalta que reduce fragmentación operativa, conserva el contexto histórico y hace visible qué dato originó un aviso y qué persona lo revisó, sin automatizar el juicio clínico.

## Decisiones reservadas al profesional

Permanecen siempre bajo revisión y decisión humana:

- validar el alta y la identidad conforme al protocolo;
- seleccionar y cerrar el episodio, incluida su duración;
- redactar, activar, sustituir o invalidar versiones del Plan de Seguridad;
- interpretar respuestas y datos ausentes;
- revisar, descartar o resolver avisos con motivo;
- decidir si procede crear, asignar o cerrar una tarea;
- valorar la información de Domicilio Seguro sin emitir certificación;
- redactar y validar SBAR y su exportación;
- decidir cualquier contacto, actuación, derivación o escalado clínico.

## Decisiones institucionales pendientes

| Ámbito | Elemento pendiente | Efecto hasta resolverlo |
|---|---|---|
| Protocolo local | Proceso de identidad y validación del alta; criterios de inclusión; selección entre 30/60/90 días; cadencia de check-ins; recurso de crisis; continuidad y cierre | La función afectada permanece no configurable o bloqueada de forma segura para uso real. |
| Evaluación jurídica | Bases jurídicas, textos y evidencias; participación en piloto y digital; comunicaciones; autorización y revocación; retención | No se presume una base, un consentimiento ni un periodo de conservación definitivo. |
| Validación clínica | Contenido de Domicilio Seguro; cuestionarios; reglas explicables; uso del semáforo; contenidos clínicos exportables | No se presentan ejemplos técnicos como protocolo aprobado y el semáforo permanece desactivado por defecto. |
| Verificación técnica | Proveedor institucional de identidad; autenticación reforzada; controles de sesión; número de crisis configurado; continuidad técnica | No se simula SSO/MFA institucional ni se habilitan integraciones o recursos no verificados. |

Las decisiones y evidencias se controlan en [decision-register.md](decision-register.md) y los gates en [stage-gates.md](stage-gates.md).
