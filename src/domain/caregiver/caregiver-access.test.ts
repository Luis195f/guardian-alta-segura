import { describe, expect, it } from "vitest";

import {
  canViewCaregiverPlanSection,
  InvalidCaregiverAccessError,
  validateCaregiverObservation,
  validateCaregiverScope,
} from "@/domain/caregiver/caregiver-access";

describe("caregiver field-level authorization", () => {
  it("deniega una sección aunque el permiso de documento sea verdadero si el scope no la enumera", () => {
    const scope = validateCaregiverScope({
      capabilities: ["VIEW_PLAN_SECTIONS"],
      allowedPlanSections: ["WARNING_SIGNS"],
      authorizedResourceKeys: [],
    });

    expect(canViewCaregiverPlanSection(scope, "WARNING_SIGNS", true)).toBe(true);
    expect(canViewCaregiverPlanSection(scope, "MEANS_REDUCTION", true)).toBe(false);
    expect(canViewCaregiverPlanSection(scope, "WARNING_SIGNS", false)).toBe(false);
  });

  it("exige la capacidad padre para secciones y recursos", () => {
    expect(() =>
      validateCaregiverScope({
        capabilities: [],
        allowedPlanSections: ["WARNING_SIGNS"],
        authorizedResourceKeys: [],
      }),
    ).toThrow(InvalidCaregiverAccessError);
    expect(() =>
      validateCaregiverScope({
        capabilities: [],
        allowedPlanSections: [],
        authorizedResourceKeys: ["demo-caregiver-boundaries"],
      }),
    ).toThrow(InvalidCaregiverAccessError);
  });

  it("valida observaciones sin inferir alertas ni aceptar secretos técnicos", () => {
    expect(validateCaregiverObservation("  Observación sintética descriptiva  ")).toBe(
      "Observación sintética descriptiva",
    );
    expect(() => validateCaregiverObservation("api_key=demo-secret")).toThrow(
      InvalidCaregiverAccessError,
    );
  });
});
