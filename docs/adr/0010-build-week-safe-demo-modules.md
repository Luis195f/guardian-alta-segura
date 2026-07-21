# ADR-0010 — Módulos seguros de cierre Build Week

- Estado: Aceptada para demo técnica sintética
- Fecha: 2026-07-21
- Alcance: REQ-07, REQ-10 y REQ-11
- Validación local: Pendiente (DEC-007, DEC-010, DEC-011 y DEC-012)

## Contexto

La candidatura necesita demostrar continuidad organizativa sin representar como resueltas decisiones clínicas, institucionales o de privacidad. Domicilio Seguro, el recurso de crisis y SBAR estaban documentados pero no ofrecían una experiencia técnica cerrada.

## Decisión

- Domicilio Seguro usa una plantilla sintética versionada y cuatro ítems estructurados. Sus únicos estados son no revisado, información registrada, seguimiento pendiente y no aplicable. Exige reconocer su carácter informativo; no contiene score, estado seguro/inseguro ni certificación. Cada edición crea una fila nueva y los triggers impiden `UPDATE`/`DELETE`.
- Solo `nurse` o `clinician` responsables del episodio sintético pueden leer o crear versiones. El acceso futuro de cuidador requerirá capability y scope explícitos; no se concede por rol genérico.
- El recurso de crisis expone únicamente un estado deshabilitado. No incluye teléfono, URI ni fuente alternativa hasta resolver DEC-010/011.
- SBAR es una vista efímera determinista con perfil `synthetic-minimized-sbar/demo-v1`. Usa únicamente campos estructurados existentes, conserva referencias de procedencia, actor y timestamp, y audita solo metadatos. Assessment usa “Sin valoración clínica adicional registrada”; R refleja solo tareas ya registradas. No firma, envía ni recomienda.
- La impresión del navegador sustituye temporalmente a PDF para evitar una dependencia y un perfil de exportación no aprobados.
- Una migración forward-only normaliza los triggers de integridad de tareas en instalaciones que hubieran aplicado una definición anterior; no se reescribe la migración histórica #8.

## Consecuencias

Los tres módulos son demostrables con datos sintéticos y fallan de forma segura. No constituyen validación clínica, aprobación institucional, exportación productiva ni habilitación del recurso de crisis. La integración del cuidador con Domicilio Seguro y el PDF SBAR permanecen pendientes de decisión local.
