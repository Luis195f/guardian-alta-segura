import type { CaregiverCapability, SafetyPlanStep } from "@prisma/client";

export const CAREGIVER_CAPABILITIES = [
  "VIEW_PLAN_SECTIONS",
  "VIEW_ASSIGNED_TASKS",
  "SEND_OBSERVATIONS",
  "VIEW_AUTHORIZED_RESOURCES",
] as const satisfies readonly CaregiverCapability[];

export const CAREGIVER_RESOURCE_CATALOG = {
  "demo-caregiver-boundaries": {
    title: "Límites del acceso del cuidador",
    description: "Material sintético sobre autorización, confidencialidad y revisión profesional.",
  },
  "demo-observation-guide": {
    title: "Cómo registrar una observación",
    description:
      "Guía sintética: una observación informa al equipo y nunca se convierte automáticamente en una alerta.",
  },
} as const;

export type CaregiverResourceKey = keyof typeof CAREGIVER_RESOURCE_CATALOG;

export interface CaregiverScopeDraft {
  readonly capabilities: readonly CaregiverCapability[];
  readonly allowedPlanSections: readonly SafetyPlanStep[];
  readonly authorizedResourceKeys: readonly string[];
}

export interface CaregiverScope extends CaregiverScopeDraft {
  readonly id: string;
  readonly version: number;
}

export class InvalidCaregiverAccessError extends Error {}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function validateCaregiverScope(input: CaregiverScopeDraft): CaregiverScopeDraft {
  const capabilities = unique(input.capabilities);
  if (
    capabilities.some(
      (candidate) => !CAREGIVER_CAPABILITIES.includes(candidate as CaregiverCapability),
    )
  ) {
    throw new InvalidCaregiverAccessError("Unknown caregiver capability");
  }
  const allowedPlanSections = unique(input.allowedPlanSections);
  const authorizedResourceKeys = unique(input.authorizedResourceKeys);
  if (allowedPlanSections.length > 0 && !capabilities.includes("VIEW_PLAN_SECTIONS")) {
    throw new InvalidCaregiverAccessError("Plan sections require the plan capability");
  }
  if (authorizedResourceKeys.length > 0 && !capabilities.includes("VIEW_AUTHORIZED_RESOURCES")) {
    throw new InvalidCaregiverAccessError("Resources require the resource capability");
  }
  if (authorizedResourceKeys.some((key) => !(key in CAREGIVER_RESOURCE_CATALOG))) {
    throw new InvalidCaregiverAccessError("Resource is not in the local demo catalog");
  }
  return { capabilities, allowedPlanSections, authorizedResourceKeys };
}

export function hasCaregiverCapability(
  scope: Pick<CaregiverScopeDraft, "capabilities">,
  capability: CaregiverCapability,
): boolean {
  return scope.capabilities.includes(capability);
}

export function canViewCaregiverPlanSection(
  scope: CaregiverScopeDraft,
  section: SafetyPlanStep,
  sectionAllowsCaregiver: boolean,
): boolean {
  return (
    sectionAllowsCaregiver &&
    hasCaregiverCapability(scope, "VIEW_PLAN_SECTIONS") &&
    scope.allowedPlanSections.includes(section)
  );
}

export function validateCaregiverObservation(value: unknown): string {
  if (typeof value !== "string") throw new InvalidCaregiverAccessError("Invalid observation");
  const content = value.trim();
  if (content.length < 3 || content.length > 1000) {
    throw new InvalidCaregiverAccessError("Invalid observation length");
  }
  if (/\b(api[_-]?key|secret|password|bearer)\s*[:=]/iu.test(content)) {
    throw new InvalidCaregiverAccessError("Technical secrets are not accepted");
  }
  return content;
}
