import { describe, expect, it } from "vitest";

import {
  parseProfessionalRelayTechnicalResult,
  PROFESSIONAL_RELAY_RESULT_SCHEMA,
  PROFESSIONAL_RELAY_TASK_CONTRACT,
  SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
} from "@/domain/relay/professional-relay-contract";

describe("Professional Relay deterministic contract", () => {
  it("contains the exact administrative purpose and no identifying or clinical detail", () => {
    expect(PROFESSIONAL_RELAY_TASK_CONTRACT.version).toBe("synthetic-professional-relay-v1");
    expect(PROFESSIONAL_RELAY_TASK_CONTRACT.instructions).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/agente de IA/u),
        expect.stringMatching(/profesional previsto/u),
        expect.stringMatching(/única pregunta administrativa/u),
        expect.stringMatching(/no divulgar información/u),
        expect.stringMatching(/cerrar limpiamente/u),
      ]),
    );
    const serialized = JSON.stringify(PROFESSIONAL_RELAY_TASK_CONTRACT).toLowerCase();
    for (const prohibited of [
      "nombre del paciente",
      "diagnóstico",
      "safety plan",
      "check-in",
      "medicación",
      "teléfono",
      "prompt",
      "transcript",
      "payload",
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
  });

  it("accepts only the exact closed five-enum schema", () => {
    expect(PROFESSIONAL_RELAY_RESULT_SCHEMA.additionalProperties).toBe(false);
    expect(parseProfessionalRelayTechnicalResult(SYNTHETIC_PROFESSIONAL_RELAY_RESULT)).toEqual(
      SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
    );
    expect(
      parseProfessionalRelayTechnicalResult({
        identity_status: "wrong_recipient",
        contact_status: "reached",
        acknowledged: "unknown",
        availability_to_review: "unknown",
        boundary_event: "none",
      }),
    ).toEqual({
      identity_status: "wrong_recipient",
      contact_status: "reached",
      acknowledged: "unknown",
      availability_to_review: "unknown",
      boundary_event: "none",
    });
  });

  it.each([
    null,
    [],
    "invalid",
    { ...SYNTHETIC_PROFESSIONAL_RELAY_RESULT, detail: "forbidden" },
    { ...SYNTHETIC_PROFESSIONAL_RELAY_RESULT, acknowledged: null },
    { ...SYNTHETIC_PROFESSIONAL_RELAY_RESULT, acknowledged: true },
    { ...SYNTHETIC_PROFESSIONAL_RELAY_RESULT, acknowledged: [] },
    { ...SYNTHETIC_PROFESSIONAL_RELAY_RESULT, identity_status: "intended_recipient" },
    { ...SYNTHETIC_PROFESSIONAL_RELAY_RESULT, boundary_event: "emergency_statement" },
  ])("rejects malformed, additional, null, array and unknown enum input %#", (value) => {
    expect(parseProfessionalRelayTechnicalResult(value)).toBeNull();
  });

  it("does not collapse unknown into no", () => {
    expect(
      parseProfessionalRelayTechnicalResult({
        identity_status: "unknown",
        contact_status: "unknown",
        acknowledged: "unknown",
        availability_to_review: "unknown",
        boundary_event: "unknown",
      }),
    ).toEqual({
      identity_status: "unknown",
      contact_status: "unknown",
      acknowledged: "unknown",
      availability_to_review: "unknown",
      boundary_event: "unknown",
    });
  });
});
