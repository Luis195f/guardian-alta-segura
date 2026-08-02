# ADR-0015 — Frontera entre Guardián Core y Clinical Rules

- Estado: `ACCEPTED FOR SYNTHETIC SANDBOX IMPLEMENTATION / OPERATIONAL APPROVAL PENDING`
- Fecha: 2026-08-02
- Alcance: finalidad prevista, ownership funcional, interfaces y claims
- Validación clínica/institucional/regulatoria: no acreditada
- Autoridad de aceptación: autoridad técnica interna del repositorio, solo para
  el slice 5B sintético; ninguna aprobación clínica, institucional o regulatoria

## Contexto

El baseline combina en un único monolito funciones organizativas, documentales y
de seguridad con un motor determinista que procesa datos individuales de salud y
crea avisos. Los documentos anteriores situaban `Process Safety`, reglas y
avisos dentro de «Core Guardian». Esa agrupación no permite demostrar qué función
verifica el circuito y cuál interpreta información con significado clínico.

La distinción tampoco puede basarse en que el motor sea determinista, explicable,
sin IA o revisado por una persona. La finalidad prevista, la función real y el
uso de la salida para decisiones son los elementos relevantes para la evaluación
regulatoria. El baseline contiene ejemplos sobre sueño/adherencia, ideación
autolítica, no respuesta y conflicto familiar, aunque sean fixtures sintéticos no
validados.

Por otro lado, la propuesta de Core —convertir cada compromiso explícito en una
obligación con responsable, plazo y evidencia— todavía no está implementada.
`Task` conserva responsable técnico e historia, pero no deadline, política de
evidencia, excepción o incumplimiento confirmado.

## Decisión

Se acepta como frontera arquitectónica interna la especificación
[Frontera de aseguramiento del circuito](../system-assurance-boundary.md).

1. Guardián Core posee exclusivamente reglas organizativas de aseguramiento del
   circuito basadas en compromisos explícitos y metadatos verificables.
2. Clinical Rules posee cualquier función que procese datos individuales de
   salud mediante lógica, umbrales o combinaciones con significado clínico para
   producir información destinada a revisión profesional.
3. Clinical Rules solo puede emitir una solicitud de revisión. No puede mutar
   tareas, episodios, planes, comunicaciones, tratamiento, derivaciones, firmas o
   cierres.
4. Core no interpreta el contenido clínico de la solicitud ni hereda su severidad
   como prioridad, SLA o ruta automática.
5. `AUSENCIA_DE_EVIDENCIA` es un estado registral que exige revisión humana y no
   equivale a incumplimiento.
6. Acción del equipo, respuesta del paciente, excepción válida, evidencia tardía
   e incumplimiento confirmado permanecen hechos distintos.
7. La finalidad y cualificación de cada módulo, y la seguridad del conjunto, se
   evalúan y documentan por separado.
8. Una salida de Clinical Rules nunca completa un compromiso. La presencia de
   evidencia tampoco acredita calidad, efectividad clínica o atención correcta.
9. Core no diagnostica, predice, puntúa, prioriza ni decide actuaciones clínicas.
   La no respuesta del paciente no equivale a incumplimiento.

La aceptación procede exclusivamente de la autoridad técnica interna del
repositorio para construir y probar software aislado con datos e identidades
sintéticos. No procede ni representa aprobación de una organización desplegadora,
hospital, autoridad clínica, CSO, responsable del tratamiento, función jurídica o
regulatoria, profesional, paciente o cuidador.

## Impacto sobre decisiones anteriores

- ADR-0001 sigue vigente en sus prohibiciones, pero su permiso genérico para que
  «la plataforma» aplique reglas se restringe: las reglas clínicas pertenecen a
  Clinical Rules y no justifican claims de Core.
- ADR-0007 continúa describiendo correctamente el motor actual, pero deja de
  definirlo como capacidad propia de Guardián Core.
- ADR-0011 y ADR-0012 conservan procedencia y autorización humana como controles
  de la interfaz actual; no acreditan una separación desplegable.
- ADR-0013 y ADR-0014 permanecen como capacidades Core de accountability e
  integridad técnica.
- El freeze de runtime, seguridad, historia append-only y uso sintético permanece
  vigente. La única excepción documental es el slice 5B descrito abajo; este ADR
  no autoriza microservicio, ruta externa ni despliegue operativo.

En caso de conflicto de ownership o claims, este ADR prevalece sobre las tablas
anteriores que incluyan deterministic rules, clinical alerts o clinical content
dentro de «Core Guardian». No cambia el estado real del código.

## Consecuencias

### Positivas

- El claim organizativo de Core puede probarse sin apropiarse de una interpretación
  clínica.
- La evaluación MDR puede realizarse por función y configuración, manteniendo la
  evaluación de interfaces y del conjunto.
- Un aviso clínico no se confunde con ausencia documental, obligación, prioridad
  o incumplimiento.
- Se preservan revisión humana, procedencia, historia e idempotencia existentes.

### Costes y límites

- La separación actual es documental y lógica; el monolito y el esquema siguen
  acoplados.
- El claim central completo permanece bloqueado hasta modelar y probar plazos y
  evidencias tras aprobación.
- Plan de Seguridad, check-ins, Domicilio Seguro, SBAR y crisis necesitan análisis
  de finalidad propio.
- La separación modular no implica que Core quede fuera del alcance de evaluación
  cuando sea necesario para la operación segura de Clinical Rules.

## Alcance de implementación autorizado

La aceptación técnica interna autoriza únicamente una futura implementación del
slice 5B definido normativamente en la
[especificación del motor](../architecture/commitment-engine-spec.md): núcleo
persistente mínimo y aditivo, una migración como máximo, ciclo de vida limitado,
versionado e historia append-only, auditoría atómica, idempotencia, concurrencia
transaccional de sus cuatro comandos, autorización inyectable deny-by-default,
feature flag apagado y pruebas exclusivamente sintéticas. No declara ese slice
implementado ni autoriza ampliar su alcance.

## Alcance que permanece bloqueado

Permanecen bloqueados:

- evaluación de vencimientos, ausencia automática, resolver de evidencia,
  conciliación, excepción e incumplimiento confirmado;
- deadlines predeterminados, SLA, overdue, prioridad, escalado o autoasignación;
- scheduler, worker, batch evaluator, job, segunda cola u outbox;
- endpoints, API, UI, CLI operativo, notificaciones o integraciones;
- nuevos umbrales, reglas, cuestionarios o semáforo;
- conexión directa de Clinical Rules con mutaciones Core;
- cierre de episodio condicionado automáticamente por avisos o tareas;
- datos, identidades, pacientes, cuidadores o usuarios reales;
- uso asistencial, piloto, comercialización, release o producción;
- claims de seguridad clínica, eficacia, cumplimiento DCB0129/DCB0160,
  cualificación o clasificación regulatoria y aceptación de riesgo residual.

DEC-005, DEC-013, DEC-014, DEC-015, DEC-016 y DEC-017 conservan su estado
`Pendiente`; ningún REQ o DEC cambia por este ADR. El Gate B operativo requiere
evaluación regulatoria, contrato de interfaz, análisis de peligros, claims,
autoridades humanas, semántica institucional de evidencia y aprobación de release.
