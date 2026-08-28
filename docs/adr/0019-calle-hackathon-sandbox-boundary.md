# ADR-0019 — Excepción documental CALL-E para sandbox técnico del hackathon

- Estado: `DOCUMENTED_ONLY / RUNTIME NOT_IMPLEMENTED`.
- Fecha: 2026-08-27.
- Alcance: C01 exclusivamente documental; no autoriza C02, C10, instalación,
  configuración, llamadas, publicación, piloto ni producción.
- Autoridad: revisión humana del proyecto limitada a documentación; ninguna
  autoridad clínica, institucional, jurídica o regulatoria acreditada.
- Prerrequisito: `C00_PREREQUISITE = SATISFIED_BY_HUMAN_REVIEW` y
  `C00_REVIEW = ACCEPTED_FOR_C01_DOCUMENTATION_ONLY`.

## Contexto y evidencia

[ADR-0017](0017-future-communications-boundary.md) sigue siendo la frontera
neutral y futura de comunicaciones. Los registros legales sintéticos de GAS no
son una capacidad de entrega: `CommunicationChannel` no incluye voz,
`CommunicationPermission` no distingue `recipientKind` y no existe adapter,
credencial, UI ni ruta CALL-E. C01 no cambia esos hechos.

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
| Sandbox técnico CALL-E | Documentar una evaluación futura aislada del proveedor | Runtime `NOT_IMPLEMENTED`; otra autorización humana y evidencia específica antes de C02 o cualquier llamada |
| Demo pública sintética | Describir la frontera y sus limitaciones | `LIVE OFF`; ninguna llamada real, secreto o número completo; no habilita exposición del runtime demo loopback a Internet |
| Futuro piloto clínico | Ninguno | `NO_GO`; DEC-016 y todas las decisiones aplicables pendientes |
| Producción y datos reales | Ninguno | `NO_GO`; evaluación y autorización independientes del hackathon |

La excepción no modifica el alcance clínico de GAS: no diagnostica, no predice
suicidio, no calcula riesgo individual, no prescribe ni modifica tratamientos,
no deriva, no cierra episodios y no sustituye juicio profesional. No autoriza
datos reales ni la publicación de esta rama. Plan de Seguridad e historia
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

Son capacidades futuras de continuidad organizativa, distintas y no
equivalentes. Los nombres no describen funciones ya implementadas.

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

## Gates humanos y ciclo futuro, no implementado

Los gates `DEVPOST_REGISTERED`, `CALL_E_ACCOUNT`, `EXTRA_CALLS_REQUEST` y
`SUPPORTED_AUTHORIZED_NUMBER` están **NO VERIFICADOS**. No son afirmaciones
personales sobre registro, cuenta, solicitud o titularidad. C01 no depende de
un número, no lo solicita y no inspecciona secretos ni cuentas privadas.

Una eventual llamada requiere separadamente cuenta, crédito, API key server-only,
región soportada, número propio o autorizado, propósito sintético, preview,
masked target, acknowledgement explícito de no cancelación, confirmación
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

## Decisiones técnicas derivadas de C00

### Versión y licencia

`@call-e/calle@0.6.0` es únicamente el **candidato exacto para C02**, la versión
inspeccionada; no se declara “versión estable oficial”. No se instala en C01.
No se usarán `latest`, `beta`, caret ni rangos; `0.7.0` no está adoptada. Cambiar
versión exige decisión humana y nuevo provider probe. Licencia y términos del
paquete distribuido permanecen pendientes **antes de publicar C02**; existencia
en un registry no concede por sí sola derechos de incorporación o distribución.

### Intención, idempotencia y reconciliación

```text
persistir intención + idempotency key + fingerprint
→ create
→ persistir Call.id inmediatamente como providerRef
→ waitForResult
→ get ante timeout o incertidumbre
→ revisión humana
```

No usar `createAndWait` en una futura ruta live: no permite persistir el ID
intermedio antes de esperar. `providerRef` identifica `Call.id`, no un ID de
intento físico. Nunca crear una segunda tarea para reconciliar incertidumbre.
Si no se conoce `Call.id`, solo cabría replay de la **misma idempotency key y
mismo request** bajo un contrato futuro probado y con gates vigentes. Sin ese
contrato, queda bloqueado para revisión humana. TTL, scope, carreras y garantías
del proveedor no están probados; no se heredan de Goal Runs.

Nunca interpretar timeout como “no hubo llamada”. La prohibición de persistir
teléfono/prompt exige diseñar en otra fase cómo verificar o reconstruir el mismo
request sin guardarlo: referencias opacas, plantilla versionada y entrada efímera
autorizada son candidatos, no una solución aprobada. Si no puede demostrarse la
igualdad sin conservar datos prohibidos, no se hace replay. Un fingerprint de
teléfono de baja entropía no garantiza anonimización; derivación, protección y
no reversibilidad por soporte quedan pendientes.

### Destinatario e intentos

Preferir `recipient` singular con `phone` singular. Exigir validación local
futura XOR de `recipient/recipients` y de `phone/phones`, y cardinalidad
normalizada máxima de **un destinatario y un teléfono por intención**. Denegar
arrays vacíos, formas ambiguas y destinatarios inferidos del prompt. Batch y
fan-out quedan prohibidos.

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
`CALLE_API_KEY` permanecerá server-only, fuera del browser, base de datos, logs,
fixtures, screenshots y Git. C01 no crea ni busca la clave.

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

Una fase posterior autorizada necesitaría pruebas negativas de gates y
revocación, consumo one-use concurrente, persistencia antes/después del efecto
externo, timeout sin ID y con ID, replay exacto, XOR/cardinalidad, aislamiento
paciente/profesional, resultados nulos/malformados, sanitización de todos los
sinks, no automatización, prompt injection y demo con live desactivado. Ese plan
está `NOT_IMPLEMENTED`; las suites actuales de GAS no lo validan.

## Claim máximo permitido

> Se ha documentado una frontera acotada para evaluar una futura integración
> CALL-E exclusivamente en sandbox técnico del hackathon, con datos sintéticos,
> llamadas públicas desactivadas y revisión humana. La integración no está
> implementada y no autoriza uso clínico, piloto ni producción.

`CALL_E_RUNTIME = NOT_IMPLEMENTED`, `LIVE_CALLS = NOT_EXECUTED`,
`REAL_CLINICAL_PILOT = NO_GO`, `REAL_DATA_PRODUCTION = NO_GO` y
`RESIDUAL_RISK_ACCEPTANCE = NONE`. C01 se detiene para revisión humana sin
publicar ni comenzar C02/C10.
