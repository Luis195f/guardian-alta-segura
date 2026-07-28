# DEC-015 — Matriz neutral de opciones

## Uso

Ninguna opción está recomendada, preseleccionada o aprobada. `DEC-015-A` a
`DEC-015-R` son identificadores de trabajo de la única decisión canónica
DEC-015. Seleccionar una opción para un capability scope no aprueba los demás.

Soporte actual:

- `SUPPORTED`: el baseline puede representar la opción sin semántica nueva;
- `PARTIAL`: existe un seam, pero falta policy, lifecycle o infraestructura;
- `ABSENT`: la capacidad no existe;
- `CONDITIONAL`: depende de otra decisión o mecanismo futuro.

`INSTITUTIONAL_VALUE_REQUIRED` no es una selección. Los estados `ALLOWED`,
`READ_ONLY`, `BLOCKED` y `NOT_APPLICABLE` solo pueden completarse en un workbook
aprobado por capability y scope.

`Authority` expresa exclusivamente `DEC-015 PRIMARY AUTHORITY` y por ello todas
las opciones mantienen Dirección de Enfermería. Las autoridades de DEC-002,
DEC-005, DEC-013, DEC-014, DEC-016 y DEC-017, y las funciones consultivas, se
registran en `Dependency / consultation`; pueden bloquear un scope sin ser
coapprovers de DEC-015.

## Matriz

| ID | Question | Option | Current technical support | Clinical/operational policy required | Dependency / consultation | Security impact | Privacy impact | Application impact | Infrastructure impact | Data integrity impact | Audit impact | Authority | Evidence required |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | ¿Qué activa una contingencia? | A1. Declaración manual desde un contingency candidate | `ABSENT` | Trigger, hechos, alcance y evidencia | DEC-014 intake | Control de autoridad | No crea copia si solo registra metadatos aprobados | Futura UI/API | Canal/proceso | Evita activación desde health aislado | Declaración y cambios | Dirección de Enfermería | Plan versionado + ejercicio |
| A | Igual | A2. Recomendación técnica determinista + autorización humana | `PARTIAL`: health/correlation ID; sin detector | Hechos y regla versionada | DEC-014 observability; consulta TI | Evitar automatismo/bypass | Labels permitidas | Detector/guard futuro | Monitoring | Abstención ante evidencia incompleta | Candidate + authorization | Dirección de Enfermería | Reglas y pruebas sintéticas |
| A | Igual | A3. `OTHER_APPROVED_MECHANISM` | Por evaluar | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Definición inequívoca |
| B | ¿Quién activa? | B1. Activación humana por función institucional | `ABSENT` | Función, suplencia, evidencia | Identidad institucional | Least privilege | Metadatos de actor | Workflow futuro | Posible canal externo | Sin autoactivación | Evento append-only candidato | Dirección de Enfermería | Authority matrix |
| B | Igual | B2. Recomendación TI + autorización de Dirección de Enfermería | `ABSENT` | Handoff y decisión final | DEC-014/013 | Segregation of duties | Minimización | Workflow futuro | ITSM/canal posible | Separa detección/decisión | Dos referencias | Dirección de Enfermería | Procedimiento conjunto |
| B | Igual | B3. Otro modelo aprobado | Por evaluar | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Evidencia formal |
| C | ¿Qué scope puede declararse? | C1. Global | `PARTIAL`: runtime único; no contingency state | Definición y exclusiones | Config/deployment | Blast radius de todo el scope | Trata el scope completo | Cambio futuro | Posible | Riesgo de bloquear/permitir en exceso | Scope/version | Dirección de Enfermería | Justificación y test |
| C | Igual | C2. Módulo o dependencia | `PARTIAL`: módulos separados; sin orquestación | Matriz por capability | Health/readiness por módulo | Guards consistentes | Minimización por módulo | Cambio por módulo | Monitoring | Evita inferir seguridad del resto | Scope changes | Dirección de Enfermería | Failure exercises |
| C | Igual | C3. Unidad/servicio/población | `ABSENT`: no tenant/unit scope | Autoridad y mapping | Identity/data scope | Requiere aislamiento | Implica segmentación de población | Cambio de scope | Integraciones | Riesgo de cruce de scope | Scope lineage | Dirección de Enfermería | Diseño institucional |
| D | ¿Qué sigue disponible? | D1. Todo bloqueado salvo comunicación aprobada | `SUPPORTED` por ausencia de modo | Workflow asistencial externo | Comunicación | No añade acceso digital clínico | Sin dataset local | Guards/banner | Canal futuro | Evita write inconsistente | Activation/release | Dirección de Enfermería | Drill |
| D | Igual | D2. Capabilities seleccionadas `READ_ONLY` | `ABSENT`; evidence view no es fallback | Freshness, source y acceso | Read replica/store/fuente | Requiere autenticación | Expone la copia o fuente autorizada | Requiere guards read-only | Requiere fuente disponible | Staleness/completeness | Lecturas/acceso por decidir | Dirección de Enfermería | Scope + threat model |
| D | Igual | D3. Matriz mixta `ALLOWED/READ_ONLY/BLOCKED/N/A` | `ABSENT` | Política completa por capability | Config/guards | Riesgo de deriva de guards | Depende de cada capability | Cambio por capability | Depende del mecanismo | Consistencia cruzada | Estado y decisiones | Dirección de Enfermería | Matriz aprobada |
| E | ¿Qué operaciones se prohíben? | E1. `NO_CLINICAL_MUTATIONS` en scope | `SUPPORTED` como fallo actual ante DB down; no estado formal | Excepciones y comunicación | Write guards | No añade ruta de mutación | No crea copia adicional | Guards futuros | Ninguno/monitoring | Protege source of truth | Intentos/denegación por decidir | Dirección de Enfermería | Acceptance tests |
| E | Igual | E2. Allowlist de mutaciones por capability | `ABSENT` | Freshness/auth/audit/policy por operación | DB/audit disponibles; autoridades dependientes | Implica autorización por operación | Depende de los datos tratados | Requiere write guards por operación | Posible | Conflictos/replay | Obligatorio | Dirección de Enfermería | Threat model |
| E | Igual | E3. Política externa/manual | `ABSENT` | Workflow y prohibiciones | Sistema institucional | Según sistema | Según sistema | Integración | Externa | Reconciliación | Referencias mínimas | Dirección de Enfermería | Procedimiento aprobado |
| F | ¿Qué dataset mínimo existe? | F1. `NO_LOCAL_CONTINGENCY_DATASET` | `SUPPORTED` por ausencia | Canal/workflow alternativo | Ninguna local | No añade superficie de datos local | No crea copia local | Sin almacenamiento local | Ninguno | Sin staleness local | Declaración de scope | Dirección de Enfermería | Exclusión explícita |
| F | Igual | F2. Fuente institucional externa read-only | `ABSENT` | Source of truth, access y fallback | Contrato/integración; autoridad del sistema externo | Depende del IAM externo | Implica transferencia/acceso | Integración | Requiere sistema externo | Mapping/freshness | Referencia/acceso | Dirección de Enfermería | Contrato y pruebas |
| F | Igual | F3. Vista mínima local aprobada | `ABSENT` | Campos, freshness, lifecycle y scope | Store/sync; DEC-005/013 | Requiere cifrado, device controls y auth | Crea copia local sujeta a lifecycle | Requiere store/sync | Requiere almacenamiento y sincronización | Copia stale/incompleta | Generación/acceso/purge | Dirección de Enfermería | Threat model + DPIA/evidencia aplicable |
| G | ¿Cómo se expresa freshness? | G1. Timestamp + source/version + last sync + staleness | `PARTIAL`: timestamps/versiones existen en fuentes | Semántica y expiración | Sync/source refs | Evitar spoofing | Puede revelar patrones | UI/model | Sync/clock | Requisito explícito | Generación/sync | Dirección de Enfermería | Contract tests |
| G | Igual | G2. Sin datos cuando freshness no puede probarse | `SUPPORTED` por ausencia de cache | Mensaje/workflow | Guards | Evita presentar datos no verificables | No expone datos sin freshness | Error/empty state | Ninguno | Evita dato stale | Denegación por decidir | Dirección de Enfermería | Negative tests |
| G | Igual | G3. Criterio institucional custom | Por evaluar | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Definición/versionado |
| H | ¿Cómo se accede durante outage? | H1. Solo identidad institucional disponible | `ABSENT`: IdP productivo no implementado | Assurance y sesiones | DEC-013; authority Dirección TI | Requiere controles IAM institucionales | Depende de atributos de identidad autorizados | Integración | IdP | Autorización actual | Access evidence | Dirección de Enfermería | IAM tests |
| H | Igual | H2. Sesión existente bajo policy aprobada | `PARTIAL`: sesión demo persistida | Expiry, revocation, assurance y store | Session/IdP; dependency authority DEC-013 | Implica riesgo de sesión obsoleta | Trata identidad y scope de sesión | Security change | Requiere disponibilidad de session store | Role/scope freshness | Session decisions | Dirección de Enfermería | Failure tests |
| H | Igual | H3. Emergency access aprobado | `ABSENT` | Scope, motivo, tiempo, review | DEC-013 break-glass; authority Dirección TI | Implica acceso privilegiado y revisión | Amplía acceso a datos según scope | Security change | IAM/PAM | No debe omitir source/freshness | Requiere evidencia completa | Dirección de Enfermería | Política y pruebas |
| I | ¿Se capturan writes? | I1. `NO_WRITES` | `SUPPORTED` por ausencia de queue | Workflow asistencial alternativo | Comunicación | No añade ruta digital de escritura | Sin nueva copia | Guards/banner | Ninguno | Sin replay/conflict | Denegaciones por decidir | Dirección de Enfermería | Drill |
| I | Igual | I2. Papel/sistema manual institucional | `ABSENT` en repo | Identidad, campos, custodia y reconciliación | Proceso externo; consulta privacidad | Requiere custodia física/organizativa | Crea artefactos sujetos a lifecycle | Integración posterior | Externa | Transcripción/duplicado | Reconciliation evidence | Dirección de Enfermería | Procedimiento probado |
| I | Igual | I3. Cola local aprobada | `ABSENT` | Identity, encryption, ordering, expiry, conflicts | Store/background process; consulta TI/privacidad | Implica cifrado, autorización y device controls | Crea copia temporal sujeta a lifecycle | Requiere queue y replay | Requiere almacenamiento y procesamiento | Replay/idempotency | Evidencia completa | Dirección de Enfermería | Threat model y test |
| J | ¿Cómo se reconcilia? | J1. Verificación manual por función autorizada | `ABSENT` | Actor, doble revisión opcional y evidencia | UI/workflow | Requiere least privilege | Permite acceso a artefactos de contingencia | Requiere workflow de revisión | Posible | Error humano/duplicado | Evidencia completa | Dirección de Enfermería | Reconciliation exercise |
| J | Igual | J2. Import asistido con confirmación humana | `ABSENT` | Matching, conflictos y aprobación | Parser/idempotency; consulta TI | Requiere validación de input | Implica transferencia de artefactos | Requiere import y confirmación | Requiere mecanismo de import | Ordering/conflicts | Import + decision | Dirección de Enfermería | Contract/threat tests |
| J | Igual | J3. Proceso externo institucional | `ABSENT` | Ownership y referencias | Integración | Según contrato | Según contrato | Integración | Sí | Mapping | Referencia mínima | Dirección de Enfermería | Contrato + drill |
| K | ¿Cuándo está restaurado? | K1. Checklist técnico + integridad + IAM + dependencies | `ABSENT` | Criterios y owner | Readiness/restore tooling; consulta TI | Implica acceso de operador | Limita evidencia a metadatos | Requiere guards/status | Requiere restore tooling | Integridad explícita | Restore evidence | Dirección de Enfermería | Restore test |
| K | Igual | K2. Criterio por capability | `ABSENT` | Checklist por scope | Health/readiness por capability | Controles por capability | Datos limitados por capability | Cambio por capability | Dependencias por capability | Consistencia cruzada | Por capability | Dirección de Enfermería | Test matrix |
| K | Igual | K3. Otro criterio aprobado | Por evaluar | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Evidencia |
| L | ¿Quién libera a normal? | L1. Autorización humana de Dirección de Enfermería | `ABSENT` | Evidencia y suplencia | Estado/referencia | Authority controls | Metadatos | Workflow | Posible canal | Evita release prematuro | Release event | Dirección de Enfermería | Approval evidence |
| L | Igual | L2. Recomendación técnica + autorización operativa/clinical | `ABSENT` | Handoff y condiciones | DEC-014/restore evidence | Segregation | Minimización | Workflow | ITSM posible | Dos gates | Recomendación + decisión | Dirección de Enfermería | Joint exercise |
| L | Igual | L3. Otro mecanismo humano aprobado | Por evaluar | Completa | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Procedimiento |
| M | ¿Qué RTO se aprueba? | M1. Target por capability | `ABSENT` | `INSTITUTIONAL_VALUE_REQUIRED` | Criticality + recovery design | Sin efecto directo hasta diseñar recovery | Sin efecto directo hasta definir datos | Depende del scope | Requiere recovery design | Debe ser alcanzable | Target vs actual | Dirección de Enfermería | BIA + tests |
| M | Igual | M2. Capabilities sin target en primer scope | `SUPPORTED` documentalmente | Exclusión/diferido explícito | Ninguna | Expone el riesgo operativo no resuelto | Sin tratamiento adicional | Solo documentación de exclusión | Ninguno | No promete recovery | Evidencia de exclusión | Dirección de Enfermería | Scope |
| M | Igual | M3. Custom por scope | Por evaluar | `INSTITUTIONAL_VALUE_REQUIRED` | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Target/evidence | Dirección de Enfermería | BIA |
| N | ¿Qué RPO se aprueba? | N1. Target por consistency domain/capability | `ABSENT` | `INSTITUTIONAL_VALUE_REQUIRED` | Backup + consistency; DEC-005 lifecycle | Implica acceso a backups | Las copias requieren lifecycle | Depende del scope | Requiere recovery mechanism | Consistency boundary explícito | Target vs actual | Dirección de Enfermería | Data impact + tests |
| N | Igual | N2. Scope sin digital writes ni recovery target | `SUPPORTED` solo como exclusión | Consecuencia aceptada | Ninguna adicional | Hace visible la ausencia de target | Hace visible la ausencia de copia aprobada | Solo documentación de exclusión | Ninguno | Pérdida no inferida | Exclusión | Dirección de Enfermería | Scope/rationale |
| N | Igual | N3. Custom | Por evaluar | `INSTITUTIONAL_VALUE_REQUIRED` | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Target/evidence | Dirección de Enfermería | Análisis |
| O | ¿Cómo se cubre backup/restore? | O1. Servicio institucional externo | `ABSENT` | Owner, scope, access, tests | Infra/contract; consulta TI; DEC-005 lifecycle | Implica acceso privilegiado | Las copias requieren lifecycle | Integración | Requiere servicio externo | Recovery consistency | Operator/test refs | Dirección de Enfermería | Contrato + restore test |
| O | Igual | O2. Capacidad gestionada específica futura | `ABSENT` | Igual | Infra propia/managed; consulta TI | Implica acceso privilegiado, secretos y operadores | Crea copias sujetas a acceso y lifecycle | Requiere integración o tooling | Requiere capacidad gestionada | Requiere consistency checks | Evidencia completa | Dirección de Enfermería | Arquitectura y pruebas |
| O | Igual | O3. Sin backup/restore en el scope aprobado | `SUPPORTED` por ausencia | Riesgo/exclusión explícitos; puede bloquear piloto | Ninguna | Deja recovery sin mecanismo | No crea copia, pero deja pérdida no resuelta | Solo documentación de exclusión | Ninguno | No recovery | Exclusión | Dirección de Enfermería | Rationale/gate |
| P | ¿Qué lifecycle tienen artefactos de contingencia? | P1. Policy por artifact/data class | `ABSENT` | Triggers, archive/disposition/holds | DEC-005; authority Responsable del Tratamiento | Requiere controles de acceso/purge | Cada copia requiere lifecycle | Depende del mecanismo | Requiere storage si hay artefactos | Evita retención implícita | Disposition evidence | Dirección de Enfermería | Policy reference |
| P | Igual | P2. Sin artefactos locales | `SUPPORTED` por ausencia | Confirmar fuentes externas/manuales | Ninguna local | No añade artefactos locales | No crea copia local | Solo documentación de exclusión | Ninguno | Sin purge local | Scope | Dirección de Enfermería | Exclusión |
| P | Igual | P3. Custom | Por evaluar | Completa | DEC-005; dependency authority Responsable del Tratamiento | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Por evaluar | Dirección de Enfermería | Evaluación |
| Q | ¿Qué pruebas se exigen? | Q1. Tabletop + pruebas técnicas/workflow por scope | `PARTIAL`: test stack existe; no continuity tests | Entorno, roles, frecuencia y evidencia | Isolated environment | Controlled failure | Solo sintético | Tests futuros | Sí | Restore/reconciliation checks | Exercise record | Dirección de Enfermería | Plan probado |
| Q | Igual | Q2. Solo tabletop inicial | `SUPPORTED` documentalmente | Límites y tests diferidos | Ninguna | Puede generar falsa confianza si no se declara el límite | No trata datos adicionales | Solo documentación del ejercicio | Ninguno | No prueba restore | Attendance/evidence | Dirección de Enfermería | Exclusiones claras |
| Q | Igual | Q3. Programa institucional externo | `ABSENT` | Mapping de evidence/scope | Proceso externo | Según proceso | Según proceso | Integración documental | Externa | Debe probar Guardián real | Referencias | Dirección de Enfermería | Exercise evidence |
| R | ¿Cómo se comunica? | R1. Banner/estado en Guardián + canal institucional | `ABSENT` | Mensajes, audiencia, owner y fallback | App + canal | Evitar spoofing | Sin PHI | UI change | Integración posible | Freshness visible | State/change refs | Dirección de Enfermería | UX test |
| R | Igual | R2. Canal institucional externo como source of truth | `ABSENT` | Ownership y mensaje | DEC-014/contract; consulta TI | Requiere control de acceso | Limita contenido a metadatos aprobados | Requiere integración documental | Requiere canal externo | Estado coherente | Delivery/ack | Dirección de Enfermería | Contract/drill |
| R | Igual | R3. Comunicación manual aprobada | `ABSENT` | Trigger, destinatario y evidence | Proceso | Implica riesgo de error humano | No debe incluir PHI | Requiere procedimiento, no código | Ninguno | Estado puede divergir | Manual evidence | Dirección de Enfermería | Procedimiento |

## Reglas de selección

1. Cada selección debe citar plan version, approved capability scope, autoridad,
   evidencia, effective/review dates, dependencias y diferidos.
2. `CURRENT TECHNICAL SUPPORT` no implica conveniencia clínica u operativa.
3. Ninguna opción autoriza shared credentials, anonymous clinical access,
   universal local password, demo login productivo o bypass RBAC.
4. Ninguna opción convierte backup en archive, restore en release, RPO en
   retention o incident en contingency.
5. Ninguna opción introduce números RTO/RPO, tecnología, proveedor, campos
   clínicos, canales o contactos.
6. Las opciones contradictorias mantienen el scope bloqueado.
7. Todo scope omitido es `DEFERRED`.
