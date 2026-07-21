import { describe, expect, it } from "vitest";

import type {
  HomeSafetyTransaction,
  HomeSafetyUnitOfWork,
} from "@/application/ports/home-safety-unit-of-work";
import {
  CreateHomeSafetyVersionService,
  HomeSafetyConflictError,
  HomeSafetyDeniedError,
} from "@/application/home-safety/manage-home-safety";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import { HOME_SAFETY_ITEM_DEFINITIONS } from "@/domain/home-safety/home-safety";

class MemoryHomeSafety implements HomeSafetyUnitOfWork, HomeSafetyTransaction {
  latest = 0;
  authorized = true;
  readonly audits: NewAuditEvent[] = [];
  readonly versions: unknown[] = [];
  run<T>(operation: (transaction: HomeSafetyTransaction) => Promise<T>) {
    return operation(this);
  }
  async isActiveUserWithRole() {
    return this.authorized;
  }
  async getEpisode() {
    return {
      id: "episode-1",
      isSynthetic: true,
      responsibleNurseId: "nurse-1",
      responsibleClinicianId: "clinician-1",
    };
  }
  async getLatestVersionNumber() {
    return this.latest;
  }
  async createVersion(input: unknown) {
    this.versions.push(input);
    return { id: "home-version-1" };
  }
  async appendAuditEvent(input: NewAuditEvent) {
    this.audits.push(input);
    return { id: "audit-1" };
  }
}

const submission = {
  actor: { userId: "nurse-1", roles: ["nurse" as const], sessionId: "session" },
  episodeId: "episode-1",
  expectedPreviousVersion: 0,
  informationalPurposeAcknowledged: true,
  humanReviewed: true,
  items: HOME_SAFETY_ITEM_DEFINITIONS.map(({ key }) => ({
    itemKey: key,
    state: "INFORMATION_RECORDED",
    provenance: "NURSE",
  })),
  correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
};

describe("gestión de domicilio seguro", () => {
  it("crea una versión y auditoría minimizada", async () => {
    const memory = new MemoryHomeSafety();
    await expect(
      new CreateHomeSafetyVersionService(memory).execute(submission),
    ).resolves.toMatchObject({ versionNumber: 1 });
    expect(memory.versions).toHaveLength(1);
    expect(memory.audits).toEqual([
      expect.objectContaining({
        action: "HOME_SAFETY_VERSION_CREATED",
        resourceId: "home-version-1",
      }),
    ]);
    expect(JSON.stringify(memory.audits)).not.toContain("environment-information");
  });

  it("deniega a profesionales no responsables y evita sobrescribir versiones", async () => {
    const memory = new MemoryHomeSafety();
    memory.authorized = false;
    await expect(
      new CreateHomeSafetyVersionService(memory).execute(submission),
    ).rejects.toBeInstanceOf(HomeSafetyDeniedError);
    memory.authorized = true;
    memory.latest = 1;
    await expect(
      new CreateHomeSafetyVersionService(memory).execute(submission),
    ).rejects.toBeInstanceOf(HomeSafetyConflictError);
  });
});
