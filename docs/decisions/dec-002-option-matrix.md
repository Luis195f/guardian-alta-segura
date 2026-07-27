# DEC-002 — Matriz neutral de opciones

## Uso

Esta matriz presenta alternativas para decisión institucional. Ninguna opción
está recomendada, preseleccionada o aprobada. `DEC-002-A` a `DEC-002-N` son
identificadores internos de trabajo dentro de DEC-002, no decisiones canónicas
independientes.

Seleccionar una opción en esta matriz no cambia
`Canonical DEC-002 status = Pendiente` ni autoriza especificación o
implementación.

Leyenda de soporte actual:

- `SUPPORTED`: el modelo actual puede representar el hecho técnico, sin aportar
  semántica institucional;
- `PARTIAL`: existe parte del contrato, pero falta política, lifecycle o
  evidencia;
- `ABSENT`: el concepto no existe;
- `CONDITIONAL`: depende de las opciones seleccionadas.

## Matriz

| ID | QUESTION | OPTION | CURRENT TECHNICAL SUPPORT | CLINICAL POLICY REQUIRED | CODE IMPACT | SCHEMA IMPACT | CONCURRENCY IMPACT | SAFETY RISK | AUDIT IMPACT | AUTHORITY | EVIDENCE REQUIRED |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-002-A | ¿Qué significa `programLengthDays`? | A1. Ventana administrativa definida por protocolo | `PARTIAL`: se almacena 30/60/90 | Sí; significado, scope y límites | Documental o dominio según uso futuro | Ninguno si se mantienen valores | Bajo; aumenta si condiciona cierre | Confundir ventana con pronóstico | Registrar policy/version si gobierna acciones | Dirección Médica | Protocolo versionado, definiciones y scope |
| DEC-002-A | ¿Qué significa `programLengthDays`? | A2. Ventana de seguimiento definida por protocolo | `PARTIAL` | Sí; no equivale a recuperación | Dominio/UI según presentación | Ninguno si se mantienen valores | Bajo; aumenta si genera fechas | Presentarla como duración clínica necesaria | Referencia de policy y selección | Dirección Médica | Protocolo, ejemplos sintéticos y exclusiones |
| DEC-002-A | ¿Qué valores se admiten? | A3. Conservar 30/60/90 | `SUPPORTED` técnicamente | Sí; justificación y alcance | Bajo | Ninguno | Bajo | Legitimar constantes sin evidencia | Evidencia de versión aplicable | Dirección Médica | Aprobación expresa de los tres valores |
| DEC-002-A | ¿Qué valores se admiten? | A4. Catálogo distinto o ampliado | `ABSENT` | Sí | Alto | `MIGRATION_CANDIDATE` | Medio durante migración/compatibilidad | Valores históricos ambiguos | Versiones, cambio y aplicación histórica | Dirección Médica | Catálogo, mapping y tratamiento histórico |
| DEC-002-B | ¿Quién selecciona duración? | B1. Selección humana por rol institucional aprobado | `PARTIAL`: actor técnico envía el valor | Sí; rol, scope y separación de funciones | Dominio/API/UI | Puede no requerir cambio | Validar rol dentro de la mutación | Rol técnico confundido con autoridad clínica | Actor, rol, policy y resultado | Dirección Médica | Matriz institucional y procedimiento |
| DEC-002-B | ¿Quién selecciona duración? | B2. Decisión de equipo con registro de autoridad | `ABSENT` | Sí | Alto | `SCHEMA_CANDIDATE` o evento | Requiere diseño de aprobación concurrente | Atribución o consenso ficticios | Solicitud, aprobación y evidencia | Dirección Médica | Workflow, roles y evidencia formal |
| DEC-002-B | ¿Quién selecciona duración? | B3. Otra autoridad/mecanismo aprobado | `ABSENT` | Sí | Por evaluar | Por evaluar | Por evaluar | Autoridad no verificable | Por evaluar | Dirección Médica | Especificación institucional completa |
| DEC-002-C | ¿Cómo se selecciona? | C1. Selección manual explícita obligatoria | `SUPPORTED` como mecánica actual | Sí; criterios y actor | Bajo/medio | Ninguno | Idempotencia y versión existentes en creación | Selección arbitraria o presentada como recomendación | Actor, valor, policy y evidencia | Dirección Médica | Criterios, formación y ejemplos sintéticos |
| DEC-002-C | ¿Cómo se selecciona? | C2. Regla determinista derivada de protocolo | `ABSENT` | Sí; inputs, abstención y override humano | Alto | Policy/versionado candidatos | Snapshot/policy consistentes con creación | Regla convertida en pronóstico o scoring | Inputs minimizados, versión, resultado y actor | Dirección Médica | Algoritmo determinista aprobado y pruebas |
| DEC-002-C | ¿Cómo se selecciona? | C3. Otro mecanismo institucional aprobado | `ABSENT` | Sí | Por evaluar | Por evaluar | Por evaluar | Inferencia clínica no controlada | Por evaluar | Dirección Médica | Contrato reproducible y prohibiciones |
| DEC-002-D | ¿Puede cambiar la duración tras activar? | D1. Inmutable tras crear | `SUPPORTED` por ausencia de operación | Sí; tratamiento de errores | Bajo | Ninguno | Bajo | Mantener valor incorrecto sin vía gobernada | Registrar decisión y, si aplica, nuevo episodio | Dirección Médica | Procedimiento de corrección/excepción |
| DEC-002-D | ¿Puede cambiar la duración tras activar? | D2. Cambio humano versionado y motivado | `ABSENT` | Sí | Alto | `SCHEMA_CANDIDATE` o evento | `CONCURRENCY_DESIGN_REQUIRED` | Cambio retrospectivo o pérdida de historia | Antes/después, actor, motivo, policy | Dirección Médica | Actores, motivos, alcance y vigencia |
| DEC-002-D | ¿Puede cambiar la duración tras activar? | D3. Solo ampliación o solo reducción bajo regla aprobada | `ABSENT` | Sí | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Regla asimétrica sin base clínica | Regla, excepción y versión | Dirección Médica | Justificación, límites y ejemplos |
| DEC-002-E | ¿Quién solicita, autoriza y ejecuta cierre? | E1. Una acción humana con un rol autorizado | `PARTIAL`: actor responsable intenta transición | Sí; rol y scope | Dominio/API/UI | Puede no requerir cambio | `CONCURRENCY_DESIGN_REQUIRED` | Autoridad insuficiente o conflicto de función | Actor, rol, policy, decisión y mutación | Dirección Médica | Matriz y procedimiento aprobados |
| DEC-002-E | ¿Quién solicita, autoriza y ejecuta cierre? | E2. Solicitud y aprobación separadas | `ABSENT` | Sí | Alto | `SCHEMA_CANDIDATE` o eventos | `CONCURRENCY_DESIGN_REQUIRED` | Aprobación obsoleta frente a obligaciones nuevas | Solicitud/aprobación/ejecución separadas | Dirección Médica | Segregación, vigencia y excepciones |
| DEC-002-E | ¿Quién solicita, autoriza y ejecuta cierre? | E3. Doble validación u otro mecanismo | `ABSENT` | Sí | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Doble click sin revisión real | Evidencia de cada paso y orden | Dirección Médica | Workflow institucional completo |
| DEC-002-F | ¿Qué motivos son admisibles? | F1. Catálogo institucional versionado | `PARTIAL`: existe texto libre obligatorio | Sí | Dominio/API/UI | `SCHEMA_CANDIDATE` | Bajo/medio si se valida dentro de cierre | Catálogo ambiguo o usado como outcome clínico | Código, versión y texto libre minimizado si procede | Dirección Médica | Catálogo, definiciones y vigencia |
| DEC-002-F | ¿Qué motivos son admisibles? | F2. Motivo estructurado + detalle opcional controlado | `PARTIAL` | Sí | Dominio/API/UI | Candidato | Bajo/medio | Captura excesiva o PHI en motivo | Evitar copiar detalle a logs/auditoría | Dirección Médica; consulta privacidad si aplica | Campos, finalidad y retención |
| DEC-002-F | ¿Qué motivos son admisibles? | F3. `CUSTOM_OPTION` | `ABSENT` | Sí | Por evaluar | Por evaluar | Por evaluar | Motivo no interpretable | Por evaluar | Dirección Médica | Definición completa |
| DEC-002-G | ¿Qué condiciones bloquean, avisan o admiten override? | G1. Lista aprobada de blockers sin override | `PARTIAL`: blockers técnicos visibles | Sí | Dominio | Posiblemente ninguno | `CONCURRENCY_DESIGN_REQUIRED` | Tratar blocker técnico como juicio clínico | Policy, facts, resultado y actor | Dirección Médica | Tabla condición/efecto/evidencia |
| DEC-002-G | ¿Qué condiciones bloquean, avisan o admiten override? | G2. Blockers + warnings diferenciados | `PARTIAL` | Sí | Dominio/UI | Posiblemente ninguno | `CONCURRENCY_DESIGN_REQUIRED` | Warning minimizado o ignorado sin revisión | Resultado, acknowledgement y policy | Dirección Médica | Definiciones y manejo humano |
| DEC-002-G | ¿Qué condiciones bloquean, avisan o admiten override? | G3. Condiciones con override gobernado | `ABSENT` | Sí, junto con DEC-002-M | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Override normalizado o silencioso | Solicitud, aprobación, motivo, vigencia | Dirección Médica | Policy de override y evidencia |
| DEC-002-H | ¿Qué estados de Alert son compatibles con cierre? | H1. Ningún aviso no terminal es compatible | `PARTIAL`: hoy se publican y bloquean técnicamente | Sí | Dominio | Ninguno si basta estado | `CONCURRENCY_DESIGN_REQUIRED` | Confundir estado administrativo con resolución clínica | IDs/estados/versiones de policy | Dirección Médica | Protocolo y definición de estados |
| DEC-002-H | ¿Qué estados de Alert son compatibles con cierre? | H2. Compatibilidad por estado/categoría con documentación adicional | `ABSENT` para categorías de cierre | Sí | Alto | `SCHEMA_CANDIDATE` si falta categoría | `CONCURRENCY_DESIGN_REQUIRED` | Permitir cierre por etiqueta mal definida | Estado, categoría, evidence ref y actor | Dirección Médica | Matriz de compatibilidad y pruebas |
| DEC-002-H | ¿Qué estados de Alert son compatibles con cierre? | H3. Otro mecanismo aprobado | `ABSENT` | Sí | Por evaluar | Por evaluar | `CONCURRENCY_DESIGN_REQUIRED` | Aviso ignorado o resuelto por inferencia | Por evaluar | Dirección Médica | Contrato y evidencia |
| DEC-002-I | ¿Qué efecto tiene una Task abierta? | I1. Toda Task abierta bloquea | `PARTIAL`: hoy se publica y bloquea técnicamente | Sí | Dominio | Ninguno si basta estado | `CONCURRENCY_DESIGN_REQUIRED` | Equiparar toda tarea con obligación clínica | IDs/revision/policy | Dirección Médica; dependencia DEC-017 | Protocolo y relación con tareas |
| DEC-002-I | ¿Qué efecto tiene una Task abierta? | I2. Bloqueo según categoría/assignment/estado operativo aprobado | `ABSENT` | Sí; puede depender de DEC-017 | Alto | `SCHEMA_CANDIDATE` | `CONCURRENCY_DESIGN_REQUIRED` | Regla depende de SLA/categoría no aprobados | Facts, policy versions y decisión | Dirección Médica; DEC-017 según dimensión | DEC-002 + evidencia DEC-017 aplicable |
| DEC-002-I | ¿Qué efecto tiene una Task abierta? | I3. Transferencia documentada compatible con cierre | `PARTIAL`: reassignment existe, transferencia de episodio no | Sí | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Pérdida de ownership o doble responsabilidad | Origen, destino, aceptación y cierre | Dirección Médica; Dirección de Enfermería consultiva | Procedimiento de handoff |
| DEC-002-J | ¿Qué ocurre ante `INCONSISTENT`? | J0. `NON_OVERRIDABLE_TECHNICAL_FAIL_CLOSED` — invariant, no opción seleccionable | `SUPPORTED` como detección/fallo cerrado técnico | No; no es clinical policy | Hardening técnico futuro y revisión arquitectónica formal | No decidido | `CONCURRENCY_DESIGN_REQUIRED` | Silent clinical override de una contradicción conocida | Issues, correlation ID, corrección y nueva evaluación | No aplica como policy clínica; no seleccionable por Dirección Médica | Evidencia de corrección y vista coherente |
| DEC-002-J | ¿Cómo tratar `COMPLETE/PARTIAL`? | J1. Tratamiento institucional documentado sin equivalencia `SAFE/UNSAFE` | `PARTIAL` | Sí | Dominio/UI según policy | Posiblemente ninguno | `CONCURRENCY_DESIGN_REQUIRED` si afecta cierre | Convertir integridad en permiso o riesgo clínico | Estado, revisión humana y policy | Dirección Médica | Matriz por estado e instrucciones |
| DEC-002-J | ¿Cómo tratar `UNAVAILABLE/NOT_APPLICABLE`? | J2. Workflow institucional documentado sin denegación clínica automática | `PARTIAL` | Sí | Dominio/UI según policy | Posiblemente ninguno | `CONCURRENCY_DESIGN_REQUIRED` si afecta cierre | Inventar evidencia o confundir ausencia con conclusión clínica | Estado, limitación, revisión y policy | Dirección Médica | Tratamiento, evidencia y límites |
| DEC-002-K | ¿Cuándo puede producirse cierre? | K1. Fin de duración solo informativo; cierre manual posterior | `PARTIAL`: no hay automatismo | Sí | Aplicación/UI | `scheduledEndDate` puede no ser necesaria | Carrera con obligaciones en el momento manual | Fecha interpretada como orden clínica | Solicitud, momento, policy y decisión | Dirección Médica | Regla temporal, timezone y workflow |
| DEC-002-K | ¿Cuándo puede producirse cierre? | K2. Fin de duración abre ventana de revisión humana | `ABSENT` | Sí | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Ventana convertida en autocierre | Apertura/revisión/cierre separados | Dirección Médica | Ventana, calendario y excepciones |
| DEC-002-K | ¿Cuándo puede producirse cierre? | K3. Otro evento humano/protocolario aprobado | `ABSENT` | Sí | Por evaluar | Por evaluar | `CONCURRENCY_DESIGN_REQUIRED` | Trigger ambiguo | Por evaluar | Dirección Médica | Evento reproducible y evidencia |
| DEC-002-L | ¿`CLOSED` es terminal? | L1. Terminal; un nuevo hecho requiere nuevo Episode | `SUPPORTED` como máquina actual | Sí; vínculo y continuidad | Bajo/medio | Posible referencia entre episodios | Evitar duplicados concurrentes | Fragmentar continuidad | Cierre y nuevo episodio relacionados | Dirección Médica | Procedimiento y casos sintéticos |
| DEC-002-L | ¿`CLOSED` puede reabrirse? | L2. Reapertura humana autorizada | `ABSENT` | Sí | Alto | `MIGRATION_CANDIDATE` | `CONCURRENCY_DESIGN_REQUIRED` | Reescritura de historia o bypass de cierre | Evento append-only, actor, motivo y policy | Dirección Médica | Autoridad, motivos, efectos y vigencia |
| DEC-002-L | ¿Qué ocurre ante un hecho posterior? | L3. Evaluación humana decide nuevo episodio o workflow aprobado | `ABSENT` | Sí | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Decisión automática implícita | Decisión y referencias cruzadas | Dirección Médica | Árbol institucional de actuación |
| DEC-002-M | ¿Puede haber override? | M1. No existe override | `SUPPORTED` por ausencia | Sí, como exclusión explícita | Bajo | Ninguno | Bajo | Bloqueo operativo sin vía excepcional | Registrar denegación y policy | Dirección Médica | Decisión explícita y contingencia |
| DEC-002-M | ¿Puede haber override? | M2. Override humano motivado y aprobado | `ABSENT` | Sí | Alto | `SCHEMA_CANDIDATE` o eventos | `CONCURRENCY_DESIGN_REQUIRED` | Normalizar excepciones o saltar obligaciones | Solicitud, aprobación, motivo, expiry | Dirección Médica | Motivos, roles, scope y revisión |
| DEC-002-M | ¿Puede haber override? | M3. Override limitado a tipos concretos de blocker | `ABSENT` | Sí | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Taxonomía incompleta o silenciosa | Blocker, policy, actor y evidencia | Dirección Médica | Matriz de elegibilidad y prohibiciones |
| DEC-002-N | ¿Qué ocurre tras cerrar? | N1. Episode y módulos quedan read-only; obligaciones conservan historia | `PARTIAL` | Sí | Alto en permisos/UI | Puede no requerir cambio | Carreras entre cierre y mutaciones | Bloquear documentación necesaria o perder continuidad | Denegaciones y accesos minimizados | Dirección Médica; consultas de propietarios de módulo | Matriz de efectos por recurso |
| DEC-002-N | ¿Qué ocurre tras cerrar? | N2. Mutaciones concretas siguen permitidas por workflow aprobado | `ABSENT` | Sí | Alto | Candidato | `CONCURRENCY_DESIGN_REQUIRED` | Escritura post-cierre sin autoridad | Actor, propósito, policy y referencia | Dirección Médica; autoridades aplicables | Lista exhaustiva y permisos |
| DEC-002-N | ¿Qué ocurre con acceso, check-ins, SBAR y evidencia? | N3. Efectos diferenciados por módulo | `ABSENT` como policy de cierre | Sí | Alto | Posible candidato | `CONCURRENCY_DESIGN_REQUIRED` | Revocación, envío o cierre implícitos | Eventos por módulo sin duplicar contenido | Dirección Médica; DEC-005/016 y propietarios aplicables | Matriz completa, retención y continuidad |

## Reglas de selección

Para cada opción seleccionada, el
[formulario institucional](dec-002-decision-form.md) debe registrar rationale,
rol aprobador, referencia de evidencia, versión, alcance, fecha efectiva y fecha
de revisión. Las opciones deben ser coherentes entre sí y declarar cualquier
dependencia de DEC-005, DEC-016 o DEC-017.

La secuencia aplicable es:

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ concurrency + domain design review
→ READY_FOR_IMPLEMENTATION
```

`READY_FOR_TECHNICAL_SPECIFICATION` requiere
`Canonical DEC-002 status = Aprobada` para la policy version y el approved scope
que se pretenden especificar. Ninguna fila de esta matriz sustituye esa
aprobación. Toda aprobación scoped debe identificar también approval evidence
reference, excluded/deferred scope y unresolved items que continúan bloqueados.
Nada fuera del approved scope queda autorizado.
