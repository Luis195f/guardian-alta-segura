import { describe, expect, it } from "vitest";

import {
  canViewSafetyPlanSection,
  canViewSafetyPlanVersion,
  InvalidSafetyPlanError,
  SAFETY_PLAN_STEPS,
  validateSafetyPlanSections,
} from "@/domain/safety-plan/safety-plan";

const validSections = SAFETY_PLAN_STEPS.map((step) => ({
  step,
  content: `Contenido sintético ${step}`,
  provenance: "PATIENT" as const,
  patientCanView: true,
  caregiverCanView: false,
}));

describe("safety plan domain", () => {
  it("exige exactamente los seis pasos sin scoring", () => {
    expect(validateSafetyPlanSections(validSections)).toHaveLength(6);
    expect(() => validateSafetyPlanSections(validSections.slice(0, 5))).toThrow(
      InvalidSafetyPlanError,
    );
  });

  it("bloquea números de crisis no respaldados por configuración aprobada", () => {
    const sections = validSections.map((section) =>
      section.step === "PROFESSIONAL_RESOURCES"
        ? { ...section, content: "Llamar al 123456789" }
        : section,
    );
    expect(() => validateSafetyPlanSections(sections)).toThrow(InvalidSafetyPlanError);
  });

  it("rechaza secretos técnicos en cualquier sección", () => {
    const sections = validSections.map((section, index) =>
      index === 0 ? { ...section, content: "api_key=not-a-clinical-field" } : section,
    );
    expect(() => validateSafetyPlanSections(sections)).toThrow(InvalidSafetyPlanError);
  });

  it("desacopla visibilidad por versión, rol y sección", () => {
    const context = {
      assignedProfessional: false,
      patientOwner: true,
      caregiverAuthorizationActive: false,
    };
    expect(canViewSafetyPlanVersion("patient", "ACTIVE", context)).toBe(true);
    expect(canViewSafetyPlanVersion("patient", "DRAFT", context)).toBe(false);
    expect(
      canViewSafetyPlanVersion("caregiver", "ACTIVE", {
        ...context,
        patientOwner: false,
        caregiverAuthorizationActive: true,
      }),
    ).toBe(true);
    expect(
      canViewSafetyPlanSection(
        "patient",
        { patientCanView: false, caregiverCanView: true },
        context,
      ),
    ).toBe(false);
    expect(
      canViewSafetyPlanSection(
        "caregiver",
        { patientCanView: false, caregiverCanView: true },
        { ...context, patientOwner: false, caregiverAuthorizationActive: false },
      ),
    ).toBe(false);
  });
});
