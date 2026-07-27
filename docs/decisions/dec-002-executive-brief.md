# Qué debe decidir Dirección Médica antes de habilitar el cierre de un episodio

## Estado actual

Guardián Alta Segura organiza episodios postalta sintéticos y conserva su
historia. Cada episodio tiene estado, versión, responsables, una duración
explícita de 30, 60 o 90 días y una referencia exacta al protocolo de check-in.
El sistema puede mostrar avisos no terminales y tareas abiertas como obligaciones
organizativas, junto con evidencia técnica minimizada.

Los valores 30/60/90 son capacidades del código, no una justificación clínica. El
software no sabe qué significa cada duración, quién debe seleccionarla ni si
representa una ventana administrativa, clínica o de seguimiento. No hay un valor
clínico por defecto, un cálculo por diagnóstico o riesgo, ni un cierre por fecha.

## Por qué `CLOSED` está bloqueado

La máquina técnica incluye `CLOSED`, pero DEC-002 continúa `Pendiente`. Cada
intento de cierre termina en `NOT_AUTHORIZED` antes de cambiar el episodio,
incluso si se inyectara una policy permisiva. También fallan de forma cerrada una
policy ausente, una excepción o una vista de gobernanza inconsistente.

El sistema exige hoy actor profesional responsable, motivo, versión esperada e
idempotencia para intentar la transición. Esos son controles técnicos; no
constituyen una regla clínica de cierre. Del mismo modo:

```text
Episode CLOSED ≠ clinical discharge or recovery
Alert reviewed ≠ clinically resolved
Task resolved ≠ Episode safe to close
```

## Decisiones necesarias

Dirección Médica debe aprobar, para un scope y una versión de política concretos:

1. qué significan 30/60/90 y quién/cómo selecciona la duración;
2. si la duración puede cambiar y cómo se conserva su historia;
3. quién solicita, autoriza y ejecuta el cierre;
4. qué motivos son admisibles;
5. qué condiciones bloquean, avisan o admiten override humano;
6. qué estados de Alert son compatibles con cierre;
7. cómo se tratan Tasks abiertas y cualquier dependencia con DEC-017;
8. qué relación existe entre días transcurridos, revisión y cierre manual;
9. cómo se usa la integridad técnica de la evidencia sin convertirla en
   conclusión clínica;
10. si existe reapertura u override y con qué autoridad;
11. qué ocurre con cada módulo después de `CLOSED`.

DEC-002-A a DEC-002-N descomponen estas preguntas dentro de la decisión canónica;
no son decisiones independientes.

## Qué no decidirá el software

Guardián no determinará recuperación, pronóstico, seguridad clínica, resultado
terapéutico ni final de la atención. No cerrará por diagnóstico, risk score, IA,
ausencia de avisos, tareas resueltas o días transcurridos. No habrá LLM de cierre,
override silencioso, reapertura automática, cambio terapéutico automático ni
borrado por cerrar.

Toda ejecución futura seguirá requiriendo una decisión humana autorizada. La
evaluación de policy, la autorización actual y la mutación permanecerán
separadas.

## Qué evidencia aporta Guardián

La vista de gobernanza puede aportar versión/estado del episodio, responsables,
blockers, referencias de Alerts y Tasks, procedencia y auditoría minimizada. Su
integridad puede ser `COMPLETE`, `PARTIAL`, `INCONSISTENT`, `NOT_APPLICABLE` o
`UNAVAILABLE`; estos estados describen únicamente disponibilidad/coherencia
técnica. `COMPLETE` no significa permiso para cerrar y `PARTIAL` no significa
inseguridad. Dirección Médica puede definir el tratamiento institucional de
`COMPLETE`, `PARTIAL`, `UNAVAILABLE` y `NOT_APPLICABLE`, pero ninguno equivale
automáticamente a `SAFE` o `UNSAFE`.

`INCONSISTENT` no es una opción clínica: identifica una contradicción técnica
conocida y aplica
`INCONSISTENT → NON_OVERRIDABLE_TECHNICAL_FAIL_CLOSED`. No admite override
clínico; exige corrección arquitectónica formal y una nueva evaluación coherente.

## Después de la aprobación

El paquete documental y la plantilla del formulario están `FINAL`; este es un
estado documental, no una aprobación. Una futura instancia del workbook usa
`DRAFT / UNDER_REVIEW / FINAL`. DEC-002 conserva una única cabecera canónica y
sigue `Pendiente`; el gate actual es `READY_FOR_INSTITUTIONAL_DECISION`.

Para avanzar debe existir `Canonical DEC-002 status = Aprobada` para una policy
version y un approved scope inequívocos, con effective date, approval evidence
reference, excluded/deferred items explícitos y unresolved items que permanezcan
bloqueados. La funcionalidad fuera del approved scope no se desbloquea. Si la
institución no admite aprobación scoped, `Aprobada` solo puede usarse al resolver
todo el scope canónico aplicable de duración y cierre. DEC-002-A–N no se
promocionan a estados canónicos independientes.

La aprobación no habilita código directamente. Primero debe realizarse una
revisión técnica de dominio y concurrencia. En particular, deberá evitarse que se
evalúe gobernanza, cambie concurrentemente una Alert o Task y el episodio se
cierre con evidencia obsoleta.

```text
READY_FOR_INSTITUTIONAL_DECISION
→ institutional evidence / approval
→ READY_FOR_TECHNICAL_SPECIFICATION
→ concurrency + domain design review
→ READY_FOR_IMPLEMENTATION
```

DEC-005 seguirá gobernando retención y derechos; DEC-017, la política operativa de
tareas; y DEC-016, cualquier piloto con pacientes o datos reales. Aprobar DEC-002
no resuelve ninguna de esas decisiones.
