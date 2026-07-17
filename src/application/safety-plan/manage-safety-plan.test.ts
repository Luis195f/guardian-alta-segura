import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type {
  SafetyPlanRecord,
  SafetyPlanTransaction,
  SafetyPlanUnitOfWork,
  SafetyPlanVersionRecord,
} from "@/application/ports/safety-plan-unit-of-work";
import {
  ChangeSafetyPlanVersionStateService,
  CreateSafetyPlanVersionService,
  SafetyPlanConcurrencyConflictError,
  SafetyPlanDeniedError,
} from "@/application/safety-plan/manage-safety-plan";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import {
  InvalidSafetyPlanError,
  SAFETY_PLAN_STEPS,
  type SafetyPlanSectionDraft,
  type SafetyPlanVersionState,
} from "@/domain/safety-plan/safety-plan";

class MemorySafetyPlanStore implements SafetyPlanTransaction, SafetyPlanUnitOfWork {
  plan: SafetyPlanRecord | null = null;
  readonly versions: Array<
    SafetyPlanVersionRecord & { readonly sections: readonly SafetyPlanSectionDraft[] }
  > = [];
  readonly audits: NewAuditEvent[] = [];
  forceConflict = false;

  run<T>(operation: (transaction: SafetyPlanTransaction) => Promise<T>): Promise<T> {
    return operation(this);
  }

  async getEpisodeAccess(episodeId: string) {
    return episodeId === "episode-1"
      ? {
          episodeId,
          patientIsSynthetic: true,
          responsibleNurseId: "nurse-1",
          responsibleClinicianId: "clinician-1",
          patientPortalUserId: "patient-1",
        }
      : null;
  }

  async findPlanByEpisode() {
    return this.plan;
  }

  async ensurePlan(episodeId: string, actorUserId: string) {
    this.plan ??= {
      id: "plan-1",
      dischargeEpisodeId: episodeId,
      revision: 0,
      currentVersion: 0,
      activeVersionNumber: null,
    };
    void actorUserId;
    return this.plan;
  }

  async claimNextVersion(safetyPlanId: string, expectedRevision: number) {
    if (
      this.forceConflict ||
      !this.plan ||
      this.plan.id !== safetyPlanId ||
      this.plan.revision !== expectedRevision
    ) {
      return null;
    }
    this.plan = {
      ...this.plan,
      revision: expectedRevision + 1,
      currentVersion: this.plan.currentVersion + 1,
    };
    return { revision: this.plan.revision, versionNumber: this.plan.currentVersion };
  }

  async claimLifecycleChange(
    safetyPlanId: string,
    expectedRevision: number,
    activeVersionNumber: number | null,
  ) {
    if (
      this.forceConflict ||
      !this.plan ||
      this.plan.id !== safetyPlanId ||
      this.plan.revision !== expectedRevision
    ) {
      return null;
    }
    this.plan = {
      ...this.plan,
      revision: expectedRevision + 1,
      activeVersionNumber,
    };
    return this.plan.revision;
  }

  async createVersion(input: {
    readonly versionNumber: number;
    readonly sections: readonly SafetyPlanSectionDraft[];
  }) {
    const version = {
      id: `version-${input.versionNumber}`,
      versionNumber: input.versionNumber,
      state: "DRAFT" as const,
      sections: input.sections,
    };
    this.versions.push(version);
    return version;
  }

  async getVersion(safetyPlanId: string, versionNumber: number) {
    void safetyPlanId;
    return this.versions.find((version) => version.versionNumber === versionNumber) ?? null;
  }

  async appendStateChange(input: {
    readonly safetyPlanVersionId: string;
    readonly resultingState: SafetyPlanVersionState;
  }) {
    const index = this.versions.findIndex((version) => version.id === input.safetyPlanVersionId);
    const current = this.versions[index];
    if (current) this.versions[index] = { ...current, state: input.resultingState };
  }

  async appendAuditEvent(input: NewAuditEvent) {
    this.audits.push(input);
    return { id: `audit-${this.audits.length}` };
  }

  async isActiveUserWithRole(userId: string, role: Role) {
    return (
      (userId === "nurse-1" && role === "nurse") ||
      (userId === "clinician-1" && role === "clinician")
    );
  }
}

function principal(userId = "nurse-1", roles: readonly Role[] = ["nurse"]) {
  return { userId, roles, sessionId: randomUUID() };
}

function sections(label: string): readonly SafetyPlanSectionDraft[] {
  return SAFETY_PLAN_STEPS.map((step) => ({
    step,
    content: `${label}: contenido sintético de ${step}`,
    provenance: "PATIENT",
    patientCanView: true,
    caregiverCanView: step === "MEANS_REDUCTION",
  }));
}

async function createVersion(store: MemorySafetyPlanStore, expectedPlanRevision: number) {
  return new CreateSafetyPlanVersionService(store).execute({
    actor: principal(),
    episodeId: "episode-1",
    expectedPlanRevision,
    sections: sections(`v${expectedPlanRevision + 1}`),
    correlationId: randomUUID(),
  });
}

describe("safety plan application services", () => {
  it("cada edición crea N+1 y conserva N legible e inalterada", async () => {
    const store = new MemorySafetyPlanStore();
    await createVersion(store, 0);
    const original = store.versions[0];
    await createVersion(store, 1);
    expect(store.versions.map((version) => version.versionNumber)).toEqual([1, 2]);
    expect(store.versions[0]).toEqual(original);
    expect(store.versions[1]?.sections[0]?.content).toContain("v2");
  });

  it("dos editores no sobrescriben silenciosamente", async () => {
    const store = new MemorySafetyPlanStore();
    await createVersion(store, 0);
    await createVersion(store, 1);
    await expect(createVersion(store, 1)).rejects.toBeInstanceOf(
      SafetyPlanConcurrencyConflictError,
    );
    expect(store.versions).toHaveLength(2);
  });

  it("solo nurse o clinician asignados pueden crear", async () => {
    const store = new MemorySafetyPlanStore();
    await expect(
      new CreateSafetyPlanVersionService(store).execute({
        actor: principal("patient-1", ["patient"]),
        episodeId: "episode-1",
        expectedPlanRevision: 0,
        sections: sections("denegada"),
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(SafetyPlanDeniedError);
  });

  it("invalidar exige motivo y actor autorizado", async () => {
    const store = new MemorySafetyPlanStore();
    await createVersion(store, 0);
    await expect(
      new ChangeSafetyPlanVersionStateService(store).execute({
        actor: principal(),
        episodeId: "episode-1",
        versionNumber: 1,
        action: "invalidate",
        expectedPlanRevision: 1,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidSafetyPlanError);
    expect(store.versions[0]?.state).toBe("DRAFT");
  });

  it("activar N+1 sustituye N mediante eventos sin borrar contenido", async () => {
    const store = new MemorySafetyPlanStore();
    await createVersion(store, 0);
    const stateService = new ChangeSafetyPlanVersionStateService(store);
    await stateService.execute({
      actor: principal(),
      episodeId: "episode-1",
      versionNumber: 1,
      action: "activate",
      expectedPlanRevision: 1,
      correlationId: randomUUID(),
    });
    await createVersion(store, 2);
    await stateService.execute({
      actor: principal("clinician-1", ["clinician"]),
      episodeId: "episode-1",
      versionNumber: 2,
      action: "activate",
      expectedPlanRevision: 3,
      correlationId: randomUUID(),
    });
    expect(store.versions.map(({ state }) => state)).toEqual(["SUPERSEDED", "ACTIVE"]);
    expect(store.versions[0]?.sections).toHaveLength(6);
  });

  it("audita metadatos sin incluir el texto íntegro del plan", async () => {
    const store = new MemorySafetyPlanStore();
    await createVersion(store, 0);
    expect(store.audits).toHaveLength(1);
    expect(JSON.stringify(store.audits[0])).not.toContain("contenido sintético");
    expect(store.audits[0]).toMatchObject({
      action: "SAFETY_PLAN_VERSION_CREATED",
      resourceType: "SafetyPlanVersion",
    });
  });
});
