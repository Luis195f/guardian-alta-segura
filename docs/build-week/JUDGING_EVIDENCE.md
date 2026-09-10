# C09 judging evidence matrix

Competition criteria were rechecked on the official
[CALL-E Devpost page](https://call-e.devpost.com/) on 2026-09-09. Stage Two
weights Real World Impact, Quality of the Idea, Technical Implementation and
Product Experience & Demo equally. The current rules describe runtime use as
part of Technical Implementation. C09 therefore exposes, rather than hides, the
absence of live runtime proof.

Evidence baseline: PR #58 merge commit
`c5a0574e1e29299364a2cca6ec0b2bfdbc910429`, committed
2026-09-08T22:57:17+02:00 and validated by push/main CI run 34277781896. A
timestamp identifies when evidence was observed; it is not a clinical,
institutional or regulatory approval.

That baseline and the timestamps in the matrix are historical C09 evidence.
The reconciled document package is based on C09-SEC squash
`6a64564599369b24f2d00fe9ceca1093d1a5c92f`, whose post-merge run 34464666948
completed successfully. C09-SEC changed dependencies and their evidence, not
the C03–C07 relay claims below; earlier test observations are not attributed to
Next 16.3.3 or Prisma 6.19.3.

| Claim | Competition criterion | Route / code evidence | Executable or documentary test | Proof type | Evidence timestamp | Limitation |
| --- | --- | --- | --- | --- | --- | --- |
| Time-bounded post-discharge phone work can involve repeated attempts and non-contact. | Real World Impact | `docs/build-week/PROBLEM_EVIDENCE.md` PE-01–PE-04 | Source-level claim review; DOI/official URLs, dates, populations and limits recorded | Published evidence; not GAS live proof | Sources consulted 2026-09-09 | Settings differ; no GAS effect, workload saving, reach-rate or outcome claim |
| The product focuses on one practical phone-work handoff: create a bounded relay intent, require human confirmation, return a minimal result for human review. | Real World Impact; Most Practical Use Case | `src/application/relay/manage-continuity-relay.ts`; `src/presentation/components/patient-relay-panel.tsx`; `professional-relay-panel.tsx` | `manage-continuity-relay.test.ts`; Patient/Professional Relay E2E | Local dry-run with synthetic fakes/fixtures | Local code at baseline 2026-09-08T22:57:17+02:00 | A credible direction to evaluate, not demonstrated operational benefit or real-user adoption |
| The same product UI provides a coherent judge walkthrough; no parallel demo application is used. | Product Experience & Demo | Episode workspace tabs and the two relay panels under `src/presentation`; `JUDGE_DEMO_RUNBOOK.md` | `tests/e2e/patient-relay.spec.ts`; `professional-relay.spec.ts`; `zz-continuity-relay-adversarial.spec.ts` | Local synthetic dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | Loopback only; public URL absent; video not yet recorded or inspected |
| A server-only CALL-E REST adapter is implemented but disabled by default and has no live entrypoint. | Technical Implementation | `src/infrastructure/call-transport/call-e-rest-adapter.ts`; `call-e-rest-runtime.ts`; `.env.example`; `src/application/outbound-call/execute-outbound-call.ts` | `call-e-rest-adapter.test.ts`; `call-e-rest-config.test.ts`; `execute-outbound-call.test.ts`; boundary checker | Dry-run/fake transport only | Local code at baseline 2026-09-08T22:57:17+02:00 | CALL-E was not called at runtime; no API key, provider response, account capability or live result was evidenced |
| Patient Relay is a separate, local, deterministic synthetic flow for a human callback offer. | Product Experience & Demo; Quality of the Idea | `patient-relay-panel.tsx`; Patient Relay API routes; `synthetic-demo-patient-relay.ts`; `patient-relay-contract.ts` | `patient-relay-contract.test.ts`; `patient-relay-confirmation-cookie.test.ts`; Patient Relay E2E | Synthetic fixture/dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | No call, conversation, voice behavior, identity disclosure or clinical response was observed |
| A synthetic medication/treatment question is contained as `boundary_event=out_of_scope_request` and routed to human review. | Product Experience & Demo; Quality of the Idea | Static patient task contract and fixture in `synthetic-demo-patient-relay.ts`; normalized presentation in `patient-relay-panel.tsx` | `continuity-relay-adversarial.test.ts`; Patient Relay E2E | Predetermined fixture/dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | Proves local contract/parser/presentation only; not how a live voice agent would respond |
| Two concurrent confirmations consume one one-use confirmation and produce one local fake create. | Technical Implementation; Product Experience & Demo | `manage-continuity-relay.ts`; `prisma-continuity-relay-store.ts`; Patient/Professional panel double-confirm actions | `manage-continuity-relay.test.ts`; `continuity-relay.integration.test.ts`; Patient Relay and C07 E2E | Local concurrency dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | Does not prove provider idempotency or exactly one physical dialing attempt |
| Professional Relay is a distinct synthetic flow whose target professional and opaque Task are derived server-side. | Most Practical Use Case; Product Experience & Demo | `professional-relay-panel.tsx`; Professional Relay API routes; `synthetic-demo-professional-relay.ts`; `professional-relay-contract.ts` | `professional-relay-contract.test.ts`; `professional-relay-confirmation-cookie.test.ts`; Professional Relay E2E | Synthetic fixture/dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | No institutional directory/contact authority, arbitrary target, live call or verbal identity check |
| Relay authority is typed by `recipientKind` and `purpose`, bound to server-side context and revalidated before execution. | Technical Implementation | `src/domain/relay/continuity-relay.ts`; application authority port; synthetic resolvers; unavailable resolver | Relay domain/adversarial tests; application tests; C07 E2E | Local policy/dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | Productive authority, destination attestation and local policy remain deny-all/pending |
| GAS does not persist CALL-E transcripts; persisted relay evidence is minimized. | Technical Implementation; Quality of the Idea | Prisma relay/outbound ledgers; HMAC protector; sanitized HTTP errors | C07 adversarial unit/E2E; persistence integration; boundary checker | Local synthetic negative proof | Local code at baseline 2026-09-08T22:57:17+02:00 | Provider retention behavior is not asserted; retention, recordings/transcripts and related supplier controls remain future due diligence |
| Every terminal synthetic result remains pending human review, and review does not approve clinically or modify Task/RoleAssignment. | Most Practical Use Case; Product Experience & Demo | `result-governance.ts`; relay store; both relay panels; evidence panel | `result-governance.test.ts`; persistence integration; both relay E2E | Local synthetic dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | Human review is a technical workflow state, not validated clinical governance |
| Professional Relay result and review do not auto-resolve or reassign the linked Task. | Most Practical Use Case; Technical Implementation | `synthetic-demo-professional-relay.ts`; Task ledger/projection; governance evidence view | Professional Relay E2E compares Task and RoleAssignment before/result/review | Local PostgreSQL dry-run | Local code at baseline 2026-09-08T22:57:17+02:00 | No institutional responsibility, SLA, acceptance or escalation policy is established |
| Live proof was not executed because no authorized destination was safely attested and account access was not verified. | Technical Implementation; Product Experience & Demo | ADR-0019 C08; `gas2-evidence-index.md` C08; `C09_SUBMISSION_STATUS.md` | Negative gate review; no runtime test claimed | `NOT_EVIDENCED` / no live execution | C08 cut-off 2026-09-08T13:15:00.991Z | Material competition weakness: runtime CALL-E behavior, voice containment and provider operation remain unproved |

## Criterion narrative

### Real World Impact

Lead with the specific work, not an outcome promise: teams may have a short
post-discharge window, repeat outreach and still not make contact. GAS makes the
intent, responsible human, one-use confirmation, result state and review status
visible in one synthetic workflow. It has not been evaluated with real users.

### Most Practical Use Case

The practical idea is division of labor with explicit limits. Patient Relay
models a bounded callback offer. Professional Relay models a bounded request to
review an existing Task. The relays do not share authority, infer a destination,
answer medication questions, or turn provider output into a clinical or Task
decision. Humans retain confirmation and review.

### Technical Implementation

Show the non-trivial implementation: typed pairs, server-side derivation, HMAC
binding, one-use CAS, append-only lifecycle, strict schemas, same-reference
reconciliation, minimization and negative tests. Also state the decisive gap:
the adapter is implemented-disabled and CALL-E runtime proof is not evidenced.

### Product Experience & Demo

The video must use the real episode UI and label every result as synthetic
fixture/fake/dry-run. Do not add an animated call, waveform, ringing sound,
provider console or staged phone shot that could imply a live call.
