import type { Role } from "@/domain/auth/role";

export const SAFETY_PLAN_STEPS = [
  "WARNING_SIGNS",
  "INTERNAL_COPING",
  "DISTRACTION_CONTACTS",
  "SUPPORT_CONTACTS",
  "PROFESSIONAL_RESOURCES",
  "MEANS_REDUCTION",
] as const;

export const SAFETY_PLAN_PROVENANCE = ["PATIENT", "NURSE", "CLINICIAN"] as const;
export const SAFETY_PLAN_AUDIENCES = ["PATIENT", "CAREGIVER"] as const;
export const SAFETY_PLAN_STATES = ["DRAFT", "ACTIVE", "SUPERSEDED", "INVALIDATED"] as const;

export type SafetyPlanStep = (typeof SAFETY_PLAN_STEPS)[number];
export type SafetyPlanProvenance = (typeof SAFETY_PLAN_PROVENANCE)[number];
export type SafetyPlanAudience = (typeof SAFETY_PLAN_AUDIENCES)[number];
export type SafetyPlanVersionState = (typeof SAFETY_PLAN_STATES)[number];

export interface SafetyPlanSectionDraft {
  readonly step: SafetyPlanStep;
  readonly content: string;
  readonly provenance: SafetyPlanProvenance;
  readonly patientCanView: boolean;
  readonly caregiverCanView: boolean;
}

export class InvalidSafetyPlanError extends Error {}

export function validateSafetyPlanSections(
  sections: readonly SafetyPlanSectionDraft[],
): readonly SafetyPlanSectionDraft[] {
  if (sections.length !== SAFETY_PLAN_STEPS.length) {
    throw new InvalidSafetyPlanError("A safety plan version must contain exactly six sections");
  }
  const byStep = new Map(sections.map((section) => [section.step, section]));
  if (byStep.size !== SAFETY_PLAN_STEPS.length) {
    throw new InvalidSafetyPlanError("Safety plan steps must be unique");
  }
  return SAFETY_PLAN_STEPS.map((step) => {
    const section = byStep.get(step);
    if (!section) throw new InvalidSafetyPlanError("All six safety plan steps are required");
    const content = section.content.trim();
    if (content.length < 1 || content.length > 4000) {
      throw new InvalidSafetyPlanError(
        "Section content must contain between 1 and 4000 characters",
      );
    }
    if (!SAFETY_PLAN_PROVENANCE.includes(section.provenance)) {
      throw new InvalidSafetyPlanError("Section provenance is invalid");
    }
    if (
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(content) ||
      /\b(?:api[_ -]?key|password|secret|token)\s*[:=]\s*\S+/iu.test(content)
    ) {
      throw new InvalidSafetyPlanError("Technical secrets are not valid clinical content");
    }
    if (
      step === "PROFESSIONAL_RESOURCES" &&
      (/\btel:/iu.test(content) || /(?:\d[\s().+-]*){6,}/u.test(content))
    ) {
      throw new InvalidSafetyPlanError(
        "Official crisis numbers require an approved versioned configuration",
      );
    }
    return { ...section, content };
  });
}

export function isSafetyPlanStep(value: unknown): value is SafetyPlanStep {
  return typeof value === "string" && SAFETY_PLAN_STEPS.some((candidate) => candidate === value);
}

export function isSafetyPlanProvenance(value: unknown): value is SafetyPlanProvenance {
  return (
    typeof value === "string" && SAFETY_PLAN_PROVENANCE.some((candidate) => candidate === value)
  );
}

export function canAuthorSafetyPlan(roles: readonly Role[]): boolean {
  return roles.some((role) => role === "nurse" || role === "clinician");
}

export function canViewSafetyPlanVersion(
  role: Role,
  state: SafetyPlanVersionState,
  context: {
    readonly assignedProfessional: boolean;
    readonly patientOwner: boolean;
    readonly caregiverAuthorizationActive: boolean;
  },
): boolean {
  if ((role === "nurse" || role === "clinician") && context.assignedProfessional) return true;
  if (role === "patient" && context.patientOwner) {
    return state === "ACTIVE" || state === "SUPERSEDED";
  }
  if (role === "caregiver" && context.caregiverAuthorizationActive) return state === "ACTIVE";
  return false;
}

export function canViewSafetyPlanSection(
  role: Role,
  permissions: { readonly patientCanView: boolean; readonly caregiverCanView: boolean },
  context: {
    readonly assignedProfessional: boolean;
    readonly patientOwner: boolean;
    readonly caregiverAuthorizationActive: boolean;
  },
): boolean {
  if ((role === "nurse" || role === "clinician") && context.assignedProfessional) return true;
  if (role === "patient" && context.patientOwner) return permissions.patientCanView;
  if (role === "caregiver" && context.caregiverAuthorizationActive) {
    return permissions.caregiverCanView;
  }
  return false;
}
