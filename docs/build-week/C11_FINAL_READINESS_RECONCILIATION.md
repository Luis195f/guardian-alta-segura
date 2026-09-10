# C11 final readiness reconciliation

Reconciliation date: 2026-09-10. This document is a conservative, documentary
readiness overlay. It does not enable runtime, networking, calls, webhooks,
provider access, public hosting or any live entrypoint.

## Verified anchors

| Anchor | Verified value | Evidence boundary |
| --- | --- | --- |
| C11 branch | `docs/calle-final-readiness-c11` | Began clean, with no commits, upstream or remote C11 branch |
| Exact base, HEAD and `origin/main` | `54fd5f2c34e87fe78b5c2893397007c08e2ce85d` | Repository anchor, not clinical or operational approval |
| GAS PR #62 | `MERGED`; squash `54fd5f2c34e87fe78b5c2893397007c08e2ce85d` | GitHub metadata observed read-only |
| Base CI | Run `34505812217`, job `102967607049`, `completed/success`, exact base SHA | Technical synthetic baseline only |
| CALL-E community PR #280 | `MERGED`; head `c93b7b6f0359091701870e9e5ecc40d8e0829e25`; merge commit `342a15c3d100d28a9530b1e32cc1b7242d8eb380` | Upstream community contribution; not CALL-E runtime evidence in GAS |

## Readiness separated by boundary

Evidence does not transfer between rows. In particular, an implemented-disabled
adapter and passing local tests are not a real CALL-E request, provider response,
call, public deployment, clinical authorization or production qualification.

| Boundary | Evidence present | Current result | Limit that remains |
| --- | --- | --- | --- |
| A. Core GAS synthetic | Reproducible loopback demo, synthetic seed, authorization, append-only histories, deterministic rules and human-reviewed workflows with passing local/CI evidence | `PASS` for the synthetic technical baseline | No clinical effectiveness, adoption, legal, regulatory, institutional or production claim |
| B. CALL-E Hackathon Sandbox | Original REST adapter implemented server-only and disabled by default; typed relay core; local Patient/Professional fixtures; fake transport, PostgreSQL and E2E tests; boundary checker | `CALL_E_SANDBOX = PASS` only under this synthetic/local definition | SDK absent, SDK license unresolved, live entrypoint absent, real CALL-E runtime proof not evidenced, no provider/voice/delivery claim |
| C. Public synthetic judge demo, live off | Repository and local runbook are public; the application itself remains loopback-only | `PUBLIC_DEMO = NOT_VERIFIED`; `VIDEO_LT_180S = NOT_VERIFIED`; `PUBLIC_JUDGE_DEMO = BLOCKED` | No public application URL, exported video or signed-out verification was found; C11 does not deploy or publish them |
| D. Future clinical pilot | Decision-support documents only | `REAL_PILOT = NO_GO` | Clinical, legal, privacy, identity, operational, safety, procurement and institutional gates remain unresolved |
| E. Production | No productive environment, identity, operations, continuity, provider integration or release authority | `PRODUCTION = NO_GO` | Requires a separately governed future program and cannot be inferred from sandbox evidence |

## C08 observed values and reason for non-execution

At the C08 read-only cut-off, the session variable for a CALL-E credential was
absent; account capability and KYC were not verified; and no own or explicitly
authorized destination had a safe local attestation. The official regional
source listed Spain, Spanish and English, and the `International` line region,
described primarily for testing. Those published regional values are mutable
capability information, not authorization of any destination, account or call.

Because the credential and destination-attestation gates independently failed,
the authenticated read-only check, dry-run, live entrypoint, provider request and
call were all `NOT_EXECUTED`. This explains the negative evidence; it does not
upgrade it to runtime proof.

## Privacy, supplier and legal boundary

GAS does not persist CALL-E transcripts.

No claim is made about provider retention behavior. Before any future live or
real use, due diligence must separately address DPA/processor terms,
transfers/localization, retention, recordings/transcripts, security/SLA/business
continuity, incident handling, ePrivacy/telecom, procurement, legal basis,
consent and supplier exit. C11 does not determine legal basis, MDR applicability
or classification.

## Open controls and residual risk

`DEC-019`, `GAP-DCB-025`, `GAS2-R-021`, `GAS2-R-022`, the open
`deepmerge-ts` advisory and `HAZ-GAS-021` through `HAZ-GAS-038` remain open and
unaccepted. The known production-audit baseline is 0 critical, 1 high and 0
moderate; it is not a zero-vulnerability or public-deployment-readiness claim.
No residual risk is accepted by this reconciliation.

## Local validation

Validation used PostgreSQL 16.10 in an auto-remove container bound only to
`127.0.0.1:55442`, with tmpfs storage and no persistent volume. The public
schema was observed with zero tables before applying all 20 migrations and was
recreated empty again before the final E2E run.

| Gate | Final result | Limitation |
| --- | --- | --- |
| Frozen install and Prisma generate | PASS; 412 packages reused, 0 downloaded; Prisma Client 6.19.3 | Dependency graph and schema unchanged |
| Migrations, seed, status and drift | PASS; 20/20 applied, seed successful, schema current, drift 0 | Synthetic PostgreSQL only |
| Format, lint and typecheck | PASS | Static/local evidence |
| Full suite and independent tooling | PASS; 556 unit, 120 integration and 35 tooling tests | Synthetic/local evidence |
| Traceability, governance and CALL-E boundary | PASS; 44 claims; local references resolved; SDK absent and live entrypoint absent | Does not validate external truth |
| Build | PASS; 18/18 static pages | Build is not deployment |
| Full E2E | PASS; 83/83, one worker, zero retries | Chromium and synthetic fixtures only |
| Production audit | Expected nonzero: 0 critical, 1 high, 0 moderate | `deepmerge-ts` remains open and unaccepted |
| Documentary references | PASS; 158 local links checked, 0 broken | External URLs were not content-validated |
| Added-content sensitive-pattern scan | PASS; secrets, E.164, emails, DNI/NIE, Spanish IBAN and clinical-ID assignments all 0 | Pattern scan is not a legal/privacy assessment |

Two initial documentary checks exposed correctable C11 issues: README formatting
and two new Markdown links that were incompatible with the existing tooling
fixture. Both were corrected documentally and the final gates passed. An E2E
diagnostic accidentally reused a database already mutated by an earlier run and
failed 5 of 83 tests; it is not the final gate. After an explicit empty-schema
reset, the unchanged suite passed 83 of 83. No assertion, retry, worker or
timeout setting was relaxed.

## Canonical C11 state

```text
CALL_E_COMMUNITY_PR = MERGED
CALL_E_SANDBOX = PASS
LIVE_PROOF = NOT_EVIDENCED
PUBLIC_DEMO = NOT_VERIFIED
VIDEO_LT_180S = NOT_VERIFIED
PUBLIC_JUDGE_DEMO = BLOCKED
REAL_OUTREACH = NO_GO
REAL_PILOT = NO_GO
PRODUCTION = NO_GO
LEGAL_BASIS = NOT_DETERMINED
MDR = NOT_DETERMINED
CONTRADICTORY_CLAIMS = 0
RESIDUAL_RISK_ACCEPTANCE = NONE
LIVE_CALLS = NOT_EXECUTED
C12 = NOT_STARTED
```

Commit, Draft PR and remote CI identifiers are read after publication from Git
and GitHub metadata. They are deliberately not self-referential fields in this
commit.
