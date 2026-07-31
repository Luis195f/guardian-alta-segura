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

## Intended use por módulo

La frontera normativa es
[system-assurance-boundary.md](system-assurance-boundary.md). La separación es
actualmente documental y propuesta; no describe dos despliegues ya aislados.

### Guardián Core

Guardián Core está propuesto para organizar y verificar constancia del circuito
postalta: compromisos explícitos, responsable, plazo, evidencia esperada,
excepciones y revisión humana. Puede registrar, versionar, presentar y enlazar
información y trabajo organizativo. No interpreta el significado clínico de un
dato ni determina que una actuación fue clínicamente correcta.

El baseline aún no implementa el contrato completo de compromiso/plazo/evidencia.
Solo demuestra partes del circuito mediante episodios, responsables, tareas,
revisiones, procedencia y auditoría.

### Clinical Rules

Clinical Rules es el módulo propuesto para cualquier regla que procese datos
individuales de salud mediante umbrales o lógica con significado clínico para
producir una solicitud explicable de revisión profesional. Su finalidad prevista,
cualificación MDR, posible clasificación y evidencia clínica permanecen
pendientes. Que las reglas actuales sean deterministas, explicables, sin IA y con
revisión humana no acredita exclusión regulatoria.

En el baseline demo, Clinical Rules corresponde al catálogo, evaluación y avisos
de reglas. No puede ejecutar tareas, comunicaciones, derivaciones, firmas,
tratamientos o cierres automáticamente.

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

Además, Core no convierte ausencia de evidencia en incumplimiento, no usa una
respuesta del paciente como prueba automática de actuación del equipo y no
hereda severidad, prioridad o ruta desde Clinical Rules.

## Propuesta de valor

Finalidad prevista propuesta, pendiente de implementación y evidencia completa:

> Guardián Alta Segura verifica el circuito asistencial: convierte cada
> compromiso explícito del alta en una obligación con responsable, plazo y
> evidencia, detecta cuándo falta constancia de cumplimiento y lo eleva a
> revisión humana.

«Falta constancia» significa ausencia registral de una evidencia compatible en
las fuentes autorizadas a una fecha de corte. No afirma que la acción no ocurriera
ni que exista incumplimiento. Solo una revisión humana puede distinguir acción del
equipo, respuesta del paciente, excepción válida, evidencia tardía e
incumplimiento confirmado.

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
