# C09 judge video script — target 2:50

Target runtime is 2:35–2:50 and the hard ceiling is 2:59. This document is a
recording script, not proof of a finished video. `VIDEO_LT_180S = NOT_VERIFIED`
until a real export is inspected for duration, audio, legibility and sensitive
information.

Use only the local synthetic UI. Never add ringing audio, a phone shot, a live
provider console or an animation that could be mistaken for a real call.

| Time | Screen and capture | Exact English narration | On-screen text |
| --- | --- | --- | --- |
| 0:00–0:15 | Clean title card; show PE-01 and the NHS 72-hour source in large type | “Post-discharge outreach is time-bound and repetitive. One psychiatric emergency-department report made up to three attempts yet reached 37.7 percent of 69 eligible discharges. NHS England uses a 72-hour follow-up standard.” | `Published context — not a GAS outcome claim` · short DOI and NHS source footer |
| 0:15–0:27 | Home page, persistent synthetic badge and workflow label | “Guardián Alta Segura organizes that phone work without replacing clinical judgment. Every screen here uses synthetic data. Every decision and downstream action stays human.” | `LOCAL SYNTHETIC FIXTURE · NOT FOR CLINICAL USE` |
| 0:27–0:58 | Login as `demo-nurse`; open the fixed episode; Patient Relay; click **Crear preview de Patient Relay**; slow zoom over purpose, masked target, authority revision and zero-provider line | “Patient Relay starts with a professional, not an automatic trigger. The browser supplies only the episode. The server derives the synthetic recipient, purpose, region and current authority. Preview makes the masked destination, versioned contract and one-use confirmation visible before any execution. It shows zero provider contacts and local synthetic mode.” | `Patient Relay` · `Server-derived fixture authority` · `Preview: 0 provider contacts` |
| 0:58–1:18 | Keep the Patient contract visible, then activate **Ensayar doble confirmación**; zoom on `boundary_event=out_of_scope_request` | “The fixed fixture includes a medication question. The contract does not answer it. The normalized boundary event is ‘out of scope request’, and the UI sends it to human review. This is predetermined test evidence, not an observed agent conversation.” | `PREDETERMINED FIXTURE` · `Medication advice: out of scope` · `Voice behavior NOT EVIDENCED` |
| 1:18–1:33 | Hold the double-confirm status and lifecycle; optionally add a simple editor annotation `2 concurrent requests → 1 fake create + 1 conflict` without hiding the UI | “That button sent two confirmations concurrently. The one-use guard accepted one local fake create and rejected the other as a conflict. This proves local idempotency, not one physical dial.” | `1 LOCAL FAKE CREATE` · `1 ONE-USE CONFLICT` · `0 LIVE CALLS` |
| 1:33–1:58 | Switch to Professional Relay; create preview; show opaque Task, server-derived target, distinct task contract; click **Confirmar una vez** | “Professional Relay is a separate lane. Its purpose, schema and authority cannot be swapped with Patient Relay. The server derives an eligible synthetic professional and the existing opaque Task. Confirmation applies one predetermined local fixture; the browser cannot choose a phone, target or Task.” | `Professional Relay ≠ Patient Relay` · `Target + Task derived server-side` |
| 1:58–2:15 | Show result and **Revisión humana pendiente**; cut to Evidence/Traceability showing the linked Task still OPEN and unchanged | “The technical result stays pending human review. ‘Acknowledged’ is not acceptance. The linked Task remains open, assigned as before, and is neither resolved nor reassigned by the relay.” | `RESULT PENDING HUMAN REVIEW` · `Task: OPEN · unchanged` |
| 2:15–2:30 | Split capture: typed `recipientKind/purpose`, authority revision, lifecycle and audit/evidence references | “Typed authority binds recipient kind, purpose and server-side context. The append-only lifecycle and minimized evidence keep the technical result separate from review and from the Task record.” | `Typed authority` · `Append-only lifecycle` · `Minimized evidence` |
| 2:30–2:43 | Limitations card over unambiguous static background | “CALL-E live is off. No API key or authorized destination was available, so C08 did not run live proof. That weakens runtime evidence: voice, provider behavior and real delivery remain unproved.” | `CALL_E_RUNTIME_PROOF = NOT_EVIDENCED` · `LIVE_CALLS = NOT_EXECUTED` |
| 2:43–2:50 | Product title and repository URL | “Guardián Alta Segura: practical phone-work orchestration, with confirmation and clinical judgment kept human.” | `Guardián Alta Segura` · `Synthetic technical pre-pilot` |

## Source footer for the opening card

- Patel et al. (2026), DOI `10.7759/cureus.112101`; single-site QI, 69
  psychiatric ED discharges, 37.7% reached, up to three attempts.
- NHS England Digital (last edited 2026-06-09), 72-hour follow-up measure for
  adult acute and rehabilitation mental-health inpatient discharges.
- Full context and limitations: `docs/build-week/PROBLEM_EVIDENCE.md`.

The citation footer must remain readable at the final export resolution. Do not
use the reported contact rate as a target, comparator or forecast for GAS.
