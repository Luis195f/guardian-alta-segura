import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ChangeSafetyPlanVersionStateService,
  CreateSafetyPlanVersionService,
} from "@/application/safety-plan/manage-safety-plan";
import { SAFETY_PLAN_STEPS } from "@/domain/safety-plan/safety-plan";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaSafetyPlanUnitOfWork } from "@/infrastructure/persistence/prisma-safety-plan-unit-of-work";

async function arrangeEpisode() {
  const nurse = await prisma.user.create({
    data: {
      syntheticAlias: `safety-nurse-${randomUUID()}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — nurse",
      isSynthetic: true,
      roleAssignments: { create: { role: "nurse" } },
    },
  });
  const clinician = await prisma.user.create({
    data: {
      syntheticAlias: `safety-clinician-${randomUUID()}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — clinician",
      isSynthetic: true,
      roleAssignments: { create: { role: "clinician" } },
    },
  });
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `SYNTH-SAFETY-${randomUUID()}`,
      isSynthetic: true,
      createdById: nurse.id,
    },
  });
  const checkInProtocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `safety-test-check-in-${randomUUID()}`,
      versionNumber: 1,
      title: "PLANTILLA SINTÉTICA / NO APROBADA",
      state: "SYNTHETIC_DEMO",
      isSyntheticFixture: true,
      createdById: nurse.id,
      schedule: {
        create: {
          intervalDays: 3,
          firstDayOffset: 1,
          localTime: "09:30",
          timeZone: "Europe/Madrid",
          responseWindowMinutes: 180,
        },
      },
      questions: {
        create: {
          questionKey: "synthetic-test",
          position: 1,
          type: "YES_NO",
          prompt: "Pregunta sintética no aprobada",
          required: true,
        },
      },
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-07-17T00:00:00Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      createdById: nurse.id,
      checkInProtocolVersionId: checkInProtocol.id,
    },
  });
  return {
    nurse,
    episode,
    actor: { userId: nurse.id, roles: ["nurse"] as const, sessionId: randomUUID() },
  };
}

function sections(version: number) {
  return SAFETY_PLAN_STEPS.map((step) => ({
    step,
    content: `Contenido sintético v${version} ${step}`,
    provenance: "NURSE" as const,
    patientCanView: true,
    caregiverCanView: false,
  }));
}

describe.sequential("PostgreSQL safety plan guarantees", () => {
  it("conserva versiones, minimiza auditoría y bloquea hard-delete", async () => {
    const { nurse, episode, actor } = await arrangeEpisode();
    const unitOfWork = new PrismaSafetyPlanUnitOfWork();
    const creator = new CreateSafetyPlanVersionService(unitOfWork);
    const first = await creator.execute({
      actor,
      episodeId: episode.id,
      expectedPlanRevision: 0,
      sections: sections(1),
      correlationId: randomUUID(),
    });
    const stateService = new ChangeSafetyPlanVersionStateService(unitOfWork);
    const active = await stateService.execute({
      actor,
      episodeId: episode.id,
      versionNumber: 1,
      action: "activate",
      expectedPlanRevision: first.planRevision,
      correlationId: randomUUID(),
    });
    const second = await creator.execute({
      actor,
      episodeId: episode.id,
      expectedPlanRevision: active.planRevision,
      sections: sections(2),
      correlationId: randomUUID(),
    });

    const versions = await prisma.safetyPlanVersion.findMany({
      where: { safetyPlanId: first.safetyPlanId },
      orderBy: { versionNumber: "asc" },
      include: { sections: true },
    });
    expect(versions.map(({ versionNumber }) => versionNumber)).toEqual([1, 2]);
    expect(versions[0]?.sections[0]?.content).toContain("v1");
    expect(versions[1]?.sections[0]?.content).toContain("v2");
    expect(second.planRevision).toBe(3);
    const firstPersistedVersion = versions[0];
    if (!firstPersistedVersion) throw new Error("First safety plan version was not persisted");

    const audit = await prisma.auditEvent.findFirstOrThrow({
      where: {
        actorUserId: nurse.id,
        action: "SAFETY_PLAN_VERSION_CREATED",
        resourceId: firstPersistedVersion.id,
      },
    });
    expect(Object.keys(audit)).not.toContain("content");

    await expect(
      prisma.safetyPlanVersion.delete({ where: { id: firstPersistedVersion.id } }),
    ).rejects.toThrow(/append-only/);
    await expect(prisma.safetyPlan.delete({ where: { id: first.safetyPlanId } })).rejects.toThrow();
  });
});
