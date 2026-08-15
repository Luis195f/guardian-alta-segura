# ADR-0018 — Frontera FHIR futura, documental y de solo lectura

- Estado: `DOCUMENTED_ONLY / PENDING_DECISION / NOT_IMPLEMENTED`
- Fecha: 2026-08-15
- Alcance: posible importación futura desde una HCE mediante capa
  anticorrupción; exclusivamente lectura y perfiles institucionales todavía no
  seleccionados
- Fuera de alcance: runtime FHIR, integración institucional, datos reales,
  writeback, automatización y claims de interoperabilidad o conformidad
- Decisión institucional agrupadora: DEC-018 (`Pendiente`)

## Contexto y evidencia actual

El MVP no contiene recursos FHIR en runtime, mapper, cliente, endpoint, servidor,
SDK, OAuth, SMART on FHIR, CDS Hooks, subscriptions, Bulk Data, proveedor ni
credenciales. FHIR no forma parte del dominio ni del schema Prisma. La presencia
del término FHIR, de nombres de recursos candidatos o de este ADR no acredita
interoperabilidad, compatibilidad ni conformidad.

Las fuentes canónicas previas ya establecen que:

- [ADR-0011](0011-canonical-signal-provenance-boundary.md) gobierna la
  procedencia interna minimizada y no acepta IDs declarados como procedencia
  verificada;
- [ownership boundaries](../architecture/gas2-ownership-boundaries.md) clasifica
  una HCE como `INTEGRATE` y un servidor FHIR completo como `DO-NOT-BUILD` sin
  requisito;
- [target architecture](../architecture/gas2-target-architecture.md) sitúa una
  futura capa anticorrupción entre perfiles externos y el dominio;
- [system assurance boundary](../system-assurance-boundary.md) mantiene HCE/FHIR
  como `DEFERRED` y prohíbe automatismos clínicos;
- `GAS2-R-015` mantiene la integración externa como riesgo `DEFERRED`, y
  `HAZ-GAS-001/003/005/010/011/012/014/015/017` permanecen abiertos y sin
  aceptación residual.

Este ADR completa únicamente el contrato documental que faltaba. No sustituye
esas fuentes, no crea una segunda arquitectura, matriz de trazabilidad, evidence
index, claims register ni hazard log.

## Decisión

Si una decisión institucional futura exige consultar información de una HCE, el
único punto de partida autorizado por esta frontera será una capa anticorrupción
de importación de solo lectura:

`HCE externa → adapter del perfil aprobado → validación y cuarentena → modelo
externo minimizado de solo lectura → reconciliación y revisión humana`.

La flecha no admite sentido inverso. Los datos importados no pueden crear,
actualizar, cerrar, firmar, enviar, activar o resolver registros de Guardián. No
pueden iniciar avisos, tareas, contactos, derivaciones, comunicaciones,
tratamientos o decisiones clínicas. El dominio no importa tipos FHIR ni usa un
recurso externo como fuente interna verificada sin un contrato y una revisión
humana posteriores.

Esta dirección permanece `NOT_IMPLEMENTED`. Cualquier cambio a runtime, incluso
read-only, requiere una fase separada con revisión humana de arquitectura,
seguridad, privacidad, interoperabilidad, clinical safety y operación.

## Inventario interno para evaluar intercambio futuro

“Necesidad” describe la evidencia disponible, no una autorización. La única
dirección conceptualmente permitida en P12 es entrada de solo lectura; `NONE`
significa que ni siquiera esa necesidad está demostrada.

| Entidad o concepto interno | Propietario | Finalidad interna | Sensibilidad | Fuente de verdad actual | Necesidad real de intercambio | Dirección permitida | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Identidad seudonimizada de paciente | Identidad y episodio | Vincular el episodio sintético a un sujeto técnico sin identidad civil | Alta; identificador de salud seudonimizado | `Patient` y política de verificación asociada | Sujeto y reglas de matching institucional no definidos | Entrada read-only, después de matching humano; nunca sustituir automáticamente el vínculo interno | `PENDING_DECISION` |
| Identidad y relación de cuidador | Legal/caregiver access | Representar acceso delegado, vigencia y scopes por episodio | Alta; relación personal y autorización | `User`, `CaregiverProfile`, `CaregiverAuthorization`, scopes y revocaciones | No se ha demostrado que la HCE sea autoridad de esta relación | `NONE` hasta resolver representación, autoridad y finalidad | `NOT_EVIDENCED` |
| `DischargeEpisode` | Episode governance | Organizar alta, responsables, protocolo, estado e historia | Alta; contexto asistencial | `DischargeEpisode` y `EpisodeTransition` | Posible contexto de consulta, sin contrato ni perfil | Entrada read-only como contexto externo; no activar/cerrar ni cambiar responsables | `PENDING_DECISION` |
| Safety Plan versionado | Safety Plan | Conservar seis secciones y versiones sin sobrescritura | Muy alta; contenido clínico sensible | `SafetyPlan`, `SafetyPlanVersion`, secciones y cambios de estado | Intercambio no requerido ni aprobado | Entrada read-only solo como documento externo separado; nunca sobrescribir versiones internas | `NOT_EVIDENCED` |
| SBAR determinista sin firma | SBAR | Producir un preview efímero a partir de fuentes internas | Muy alta; síntesis clínica | No se persiste como documento; las fuentes subyacentes conservan autoridad | No existe perfil, destino ni lifecycle aprobado | Entrada read-only solo como documento externo separado; sin firma, envío o fusión automática | `NOT_EVIDENCED` |
| Definición de check-in | Check-in | Versionar preguntas, opciones, ventana y programación | Alta; protocolo y contenido clínico | `CheckInProtocolVersion`, preguntas y configuración | No se ha demostrado equivalencia con cuestionarios externos | Entrada read-only para comparación humana; nunca activar protocolo | `PENDING_DECISION` |
| Respuesta y outcome de check-in | Check-in | Conservar respuesta, omisión o expiración y autoría | Muy alta; respuesta individual de salud | `CheckInOutcome`, `CheckInResponse`, `CheckInAnswer`, `NonResponseEvent` | No existe finalidad de importación aprobada | Entrada read-only separada; no inferir riesgo, cumplimiento ni no respuesta local | `PENDING_DECISION` |
| Observación de cuidador | Caregiver access / Clinical Rules | Registrar texto aportado por cuidador autorizado | Muy alta; texto libre de salud y relación | `CaregiverObservation` y relaciones de autorización | No hay semántica estructurada ni autoridad externa demostrada | `NONE` salvo perfil, terminología, finalidad y minimización aprobados | `NOT_EVIDENCED` |
| Evaluación/aviso y procedencia interna | Clinical Rules / shared safety interface | Explicar una evaluación determinista y su lineage interno | Muy alta; evidencia clínica derivada | `RuleEvaluation`, `Alert` y `CanonicalProvenanceLineageV1` | No existe necesidad de importarlos desde HCE | `NONE`; una fuente externa no se convierte en lineage interno verificado | `NOT_APPLICABLE` |
| `Task` y su historia | Workqueue/accountability | Registrar trabajo humano, asignación y resolución | Alta; workflow asistencial | `Task` y `TaskEvent` | No hay autoridad ni reconciliación intersistema aprobadas | Entrada read-only solo para comparación; nunca crear/resolver/reasignar tareas | `PENDING_DECISION` |
| `AuditEvent` | Audit/evidence | Conservar metadatos técnicos minimizados de mutaciones | Alta; metadatos de actividad | `AuditEvent` append-only | Una auditoría FHIR externa no sustituye el audit interno | Entrada read-only separada si existe finalidad; sin copiar payload clínico | `PENDING_DECISION` |
| Commitment | Commitment sandbox | Versionar un compromiso humano explícito, responsable y plazo | Alta; obligación organizativa vinculada a episodio | `CommitmentDefinition`, `EpisodeCommitment`, versiones y eventos | No hay equivalencia semántica aprobada | Entrada read-only solo como candidato para revisión; nunca activar/evaluar | `PENDING_DECISION` |

## Matriz de recursos candidatos, no mappings

Cada fila es una hipótesis de análisis. Ninguna correspondencia está aprobada y
ningún recurso FHIR se persiste o expone.

| Concepto interno | Candidato FHIR | Alternativas e incertidumbre | Decisión pendiente |
| --- | --- | --- | --- |
| Identidad seudonimizada de paciente o cuidador | `Patient` o `RelatedPerson` | `Patient` podría describir al sujeto asistencial; `RelatedPerson` podría describir una relación autorizada. No están decididos identificadores, matching, representación, lifecycle ni autoridad. | Autoridad de identidad, subject linking, reglas de matching, identificadores, namespaces y perfil |
| `DischargeEpisode` | `Encounter` o `EpisodeOfCare` | El episodio interno mezcla alta, seguimiento y gobernanza; no se ha demostrado equivalencia de lifecycle, periodo, participantes o status con ninguno de los candidatos. | Granularidad, autoridad de estados, relación alta/seguimiento y reconciliación |
| Safety Plan | `CarePlan`, `Composition` o `DocumentReference` | Puede ser plan estructurado, composición clínica o referencia documental. Deben preservarse versiones y no se puede inferir que sus seis secciones coincidan con un perfil externo. | Representación documental/estructurada, versionado, autoría, custodia y perfil |
| SBAR | `Composition` o `DocumentReference`; `CarePlan` solo si una autoridad justificase contenido estructurado | El SBAR actual es preview efímero, determinista y sin firma; un documento externo puede tener autoría, firma y custodia distintas. No debe fusionarse con el preview. | Tipo documental, firma, custodia, lifecycle, minimización y autoridad semántica |
| Definición de check-in | `Questionnaire` | La versión, programación y reglas locales no quedan necesariamente representadas por el cuestionario; no se conocen extensiones ni terminología. | Perfil, versionado, schedule, ownership y equivalencia de preguntas/opciones |
| Respuesta de check-in | `QuestionnaireResponse` | Una respuesta externa no prueba una asignación local, ventana, identidad del respondiente, review ni outcome de no respuesta. | Linking, autoría, timestamps, completitud, reconciliación y finalidad |
| Dato clínico atómico | `Observation`, únicamente como candidato condicionado | No toda respuesta, texto de cuidador, ausencia o resultado de regla es una `Observation`. Solo cabría tras decidir semántica, código, unidad, método, sujeto, tiempo, estado y perfil. | Caso de uso exacto, terminología, UCUM u otra política de unidades, interpretación y perfil |
| `Task` | `Task` | Igualdad de nombre no implica equivalencia de estados, owner, requester, intent, restricciones o resolución. La doble autoridad puede crear trabajo duplicado. | Sistema de autoridad, lifecycle, deduplicación, ownership y reconciliación |
| `AuditEvent` | `AuditEvent` | El audit interno es técnico y minimizado; un recurso externo puede cubrir otra frontera y no prueba la mutación interna. No debe importar contenido clínico a logs. | Finalidad, campos permitidos, identidad de actor, retención y correlación |
| Commitment | `Task`, `PlanDefinition` o extensión futura | Un compromiso explícito no es automáticamente una tarea ejecutable ni una definición clínica. Una extensión propia no se diseña sin perfiles seleccionados. | Autoridad semántica, instancia frente a definición, plazo/evidencia y necesidad real de extensión |

## DEC-018 — decisiones que permanecen humanas y pendientes

No se selecciona ninguna opción en este ADR:

1. versión base FHIR: R4, R4B o R5;
2. perfiles nacionales, regionales o institucionales aplicables;
3. terminologías y políticas ante códigos desconocidos;
4. identificadores, matching y manejo de identidad ambigua;
5. namespaces, OID u otros sistemas de identificación;
6. representación y custodia de provenance;
7. consentimiento, finalidad y base jurídica por dato y operación;
8. autenticación, autorización, scopes, secretos, red y trust anchors;
9. minimización, retención, archivo, disposición y derechos;
10. autoridad semántica para cada dato y conflicto;
11. reconciliación, corrección y coexistencia con fuentes internas;
12. estrategia de errores, cuarentena, reintento, replay e indisponibilidad;
13. responsabilidad operativa, soporte, monitorización, continuidad y salida;
14. perfiles de validación, criterios de aceptación y autoridad aprobadora;
15. intended purpose, población, usuarios y workflow institucional exactos.

DEC-018 solo puede avanzar con evidencia versionada de las autoridades
competentes. Las dependencias DEC-003/005/013/014/015/016 continúan pendientes.

## Contrato conceptual de importación de solo lectura

Los nombres de estado siguientes son vocabulario documental, no enums, API ni
schema ejecutable.

### Validación

Antes de mostrar un dato, el boundary futuro comprobaría autenticidad de la
fuente, autorización y finalidad, versión/perfil declarado, forma, cardinalidad,
extensiones, códigos, unidades, identificadores, tiempos, integridad,
provenance, minimización y límites. Un recurso válido sintácticamente no se
considera semánticamente equivalente ni clínicamente correcto.

### Abstención

Ante identidad ambigua, perfil o versión no soportados, código/unidad
desconocidos, provenance insuficiente, exceso de datos, conflicto no resuelto o
falta de autorización, Guardián se abstendría de incorporar o usar el dato. La
abstención nunca se interpreta como ausencia, normalidad o bajo riesgo.

### Cuarentena

Un input potencialmente recuperable pero no confiable permanecería aislado del
dominio y de cualquier decisión. Solo metadatos mínimos y sanitizados podrían ser
visibles a un rol autorizado. La liberación requeriría revisión humana y dejaría
evidencia sin copiar payload clínico a logs.

### Reconciliación

La reconciliación compararía la referencia externa con la fuente interna sin
sobrescribir historia. Mostraría fuente, tiempo, versión, divergencia y autoridad
declarada. Una persona autorizada decidiría si conservar la coexistencia,
rechazar, solicitar corrección en el sistema de origen o crear un nuevo registro
interno mediante un workflow futuro separado.

### Deduplicación y replay

La identidad técnica del origen, versión de contrato, identificador lógico,
versión del recurso y fingerprint serían candidatos para detectar repetición.
No se define una clave hasta conocer el perfil. Un replay idéntico no debe crear
efectos; una colisión o versión divergente debe ir a reconciliación, no elegir el
registro “más reciente” automáticamente.

### Error e indisponibilidad

Error de validación, autorización o semántica se distingue de caída o timeout de
la fuente. La indisponibilidad se muestra como `UNAVAILABLE` conceptual, nunca
como dato ausente, normal o actualizado. No se habilita fallback a una fuente no
aprobada ni se omite la revisión humana.

### Rollback conceptual

Al ser read-only, rollback significa dejar de presentar una importación,
invalidar su elegibilidad para reconciliación y restaurar la última vista externa
previamente validada, conservando la historia de la decisión. No significa
deshacer datos de la HCE ni borrar historia interna. La estrategia exacta sigue
pendiente de retención y operación.

### Registro de procedencia

La procedencia externa conservaría organización/sistema/conector/versiones,
identificador externo seudonimizado, tiempos de origen/recepción, perfil y
versión, estado de validación, fingerprint y referencia a la revisión. No copiaría
payload clínico a `AuditEvent`. ADR-0011 continúa siendo la autoridad del lineage
interno y no eleva una referencia externa a fuente verificada por mera forma.

### Revisión humana

Una persona con rol y relación institucional aprobados revisaría identidad,
fuente, freshness, divergencias, minimización y finalidad antes de cualquier uso
clínico. La revisión no prueba verdad clínica, conformidad FHIR ni seguridad y no
autoriza writeback o automatización.

## Threat model de datos externos

Todas las entradas permanecen abiertas, sin estimación ni aceptación de riesgo.

| Amenaza | Fallo seguro conceptual | Trazabilidad existente |
| --- | --- | --- |
| Datos desactualizados | Mostrar tiempo/fuente; abstenerse si freshness no está aprobada; no elegir “último” sin semántica | HAZ-GAS-003/014/015 |
| Duplicados | Detectar candidatos y reconciliar; no fusionar ni producir efectos automáticamente | HAZ-GAS-002/005/017 |
| Identidad incierta | Cuarentena y matching humano; no vincular por coincidencia parcial | HAZ-GAS-001/004 |
| Paciente incorrecto | Denegar uso, preservar evidencia sanitizada y revisar subject linking | HAZ-GAS-001/012 |
| Unidades desconocidas | Abstención; no convertir ni asumir unidad por defecto | HAZ-GAS-003/011 |
| Códigos desconocidos | Abstención y revisión terminológica; no mapear por texto o semejanza | HAZ-GAS-003/011 |
| Perfil inesperado | Rechazar o cuarentena; no aceptar “FHIR válido” como perfil aprobado | HAZ-GAS-003/011 |
| Ausencia de provenance | Abstención; no promover el dato a fuente confiable | HAZ-GAS-003/005 |
| Fuente no disponible | Estado de indisponibilidad separado; no inferir ausencia o normalidad | HAZ-GAS-010/014 |
| Datos excesivos | Rechazo/minimización antes de presentación; sin payload en audit/logs | HAZ-GAS-004/011 |
| Información clínica contradictoria | Mostrar ambas fuentes y su autoridad declarada; reconciliación humana | HAZ-GAS-003/012 |
| Replay | Idempotencia/fingerprint conceptual; colisión a cuarentena | HAZ-GAS-005/017 |
| Contenido malicioso | Límites, parser estricto, sanitización y aislamiento; nunca renderizar contenido activo | HAZ-GAS-004/011 |
| Autoridad semántica ambigua | Abstención hasta identificar source of truth y responsable | HAZ-GAS-003/011/012 |

Este threat model no cierra ni modifica el Hazard Log y no reduce
GAP-DCB-023/024.

## Tecnologías y capacidades pospuestas

| Capacidad | Estado | Razón de aplazamiento | Gate futuro mínimo |
| --- | --- | --- | --- |
| SMART on FHIR | `NO_GO` | No hay contexto de lanzamiento, EHR, issuer, scopes, client registration ni usuario institucional | Requisito, perfil, IAM y security review aprobados |
| OAuth | `NO_GO` | No se ha seleccionado flujo, actor, cliente, scopes, rotación, secretos ni trust boundary | DEC-013/018 y diseño de amenazas aprobado |
| CDS Hooks | `NO_GO` | No existe intended purpose de CDS ni autorización para influir en decisiones clínicas | Intended purpose, clinical safety y evaluación regulatoria separadas |
| Subscriptions | `NO_GO` | Implican webhook/eventos y operación automática expresamente fuera de P12 | Contrato de eventos, operación, continuidad y fase autorizada |
| Writeback | `NO_GO` | Contradice la frontera read-only y podría alterar la HCE o ejecutar decisiones | ADR y autorización separados; fuera de P12 |
| Bulk Data | `NO_GO` | No hay necesidad poblacional; aumenta minimización, identidad y superficie operativa | Caso de uso aprobado, privacy/safety review y perfil |
| Guía de implementación propia | `NO_GO` | No se conocen perfiles aplicables ni existe autoridad para crear extensiones | Selección institucional y análisis de reutilización |
| Servidor FHIR | `DO-NOT-BUILD` | Duplicaría una plataforma clínica sin requisito y ampliaría operación/custodia | Requisito excepcional y revisión arquitectónica independiente |
| Validación formal de perfiles | `NOT_IMPLEMENTED` | No se ha elegido versión ni perfil; validar una hipótesis crearía falsa evidencia | Artefactos de perfil aprobados y fixtures sintéticos |
| Integración institucional | `NO_GO` | No hay organización, proveedor, contrato, DPA, red, IAM, operación ni piloto aprobados | DEC-003/005/013–016/018 resueltas para alcance exacto |

## Plan futuro de pruebas

`TEST PLAN = NOT_IMPLEMENTED`. Ninguna fila acredita comportamiento runtime.
Todos los fixtures deberán ser inequívocamente sintéticos y no podrán contener
identificadores, organizaciones o contenido que parezcan reales.

| Área futura | Evidencia que debería producir una fase autorizada |
| --- | --- |
| Validación de perfiles | Aceptar solo versión/perfil aprobados; rechazar versiones, extensiones y cardinalidades inesperadas |
| Terminologías desconocidas | Abstenerse ante código o sistema no aprobado; no mapear por heurística |
| Identidad ambigua | Cuarentena ante cero, múltiples o conflictivos candidatos; exigir decisión humana |
| Duplicación y replay | No crear efectos con repetición idéntica; reconciliar versiones divergentes |
| Stale data | Mostrar tiempos y abstenerse según política versionada; probar skew y orden de llegada |
| Provenance ausente | Rechazo o cuarentena sin elevar confianza |
| Cuarentena | Aislamiento de dominio, UI, audit y logs; liberación solo con rol y evidencia aprobados |
| Abstención | Estado explícito que no equivale a normalidad, ausencia o bajo riesgo |
| Indisponibilidad | Diferenciar timeout/source-down de dato ausente; no usar fallback no autorizado |
| Contradicción y reconciliación | Conservar fuentes separadas, revisión humana e historia sin sobrescritura |
| Minimización/contenido malicioso | Rechazar exceso, contenido activo, tamaños y formas fuera de contrato; logs sanitizados |
| Prohibición de writeback | Pruebas negativas de que no existen operaciones de creación, actualización, borrado, cierre, firma o envío hacia la HCE |

E2E, validadores, SDKs, fixtures FHIR ejecutables y contract tests no se crean en
P12 porque implicarían aparentar una integración que no existe.

## Claims permitidos y prohibidos

Permitido únicamente con todos sus calificadores:

> Se ha documentado una frontera conceptual, futura y de solo lectura para
> evaluar una posible capa anticorrupción FHIR. No está implementada; versión,
> perfiles, terminologías, seguridad y operación permanecen pendientes de
> decisión institucional.

No permitido:

- “Guardián es interoperable/compatible/conforme con FHIR”.
- “Guardián se integra con una HCE”.
- “Los mappings FHIR están definidos/aprobados”.
- “La importación es segura, validada o lista para piloto/producción”.
- “SMART/OAuth/CDS Hooks/writeback están soportados”.

## Consecuencias

- La arquitectura futura queda inequívocamente inbound/read-only y separada del
  dominio.
- Las correspondencias permanecen candidatas y las decisiones institucionales
  permanecen abiertas.
- Se reutilizan procedencia, autorización, auditoría, riesgos y trazabilidad
  existentes sin duplicar fuentes de verdad.
- No cambian runtime, schema Prisma, migraciones, dependencias, endpoints,
  feature flags, servicios, workflows ni tests.
- `FHIR RUNTIME / SDK / ENDPOINT = NONE`, `CONFORMANCE CLAIM = NONE` y
  `RESIDUAL RISK ACCEPTANCE = NONE`.
