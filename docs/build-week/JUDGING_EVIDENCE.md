# Judging evidence map

## 1. Technical Implementation

| Evidence | Repository proof | Demo moment | Safe claim | Do not claim |
| --- | --- | --- | --- | --- |
| Layered implementation | `src/domain`, `application`, `infrastructure`, `presentation`, `app` | Show product; mention architecture briefly | Strict TypeScript/Next.js/Prisma implementation | “Production-ready clinical platform” |
| Append-only history | Prisma migrations and integration tests | Safety Plan/Home Safety versions and task timeline | History-preserving technical controls | Legally validated retention |
| Explainable notices | ADR-0007, rule domain/service/tests | Explanation + origin + human review | Deterministic, versioned and explainable in synthetic demo | Prediction, diagnosis or validated risk detection |
| Human tasks | ADR-0008, workqueue tests | Create task only after review | Manual, traceable workflow | Automatic referral or clinical action |
| Security | loopback, RBAC, CSRF, HttpOnly sessions, negative tests | Role label and denied access | Deny-by-default local demo | Institutional SSO/MFA or certification |

## 2. Design & User Experience

| Evidence | Repository proof | Demo moment | Safe claim | Do not claim |
| --- | --- | --- | --- | --- |
| Visible workflow | `demo-flow` UI strip | Opening screen | Judges can understand the human chain quickly | That the journey is clinically validated |
| Role-specific panels | patient/professional/caregiver components | Switch aliases | Synthetic role-based experience | Real identity assurance |
| Safety language | persistent badges, disclaimers, disabled crisis action | Opening and closing | Limits are visible in-product | “Safety guaranteed” |
| Empty/error states | component status regions and e2e coverage | Optional denied/empty state | Accessible feedback and fail-closed errors | Full WCAG certification |

## 3. Potential Impact

Evidence: the product connects plan, check-in, review and follow-up responsibility without hiding the rule or automating the professional. The strongest demo moment is the absence of an automatic task after alert review, followed by deliberate manual creation.

Safe claim: “This technical approach could help organize continuity work if locally validated and responsibly integrated.”

Do not claim: suicide prevention, reduced readmissions, improved outcomes, clinical effectiveness, hospital endorsement or real-patient deployment.

## 4. Quality of the Idea

Evidence: the idea addresses organizational continuity while treating human oversight, explainability, revocation, provenance and negative guarantees as product features. `AGENTS.md`, ADRs, the decision register and traceability matrix show disciplined scope.

Demo moments: explainable alert, human review boundary, caregiver revocation, Home Safety disclaimer, non-inventing SBAR, disabled crisis resource.

Safe claim: “A safety-by-design continuity MVP that makes accountability visible.”

Do not claim: autonomous care, clinical decision support validation, MDR/GDPR compliance, institutional approval or a finished product.
