# Frontera de aseguramiento del circuito: Guardián Core y Clinical Rules

## Control del documento

| Campo | Valor |
| --- | --- |
| Estado | `PROPUESTA PARA APROBACIÓN`; no implementada como separación desplegable |
| Fecha de corte | 2026-07-31 |
| Baseline inspeccionado | Rama `docs/system-assurance-boundary`; monolito Next.js/TypeScript con Prisma/PostgreSQL |
| Uso del baseline | Exclusivamente técnico, local, sintético y no clínico |
| Decisión regulatoria | Pendiente de asesor regulatorio y, si procede, consulta de cualificación/clasificación a AEMPS |
| Decisiones relacionadas | DEC-002, DEC-006, DEC-007, DEC-008, DEC-009, DEC-012, DEC-013, DEC-016 y DEC-017 |

Este documento define una frontera de producto verificable. No declara que
Guardián Core esté excluido del Reglamento (UE) 2017/745 (`MDR`), que Clinical
Rules sea ya un producto sanitario, que exista una clasificación definitiva ni
que la separación documental baste para separar responsabilidades regulatorias.
La cualificación depende de la finalidad prevista, la función real, los claims,
la configuración comercial y las interdependencias de los módulos.

## Decisión ejecutiva

Se separan dos finalidades y dos tipos de regla:

1. **Guardián Core** verifica constancia y trazabilidad de compromisos
   organizativos explícitos. Solo puede aplicar reglas de aseguramiento del
   circuito sobre responsable, plazo, tipo de evidencia, estado registral y
   revisión humana.
2. **Clinical Rules** procesa información individual de salud mediante reglas,
   umbrales o lógica clínica para producir información destinada a revisión
   profesional. Su cualificación y clasificación se evaluarán por separado; que
   sea determinista, explicable y revisada por una persona no la excluye por sí
   solo del MDR.

La propuesta central queda fijada como **finalidad prevista propuesta**, no como
claim de capacidad ya demostrada:

> Guardián Alta Segura verifica el circuito asistencial: convierte cada
> compromiso explícito del alta en una obligación con responsable, plazo y
> evidencia, detecta cuándo falta constancia de cumplimiento y lo eleva a
> revisión humana.

El baseline actual demuestra episodios, responsables, tareas, estados,
revisiones y trazabilidad, pero **no** permite afirmar todavía «cada compromiso»
ni «obligación con plazo y evidencia»: `Task` no contiene plazo, política de
excepción ni un contrato tipado de evidencia. Hasta implementar y verificar esos
elementos en una rama posterior autorizada, el único claim admisible es:

> El MVP técnico sintético demuestra partes del circuito de continuidad —episodio,
> responsables, avisos revisados, tareas humanas e historia— y documenta la
> frontera requerida para un futuro aseguramiento de compromisos. No acredita el
> cumplimiento de cada compromiso ni detecta incumplimientos.

## Finalidad prevista separada

### Guardián Core

**Finalidad prevista propuesta:** organizar y verificar el circuito documental y
operativo de continuidad postalta para que cada compromiso explícitamente
registrado por una persona autorizada pueda asociarse a un responsable, un plazo
organizativo, una evidencia esperada y un estado de revisión. Cuando, llegada la
condición temporal aplicable, no exista constancia suficiente en las fuentes
autorizadas, Core presenta una **ausencia de evidencia** y crea o enruta una
solicitud de revisión humana.

Core puede:

- registrar el compromiso explícito sin inferirlo de texto clínico;
- conservar autoría, versión, episodio, responsable y plazo declarados;
- verificar presencia, procedencia, integridad y puntualidad registral de una
  evidencia permitida;
- distinguir respuesta del paciente de actuación del equipo;
- conservar excepciones y evidencia tardía sin reescribir la historia;
- mostrar pendientes y contradicciones técnicas;
- crear trabajo organizativo para revisión humana mediante una acción explícita
  y autorizada;
- proporcionar trazabilidad, RBAC, idempotencia, auditoría y estados de error o
  vacío.

Core no determina si el contenido clínico es correcto, suficiente o seguro. No
interpreta síntomas, cuestionarios, diagnóstico, medicación, adherencia, ideación
autolítica ni otros datos de salud para decidir prioridad, riesgo o actuación.

### Clinical Rules

**Finalidad prevista pendiente de aprobación:** aplicar reglas clínicas
versionadas a información individual de salud para producir una salida explicable
destinada a revisión por un profesional autorizado. Población, indicación,
usuarios, inputs, outputs, decisiones apoyadas, contraindicaciones, rendimiento y
consecuencias de error no están aprobados.

En el baseline, esta función corresponde materialmente al catálogo y motor de
`RuleDefinition`/`RuleVersion`/`RuleEvaluation`/`Alert`, aunque todos sus usos son
demo sintéticos. Clinical Rules:

- recibe inputs individuales referenciados y una versión activa de regla;
- aplica ventanas y operadores deterministas;
- se abstiene cuando faltan inputs requeridos;
- produce `matched`, `not-matched` o `abstained`;
- crea un aviso explicable solo ante `matched`;
- no crea tareas, contactos, derivaciones, cierres, firmas o modificaciones de
  tratamiento automáticamente;
- requiere revisión humana posterior.

La finalidad definitiva debe declarar qué decisión clínica, si alguna, se apoya
con cada salida. No se permite redefinirla como «mera organización» si la función
real analiza datos clínicos de una persona para señalar escenarios destinados a
influir en su manejo.

## Dos familias de reglas que no deben confundirse

| Familia | Datos que puede evaluar | Salida permitida | Propietario propuesto |
| --- | --- | --- | --- |
| `Circuit Assurance Rules` | IDs, actor, rol, compromiso explícito, plazo, evidencia esperada/registrada, timestamps, versión y excepción | `EVIDENCE_RECORDED`, `EVIDENCE_NOT_RECORDED`, `LATE_EVIDENCE_RECORDED`, inconsistencia técnica o solicitud de revisión | Guardián Core |
| `Clinical Rules` | síntomas, respuestas, medicación/adherencia, observaciones clínicas, umbrales o combinaciones con significado médico | resultado de evaluación y solicitud explicable de revisión clínica | Clinical Rules |

Una regla deja de ser de aseguramiento del circuito si usa el valor clínico del
dato, su severidad o una combinación clínica para modificar prioridad, ruta,
plazo, responsable o acción. Renombrar `severity` como «administrativa» no cambia
esa conclusión si su valor deriva de una condición clínica.

## Inventario verificado del baseline

### Arquitectura y superficies

- Monolito modular Next.js 16/React 19/TypeScript estricto.
- PostgreSQL y Prisma como única persistencia; once migraciones.
- Capas `domain`, `application`, `infrastructure`, `presentation` y rutas App
  Router bajo `src/app`.
- Identidad demo local, loopback-only, seis roles técnicos, cookies HttpOnly,
  autorización por recurso y auditoría minimizada.
- APIs demo para sesión, roles, episodios, planes, check-ins, reglas, avisos,
  tareas, cuidador, Domicilio Seguro, SBAR, evidencia de gobernanza y health.
- No existen scheduler, worker, mensajería real, integración HCE/FHIR/HL7,
  outbox, IA generativa, ML, predictor, geolocalización o wearables.

### Funciones, flujos y automatismos reales

| Función real | Comportamiento verificado |
| --- | --- |
| Episodio postalta | Crea un episodio sintético con duración elegida explícitamente entre 30/60/90 días, responsables y protocolo; transiciones versionadas e idempotentes. El cierre está denegado por DEC-002. |
| Gobernanza del episodio | Proyección read-only de responsables activos, protocolo, identidad, avisos no terminales y tareas abiertas. Los llama `openObligations`, pero no representa compromisos de alta con plazo/evidencia. |
| Plan de Seguridad | Seis pasos, versiones N+1 y cambios de estado append-only; contenido introducido por personas. No hay inferencia, scoring o firma automática. |
| Check-ins | Versiona preguntas y cadencia; crea asignaciones por petición profesional; registra respuesta, omisión voluntaria o vencimiento. El vencimiento lo registra un profesional mediante endpoint explícito; no hay scheduler. |
| Motor de reglas | DSL v1 con números, booleanos y enums, ventanas, `eq/lte/gte`, ocurrencias y días distintos. La evaluación es una petición profesional explícita. |
| Fixtures clínicamente sensibles | Existen ejemplos draft para sueño + adherencia, ideación autolítica, 48 h sin respuesta y conflicto familiar severo. Existe además una regla activa exclusivamente técnica del seed para demostrar el flujo. |
| Avisos | Un `matched` crea `Alert.open` con explicación, procedencia, `reviewOwner` y `administrativeSeverity`; `not-matched` y `abstained` no crean aviso. |
| Revisión humana | `AlertReview` registra transiciones append-only. Revisar no crea una tarea ni otra actuación. `actioned` no demuestra que exista acción. |
| Tareas | Una petición profesional crea una tarea directa o vinculada a aviso revisado. Permite asignar, reasignar, registrar intento de contacto/nota y resolver; no hay deadline, SLA, aceptación, equipo, turno o escalado. |
| Autorización humana | Policy fail-closed para `CREATE_TASK_FROM_REVIEWED_ALERT`; combina review real, estado, rol activo y responsabilidad actual. La decisión por instancia no se persiste. |
| Accountability | Proyección sobre `Task`/`TaskEvent` que separa creador, assignee, actor y resolver, detecta contradicciones estructurales y marca assignee ya no autorizado. |
| Evidencia de gobernanza | Vista read-only, minimizada y limitada a 100 referencias por colección. `COMPLETE/PARTIAL/INCONSISTENT` describen integridad técnica, no cumplimiento o seguridad. |
| Domicilio Seguro | Checklist informativo versionado, con procedencia y flag de revisión humana. No certifica seguridad y no tiene score. |
| SBAR | Preview determinista y no firmado. Ensambla datos estructurados, cuenta avisos y copia resúmenes de tareas; no existe PDF institucional, envío o firma. |
| Crisis | Recurso visible pero deshabilitado, sin número ni URI, pendiente de DEC-010/011. |
| Cuidador y registros legales | Autorizaciones, scopes, invitación/sesión, observaciones y revocación append-only. Una observación nunca crea aviso o tarea. |
| Semáforo | `EXPLAINABLE_TRAFFIC_LIGHT=false` por defecto. No altera la evaluación; DEC-009 bloquea habilitarlo. |
| Auditoría | `AuditEvent` y eventos de dominio append-only; logs y respuestas de error se minimizan. No prueban cumplimiento clínico o regulatorio. |

### Acoplamientos actuales que impiden afirmar separación técnica

1. `RuleDefinition`, `RuleVersion`, `RuleEvaluation`, `Alert`, `AlertReview`,
   `Task` y `TaskEvent` comparten esquema y base de datos.
2. `Task.alertId` referencia directamente `Alert`; la interfaz no es un contrato
   neutral de solicitud de revisión.
3. `EpisodeGovernancePolicy` importa estados de aviso y los usa como blockers de
   gobernanza, aunque el cierre permanece actualmente denegado.
4. El mismo runtime, despliegue, sesión, UI y catálogo de APIs presenta Core y
   reglas.
5. Plan de Seguridad, check-ins, Domicilio Seguro y SBAR combinan motores
   documentales con plantillas de contenido sanitario en los mismos módulos.
6. Los claims de README/producto hablan de una plataforma única.

Por tanto, esta documentación establece el contrato a aprobar y los gates de una
separación futura; **no acredita que esa separación exista hoy**.

## Matriz de asignación funcional y claims

`Riesgo regulatorio` es un indicador preliminar de riesgo de cualificación,
clasificación o contaminación de frontera; no es la clase MDR.

| Función | Módulo propuesto | Entrada | Salida | Intervención humana | Riesgo regulatorio | Claim permitido | Claim prohibido | Decisión |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sesión, RBAC y autorización por recurso | Core / servicio transversal | Identidad, rol, relación y scope | Acceso o denegación | Configuración y revisión institucional | Bajo como función aislada; relevante para seguridad del conjunto | «Control técnico deny-by-default en demo sintética» | «SSO/MFA institucional» o «seguro para producción» | `CORE_KEEP`; DEC-013 bloquea producción |
| Registros legales y revocación | Core / servicio transversal | Decisión humana, política y scope | Estado registral y acceso efectivo | Siempre | Medio; privacidad y legislación no MDR | «Conserva registros separados y revocación técnica» | «Consentimiento RGPD válido» o «cumplimiento jurídico» | `CORE_KEEP`; decisiones jurídicas pendientes |
| Crear y versionar episodio | Core | Alta validada, responsables, duración y protocolo elegidos | Episodio y timeline | Creación, activación y cierre humanos | Medio; puede apoyar operación sanitaria | «Registra episodio y responsables» | «Selecciona duración o elegibilidad clínica» | `CORE_KEEP` |
| Registrar compromiso explícito | Core objetivo; no implementado | Declaración humana versionada | Obligación organizativa | Autoría humana obligatoria | Medio; debe permanecer content-neutral | «Registra el compromiso declarado» tras implementación | «Extrae o infiere compromisos clínicos» | `BLOCKED` hasta aprobar contrato |
| Verificar responsable, plazo y evidencia | Core objetivo; no implementado | Obligación, timestamps y referencias | Estado de constancia | Revisión ante ausencia o contradicción | Medio; alto si incorpora semántica clínica | «Verifica constancia documental» tras evidencia técnica | «Verifica que la atención fue correcta» | `BLOCKED` hasta aprobar semántica |
| Gobernanza actual de episodio | Core | Estado, responsables, protocolo, avisos y tareas | Blockers técnicos y cierre denegado | Interpretación y cierre humanos | Medio-alto por importar avisos clínicos | «Muestra pendientes técnicos» | «Autoriza cierre clínico» o «episodio seguro» | `CORE_REFACTOR_LATER`; no habilitar cierre |
| Versionado del Plan de Seguridad | Core documental; contenido clínico separado | Secciones redactadas por personas | Nueva versión e historial | Autoría, activación e invalidación humanas | Medio-alto según finalidad/claims de la plantilla | «Versiona sin sobrescribir» | «Previene suicidio» o «recomienda plan» | `CORE_DOCUMENT_CONTROL`; evaluar plantilla aparte |
| Configurar cadencia de check-in | Core scheduler documental; protocolo clínico en Clinical Rules | Protocolo, zona y ventana | Asignaciones | Configuración y creación profesionales | Medio-alto según cuestionario y uso | «Aplica una cadencia versionada» | «Monitoriza deterioro» | `SPLIT_CONTRACT_REQUIRED` |
| Registrar respuesta del paciente | Core evidence capture | Respuestas explícitas | Outcome y respuesta versionada | Paciente; revisión profesional posterior | Medio; sube si se interpreta | «Registra respuesta» | «Confirma adherencia/cumplimiento del equipo» | `CORE_CAPTURE_ONLY` |
| Registrar omisión o ventana expirada | Core evidence capture | Acción del paciente o petición profesional tras la ventana | `OMITTED` o `EXPIRED` | Paciente/profesional explícitos | Medio | «No consta respuesta dentro de la ventana» | «Paciente incumplidor» o «deterioro» | `CORE_CAPTURE_ONLY` |
| Catálogo y aprobación de regla clínica | Clinical Rules | DSL, inputs, umbral, explicación y owner | Versión draft/approved/active | Creación, aprobación y activación separadas | Alto; finalidad médica plausible | «Regla determinista versionada para demo» | «Regla clínicamente validada» | `CLINICAL_RULES`; DEC-008 |
| Evaluación de regla clínica | Clinical Rules | Datos individuales referenciados | `matched/not-matched/abstained` | Petición profesional y revisión posterior | Alto; posible MDSW por función real | «Evaluación determinista sintética» | «Diagnostica», «predice suicidio» o «estratifica riesgo» | `CLINICAL_RULES`; evaluación MDR separada |
| Creación de aviso por `matched` | Clinical Rules | Evaluación coincidente | Aviso explicable abierto | Revisión humana obligatoria | Alto; salida puede influir en manejo | «Solicita revisión según regla configurada» | «Alarma de riesgo», «prioridad clínica validada» | `CLINICAL_RULES` |
| Semáforo/prioridad derivada de regla | Clinical Rules presentation | Severidad de regla | Orden/color visual | Validación clínica antes de habilitar | Alto por sesgo de automatización | «Desactivado por defecto» | «Nivel de riesgo» | `DISABLED`; DEC-009 |
| Revisión de aviso | Interfaz Clinical Rules → Core | Aviso y decisión humana | `AlertReview` | Siempre | Alto como control de interacción | «Registra una revisión humana» | «La revisión prueba seguridad o cumplimiento» | `SHARED_INTERFACE`; preservar append-only |
| Crear tarea desde aviso revisado | Core consume solicitud de Clinical Rules | Referencia neutral + review + actor autorizado | Tarea humana | Petición profesional explícita | Alto si copia prioridad/acción clínica | «Crea trabajo humano tras revisión» | «Deriva o actúa automáticamente» | `SHARED_INTERFACE`; desacoplar FK semántica antes de producción |
| Crear tarea directa y gestionarla | Core | Decisión humana, resumen y assignee | Tarea/eventos | Toda mutación es humana | Medio | «Tarea humana trazable» | «SLA, ownership o cumplimiento institucional» | `CORE_KEEP`; DEC-017 |
| Accountability técnica | Core | Task/Event/roles actuales | Cadena e inconsistencias | Interpretación humana | Bajo-medio | «Reconstruye asignación técnica» | «Determina quién debía actuar» | `CORE_KEEP` |
| Evidencia de gobernanza | Core | Referencias y eventos existentes | Vista de integridad técnica | Lectura profesional | Bajo-medio | «Proyección read-only de evidencia técnica» | «Certifica cumplimiento, seguridad o MDR» | `CORE_KEEP` |
| Domicilio Seguro | Core documental; plantilla clínica gobernada aparte | Checklist y procedencia | Nueva versión informativa | Registro/revisión profesional | Medio-alto por contexto y falsa seguridad | «Organiza información para revisión» | «Domicilio seguro/certificado» | `CORE_DOCUMENT_CONTROL`; DEC-007 |
| SBAR preview | Módulo clínico documental separado; no Core assurance | Datos individuales y tareas | Narrativa SBAR determinista | Validación/redacción humana | Alto por síntesis para handoff | «Preview sintética, determinista y sin firma» | «Recomendación clínica», «SBAR validado/firmado» | `CLINICAL_CONTENT`; DEC-012 |
| Recurso de crisis | Fuera de Core assurance; servicio clínico local condicionado | Configuración oficial | Enlace visible/acción | Aprobación médica y verificación TI | Alto por consecuencia de error | «No configurado y deshabilitado» | Cualquier número o cobertura de urgencia no aprobados | `DISABLED`; DEC-010/011 |
| Auditoría y logs sanitizados | Core / servicio transversal | Metadatos técnicos | Evento/log minimizado | Gobierno y acceso humanos | Bajo como función aislada | «Auditoría técnica append-only» | «Historia clínica completa» o «prueba de conformidad» | `CORE_KEEP` |
| Conectores/FHIR/mensajería | Contrato futuro por módulo | No existe | No existe | Aprobación previa | No evaluable | «No implementado» | «Interoperable con HCE/FHIR» | `DEFERRED` |

## Contrato de separación

### Separación técnica

1. Core no importa el DSL, umbrales, inputs clínicos, evaluación, severidad ni
   explicación interna de Clinical Rules.
2. Clinical Rules no muta episodios, tareas, planes, tratamiento,
   comunicaciones, derivaciones, firmas o cierres de Core.
3. El único efecto permitido de Clinical Rules es publicar una solicitud de
   revisión inmutable e idempotente. La interfaz mínima debe declarar:
   `requestId`, `episodeId`, `moduleId`, `moduleVersion`, `ruleVersion`,
   `createdAt`, `status=REVIEW_REQUESTED`, referencia de procedencia y referencia
   a una explicación accesible solo a roles autorizados.
4. La interfaz no transporta una orden de tratamiento, diagnóstico, score de
   riesgo, destinatario clínico automático, deadline de Core ni texto clínico en
   auditoría. El responsable y plazo organizativos los define una política de
   Core aprobada o una persona autorizada, nunca la severidad clínica de entrada.
5. Core puede rechazar, poner en cuarentena o marcar inconsistente una solicitud,
   pero no reinterpretar sus datos clínicos.
6. La aceptación técnica de la solicitud no equivale a aceptación clínica. Una
   persona debe revisar el contenido antes de crear o resolver trabajo posterior.
7. Cada módulo tiene versionado, feature flags, tests, SBOM/configuración y
   release identificables. Desactivar Clinical Rules no impide que Core gestione
   compromisos humanos directos.
8. Los fallos son independientes y seguros: Clinical Rules caído no produce
   «sin riesgo»; Core caído no permite a Clinical Rules ejecutar una acción.
9. Identificadores y metadatos mínimos pueden compartirse; payload clínico,
   snapshots y explicaciones no se duplican en Core ni en logs.
10. Cualquier despliegue combinado debe evaluar interfaces, UI, ciberseguridad,
    usabilidad y dependencias del conjunto. Una separación de paquetes o procesos
    no excluye automáticamente a Core del alcance regulatorio relevante.

### Separación funcional

- Core responde: «¿qué compromiso se registró, quién consta como responsable,
  qué plazo se declaró y qué evidencia está o no registrada?».
- Clinical Rules responde, si se aprueba: «¿qué regla clínica versionada coincidió
  con qué inputs y por qué solicita revisión?».
- Core no responde: «¿qué significa clínicamente el dato?».
- Clinical Rules no responde: «¿se cumplió el circuito institucional?».
- La resolución de una tarea no resuelve un aviso; la revisión de un aviso no
  completa una obligación; una respuesta del paciente no prueba una actuación
  del equipo.

### Separación documental

Cada módulo debe disponer de forma separada de:

- finalidad prevista y exclusiones;
- usuarios, población, entorno y configuración;
- inventario de funciones y dependencias;
- claims y evidencia que los soporta;
- análisis de peligros y controles;
- requisitos, pruebas y criterios de liberación;
- instrucciones, limitaciones y gestión de cambios;
- decisión de cualificación/clasificación y versión de la evaluación.

Los documentos del conjunto deben describir además las interacciones. No se
puede usar el disclaimer de Core para neutralizar una finalidad médica real de
Clinical Rules ni presentar la revisión humana como sustituto de evidencia
clínica o evaluación de conformidad.

### Separación comercial y de presentación

- Nombre, SKU/entitlement, licencia, ficha comercial, demo, release notes y claims
  deben identificar qué módulo se ofrece y con qué estado regulatorio.
- Clinical Rules permanece deshabilitado y no contratable para uso real hasta su
  gate regulatorio, clínico e institucional.
- Una demo conjunta debe rotular ambos módulos y no presentar el flujo completo
  como capacidad aprobada de Core.
- La UI no mezcla «pendiente de evidencia» con aviso clínico, prioridad, riesgo o
  semáforo. Deben diferenciarse visual y semánticamente.
- Si los módulos se comercializan o usan como una combinación necesaria para una
  finalidad médica, se evaluará la configuración completa; el contrato no permite
  afirmar exclusión del host por mera separación comercial.

## Definición operativa de ausencia de evidencia

### Definición

`AUSENCIA_DE_EVIDENCIA` significa únicamente:

> Para una obligación explícita y una fecha de corte determinadas, Core no ha
> localizado en las fuentes autorizadas una evidencia registrada que satisfaga el
> tipo, la procedencia, la relación con el episodio y la ventana definidos por la
> versión aplicable de la política de circuito.

No significa automáticamente que la acción no ocurriera, que el paciente no
colaborara, que el equipo incumpliera, que exista deterioro, que el alta sea
insegura ni que proceda una actuación clínica.

La detección solo puede usar metadatos y relaciones verificables. No puede inferir
el compromiso desde notas, interpretar texto libre, valorar la calidad clínica de
la evidencia ni cerrar el caso automáticamente.

### Hechos que deben permanecer separados

| Hecho | Actor/origen | Qué demuestra | Qué no demuestra | Tratamiento por Core |
| --- | --- | --- | --- | --- |
| Acción del equipo | Profesional o sistema fuente autorizado | Que consta una actuación concreta con autor y tiempo | Que fue clínicamente correcta o eficaz | Vincular como evidencia candidata; revisión si la política exige validación humana |
| Respuesta del paciente | Paciente o canal autorizado | Que consta una respuesta/omisión explícita | Que el equipo ejecutó su compromiso; que la respuesta es clínicamente tranquilizadora | Conservar como hecho independiente; nunca usarla como sustituto automático de acción del equipo |
| Excepción válida | Persona autorizada bajo política versionada | Que el plazo o evidencia no aplican en ese caso y por qué categoría permitida | Que el compromiso se cumplió | Cerrar el pendiente registral como excepción, conservando autor, motivo codificado, versión y tiempo |
| Evidencia tardía | Fuente autorizada, registrada después del plazo | Que apareció una evidencia válida después de la fecha de corte | Que estaba disponible a tiempo; que no hubo impacto | Conservar la ausencia histórica y añadir `LATE_EVIDENCE_RECORDED`; enviar a revisión según política |
| Incumplimiento confirmado | Revisor humano autorizado | Que una persona determinó, con evidencia y motivo, el incumplimiento de una obligación definida | Diagnóstico, culpa, negligencia o necesidad automática de tratamiento | Estado humano explícito, apelable/corregible por nuevo evento; nunca inferido por el sistema |

### Secuencia permitida

1. Una persona autorizada registra un compromiso y declara responsable, plazo y
   evidencia esperada.
2. Core observa fuentes autorizadas hasta la fecha de corte.
3. Si encuentra evidencia compatible, muestra `EVIDENCE_RECORDED`; no valora su
   corrección clínica.
4. Si no la encuentra, muestra `EVIDENCE_NOT_RECORDED` y eleva revisión humana.
5. La persona revisora selecciona una de estas conclusiones: evidencia localizada,
   excepción válida, evidencia tardía, obligación corregida mediante nueva
   versión o incumplimiento confirmado.
6. Cada conclusión añade historia; ninguna reescribe el estado observado ni
   inicia automáticamente una acción clínica.

La taxonomía anterior es contractual y todavía no está implementada. No debe
añadirse al esquema hasta aprobar la frontera, la autoridad de cada decisión y
la política de conservación.

## Límites estrictos de Guardián Core

Core no puede, ni siquiera bajo configuración local:

- diagnosticar o sugerir un diagnóstico;
- predecir suicidio, autolesión, crisis, recaída, reingreso o deterioro;
- generar scores o estratificación clínica automática;
- clasificar riesgo o prioridad a partir de síntomas, cuestionarios o medicación;
- recomendar, iniciar, suspender o modificar tratamiento;
- decidir contacto, derivación, ingreso, alta, cierre, firma o escalado clínico;
- transformar la ausencia de evidencia en incumplimiento confirmado;
- tratar omisión/no respuesta del paciente como incumplimiento o señal clínica;
- usar una salida de Clinical Rules como orden de trabajo sin revisión humana;
- generar contenido clínico ausente, incluido SBAR;
- certificar seguridad del domicilio, cumplimiento, seguridad clínica o
  conformidad regulatoria.

## Lectura regulatoria preliminar por función real

### Principios aplicados

- El MDR define la finalidad prevista por lo declarado en etiqueta,
  instrucciones, material promocional/venta y evaluación clínica; el software con
  una finalidad médica específica puede ser producto sanitario, mientras el
  software de propósito general o meramente administrativo no lo es por ese solo
  uso sanitario.
- MDCG 2019-11 rev.1 (junio de 2025) exige analizar finalidad y función, no la
  ubicación del software. Distingue módulos administrativos de módulos que
  procesan datos para una finalidad médica y exige documentar interfaces y
  dependencias.
- La regla 11 del anexo VIII del MDR puede aplicar a software que proporciona
  información usada para decisiones diagnósticas o terapéuticas. La clase depende
  de la decisión apoyada y del impacto razonablemente posible de una decisión
  incorrecta.
- La revisión humana, la explicabilidad y el carácter determinista son controles
  relevantes, pero no son criterios de exclusión de la cualificación como MDSW.
- La ausencia de IA/ML significa que el motor actual no debe comercializarse como
  IA. No resuelve por sí sola la aplicabilidad del MDR.

### Resultado preliminar

**Guardián Core:** si su finalidad y función reales quedan limitadas a registrar,
transmitir, mostrar y verificar constancia de obligaciones organizativas sin
interpretar datos de salud para una finalidad médica, existe una base razonable
para evaluarlo como módulo no-MDSW de gestión del circuito. No es una conclusión.
Su dependencia funcional, de UI o de seguridad respecto de Clinical Rules podría
hacer que partes de Core deban incluirse en la descripción y evaluación del
conjunto.

**Clinical Rules actual:** procesa datos individuales con significado clínico y
puede señalar ideación autolítica, sueño/adherencia o conflicto familiar para
revisión profesional. Aunque los fixtures sean sintéticos y draft, esta función
es una candidata clara a evaluación como MDSW si se destina a apoyar prevención,
monitorización, diagnóstico o decisiones terapéuticas. No se asigna clase. La
posible aplicación de regla 11 y una eventual clase IIa, IIb o III solo pueden
resolverse tras definir exactamente la decisión apoyada y el daño potencial de
una salida errónea, especialmente en escenarios de autolesión.

**Otros módulos:** Plan de Seguridad, check-ins, Domicilio Seguro, SBAR y recurso
de crisis requieren análisis separado de finalidad y claims. Su carácter manual,
documental o informativo reduce ciertos riesgos, pero no permite excluirlos por
nombre o por disclaimer si su uso real persigue una finalidad médica.

### Fuentes oficiales consultadas

- [Reglamento (UE) 2017/745, versión consolidada vigente desde 1 de enero de 2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1643987580450&uri=CELEX%3A32017R0745).
- [MDCG 2019-11 rev.1 — Qualification and Classification of Software, junio de 2025](https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf).
- [AEMPS — guías nacionales y europeas de productos sanitarios](https://www.aemps.gob.es/productos-sanitarios/productos-sanitarios/guias-nacionales-y-europeas/).
- [AEMPS — procedimiento de consulta de cualificación y clasificación](https://www.aemps.gob.es/productos-sanitarios/consultas-relativas-a-la-cualificacion-y-clasificacion-de-productos-sanitarios-y-productos-sanitarios-de-diagnostico-in-vitro/).

Consulta realizada el 2026-07-31. Las guías MDCG no son jurídicamente vinculantes;
la interpretación definitiva del Derecho de la Unión corresponde al TJUE y la
decisión nacional debe tramitarse con la autoridad competente cuando proceda.

## Decisiones de arquitectura posteriores bloqueadas

No debe implementarse ninguno de los siguientes elementos hasta aprobar esta
frontera y documentar autoridad, intended purpose y gate regulatorio aplicable:

1. modelo o tabla de `Commitment`, `Obligation`, `Evidence` o `Compliance`;
2. deadline, SLA, overdue, prioridad, escalado o autoasignación de tareas;
3. detección automática de ausencia de evidencia o creación automática de tarea;
4. estado `NON_COMPLIANT`, cierre por excepción o resolución automática;
5. extracción de compromisos desde SBAR, informes, notas o texto libre;
6. uso de respuestas de check-in para decidir cumplimiento del equipo;
7. conexión directa `Clinical Rules → Task/Episode/Communication`;
8. habilitación del semáforo o conversión de severidad clínica en prioridad Core;
9. nuevos umbrales, reglas clínicas, cuestionarios o defaults;
10. cierre de episodio condicionado automáticamente por avisos o tareas;
11. SBAR automático, recomendación, firma, exportación o envío;
12. integración HCE/FHIR, mensajería, scheduler, worker u outbox para este flujo;
13. despliegue, licencia o claim comercial conjunto de Core + Clinical Rules;
14. uso con pacientes o datos reales, piloto o producción.

Se permiten mientras tanto correcciones documentales, pruebas negativas del
baseline, accesibilidad, seguridad que no cambie comportamiento y eliminación de
claims ambiguos. Cualquier rama funcional posterior debe citar la aprobación de
esta frontera y actualizar ADR, trazabilidad, riesgos, claims y pruebas.

## Cuestiones pendientes para asesor regulatorio y AEMPS

### Identidad del producto y operador

1. ¿Quién será fabricante, responsable del producto y propietario de cada
   intended purpose: proveedor, hospital o combinación?
2. ¿Core y Clinical Rules se pondrán a disposición por separado, juntos o como
   configuración inseparable?
3. ¿El uso será comercial, investigación, piloto, desarrollo interno o posible
   fabricación/uso `in-house` conforme al artículo 5.5 MDR?
4. ¿Qué entidad controla releases, configuración de reglas, vigilancia y cambios?

### Cualificación y clasificación

5. ¿La finalidad estrictamente registral de Core basta para considerarlo no-MDSW
   cuando eleva ausencias de constancia en episodios individuales?
6. ¿Crear una solicitud de revisión por ausencia de evidencia se considera mera
   gestión de proceso o información usada para una finalidad médica en el uso
   previsto concreto?
7. ¿Qué funciones de UI, autenticación, tareas y evidencia de Core son necesarias
   para el funcionamiento seguro de Clinical Rules y deben entrar en su alcance?
8. ¿Clinical Rules cumple la definición de MDSW con los inputs y outputs
   previstos? ¿Qué subregla de regla 11 corresponde a cada regla/indicación?
9. ¿Cuál es la peor consecuencia razonablemente previsible de falsos negativos,
   falsos positivos, abstenciones, retrasos y pérdida de procedencia, en especial
   para ideación autolítica?
10. ¿Deben Plan de Seguridad, check-in, Domicilio Seguro, SBAR o crisis tratarse
    como módulos con finalidad propia, accesorios o partes del conjunto?

### Evidencia, claims y cambios

11. ¿Qué evidencia clínica y de rendimiento necesita cada intended purpose y cada
    claim antes de validación/piloto?
12. ¿Qué wording exacto puede usarse para «verifica el circuito» y «ausencia de
    evidencia» sin insinuar cumplimiento clínico, prevención o mejora de outcomes?
13. ¿Qué cambios de regla, umbral, input, explicación, interfaz o población son
    cambios significativos que exigen reevaluación regulatoria?
14. ¿Qué documentación, PMS/vigilancia, QMS, gestión de riesgos, usabilidad,
    ciberseguridad y evaluación clínica aplican a cada configuración?
15. ¿Conviene presentar a AEMPS consultas separadas —una por Core y otra por
    Clinical Rules— dado que el procedimiento exige una consulta por producto?
16. ¿Qué evidencia de independencia técnica/comercial espera AEMPS para aceptar
    una frontera modular y qué combinación completa debe evaluarse igualmente?

### Datos y operación

17. ¿Qué fuentes constituyen evidencia autorizada y quién valida su suficiencia?
18. ¿Quién puede declarar excepción válida o incumplimiento confirmado y con qué
    mecanismo de corrección, apelación y auditoría?
19. ¿Cómo se tratan evidencia tardía, caída de fuentes, retraso de integración,
    zona horaria y reloj no confiable sin atribuir incumplimiento?
20. ¿Qué retención, minimización y separación de acceso aplican a obligaciones,
    evidencias, reglas, explicaciones y revisiones?

## Criterios de aceptación de la frontera antes de implementar

La frontera solo podrá pasar a `APPROVED_FOR_IMPLEMENTATION` cuando exista:

- intended purpose aprobado por versión para Core y para cada módulo Clinical
  Rules;
- dictamen regulatorio documentado y decisión sobre consulta AEMPS;
- catálogo de claims permitido/prohibido coherente en contrato, UI y ventas;
- ownership de fuentes y contrato de interfaz con fallo seguro;
- definición aprobada de compromiso, plazo, evidencia, excepción, evidencia
  tardía y decisión humana de incumplimiento;
- análisis de peligros del módulo y del conjunto, incluida dependencia de UI;
- pruebas de que Core no consume semántica clínica y Clinical Rules no ejecuta
  acciones Core;
- pruebas negativas de no diagnóstico, no scoring, no tratamiento y no decisión
  automática;
- estrategia de despliegue/configuración que identifique inequívocamente qué
  módulo está activo;
- actualización coordinada de ADR, arquitectura freeze, matriz de capacidades,
  trazabilidad, riesgo, documentación comercial y gate DEC-016.

## Evidencia de repositorio utilizada

La conclusión se apoya, entre otros, en:

- `prisma/schema.prisma` y las once migraciones;
- `src/domain/episode`, `src/domain/check-in`, `src/domain/alerts`,
  `src/domain/authorization`, `src/domain/workqueue`, `src/domain/governance`,
  `src/domain/safety-plan`, `src/domain/home-safety` y `src/domain/crisis`;
- casos de uso y ports correspondientes bajo `src/application`;
- rutas demo bajo `src/app/api` y componentes bajo `src/presentation`;
- fixtures sintéticos de reglas y seed;
- ADR-0001, ADR-0006 a ADR-0008 y ADR-0011 a ADR-0014;
- estado actual, ownership, freeze, capability matrix, claims register,
  product brief, clinical workflow, decision register y trazabilidad existentes.

La ausencia de una capacidad se comprobó también contra dependencias, rutas y
búsquedas de scheduler, worker, mensajería, FHIR, IA/ML, deadlines, SLA y
escalado. La inspección documental no sustituye pruebas de software ni una
evaluación regulatoria formal.
