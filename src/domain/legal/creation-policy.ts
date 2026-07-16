import type { LegalRecordType } from "@/domain/legal/legal-records";

export const PATIENT_CREATABLE_RECORD_TYPES = [
  "PARTICIPATION",
  "DIGITAL_PARTICIPATION",
  "COMMUNICATION_PERMISSION",
  "CAREGIVER_AUTHORIZATION",
] as const satisfies readonly LegalRecordType[];

export const CLINICIAN_CREATABLE_RECORD_TYPES = [
  "PROCESSING_BASIS",
] as const satisfies readonly LegalRecordType[];

export type LegalCreationActorRole = "patient" | "clinician";

export interface LegalCreationDecision {
  readonly allowed: boolean;
  readonly reason:
    "patient-owned-record" | "institutional-basis" | "record-type-denied" | "not-record-owner";
}

export function authorizeLegalRecordCreation(input: {
  readonly actorRole: LegalCreationActorRole;
  readonly recordType: LegalRecordType;
  readonly ownsSubject: boolean;
}): LegalCreationDecision {
  if (input.actorRole === "patient") {
    if (!PATIENT_CREATABLE_RECORD_TYPES.some((type) => type === input.recordType)) {
      return { allowed: false, reason: "record-type-denied" };
    }
    return input.ownsSubject
      ? { allowed: true, reason: "patient-owned-record" }
      : { allowed: false, reason: "not-record-owner" };
  }
  if (CLINICIAN_CREATABLE_RECORD_TYPES.some((type) => type === input.recordType)) {
    return { allowed: true, reason: "institutional-basis" };
  }
  return { allowed: false, reason: "record-type-denied" };
}
