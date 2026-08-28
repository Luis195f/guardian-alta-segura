# GAS 2.0 final prepilot readiness audit

## Respuesta ejecutiva vigente — extensión GAS2-P16A

La evidencia actual permite someter a revisión humana un paquete documental para
una futura evaluación de usabilidad exclusivamente sintética. No autoriza
reclutamiento, ejecución con pacientes, cuidadores o profesionales reales,
tratamiento de datos reales, piloto clínico, despliegue institucional ni
producción. El CI y el sandbox aportan evidencia técnica; no aportan validación
clínica, efectividad, aceptación de usuarios reales, conformidad o aprobación.

```text
SYNTHETIC TECHNICAL BASELINE = PASS
SYNTHETIC USABILITY PACKAGE = READY_FOR_HUMAN_REVIEW
REAL CLINICAL PILOT = NO_GO
REAL DATA / PRODUCTION = NO_GO
RESIDUAL RISK ACCEPTANCE = NONE
INSTITUTIONAL ENDORSEMENT = NONE
TRACEABILITY DRIFT = 0
```

`READY_FOR_HUMAN_REVIEW` califica únicamente la completitud documental del
protocolo P16A. No significa que una sesión de usabilidad esté autorizada, que el
producto sea apto para uso clínico o que exista una autoridad designada para
ejecutarla. `DEC-001–018`, `GAP-DCB-023`, `GAP-DCB-024` y todos los hazards
permanecen abiertos o pendientes en sus registros canónicos.

### Control de la extensión

| Campo | Valor |
| --- | --- |
| Extensión | `GAS2-P16A-SYNTHETIC-USABILITY-READINESS-v1` |
| Fecha | 2026-08-15 |
| Repositorio | `Luis195f/guardian-alta-segura` |
| Rama de trabajo | `docs/pilot-readiness-gates-16a` |
| Baseline | `e1cf37f4088c30e03d8c47297359c1444fe1cbf4` |
| Árbol baseline | `d6a99c93fd415c5237c508e56b1b54204bb99ccb` |
| CI baseline | Run `31901762633`, `completed/success`, mismo SHA |
| Naturaleza del delta | Exclusivamente documental |
| Datos | Exclusivamente sintéticos; `REAL DATA = NO_GO` |
| Resultado máximo del paquete | `READY_FOR_HUMAN_REVIEW` |
| Autoridad de ejecución de usabilidad | `UNASSIGNED` |
| Aprobación institucional | Ninguna |

Esta extensión corrige la vigencia del audit canónico sin borrar su fotografía
histórica. Cuando exista conflicto temporal, esta sección y el
[evidence index](gas2-evidence-index.md) prevalecen para P16A; los registros de
decisiones, gaps, hazards, riesgos y claims conservan su propia autoridad.

### Evidencia fusionada reconocida

| Fase | Evidencia fusionada | Qué permite sostener | Límite |
| --- | --- | --- | --- |
| X1 | PR #35 / `29a02ce` | Mantenimiento y neutralidad del repositorio público | Documentación; no usabilidad |
| P07 | PR #36 / `eff2a6a` | Recorrido de check-in sintético endurecido | No valida contenido, cadencia o usuarios |
| P08 | PR #37 / `bbe49b9` | Revisión humana idempotente y acción posterior separada | No prueba calidad ni oportunidad de la revisión |
| P10 | PR #38 / `1b765ab` | Panel operativo read-only, minimizado y sin prioridad clínica | No prueba interpretación ni freshness clínica |
| X3 | PR #39 / `82811c6` | Colecciones expuestas acotadas y estados de truncamiento | No prueba suficiencia de la información |
| P13 | PR #41 / `cef7402` | Frontera de sandbox sintético endurecida | `CANONICAL SECURITY P13 = NOT EXECUTED`; no es validación productiva |
| P14 | PR #42 / `7dbdc48` y PR #43 / `a66fb3e` | Corrección de denegación y cobertura E2E adversarial sintética | No es pentest ni validación clínica |
| X2 | PR #44 / `13ae145` | Tooling crítico portable por contrato | Solo Windows fue ejecutado para P15 |
| P15 | PR #45 / `5c6a0b6` | Demo sintética reproducible y smoke aislado | Local, loopback y sin usuarios reales |
| P11 | PR #46 / `92eb7e9` | Taxonomía y referencias de governance evidence verificables | Valida referencias, no verdad externa |
| P09 | PR #47 / `3be58f6` | Frontera futura de comunicaciones documentada | Sin entrega, proveedor o comunicación real |
| P12 | PR #48 / `e1cf37f` | Frontera futura FHIR read-only documentada | Sin runtime, perfiles, integración o conformidad FHIR |

Las filas anteriores son evidencia de repositorio y pruebas sintéticas ya
fusionadas. Ninguna convierte una capacidad documentada o técnicamente probada
en evidencia clínica o institucional.

## Readiness separado por nivel

| Nivel | Evidencia disponible | Estado P16A | Condición que mantiene el límite | Resultado máximo / siguiente acción |
| --- | --- | --- | --- | --- |
| Baseline técnico sintético | CI exacto de la base y ejecución local P16A: dependencias, Prisma, PostgreSQL 16, 14 migraciones, seed, 530 tests, checks y build | `PASS` | Evidencia limitada a comportamiento técnico sintético | Conservar baseline y tratar cualquier regresión futura como `NO_GO` |
| Sandbox sintético | Runbook, manifiesto, seed, smoke P15 y seis aliases sintéticos | `PASS` para el sandbox ya ejecutado | Solo loopback, sin datos/personas reales; P16A no infiere E2E nuevo | Conservar límites y revisar el protocolo |
| Evaluación de usabilidad sintética | Protocolo P16A, tareas por rol, métricas, errores críticos, accesibilidad, parada y formulario minimizado | `READY_FOR_HUMAN_REVIEW` | Ejecución, muestra, umbrales, participantes y autoridad no aprobados | Revisión humana del paquete; no ejecutar hasta decisión documentada |
| Futuro piloto clínico | DEC-016 y decision packs como decision support | `NO_GO` | DEC-016 pendiente, datos/identidades reales bloqueados y dependencias abiertas | Autoridades competentes resuelven scope y gates; P16A no los resuelve |
| Producción | No existe IAM, operación, continuidad, lifecycle ni integración productivos | `NO_GO` | Fuera de alcance y sin release/autoridad institucional | Requiere fases y autorizaciones futuras separadas |

No se transfiere evidencia entre niveles. En particular, `PASS` técnico o de
sandbox no permite inferir safety, eficacia, aceptabilidad, competencia,
autorización de piloto o readiness productiva.

## Matriz canónica única de gates P16A

`EJECUTADA` identifica evidencia producida por un comando o recorrido ya
realizado. `DOCUMENTAL` identifica un contrato preparado pero todavía no
ejecutado con participantes. Ninguna fila cierra una DEC, gap, hazard o riesgo.

| Gate | Requisito | Evidencia verificable | Autoridad futura | Estado | Bloqueo | Siguiente acción |
| --- | --- | --- | --- | --- | --- | --- |
| G0 — Baseline técnico sintético | Dependencias congeladas, Prisma generado, PostgreSQL 16 vacío, 14 migraciones, seed sintético, checks y build | `EJECUTADA`: CI base `31901762633` y ejecución local P16A registrada abajo y en el evidence index | Technical evidence owner: `UNASSIGNED` | `PASS` | El resultado no demuestra seguridad clínica ni readiness operativa | Conservar la evidencia y repetir ante cambios técnicos futuros |
| G1 — Sandbox sintético | Recorrido local reproducible, seis roles, cero proveedores/datos reales y límites visibles | `EJECUTADA`: P15 smoke 1/1, E2E 74/74 y fingerprint registrados; CI actual sobre una base posterior sin cambios runtime tras P15 | Synthetic sandbox review owner: `UNASSIGNED` | `PASS` | Solo autoriza inspección sintética local; no autoriza participantes ni uso real | Mantener runbook, flags y boundary; usarlo únicamente si una ejecución futura es autorizada |
| G2 — Paquete de usabilidad sintética | Protocolo revisable con roles, tareas, métricas, accesibilidad, errores, parada, hallazgos, desviaciones y decisión | `DOCUMENTAL`: secciones P16A de este audit; enlazadas desde el evidence index | Human-factors/usability decision owner: `UNASSIGNED` | `READY_FOR_HUMAN_REVIEW` | Muestra, umbrales, participantes, calendario, entorno y autoridad = `PENDING_LOCAL_DECISION`/`UNASSIGNED` | Revisión humana; registrar decisión y versión sin iniciar sesión por defecto |
| G3 — Ejecución futura de usabilidad sintética | Aprobación del protocolo, moderación, entorno, participantes no clínicos o simulados, formación, privacidad y stop authority | `DOCUMENTAL`: checklist siguiente; no existe acta de aprobación o ejecución | Usability execution authority: `UNASSIGNED` | `BLOCKED` | No hay autoridad ni scope aprobados; no se permiten pacientes, cuidadores o profesionales reclutados como participantes reales | Designar autoridad competente y resolver cada `PENDING_LOCAL_DECISION`; otra rama/fase deberá registrar ejecución |
| G4 — Piloto clínico real | DEC-016, scope exacto, dependencias, safety/privacy/security/regulatory/ethics, IAM, soporte y continuidad | `DOCUMENTAL`: DEC-016 y matriz institucional; sin aprobaciones | Gerencia del Hospital como Responsable del Tratamiento, sin sustituir autoridades dependientes | `NO_GO` | DEC-016 y decisiones aplicables pendientes; `REAL DATA = NO_GO` | Mantener bloqueado; decisión externa futura fuera de P16A |
| G5 — Producción | Release productiva, operación, lifecycle, IAM, continuidad e integraciones aprobadas | No existe evidencia productiva | Production release authority: `UNASSIGNED` | `NO_GO` | Fuera de alcance; capacidades productivas ausentes | No iniciar desde P16A |

## Protocolo preparado para revisión humana de usabilidad sintética

### Propósito y frontera

El propósito es permitir que una autoridad humana futura decida si un protocolo
exclusivamente sintético está suficientemente definido para ejecutarse en otra
fase. P16A no autoriza la ejecución. No se reclutan ni representan como
participantes reales pacientes, cuidadores, profesionales o instituciones. Los
roles se simulan mediante los aliases `demo-*` y los datos canónicos `SYNTH-*`.

Quedan prohibidos durante cualquier ejecución futura derivada de este borrador:

- datos, identidades, contactos, credenciales, organizaciones o historias reales;
- exposición LAN, túnel, cloud, staging, proveedor o integración externa;
- diagnóstico, scoring, predicción, priorización o decisión clínica automática;
- 5C, evaluator, scheduler, worker, cron, webhook, notificaciones o comunicaciones;
- habilitar `EXPLAINABLE_TRAFFIC_LIGHT` o presentar un aviso como riesgo;
- números o destinos de crisis, FHIR operativo, SSO institucional o producción.

### Condiciones previas de una futura ejecución

Cada condición debe tener evidencia explícita o permanecer bloqueada:

| Condición | Estado P16A | Evidencia futura requerida |
| --- | --- | --- |
| Versión del protocolo y baseline exactos | Preparados | SHA, árbol, versión del protocolo y diff documental |
| Autoridad que aprueba la sesión | `UNASSIGNED` | Rol/función y referencia de decisión; sin nombres ni firmas en este paquete |
| Propósito y población de participantes | `PENDING_LOCAL_DECISION` | Scope que excluya pacientes/cuidadores y uso asistencial reales |
| Tamaño muestral, composición y criterios | `PENDING_LOCAL_DECISION` | Decisión humana justificada; P16A no propone cifras |
| Entorno local sintético | Preparado documentalmente | `demo:verify`, flags false, loopback y fingerprint de la sesión |
| Moderador, observador, accesibilidad y stop authority | `UNASSIGNED` | Funciones designadas y segregación acordada |
| Material de tarea y formación | Preparado como borrador | Revisión de lenguaje, accesibilidad y límites por autoridad humana |
| Umbrales de éxito o aceptación | `PENDING_LOCAL_DECISION` | Criterios versionados; no se permite derivarlos de CI |
| Registro minimizado y ubicación | Preparado como plantilla | Revisión de privacidad; solo IDs sintéticos/seudónimos del estudio |
| Incidencias, desviaciones y escalado | Preparado como contrato | Canal y funciones humanas designados; sin automatización |
| Criterio de finalización y decisión posterior | `PENDING_LOCAL_DECISION` | Acta minimizada y referencia a evidencia; sin aprobar piloto real |

Si falta cualquiera de las condiciones que la autoridad considere obligatoria,
la ejecución permanece `BLOCKED`.

### Roles y tareas representativas

Las tareas se basan solo en superficies implementadas. “Completar” significa
observar el comportamiento sintético solicitado; no significa corrección
clínica, competencia profesional ni aceptación del producto.

| Rol simulado | Tareas representativas | Observaciones clave / error crítico específico |
| --- | --- | --- |
| `demo-nurse` | Iniciar sesión; localizar `SYNTH-PATIENT-001`; interpretar estados y actualización desconocida; abrir aviso; revisar explicación y origen; confirmar que la revisión no crea tarea; crear y actualizar una tarea manual | Confundir aviso con riesgo/prioridad; asumir freshness; creer que review ejecutó una acción; actuar sobre episodio equivocado |
| `demo-clinician` | Abrir episodio bajo responsabilidad; revisar Plan/check-in/avisos; generar preview SBAR; identificar procedencia, fallback y `signed=false` | Interpretar preview como completo, validado, firmado o enviado; inferir datos ausentes |
| `demo-patient` | Acceder a `my-follow-up`; consultar Plan e historial; responder el check-in disponible; revisar y revocar autorización de cuidador | No distinguir atención real de demo; perder historial al “editar”; creer que la herramienta es un canal de urgencias |
| `demo-caregiver` | Ver estado sin acceso; aceptar invitación local sintética si la tarea lo prepara; comprobar scope; enviar observación; verificar pérdida de acceso tras revocación | Acceder fuera de scope; creer que una observación genera aviso/acción; ver información no autorizada |
| `demo-admin` | Consultar/versionar configuración demo y catálogo determinista; reconocer reglas draft y flag apagado | Interpretar `APPROVED` técnico o regla activa de mecánica como validación clínica; acceder a episodio clínico |
| `demo-support` | Consultar health sanitizado y estado técnico; reconocer que no es DB readiness ni continuidad | Ver contenido asistencial; interpretar health 200 como readiness productiva; registrar contenido sensible en un incidente |

### Métricas observables sin umbrales inventados

Se captura observación bruta; la autoridad futura define muestra, agregación y
criterios. No se calcula un score clínico o un aprobado automático.

| Métrica | Registro permitido | Umbral P16A |
| --- | --- | --- |
| Resultado de tarea | `COMPLETED_UNASSISTED`, `COMPLETED_ASSISTED`, `NOT_COMPLETED`, `STOPPED` | `PENDING_LOCAL_DECISION` |
| Tiempo por tarea | Duración observada con reloj de sesión, sin SLA | `PENDING_LOCAL_DECISION` |
| Errores de interacción | Tipo, paso y recuperación observada | `PENDING_LOCAL_DECISION` |
| Asistencia | Si hubo ayuda y categoría predefinida | `PENDING_LOCAL_DECISION` |
| Comprensión de límites | Respuesta observable a prompts neutrales sobre sintético, revisión humana, crisis, SBAR y avisos | `PENDING_LOCAL_DECISION` |
| Navegación | Destino esperado, desvíos y vuelta al flujo | `PENDING_LOCAL_DECISION` |
| Accesibilidad | Teclado, foco, nombre/rol accesible, estados no solo por color, zoom/reflow y anuncio de errores | `PENDING_LOCAL_DECISION` |
| Carga o confianza percibida | Solo escala o pregunta aprobada previamente | `PENDING_LOCAL_DECISION` |

No se inventan frecuencia, plazo, SLA, RTO/RPO, tasa objetivo o muestra. Los
resultados se presentan por tarea y rol simulado, con contexto y denominador,
sin convertir una media en autorización.

### Accesibilidad y comunicación de límites

Una futura revisión debe observar, al menos:

1. navegación completa mediante teclado y orden de foco comprensible;
2. foco visible y retorno de foco tras diálogos, errores y cambio de vista;
3. nombres, labels, instrucciones y estados accesibles para controles;
4. error, vacío, truncamiento, actualización desconocida y denegación expresados
   mediante texto, no solo color;
5. reflow/zoom y lectura en viewport móvil sin ocultar acciones o límites;
6. anuncio comprensible de cambios de estado y errores;
7. persistencia de `DEMO SINTÉTICA · NO USO CLÍNICO` y comprensión de que
   crisis no es accionable, SBAR no está firmado y avisos no son scoring;
8. lenguaje no culpabilizador para ausencia, no respuesta y pendientes.

Esta observación no autoriza afirmar WCAG ni accesibilidad certificada.

### Errores críticos y criterios de parada

Un error crítico es una observación que exige detener la tarea afectada y
revisión humana. No es una severidad clínica ni una aceptación de riesgo.

- dato, identidad, contacto, credencial o referencia institucional real;
- acceso o mutación fuera de rol, episodio o scope sintético;
- selección o presentación de paciente/episodio equivocado sin límite visible;
- pérdida, sobrescritura o borrado de historia que debía conservarse;
- aviso interpretado o presentado como diagnóstico, predicción, score, riesgo o
  prioridad; o revisión que crea una actuación automáticamente;
- Home Safety presentado como certificación, SBAR como firmado/enviado o crisis
  como accionable;
- soporte/admin expuestos a contenido asistencial no permitido;
- activación de flags prohibidos, servicio externo, comunicación, scheduler,
  worker, webhook, FHIR o identidad institucional;
- captura o log de contenido sensible no minimizado;
- fallo de entorno que invalide loopback, fingerprint, migraciones o el baseline.

Ante cualquier criterio: el moderador detiene la tarea, preserva evidencia
minimizada, evita reintentos destructivos, registra una incidencia o desviación
y eleva revisión. Detener toda la sesión, continuar con tareas no afectadas o
reanudarla son decisiones humanas de la stop authority `UNASSIGNED`; no existen
umbrales automáticos ni auto-resume.

### Formulario minimizado de hallazgo

Solo admite identificadores sintéticos o seudónimos creados para el estudio
sintético. No solicita nombre, email, teléfono, organización, puesto identificable,
credencial, diagnóstico, nota clínica, historia, voz, imagen facial, IP u otra
PHI/PII.

| Campo | Valor permitido |
| --- | --- |
| `finding_id` | `SYNTH-UF-###` |
| `protocol_version` / `baseline_sha` | Referencias técnicas |
| `synthetic_session_id` | Seudónimo no reversible del estudio sintético |
| `simulated_role` | Uno de los seis aliases/roles demo |
| `task_id` / `step_id` | ID de tarea del protocolo |
| `observed_at` | Timestamp técnico de sesión; sin geolocalización |
| `result` | Outcome permitido de la tabla de métricas |
| `category` | Navegación, comprensión, accesibilidad, autorización, integridad, boundary, error/empty/degraded u otra taxonomía aprobada |
| `observation_minimized` | Descripción breve sin datos personales o clínicos; usar valores `SYNTH-*` |
| `assistance` / `recovery` | Categorías predefinidas y resultado observado |
| `critical_stop` | `YES`/`NO`; no es scoring clínico |
| `related_refs` | REQ/DEC/HAZ/GAP/control/test aplicables |
| `sanitized_evidence_ref` | Referencia a captura o log revisado; nunca secreto o payload sensible |
| `deviation_id` / `incident_id` | ID sintético separado, si aplica |
| `review_status` | `PENDING_HUMAN_REVIEW`, `CHANGES_REQUESTED`, `REVIEWED` |
| `next_action` | Acción verificable, owner `UNASSIGNED` si falta y evidencia esperada |

El formulario no incluye un campo de “riesgo aceptado” ni permite cerrar un
hazard, gap o DEC. La narrativa libre se minimiza y se revisa antes de compartir.

### Incidencias y desviaciones

- Un hallazgo describe una observación de uso.
- Una desviación registra que protocolo, rol, tarea, entorno o material no se
  siguieron como estaban versionados.
- Una incidencia registra un fallo de seguridad, privacidad, integridad,
  disponibilidad o boundary que requiere el criterio de parada.

Cada registro usa IDs sintéticos separados, conserva relación con baseline y
tarea, y contiene solo hechos mínimos. Correlation IDs y logs técnicos no se
copian como contenido clínico. La clasificación, escalado, reanudación y cierre
requieren revisión humana; DEC-014 sigue pendiente y este protocolo no crea un
workflow operativo de incidentes.

### Revisión y decisión posterior

La revisión humana debe comprobar completitud del dataset minimizado,
desviaciones, incidencias, errores críticos, accesibilidad, patrones por tarea y
límites del análisis. Debe declarar evidencia faltante y no transformar ausencia
de hallazgos en seguridad demostrada.

Resultados documentales permitidos para una revisión futura del protocolo o de
una ejecución sintética: solicitar cambios, mantener bloqueado o autorizar otra
actividad sintética con scope explícito. La nomenclatura y autoridad final son
`PENDING_LOCAL_DECISION`; ninguna opción aprueba un piloto clínico, datos reales
o producción. Toda acción posterior debe indicar owner, evidencia verificable y
referencia de decisión. La autoridad permanece `UNASSIGNED` en P16A.

## Plan de validación futura por nivel

| Nivel | Evidencia permitida | Resultado máximo |
| --- | --- | --- |
| Técnica | Tests, build, migraciones y seguridad técnica | `PASS` o `NO_GO` |
| Sandbox | Recorridos exclusivamente sintéticos | `PASS` o `NO_GO` |
| Usabilidad sintética | Protocolo y paquete documental | `READY_FOR_HUMAN_REVIEW` o `BLOCKED` |
| Piloto clínico futuro | Requiere decisiones y autorizaciones externas | `NO_GO` |
| Producción | Fuera del alcance | `NO_GO` |

El paso siguiente permitido por P16A es la revisión humana de este paquete. Una
futura ejecución de usabilidad sintética requiere otro registro versionado de
autoridad, scope, condiciones, resultados y limpieza. P16A no inicia P16B, X4 ni
ninguna actividad con personas o datos reales.

## Ejecución local P16A — evidencia técnica sintética

La ejecución se realizó contra el SHA base `e1cf37f4088c30e03d8c47297359c1444fe1cbf4`
con el delta documental sin stage. PostgreSQL 16.10 se inició en el contenedor
efímero `gas2-p16a-postgres-20260815`, proyecto
`gas2-p16a-validation-20260815`, red exclusiva y puerto loopback `55421`. La
base comenzó con cero tablas públicas; `/var/lib/postgresql/data` fue `tmpfs` y
`docker inspect` mostró cero mounts. No se creó volumen persistente.

| Comando / evidencia | Resultado real | Exit | Límite |
| --- | --- | ---: | --- |
| `git fetch origin --prune` | PASS; `origin/main` permaneció en el SHA contractual | 0 | No publica P16A |
| CI run `31901762633` | `completed/success`; mismo SHA base | 0 | CI técnico, no validación clínica |
| `pnpm install --frozen-lockfile` | PASS; 409 paquetes reutilizados, downloads 0, lockfile sin cambios | 0 | Grafo heredado |
| `pnpm prisma:generate` | PASS; Prisma Client 6.19.0 | 0 | Schema sin cambios |
| PostgreSQL 16 vacío | PASS; 16.10, cero tablas públicas, tmpfs, cero mounts | 0 | Base sintética local |
| `pnpm db:migrate:deploy` | PASS; 14/14 migraciones | 0 | Sin migración P16A |
| `pnpm db:seed` | PASS; seed canónico sintético | 0 | No datos reales |
| `pnpm db:migrate:status` | PASS; schema al día | 0 | Misma base aislada |
| `pnpm format:check` | PASS | 0 | Incluye documentos P16A |
| `pnpm lint` | PASS | 0 | Análisis estático |
| `pnpm typecheck` | PASS; route types y TypeScript | 0 | No prueba comportamiento |
| `pnpm test` | PASS; 401 unit + 103 integration + 26 tooling = 530/530 | 0 | Fixtures sintéticos/PostgreSQL 16 |
| `pnpm test:tooling` | PASS; 26/26 | 0 | Ejecutado también como gate separado |
| `pnpm traceability:check` | PASS; REQ-01–14 equivalentes, 37 claims, drift Markdown/CSV 0 y referencias canónicas resueltas | 0 | No valida verdad externa |
| `node scripts/check-governance-evidence.mjs` | PASS; 37 claims y referencias locales | 0 | Checker P11; no aprobación |
| Referencias Markdown de los dos documentos P16A | PASS; una referencia local comprobada, rotas 0 | 0 | No valida URLs externas |
| `pnpm build` | PASS; compilación y 18/18 páginas estáticas | 0 | Build local, no deployment |
| `git diff --check` | PASS | 0 | Sin errores de whitespace |
| `pnpm audit --prod` | EXPECTED NONZERO; 5 high + 2 moderate heredadas; atribuibles a P16A = 0 | 1 | Sin cambio de dependencias o lockfile |
| `pnpm test:e2e` | `NOT_EXECUTED` | `NOT_APPLICABLE` | Delta final exclusivamente documental; no se declara PASS P16A |
| Limpieza aislada | PASS; contenedor/red eliminados, volumen P16A inexistente, puerto 55421 libre y `.env` ausente | 0 | Recursos P15 preservados |

Dos intentos iniciales no privilegiados de `pnpm install` y `pnpm typecheck`
terminaron con exit 1 porque el sandbox impidió leer
`Corepack/lastKnownGood.json`. Los mismos comandos se repitieron sin cambiar
parámetros en el contexto permitido y pasaron; se trata de una restricción del
runner, no de un resultado de producto. La consulta Docker inicial tuvo la misma
restricción de acceso al named pipe y se repitió con permiso antes de crear
recursos.

El audit público de advisories cambió desde fotografías anteriores sin que P16A
modificara dependencias: el resultado observado fue 5 high y 2 moderate. P16A no
atribuye esa variación documental al código ni afirma remediación. E2E local no
se ejecutó porque los únicos archivos modificados son este audit y el evidence
index; las pruebas E2E fusionadas siguen siendo evidencia histórica, no un PASS
de P16A.

## Fotografía histórica preservada — audit original de 2026-07-28

> Nota de vigencia: este informe conserva la fotografía técnica de su fecha. Para
> la frontera Guardián Core / Clinical Rules y cualquier claim de aseguramiento
> del circuito prevalecen `docs/system-assurance-boundary.md` y ADR-0015. La
> etiqueta histórica “Process Safety” no autoriza implementación ni atribuye esa
> capacidad al Core.

## Document control

| Field | Audited value |
| --- | --- |
| Audit date | 2026-07-28 |
| Repository | `guardian-alta-segura` |
| Branch | `audit/gas2-final-prepilot-readiness-freeze` |
| Baseline commit | `351e3aa3915c0d903ccf67ac7581feb5fc50371a` |
| Baseline commit date | `2026-07-28T20:09:27+02:00` |
| Compared base | `origin/main` at the same commit |
| Initial working tree | Clean |
| Audit nature | Documentation, evidence baseline and architecture freeze |
| Data boundary | Synthetic data only; no real-patient use |
| Real-pilot gate | `DEC-016 = Pendiente`; `REAL PILOT = NO_GO` |

This audit is repository-grounded. A passing technical test is not clinical
validation, fail-closed behavior is not proof of clinical safety, and a Decision
Pack is decision-support evidence rather than implementation or institutional
approval.

## A. Executive verdict

The audited baseline technically works as a local, loopback-only synthetic MVP.
The complete local baseline passed: demo preparation, schema status,
traceability, formatting, lint, typecheck, unit tests, integration tests, build
and E2E tests.

The architecture is coherent enough to continue incrementally without a
parallel GAS 2.0 stack. It has implemented technical foundations for episode
governance, canonical signal provenance, explicit human authorization, task
accountability and a read-only governance evidence projection. These
foundations do not supply the institutional policies, clinical validation,
productive identity, lifecycle, incident operations, contingency, external
connectors or regulatory assessment required for a real pilot.

Verdict by use level:

| Use level | Readiness | Verdict |
| --- | --- | --- |
| Local synthetic demo | `READY` | Reproducible on the audited environment |
| External presentation | `CONDITIONALLY_READY` | Only with the limitations and claims in this audit |
| Controlled institutional/technical review | `READY` | Decision-support evidence is prepared; decisions remain pending |
| Real clinical pilot | `NOT_READY` | `DEC-016 = Pendiente`; real people and data remain blocked |
| Production | `NOT_READY` | Productive IAM, operations, continuity, lifecycle and external integrations are absent |

No claim of clinical safety, clinical effectiveness, legal compliance,
regulatory status, real-pilot readiness or production readiness is supported.

## B. Architecture freeze

`FREEZE_ACCEPTED`

This means that the current modular-monolith baseline is a coherent foundation
for controlled incremental evolution. It does not mean feature-complete,
clinically validated, real-pilot ready or production ready.

The freeze is accepted because:

- GAS 2.0 extends the existing domain and does not introduce `src/guardian2`, a
  second database or a parallel source of truth;
- business operations retain explicit application services, ports and Prisma
  adapters;
- critical histories are versioned or append-only and use PostgreSQL
  constraints/triggers;
- signal-to-task behavior requires explicit human review, current authorization
  and a separate professional request;
- governance evidence is a bounded, read-only, derived projection;
- local decisions fail closed and remain visibly pending;
- the full local validation baseline passes.

The exact contract is in
`docs/audit/gas2-architecture-freeze.md`.

## C. Baseline commit

`GAS2_PREPILOT_BASELINE = 351e3aa3915c0d903ccf67ac7581feb5fc50371a`

The branch and `origin/main` resolved to the same commit before any audit
document was created. The log contained PR #12 through PR #25 in the expected
order. No inherited change was present.

## D. Real stack

| Layer | Audited implementation |
| --- | --- |
| Runtime | Node.js `22.14.0`, pnpm `11.7.0` |
| Web | Next.js App Router `16.2.10`, React/React DOM `19.2.7` |
| Language | TypeScript `5.9.3`, strict plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` |
| Domain/application | TypeScript modules under `src/domain` and `src/application` |
| Ports/adapters | Application ports and Prisma/HTTP/identity adapters |
| Persistence | Prisma `6.19.0`, PostgreSQL 16 local/CI expectation |
| API | 29 App Router `route.ts` files; demo routes are loopback-gated |
| Presentation | Server/client React components under `src/presentation` and `src/app` |
| Unit/integration | Vitest `4.1.0` |
| E2E | Playwright `1.61.1`, Chromium and selected mobile Chromium coverage |
| CI | One GitHub Actions workflow with PostgreSQL 16 and the project checks |

No FastAPI service, microservice split, external IdP adapter, clinical AI/ML
runtime, external connector or FHIR adapter exists.

## E. Database and migrations

| Item | Audited result |
| --- | --- |
| Prisma models | 45 |
| Prisma enums | 32 |
| Migration directories | 11 |
| Migration status | Database schema up to date; no pending migration |
| Relation delete policy | 113 Prisma relations and 113 migrated foreign keys use `RESTRICT` |
| Product delete calls | No `delete` or `deleteMany` call found outside tests/migrations |
| Immutable areas | Audit, legal history, episode transitions, safety-plan history, check-in history, alert/rule history, task events, caregiver evidence and home-safety history have database guards |
| Audit history | `AuditEvent` update/delete denied by trigger |
| Parallel database | None |

The schema proves technical history-preservation controls. It does not implement
approved retention, archive, erasure, rights handling, backups or downstream
copy governance. `DEC-005` remains pending.

## F. Test counts and results

| Check | Result | Current count/evidence |
| --- | --- | --- |
| Demo preparation | `PASS` | Existing script completed; PostgreSQL healthy; seed and traceability passed |
| Format | `PASS` | Prettier check |
| Lint | `PASS` | ESLint with zero warnings allowed |
| Typecheck | `PASS` | Next route types and `tsc --noEmit` |
| Unit | `PASS` | 31 files, 304 tests |
| Integration | `PASS` | 10 files, 69 tests |
| E2E | `PASS` | 10 source specs, 44 executed tests |
| Build | `PASS` | Next.js optimized build; 18 static pages generated during build |
| Traceability | `PASS` | REQ-01–REQ-14 unique and equivalent in CSV/Markdown |
| Migration status | `PASS` | 11 migrations; schema up to date |
| `git diff --check` | `PASS` after documents | No whitespace errors |

No retry was reported by Vitest. Playwright reported 44 direct passes and did
not use a retry. Expected negative-path 401/403/409 entries were sanitized to
code, correlation ID and component.

Passing tests establish the audited technical behavior only. They do not
establish clinical validity, effectiveness, legal compliance or production
fitness.

## G. Capability status matrix

The detailed matrix is in
`docs/audit/gas2-capability-status-matrix.md`.

Summary:

| Capability | State | Disposition | Qualification |
| --- | --- | --- | --- |
| Episode governance | `PARTIALLY_IMPLEMENTED` | `FREEZE` | Institutional closure policy remains pending |
| Canonical signal provenance | `IMPLEMENTED` | `FREEZE` | Preserve the v1 contract |
| Human authorization | `PARTIALLY_IMPLEMENTED` | `FREEZE` | Extend only for approved actions |
| Technical task accountability | `IMPLEMENTED` | `FREEZE` | Institutional accountability remains pending |
| Governance evidence | `IMPLEMENTED` | `FREEZE` | Derived evidence is not approval |
| Organizational visibility historically labelled “Process Safety” | `PARTIALLY_IMPLEMENTED` | `FREEZE` | Does not implement explicit obligations or verified compliance; boundary approval and institutional decisions are required |
| Connector boundary | `DEFERRED` | `REUSE` | Do not build speculative adapters |
| FHIR boundary | `DEFERRED` | `REUSE` | Use only against an approved institutional requirement |
| Technical observability foundation | `PARTIALLY_IMPLEMENTED` | `EXTEND_LATER` | Correlation, sanitized errors and liveness only |
| Institutional incident operations | `BLOCKED_BY_INSTITUTIONAL_DECISION` | `EXTEND_LATER` | DEC-014 remains pending |
| Continuity | `NOT_IMPLEMENTED` | `EXTEND_LATER` | DEC-015 remains pending; liveness is not continuity |

## H. GAS 2.0 core status

### Episode Governance

`PARTIALLY_IMPLEMENTED`

`DischargeEpisode` is the episode source of truth. Creation and non-closing
transitions use an actor-scoped idempotency key, SHA-256 request fingerprint,
optimistic `expectedVersion`, an `EpisodeTransition` and an `AuditEvent` in one
unit of work. Responsible nurse/clinician relationships and a fixed check-in
protocol are revalidated. Closure is always denied while DEC-002 is pending,
including when a permissive policy is injected.

Open alerts and tasks are current organizational obligations, not approved
clinical closure criteria. The current code contains no closing mutation path,
so no current close-time TOCTOU can complete. A future DEC-002 implementation
would need an explicitly reviewed atomic boundary because the present
governance facts are read before the guarded update pattern that would be used
for a real closure.

### Signal Provenance

`IMPLEMENTED` for the internal synthetic alert path.

Canonical schema v1 distinguishes source and derived evidence, validates
resource kind, episode, producer, timestamps, rule input context and lineage.
Input claims are always labelled
`DECLARED_NOT_SOURCE_VERIFIED`; the persistence adapter must resolve each claim
against a real stored source before evaluation is recorded. Only the referenced
inputs are attached to lineage, and only a matched rule evaluation can parent
an alert. Invalid or unsupported lineage is rejected; legacy read data is
reported as `LEGACY_UNVERSIONED`, not silently promoted to verified.

No audited path treated an unverified source claim as verified. This conclusion
is limited to the internal source kinds and code at the baseline commit.

### Human Authorization

`PARTIALLY_IMPLEMENTED`

The only defined signal-derived action is
`CREATE_TASK_FROM_REVIEWED_ALERT`. The policy requires an authenticated
professional, active role, current episode responsibility, same-episode alert
and a persisted human review. The review alone does not create a task; a
separate explicit professional request does.

`CONFIRMED_NONE_FOUND`: within the audited signal, alert, review and task paths,
no path from a signal to an automatic clinical or operational action was found.
This statement is scoped to the audited repository and baseline commit.

The per-instance `HumanAuthorizationDecision` and the reviewer role at review
time are not persisted. The governance evidence view reports these limitations
as `UNAVAILABLE`; it does not infer them.

### Task Accountability

`IMPLEMENTED` technically; institutional accountability is
`BLOCKED_BY_INSTITUTIONAL_DECISION`.

`Task` is current state and `TaskEvent` is append-only history. Creation,
assignment, reassignment, contact attempt, note and resolution are explicit,
idempotent operations with optimistic revision checks. Creator, assignee, event
actor, resolver and episode responsibility remain distinct. An unassigned task
is permitted and visible; assignment is not acceptance or clinical authority.

The lock order is episode, unique participant users sorted globally by ID, then
active role/authorization rows before mutation. Integration tests cover
same-episode races, cross-episode shared/disjoint participants, role revocation
in both orders, self-assignment and double resolution. Technical accountability
does not provide the SLA, priority, team, shift, escalation or outcome policy
owned by DEC-017.

### Governance Evidence

`IMPLEMENTED`

`EpisodeGovernanceEvidenceView` reads the authorized episode, transitions,
alerts/evaluations/provenance/reviews, tasks/events, governance facts and
minimal audit references in a PostgreSQL `REPEATABLE READ` transaction. Each
collection is limited to 100 plus truncation detection. The projection is
read-only, not persisted and does not copy explanations, task summaries, notes,
reasons, check-in answers or plan content.

It is derived evidence, not a new independent source of truth and not
institutional approval.

### Process Safety

`HISTORICAL LABEL — BOUNDARY NOT APPROVED`

The system exposes organizational state and several fail-closed invariants, but
does not implement a complete care-process risk engine. Detailed status is in
the capability matrix. SLA/deadline/escalation concepts remain blocked by
DEC-017; check-in timing policy remains blocked by DEC-006. It also lacks an
explicit obligation/evidence/exception contract. Under ADR-0015, absence of
evidence is not non-compliance and this material must be split between Core
circuit assurance and a separately assessed Clinical Rules module.

### Connectors

`DEFERRED`

No real HCE/EHR, external clinical or telemonitoring service, messaging,
wearable, ITSM or IdP adapter exists. The repository contains boundaries and
planning documents, not contracted external integrations or selected providers.

### FHIR

`DEFERRED`

No FHIR resources, mapper, client, endpoint, SMART/OAuth flow or working adapter
exists. The current status is a documented conditional boundary only.

### Observability

`PARTIALLY_IMPLEMENTED`

Correlation IDs, static error envelopes, minimized stderr and a process
liveness endpoint exist. Metrics export, tracing, telemetry sink, incident
workflow, support workflow and database readiness are absent. DEC-014 and
DEC-015 remain pending.

## I. Requirements REQ-01–REQ-14

The canonical statuses were not changed.

| REQ | Canonical status | Technical implementation | Technical validation | Institutional validation | Real pilot |
| --- | --- | --- | --- | --- | --- |
| REQ-01 | Pendiente de protocolo local | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E pass | Pending DEC-001/002/005/013 | Blocked |
| REQ-02 | Pendiente de evaluación jurídica | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E pass | Pending DEC-003/005 | Blocked |
| REQ-03 | Definido para desarrollo | `DEMO_ONLY` | Unit/integration/E2E pass | Clinical/content/lifecycle review pending | Blocked |
| REQ-04 | Pendiente de protocolo local | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E pass | Pending DEC-006 | Blocked |
| REQ-05 | Definido para desarrollo | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E pass | Pending DEC-004/013 | Blocked |
| REQ-06 | Pendiente de evaluación jurídica | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E pass | Pending DEC-003/004/005/013 | Blocked |
| REQ-07 | Pendiente de validación clínica | `DEMO_ONLY` | Unit/integration/E2E pass | Pending DEC-007 | Blocked |
| REQ-08 | Pendiente de validación clínica | `DEMO_ONLY` | Unit/integration/E2E pass | Pending DEC-008/009 | Blocked |
| REQ-09 | Definido para desarrollo | `PARTIALLY_IMPLEMENTED` | Unit/integration/E2E pass | Pending DEC-017 | Blocked |
| REQ-10 | Pendiente de protocolo local | `DEMO_ONLY` blocked state | Unit/E2E pass | Pending DEC-010/011 | Blocked |
| REQ-11 | Definido para desarrollo | `PARTIALLY_IMPLEMENTED` | Unit/E2E pass | Pending DEC-005/012 | Blocked |
| REQ-12 | Pendiente de verificación técnica | `DEMO_ONLY` identity and partial RBAC baseline | Unit/integration/E2E pass | Pending DEC-013 | Blocked |
| REQ-13 | Definido para desarrollo | `PARTIALLY_IMPLEMENTED` | Unit/E2E sanitization pass | Pending DEC-014/005 | Blocked |
| REQ-14 | Pendiente de protocolo local | `NOT_IMPLEMENTED` | No contingency suite | Pending DEC-015 | Blocked |

## J. Decisions DEC-001–DEC-017

All 17 canonical decisions remain `Pendiente`.

| DEC | Authority | Decision Pack | Implementation dependency/current block | Pilot effect |
| --- | --- | --- | --- | --- |
| 001 | Dirección Médica | No | Identity/alta method | Real activation blocked |
| 002 | Dirección Médica | Yes | Duration and closure policy | Real closure/defaults blocked |
| 003 | Responsable del Tratamiento | No | Participation, communication and legal basis | Real participation blocked |
| 004 | Responsable del Tratamiento | No | Caregiver authority and scope | Real caregiver access blocked |
| 005 | Responsable del Tratamiento | Yes | Lifecycle, rights, exports and retention | Real data blocked |
| 006 | Dirección Médica | No | Check-in content/cadence/non-response | Real cadence blocked |
| 007 | Dirección de Enfermería | No | Home Safety content/process | Clinical use blocked |
| 008 | Dirección Médica | No | Rule catalogue/inputs/thresholds/owners | Real rule execution blocked |
| 009 | Dirección Médica | No | Traffic-light enablement | Flag remains off |
| 010 | Dirección Médica | No | Official crisis destination | Action remains disabled |
| 011 | Dirección TI | No | Crisis resource technical verification | Action remains disabled |
| 012 | Dirección Médica | No | SBAR/export profile and destination | Real export blocked |
| 013 | Dirección TI | Yes | Productive IAM, roles, sessions, emergency access | Productive authentication blocked |
| 014 | Dirección TI | Yes | Incident taxonomy, workflow and sanitization | Productive support/observability blocked |
| 015 | Dirección de Enfermería | Yes | Continuity, backup/restore, RTO/RPO | Contingency blocked |
| 016 | Gerencia del Hospital as controller | Yes | Real-pilot scope and GO/NO-GO | `REAL PILOT = NO_GO` |
| 017 | Dirección de Enfermería | Yes | Task policy, SLA, priority, assignment, escalation | Institutional accountability blocked |

The prepared packs for DEC-002, 005 and 013–017 are
`DECISION_SUPPORT_EVIDENCE`. They are not approvals and do not change these
statuses.

## K. Human authorization audit

Result: `CONFIRMED_NONE_FOUND`.

Audited chain:

`stored source → explicit deterministic evaluation → matched alert → explicit
human review → current authorization policy → explicit task POST`

A parallel direct-human task path exists without a signal. It is not labelled
as signal-derived. Alert review does not create a task, communication,
derivation, SBAR, signature, closure or clinical recommendation. No scheduler,
queue consumer or background automation performs a clinical action.

Scope limitation: this conclusion covers code and routes at the baseline
commit; it is not a universal claim about future integrations.

## L. Concurrency audit

| Area | Audited contract | Result |
| --- | --- | --- |
| Episode | Actor idempotency + fingerprint + expected version | Implemented and tested |
| Episode close | Always fail-closed under DEC-002 | Implemented; no close mutation currently reachable |
| Task create | Episode lock, ordered participants, role/assignee locks, idempotency | Implemented and tested |
| Task update | Revision, event uniqueness and guarded task update | Implemented and tested |
| Cross-episode shared participants | Global user-ID ordering | Tested |
| Disjoint participants | Parallelism retained | Tested |
| Role revocation race | Locks serialize mutation/revocation in both orders | Tested |
| Caregiver revocation | Authorization lock and per-request revalidation | Tested |
| Self-assignment | One unique participant lock; repeat rejected | Tested |
| History | Events retained when current eligibility changes | Tested |

Residual risk: any future implementation that allows episode closure must prove
an atomic relationship between the policy inputs and close mutation. Current
tests cannot validate an as-yet-unimplemented institutional closure policy.

## M. Security findings

| ID | Status | Evidence/category | Current effect | Pilot effect/dependency |
| --- | --- | --- | --- | --- |
| GAS2-SEC-001 | `CLOSED` | Seed stderr uses allowlisted envelopes; 14 dedicated seed-error regression tests | Historical disclosure path remediated | Preserve regression coverage |
| GAS2-SEC-002 | `OPEN` | `/api/health` returns process success without DB query | Can report healthy while PostgreSQL is unavailable | Blocks trustworthy readiness; DEC-014/015 plus future technical branch |
| GAS2-SEC-003 | `BLOCKED_BY_DECISION` | Demo alias provider only; no productive IdP/global logout/break-glass | Acceptable only inside loopback synthetic boundary | Blocks real pilot; DEC-013 |
| GAS2-SEC-004 | `DEFERRED` | In-memory demo login limiter is process-local | Suitable only as a demo defense-in-depth control | Productive IAM must supply approved distributed controls |
| GAS2-SEC-005 | `BLOCKED_BY_DECISION` | No telemetry sink or incident workflow; only sanitized stderr | Local technical evidence only | Blocks productive operations; DEC-014/005 |

Static checks found no product route bypass for `admin` or `support`, no open
redirect, no file-upload/export endpoint, no `dangerouslySetInnerHTML`, and no
raw SQL constructed through string interpolation in the audited trust
boundaries. SQL lock statements use `Prisma.sql`.

No high-confidence credential was found in tracked files. One secret-pattern
hit was a substring in the filename `task-policy-decision-pack`, and the only
email-pattern hit was a synthetic sanitization fixture. No phone-pattern hit was
found. This was a static, non-destructive review, not a penetration test or a
guarantee of absence.

## N. Clinical safety findings

| ID | Status | Evidence | Effect |
| --- | --- | --- | --- |
| GAS2-CS-001 | `MITIGATED_TECHNICALLY` | Synthetic-only and loopback gates; patient IDs are pseudonymous | Reduces demo wrong-person exposure; institutional identity remains unresolved |
| GAS2-CS-002 | `MITIGATED_TECHNICALLY` | Version/revision checks, append-only histories, fixed protocol references | Stale writes and silent overwrites are rejected |
| GAS2-CS-003 | `MITIGATED_TECHNICALLY` | Explicit review plus separate current authorization and task request | No automatic action found in audited signal chain |
| GAS2-CS-004 | `OPEN` / `SAFETY_REVIEW_REQUIRED` | Process Safety lacks approved SLA/escalation/follow-up rules | Omission/timing behavior is not clinically or operationally validated |
| GAS2-CS-005 | `BLOCKED_BY_DECISION` | Crisis action is deliberately unavailable | Safe against invented routing, but real crisis destination is unavailable pending DEC-010/011 |
| GAS2-CS-006 | `BLOCKED_BY_DECISION` | Closure always denied under DEC-002 | Prevents unapproved closure; no operational closure workflow exists |
| GAS2-CS-007 | `ACCEPTANCE_REQUIRED` | Home Safety and deterministic notices are demo-only | Automation-bias and local workflow review remain necessary |
| GAS2-CS-008 | `OPEN` / `SAFETY_REVIEW_REQUIRED` | Health is not DB readiness; no contingency | An outage can interrupt follow-up without an approved fallback |

No clinical severity ordinal is assigned. These are technical hazard/control
observations requiring the named institutional owners and, where applicable, a
formal safety review.

## O. Privacy and data-lifecycle status

Technical minimization, pseudonymous synthetic identities, no-store responses,
hashed session/invitation tokens, field-level caregiver views and append-only
histories are implemented. Revocation disables access without deleting
historical records. All schema relations use `RESTRICT`, and no product
hard-delete path was found.

Approved retention, archive, disposition, rights requests, backup-copy
retention, export lifecycle and downstream propagation are not implemented.
`DEC-005 = Pendiente`. Therefore:

- no GDPR-compliance claim is supported;
- no real-data lifecycle is approved;
- no real-patient data may be used;
- governance evidence remains derived and inherits source classification.

## P. Continuity status

`CONTINUITY = NOT_IMPLEMENTED`

`PROCESS LIVENESS = IMPLEMENTED`

`OPERATIONAL OBSERVABILITY = PARTIALLY_IMPLEMENTED`

PostgreSQL persistence and idempotent operations support restartable technical
behavior, but the repository has no approved backup, restore test, failover,
RTO/RPO, contingency censo, offline clinical storage, reconciliation workflow
or write-during-outage policy. Browser clinical offline storage was not found.
The Docker volume is a development convenience, not a governed backup. Process
liveness, the health endpoint and restartable technical behavior do not count
as continuity.

The known `/api/health` gap remains confirmed. DEC-015 is pending.

## Q. Identity status

`DEMO_ONLY`

Six fixed synthetic aliases authenticate only when demo mode is enabled,
outside production and on loopback. Sessions are server-side, hashed, expiring
and individually revocable. Active roles are re-read on each request.
Caregiver access also revalidates authorization, latest episode-specific scope
and revocation.

There is no production IdP, MFA/assurance, account-linking policy, central
session management, global logout, emergency access or productive service
identity. DEC-013 is pending.

## R. Incident and observability status

`TECHNICAL OBSERVABILITY FOUNDATION = PARTIALLY_IMPLEMENTED`

`INSTITUTIONAL INCIDENT OPERATIONS = BLOCKED_BY_INSTITUTIONAL_DECISION`

Implemented technical signals: generated correlation IDs, sanitized public
errors, sanitized stderr, no request-body logging in reviewed handlers and
process liveness.

Absent productive operations: metrics, tracing, telemetry export, alerting,
incident classification, support handoff, evidence retention, runbooks and DB
readiness. DEC-014 is pending.

## S. Connector and FHIR status

| Boundary | Status |
| --- | --- |
| HCE/EHR | `NO_CONNECTOR` |
| External clinical or telemonitoring services | `NO_CONNECTOR`; no provider selected |
| Messaging/wearables/RPM/ITSM | `NO_CONNECTOR` |
| Institutional IdP | `INTERFACE_ONLY` at application-port level |
| FHIR | `DOCUMENTED_BOUNDARY`; no mapper/client/endpoint/SMART/OAuth |

No real external integration or real FHIR interoperability can be claimed.

## T. Historical “Process Safety” status

| Candidate condition | Status | Repository evidence/limit |
| --- | --- | --- |
| `TASK_WITHOUT_OWNER` | `PARTIALLY_IMPLEMENTED` | Unassigned tasks and accountability state are visible; no approved escalation |
| `TASK_OVERDUE` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | Age metric exists, but no SLA/deadline under DEC-017 |
| `SIGNAL_NOT_REVIEWED` | `PARTIALLY_IMPLEMENTED` | Open alert state is visible; no approved review SLA |
| `REVIEW_SLA_BREACHED` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | DEC-017 |
| `EPISODE_WITHOUT_OWNER` | `IMPLEMENTED` | Required responsible IDs plus active-role governance checks |
| `EPISODE_CLOSED_WITH_OPEN_TASK` | `PARTIALLY_IMPLEMENTED` | Open tasks are blockers; all closure is currently blocked by DEC-002 |
| `PROTOCOL_VERSION_MISSING` | `IMPLEMENTED` | Fixed relation and governance validation |
| `SIGNAL_PROVENANCE_INCOMPLETE` | `IMPLEMENTED` | Invalid/legacy lineage is explicit and current writes require resolved sources |
| `ESCALATION_WITHOUT_RECIPIENT` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | No escalation model; DEC-017 |
| `CONTACT_NOT_COMPLETED` | `NOT_IMPLEMENTED` | Contact events exist; no completion policy |
| `FOLLOWUP_WINDOW_MISSED` | `BLOCKED_BY_INSTITUTIONAL_DECISION` | DEC-006/017 |

The positioning “care-process risk engine” is not supported. The repository
supports partial organizational visibility and technical safeguards. These
conditions do not amount to an implemented circuit-assurance function and do not
allocate clinical-rule evaluation to Guardián Core.

## U. Claims register

The full register is in `docs/audit/gas2-claims-register.md`.

Supported claims are limited to the audited technical/synthetic scope:

- local synthetic demo;
- deterministic, versioned, explainable notices;
- explicit human review and manually initiated task workflow;
- technical versioning, idempotency, authorization and audit controls;
- read-only derived governance evidence;
- no clinical AI/ML or autonomous clinical action found in the audited code.

Clinical effectiveness, safety outcomes, readmission/suicide/relapse prevention,
legal compliance, regulatory status, hospital approval, real-pilot readiness
and production readiness are prohibited until corresponding evidence exists.

## V. Product positioning verdict

“Clinical Safety & Accountability Control Plane” is a historical positioning and
is not an allowed product claim. ADR-0015 replaces it with a proposed, narrower
Core purpose and a separately assessed Clinical Rules module.

| Component | Verdict |
| --- | --- |
| Episode governance | `PARTIALLY_SUPPORTED` |
| Signal provenance | `SUPPORTED` for internal synthetic sources |
| Human authorization | `SUPPORTED` for the implemented alert-to-task action |
| Task accountability | `SUPPORTED` technically |
| Circuit assurance | `NOT_IMPLEMENTED`; organizational visibility only |
| Clinical Rules | Deterministic engine exists, but remains technically coupled and its regulatory qualification is unresolved |
| Audit/evidence | `SUPPORTED` technically and read-only |
| Vendor-neutral integration boundary | `ASPIRATIONAL` until a real contract/adapter exists |

External wording must follow the claims register and ADR-0015. It must not imply
verified circuit compliance, demonstrated clinical safety, outcomes, regulatory
status or real integration.

## W. Demo readiness

| Audience | Readiness | Conditions |
| --- | --- | --- |
| Local synthetic demo | `READY` | Docker/PostgreSQL, `.env` synthetic template and loopback |
| External presentation | `CONDITIONALLY_READY` | Show only working features; retain synthetic/no-clinical-use labels |
| Institutional review | `READY` | Present Decision Packs as unresolved decision support |
| Real pilot | `NOT_READY` | DEC-016 pending; all real data/people blocked |
| Production | `NOT_READY` | Critical productive capabilities absent |

Honest demonstration boundaries:

| Demo claim | Can show | Can say | Qualification/evidence |
| --- | --- | --- | --- |
| Versioned Safety Plan | Yes | Yes | Synthetic workflow; no local clinical validation |
| Deterministic notice | Yes | Yes | Draft synthetic fixtures; not prediction |
| Human review and task | Yes | Yes | Manual organizational workflow; not clinical efficacy |
| Caregiver revocation | Yes | Yes | Technical synthetic behavior; legal/identity policy pending |
| Home Safety | Yes | Yes | Informational; never certification |
| SBAR preview | Yes | Yes | Deterministic, unsigned, no approved PDF profile |
| Crisis action | Show blocked state | Say unavailable pending approval | No number/destination exists |
| FHIR/external integration | No | Only “future conditional boundary” | No adapter exists |
| Real pilot/production | No | No | DEC-016 and productive gaps |

## X. Technical debt

See `docs/audit/gas2-final-risk-register.md`.

Confirmed technical debt is deliberately narrow:

- process-only health endpoint without DB readiness;
- no persisted per-instance human authorization decision or historical reviewer
  role;
- process-local demo rate limiter;
- no productive telemetry/incident sink.

Institutional policy gaps and deferred integrations are not misclassified as
technical debt.

## Y. Institutional blockers

The decision register remains authoritative. Immediate blockers are:

- DEC-001/002 for real episode identity, duration and closure;
- DEC-003/004/005 for legal basis, caregiver authority and lifecycle;
- DEC-006–012 for clinical content, crisis and export profiles;
- DEC-013 for productive identity/access;
- DEC-014 for incident operations;
- DEC-015 for continuity;
- DEC-016 for any real pilot;
- DEC-017 for task policy/SLA/escalation.

No audit document resolves these decisions.

## Z. Final risk register

The consolidated register is
`docs/audit/gas2-final-risk-register.md`. Risks remain separated into technical,
clinical-safety, privacy, security, operations, continuity, regulatory and
institutional categories. No aggregate score or invented severity is used.

## AA. Documentation drift

`MINOR`

The current README, ADRs, architecture documents, traceability and Decision
Packs are materially aligned with code on the central safety boundaries. No
document was found claiming clinical validation, legal compliance, productive
IAM, real FHIR or pilot readiness.

Minor limitations:

- architecture/current-state documents are point-in-time narratives and should
  not be treated as runtime evidence without this baseline;
- “ready” labels in build-week matrices refer to synthetic demo moments, not
  pilot/production readiness, and require their surrounding qualifications;
- the clinical workflow describes intended manual SBAR validation beyond the
  currently implemented deterministic unsigned preview.

Existing documents were not changed in this audit branch.

## AB. Evidence index

The detailed source/type/support/limitation index is
`docs/audit/gas2-evidence-index.md`.

Primary evidence order used:

1. runtime code, Prisma schema and migrations;
2. unit, integration and E2E tests;
3. configuration, scripts and CI;
4. ADRs and traceability;
5. Decision Packs as decision-support evidence only.

## AC. Frozen architecture contract

`GAS2_ARCHITECTURE_FREEZE_VERSION =
GAS2_PREPILOT_ARCHITECTURE_FREEZE_v1`

The baseline commit, sources of truth, transaction/security/clinical-safety
invariants, data restriction and change classes are specified in
`docs/audit/gas2-architecture-freeze.md`.

## AD. Future branch policy

The policy is in `docs/audit/gas2-future-branch-policy.md`. Every future branch
must identify the applicable DEC/gate, use one capability, preserve existing
sources of truth and concurrency, include tests, use synthetic data unless a
real-pilot gate is formally approved, and merge through PR/CI before the next
dependent branch.

## AE. What not to build next

Until the applicable decisions are approved, do not immediately implement:

- real episode closure/default duration policy;
- institutional identity, emergency access or productive sessions;
- real-data retention/disposition/rights handling;
- SLA, overdue or escalation policy;
- productive telemetry and incident workflow;
- contingency/offline clinical mode;
- real-pilot or production deployment mode;
- external clinical connectors or FHIR;
- official crisis routing or productive SBAR export.

These are conditional holds, not permanent prohibitions.

Also do not build a second EHR, generic RPM platform, clinical voice platform,
wearable, therapeutic chatbot, opaque predictor, speculative graph database,
complete FHIR server or parallel `guardian2` architecture.

## AF. What may be done safely

Without changing intended clinical behavior or institutional gates:

- documentation and evidence maintenance;
- synthetic demo reliability and non-clinical UI polish;
- accessibility;
- deterministic test reliability;
- developer tooling;
- performance and concurrency testing with synthetic data;
- static security analysis;
- API documentation;
- presentation material with audited claims;
- workshop and Decision Pack preparation.

## AG. Out-of-scope findings

| ID | Domain | Status | Evidence | Impact/readiness effect | Future action |
| --- | --- | --- | --- | --- | --- |
| GAS2-OOS-001 | Continuity | `OPEN` | `/api/health` omits DB readiness | Real operational readiness cannot be asserted | Separate post-decision technical branch |
| GAS2-OOS-002 | Evidence | `DEFERRED` | Authorization decision/reviewer historical role not persisted | Evidence view correctly reports `UNAVAILABLE` | Decide whether institutional evidence requires persistence |
| GAS2-OOS-003 | Operations | `BLOCKED_BY_DECISION` | No incident/telemetry workflow | Production operation blocked | DEC-014 then scoped implementation |
| GAS2-OOS-004 | Integration | `DEFERRED` | No external/FHIR adapters | No real interoperability claim | Wait for approved contract/profile |

These findings were recorded and not repaired.

## AH. Files created or modified

Created:

- `docs/audit/gas2-final-prepilot-readiness-audit.md`
- `docs/audit/gas2-capability-status-matrix.md`
- `docs/audit/gas2-final-risk-register.md`
- `docs/audit/gas2-claims-register.md`
- `docs/audit/gas2-architecture-freeze.md`
- `docs/audit/gas2-evidence-index.md`
- `docs/audit/gas2-future-branch-policy.md`

No file under `src`, `tests`, `prisma`, `scripts`, `.github`, package
configuration, lockfile, ADR or historical Decision Pack was intentionally
modified. The tooling-generated `next-env.d.ts` change was restored as required.

## AI. Full validation results

| Command | Result |
| --- | --- |
| `pnpm demo:prepare` | PASS |
| `pnpm format:check` | PASS after audit documents |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:unit` | PASS — 304/304 |
| `pnpm test:integration` | PASS — 69/69 |
| `pnpm test:e2e` | PASS — 44/44 |
| `pnpm build` | PASS |
| `pnpm traceability:check` | PASS |
| `pnpm db:migrate:status` | PASS — 11 migrations, up to date |
| `git diff --check` | PASS after document creation |

The demo-preparation command was repeated after the first invocation exceeded
an intentionally short command timeout. The second, idempotent invocation
completed successfully. This was a command-runner timeout, not a deterministic
repository failure.

## AJ. Git diff stat

Literal result: no output. Git does not include untracked files in the standard
`git diff --stat`.

Informational inventory of the untracked audit deliverables:

| Files | Lines | Bytes |
| --- | --- | --- |
| 7 | 1,470 | 87,248 |

## AK. Git status

Literal result:

```text
?? docs/audit/
```

No other tracked or untracked change was present. No commit, push, PR or merge
is performed by this audit.

## Final required statements

| Statement | TRUE/FALSE | Evidence-based qualification |
| --- | --- | --- |
| 1. GAS technically works. | `TRUE` | For the audited local synthetic baseline; all checks passed |
| 2. Synthetic demo reproducible. | `TRUE` | Existing preparation script completed and E2E passed |
| 3. Human review is required before the implemented signal-derived action. | `TRUE` | A direct human-initiated task is a distinct path, not a signal-derived automatic action |
| 4. Autonomous clinical action exists. | `FALSE` | No path found in audited code |
| 5. Clinical AI/ML exists. | `FALSE` | Deterministic rules only; no AI/ML runtime |
| 6. Real external integration exists. | `FALSE` | No real adapter |
| 7. Real FHIR interoperability exists. | `FALSE` | Documented conditional boundary only |
| 8. Production IAM exists. | `FALSE` | Demo aliases and local sessions only |
| 9. Production observability exists. | `FALSE` | Correlation/sanitized stderr/liveness only |
| 10. Production contingency exists. | `FALSE` | No contingency implementation |
| 11. Approved data-lifecycle policy exists. | `FALSE` | DEC-005 pending |
| 12. Institutional task SLA exists. | `FALSE` | DEC-017 pending |
| 13. Institutional episode closure policy exists. | `FALSE` | DEC-002 pending |
| 14. Real-pilot authorization exists. | `FALSE` | DEC-016 pending; `NO_GO` |
| 15. Production readiness exists. | `FALSE` | Productive prerequisites absent |
