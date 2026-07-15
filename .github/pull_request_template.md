## Alcance

<!-- Describe un único objetivo de la rama y qué queda explícitamente fuera. -->

## Trazabilidad de requisitos

<!-- Marca solo requisitos realmente afectados y explica el vínculo. No reasignes IDs. -->

- Requisitos canónicos: <!-- REQ-XX -->
- Criterios de aceptación cubiertos:
- Matriz Markdown y CSV actualizadas: [ ] Sí [ ] No aplica
- ADR o decisión relacionada:

## Seguridad clínica y revisión humana

- [ ] No diagnostica, prescribe ni predice suicidio, crisis, reingreso o deterioro.
- [ ] No introduce scoring probabilístico, IA generativa ni ML.
- [ ] No automatiza decisiones, actuaciones, derivaciones, firmas o cierres clínicos.
- [ ] Conserva historia y versiones sin sobrescritura ni hard-delete indebido.
- [ ] Mantiene visibles el origen, la explicación y la revisión humana cuando aplica.
- [ ] No activa el semáforo visual ni recursos de crisis sin la aprobación local requerida.

## Autorización, privacidad y datos

- [ ] Se aplican mínimo privilegio y denegación por defecto en servidor.
- [ ] Se añadieron pruebas negativas para permisos críticos, o se justifica por qué no aplica.
- [ ] Support no puede acceder a notas clínicas en texto plano.
- [ ] Logs, errores, trazas, métricas y tickets no contienen PHI/PII ni contenido clínico.
- [ ] Solo se usaron datos sintéticos, etiquetados como no clínicos.
- Clasificación de los datos afectados:
- Cambios de exportación o minimización:

## Pruebas y evidencia

| Comando/prueba | Resultado | Evidencia o nota |
|---|---|---|
| `npm run format:check` | No ejecutado / PASS / FAIL / No existe | |
| `npm run lint` | No ejecutado / PASS / FAIL / No existe | |
| `npm run typecheck` | No ejecutado / PASS / FAIL / No existe | |
| `npm run test` | No ejecutado / PASS / FAIL / No existe | |
| `npm run test:e2e` | No ejecutado / PASS / FAIL / No existe | |
| `npm run build` | No ejecutado / PASS / FAIL / No existe | |

## Migraciones, configuración y dependencias

- Migraciones: [ ] No [ ] Sí — reversibilidad y evidencia:
- Configuración/feature flags: [ ] No [ ] Sí — valor seguro por defecto:
- Dependencias de producción: [ ] No [ ] Sí — justificación:
- Secretos o variables sensibles en cliente: [ ] No

## Rollback

<!-- Explica cómo revertir comportamiento, configuración y migraciones sin borrar historia clínica. -->

## Riesgos y decisiones pendientes

- Riesgos introducidos o residuales:
- Elementos pendientes de protocolo local:
- Elementos pendientes de evaluación jurídica:
- Elementos pendientes de validación clínica:
- Elementos pendientes de verificación técnica:
- Gate afectado y autoridad final única:

## Documentación

- [ ] Se actualizaron documentación, matriz de trazabilidad y ADR cuando correspondía.
- [ ] No se afirma cumplimiento RGPD, conformidad MDR, validación clínica ni aprobación hospitalaria inexistentes.
