# Guardián Alta Segura 2.0 — límites de propiedad

## Principio de propiedad

Guardián debe poseer las reglas que hacen trazable y segura la continuidad
postalta. No debe poseer plataformas clínicas, dispositivos o canales externos
que ya tienen autoridades, ciclos de vida y responsabilidades propias.

“Poseer” significa mantener el contrato, los invariantes, las pruebas y la
evidencia. No significa necesariamente crear una tabla o desplegar un servicio
separado.

## Matriz CORE GUARDIAN / INTEGRATE / NEVER BUILD

| Límite | Capacidad | Decisión | Responsabilidad de Guardián |
|---|---|---|---|
| `CORE GUARDIAN` | Episode governance | Mantener como IP/core | Componer estado, responsables, versión de protocolo, autorizaciones, pendientes y blockers sobre `DischargeEpisode` y eventos existentes |
| `CORE GUARDIAN` | Signal provenance | Mantener como IP/core | Implementado como `CanonicalProvenanceLineageV1`: identidad de fuente, tiempo, versión de esquema, referencias, derivación y hash por referencia, sin copiar el payload de origen |
| `CORE GUARDIAN` | Human authorization | Mantener como IP/core | Exigir actor autorizado, decisión explícita, motivo cuando aplique y evidencia antes de cualquier acción posterior |
| `CORE GUARDIAN` | Accountability | Mantener como IP/core | Proyectar creator, assignee, actor, resolver, transferencias y elegibilidad actual desde `Task`/`TaskEvent`; no inferir quién debería actuar sin política aprobada |
| `CORE GUARDIAN` | SLA y escalado | Mantener como IP/core tras DEC-017 | Evaluar configuración versionada y explicable; nunca inferir prioridad clínica |
| `CORE GUARDIAN` | Process safety | Mantener como IP/core | Detectar determinísticamente pasos organizativos omitidos y crear solo trabajo para revisión humana |
| `CORE GUARDIAN` | Audit/evidence | Mantener como IP/core | Conservar metadatos minimizados, historias append-only, correlation ID y vistas de evidencia autorizadas |
| `CORE GUARDIAN` | Connector contracts | Mantener como IP/core | Definir ports, autenticidad, idempotencia, validación, cuarentena, errores y versionado de contrato |
| `INTEGRATE` | HCE/EHR | Sistema externo | Consumir o publicar solo mediante contrato y autorización institucional; no replicar la HCE |
| `INTEGRATE` | LAGUN | Proveedor potencial | No asumir API, contrato, acceso, payload, finalidad, DPA ni capacidad clínica |
| `INTEGRATE` | Tucuvi | Proveedor potencial | Igual que LAGUN; realizar discovery y evaluación separada |
| `INTEGRATE` | Huma | Proveedor potencial | Igual que LAGUN; no codificar un adapter especulativo |
| `INTEGRATE` | MeMind | Proveedor potencial | Igual que LAGUN; no inferir equivalencias de cuestionarios o señales |
| `INTEGRATE` | Wearables | Fuente externa potencial | Ingerir solo datos y finalidades aprobados; no controlar el dispositivo |
| `INTEGRATE` | Messaging | Canal externo | Integrar proveedor aprobado respetando permiso por canal/finalidad y evidencia de entrega |
| `INTEGRATE` | Identity provider | Autoridad institucional externa | Implementar `InstitutionalIdentityProvider`, validación de claims y mapeo aprobado; no gestionar credenciales propias |
| `INTEGRATE` | RPM | Plataforma externa potencial | Consumir señales pertinentes bajo contrato; no recrear funciones genéricas de monitorización |
| `NEVER BUILD` | HCE propia | `DO-NOT-BUILD` | Está fuera del intended purpose y duplicaría el sistema clínico de registro |
| `NEVER BUILD` | Wearable propio | `DO-NOT-BUILD` | Añade hardware, validación y riesgo sin necesidad del núcleo |
| `NEVER BUILD` | Plataforma RPM genérica | `DO-NOT-BUILD` | Diluye el foco de gobernanza y continuidad |
| `NEVER BUILD` | Motor de voz clínica propio | `DO-NOT-BUILD` | No pertenece al MVP; introduce biometría, precisión clínica y operación especializada |
| `NEVER BUILD` | Chatbot terapéutico autónomo | `DO-NOT-BUILD` | Contradice la revisión humana y el alcance organizativo |
| `NEVER BUILD` | Predictor clínico opaco | `DO-NOT-BUILD` | Contradice la prohibición de scoring/predicción y no es explicable |
| `NEVER BUILD` | Graph database | `DO-NOT-BUILD` sin evidencia | La responsabilidad actual cabe en relaciones y proyecciones; no hay consulta o escala demostrada |
| `NEVER BUILD` | Servidor FHIR completo | `DO-NOT-BUILD` sin requisito | Si se requiere FHIR, construir solo anti-corruption layer y adapters de perfiles institucionales |

## Riesgo de duplicación por concepto propuesto

| Concepto propuesto | Riesgo | Fuente de verdad o workflow existente | Recomendación |
|---|---|---|---|
| `EpisodeContract` | Alto | `DischargeEpisode`, `EpisodeTransition`, `EpisodeGovernancePolicy/View`, responsables, protocolo, avisos y tareas | No crear tabla ni agregado paralelo. Reutilizar la política/vista de gobernanza compuesta ya implementada. |
| `SignalRecord` | Alto si se usa como copia universal | `CanonicalProvenanceLineageV1`, `RuleEvaluation`, `Alert.inputReferences`, check-ins, procedencia de Plan/Domicilio y observaciones | No crear: el value object v1 ya resuelve el linaje interno. Persistir mensajes externos solo cuando exista contrato y necesidad de reintento/linaje. |
| `ReviewGate` | Alto | `DefaultHumanAuthorizationPolicy`, `AlertReview`, `ReviewAlertService`, guard de `CreateNursingTaskService` y trigger `tasks_require_reviewed_alert` | No crear tabla. La policy reutilizable ya proyecta decisión y evidencia sin duplicar revisión ni estado. |
| `TaskCase` | Muy alto | `Task`, `TaskEvent`, `TaskAccountabilityProjection` y `NursingWorkQueue` | Reutilizar el lifecycle y la proyección actuales. No crear otra cola o tabla de casos. |
| `AccountabilityGraph` | Alto | `TaskAccountabilityProjection`, responsables del episodio, `reviewOwner`, asignado/creador/resolutor y actores de eventos | No crear. La proyección relacional ya reconstruye la cadena; Graph DB solo con consultas y escala futuras demostradas. |
| `ProcessAnomaly` | Medio | Ventanas/outcomes de check-in, revisiones de aviso, tareas y timestamps | Calcular una proyección determinista. Persistir un hallazgo solo si necesita acknowledgement/historia y tras definir semántica. |
| `ConsentScope` | Muy alto | `PolicyVersion`, registros legales, `RevocationEvent` y `CaregiverAuthorizationScope` | Reutilizar decisiones legales por finalidad. No colapsar consentimiento, base legal y autorización de cuidador en una tabla genérica. |
| `AuditLog` | Crítico | `AuditEvent`, `CaregiverAccessAudit` e historias de dominio | No crear. Añadir vistas/consultas autorizadas sobre la evidencia existente. |
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

## Frontera de datos

Los conectores externos deben entregar datos a Guardián mediante un contrato que:

1. identifica organización, sistema, conector y versión;
2. conserva un identificador externo seudonimizado y un idempotency key;
3. declara tiempo de observación, recepción y zona horaria;
4. identifica tipo y versión del esquema fuente;
5. conserva referencias de procedencia sin copiar PHI innecesaria a auditoría;
6. valida finalidad y autorización antes de usar el dato;
7. falla a cuarentena o abstención ante payload incompleto o no confiable;
8. nunca dispara una actuación clínica sin gate humano.

La semántica clínica del proveedor no se da por equivalente a la de Guardián. Un
adapter traduce al contrato canónico; el dominio no importa SDKs ni recursos del
proveedor.

## Decisiones pendientes antes de integrar

Para cualquier HCE, LAGUN, Tucuvi, Huma, MeMind, wearable, mensajería o RPM se
requiere evidencia de:

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
