# C09 submission and recording checklist

Status date: 2026-09-09. Checked items are repository evidence, not confirmation
of human account fields or external publication.

## Repository package

- [x] PR #58 mergeCommit fixed as
      `c5a0574e1e29299364a2cca6ec0b2bfdbc910429`.
- [x] Base push/main CI 34277781896 verified `completed/success` for that SHA.
- [x] C10 community PR #280 observed merged without modification.
- [x] Problem evidence has bounded claims, dates, sources, populations and
      limitations.
- [x] Most Practical Use Case narrative leads with concrete phone work.
- [x] Patient Relay and Professional Relay remain separate.
- [x] Demo instructions use the existing C03–C07 UI and contracts.
- [x] Every demonstration result is labelled synthetic fixture/fake/dry-run.
- [x] CALL-E live remains off; no API key, destination or call is used.
- [x] C08 limits remain unchanged.
- [x] Pre-existing baseline and hackathon delta are separated at the official
      submission-period start.
- [x] Devpost English copy is prepared but not submitted.
- [x] Video script and shot list target 2:50.
- [x] Repository URL verified public.
- [x] Local C09 validation results recorded in `C09_SUBMISSION_STATUS.md`.
- [x] Reconciled C09 package published through PR #62; squash
      `54fd5f2c34e87fe78b5c2893397007c08e2ce85d` and exact remote CI run
      `34505812217` / job `102967607049` verified from GitHub metadata.

## Video — do not infer PASS

- [ ] **[HUMAN]** Record only the local synthetic fixture flow.
- [ ] **[HUMAN]** Export a real file outside Git.
- [ ] **[HUMAN]** Verify exported duration is less than 180.000 seconds.
- [ ] **[HUMAN]** Listen to the complete audio and confirm synchronization.
- [ ] **[HUMAN]** Check UI labels and source footers at final resolution.
- [ ] **[HUMAN]** Inspect the entire video for PHI/PII, credentials and personal
      browser details.
- [ ] **[HUMAN]** Confirm no fake/dry-run sequence is presented as live.
- [ ] **[HUMAN]** Confirm the C08 runtime limitation is spoken and visible.
- [ ] **[HUMAN]** Publish to YouTube or Vimeo only after separate approval.
- [ ] **[HUMAN]** Verify the public video URL while signed out.

`VIDEO_LT_180S = NOT_VERIFIED`.

## Public demo — optional and currently absent

- [ ] **[BLOCKED — SEPARATE AUTHORIZATION]** Approve an external hosting model
      that preserves the safety boundary.
- [ ] **[HUMAN]** Verify the deployed URL, all flows and availability.
- [ ] **[HUMAN]** Recheck that live CALL-E, credentials and real data remain
      absent.

`PUBLIC_DEMO = NOT_VERIFIED`. Do not paste a localhost URL into Devpost as a
functional public demo.

## Devpost human fields

- [ ] **[HUMAN]** Confirm entrant eligibility and Devpost registration.
- [ ] **[HUMAN — PRIVATE]** Enter the CALL-E-account email in the form; never
      add it to Git.
- [ ] **[HUMAN]** Add the inspected public video URL.
- [ ] **[HUMAN]** Add a public demo URL only if separately verified; otherwise
      omit the optional field.
- [ ] **[HUMAN]** Review the current official rules and required declarations.
- [ ] **[HUMAN]** Re-read every outcome, compliance and endorsement statement.
- [ ] **[HUMAN]** Submit Devpost. Codex does not perform this action.

## Final machine validation

- [x] Frozen install and Prisma generate.
- [x] PostgreSQL 16 empty-base migration deploy, seed, status and drift.
- [x] Format, lint and strict typecheck.
- [x] Unit, integration and tooling tests: 556 + 120 + 35 = 711/711.
- [x] Traceability, governance (44 claims) and CALL-E boundary checks.
- [x] Build: 18/18 static pages.
- [x] Full E2E final rerun: 83/83, one worker and zero retries.
- [x] `git diff --check` after final documentation cleanup.
- [x] Historical C09 `pnpm audit --prod --json`: expected nonzero, inherited 2
      critical + 9 high + 3 moderate; C09 attributable 0.
- [x] C09-SEC `pnpm audit --prod --json`: 0 critical, 1 high, 0 moderate on
      Next 16.3.3 / Prisma 6.19.3; `deepmerge-ts` high remains open and
      unaccepted under GAS2-R-022.
- [x] Secret, E.164, email, DNI/NIE and clinical-content scans reviewed; C09
      delta matches 0 and contains only synthetic/aggregate content.
- [x] C09 reconciliation publication identity verified after merge through PR
      #62. C11 uses its own single-commit/Draft-PR publication gate.
- [x] Remote CI verified for the exact C09 reconciliation squash.

Repository: `https://github.com/Luis195f/guardian-alta-segura`

Current external states remain:

```text
PUBLIC_DEMO = NOT_VERIFIED
VIDEO_LT_180S = NOT_VERIFIED
PUBLIC_JUDGE_DEMO = BLOCKED
LIVE_PROOF = NOT_EVIDENCED
PUBLIC_DEPLOYMENT_READINESS = NO_GO
LIVE_CALLS = NOT_EXECUTED
```
