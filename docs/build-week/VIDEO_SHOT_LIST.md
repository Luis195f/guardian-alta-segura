# Exact recording shot list

Base URL for every shot: `http://127.0.0.1:3000`.

| Shot | Role | Exact action/data | Expected result | Next |
| --- | --- | --- | --- | --- |
| 1 | none | Open `/`; frame hero, badge and workflow strip | “SINTÉTICO / NO USO CLÍNICO” visible | Login |
| 2 | nurse | Select `demo-nurse`; click **Iniciar sesión sintética** | Status includes `rol: nurse` | Episode |
| 3 | nurse | Click **Cargar episodios asignados**; open `SYNTH-PATIENT-001 — Activo — v2` | Episode timeline and nested modules | Plan |
| 4 | nurse | Click **Cargar plan e historial** | Active Safety Plan v1 and six synthetic sections | Patient |
| 5 | patient | Select `demo-patient`; login; click **Cargar mis check-ins** | Synthetic responded check-in | Notice |
| 6 | nurse | Select `demo-nurse`; login; click **Cargar avisos** | Open “AVISO SINTÉTICO — validación clínica pendiente” with explanation | Review |
| 7 | nurse | Click **Registrar revisión humana** | Confirmation explicitly says no automatic action | Queue |
| 8 | nurse | Click **Cargar cola** | `SYNTH-PATIENT-001` and reviewed notice visible | Task |
| 9 | nurse | Fill **Resumen organizativo** with `Seguimiento sintético tras revisión humana`; select the reviewed notice and `demo-nurse`; click **Crear tarea** | Manual task appears | Follow-up |
| 10 | nurse | Select `Sin respuesta`; **Registrar intento**; fill `Nota sintética minimizada`; **Registrar nota**; fill `Cierre organizativo sintético por revisión humana`; **Resolver tarea** | Timeline with actor/timestamp/reason | Safe modules |
| 11 | nurse | Reopen episode; in Domicilio Seguro click **Cargar historial** | v1 pending plus non-certification disclaimer | SBAR |
| 12 | nurse | Click **Generar preview** | S/B/A/R, provenance, `no firmada` | Crisis |
| 13 | none | Scroll to Recurso de crisis | Disabled button and pending-local-protocol message | Closing |
| 14 | none | Frame footer/workflow strip | Human-in-the-loop closing image | Stop recording |

If the alert was already reviewed or task already created in the recording database, prepare a fresh intentional demo volume before recording. Do not add a reset/delete command to the product.
