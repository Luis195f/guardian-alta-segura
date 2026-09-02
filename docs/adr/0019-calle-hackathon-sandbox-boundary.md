# ADR-0019 — Excepción documental CALL-E para sandbox técnico del hackathon

- Estado: `IMPLEMENTED_DISABLED / REST_SANDBOX_ONLY / NO LIVE ENTRYPOINT`.
- Fecha: 2026-08-27; pivot REST C02 autorizado el 2026-08-29.
- Alcance: C01 documental, adapter REST técnico C02, core interno C03 y Patient
  Relay C04 exclusivamente local, determinista y sintético; solo permite
  revisión técnica y publicación como Draft PR, sin autorizar C05, C10,
  llamadas, Ready/merge, piloto ni producción.
- Autoridad: revisión humana del proyecto limitada a documentación; ninguna
  autoridad clínica, institucional, jurídica o regulatoria acreditada.
- Prerrequisito: `C00_PREREQUISITE = SATISFIED_BY_HUMAN_REVIEW` y
  `C00_REVIEW = ACCEPTED_FOR_C01_DOCUMENTATION_ONLY`.

## Contexto y evidencia

[ADR-0017](0017-future-communications-boundary.md) sigue siendo la frontera
neutral y futura de comunicaciones. Los registros legales sintéticos de GAS no
son una capacidad de entrega: `CommunicationChannel` no incluye voz y
`CommunicationPermission` no distingue `recipientKind`. C02 añade un port
neutral y un adapter REST técnico server-only, sin credencial, UI, route handler,
server action, scheduler, worker ni otro entrypoint ejecutable.

C03 añade únicamente el core interno tipado y desactivado de Continuity Relay.
El modelo canónico no contiene teléfono de voz autorizado, región, locale, Line
Region ni attestation institucional. Por ello el adapter de autoridad disponible
en runtime deniega siempre; solo las pruebas inyectan una policy y autoridad
sintéticas marcadas test-only. No se añade teléfono, canal de voz o permiso
inferido a `Patient`, `CommunicationPermission`, episodio o tarea.

C04 reutiliza ese core mediante un resolver y executor limitados al fixture demo
no productivo. Añade un entrypoint visible solo para Patient Relay sintético; no
conecta el adapter REST, no usa red CALL-E y rechaza el modo demo si el flag live
está activo o existe una API key. La autoridad, destino, teléfono sintético,
región, locale, Line Region, attestation, revisión y fingerprint se derivan y
revalidan server-side; el cliente no puede aportarlos.

C00 fue una inspección estática local del contrato de `@call-e/calle@0.6.0` y
fuentes públicas. Sus resultados contractuales son `STATIC_PROVIDER_PROBE =
DIVERGENT`, `LIVE_PROVIDER_PROBE = NOT_RUN` y `SPIKE_RESULT = DIVERGENT`.
La revisión humana aceptó esos estados antes de los anexos como cierre válido
solo para preparar C01. C00 permanece local, intacto, sin stage y no publicable;
no se incorporan su informe, anexos, código de prueba, rutas personales ni
hashes. La síntesis documental no acredita funcionamiento live, autenticación,
seguridad, entrega, comprensión ni validación clínica.

Las observaciones de versión y contrato siguientes corresponden al corte de
C00 del 27-08-2026, no a una garantía sobre versiones o documentación futuras.
Las referencias públicas y sus límites se conservan en el
[evidence index canónico](../audit/gas2-evidence-index.md#call-e-c01--evidencia-documental-y-limites).

### Pivot C02 a REST oficial

El primer intento C02 de incorporar `@call-e/calle@0.6.0` terminó
`BLOCKED_BY_LICENSE`: el tarball exacto no declaraba licencia ni incluía
`LICENSE`, y no se demostró permiso inequívoco para publicarlo como dependencia.
Esa conclusión histórica se conserva; la posible respuesta del proveedor sobre
licencia es un track paralelo. El SDK, su tarball y su código permanecen fuera
de `package.json`, lockfile y repositorio.

La decisión humana C02 del 29-08-2026 autoriza únicamente código original del
proyecto contra la API REST pública oficial. Se verificó estáticamente el
OpenAPI oficial 3.1.0, `info.version: 0.6.0`, descargado temporalmente desde
`https://docs.heycall-e.com/openapi/calle.openapi.yaml`: 63 998 bytes, SHA-256
`ccd47cc490afa12ef75d01c6c95be5c39a5051f0185dade886a8635d0f105ca5`,
consulta `2026-08-29T21:21:13.4674376+02:00`. El temporal se eliminó y no se
vendorizó. La superficie implementada se limita a `POST /v1/calls` y
`GET /v1/calls/{call_id}` con Bearer e `Idempotency-Key`; Goals, MCP, events,
batch, CLI, SDK y webhooks quedan excluidos.

## Decisión y niveles de frontera

```text
CORE GAS SINTÉTICO
→ SANDBOX TÉCNICO CALL-E PARA HACKATHON
→ DEMO PÚBLICA SINTÉTICA CON LIVE OFF
→ FUTURO PILOTO CLÍNICO: NO_GO
→ PRODUCCIÓN: NO_GO
```

Las flechas separan niveles y gates; no son un pipeline ejecutable ni una
autorización de avanzar entre ellos.

| Nivel | Alcance permitido por C01 | Gate que permanece |
| --- | --- | --- |
| Core GAS sintético | Documentación sobre el core existente, sin modificarlo | Sin IA generativa, ML, scoring probabilístico, chatbot terapéutico, geolocalización, wearables o FHIR clínico productivo |
| Sandbox técnico CALL-E | Port neutral, adapter REST server-only, persistencia técnica mínima y pruebas con transporte falso | `IMPLEMENTED_DISABLED / REST_SANDBOX_ONLY / NO LIVE ENTRYPOINT`; otra autorización humana y evidencia separada antes de cualquier llamada |
| Demo pública sintética | Describir la frontera y sus limitaciones | `LIVE OFF`; ninguna llamada real, secreto o número completo; no habilita exposición del runtime demo loopback a Internet |
| Futuro piloto clínico | Ninguno | `NO_GO`; DEC-016 y todas las decisiones aplicables pendientes |
| Producción y datos reales | Ninguno | `NO_GO`; evaluación y autorización independientes del hackathon |

La excepción no modifica el alcance clínico de GAS: no diagnostica, no predice
suicidio, no calcula riesgo individual, no prescribe ni modifica tratamientos,
no deriva, no cierra episodios y no sustituye juicio profesional. No autoriza
datos reales; publicar la rama como Draft PR aporta revisión técnica, no una
autorización operativa, clínica o institucional. Plan de Seguridad e historia
siguen append-only; Domicilio Seguro sigue siendo informativo; SBAR sigue
manual o determinista, sin datos inventados ni firma automática; el semáforo
permanece desactivado por defecto. Los recursos de crisis siguen sin destino
accionable mientras DEC-010/011 no se resuelvan.

CALL-E es un **proveedor externo no confiable para decisiones clínicas**.
Su voz o extracción generativa, si se evaluara posteriormente en el sandbox,
no se convierte en capacidad de IA del core, autoridad clínica ni excepción a
sus invariantes. C01 no demuestra aislamiento técnico futuro ni eficacia de
prompts como control. No se construye un motor de voz propio.

## Patient Relay y Professional Relay

Son capacidades distintas y no equivalentes. C03 tipa sus dos parejas internas;
C04 implementa únicamente un recorrido Patient Relay sintético y no productivo.
Professional Relay C05 permanece futuro y no implementado.

| Dimensión | Patient Relay | Professional Relay |
| --- | --- | --- |
| Finalidad | Ensayo sintético de contacto organizativo con rol de paciente | Ensayo sintético de contacto organizativo con rol profesional |
| Destinatario | `recipientKind` paciente, explícito y confirmado | `recipientKind` profesional, explícito y confirmado |
| Autoridad | Autorización específica por sujeto, finalidad y canal; no inferida de un episodio | Autoridad profesional, rol y relación vigentes; no heredada del permiso del paciente |
| Contenido | Allowlist y plantilla sintética propias, sin contenido clínico | Allowlist y plantilla sintética propias; no copiar notas, diagnósticos o SBAR |
| Resultado | Estado técnico minimizado pendiente de revisión humana | Estado técnico minimizado pendiente de revisión humana; no reasignación ni escalado automático |

Cuidador, representante y otros destinatarios quedan fuera. Un número de prueba
propio o autorizado no es una identidad clínica y debe permanecer fuera de Git
y de la persistencia de GAS. La futura autorización de ese contacto concreto
es independiente de cualquier permiso demo.

Toda decisión clínica permanece en una persona autorizada. `Alert`, `CheckIn`,
`CheckInOutcome`, `NonResponseEvent`, `Task`, `Commitment`, sus cambios o
vencimientos y cualquier resultado del proveedor tienen prohibido iniciar
llamadas automáticamente. No hay scheduler, worker, batch, fan-out, fallback de
canal ni segunda llamada automática por fallo, ausencia o incertidumbre.

## Core C03 de preview y confirmación, interno y no live

C03 implementa `RelayRecipientKind = PATIENT | PROFESSIONAL` y
`RelayPurpose = PATIENT_CALLBACK_OFFER | PROFESSIONAL_REVIEW_REQUEST`. Solo
acepta las parejas homónimas. El cliente no aporta destino, teléfono, región,
locale, Line Region, identidad, task o prompt libre. El port de autoridad recibe
actor autenticado y referencias opacas de episodio/tarea, y debe resolver una
relación canónica actual, específica y única; la implementación productiva
permanece deny-all porque esa fuente no existe en el modelo.

El preview no usa CALL-E ni red. Expone destino enmascarado, contexto opaco,
configuración derivada, contrato de task allowlisted/versionado, aviso de
crédito sin consulta de saldo/precio, ausencia de cancelación API, attestation,
fingerprint protegido, revisión, expiración de una policy obligatoria y
`providerContacted=false`. No existe TTL productivo por defecto;
`PENDING_LOCAL_DECISION` permanece abierto y las pruebas usan cinco minutos
solo bajo `TEST_ONLY_SYNTHETIC_RELAY_POLICY`.

La confirmación usa 256 bits CSPRNG, persiste solo SHA-256 del token de alta
entropía y vincula mediante HMAC server-only actor, target, tipo, finalidad,
episodio/tarea, destino efímero, región/locale/Line Region, task contract,
attestation y revisión. Revalida actor, RBAC, scope, autoridad, asignación,
attestation, target, fingerprint y revisión; un compare-and-set PostgreSQL
consume una vez antes de componer con C02. Replay, expiración, revocación,
cambio o carrera fallan sin POST.

`RelayAttempt/RelayEvent` representan solo
`PREVIEWED → CONFIRMED → PROVIDER_CREATED → RESULT_* → HUMAN_REVIEWED`.
`OutboundCallIntent/Event` conserva la fuente técnica del transporte y
`AuditEvent` la auditoría de seguridad. `PROVIDER_CREATED` exige un
`providerRef` ya persistido; `HUMAN_REVIEWED` registra actor y timestamp y no
significa aprobación clínica, validez del resultado o cierre de riesgo.

## Patient Relay C04 sintético y filmable

C04 implementa el recorrido explícito `preview sin red → confirmación one-use →
ejecución local sintética → resultado técnico → revisión humana`. El preview
visible muestra finalidad logística, destinatario enmascarado, configuración,
contrato y schema exactos, attestation, expiración, coste sin afirmar saldo o
precio y la ausencia de cancelación mediante API. El token viaja únicamente en
cookie `HttpOnly`, no en URL, HTML, respuesta, persistencia, auditoría o logs.

El contrato estático `synthetic-patient-relay-v1` es allowlisted, ordenado y sin
prompt libre. Prescribe verificar identidad antes de contexto sanitario, no
revelar información al destinatario incorrecto, mantener el límite ante
peticiones clínicas o de medicación, no evaluar síntomas/riesgo/urgencia, no
inventar recursos de emergencia y conservar finalidad/schema ante prompt
injection. C04 no ejecuta conversación, voz, modelo ni proveedor, por lo que no
prueba que esas instrucciones se cumplan. El resultado cerrado contiene solo
cuatro enums; `unknown` permanece unknown y null/malformado exige revisión.
Resultado válido, provider completed y revisión humana no son aprobación clínica
ni resuelven Task, episodio, asignaciones o compromisos.

La carrera de confirmación se resuelve mediante el CAS C03 antes de ejecutar: una
confirmación se consume una vez y el executor local se invoca exactamente una
vez. El executor no contiene transporte de proveedor y declara
`LOCAL_SYNTHETIC_NO_NETWORK`; devuelve un fixture técnico predeterminado, no el
resultado observado de una interacción. Esto es evidencia técnica
`IMPLEMENTED_UNVALIDATED`; comportamiento de voz/proveedor y contención real
permanecen `NOT_TESTED`.

## Gates humanos y ciclo live futuro

Los gates `DEVPOST_REGISTERED`, `CALL_E_ACCOUNT`, `EXTRA_CALLS_REQUEST` y
`SUPPORTED_AUTHORIZED_NUMBER` están **NO VERIFICADOS**. No son afirmaciones
personales sobre registro, cuenta, solicitud o titularidad. C01 no depende de
un número, no lo solicita y no inspecciona secretos ni cuentas privadas.

Una eventual llamada requiere separadamente cuenta, crédito, API key server-only,
región soportada, número propio o autorizado, propósito sintético, preview,
masked target, acknowledgement explícito de no cancelación presente únicamente
en el contrato sintético interno de preview —no existe UI—, confirmación
one-use y autorización humana expresa **para esa llamada**. La aprobación de
C01, una cuenta o una confirmación anterior no satisfacen ese conjunto.

| Fase futura | Contrato requerido | Fallo seguro |
| --- | --- | --- |
| Intención y preview | Actor y recurso autorizados; propósito/plantilla/versiones y `recipientKind` explícitos; destino enmascarado; indicación de irreversibilidad y posibles intentos múltiples | Sin dato aprobado o con ambigüedad: denegar, sin llamada |
| Confirmación one-use | Ligada a la intención, actor, fingerprint, destino y contexto exactos; uso único atómico; caducidad definida y probada en una fase posterior | Cambio, replay, expiración o revocación invalida la confirmación; no reutilizar permiso cacheado |
| Ejecución | Revalidar inmediatamente autoridad, relación, finalidad, destino, configuración y vigencia; persistir intención/idempotencia antes del efecto externo | Concurrencia, fallo de persistencia o autorización incierta: no crear nueva tarea externa |
| Resultado técnico | Distinguir estado del proveedor de estado GAS; validar y minimizar en memoria; no conservar Call completo | Timeout, error, respuesta inválida o nula no demuestran ausencia de llamada ni normalidad |
| Revisión humana | Acción separada por persona autorizada; referencia y timestamps mínimos, sin contenido clínico | No resolver Task, episodio o compromiso ni disparar derivación/comunicación automáticamente |

Revocación o desactivación impide nuevos intentos dentro de su alcance; no
borra historia ni garantiza detener una tarea ya aceptada por el proveedor.
Las mutaciones críticas futuras deben dejar `AuditEvent` inmutable y minimizado,
con coherencia transaccional local. El efecto externo no puede incluirse en una
transacción PostgreSQL: fallos entre aceptación y persistencia requieren
reconciliación, no suponer rollback de la llamada.

## Decisiones técnicas derivadas de C00 y del OpenAPI REST C02

### Versión y licencia

`@call-e/calle@0.6.0` permanece **prohibido** mientras su cobertura de licencia
y permiso de publicación no se aclaren. No se instala, copia, distribuye ni
vendoriza; no se usan `latest`, `beta`, `0.7.0`, deep imports ni código interno.
Una reevaluación del SDK exige una fase y decisión humana separadas. C02 usa
`fetch` de plataforma contra el contrato REST oficial verificado; esto no
resuelve por inferencia la licencia del SDK ni constituye interpretación
jurídica definitiva de los términos del servicio.

### Intención, idempotencia y reconciliación

```text
reservar intención + idempotencyRef + fingerprint HMAC server-only
→ POST /v1/calls con Idempotency-Key
→ validar id y estado mínimos
→ persistir call.id inmediatamente como providerRef
→ polling por GET /v1/calls/{call_id}
→ GET final ante timeout o incertidumbre posterior
→ estado técnico minimizado; revisión humana futura
```

El adapter no implementa el helper SDK de creación y espera. `providerRef`
identifica `call.id`, no un intento físico. La reserva y el claim local atómico
permiten como máximo un POST por `idempotencyRef` y fingerprint: misma referencia
con fingerprint distinto es conflicto; timeout, conexión incierta o fallo tras
POST nunca provocan otro POST. Sin `providerRef` queda revisión futura, no una
recreación. TTL, scope y garantías del proveedor no se presumen.

Nunca interpretar timeout como “no hubo llamada”. El fingerprint se deriva con
HMAC-SHA-256 y clave server-only de al menos 32 bytes sobre la entrada canónica;
no se guarda un hash simple enumerable del teléfono. Se conservan solo la
referencia de idempotencia, fingerprint protegido, `providerRef`, estados/códigos
técnicos y timestamps mínimos. La brecha entre aceptación externa y persistencia
local no queda eliminada: un fallo en ese punto marca incertidumbre y revisión.

### Destinatario e intentos

El REST verificado requiere `recipients`; C02 construye exactamente un elemento
con `phones` de exactamente un elemento, `region` y `locale` explícitos. Deniega
arrays vacíos, cardinalidad mayor de uno, propiedades adicionales, task fuera de
allowlist, E.164 inválido y destino inferido. Batch y fan-out quedan prohibidos.

Un destinatario no equivale a un único marcado físico: `attempts` puede contener
múltiples intentos y no existe `maxAttempts` en el contrato inspeccionado. El
contrato de exactamente un marcado permanece pendiente de aclaración con el
proveedor; no se promete ni se presume para una futura llamada.

### Regiones, idiomas y línea

En la lista verificada por C00 el 27-08-2026, España figuraba como `ES`, `+34`,
español/inglés y `Line Region=International`; Chile no figuraba. Es una observación
fechada, no configuración definitiva ni prueba de imposibilidad permanente para
Chile. La lista es mutable: una futura allowlist necesita fuente, `verifiedAt`,
versión y revisión humana. Locale no equivale a idioma/region aprobados.

Soporte regional no acredita autorización del número, cuenta, carrier, crédito
ni éxito live. No introducir números completos en Git. No adoptar valores de
región, locale o Line Region por defecto sin decisión local.

### Webhooks

**No implementar webhooks en C02.** Las entregas actuales del contrato
inspeccionado no tienen firma criptográfica. `CALL-E-Event-Id` aporta solo
consistencia/deduplicación, no autenticidad. Los helpers `verify/unwrap`
deprecados corresponden al contrato legado y no validan las entregas actuales.

Cualquier diseño posterior debe tratar el webhook como entrada pública no
confiable y reconciliar con GET autenticado y binding local antes de un efecto
sensible. Ese GET tampoco autoriza una decisión clínica o comunicación.

### Resultados y errores

`resultValidation` no existe en el contrato inspeccionado. `structuredResult`
puede ser `null`; no inventar su motivo exacto ni convertirlo en éxito, fallo
clínico o ausencia de riesgo. `taskCompleted`, `completionConfidence`, `evidence`,
summary y resultado estructurado no son evidencia clínica ni autorización.

Ningún resultado puede cerrar tareas, resolver episodios, generar derivaciones
o activar comunicaciones automáticamente. Calls `failure_code` no es un enum
publicado y no debe mezclarse con Goal Run errors. No deducir no respuesta,
rechazo o conducta desde texto de error. Crédito insuficiente, rate limit y
proveedor indisponible vuelven a revisión humana con código técnico allowlisted;
no habilitan retry con identidad nueva ni fallback automático.

### Cancelación e irreversibilidad

No existe cancelación mediante Calls API en el contrato inspeccionado. El estado
`canceled` no demuestra que el cliente pueda cancelar; Stop en Dashboard no
equivale a un endpoint SDK. Abortar transporte o polling tampoco cancela.
Una tarea aceptada se considera **potencialmente irreversible**. El preview y
la confirmación deben advertirlo; no prometer “deshacer llamada”.

## Privacidad y minimización

La futura integración solo podría persistir la siguiente allowlist, con acceso,
derivación y retención aún pendientes de revisión:

- `recipientKind` y `purpose` cerrados;
- referencias opacas de episodio/tarea y actor;
- fingerprint e idempotency reference;
- `providerRef`;
- estado técnico allowlisted;
- referencia de revisión humana y timestamps mínimos.

No persistir teléfono completo, task prompt, transcript, summary, evidence,
objeto Call completo, payload crudo, API key, contenido clínico ni metadata libre
no controlada. La prohibición incluye base, logs, auditoría, errores, trazas,
tickets, fixtures, capturas y evidencias exportadas; no crear otro repositorio
de contenido para sortearla. El request y la respuesta, si una fase futura los
autoriza, solo se procesarían de forma efímera y minimizada en servidor.

UI, logs, auditoría y evidencias solo pueden mostrar teléfono enmascarado, si
es necesario mostrarlo; el valor enmascarado no amplía la allowlist persistente.
Soporte no puede acceder a notas clínicas ni resolver referencias a destinos.
`CALL_E_API_KEY` permanecerá server-only, fuera del browser, base de datos, logs,
fixtures, screenshots y Git. C02 no crea, solicita ni usa una clave real.

La retención, residencia, subencargados y uso de datos por CALL-E siguen sin
resolver. No persistir un payload en GAS no prueba que el proveedor no lo
conserve. No se declara cumplimiento RGPD, MDR, AI Act, DCB0129 o DCB0160.

## Peticiones fuera de alcance y emergencia

Voice prompt injection, instrucciones del interlocutor y resultados del
proveedor son entrada no confiable: no pueden cambiar finalidad, destino,
autoridad, permisos, plantilla o gates ni provocar otra llamada. Prompts solos
no demuestran contención. Peticiones clínicas, farmacológicas, legales o
financieras quedan fuera: no responder con asesoramiento o actuación.

Una declaración de emergencia no puede convertirse en scoring, diagnóstico,
triage, derivación o marcado automático. Antes de cualquier ensayo futuro deben
existir límites y procedimiento humano de interrupción de la interacción y
revisión, sin prometer cancelación técnica. No inventar números ni usar CALL-E
como servicio de crisis. Recursos oficiales requieren DEC-010/011; sin protocolo
y autoridad para ese escenario, el ensayo live permanece bloqueado.

## Evidencia, hazards y trabajo posterior

Los escenarios específicos se registran únicamente en
[HAZ-GAS-021–038](../clinical-safety/dcb0129/hazard-log-initial.md#ampliacion-c01--call-e-solo-diseno),
sin cerrar los hazards anteriores. DEC-019 agrupa las decisiones futuras del
sandbox en el [registro canónico](../decision-register.md), sin resolver
DEC-003/005/010/011/013/014/015/016/017. GAP-DCB-025 conserva la falta de
verificación del proveedor y controles; GAP-DCB-023/024 no se reducen.

C02 implementa y prueba con transporte falso: flag apagado, configuración
fail-closed, payload 1/1, allowlist, HMAC, claim concurrente, `providerRef` antes
del primer GET, reconciliación GET, cero segundo POST, mapper mínimo, abstención,
errores sanitizados, red bloqueada y superficies prohibidas ausentes. Son
controles `IMPLEMENTED_UNVALIDATED`: no prueban proveedor live, número de intentos
físicos, contención de voz, autorización de destinatario, eficacia clínica ni
operación. C03 prueba preview, confirmación one-use, revalidación, lifecycle y
persistencia minimizada del core interno, pero no implementa la fuente real de
autoridad, Patient/Professional Relay completos, contención de voz, policy
productiva ni ningún entrypoint. Esos elementos quedan para decisiones y fases
separadas.

## Claim máximo permitido

> Se ha implementado un adapter REST server-only y desactivado para una futura
> evaluación CALL-E exclusivamente sintética. No existe entrypoint live, no se
> incorporó el SDK y no se ejecutaron llamadas. No autoriza uso clínico, piloto
> ni producción.

> Se ha implementado y probado un core interno C03 de autoridad tipada, preview
> sin red, confirmación one-use y lifecycle auditable usando únicamente policies,
> destinos y transporte sintéticos. La resolución productiva de destinatario
> permanece deny-all y no existen relays completos ni entrypoint.

`CALL_E_RUNTIME = IMPLEMENTED_DISABLED`, `LIVE_ENTRYPOINT = ABSENT`,
`LIVE_CALLS = NOT_EXECUTED`,
`REAL_CLINICAL_PILOT = NO_GO`, `REAL_DATA_PRODUCTION = NO_GO` y
`RESIDUAL_RISK_ACCEPTANCE = NONE`. La publicación de C03 se limita a rama y
Draft PR para revisión humana; no marca Ready, no fusiona ni inicia C04/C05/C10.
