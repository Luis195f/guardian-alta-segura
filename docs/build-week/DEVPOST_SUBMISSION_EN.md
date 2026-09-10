# Devpost copy draft — C09

> **DRAFT ONLY — HUMAN REVIEW AND SUBMISSION REQUIRED.** Do not submit or publish
> this text automatically. Remove the editorial notes and complete only the
> human fields after separately verifying them.

## Project title

Guardián Alta Segura: Human-Gated Post-Discharge Relays

## Tagline

Turn time-critical post-discharge phone work into two traceable,
human-controlled relay workflows.

## Problem

Post-discharge follow-up is practical, time-bound work. Teams may need to make
repeated contact attempts, keep the right person and purpose attached to each
attempt, contain questions that need professional judgment, and preserve what
still needs review.

Published evidence illustrates the operational problem without establishing an
outcome for this project. A 2026 single-site psychiatric emergency-department
quality-improvement report made up to three attempts per eligible discharge and
reached 37.7% of 69 eligible discharges. A separate general-medicine trial used
a minimum of five attempts at different times and on different days when
needed. NICE and NHS England publish short mental-health follow-up windows,
including seven-day, selected 48-hour and system-level 72-hour expectations.
These populations, policies and results must not be extrapolated to Guardián
Alta Segura.

Sources: [Patel et al., DOI 10.7759/cureus.112101](https://doi.org/10.7759/cureus.112101),
[Soong et al., DOI 10.1371/journal.pone.0112230](https://doi.org/10.1371/journal.pone.0112230),
[NICE NG53](https://www.nice.org.uk/guidance/ng53/chapter/recommendations), and
[NHS England Digital 72-hour follow-up guidance](https://digital.nhs.uk/data-and-information/data-collections-and-data-sets/data-sets/mental-health-services-data-set/submit-data/quick-guide-to-submitting-72-hour-follow-ups-for-discharges-from-adult-acute-inpatient-beds).

## What it does

Guardián Alta Segura is a synthetic-data technical pre-pilot for organizing
post-discharge continuity. The hackathon demo adds two explicit phone-work
lanes to the existing episode workspace:

- Patient Relay models a bounded offer of human callback.
- Professional Relay models a bounded request for an already assigned
  professional to review an existing opaque Task.

A professional starts a preview. The server derives the synthetic destination,
recipient kind, purpose and current authority. A one-use confirmation is bound
to that exact context. A predetermined local fixture returns a strict,
minimal result that remains pending human review. The relay never diagnoses,
answers medication questions, selects a real destination, resolves or reassigns
a Task, closes an episode, changes treatment or triggers another communication.

## How it works

1. A professional opens a synthetic discharge episode and chooses one of the
   two typed relay lanes.
2. The browser sends only the episode context; it cannot provide a phone,
   recipient or Task override.
3. A server-side authority resolver derives the permitted synthetic target,
   purpose, region/locale fixture and, for Professional Relay, the opaque Task.
4. Preview shows a masked target, versioned deterministic contract, authority
   revision, no-cancellation warning and `0 provider contacts`.
5. Confirmation is single-use and consumed atomically. The double-confirm demo
   produces one local fake create and one conflict.
6. Patient Relay's fixed fixture includes a medication/treatment question. Its
   closed result is `out_of_scope_request`, requiring human review; it is not an
   observed voice-agent response.
7. Professional Relay returns only closed administrative enums. Acknowledgement
   does not mean Task acceptance.
8. Result lifecycle, review and Task history stay separate and visible in the
   evidence view.

## How it was built

The application uses Next.js App Router, strict TypeScript, PostgreSQL 16 and
Prisma. Domain and application services own validation and authorization;
presentation and HTTP routes are adapters. The relay boundary uses typed
recipient/purpose pairs, a server-only authority port, HMAC-bound context,
one-use compare-and-set confirmation, append-only lifecycle events, strict
result schemas, stable idempotency references and minimized persistence.

Vitest exercises domain and application behavior. PostgreSQL integration tests
cover constraints, concurrency, replay and append-only history. Playwright
tests use one worker and zero retries to cover the real UI, role denials,
double confirmation, unchanged Task state and focused accessibility checks. A
tooling boundary blocks the SDK, live entrypoints, relay network access,
webhooks, batch/fan-out and forbidden persisted fields.

## CALL-E integration

We implemented an original server-only REST adapter against the inspected
CALL-E Calls contract. It is disabled by default and has no live application
entrypoint. The SDK is not included. The adapter supports a future controlled
evaluation pattern: reserve a local intent and idempotency reference, create at
most once, persist the provider reference, reconcile with GET, validate a
strict result and require human review.

For this submission, CALL-E live stayed off. No API key was available in the
session and no own/authorized destination had a safe local attestation, so C08
did not perform authenticated access, dry-run or a call. No CALL-E request or
real phone call was executed. This materially weakens runtime evidence,
including voice containment, delivery and provider behavior. We disclose that
gap because a local fixture must not be presented as a real call.

## Patient Relay

Patient Relay is a local deterministic demonstration of a narrow callback
offer. The server derives a synthetic patient fixture and the purpose
`PATIENT_CALLBACK_OFFER`. The versioned contract does not provide clinical,
medication, legal or financial advice. Its fixed out-of-scope fixture is shown
as test evidence pending human review, never as a conversation that happened.

## Professional Relay

Professional Relay is a separate local demonstration for
`PROFESSIONAL_REVIEW_REQUEST`. The server derives one open opaque Task, its
eligible synthetic professional and current role/episode relationship. The
browser cannot choose the target. Result and review leave the Task open,
assigned as before, with no automatic acceptance, reassignment or resolution.

## Privacy and safety

- Synthetic fixtures and identities only; not for clinical use.
- Clinical judgment, confirmation and downstream action remain human.
- No diagnosis, prescription, suicide prediction, opaque scoring or autonomous
  clinical action.
- GAS does not persist CALL-E transcripts. The local relay ledger otherwise
  remains restricted to the documented minimized allowlist.
- Patient and professional authority, purpose, schemas and audit namespaces are
  separate.
- Missing or malformed results abstain; `unknown` is never converted to “no.”
- Every terminal result stays pending human review.
- The CALL-E adapter is server-only, disabled and unreachable from the demo.
- No clinical, legal, regulatory or institutional validation is claimed.

## Challenges

The hardest problem was not making a phone screen. It was keeping the practical
workflow coherent when the most important evidence was negative: the browser
must not select a recipient; confirmation must not replay; an external result
must not become authority; a medication question must not receive invented
advice; and the demo must remain useful without staging a fake live call.

The second challenge was the provider boundary. The inspected REST contract
does not make an accepted external effect transactional with PostgreSQL, so the
design preserves uncertainty and reconciles by provider reference instead of
creating again. That behavior is tested with fakes, not claimed live.

## Accomplishments

- Two separate relay journeys in the existing product UI, not a parallel demo.
- Server-derived synthetic authority and target context.
- Preview plus atomic one-use confirmation.
- One fake create under concurrent double confirmation.
- Strict, recipient-specific normalized result schemas.
- Human review separated from result and Task state.
- Append-only, minimized evidence with adversarial negative tests.
- A merged reusable offline containment corpus in the CALL-E community
  repository.

These are technical implementation accomplishments. They are not evidence of
clinical effectiveness, workload reduction, adoption, compliance or
institutional support.

## What we learned

A practical phone workflow needs more than a call button. It needs typed
purpose, current authority, recipient binding, visible preview, idempotency,
conservative uncertainty and a place for a human to decide what the result
means. We also learned that honest absence is part of evidence: a blocked live
gate is weaker than runtime proof, but safer and more useful than a staged call
presented as real.

## Limitations

This is a local, synthetic technical pre-pilot. There is no public deployment,
real-patient data, production identity provider, institutional directory,
approved destination policy, verified CALL-E account capability, live CALL-E
runtime proof, voice test, provider-retention assessment, clinical validation,
real-user evaluation, hospital integration, FHIR runtime, regulatory approval
or institutional endorsement. The application has not been shown to reduce
workload, improve contact or change clinical outcomes.

The historical C09 dependency audit reported 2 critical, 9 high and 3 moderate
advisories before remediation. C09-SEC updated the supported dependency graph to
Next 16.3.3 and Prisma 6.19.3, with `browserslist` 4.28.9 in the lockfile; its
production audit reports 0 critical, 1 high and 0 moderate. The remaining
`deepmerge-ts` 7.1.5 high advisory is open and not accepted under GAS2-R-022.
This improved result does not establish total security or readiness for public
deployment, which remains `NO_GO`.

The current competition rules treat runtime CALL-E use as part of Technical
Implementation. Because runtime proof is not evidenced, judges may weigh this
gap materially even though the project can still be presented.

## What’s next

Any future live evaluation would be a separately authorized phase: verify the
account without exposing a key; attest an own or explicitly authorized
destination; approve one exact synthetic purpose; revalidate region and terms;
obtain immediate human confirmation; perform a bounded test; and inspect
provider behavior and minimization without using clinical data. Productive use
would additionally require local clinical, legal, privacy, identity, operations
and safety decisions. Real-patient use remains `NO_GO`.

## Existing project and hackathon delta

The repository existed before the submission period. The exact pre-period
baseline is commit `88be7da66c38f32f319e0fefc57f8246a1739a51`, committed
2026-07-22T21:59:09+02:00, before the official 2026-07-23T21:30 SGT start. It
already contained the core governance, Next.js/Prisma foundation, synthetic
demo authentication/RBAC, discharge episodes, versioned Safety Plan, check-ins,
deterministic alerts, human workqueue/tasks, caregiver controls, Home Safety,
SBAR preview, crisis blocked state and role-based episode workspace.

After the hackathon start, the repository added architecture and evidence
hardening, a reproducible synthetic demo and the CALL-E-specific C01–C08 delta:
the documented boundary, disabled REST adapter, typed Continuity Relay core,
Patient Relay, Professional Relay, result governance, adversarial proofs and an
honestly blocked live-proof record. C09 adds only judge/submission evidence and
does not add functionality. The external community C10 pull request was merged
on 2026-09-02.

## Verified links

- Public source repository:
  `https://github.com/Luis195f/guardian-alta-segura`
- Merged CALL-E community contribution:
  `https://github.com/CALLE-AI/awesome-phone-call-agents/pull/280`

No functional public demo URL or public video URL has been verified. Do not add
one until a human has separately published and checked it while signed out.

## Human-only fields before submission

- **[HUMAN REQUIRED]** Entrant/team names and eligibility confirmation.
- **[HUMAN REQUIRED]** Devpost registration confirmation.
- **[HUMAN REQUIRED — PRIVATE FORM FIELD]** Email associated with the CALL-E
  account. Never commit it to Git.
- **[HUMAN REQUIRED]** Public video URL after full export inspection.
- **[OPTIONAL HUMAN DECISION]** Public demo URL; currently omit because none is
  verified.
- **[HUMAN REQUIRED]** Select prize/category fields offered by the form; use the
  Most Practical Use Case narrative where the form permits.
- **[HUMAN REQUIRED]** Final review of official rules, third-party notices and
  all checkboxes at submission time.
- **[HUMAN REQUIRED]** Final Devpost submit action. Codex must not perform it.
