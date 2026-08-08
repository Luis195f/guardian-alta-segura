# AGENTS.md — Guardián Alta Segura

## Finalidad del repositorio
Este repositorio contiene un MVP de apoyo organizativo y de continuidad postalta en salud mental. El software organiza, registra, presenta y permite revisar información. No diagnostica, no prescribe, no predice suicidio, no clasifica riesgo mediante modelos opacos y no sustituye el juicio profesional.

## Invariantes de seguridad clínica
1. Mantener siempre revisión humana antes de cualquier actuación clínica.
2. No implementar decisiones, derivaciones, firmas o cierres clínicos automáticos.
3. No convertir avisos explicables en diagnósticos, pronósticos o puntuaciones predictivas.
4. No borrar documentación clínica histórica por revocación de participación, comunicaciones o acceso del cuidador.
5. El Plan de Seguridad debe ser versionado: una edición crea una nueva versión; nunca sobrescribe la anterior.
6. El módulo de Domicilio Seguro es informativo y requiere revisión humana; no certifica que el domicilio sea seguro.
7. El botón de crisis solo usa recursos oficiales aprobados localmente. No inventar números ni destinos.
8. El SBAR es manual o basado en plantillas deterministas. Nunca inventar datos ausentes ni firmarlo automáticamente.
9. El semáforo visual permanece desactivado por defecto mediante feature flag hasta validación clínica local.
10. No introducir IA generativa, ML, scoring probabilístico, chatbot terapéutico, geolocalización, wearables ni integración clínica productiva FHIR en el MVP.
11. Usar exclusivamente datos sintéticos durante desarrollo, pruebas y demostraciones.
12. No registrar PHI/PII, diagnósticos, notas clínicas ni contenido sensible en logs técnicos, errores, trazas o tickets de soporte.

## Arquitectura y calidad
- Stack objetivo: Next.js App Router, TypeScript estricto, PostgreSQL, Prisma, autenticación por abstracción de proveedor institucional, RBAC, auditoría, pruebas unitarias, integración y e2e.
- Mantener separación entre dominio, aplicación, persistencia, presentación e integraciones.
- No acoplar reglas clínicas al código de UI.
- Las reglas y configuraciones locales deben ser versionadas, trazables, validables y desactivables.
- Toda mutación crítica debe producir un AuditEvent inmutable y sin contenido clínico innecesario.
- Aplicar mínimo privilegio y denegación por defecto.
- Soporte técnico no puede acceder a notas clínicas en texto plano.
- Las configuraciones demo de autenticación deben estar marcadas como NO PRODUCTIVAS y no simular SSO/MFA institucional real.
- Las migraciones deben ser reversibles cuando sea técnicamente seguro. No reescribir migraciones ya aplicadas.
- No añadir dependencias de producción sin justificarla en el PR.

## Flujo obligatorio antes de terminar una tarea
1. Inspeccionar el repositorio y leer los documentos aplicables.
2. Explicar brevemente el plan antes de modificar código.
3. Implementar solo el alcance de la rama.
4. Ejecutar, cuando existan:
   - `pnpm format:check`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm traceability:check`
   - `pnpm build`
   - `pnpm test:e2e`
5. Corregir los fallos introducidos por la tarea.
6. Actualizar documentación, matriz de trazabilidad y ADR cuando corresponda.
7. Mostrar:
   - archivos modificados;
   - decisiones y supuestos;
   - pruebas ejecutadas y resultados;
   - riesgos residuales;
   - elementos bloqueados por decisiones locales;
   - siguiente PR recomendado.

## Definition of Done global
Una tarea no está terminada si:
- no existen pruebas para reglas o permisos críticos;
- se ha introducido un bypass de autorización;
- se sobrescribe historial clínico;
- faltan estados de error o vacío;
- se usan datos reales;
- una decisión local pendiente se ha codificado como valor definitivo;
- la documentación afirma validación jurídica, clínica, MDR o institucional inexistente.

## Review guidelines
Tratar como P1:
- exposición de datos sensibles;
- ruta o acción sin autorización;
- borrado o sobrescritura de historia clínica;
- decisión clínica automática;
- regla no explicable o sin versión;
- recurso de crisis no validado;
- uso de datos reales;
- logs o tickets con contenido clínico;
- tests que aparenten validar una condición que no prueban realmente.
