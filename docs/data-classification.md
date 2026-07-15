# Clasificación de datos y reglas de manejo

## Alcance

Esta clasificación guía el diseño y las revisiones; no declara cumplimiento legal ni sustituye la evaluación institucional. Los periodos de retención, ubicaciones, cifrado, copias, encargados y procedimientos de ejercicio de derechos requieren decisión jurídica y técnica local. Hasta el GO institucional solo se usan datos sintéticos.

| Clase | Ejemplos previstos | Sensibilidad y acceso | Registro técnico permitido | Regla de manejo |
|---|---|---|---|---|
| Dato clínico | Plan de Seguridad, respuestas, revisión, SBAR, observaciones, información de Domicilio Seguro | Máxima restricción; solo rol asistencial o sujeto autorizado y únicamente por necesidad | Metadatos técnicos mínimos, nunca texto clínico, diagnóstico ni respuesta | Minimización, autorización server-side, historial versionado o append-only y denegación por defecto. Support no accede al texto. |
| Administrativo | ID seudonimizado, estado y duración del episodio, responsables, tareas sin detalle clínico | Restringido según función y episodio | Identificadores técnicos seudónimos y estado cuando sean imprescindibles | Separar de contenido clínico y evitar identificadores directos salvo decisión institucional justificada. |
| Autenticación | Identidad de cuenta, rol, sesión, tokens y metadatos del proveedor | Solo componentes de identidad y administración autorizada; secretos nunca visibles al cliente o soporte | Resultado, timestamp, correlation ID y código sanitizado; nunca token, secreto o credencial | Proveedor institucional pendiente, mínimo privilegio, sesiones revocables y secretos fuera de logs. |
| Auditoría | Actor técnico, acción, recurso/ID técnico, timestamp, resultado, versión y correlation ID | Lectura limitada a funciones de auditoría autorizadas | La propia clase constituye registro, sin copiar contenido clínico | Inmutable, suficiente para atribución y trazabilidad, minimizada y separada del texto clínico. |
| Soporte técnico | Código sanitizado, componente, entorno, severidad técnica, timestamp y correlation ID | Support y TI conforme a función; sin acceso implícito a datos clínicos | Solo los campos técnicos definidos | Tickets segregados de la base de salud; prohibidos diagnósticos, notas, respuestas, payloads e identificadores directos. |
| Sintético | Personas, episodios, respuestas y escenarios inequívocamente ficticios | Uso en desarrollo, pruebas, demostración, sandbox y usabilidad | Permitido si no reproduce ni deriva de información real | Generación reproducible, etiqueta visible «SINTÉTICO / NO USO CLÍNICO» y prohibición de copiar datos reales. |

## Reglas transversales

- No registrar cuerpos de petición, exportaciones, notas o respuestas completas en logs, trazas, métricas o tickets.
- No trasladar datos entre clases para eludir controles; la clasificación más restrictiva prevalece cuando se combinan datos.
- Seudonimizar no convierte un dato clínico en dato anónimo ni autoriza un uso nuevo.
- Revocar participación, comunicaciones o acceso no autoriza el hard-delete de historia clínica previa.
- Toda exportación se trata con la clasificación de su contenido y usa un perfil minimizado, versionado y aprobado localmente.
- Las métricas técnicas deben evitar cardinalidades o combinaciones que permitan reidentificación.
- Los ejemplos de documentos, capturas, incidencias y pruebas deben ser sintéticos.

## Decisiones pendientes antes de datos reales

- inventario y responsable de cada tratamiento;
- base jurídica y evaluación de privacidad aplicable;
- política de retención, archivo y eliminación por clase;
- ubicaciones, transferencias, proveedores y contratos;
- cifrado, copias, recuperación y acceso de emergencia;
- procedimiento de incidentes y notificación;
- reglas de exportación y minimización;
- criterios de anonimización o generación sintética aceptables.
