import { describe, expect, it } from "vitest";

import {
  normalizeBriefNote,
  normalizeResolutionReason,
  normalizeTaskSummary,
  NursingTaskValidationError,
  taskRequestFingerprint,
  validateExpectedRevision,
  validateIdempotencyKey,
} from "@/domain/workqueue/nursing-task";

describe("nursing task domain", () => {
  it("normaliza contenido breve y rechaza campos ausentes o excesivos", () => {
    expect(normalizeTaskSummary("  Seguimiento organizativo  ")).toBe("Seguimiento organizativo");
    expect(normalizeBriefNote("  Sin respuesta  ")).toBe("Sin respuesta");
    expect(normalizeResolutionReason("  Revisión completada  ")).toBe("Revisión completada");
    expect(() => normalizeTaskSummary("x")).toThrow(NursingTaskValidationError);
    expect(() => normalizeBriefNote("x".repeat(281))).toThrow(NursingTaskValidationError);
    expect(() => normalizeResolutionReason(" ")).toThrow(NursingTaskValidationError);
  });

  it("exige revisión optimista e idempotencia acotada", () => {
    expect(() => validateExpectedRevision(0)).toThrow(NursingTaskValidationError);
    expect(() => validateExpectedRevision(1)).not.toThrow();
    expect(() => validateIdempotencyKey("short")).toThrow(NursingTaskValidationError);
    expect(() => validateIdempotencyKey("task:valid-key")).not.toThrow();
  });

  it("genera fingerprints deterministas sin depender del orden de claves", () => {
    expect(taskRequestFingerprint({ b: 2, a: 1 })).toBe(taskRequestFingerprint({ a: 1, b: 2 }));
  });
});
