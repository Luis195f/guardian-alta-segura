# Public judge demo runbook — C09

> **LOCAL SYNTHETIC FIXTURE / FAKE / DRY-RUN. CALL-E LIVE OFF.** This is the
> existing C03–C07 UI and contracts. It uses no API key, provider, phone call,
> clinical or personal data. It is not for clinical use.

## Availability gate

There is no public deployment URL. The application deliberately serves only on
`http://127.0.0.1:3000` and fails closed outside loopback. C09 does not create a
parallel app, tunnel, cloud service or external resource.

`PUBLIC_DEMO = NOT_VERIFIED`. A public URL may be marked `PASS` only after a
separately authorized deployment has been inspected end to end. No such action
is authorized by C09.

## Fixed preparation

1. Start from the C09 commit and use the documented local prerequisites.
2. Run `pnpm demo:prepare`, `pnpm demo:verify`, then `pnpm demo:start`.
3. Open only `http://127.0.0.1:3000` after `DEMO_START_READY`.
4. Confirm the persistent `SINTÉTICO / NO USO CLÍNICO` label.
5. Confirm `CALL_E_REST_ENABLED=false`, no CALL-E API key and no real-data
   source. Never show `.env`, cookies, tokens, phone values or terminal secrets.
6. Use a fresh synthetic demo state. If prior rehearsal consumed one-use
   confirmations, use the existing protected reset procedure from
   `DEMO_RUNBOOK.md`; do not delete history ad hoc.

## Exact judge path

| Step | Existing UI action | What the judge sees | Claim boundary |
| ---: | --- | --- | --- |
| 1 | On `/`, select `demo-nurse` and click **INICIAR DEMO**. Open episode `synthetic-demo-episode-buildweek`. | Persistent synthetic/non-clinical labeling and a real product workspace | Local technical pre-pilot only |
| 2 | Open the **Patient Relay** tab. | A separate Patient Relay: `Recorrido sintético · sin proveedor · sin red` | No live call or observed conversation |
| 3 | Click **Crear preview de Patient Relay**. | Masked fixture target, purpose `PATIENT_CALLBACK_OFFER`, region/locale/line fixture, versioned task contract, authority/attestation revision, `0 contactos · LOCAL_SYNTHETIC_NO_NETWORK` and one-use warning | Authority and recipient are derived server-side from the synthetic fixture; no institutional authority |
| 4 | Point to the deterministic contract and the no-clinical-advice boundary. | The contract limits the relay to offering human contact and uses a closed result schema | Instructions and parser are local; voice containment is not evidenced |
| 5 | Click **Ensayar doble confirmación** once. This button deliberately sends two concurrent confirmations. | One local fake execution and one one-use conflict; `identity_status=wrong_recipient` and `boundary_event=out_of_scope_request` are explicitly labelled fixtures | The medication/out-of-scope scenario is predetermined test data, never a live agent response |
| 6 | Keep **4. Revisión humana pendiente** visible; then click **Registrar revisión humana** only after explaining the gate. | Result state remains distinct from human review | Review is not clinical approval and does not resolve a Task |
| 7 | Open **Professional Relay**. | A second, separate relay for `PROFESSIONAL_REVIEW_REQUEST` | Patient and professional purposes, schemas and authority are not interchangeable |
| 8 | Click **Crear preview de Professional Relay**. | The server-derived opaque Task reference and eligible synthetic professional, plus the versioned contract and zero-provider state | The browser cannot choose a target, Task or phone |
| 9 | Click **Confirmar una vez**. | Predetermined normalized fixture, result pending human review | `acknowledged=yes` and availability are technical fixture values, not acceptance or authority |
| 10 | Before review, open **Evidencia / Trazabilidad** in a second tab or capture. | Task `synthetic-demo-professional-review-task` remains `OPEN`, assigned as before, with its own history | Relay neither resolves nor reassigns Task automatically |
| 11 | Return and click **Registrar revisión humana profesional**. | `HUMAN_REVIEWED` with explicit non-approval language | Review does not modify Task, RoleAssignment, episode, treatment or Safety Plan |
| 12 | Finish on **Evidencia / Trazabilidad** and the limitations card. | Typed provenance, audit references, lifecycle and blockers remain visible | Technical evidence is not clinical, regulatory or institutional validation |

## Required spoken disclosure

> Everything shown is a local synthetic fixture using the real Guardián UI and
> C03–C07 contracts. No CALL-E API key or network is present. C08 did not run
> live proof because there was no safely attested authorized destination and no
> verified account access. That weakens runtime evidence, but it does not change
> what the local implementation and tests demonstrate.

## Abort conditions

Stop the demo if a real identifier appears, the synthetic badge is absent, a
CALL-E credential is present, `CALL_E_REST_ENABLED` is not false, the origin is
not loopback, or the state cannot be explained as fixture/fake/dry-run. Do not
improvise a phone number, call, provider response or clinical interpretation.
