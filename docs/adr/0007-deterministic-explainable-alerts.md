# ADR-0007 — Motor determinista de avisos explicables

- Estado: Aceptado para MVP técnico sintético
- Fecha: 2026-07-17
- Requisito: REQ-08
- Validación clínica local: Pendiente (DEC-008)
- Semáforo visual: Desactivado y pendiente (DEC-009)

## Contexto

REQ-08 necesita organizar información para revisión humana sin convertir el sistema en un instrumento diagnóstico, pronóstico o de decisión clínica automática. Las reglas locales, sus umbrales, explicaciones y responsables todavía no cuentan con validación clínica institucional.

## Decisión

Se implementa un DSL JSON `schemaVersion: 1` deliberadamente cerrado:

- inputs declarados uno a uno como número, booleano o enum cerrado;
- ventana retrospectiva expresada en horas;
- combinación `all` o `any`;
- operadores deterministas `eq`, `lte` y `gte`;
- ocurrencias mínimas y, cuando aplica, días distintos mínimos;
- severidad administrativa textual `standard` o `priority`;
- explicación fija y rol responsable de revisión.

No se aceptan texto libre, notas clínicas, operadores extensibles, código ejecutable, probabilidades, scores, modelos, LLM o clasificación diagnóstica. Un input requerido ausente dentro de la ventana produce `abstained`, no una inferencia.

Cada definición tiene versiones inmutables. `admin` crea una nueva versión `draft`; `clinician` registra un `RuleApproval` con referencia explícita; `admin` puede activar únicamente esa versión aprobada y la activación retira la versión activa anterior. Esta separación es un control técnico provisional y no sustituye DEC-008 ni DEC-013.

Una evaluación explícita conserva versión exacta, instante, snapshot estructurado normalizado, SHA-256 canónico, resultado y lista de inputs ausentes. Repetir los mismos inputs, versión e instante produce el mismo hash y resultado. Además, cada petición exige una clave idempotente por actor y conserva un fingerprint canónico independiente del instante interno: repetir la misma clave y payload devuelve la evaluación existente, mientras que reutilizarla con otro payload se rechaza. Solo `matched` crea un `Alert`.

Cada aviso conserva regla, versión, referencias estructuradas de origen, explicación, timestamp y estado. El estado inicial es `open`. Las transiciones permitidas requieren un `AlertReview` humano append-only:

- `open` → `reviewed` o `dismissed-with-reason`;
- `reviewed` → `actioned`, `resolved` o `dismissed-with-reason`;
- `actioned` → `resolved` o `dismissed-with-reason`.

Descartar exige motivo. La evaluación no crea tareas, derivaciones, comunicaciones, firmas, cierres ni acciones clínicas.

Cada petición de revisión declara el estado esperado, exige una clave idempotente por actor y conserva un fingerprint canónico de aviso, transición y motivo normalizado. Un replay idéntico devuelve la revisión existente sin duplicar historia ni auditoría; reutilizar la clave con otra huella o actuar sobre un estado obsoleto produce conflicto explícito. La serialización de la fila del aviso impide que dos revisores concurrentes encadenen transiciones que ninguno solicitó sobre el estado resultante del otro.

## Controles de persistencia y presentación

Las claves foráneas compuestas mantienen alineadas definición, versión, evaluación, episodio y aviso. Triggers PostgreSQL impiden sobrescribir definiciones, aprobaciones, evaluaciones y revisiones, exigen que cada versión derive de la anterior y validan que una revisión parta del estado vigente; el estado de un aviso solo puede cambiar si existe la revisión humana correspondiente. La unicidad por reviewer y clave idempotente, junto con el fingerprint, protege el replay durable sin convertir la revisión en resolución ni autorización automática.

La auditoría técnica registra separadamente `RULE_EVALUATED` y, si corresponde, `ALERT_CREATED`, limitada a metadatos de acción y recurso; no copia el snapshot ni la explicación. La UI ordena por estado y nombre de regla y expresa la severidad con texto. `EXPLAINABLE_TRAFFIC_LIGHT=false` por defecto; DEC-009 debe resolverse antes de habilitar tratamiento visual por severidad.

## Fixtures

Los cuatro ejemplos solicitados se almacenan en una única fuente JSON, se siembran como `draft`, no incluyen aprobación y se rotulan “SINTÉTICO / NO APROBADO”. Sirven exclusivamente para pruebas técnicas. No son reglas clínicas válidas.

## Consecuencias

El motor es reproducible, auditable y abstencionista ante ausencia de datos. Su expresividad limitada reduce ambigüedad y superficie de abuso, pero exige una nueva versión del DSL para condiciones futuras no contempladas. En esta rama las referencias de origen se aportan explícitamente y se validan de forma estructural; no existe extracción automática desde check-ins ni otro adaptador clínico. El uso con datos reales y la activación de reglas institucionales permanecen bloqueados hasta completar las decisiones y validaciones locales.
