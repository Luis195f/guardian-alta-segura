# PROJECT TITLE

Guardián Alta Segura

# TAGLINE

Traceable post-discharge continuity where deterministic notices lead to human review—not autonomous clinical action.

# WHAT IT DOES

Guardián Alta Segura is a synthetic-data technical pre-pilot MVP that organizes a post-discharge episode across a versioned Safety Plan, configurable check-ins, deterministic explainable notices, human review and manually created follow-up tasks. Professionals see why a notice exists, record their review, decide whether a task is needed and preserve a minimized audit trail. Patients and explicitly authorized caregivers receive limited, role-appropriate views.

# THE PROBLEM

Post-discharge continuity work can be fragmented across documents, check-ins, reviews and follow-up queues. The gap is not a need for an autonomous clinician; it is a need for a visible, accountable organizational chain that preserves context without hiding how an item was prioritized.

# THE SOLUTION

The product makes one sequence explicit: patient response → deterministic rule → explainable notice → professional review → optional human task → traceable follow-up. Missing inputs cause abstention. Reviewing a notice never creates a task automatically. Resolving a task never closes an episode or makes a clinical decision.

# HOW WE BUILT IT

Next.js App Router and strict TypeScript provide the application and accessible responsive UI. PostgreSQL and Prisma store versioned, append-only history. Domain and application services own validation and authorization; HTTP/UI adapters do not own clinical rules. Vitest covers domain and integration behavior, Playwright covers end-to-end flows, and GitHub Actions runs the reproducible pipeline.

# WHAT WE BUILT DURING OPENAI BUILD WEEK

Based on repository Git dates, the candidate-period work includes deterministic explainable alerts, append-only human review, the nursing workqueue, traceable human tasks and granular caregiver access with immediate revocation. The closing branch adds informational/versioned Home Safety, a deterministic minimized SBAR preview, a fail-closed crisis-resource state, a coherent synthetic demo seed, reproducible preparation and submission evidence. Earlier governance, secure foundation, episode, Safety Plan and check-in work are explicitly disclosed as baseline. Organizer eligibility dates still need human confirmation.

# HOW CODEX WAS USED

Codex inspected history and live code, implemented bounded cross-layer changes, wrote focused tests, verified traceability, reviewed claims and secrets, diagnosed validation failures and prepared the release documentation. It accelerated repository-scale consistency; final product and safety decisions remained human-owned.

# HOW GPT-5.6 CONTRIBUTED

GPT-5.6 supported analysis, architecture review, requirement refinement, safety-by-design reasoning and release planning where reflected in the actual artifacts. We do not claim that it clinically validated any workflow or generated medical advice.

# SAFETY-BY-DESIGN

- Synthetic data only; not for clinical use.
- Human-in-the-loop before every downstream action.
- No diagnosis, suicide prediction, probabilistic risk score or autonomous clinical action.
- Deterministic, versioned rules with explicit inputs, explanations and abstention.
- Append-only Safety Plan and review/task history.
- Deny-by-default RBAC and loopback-only local demo.
- Traffic-light visualization off by default.
- Crisis resource disabled until a locally approved and technically verified destination exists.
- No automatic SBAR content, recommendation or signature.

# TECHNICAL ARCHITECTURE

The repository separates `src/domain`, `src/application`, `src/infrastructure`, `src/presentation` and `src/app`. Prisma migrations add database constraints and triggers around cross-episode integrity and append-only history. Session cookies are HttpOnly; authorization is rechecked server-side; technical errors and audit events exclude clinical content.

# CHALLENGES

The hardest design constraint was making the demo strong without making the product look clinically finished. That required preserving institutional decisions as explicit blockers, differentiating technical activation from clinical approval, preventing caregiver scope expansion and building SBAR without inventing assessment or recommendation.

# ACCOMPLISHMENTS

We produced a demonstrable end-to-end human workflow, explainable deterministic notices, traceable manual tasks, immediate caregiver revocation, append-only versioning, a safe local demo and tests that enforce key negative guarantees.

# WHAT WE LEARNED

Safety is not a disclaimer added at the end. It is a set of data models, state machines, authorization boundaries, database constraints, negative tests, feature flags and carefully limited claims.

# WHAT'S NEXT

The next steps are local clinical and legal validation, institutional identity and role mapping, approved crisis-resource configuration, SBAR export-profile approval, threat modeling and usability testing in a non-clinical synthetic environment. Real-patient use remains a NO-GO until stage gates are completed.

# POTENTIAL IMPACT

If locally validated and responsibly integrated, this approach could help teams organize continuity work and make follow-up responsibility more visible. No effectiveness, safety outcome, readmission reduction or suicide-prevention claim is made.

# CURRENT LIMITATIONS

Technical pre-pilot MVP; synthetic data only; local loopback demo; no production authentication, communication, hospital integration, validated clinical content, real crisis destination, institutional PDF export, contingency mode or regulatory approval.
