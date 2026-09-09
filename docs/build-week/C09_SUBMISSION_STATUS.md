# C09 submission status

Cut-off: 2026-09-09. C09 is documentation and submission preparation only.

## Pinned preconditions

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
LIVE_PROOF = BLOCKED_NO_AUTHORIZED_DESTINATION
CALL_E_RUNTIME_PROOF = NOT_EVIDENCED
LIVE_CALLS = NOT_EXECUTED
```

No live entrypoint, API key, authorized target attestation, provider request,
CALL-E traffic or call is added or executed in C09.

## Local validation

Executed on 2026-09-09 against isolated PostgreSQL 16.14 containers bound only
to loopback, with synthetic databases on tmpfs.

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

## Publication gate

Local C09 review is complete. The exact commit SHA, Draft PR URL and remote CI
result cannot be embedded in the single commit that creates them; they must be
read from immutable Git/PR metadata and reported in the final C09 handoff.
