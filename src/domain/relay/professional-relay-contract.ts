export const PROFESSIONAL_RELAY_TASK_CONTRACT = {
  key: "PROFESSIONAL_REVIEW_REQUEST",
  version: "synthetic-professional-relay-v1",
  title: "Professional Relay",
  purpose:
    "Solicitar confirmación de identidad, acuse y disponibilidad para que una autoridad humana revise un elemento opaco de continuidad.",
  instructions: [
    "Identificarse de forma explícita como agente de IA.",
    "Verificar que responde el profesional previsto antes de continuar.",
    "Si responde un destinatario incorrecto, no divulgar información y cerrar limpiamente.",
    "Realizar una única pregunta administrativa para registrar acuse y disponibilidad para revisar el elemento opaco de continuidad.",
    "No interpretar acknowledged como aceptación de una Task ni availability_to_review como assignment.",
    "No decidir, aconsejar, clasificar, asignar ni resolver ningún elemento.",
    "Cerrar limpiamente después de la única pregunta administrativa o ante una petición fuera de alcance.",
  ],
  clinicalAssessment: false,
} as const;

export const PROFESSIONAL_RELAY_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "identity_status",
    "contact_status",
    "acknowledged",
    "availability_to_review",
    "boundary_event",
  ],
  properties: {
    identity_status: {
      type: "string",
      enum: ["intended_professional", "wrong_recipient", "unknown"],
    },
    contact_status: { type: "string", enum: ["reached", "not_reached", "unknown"] },
    acknowledged: { type: "string", enum: ["yes", "no", "unknown"] },
    availability_to_review: { type: "string", enum: ["yes", "no", "unknown"] },
    boundary_event: {
      type: "string",
      enum: ["none", "out_of_scope_request", "unknown"],
    },
  },
} as const;

export type ProfessionalRelayIdentityStatus =
  (typeof PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.identity_status.enum)[number];
export type ProfessionalRelayContactStatus =
  (typeof PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.contact_status.enum)[number];
export type ProfessionalRelayAcknowledged =
  (typeof PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.acknowledged.enum)[number];
export type ProfessionalRelayAvailabilityToReview =
  (typeof PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.availability_to_review.enum)[number];
export type ProfessionalRelayBoundaryEvent =
  (typeof PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.boundary_event.enum)[number];

export interface ProfessionalRelayTechnicalResult {
  readonly identity_status: ProfessionalRelayIdentityStatus;
  readonly contact_status: ProfessionalRelayContactStatus;
  readonly acknowledged: ProfessionalRelayAcknowledged;
  readonly availability_to_review: ProfessionalRelayAvailabilityToReview;
  readonly boundary_event: ProfessionalRelayBoundaryEvent;
}

const IDENTITY_STATUSES = PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.identity_status.enum;
const CONTACT_STATUSES = PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.contact_status.enum;
const ACKNOWLEDGED_VALUES = PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.acknowledged.enum;
const AVAILABILITY_VALUES = PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.availability_to_review.enum;
const BOUNDARY_EVENTS = PROFESSIONAL_RELAY_RESULT_SCHEMA.properties.boundary_event.enum;

function contains<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.some((candidate) => candidate === value);
}

export function parseProfessionalRelayTechnicalResult(
  value: unknown,
): ProfessionalRelayTechnicalResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const expectedKeys = [...PROFESSIONAL_RELAY_RESULT_SCHEMA.required].sort();
  const actualKeys = Object.keys(source).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    !actualKeys.every((key, index) => key === expectedKeys[index])
  ) {
    return null;
  }
  if (
    !contains(IDENTITY_STATUSES, source.identity_status) ||
    !contains(CONTACT_STATUSES, source.contact_status) ||
    !contains(ACKNOWLEDGED_VALUES, source.acknowledged) ||
    !contains(AVAILABILITY_VALUES, source.availability_to_review) ||
    !contains(BOUNDARY_EVENTS, source.boundary_event)
  ) {
    return null;
  }
  return {
    identity_status: source.identity_status,
    contact_status: source.contact_status,
    acknowledged: source.acknowledged,
    availability_to_review: source.availability_to_review,
    boundary_event: source.boundary_event,
  };
}

export const SYNTHETIC_PROFESSIONAL_RELAY_RESULT: ProfessionalRelayTechnicalResult = {
  identity_status: "intended_professional",
  contact_status: "reached",
  acknowledged: "yes",
  availability_to_review: "yes",
  boundary_event: "none",
};
