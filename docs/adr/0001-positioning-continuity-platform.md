# ADR-0001: Posicionamiento como plataforma de continuidad postalta

- **Estado:** Aceptada como restricción de producto y desarrollo
- **Fecha:** 2026-07-15
- **Decisores:** base de gobernanza del repositorio; las decisiones institucionales permanecen sujetas a los stage gates

## Contexto

El seguimiento postalta en salud mental requiere organizar información, autorizaciones, revisiones, tareas e historial. En este ámbito, una interfaz o automatización ambigua puede inducir a tratar una salida técnica como diagnóstico, pronóstico o decisión clínica. El MVP necesita un límite de producto explícito antes de crear la aplicación.

## Decisión

Guardián Alta Segura se posiciona como una **plataforma organizativa y de continuidad postalta con revisión humana**.

La plataforma puede registrar, versionar, presentar y enlazar información. Puede aplicar reglas deterministas, explicables, versionadas y aprobadas localmente para crear avisos que una persona profesional debe revisar. No ejecuta actuaciones clínicas como consecuencia automática de esos avisos.

Quedan fuera del intended use:

- diagnóstico o prescripción;
- predicción de suicidio, crisis, reingreso o deterioro;
- scoring probabilístico o clasificación opaca de riesgo;
- chatbot terapéutico, IA generativa o ML;
- firma, derivación, contacto, tarea clínica o cierre automáticos;
- certificación de la seguridad de un domicilio;
- sustitución del juicio profesional o de recursos oficiales de urgencia.

El SBAR será manual o se basará únicamente en plantillas deterministas que mantengan vacíos los datos ausentes. El semáforo visual permanece desactivado por defecto hasta validación clínica local. El botón de crisis permanece bloqueado si no existe un recurso oficial aprobado localmente y verificado por TI.

## Consecuencias

### Positivas

- El diseño conserva una responsabilidad humana identificable.
- Los avisos pueden explicarse y reproducirse sin afirmar capacidad predictiva.
- Las pruebas pueden verificar límites negativos, además de funciones nominales.
- Producto, documentación y comunicación evitan promesas clínicas o regulatorias no demostradas.

### Costes y límites

- No se optimiza el flujo mediante decisiones autónomas.
- Las reglas, recursos, frecuencias y exportaciones requieren configuración y aprobación local.
- Un dato ausente puede producir abstención o estado pendiente, no una inferencia.
- La utilidad clínica y la seguridad del uso real no quedan demostradas por esta decisión.

## Alternativas descartadas

- **Sistema predictivo de riesgo:** descartado por estar fuera del alcance y requerir evidencia, gobernanza y validación no disponibles.
- **Chatbot terapéutico o generación automática de SBAR:** descartado por riesgo de invención, atribución errónea y sustitución del juicio profesional.
- **Automatización de derivaciones o cierres:** descartada porque elimina la revisión humana obligatoria.

## Criterios de cumplimiento arquitectónico

Una implementación contradice este ADR si genera una puntuación predictiva, interpreta datos como diagnóstico/pronóstico, inventa contenido, oculta el origen de un aviso o inicia una actuación clínica sin decisión humana registrada.

## Relación con requisitos

Este ADR limita especialmente REQ-03, REQ-07, REQ-08, REQ-09, REQ-10 y REQ-11, sin cambiar su numeración ni significado canónicos.
