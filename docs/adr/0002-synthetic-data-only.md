# ADR-0002: Datos exclusivamente sintéticos en desarrollo, pruebas y demostraciones

- **Estado:** Aceptada como restricción de seguridad y desarrollo
- **Fecha:** 2026-07-15
- **Decisores:** base de gobernanza del repositorio; Gerencia del Hospital como Responsable del Tratamiento conserva la autoridad final del gate de Piloto Clínico

## Contexto

El repositorio se encuentra en una fase previa a la aplicación y no dispone de autorización institucional para tratar datos reales. Los escenarios de salud mental pueden contener información especialmente sensible y también filtrarse indirectamente mediante logs, capturas, fixtures, tickets o historiales de control de versiones.

## Decisión

Durante desarrollo, pruebas, demostraciones, CI, sandbox y usabilidad se usarán **exclusivamente datos sintéticos**, inequívocamente ficticios y no derivados de pacientes o profesionales reales.

Esta regla abarca:

- seeds, fixtures, mocks y snapshots;
- documentos, PDFs, capturas y vídeos;
- logs, errores, trazas, métricas y tickets;
- pruebas manuales, automatizadas y de seguridad;
- ejemplos de identidad, episodios, planes, check-ins, cuidadores, SBAR e incidentes.

Los datos sintéticos se etiquetarán como `SINTÉTICO / NO USO CLÍNICO` cuando se presenten en interfaces o artefactos. No se utilizarán teléfonos de crisis operativos como valores demo ni se copiarán datos reales para hacer más realistas los escenarios.

Un futuro GO institucional no autoriza datos reales en entornos de desarrollo, pruebas o demostración. Cualquier tratamiento de datos reales deberá ocurrir únicamente en el entorno y alcance expresamente autorizados por el gate de Piloto Clínico y por las decisiones jurídicas, clínicas, técnicas y operativas aplicables.

## Consecuencias

### Positivas

- Reduce el impacto de filtraciones en herramientas y artefactos de ingeniería.
- Permite versionar fixtures y reproducir pruebas sin incorporar PHI/PII.
- Hace explícita la separación entre evidencia técnica y uso clínico.

### Costes y límites

- Los datos sintéticos no demuestran representatividad, eficacia ni seguridad clínica.
- Algunos patrones reales no se conocerán hasta contar con un protocolo y entorno autorizados.
- La generación sintética requiere revisión para evitar semejanzas accidentales o valores operativos.

## Controles derivados

- Revisión automatizada y humana de fixtures y artefactos antes de incorporarlos al repositorio.
- Prohibición de incluir payloads sensibles en logs, errores, trazas o tickets, incluso si una prueba usa datos sintéticos.
- Dataset reproducible y claramente etiquetado cuando se implemente el sandbox.
- Interrupción y gestión como incidente si se detecta información real en el repositorio o herramientas de desarrollo; no copiar su contenido en el reporte técnico.

## Alternativas descartadas

- **Datos reales seudonimizados en desarrollo:** descartados; la seudonimización no elimina sensibilidad ni concede autorización.
- **Copias de producción anonimizadas sin proceso institucional:** descartadas; no existe evidencia de anonimización ni aprobación aplicable.

## Relación con gates

El uso de cualquier dato real antes del GO expreso del gate de Piloto Clínico produce NO-GO. Los gates de Infraestructura, Módulos funcionales, Sandbox y Usabilidad se evalúan con datos sintéticos.
