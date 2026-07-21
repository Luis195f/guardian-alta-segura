# AI collaboration disclosure

## Human/product decisions

The author defined the post-discharge continuity problem, the intended human workflow, the prohibition on autonomous clinical decisions, the synthetic-only boundary, the product priorities and the requirement to preserve history. Clinical validation, final protocols, professional responsibility, hospital approval, legal basis and regulatory classification were not delegated to AI.

## GPT-5.6 contribution

GPT-5.6 was used as a reasoning partner for repository analysis, architecture review, requirement refinement, safety-by-design checks and release planning where supported by the actual work artifacts. It helped compare requested behavior with code, identify missing technical seams and keep claims aligned with evidence. This document does not claim a specific unrecorded conversation, prompt count, clinical conclusion or effectiveness result.

## Codex contribution

Codex was used to:

- inspect Git history, the schema, domain/application/infrastructure layers, UI, tests, ADRs and CI;
- implement bounded changes in the existing architecture;
- add domain, application, persistence, authorization, audit, UI, migration and test coverage for informational Home Safety;
- implement a deterministic, provenance-aware SBAR preview and a fail-closed crisis-resource state;
- improve the synthetic seed and local demo preparation;
- reconcile requirement traceability and safety claims;
- create Build Week release, Devpost and video materials;
- run format, lint, typecheck, unit, integration, build and e2e checks and diagnose failures.

Codex accelerated cross-layer consistency, repetitive test construction, repository-wide evidence gathering and release documentation. Its output remains subject to human review and the repository’s automated checks.

## Decisions not delegated

- clinical validity or effectiveness;
- wording and approval of real check-ins, thresholds or crisis destinations;
- diagnosis, prognosis, treatment or referral;
- legal basis, retention and data-subject procedures;
- institutional identity, role mapping or operating model;
- MDR, GDPR, security certification or hospital approval;
- use with real patients or real data.

The final product remains a technical pre-pilot MVP, synthetic-only and not for clinical use.
