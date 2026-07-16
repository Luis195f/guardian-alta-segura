# Registro de decisiones institucionales pendientes

## Uso del registro

Una decisión solo cambia de `Pendiente` cuando existe evidencia versionada y atribuible a la autoridad indicada. El software no convierte una opción provisional en valor definitivo. Las decisiones resueltas deben conservar el historial de versiones, fecha, autoridad, alcance y evidencia; este documento no contiene PHI/PII.

| ID | Ámbito | Decisión pendiente | Requisitos | Autoridad/propietario | Evidencia mínima esperada | Estado | Bloqueo mientras esté pendiente |
|---|---|---|---|---|---|---|---|
| DEC-001 | Protocolo local | Método de verificación de identidad y validación del alta | REQ-01 | Dirección Médica | Protocolo versionado y aprobado | Pendiente | Activación para uso real |
| DEC-002 | Producto/protocolo | Criterio para asignar 30, 60 o 90 días, motivos admisibles y reglas de cierre, incluida la resolución de avisos abiertos | REQ-01 | Dirección Médica | Protocolo de episodio y cierre | Pendiente | Selección automática, valor por defecto clínico y cierre para uso real |
| DEC-003 | Jurídico | Separación, textos, evidencias y base aplicable a piloto, participación digital, comunicaciones y tratamiento asistencial | REQ-02 | Responsable del Tratamiento | Evaluación jurídica y políticas versionadas | Pendiente | Comunicaciones y participación real |
| DEC-004 | Jurídico | Alcance, representación, vigencia y revocación de autorización del cuidador | REQ-05, REQ-06 | Responsable del Tratamiento | Política jurídica y operativa aprobada | Pendiente | Acceso real de cuidadores |
| DEC-005 | Jurídico/privacidad | Retención, archivo, eliminación, exportación y ejercicio de derechos por clase de datos | REQ-01, REQ-02, REQ-06, REQ-11, REQ-13 | Responsable del Tratamiento | Política de conservación y evaluación aplicable | Pendiente | Tratamiento de datos reales y retención definitiva |
| DEC-006 | Protocolo local | Contenido, frecuencia, ventanas y gestión de no respuesta de check-ins | REQ-04 | Dirección Médica | Protocolo versionado | Pendiente | Cadencia clínica real |
| DEC-007 | Validación clínica | Plantilla, disclaimer, acciones y revisión de Domicilio Seguro | REQ-07 | Dirección de Enfermería | Validación clínica local documentada | Pendiente | Uso clínico del módulo |
| DEC-008 | Validación clínica | Reglas, inputs, umbrales deterministas, explicaciones y responsables de avisos | REQ-08 | Dirección Médica | Catálogo versionado, probado y aprobado | Pendiente | Ejecución de reglas en uso real |
| DEC-009 | Validación clínica | Habilitación del semáforo visual | REQ-08 | Dirección Médica | Validación local y decisión de feature flag | Pendiente | El flag permanece desactivado |
| DEC-010 | Protocolo local | Destino oficial del botón de crisis y ámbito de aplicación | REQ-10 | Dirección Médica, autoridad final única | Aprobación clínica del recurso y versión | Pendiente | Marcación real bloqueada |
| DEC-011 | Verificación técnica | Exactitud, formato y funcionamiento del recurso de crisis aprobado | REQ-10 | Dirección TI | Verificación técnica registrada | Pendiente | Marcación real bloqueada |
| DEC-012 | Protocolo/privacidad | Campos permitidos, identificadores mínimos, manejo y destino del PDF SBAR | REQ-11 | Dirección Médica | Perfil de exportación versionado y aprobado | Pendiente | Exportación real bloqueada |
| DEC-013 | Verificación técnica | Proveedor institucional, mapeo de roles, autenticación reforzada, sesiones y acceso de emergencia | REQ-12 | Dirección TI | Diseño y pruebas técnicas institucionales | Pendiente | Autenticación productiva |
| DEC-014 | Operación | Taxonomía, segregación, escalado y gestión de incidentes sin datos clínicos | REQ-13 | Dirección TI | Procedimiento y pruebas de sanitización | Pendiente | Operación productiva de soporte |
| DEC-015 | Protocolo local | Activación, acceso, contenido, restablecimiento, RTO/RPO y retención de contingencia | REQ-14 | Dirección de Enfermería | Plan local de continuidad aprobado y probado | Pendiente | Contingencia desactivada |
| DEC-016 | Gobierno institucional | Alcance, población, entorno, periodo, formación, soporte, rollback y continuidad de negocio del piloto | REQ-01 a REQ-14 | Gerencia del Hospital como Responsable del Tratamiento | Expediente de gate de Piloto Clínico completo | Pendiente | NO-GO para pacientes y datos reales |

## Estados permitidos

- `Pendiente`: falta una decisión o evidencia suficiente.
- `Propuesta`: existe una opción documentada, todavía no aprobada.
- `Aprobada`: la autoridad competente aprobó una versión y alcance concretos.
- `Retirada`: dejó de aplicar; se conserva el historial y se bloquea su uso futuro.
- `Sustituida`: existe una versión posterior; la anterior no se sobrescribe.

No se usa `Aprobada` para inferir cumplimiento RGPD, conformidad MDR, validación clínica global ni aprobación hospitalaria más allá del alcance explícito de la evidencia.

## Decisiones técnicas provisionales de feat/03

- El seed registra una política `synthetic-demo-identity-verification/demo-v1` y un paciente inequívocamente sintético. Su estado `APPROVED` solo habilita pruebas locales; no resuelve DEC-001 ni representa protocolo institucional.
- La duración debe elegirse explícitamente entre 30, 60 y 90. No se asigna por diagnóstico, eficacia o riesgo y no existe valor clínico automático.
- El cierre exige actor y motivo. Mientras no exista el módulo de avisos, `AlertModuleUnavailableClosurePolicy` deniega el cierre; una implementación futura deberá consultar avisos abiertos de forma consistente con la transacción.
- Episodios, pacientes, políticas de identidad y transiciones no se borran físicamente. La conservación definitiva continúa bloqueada por DEC-005.
- `nurse` y `clinician` son roles técnicos provisionales; su correspondencia institucional continúa bloqueada por DEC-013.
