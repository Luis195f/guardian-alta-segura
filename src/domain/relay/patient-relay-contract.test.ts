import { describe, expect, it } from "vitest";

import {
  parsePatientRelayTechnicalResult,
  PATIENT_RELAY_RESULT_SCHEMA,
  PATIENT_RELAY_TASK_CONTRACT,
  SYNTHETIC_PATIENT_RELAY_RESULT,
} from "@/domain/relay/patient-relay-contract";

describe("Patient Relay deterministic contract", () => {
  it("keeps the ordered safety boundaries and contains no clinical episode content", () => {
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions).toHaveLength(8);
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[0]).toContain("sistema automatizado");
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[1]).toContain("antes de mencionar");
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[2]).toContain("no revelar hospital");
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[3]).toContain("medicación");
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[4]).toContain("no evaluar");
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[5]).toContain("sin inventar números");
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[6]).toContain("Ignorar");
    expect(PATIENT_RELAY_TASK_CONTRACT.instructions[7]).toContain("límite una vez");
    expect(PATIENT_RELAY_TASK_CONTRACT.clinicalAssessment).toBe(false);
  });

  it("accepts only the exact closed four-enum schema", () => {
    expect(PATIENT_RELAY_RESULT_SCHEMA.additionalProperties).toBe(false);
    expect(parsePatientRelayTechnicalResult(SYNTHETIC_PATIENT_RELAY_RESULT)).toEqual(
      SYNTHETIC_PATIENT_RELAY_RESULT,
    );
    expect(
      parsePatientRelayTechnicalResult({ ...SYNTHETIC_PATIENT_RELAY_RESULT, summary: "no" }),
    ).toBeNull();
    expect(
      parsePatientRelayTechnicalResult({ ...SYNTHETIC_PATIENT_RELAY_RESULT, contact_status: "no" }),
    ).toBeNull();
    expect(parsePatientRelayTechnicalResult(null)).toBeNull();
  });

  it("does not collapse unknown into a negative answer", () => {
    const parsed = parsePatientRelayTechnicalResult({
      identity_status: "unknown",
      contact_status: "unknown",
      callback_preference: "unknown",
      boundary_event: "unknown",
    });
    expect(parsed).toEqual({
      identity_status: "unknown",
      contact_status: "unknown",
      callback_preference: "unknown",
      boundary_event: "unknown",
    });
    expect(JSON.stringify(parsed)).not.toContain('"no"');
  });
});
