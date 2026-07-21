# TÍTULO DEL PROYECTO

Guardián Alta Segura

# TAGLINE

Continuidad postalta trazable: los avisos deterministas terminan en revisión humana, no en decisiones clínicas autónomas.

# QUÉ HACE

Guardián Alta Segura es un MVP técnico prepiloto, solo con datos sintéticos, que organiza un episodio postalta mediante Plan de Seguridad versionado, check-ins configurables, avisos deterministas explicables, revisión humana y tareas de seguimiento creadas manualmente. El profesional ve por qué existe un aviso, registra su revisión y decide si hace falta una tarea. Paciente y cuidador explícitamente autorizado reciben vistas limitadas por rol y scope.

# EL PROBLEMA

La continuidad postalta puede fragmentarse entre documentos, respuestas, revisiones y colas de seguimiento. El objetivo no es crear un clínico autónomo, sino una cadena organizativa visible y responsable que conserve contexto y procedencia.

# LA SOLUCIÓN

La secuencia es explícita: respuesta → regla determinista → aviso explicable → revisión profesional → tarea humana opcional → seguimiento trazable. Si faltan inputs, el motor se abstiene. Revisar nunca crea tareas automáticamente y resolver una tarea no cierra el episodio ni decide por el profesional.

# CÓMO LO CONSTRUIMOS

Next.js App Router, TypeScript estricto, PostgreSQL y Prisma. La lógica vive en dominio/aplicación; persistencia, HTTP y UI son adaptadores. Versiones y eventos críticos son append-only. Vitest cubre dominio e integración, Playwright los flujos e2e y GitHub Actions la verificación reproducible.

# QUÉ CONSTRUIMOS DURANTE OPENAI BUILD WEEK

Según las fechas inmutables del historial Git: avisos explicables deterministas, revisión humana, cola enfermera, tareas humanas trazables y acceso granular/revocable del cuidador. La rama de cierre añade Domicilio Seguro informativo/versionado, preview SBAR determinista/minimizado, recurso de crisis fail-closed, seed coherente, preparación reproducible y documentación de candidatura. La gobernanza, fundación, alta, Plan y check-ins anteriores se declaran baseline. Luis debe confirmar las fechas de elegibilidad del evento.

# CÓMO SE UTILIZÓ CODEX

Codex inspeccionó historial y código, implementó cambios acotados entre capas, escribió pruebas, verificó trazabilidad, revisó claims y secretos, diagnosticó fallos y preparó el release. Aceleró la coherencia del repositorio; las decisiones de producto y seguridad siguieron siendo humanas.

# CONTRIBUCIÓN DE GPT-5.6

GPT-5.6 apoyó análisis, revisión de arquitectura, refinamiento de requisitos, seguridad por diseño y planificación de release cuando existe evidencia en los artefactos. No realizó validación clínica ni generó consejo médico.

# SAFETY-BY-DESIGN

- Solo datos sintéticos; no uso clínico.
- Human-in-the-loop antes de cualquier acción posterior.
- Sin diagnóstico, predicción de suicidio, score probabilístico o actuación autónoma.
- Reglas deterministas, versionadas, explicables y abstencionistas.
- Historia append-only, RBAC fail-closed y demo solo en loopback.
- Semáforo apagado por defecto.
- Crisis deshabilitada hasta aprobación local y verificación TI.
- SBAR sin invención, recomendación o firma automática.

# ARQUITECTURA TÉCNICA

Separación `domain/application/infrastructure/presentation/app`; migraciones Prisma con constraints y triggers; cookie HttpOnly; autorización server-side; errores y auditoría técnica sin copiar contenido clínico.

# RETOS

Construir una demo fuerte sin fingir un producto clínicamente terminado: mantener decisiones institucionales como bloqueadores, distinguir activación técnica de aprobación clínica, no ampliar scopes de cuidador y generar SBAR sin inventar assessment o recomendación.

# LOGROS

Flujo humano end-to-end demostrable, avisos explicables, tareas manuales trazables, revocación inmediata de cuidador, versionado append-only, demo local segura y pruebas de garantías negativas.

# APRENDIZAJES

La seguridad no es un disclaimer: se materializa en modelos, estados, límites de autorización, constraints, feature flags, pruebas negativas y claims prudentes.

# PRÓXIMOS PASOS

Validación clínica/jurídica local, identidad institucional, destino de crisis aprobado, perfil SBAR, threat model y pruebas de usabilidad sintéticas. El uso con pacientes reales permanece NO-GO.

# IMPACTO POTENCIAL

Si se valida e integra responsablemente, el enfoque podría ayudar a organizar la continuidad y hacer más visible la responsabilidad del seguimiento. No se afirma eficacia, prevención de suicidio ni reducción de reingresos.

# LIMITACIONES ACTUALES

MVP técnico prepiloto; datos sintéticos; demo local; sin autenticación productiva, comunicaciones, integración hospitalaria, contenido clínico validado, destino real de crisis, PDF institucional, contingencia o aprobación regulatoria.
