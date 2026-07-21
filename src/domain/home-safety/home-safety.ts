export const HOME_SAFETY_TEMPLATE = {
  key: "synthetic-home-safety-information",
  version: "demo-v1",
  label: "PLANTILLA SINTÉTICA / PENDIENTE DE VALIDACIÓN LOCAL",
} as const;

export const HOME_SAFETY_DISCLAIMER =
  "Este módulo organiza información para revisión humana. No certifica la seguridad del domicilio.";

export const HOME_SAFETY_ITEM_DEFINITIONS = [
  { key: "environment-information", label: "Información del entorno registrada" },
  { key: "pending-elements", label: "Elementos pendientes documentados" },
  { key: "information-source", label: "Procedencia de la información indicada" },
  { key: "professional-follow-up", label: "Seguimiento profesional pendiente o registrado" },
] as const;

export const HOME_SAFETY_ITEM_STATES = [
  "NOT_REVIEWED",
  "INFORMATION_RECORDED",
  "FOLLOW_UP_PENDING",
  "NOT_APPLICABLE",
] as const;

export const HOME_SAFETY_PROVENANCES = ["PATIENT", "CAREGIVER", "NURSE", "CLINICIAN"] as const;

export type HomeSafetyItemKey = (typeof HOME_SAFETY_ITEM_DEFINITIONS)[number]["key"];
export type HomeSafetyItemState = (typeof HOME_SAFETY_ITEM_STATES)[number];
export type HomeSafetyProvenance = (typeof HOME_SAFETY_PROVENANCES)[number];

export interface HomeSafetyItemInput {
  readonly itemKey: HomeSafetyItemKey;
  readonly state: HomeSafetyItemState;
  readonly provenance: HomeSafetyProvenance;
}

export class HomeSafetyValidationError extends Error {}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.some((candidate) => candidate === value);
}

export function parseHomeSafetySubmission(input: {
  readonly expectedPreviousVersion: unknown;
  readonly informationalPurposeAcknowledged: unknown;
  readonly humanReviewed: unknown;
  readonly items: unknown;
}): {
  readonly expectedPreviousVersion: number;
  readonly informationalPurposeAcknowledged: true;
  readonly humanReviewed: boolean;
  readonly items: readonly HomeSafetyItemInput[];
} {
  if (
    !Number.isInteger(input.expectedPreviousVersion) ||
    Number(input.expectedPreviousVersion) < 0
  ) {
    throw new HomeSafetyValidationError("Expected previous version must be a non-negative integer");
  }
  if (input.informationalPurposeAcknowledged !== true) {
    throw new HomeSafetyValidationError("Informational purpose acknowledgement is required");
  }
  if (typeof input.humanReviewed !== "boolean" || !Array.isArray(input.items)) {
    throw new HomeSafetyValidationError("Invalid home safety review");
  }

  const expectedKeys = HOME_SAFETY_ITEM_DEFINITIONS.map(({ key }) => key);
  if (input.items.length !== expectedKeys.length) {
    throw new HomeSafetyValidationError("Every structured item is required");
  }
  const items = input.items.map((item): HomeSafetyItemInput => {
    if (!item || typeof item !== "object") throw new HomeSafetyValidationError("Invalid item");
    const candidate = item as Record<string, unknown>;
    if (
      !isOneOf(expectedKeys, candidate.itemKey) ||
      !isOneOf(HOME_SAFETY_ITEM_STATES, candidate.state) ||
      !isOneOf(HOME_SAFETY_PROVENANCES, candidate.provenance)
    ) {
      throw new HomeSafetyValidationError("Invalid structured item");
    }
    return {
      itemKey: candidate.itemKey,
      state: candidate.state,
      provenance: candidate.provenance,
    };
  });
  if (new Set(items.map(({ itemKey }) => itemKey)).size !== expectedKeys.length) {
    throw new HomeSafetyValidationError("Structured items must be unique");
  }
  return {
    expectedPreviousVersion: input.expectedPreviousVersion as number,
    informationalPurposeAcknowledged: true,
    humanReviewed: input.humanReviewed,
    items,
  };
}
