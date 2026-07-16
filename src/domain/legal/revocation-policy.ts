import type { LegalRecordType } from "@/domain/legal/legal-records";

export const PATIENT_REVOCABLE_RECORD_TYPES = [
  "PARTICIPATION",
  "DIGITAL_PARTICIPATION",
  "COMMUNICATION_PERMISSION",
  "CAREGIVER_AUTHORIZATION",
] as const satisfies readonly LegalRecordType[];

export type LegalRevocationActorRole = "patient" | "clinician";

export interface LegalRevocationDecision {
  readonly allowed: boolean;
  readonly reason:
    "patient-owned-record" | "actor-role-denied" | "record-type-denied" | "not-record-owner";
}

export function authorizeLegalRevocation(input: {
  readonly actorRole: LegalRevocationActorRole;
  readonly targetType: LegalRecordType;
  readonly ownsSubject: boolean;
}): LegalRevocationDecision {
  if (input.actorRole !== "patient") {
    return { allowed: false, reason: "actor-role-denied" };
  }
  if (!PATIENT_REVOCABLE_RECORD_TYPES.some((type) => type === input.targetType)) {
    return { allowed: false, reason: "record-type-denied" };
  }
  if (!input.ownsSubject) {
    return { allowed: false, reason: "not-record-owner" };
  }
  return { allowed: true, reason: "patient-owned-record" };
}
