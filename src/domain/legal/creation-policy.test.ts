import { describe, expect, it } from "vitest";

import { authorizeLegalRecordCreation } from "@/domain/legal/creation-policy";
import type { LegalRecordType } from "@/domain/legal/legal-records";

const matrix = [
  ["patient", "PARTICIPATION", true],
  ["patient", "DIGITAL_PARTICIPATION", true],
  ["patient", "COMMUNICATION_PERMISSION", true],
  ["patient", "CAREGIVER_AUTHORIZATION", true],
  ["patient", "PROCESSING_BASIS", false],
  ["clinician", "PARTICIPATION", false],
  ["clinician", "DIGITAL_PARTICIPATION", false],
  ["clinician", "COMMUNICATION_PERMISSION", false],
  ["clinician", "CAREGIVER_AUTHORIZATION", false],
  ["clinician", "PROCESSING_BASIS", true],
] as const satisfies readonly (readonly ["patient" | "clinician", LegalRecordType, boolean])[];

describe("authorizeLegalRecordCreation", () => {
  it.each(matrix)("%s / %s => allowed=%s", (actorRole, recordType, allowed) => {
    expect(
      authorizeLegalRecordCreation({ actorRole, recordType, ownsSubject: actorRole === "patient" }),
    ).toMatchObject({ allowed });
  });

  it("deniega a patient un registro de otra persona", () => {
    expect(
      authorizeLegalRecordCreation({
        actorRole: "patient",
        recordType: "PARTICIPATION",
        ownsSubject: false,
      }),
    ).toEqual({ allowed: false, reason: "not-record-owner" });
  });
});
