# C09 recording shot list and inspection checklist

Base URL for product shots: `http://127.0.0.1:3000`. Record a fresh local
synthetic state. This is not a public demo URL.

## Capture sequence

| Shot | Target time | Exact action / frame | Must be legible | Continuity check |
| ---: | --- | --- | --- | --- |
| 1 | 0:00–0:15 | Static evidence card built in the video editor from PE-01 and PE-04 | Claim, sample/context, DOI/official source, `not a GAS outcome claim` | No product-effect wording |
| 2 | 0:15–0:27 | `/` hero and synthetic badge | `SINTÉTICO / NO USO CLÍNICO`; human chain | No live or institutional implication |
| 3 | 0:27–0:33 | Select `demo-nurse`; click **INICIAR DEMO** | Synthetic alias and `nurse` role | Hide browser autofill and account chrome |
| 4 | 0:33–0:38 | Open `synthetic-demo-episode-buildweek`; select **Patient Relay** | Existing episode UI, Patient Relay heading | No terminal or `.env` on screen |
| 5 | 0:38–0:58 | Click **Crear preview de Patient Relay**; pan across purpose, masked target, authority/attestation, Task contract, red/provider and one-use notice | `+34*******01`, `SYNTHETIC_LOCAL_NO_PROVIDER`, `0 contactos`, `LOCAL_SYNTHETIC_NO_NETWORK` | Full synthetic number must never appear |
| 6 | 0:58–1:18 | Point to no-clinical-advice contract; click **Ensayar doble confirmación**; hold the normalized fixture | `boundary_event=out_of_scope_request`; explicit no observed conversation language | Narration calls it predetermined fixture |
| 7 | 1:18–1:33 | Hold status and lifecycle; editor annotation may explain concurrency | One fake application + one one-use conflict; review pending | Do not imply one physical dial |
| 8 | 1:33–1:41 | Select **Professional Relay** | Separate heading and synthetic/provider-off label | Patient and professional lanes visibly distinct |
| 9 | 1:41–1:52 | Click **Crear preview de Professional Relay**; pan across opaque Task, authority and contract | `synthetic-demo-professional-review-task`; server-derived context; `0 contactos` | Never reveal target user ID or full phone |
| 10 | 1:52–1:58 | Click **Confirmar una vez** | Predetermined fixture applied once | No provider animation or call sound |
| 11 | 1:58–2:08 | Hold normalized result and **4. Revisión humana pendiente** | `acknowledged=yes` plus non-acceptance text | Do not click review until the boundary is narrated |
| 12 | 2:08–2:15 | Cut to **Evidencia / Trazabilidad**, Task accountability | Task remains `OPEN`, assignee/history unchanged | No claim of SLA or institutional ownership |
| 13 | 2:15–2:30 | Return to preview/result evidence or use a clean split crop | Typed purpose/kind, authority revision, lifecycle, audit references | Technical evidence only |
| 14 | 2:30–2:43 | Static limitations card | Exact C08 states and `0 LIVE CALLS` | State the runtime-evidence weakness aloud |
| 15 | 2:43–2:50 | Closing title and verified repository URL | Project name, synthetic technical pre-pilot | No public demo/video URL until verified |

The review buttons may be shown and explained. If a recording includes clicking
them, show immediately that `HUMAN_REVIEWED` is not clinical approval and that
the Task remains unchanged. The core narrative only requires the result to be
pending review before this optional action.

## Pre-record checklist

- [ ] `pnpm demo:verify` passes immediately before recording.
- [ ] `CALL_E_REST_ENABLED=false`; no CALL-E API key is present.
- [ ] Browser is on loopback and the persistent synthetic badge is visible.
- [ ] Fresh fixture state supports both one-use flows.
- [ ] Notifications, password managers, bookmarks and personal browser profile
      details are hidden.
- [ ] Capture resolution is at least 1920×1080; browser zoom keeps labels and
      citations readable.
- [ ] Microphone test has no clipping, music-rights issue or background personal
      information.
- [ ] No real names, phone numbers, emails, patient identifiers, credentials,
      cookies, tokens, terminals, logs or `.env` files can enter the frame.
- [ ] No phone, ringing sound, waveform or staged conversation implies live use.

## Post-export inspection gate

Do not set `VIDEO_LT_180S=PASS` from the editor timeline. Inspect the exported
file itself:

- [ ] Record the filename outside Git and its SHA-256 in private release notes.
- [ ] Inspect container duration with `ffprobe`; require `< 180.000` seconds.
- [ ] Play the complete file at normal speed with sound.
- [ ] Confirm narration is audible, synchronized and complete.
- [ ] Pause on each evidence/limitation card and verify text at delivery
      resolution.
- [ ] Scan every frame transition for PHI/PII, credentials and browser chrome.
- [ ] Confirm the video says fixture/fake/dry-run and never presents a call as
      real.
- [ ] Confirm the C08 limitation is audible and visible.
- [ ] Confirm any video URL only after the human publisher makes it publicly
      accessible and tests it in a signed-out session.
- [ ] Keep the binary out of Git unless a separate explicit justification is
      approved.

Current state: no exported video was found in the worktree on 2026-09-09.
`VIDEO_LT_180S = NOT_VERIFIED`.
