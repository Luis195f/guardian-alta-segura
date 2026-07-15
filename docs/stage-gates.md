# Stage gates de Guardián Alta Segura

## Regla de gobierno

Cada gate tiene una única autoridad final. La evidencia técnica informa la decisión, pero no sustituye a la autoridad indicada ni acredita validaciones fuera de su ámbito. La falta de una evidencia o decisión bloqueante produce NO-GO.

## 1. Infraestructura en Codex

- **Condición GO:** la base técnica puede desarrollarse con datos sintéticos y controles de acceso, auditoría, secretos y segregación definidos y verificables.
- **Evidencia mínima:** arquitectura aprobada para desarrollo; repositorio y CI protegidos; modelo de amenazas inicial; configuración sin secretos; denegación por defecto; estrategia de auditoría y datos sintéticos; límites de entornos documentados.
- **Autoridad final única:** Dirección TI.
- **Resultado NO-GO:** no se inicia ni promueve la fundación técnica al siguiente entorno.
- **Elementos bloqueantes:** proveedor de identidad sin verificar; controles de repositorio o CI insuficientes; secretos expuestos; ausencia de segregación; uso de datos reales; incapacidad de auditar mutaciones críticas.

## 2. Módulos funcionales

- **Condición GO:** los módulos implementados satisfacen los requisitos trazados sin automatizar decisiones clínicas y con estados de error, vacío, autorización e historial cubiertos.
- **Evidencia mínima:** criterios de aceptación y pruebas por requisito; revisión de producto; trazabilidad actualizada; permisos negativos; versionado e inmutabilidad; decisiones locales pendientes visibles; revisión de seguridad clínica.
- **Autoridad final única:** Dirección de Producto.
- **Resultado NO-GO:** el módulo no se integra como capacidad candidata del MVP.
- **Elementos bloqueantes:** requisito canónico reinterpretado; alcance incompleto; bypass de autorización; sobrescritura de historia; acción clínica automática; decisión local codificada como definitiva; ausencia de pruebas críticas.

## 3. Sandbox

- **Condición GO:** la release candidata funciona en sandbox exclusivamente con datos sintéticos y supera los controles técnicos, de autorización, privacidad y seguridad clínica definidos.
- **Evidencia mínima:** CI completa; pruebas unitarias, integración y e2e; dataset sintético reproducible; pruebas negativas de RBAC; revisión de logs y exportaciones; feature flags seguras; tabla de riesgos residuales; ausencia de P0/P1 abiertos.
- **Autoridad final única:** Responsable de QA.
- **Resultado NO-GO:** no se habilita la release para pruebas de usabilidad.
- **Elementos bloqueantes:** datos reales; pruebas fallidas o engañosas; P0/P1 abierto; semáforo o contingencia habilitados sin aprobación; IA o integración clínica productiva; soporte con acceso a texto clínico; exportación no minimizada.

## 4. Usabilidad

- **Condición GO:** los flujos son comprensibles, accesibles y seguros para pruebas sintéticas, y los errores críticos de uso están resueltos o bloqueados explícitamente.
- **Evidencia mínima:** protocolo de usabilidad; guiones sintéticos por rol; resultados y hallazgos trazables; verificación de accesibilidad; criterios de parada; evidencia de comprensión de disclaimers y separación entre información y decisión clínica.
- **Autoridad final única:** Dirección de Enfermería.
- **Resultado NO-GO:** no se solicita autorización para un piloto clínico.
- **Elementos bloqueantes:** error crítico de uso; aviso o disclaimer ambiguo; flujo que induce automatización; accesibilidad insuficiente; autorización del cuidador confusa; evidencia incompleta.

## 5. Piloto Clínico

- **Condición GO:** todas las decisiones institucionales aplicables están resueltas y existe autorización expresa para el alcance, entorno, población y periodo del piloto.
- **Evidencia mínima:** protocolos locales aprobados; evaluación jurídica y de privacidad aplicable; evaluación de intended purpose/MDR documentada sin presuponer resultado; autenticación institucional verificada; recursos de crisis aprobados; continuidad, retención, soporte, formación y rollback acordados; riesgos residuales aceptados por sus propietarios; resultados de sandbox y usabilidad.
- **Autoridad final única:** Gerencia del Hospital como Responsable del Tratamiento.
- **Resultado NO-GO:** queda prohibido usar datos o pacientes reales y el sistema permanece limitado a sandbox/usabilidad sintética.
- **Elementos bloqueantes:** cualquier aprobación o evidencia anterior ausente; teléfonos, reglas o frecuencias sin aprobar; base jurídica no determinada; proveedor de identidad no verificado; continuidad o retención sin decisión; riesgo P0/P1; afirmación no sustentada de validación clínica, RGPD, MDR o aprobación.

## Registro de decisión

El resultado de cada gate debe registrar versión evaluada, fecha, evidencias, bloqueos, decisión GO/NO-GO y la identidad de la autoridad final. Un GO de un gate no concede por sí mismo el GO de los gates posteriores.
