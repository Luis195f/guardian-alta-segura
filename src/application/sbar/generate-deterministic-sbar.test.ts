import { describe, expect, it } from "vitest";

import {
  buildDeterministicSbar,
  SbarSourceDeniedError,
} from "@/application/sbar/generate-deterministic-sbar";

const source = {
  episode: {
    id: "episode-1",
    isSynthetic: true,
    patientPseudonymousId: "SYNTHETIC-DEMO-001",
    status: "ACTIVE",
    dischargeDate: new Date("2026-07-21T00:00:00Z"),
  },
  checkInProtocol: { id: "protocol-1", title: "PLANTILLA SINTÉTICA", versionNumber: 1 },
  activeSafetyPlan: null,
  lastCheckIn: null,
  openAlerts: [{ id: "alert-1" }],
  openTasks: [{ id: "task-1", summary: "Revisión ya documentada" }],
  generatedBy: { id: "nurse-1", syntheticAlias: "demo-nurse" },
  generatedAt: new Date("2026-07-21T12:00:00Z"),
};

describe("SBAR determinista", () => {
  it("usa solo campos estructurados y no inventa assessment, recomendación o firma", () => {
    const preview = buildDeterministicSbar(source);
    expect(preview.sections.assessment).toBe(
      "Sin valoración clínica adicional registrada. Avisos deterministas abiertos pendientes de revisión humana: 1.",
    );
    expect(preview.sections.recommendation).toBe(
      "Seguimiento ya registrado: Revisión ya documentada.",
    );
    expect(preview.signed).toBe(false);
    expect(preview.references).toEqual(
      expect.arrayContaining([{ resourceType: "Task", resourceId: "task-1" }]),
    );
    expect(JSON.stringify(preview)).not.toMatch(
      /diagn[oó]stic|prescrib|recomienda iniciar|firma autom/i,
    );
  });

  it("falla cerrado para una fuente no sintética", () => {
    expect(() =>
      buildDeterministicSbar({ ...source, episode: { ...source.episode, isSynthetic: false } }),
    ).toThrow(SbarSourceDeniedError);
  });
});
