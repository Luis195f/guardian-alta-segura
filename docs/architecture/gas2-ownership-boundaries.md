# Guardián Alta Segura 2.0 — límites de propiedad

> **Actualización 2026-07-31:** ADR-0015 y
> [la frontera de aseguramiento](../system-assurance-boundary.md) prevalecen para
> ownership y claims de Core frente a Clinical Rules. La separación es propuesta;
> el baseline sigue siendo un monolito acoplado.

## Principio de propiedad

Guardián Core debe poseer exclusivamente las reglas organizativas que hacen
trazable la constancia del circuito postalta. Las reglas que procesan datos de
salud con significado clínico pertenecen a Clinical Rules y requieren finalidad,
evaluación y claims separados. No debe poseer plataformas clínicas, dispositivos
o canales externos que ya tienen autoridades, ciclos de vida y responsabilidades
propias.

“Poseer” significa mantener el contrato, los invariantes, las pruebas y la
evidencia. No significa necesariamente crear una tabla o desplegar un servicio
separado.

## Matriz CORE GUARDIAN / INTEGRATE / NEVER BUILD

| Límite | Capacidad | Decisión | Responsabilidad de Guardián |
|---|---|---|---|
| `CORE GUARDIAN` | Episode governance | Mantener como IP/core con frontera | Componer estado, responsables, versión de protocolo, autorizaciones y pendientes organizativos; no autorizar cierre ni interpretar el significado clínico de un aviso |
| `SHARED SAFETY INTERFACE` | Signal provenance | Reutilizar sin convertir en claim Core | `CanonicalProvenanceLineageV1` conserva referencias técnicas entre fuente, evaluación y aviso; no valida el contenido clínico ni acredita independencia modular |
| `CORE GUARDIAN` | Human authorization | Mantener como IP/core | Exigir actor autorizado, decisión explícita, motivo cuando aplique y evidencia antes de cualquier acción posterior |
| `CORE GUARDIAN` | Accountability | Mantener como IP/core | Proyectar creator, assignee, actor, resolver, transferencias y elegibilidad actual desde `Task`/`TaskEvent`; no inferir quién debería actuar sin política aprobada |
| `CORE GUARDIAN` | Plazo y escalado organizativos | Bloqueado hasta frontera aprobada y DEC-017 | Evaluar solo compromisos explícitos, plazo y evidencia registral; nunca inferir prioridad clínica ni incumplimiento |
| `CORE GUARDIAN` | Circuit assurance | Mantener como dirección de IP/core, todavía no implementada | Detectar ausencia de constancia en compromisos explícitos y elevarla a revisión humana; no evaluar síntomas ni respuestas clínicas |
| `CORE GUARDIAN` | Audit/evidence | Mantener como IP/core | `EpisodeGovernanceEvidenceView` implementada: proyectar metadatos minimizados, historias append-only y correlation ID sin otra tabla ni payload clínico |
| `CORE GUARDIAN` | Connector contracts | Mantener como IP/core | Definir ports, autenticidad, idempotencia, validación, cuarentena, errores y versionado de contrato |
| `CLINICAL RULES` | Catálogo y evaluación de reglas clínicas | Separar de Core; evaluación regulatoria propia | Poseer DSL, inputs, umbrales, ventanas, evaluación, explicación y evidencia de rendimiento por intended purpose |
| `CLINICAL RULES` | Avisos clínicos | Separar de Core; solo solicitud de revisión | Un `matched` puede solicitar revisión humana, pero no mutar tareas, episodios, comunicaciones o tratamiento |
| `INTEGRATE` | HCE/EHR | Sistema externo | P12 solo documenta una posible importación read-only mediante [ADR-0018](../adr/0018-future-read-only-fhir-boundary.md); publicar/writeback requiere otra fase y permanece `NO_GO`; no replicar la HCE |
| `INTEGRATE` | Servicio clínico o de telemonitorización externo | Proveedor futuro no seleccionado | No asumir API, contrato, acceso, payload, finalidad, DPA, equivalencia semántica ni capacidad clínica |
| `INTEGRATE` | Wearables | Fuente externa potencial | Ingerir solo datos y finalidades aprobados; no controlar el dispositivo |
| `INTEGRATE` | Messaging | Canal externo futuro; `DOCUMENTED_ONLY / NO_GO` | Aplicar la [frontera documental neutral respecto del proveedor](../adr/0017-future-communications-boundary.md); los registros legales actuales no prueban entrega ni autorizan un adapter |
| `INTEGRATE` | Identity provider | Autoridad institucional externa | Implementar `InstitutionalIdentityProvider`, validación de claims y mapeo aprobado; no gestionar credenciales propias |
| `INTEGRATE` | RPM | Plataforma externa potencial | Consumir señales pertinentes bajo contrato; no recrear funciones genéricas de monitorización |
| `NEVER BUILD` | HCE propia | `DO-NOT-BUILD` | Está fuera del intended purpose y duplicaría el sistema clínico de registro |
| `NEVER BUILD` | Wearable propio | `DO-NOT-BUILD` | Añade hardware, validación y riesgo sin necesidad del núcleo |
| `NEVER BUILD` | Plataforma RPM genérica | `DO-NOT-BUILD` | Diluye el foco de gobernanza y continuidad |
| `NEVER BUILD` | Motor de voz clínica propio | `DO-NOT-BUILD` | No pertenece al MVP; introduce biometría, precisión clínica y operación especializada |
| `NEVER BUILD` | Chatbot terapéutico autónomo | `DO-NOT-BUILD` | Contradice la revisión humana y el alcance organizativo |
| `NEVER BUILD` | Predictor clínico opaco | `DO-NOT-BUILD` | Contradice la prohibición de scoring/predicción y no es explicable |
| `NEVER BUILD` | Graph database | `DO-NOT-BUILD` sin evidencia | La responsabilidad actual cabe en relaciones y proyecciones; no hay consulta o escala demostrada |
| `NEVER BUILD` | Servidor FHIR completo | `DO-NOT-BUILD` sin requisito | Si se requiere FHIR, evaluar solo la capa anticorrupción read-only de ADR-0018 y adapters de perfiles institucionales aprobados |

## Telefonía futura: capacidades separadas

Una futura llamada al profesional y una futura llamada al paciente son capacidades diferentes y no equivalentes. Deben mantener separados propósito, autorización, destinatario, contenido, auditoría y comportamiento ante fallo. `Alert`, `CheckInOutcome`, `Task` y `Commitment` jamás pueden iniciar automáticamente ninguna de las dos.

No se selecciona proveedor productivo ni se presumen consentimiento, base jurídica, protocolo, horarios, SLA o responsable. Patient Relay C04 y Professional Relay C05 existen solo como recorridos separados, locales, deterministas y sintéticos `IMPLEMENTED_UNVALIDATED`; cualquier relay real permanece `FUTURE_ONLY / NO_GO`. C03 aporta autoridad tipada y lifecycle interno; C04/C05 añaden UI/API demo y executors locales sin telefonía, proveedor o voz automatizada. En C05 el servidor deriva una única Task opaca y profesional asignado elegible; acknowledged y disponibilidad no aceptan, asignan ni resuelven trabajo. ADR-0017 conserva el contrato conceptual y ADR-0019 la excepción técnica sintética; ninguna autoriza uso real.

## Riesgo de duplicación por concepto propuesto

La única excepción documental específica de proveedor es
[ADR-0019](../adr/0019-calle-hackathon-sandbox-boundary.md): Patient Relay y
Professional Relay son capacidades organizativas futuras separadas del core y
entre sí. GAS conserva intención, autorización, idempotencia, minimización y
revisión; CALL-E sigue siendo transporte externo no confiable para decisiones
clínicas. C02 aporta el adapter REST desactivado, C03 el core interno y C04/C05
resolvers/entrypoints separados exclusivamente para fixtures sintéticos; no hay motor de voz
propio, resolver real de destinatario ni entrypoint live. C04/C05 no cambian
ADR-0017, no introduce IA en el core y no autoriza llamadas.
Demo pública sintética: `LIVE OFF`; datos reales, piloto y producción: `NO_GO`.

| Concepto propuesto | Riesgo | Fuente de verdad o workflow existente | Recomendación |
|---|---|---|---|
| `EpisodeContract` | Alto | `DischargeEpisode`, `EpisodeTransition`, `EpisodeGovernancePolicy/View`, responsables, protocolo, avisos y tareas | No crear tabla ni agregado paralelo. Reutilizar la política/vista de gobernanza compuesta ya implementada. |
| `SignalRecord` | Alto si se usa como copia universal | `CanonicalProvenanceLineageV1`, `RuleEvaluation`, `Alert.inputReferences`, check-ins, procedencia de Plan/Domicilio y observaciones | No crear: el value object v1 ya resuelve el linaje interno. Persistir mensajes externos solo cuando exista contrato y necesidad de reintento/linaje. |
| `ReviewGate` | Alto | `DefaultHumanAuthorizationPolicy`, `AlertReview`, `ReviewAlertService`, guard de `CreateNursingTaskService` y trigger `tasks_require_reviewed_alert` | No crear tabla. La policy reutilizable ya proyecta decisión y evidencia sin duplicar revisión ni estado. |
| `TaskCase` | Muy alto | `Task`, `TaskEvent`, `TaskAccountabilityProjection` y `NursingWorkQueue` | Reutilizar el lifecycle y la proyección actuales. No crear otra cola o tabla de casos. |
| `AccountabilityGraph` | Alto | `TaskAccountabilityProjection`, responsables del episodio, `reviewOwner`, asignado/creador/resolutor y actores de eventos | No crear. La proyección relacional ya reconstruye la cadena; Graph DB solo con consultas y escala futuras demostradas. |
| `ProcessAnomaly` | Medio | Ventanas/outcomes de check-in, tareas y timestamps | No implementar antes de aprobar ADR-0015. Después, limitar a ausencia de evidencia registral sobre compromisos explícitos; nunca inferir incumplimiento o significado clínico. |
| `ConsentScope` | Muy alto | `PolicyVersion`, registros legales, `RevocationEvent` y `CaregiverAuthorizationScope` | Reutilizar decisiones legales por finalidad. No colapsar consentimiento, base legal y autorización de cuidador en una tabla genérica. |
| `AuditLog` | Crítico | `AuditEvent`, `CaregiverAccessAudit` e historias de dominio | No crear. Añadir vistas/consultas autorizadas sobre la evidencia existente. |
| `RelayAttempt` | Medio si duplica transporte; bajo en C03/C04/C05 acotado | `OutboundCallIntent/Event` conserva transporte; `AuditEvent` conserva auditoría | Mantener solo binding de autoridad, confirmación one-use, resultado técnico normalizado en enums cerrados y lifecycle humano. No copiar provider payload, teléfono, prompt o estado técnico detallado. |
| `ConnectorRegistration` | Bajo en responsabilidad, alto si se especula | `IdentityProvider` y adaptador local demuestran el patrón, pero no hay registro equivalente | Definir contrato solo al seleccionar un conector. No crear catálogo persistente hasta necesitar estado operativo o rotación de configuración. |

## Qué puede ser una proyección y no una tabla

Estas capacidades pueden comenzar como consultas o servicios de aplicación sobre
datos existentes:

- estado de gobernanza de un episodio;
- cadena de assignment/reassignment y elegibilidad técnica actual;
- antigüedad y vencimiento de tareas;
- procesos de check-in vencidos sin outcome;
- avisos pendientes de revisión;
- evidencia correlacionada de decisión y acción;
- salud operativa agregada por conector.

Solo se justifica persistencia adicional cuando haya un lifecycle propio,
idempotencia de mensajes, acknowledgement, historial obligatorio o concurrencia
que no pueda representarse de forma segura con los eventos actuales.

La evidencia correlacionada del episodio ya se implementa como proyección
read-only con límites y truncamiento explícitos. No justifica persistir una
decisión histórica de autorización que el contrato actual no conserva ni crear
un segundo log.

## Frontera de datos

Los conectores externos deben entregar datos a Guardián mediante un contrato que:

1. identifica organización, sistema, conector y versión;
2. conserva un identificador externo seudonimizado y un idempotency key;
3. declara tiempo de observación, recepción y zona horaria;
4. identifica tipo y versión del esquema fuente;
5. conserva referencias de procedencia sin copiar PHI innecesaria a auditoría;
6. valida finalidad y autorización antes de usar el dato;
7. falla a cuarentena o abstención ante payload incompleto o no confiable;
8. nunca dispara una actuación clínica sin gate humano;
9. mantiene separada la solicitud de revisión de Clinical Rules de la obligación
   y prioridad organizativas de Core.

La semántica clínica del proveedor no se da por equivalente a la de Guardián. Un
adapter traduce al contrato canónico; el dominio no importa SDKs ni recursos del
proveedor.

## Decisiones pendientes antes de integrar

Para cualquier HCE, proveedor clínico o de telemonitorización, wearable,
mensajería, telefonía o RPM se requiere evidencia de:

- propietario y finalidad;
- API y versión realmente disponibles;
- autenticación, autorización y rotación de secretos;
- contrato y ejemplos de payload sintéticos;
- idempotencia, orden, reintentos y límites;
- tratamiento, minimización, retención y residencia;
- disponibilidad, soporte, SLA y salida del proveedor;
- validación clínica/institucional de la semántica usada;
- threat model y pruebas de fallo seguro.

Sin esa evidencia, la decisión arquitectónica es `INTEGRATE — DEFERRED`, no
`BUILD`.
