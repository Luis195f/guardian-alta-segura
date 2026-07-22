# Arquitectura de información por rol

> DEMO SINTÉTICA / NO USO CLÍNICO. Esta arquitectura organiza superficies de presentación; no modifica RBAC ni sustituye la autorización del servidor.

## Problema anterior

La ruta `/` montaba login, estados legales, cuidador, episodios, Plan de Seguridad, crisis, protocolos, check-ins, avisos y cola de trabajo en una sola página. Los seis roles compartían la misma jerarquía visible y algunos controles permitían iniciar peticiones que el servidor denegaba correctamente con `401` o `403`.

## Modelo nuevo

La cookie de sesión HttpOnly se resuelve en el servidor. El rol activo determina el shell y la navegación visible; cada ruta vuelve a comprobar el rol antes de montar clientes de datos. Los endpoints y las reglas de dominio mantienen sus controles actuales.

| Rol | Landing autenticada | Navegación | Acciones principales | Superficies excluidas |
| --- | --- | --- | --- | --- |
| Enfermería | `/dashboard` | Inicio, Episodios, Avisos, Seguimiento | abrir episodio, revisar aviso, crear y actualizar tarea | administración, portal paciente, portal cuidador, soporte |
| Profesional clínico | `/dashboard` | Inicio, Episodios, Avisos, Seguimiento | supervisar episodio, revisar aviso, registrar seguimiento | administración, portal paciente, portal cuidador, soporte |
| Paciente | `/my-follow-up` | Inicio, Mi Plan, Mis Check-ins, Personas autorizadas | consultar plan, responder check-in, gestionar autorización | workqueue, reglas, avisos profesionales, SBAR, administración |
| Cuidador | `/caregiver` | Portal autorizado | aceptar invitación local, consultar alcance, enviar observación si está permitido | expediente, check-ins completos, notas, SBAR, configuración |
| Administración | `/admin` | Configuración | versionar protocolos demo, consultar reglas deterministas | expedientes y módulos asistenciales |
| Soporte | `/support` | Estado técnico | consultar health sanitizado | datos de pacientes, Plan, check-ins, avisos, SBAR |

## Jerarquía profesional

```text
Dashboard
└── Episodios en seguimiento
    └── Workspace de episodio
        ├── Resumen
        ├── Plan de Seguridad
        ├── Check-ins
        ├── Avisos
        ├── Seguimiento
        ├── Domicilio Seguro
        ├── SBAR
        └── Historial
```

Solo se monta la pestaña activa. El resumen presenta estados organizativos derivados de datos existentes y enlaza a la siguiente acción. No interpreta datos ni introduce métricas clínicas.

## Shell de aplicación

- Header persistente con producto, badge `DEMO SINTÉTICA · NO USO CLÍNICO`, rol, alias sintético, cambio de usuario y cierre de sesión.
- Sidebar en escritorio y menú compacto accesible en móvil.
- `Cambiar usuario demo` ejecuta el cierre de sesión server-side y vuelve al selector; no cambia el rol dentro de una sesión existente.
- Estados compartidos: no autenticado, no autorizado, vacío, carga y error sanitizado.

## Límites preservados

- RBAC server-side continúa como autoridad final y se mantienen las pruebas negativas directas.
- Semáforo visual desactivado por defecto.
- Domicilio Seguro no certifica el domicilio.
- SBAR es preview determinista no firmado.
- Revisar un aviso no crea una tarea; la tarea exige una acción humana posterior.
- Recurso de crisis permanece pendiente de protocolo local y no se inventa un destino.
