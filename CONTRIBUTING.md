# Contribuir a Guardián Alta Segura

## Antes de empezar

Este repositorio contiene un MVP técnico para desarrollo, pruebas y demostraciones
exclusivamente sintéticas. No es apto para uso clínico, piloto real o producción.
Las contribuciones no deben diagnosticar, prescribir, predecir riesgo, priorizar
clínicamente ni automatizar decisiones o actuaciones clínicas.

Lee íntegramente `AGENTS.md` y los documentos aplicables antes de proponer o
modificar código. Sus invariantes de seguridad clínica, privacidad, autorización,
historia y revisión humana son obligatorios para cualquier contribución.

## Datos y privacidad

- Usa únicamente datos, identidades y fixtures inequívocamente sintéticos.
- No incluyas datos personales o de salud reales, secretos ni credenciales en
  código, tests, logs, errores, capturas, commits, issues o pull requests.
- Minimiza la evidencia técnica compartida y no copies contenido clínico en
  trazas o tickets.
- Si encuentras una posible vulnerabilidad, sigue `SECURITY.md`.

## Ramas y pull requests

1. Parte de una rama `main` limpia y actualizada.
2. Dedica cada rama a una sola capacidad y usa un nombre descriptivo.
3. Reutiliza los contratos y fuentes de verdad existentes; evita refactors o
   cambios no relacionados.
4. Añade o actualiza pruebas para las reglas, permisos y estados afectados.
5. Actualiza en la misma rama la documentación, trazabilidad y decisiones cuando
   cambie alguno de esos contratos.
6. Abre un pull request con la plantilla del repositorio, declara lo que queda
   fuera y espera que su CI termine correctamente antes de iniciar trabajo
   dependiente.

Las decisiones clínicas, jurídicas, institucionales o de riesgo pendientes no se
pueden sustituir por una decisión del contribuidor. Un cambio técnico no acredita
validación clínica, cumplimiento, aprobación para datos reales ni preparación
para producción.

## Validación local

El proyecto usa pnpm 11.7 como único gestor. Instala las dependencias y prepara el
entorno según `README.md`. Antes de solicitar revisión ejecuta, cuando apliquen:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm traceability:check
pnpm build
pnpm test:e2e
```

Registra los resultados reales y cualquier prueba no ejecutada en el pull request.
El workflow `.github/workflows/ci.yml` es la definición canónica del CI remoto y
puede incluir preparación adicional del entorno; esta lista no lo sustituye.

## Licencia y aceptación

El repositorio no contiene actualmente un archivo `LICENSE`. No asumas que el
código tiene una licencia open source ni que enviar una contribución concede o
recibe derechos adicionales de reutilización. La revisión de una contribución no
garantiza que vaya a integrarse.
