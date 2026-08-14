# ADR-0017 — Frontera documental de comunicaciones futuras

- Estado: `DOCUMENTED_ONLY / IMPLEMENTATION NO_GO`
- Fecha: 2026-08-14
- Alcance: contrato conceptual neutral respecto del proveedor; sin transporte,
  entrega ni datos reales
- Baseline inspeccionado: `92eb7e9a37f2c46ee2209b7a30ad9b9ea45fddef`
- Aprobación clínica, jurídica, institucional o regulatoria: no acreditada

## Contexto y motivo del aplazamiento

El repositorio conserva registros legales sintéticos para razonar de forma
fail-closed sobre permiso y base configurada. También clasifica messaging y
telefonía como integraciones futuras. Esas piezas no constituyen una capacidad
de comunicación: no existe destinatario operativo, dirección de contacto,
plantilla aprobada, transport adapter, endpoint, proveedor, delivery worker,
scheduler, webhook, notificación ni evidencia de entrega.

El modelo actual confirma:

- `CommunicationChannel = SMS | EMAIL | PUSH`; no existe canal de voz;
- `CommunicationPermission` contiene `id`, `subjectUserId`, `state`, `scope`,
  `channel`, `purpose`, `policyVersionId`, `actorUserId`, `recordedAt`,
  `expiresAt`, `origin`, `evidenceType` y `evidenceRef`;
- sus relaciones son `subject`, `actor` y `policyVersion`;
- el permiso está anclado a `subjectUserId` sobre `User` y no contiene
  `recipientKind`;
- `LegalAuthorizationService.authorizeCommunication` evalúa registros
  sintéticos por sujeto, canal y finalidad, junto con política, base específica,
  vigencia y revocación; no ejecuta ni autoriza una entrega real.

La presencia de esos enums, registros y pruebas no demuestra interoperabilidad,
contactabilidad, consentimiento suficiente, recepción ni capacidad operativa.
Se aplaza toda implementación hasta que las autoridades humanas competentes
resuelvan el contrato jurídico, clínico, técnico y operativo descrito aquí.

## Decisión

Se documenta una única frontera conceptual, neutral respecto del proveedor, para
una fase futura. El estado funcional es `DOCUMENTED_ONLY`; `IMPLEMENTATION =
NO_GO`.

Una implementación futura solo podría intentar una comunicación tras una
solicitud humana explícita y autorizada. Justo antes de cada intento tendría que
revalidar de forma fail-closed, y como una unidad coherente:

1. destinatario y clase de destinatario aprobados;
2. canal permitido para ese destinatario;
3. finalidad explícita y contenido permitido para esa finalidad;
4. autoridad del actor y relación vigente con el recurso;
5. autorización o política aplicable, su versión, vigencia y ausencia de
   revocación;
6. base jurídica configurada cuando corresponda;
7. estado operativo del canal y proveedor aprobado;
8. clave de idempotencia/anti-replay y contexto auditable minimizado.

La denegación es el resultado predeterminado ante dato ausente, ambiguo,
caducado, revocado, inconsistente o no aprobado. La existencia de un `User`, rol,
episodio, aviso, outcome, tarea o compromiso nunca implica permiso de contacto.
Una autorización observada antes no puede almacenarse como decisión reutilizable:
debe volver a comprobarse en el instante de intentar la ejecución futura. Una
revocación vigente impide inmediatamente todo nuevo intento dentro de su alcance;
no borra permiso, evento, episodio ni documentación histórica.

Este contrato no autoriza interfaces, schema, migraciones, endpoints, flags,
SDK, credenciales, proveedores, trabajos en background ni ejemplos de contacto.

## Destinatario paciente y destinatario profesional

Son capacidades diferentes y no equivalentes:

| Dimensión | Paciente | Profesional |
| --- | --- | --- |
| Finalidad | Finalidad de contacto con el paciente aprobada y separada por canal | Finalidad profesional/organizativa aprobada; nunca heredada de la finalidad del paciente |
| Autorización | Permiso específico del sujeto y base/policy aplicable, ambos vigentes y revalidados | Identidad profesional, rol/relación con recurso, autoridad operativa y policy institucional vigentes; el permiso del paciente por sí solo no concede esta ruta |
| Contenido permitido | Allowlist mínima aprobada para esa finalidad; sin contenido clínico por defecto | Allowlist mínima distinta, acorde con mínimo privilegio; no copiar notas, respuestas, diagnóstico o SBAR por defecto |
| Auditoría futura | Actor, autorización usada, canal/finalidad, timestamps, estado y código técnico sanitizado | Los mismos mínimos más la referencia opaca a la autoridad/relación profesional utilizada |
| Fallo | Registrar solo resultado técnico conservador y devolver a revisión humana; sin conclusión clínica ni trigger automático | Igual; no reasignar, escalar ni crear trabajo automáticamente |

El modelo actual no puede expresar esta diferencia porque carece de
`recipientKind` y solo ancla `CommunicationPermission` al sujeto. Antes de un
cambio de modelo, responsables jurídicos, clínicos, de privacidad, identidad y
operación deben decidir si las dos rutas requieren agregados, policies y fuentes
de destinatario separados. Este ADR no selecciona la solución ni propone una
migración. Cuidador, representante u otros destinatarios quedan fuera del
contrato hasta una decisión explícita; no se infieren desde roles o autorizaciones
existentes.

## Metadatos mínimos futuros

Como máximo, y solo si las decisiones posteriores los autorizan, un intento
podría conservar:

- referencia sintética opaca;
- canal y finalidad;
- actor;
- referencia a la autorización/policy utilizada;
- timestamps técnicos necesarios;
- estado técnico;
- código técnico sanitizado.

Nunca se conservarán en logs, auditoría técnica, errores, trazas o tickets:

- texto clínico, transcripción o contenido del mensaje;
- teléfono, correo, dirección o identificador directo de contacto;
- diagnóstico, respuesta de check-in, nota, SBAR o contenido del Plan de
  Seguridad;
- credenciales, secretos o tokens del proveedor.

La ubicación, cifrado, retención, acceso, exportación y disposición de incluso
estos metadatos mínimos permanecen pendientes. La referencia opaca no puede ser
reversible por soporte técnico.

## Taxonomía conservadora de resultados técnicos

Una fase futura solo podrá exponer estos resultados neutrales mientras no exista
otra taxonomía aprobada:

- `CHANNEL_UNAVAILABLE`: no fue posible usar el canal; no prueba nada sobre el
  destinatario.
- `DELIVERY_NOT_CONFIRMED`: no existe confirmación técnica suficiente; tampoco
  prueba que no se entregara.
- `NO_RESPONSE`: no consta respuesta por el mecanismo observado; no prueba que
  el mensaje se recibiera o se leyera.

Ningún estado, acuse del proveedor, callback o timeout permite inferir recepción,
lectura, comprensión, conducta, situación clínica, cumplimiento o ausencia de
riesgo. En particular, `NO_RESPONSE` no equivale a deterioro, desinterés,
incumplimiento ni necesidad de intervención. Un fallo no crea `Alert`, `Task`,
`Commitment`, escalado, cierre, derivación, recomendación o actuación clínica.

## Invariante de no automatización

`Alert`, `CheckInOutcome`, `Task` y `Commitment` jamás disparan comunicaciones
automáticamente. Tampoco lo hacen sus cambios de estado, vencimientos,
evaluaciones, ausencia de evidencia, severidad, prioridad administrativa o
replays. Una futura solicitud de comunicación debe ser una decisión humana
explícita, separada y nuevamente autorizada; su fallo vuelve a revisión humana
sin fallback de canal automático.

`EXPLAINABLE_TRAFFIC_LIGHT` permanece `false`. El semáforo, una regla clínica o
una proyección organizativa nunca seleccionan destinatario, canal, contenido o
momento de contacto.

## Threat model documental

Todas las amenazas permanecen abiertas; los controles son requisitos futuros,
no controles implementados ni riesgo residual aceptado.

| Amenaza | Consecuencia potencial | Control futuro requerido | Estado |
| --- | --- | --- | --- |
| Autorización caducada o revocada | Intento fuera de alcance | Revalidación fail-closed inmediatamente antes del intento; revocación prevalente | `PENDING_DECISION / NOT_IMPLEMENTED` |
| Destinatario incorrecto | Exposición o contacto indebido | Fuente autorizada, binding destinatario-clase-finalidad y confirmación humana | `PENDING_DECISION / NOT_IMPLEMENTED` |
| Proveedor o canal indisponible | Omisión o falsa expectativa de continuidad | Resultado conservador, disponibilidad/runbook aprobados y revisión humana | `PENDING_DECISION / NOT_IMPLEMENTED` |
| Replay | Intento repetido | Clave idempotente, fingerprint, ventana anti-replay y auditoría atómica | `NOT_IMPLEMENTED` |
| Duplicación o concurrencia | Múltiples contactos o evidencia contradictoria | Unicidad semántica, serialización y reconciliación humana | `NOT_IMPLEMENTED` |
| Exposición de metadatos | Reidentificación o divulgación | Allowlist, referencias opacas, mínimo privilegio, sanitización y retención aprobada | `PENDING_DECISION / NOT_IMPLEMENTED` |
| Contenido excesivo | Divulgación clínica innecesaria | Plantilla/allowlist versionada por destinatario y finalidad; rechazo por defecto | `PENDING_DECISION / NOT_IMPLEMENTED` |
| Falso positivo de entrega | Decisiones basadas en recepción no demostrada | Taxonomía conservadora; no equiparar provider ack con recepción o lectura | `NOT_IMPLEMENTED` |
| Uso de datos reales | Tratamiento no autorizado | Gate de datos sintéticos y autorización institucional de piloto separada | `PENDING_DECISION / NOT_IMPLEMENTED` |
| Automatización clínica indirecta | Aviso/outcome/tarea/compromiso provoca contacto o escalado | Prohibición de triggers, dependencia unidireccional y pruebas negativas | `NOT_IMPLEMENTED` |

Este análisis se relaciona con HAZ-GAS-004, HAZ-GAS-010, HAZ-GAS-011 y
HAZ-GAS-019. No los cierra, no crea aceptación de controles y no altera
GAP-DCB-023 ni GAP-DCB-024.

## Plan futuro de pruebas — `NOT_IMPLEMENTED`

| Área | Prueba futura mínima | Estado |
| --- | --- | --- |
| Denegación por defecto | Rechazar ausencia o mismatch de destinatario, clase, canal, finalidad, actor, policy, base o proveedor | `NOT_IMPLEMENTED` |
| Revalidación y revocación | Revocar/caducar entre solicitud e intento y demostrar cero llamada al adapter | `NOT_IMPLEMENTED` |
| Paciente/profesional | Probar que ninguna autorización, policy, contenido o destino cruza entre clases | `NOT_IMPLEMENTED` |
| Idempotencia/concurrencia | Replay idéntico sin segundo intento; fingerprint incompatible y carreras rechazados | `NOT_IMPLEMENTED` |
| Fallos | Mapear indisponibilidad, ack insuficiente y ausencia de respuesta sin inferencias | `NOT_IMPLEMENTED` |
| No automatización | Demostrar que crear/cambiar `Alert`, `CheckInOutcome`, `Task` o `Commitment` produce cero intentos | `NOT_IMPLEMENTED` |
| Minimización | Inyectar fixtures sintéticos sensibles y demostrar ausencia en logs, auditoría, errores, trazas y tickets | `NOT_IMPLEMENTED` |
| Recuperación | Reconciliar timeout/retry sin duplicar ni fabricar confirmación de entrega | `NOT_IMPLEMENTED` |
| Seguridad del proveedor | Autenticación, rotación, anti-replay, allowlist de red y respuesta malformada | `NOT_IMPLEMENTED` |

No existen hoy tests de entrega porque no existe una capacidad de entrega. Las
pruebas legales actuales demuestran únicamente evaluación sintética de registros
por canal/finalidad; no se reutilizan como prueba de este plan.

## Decisiones humanas obligatorias antes de implementar

Permanecen pendientes, como mínimo:

1. destinatarios y clases de destinatario autorizados;
2. canales permitidos por destinatario;
3. finalidades permitidas;
4. base jurídica y relación con permiso/objeción/revocación;
5. contenido y plantillas permitidos;
6. fuente de contacto y vinculación de identidad;
7. retención y disposición por clase de metadato;
8. proveedor y contrato, sin preferencia tecnológica en este ADR;
9. seguridad, secretos, autenticación, residencia y subencargados;
10. disponibilidad, fallback y continuidad;
11. auditoría, accesos y evidencia admisible;
12. responsabilidad operativa, horarios y revisión humana;
13. taxonomía y manejo de incidentes;
14. criterios, entorno, rollback y autorización explícita de piloto.

Estas decisiones se distribuyen entre DEC-003, DEC-005, DEC-013, DEC-014,
DEC-015, DEC-016 y DEC-017. Todas siguen `Pendiente`; ninguna se resuelve por
este ADR.

## Capacidades expresamente no implementadas

Permanecen `NO_GO`: telefonía, voz automatizada, email, SMS, push, WhatsApp,
mensajería real, notificaciones, scheduler, worker, cron, webhook, retry queue,
proveedor externo, FHIR operativo, SSO institucional, telemedicina,
videollamada, integración federada, datos/identidades reales, piloto y
producción. Tampoco se autorizan 5C, P12, P16A, P16B o X4.

No se declara entrega, recepción, consentimiento válido, interoperabilidad,
eficacia, cumplimiento RGPD/ePrivacy, conformidad MDR/AI Act, cumplimiento
DCB0129/DCB0160 ni aceptación de riesgo residual.

## Trazabilidad y gates

- Requisitos relacionados: REQ-02 y REQ-06.
- Decisiones pendientes: DEC-003, DEC-005 y DEC-013–DEC-017.
- Riesgos/hazards relacionados: HAZ-GAS-004, HAZ-GAS-010, HAZ-GAS-011 y
  HAZ-GAS-019.
- Claim permitido: solo “existe una frontera documental neutral respecto del
  proveedor para comunicaciones futuras”, clasificado `DOCUMENTED_ONLY`.
- Evidencia ejecutable de entrega: `NOT_APPLICABLE`; no existe implementación.

Gates vinculantes:

- `COMMUNICATION BOUNDARY = DOCUMENTED_ONLY`
- `IMPLEMENTATION = NO_GO`
- `EXTERNAL PROVIDER = NONE`
- `AUTOMATIC TRIGGER = NONE`
- `REAL DELIVERY / DATA / PILOT / PRODUCTION = NO_GO`
- `COMPLIANCE CLAIM = NONE`
- `RESIDUAL RISK ACCEPTANCE = NONE`
