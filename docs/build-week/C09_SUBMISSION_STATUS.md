# C09 reconciled submission status

Reconciliation date: 2026-09-10. C09 and this reconciliation are documentation
and submission preparation only. The original C09 evidence below remains
historical evidence for its exact source head; current dependency and validation
evidence is recorded separately against the remediated base.

> **Historical C09 record.** The current cross-boundary state is governed by
> [C11 final readiness reconciliation](C11_FINAL_READINESS_RECONCILIATION.md).
> GAS PR #62 was subsequently merged at
> `54fd5f2c34e87fe78b5c2893397007c08e2ce85d`; its exact CI run
> `34505812217` / job `102967607049` completed successfully. C11 does not
> reinterpret the historical execution evidence below.

## Historical C09 reconciliation base

| Check | Verified state |
| --- | --- |
| Worktree | `C:\Users\luism\source\repos\GAS-CALLE-C09-RECON` |
| Branch | `docs/calle-judge-demo-c09-reconciled` |
| Exact base / `origin/main` | `6a64564599369b24f2d00fe9ceca1093d1a5c92f` |
| Security PR #61 | `MERGED`; squash `6a64564599369b24f2d00fe9ceca1093d1a5c92f` |
| Security post-merge CI | Run [34464666948](https://github.com/Luis195f/guardian-alta-segura/actions/runs/34464666948), job `102830316147`, `completed/success`, exact head SHA |
| Original C09 PR #60 | `OPEN`, Draft, head `2b1eb504419da413defe5000fb35c30a4038c459`, `CONFLICTING/DIRTY`; preserved without modification |
| Initial reconciliation state | HEAD and `origin/main` equal exact base; 0 reconciliation commits; worktree/stage/untracked clean; remote reconciliation branch absent |

No pull, rebase, merge, cherry-pick, reset, stash or modification of PR #60 was
performed. The temporary local upstream to `origin/main` came only from
worktree creation and does not make `origin/main` the publication target.

## Historical C09 preconditions — 2026-09-09

| Check | Verified state |
| --- | --- |
| Worktree | `C:\Users\luism\source\repos\GAS-CALLE-C09` |
| Branch | `feat/calle-judge-demo-submission-c09` |
| PR #58 | `MERGED` at 2026-09-08T20:57:18Z |
| Exact base / PR #58 mergeCommit | `c5a0574e1e29299364a2cca6ec0b2bfdbc910429` |
| Base push/main CI | Run [34277781896](https://github.com/Luis195f/guardian-alta-segura/actions/runs/34277781896), `completed/success`, exact head SHA |
| Initial C09 state | HEAD and `origin/main` equal exact base; 0 C09 commits; worktree/stage clean; no upstream or remote C09 branch |
| Community C10 PR #280 | [MERGED](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/280) at 2026-09-02T02:12:40Z; head `c93b7b6f0359091701870e9e5ecc40d8e0829e25`; observed read-only, not modified |

No automatic rebase was performed. Any later movement of `origin/main` does not
change the pinned C09 base and requires a separate human decision.

## Evidence gates before publication

| Gate | State | Evidence / next human action |
| --- | --- | --- |
| Problem evidence | `COMPLETE` | `PROBLEM_EVIDENCE.md`; four bounded claims with source, date, context and limits |
| Most Practical narrative | `COMPLETE` | `DEVPOST_SUBMISSION_EN.md`, `JUDGING_EVIDENCE.md` |
| Public demo URL | `NOT_VERIFIED` | No URL exists; local loopback demo only. External deployment requires separate authorization and inspection. |
| Video under 180 seconds | `NOT_VERIFIED` | No video file exists in the worktree; inspect duration, audio, legibility and sensitive data after human recording. |
| Video URL | `BLOCKED` | Human must record, inspect and publish separately; C09 does not upload. |
| Devpost registration/account email | `NOT_VERIFIED` | Human-only account field; do not infer or print it. |
| Devpost submission | `NOT_RUN` | Human must review and submit separately. |
| Repository URL | `VERIFIED_PUBLIC` | `https://github.com/Luis195f/guardian-alta-segura` |
| Community PR URL | `VERIFIED_MERGED` | `https://github.com/CALLE-AI/awesome-phone-call-agents/pull/280` |

## Preserved C08 boundary

```text
LIVE_PROOF = NOT_EVIDENCED
CALL_E_RUNTIME_PROOF = NOT_EVIDENCED
LIVE_CALLS = NOT_EXECUTED
```

No live entrypoint, API key, authorized target attestation, provider request,
CALL-E traffic or call is added or executed in C09.

## Historical local validation C09 — before C09-SEC

Executed on 2026-09-09 against isolated PostgreSQL 16.14 containers bound only
to loopback, with synthetic databases on tmpfs. These results belong to source
head `2b1eb504419da413defe5000fb35c30a4038c459` and its pre-remediation
dependency graph; they are not attributed to Next 16.3.3 or Prisma 6.19.3.

| Check | Result | Scope / limitation |
| --- | --- | --- |
| Frozen install | PASS; 409 packages reused, 0 downloaded | Existing lockfile unchanged |
| Prisma generate | PASS; Prisma Client 6.19.0 | No schema or migration change |
| Empty database, deploy, seed, status, drift | PASS; 20/20 migrations, seed completed, schema current, drift 0 | PostgreSQL 16.14; public tables before deploy: 0 |
| Format, lint, typecheck | PASS after removing documentation formatting drift | No runtime edit |
| Unit + integration + tooling | PASS; 556 + 120 + 35 = 711/711 | Fakes/fixtures and synthetic local PostgreSQL only |
| Tooling invocation | PASS; 35/35 | Executed separately as required |
| Traceability and governance | PASS; 14 requirements, 44 claims, local references resolved, Markdown/CSV drift 0 | Repository evidence only |
| CALL-E boundary | PASS | SDK absent; no live entrypoint, ingress, webhook, Goals, batch or helper surface |
| Build | PASS; 18/18 static pages | Local build, not deployment qualification |
| Full E2E | PASS final; 83/83, one worker, zero retries | First full attempt was 82/83 because one login request reset its connection; no code/config change, then a full rerun from another empty base passed |
| Initial Draft CI run 34359524453 | FAIL at tooling, 34/35 after unit 556/556 and integration 120/120 passed | Eight new index links were absent from the governance test's isolated fixture; final C09 uses path text and reruns the checker/test before replacing the Draft head |
| Production dependency audit | EXPECTED NONZERO; 2 critical, 9 high, 3 moderate | Unchanged inherited graph; C09 attributable 0; blocks public-deployment readiness claims |
| Repository/delta scans | PASS after review | Whole tracked tree: E.164 0, DNI/NIE 0; two `.invalid` test emails; secret-shaped matches were placeholders/test fixtures. C09 delta matches 0. `gitleaks` unavailable. |
| Clinical/personal-content review | PASS for C09 delta | New aggregate research context and synthetic UI references only; no person-level or real clinical data |

The first sandboxed frozen-install attempt could not read Corepack's global
state; the authorized rerun passed with downloads 0. This environmental attempt
did not alter the lockfile. The dependency advisories are recorded as
GAS2-R-022 and are not accepted by C09.

## Current dependency evidence after C09-SEC

The reconciled base contains Next 16.3.3, Prisma and `@prisma/client` 6.19.3,
and lockfile resolution `browserslist` 4.28.9. The completed C09-SEC validation
reported `pnpm audit --prod --json` as **0 critical, 1 high and 0 moderate**.
The remaining `deepmerge-ts` 7.1.5 advisory
GHSA-ggr8-5vv4-36mx / CVE-2026-40345 is open and not accepted under
GAS2-R-022. This does not establish total security or public-deployment
readiness.

## Current reconciliation validation

Executed on 2026-09-10 against exact remediated base
`6a64564599369b24f2d00fe9ceca1093d1a5c92f` and an exclusive PostgreSQL 16.14
container on `127.0.0.1:55441`, with tmpfs storage and synthetic data only.

| Check | Result | Scope / limitation |
| --- | --- | --- |
| Frozen install | PASS; lockfile current, 412 packages reused, 0 downloaded | Initial sandbox attempt could not read Corepack global state; authorized rerun passed without lockfile change |
| Prisma generate | PASS; Prisma Client 6.19.3 | No schema or migration change |
| Empty database, deploy, seed, status, drift | PASS; 0 initial public tables, 20/20 migrations, seed completed, schema current, drift 0 | PostgreSQL 16.14, loopback, tmpfs and no volume |
| Format, lint, typecheck | PASS | Documentation plus unchanged strict application baseline |
| Unit + integration + tooling | PASS; 556 + 120 + 35 = 711/711 | Fakes/fixtures and synthetic local PostgreSQL only |
| Tooling invocation | PASS; 35/35 | Executed separately as required |
| Traceability and governance | PASS; 14 requirements, 44 claims, local references resolved, Markdown/CSV drift 0 | Repository evidence only |
| CALL-E boundary | PASS | SDK absent; no live entrypoint, ingress, webhook, Goals, batch or helper surface; real CALL-E network calls 0 |
| Build | PASS; Next 16.3.3, 18/18 static pages | Local build, not deployment qualification |
| Full E2E | PASS; 83/83 in 6.8 minutes, one worker, zero retries | Freshly recreated ephemeral schema; no relaxed gate, assertion or timeout |
| Production dependency audit | EXPECTED NONZERO; 0 critical, 1 high, 0 moderate | `deepmerge-ts` 7.1.5 high remains open and unaccepted under GAS2-R-022 |
| Document references | PASS; 10 local Markdown references checked, 0 broken | External source content was not reinterpreted as current institutional authority |
| Scope, diff and sensitive-pattern scans | PASS; exactly 13 intended Markdown files, unexpected files 0; E.164, Spanish phone, email, DNI/NIE and high-confidence secret patterns 0; `.env` absent | One numeric substring inside a documented lockfile hash triggered the first phone heuristic; the corrected alphanumeric-boundary scan returned 0 |
| `git diff --check` | PASS | Final tracked documentary diff; untracked Markdown is covered by final Prettier and staged diff checks |
| Ephemeral cleanup | PASS; validation container absent, port 55441 free, `.next` and `test-results` removed | No persistent volume was created; no other container or worktree was modified |

These results are current post-C09-SEC evidence. They do not replace or relabel
the historical C09 validation and do not establish clinical, institutional,
regulatory, total-security or public-deployment readiness.

## Publication gate

Local validation and final documentary checks are complete. The exact
reconciliation commit SHA, Draft PR URL and remote CI result cannot be embedded
in the single commit that creates them; they must be read from immutable Git/PR
metadata and reported in the final reconciliation handoff.

```text
PUBLIC_DEMO = NOT_VERIFIED
VIDEO_LT_180S = NOT_VERIFIED
PUBLIC_JUDGE_DEMO = BLOCKED
LIVE_PROOF = NOT_EVIDENCED
PUBLIC_DEPLOYMENT_READINESS = NO_GO
LIVE_CALLS = NOT_EXECUTED
```
