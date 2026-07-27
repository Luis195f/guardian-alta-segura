# DEC-002 — Agenda de workshop con Dirección Médica

## Objetivo

Reunión de 45–60 minutos para resolver o acotar las decisiones institucionales
sobre duración y cierre de episodio sin convertir capacidades técnicas en
conclusiones clínicas.

Resultado esperado: formulario DEC-002 con opciones seleccionadas o evidencia
faltante, scope explícito, dependencias y siguiente gate. El workshop no cambia
por sí solo `Canonical DEC-002 status = Pendiente`.

`DEC-002-A` a `DEC-002-N` son identificadores internos de trabajo, no decisiones
canónicas independientes.

La plantilla del formulario está `FINAL`. Cada futura instancia del workbook
usa `DRAFT / UNDER_REVIEW / FINAL`; esos estados de trabajo no sustituyen la
única cabecera canónica de DEC-002 ni los gates `READY_FOR_*`.

## Participantes

- Dirección Médica — autoridad primaria;
- representación clínica/operativa del protocolo local;
- facilitación de producto/arquitectura — explica hechos técnicos;
- Dirección de Enfermería — consultiva para tratamiento operativo de Tasks;
- Dirección TI — consultiva para concurrencia, identidad, calendario y operación;
- Responsable del Tratamiento — consultivo si se afecta acceso, finalidad,
  retención, exportación o derechos.

No se registran nombres reales, firmas ni datos de pacientes en el repositorio.

## Preparación previa

Distribuir:

- [resumen ejecutivo](dec-002-executive-brief.md);
- [matriz neutral de opciones](dec-002-option-matrix.md);
- [formulario institucional](dec-002-decision-form.md);
- protocolo institucional versionado disponible;
- referencia del sistema donde quedará la aprobación formal.

## Agenda de 60 minutos

### 0–5 min — Apertura, autoridad y límites

- Confirmar objetivo, scope y autoridad de DEC-002.
- Recordar que `Episode status ≠ clinical recovery`.
- Confirmar que no se habilitará cierre ni se seleccionarán reglas por
  conveniencia técnica.

### 5–10 min — Qué hace hoy Episode Governance

- Estados `DRAFT/ACTIVE/PAUSED/CLOSED`.
- Selección explícita de 30/60/90 al crear.
- Versión optimista, idempotencia, fingerprint, timeline y auditoría.
- Vista de gobernanza con responsables, protocolo y obligaciones abiertas.

### 10–14 min — Qué bloquea hoy DEC-002

- `DEC_002_EPISODE_CLOSURE_POLICY_PENDING`.
- Policy ausente, error o inconsistencia fallan de forma cerrada.
- Incluso una policy permisiva no alcanza la mutación.
- Alerts/Tasks son obligaciones visibles, no política clínica definitiva.

### 14–20 min — Significado y selección de duración

Tratar:

- `DEC-002-A`: significado/scope de 30/60/90;
- `DEC-002-B`: autoridad de selección;
- `DEC-002-C`: mecanismo manual, determinista u otro aprobado;
- `DEC-002-D`: cambio posterior, historia y motivo.

Registrar qué cuestiones son `BLOCKING_FOR_DURATION` y qué exclusión permitiría
aplazar D.

### 20–25 min — Autoridad y motivos de cierre

Tratar:

- `DEC-002-E`: solicitud, aprobación y ejecución;
- `DEC-002-F`: catálogo o estructura de motivos.

No asumir que los roles técnicos actuales son autoridades institucionales.

### 25–31 min — Preconditions y momento

Tratar:

- `DEC-002-G`: invariantes, blockers, warnings y override;
- `DEC-002-K`: relación entre duración, revisión y cierre manual.

Confirmar expresamente que no habrá cron de autocierre.

### 31–37 min — Semántica de Alerts

Tratar `DEC-002-H` estado por estado:

- `open`;
- `reviewed`;
- `actioned`;
- `resolved`;
- `dismissed-with-reason`.

Pregunta obligatoria: «¿qué estados de Alert son compatibles con cierre y qué
evidencia adicional exige cada uno?».

### 37–43 min — Semántica de Tasks

Tratar `DEC-002-I`:

- si toda Task abierta bloquea;
- si importan categoría, assignment o elegibilidad;
- si se permite transferencia documentada;
- qué dependencias aparecen con DEC-017.

No usar `OVERDUE`, prioridad, SLA o escalado sin evidencia aprobada de DEC-017.

### 43–47 min — Integridad de evidencia

Tratar `DEC-002-J`:

- `COMPLETE`;
- `PARTIAL`;
- `UNAVAILABLE`;
- `NOT_APPLICABLE`.

Dirección Médica puede definir el tratamiento institucional de esos cuatro
estados, que no equivalen a safe/unsafe ni a permiso o denegación automática de
cierre. Registrar por separado el invariante técnico no seleccionable:
`INCONSISTENT → NON_OVERRIDABLE_TECHNICAL_FAIL_CLOSED`. No admite override
clínico y exige corrección arquitectónica formal y nueva evaluación coherente.

### 47–51 min — Override

Tratar `DEC-002-M`:

- no override;
- override humano motivado;
- scope, solicitante/aprobador, evidencia y caducidad.

No definir un default ni permitir override silencioso.

### 51–54 min — Reopening

Tratar `DEC-002-L`:

- `CLOSED` terminal;
- reapertura humana;
- nuevo Episode;
- nuevo evento post-cierre y autoridad.

La opción diferida debe declarar explícitamente que no se implementa reopening.

### 54–57 min — Efectos post-cierre y dependencias

Tratar `DEC-002-N` por módulo: Episode, Alerts, Tasks, caregiver, check-ins, SBAR,
evidencia y auditoría.

Confirmar:

- DEC-005 sigue gobernando retención/borrado/exportación;
- DEC-016 sigue bloqueando piloto real;
- DEC-017 conserva la política operativa de tareas.

### 57–60 min — Cierre y siguiente gate

- Revisar campos incompletos y contradicciones.
- Identificar evidencia, responsable por rol y sistema institucional de
  aprobación.
- Confirmar policy version, approved scope, approval evidence reference,
  excluded/deferred items explícitos, unresolved items bloqueados, fecha efectiva
  y fecha de revisión.
- Confirmar que una aprobación scoped no desbloquea funcionalidad fuera de su
  alcance; si la institución no admite ese modelo, reservar `Aprobada` al scope
  canónico aplicable completo de duración y cierre.
- Mantener DEC-002 `Pendiente` hasta evidencia formal.
- Acordar que la aprobación será seguida por revisión de diseño de concurrencia y
  dominio antes de implementar.

## Ajuste a 45 minutos

Si solo hay 45 minutos, mantener completos los bloques E/F/G/H/I/K/N y combinar:

- apertura + baseline en 8 minutos;
- duración A–D en 7 minutos;
- evidencia + override + reopening en 7 minutos;
- efectos/dependencias/gate en 5 minutos.

Las preguntas no tratadas se registran como evidencia pendiente; no se selecciona
una opción implícita.

## Criterio de salida

El workshop es satisfactorio si:

- las decisiones bloqueantes están contestadas o tienen evidencia faltante
  explícita;
- no se ha inferido significado clínico de estados técnicos;
- no se ha seleccionado duración o catálogo por comodidad;
- cualquier diferido está excluido explícitamente del scope;
- las dependencias y autoridades consultivas están identificadas;
- no existen opciones contradictorias;
- el siguiente gate es inequívoco.

La secuencia posterior es:

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ concurrency + domain design review
→ READY_FOR_IMPLEMENTATION
```

No abrir una rama de implementación de cierre hasta completar la secuencia.
