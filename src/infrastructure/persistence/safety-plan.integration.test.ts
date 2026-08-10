import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  ChangeSafetyPlanVersionStateService,
  CreateSafetyPlanVersionService,
} from "@/application/safety-plan/manage-safety-plan";
import { SAFETY_PLAN_STEPS } from "@/domain/safety-plan/safety-plan";
import { prisma } from "@/infrastructure/persistence/prisma";
import {
  getSafetyPlanView,
  listPatientSafetyPlanViews,
  PrismaSafetyPlanUnitOfWork,
} from "@/infrastructure/persistence/prisma-safety-plan-unit-of-work";

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
    clinician,
    patient,
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

type PersistedSafetyPlanState = "DRAFT" | "ACTIVE" | "SUPERSEDED" | "INVALIDATED";

async function createPlanHistory(input: {
  readonly episodeId: string;
  readonly nurseId: string;
  readonly statesByVersion: readonly (readonly PersistedSafetyPlanState[])[];
  readonly activeVersionNumber?: number | null;
}) {
  const plan = await prisma.safetyPlan.create({
    data: {
      dischargeEpisodeId: input.episodeId,
      revision: input.statesByVersion.length,
      currentVersion: input.statesByVersion.length,
      activeVersionNumber: input.activeVersionNumber ?? null,
      createdById: input.nurseId,
    },
  });
  const versions = input.statesByVersion.map((_, index) => ({
    id: randomUUID(),
    safetyPlanId: plan.id,
    versionNumber: index + 1,
    basedOnVersion: index === 0 ? null : index,
    createdById: input.nurseId,
    createdAt: new Date(1_784_000_000_000 + index * 60_000),
  }));
  const sectionRows = versions.flatMap((version) =>
    SAFETY_PLAN_STEPS.map((step) => ({
      id: randomUUID(),
      safetyPlanVersionId: version.id,
      step,
      content: `Contenido sintético ${version.versionNumber} ${step}`,
      provenance: "NURSE" as const,
    })),
  );
  await prisma.$transaction([
    prisma.safetyPlanVersion.createMany({ data: versions }),
    prisma.safetyPlanVersionStateChange.createMany({
      data: versions.flatMap((version, versionIndex) =>
        input.statesByVersion[versionIndex]!.map((resultingState, stateIndex) => ({
          id: randomUUID(),
          safetyPlanVersionId: version.id,
          sequence: stateIndex + 1,
          resultingState,
          actorUserId: input.nurseId,
          occurredAt: new Date(1_784_000_000_000 + versionIndex * 60_000 + stateIndex),
        })),
      ),
    }),
    prisma.safetyPlanSection.createMany({ data: sectionRows }),
    prisma.safetyPlanSectionPermission.createMany({
      data: sectionRows.map((section) => ({
        safetyPlanSectionId: section.id,
        audience: "PATIENT" as const,
        canView: true,
      })),
    }),
  ]);
  return { plan, versions };
}

describe.sequential("PostgreSQL safety plan guarantees", () => {
  it("selecciona versiones autorizadas por su estado vigente antes del límite", async () => {
    const data = await arrangeEpisode();
    const patientUser = await prisma.user.create({
      data: {
        syntheticAlias: `safety-boundary-patient-${randomUUID()}`,
        displayLabel: "SINTÉTICO / NO USO CLÍNICO — patient",
        isSynthetic: true,
        roleAssignments: { create: { role: "patient" } },
      },
    });
    await prisma.patient.update({
      where: { id: data.patient.id },
      data: { portalUserId: patientUser.id },
    });
    await createPlanHistory({
      episodeId: data.episode.id,
      nurseId: data.nurse.id,
      statesByVersion: [
        ["ACTIVE"],
        ...Array.from({ length: 51 }, () => ["DRAFT"] as const),
        ["ACTIVE", "INVALIDATED"],
      ],
      activeVersionNumber: 1,
    });
    const patientPrincipal = {
      userId: patientUser.id,
      roles: ["patient" as const],
      sessionId: randomUUID(),
    };

    const patientView = await getSafetyPlanView(data.episode.id, patientPrincipal);
    const professionalView = await getSafetyPlanView(data.episode.id, data.actor);

    expect(patientView?.plan?.versions.map(({ versionNumber }) => versionNumber)).toEqual([1]);
    expect(patientView?.plan?.versions.every(({ state }) => state !== "DRAFT")).toBe(true);
    expect(patientView?.plan?.versions.every(({ state }) => state !== "INVALIDATED")).toBe(true);
    expect(patientView?.plan?.collectionCoverage.versions).toMatchObject({
      returned: 1,
      limit: 50,
      truncated: false,
    });
    expect(patientView?.plan?.collectionCoverage.versions.returned).toBe(
      patientView?.plan?.versions.length,
    );
    expect(professionalView?.plan?.versions).toHaveLength(50);
    expect(professionalView?.plan?.collectionCoverage.versions).toMatchObject({
      returned: 50,
      truncated: true,
    });

    const outsiderRoles = ["nurse", "caregiver", "support", "admin"] as const;
    for (const role of outsiderRoles) {
      const outsider = await prisma.user.create({
        data: {
          syntheticAlias: `safety-outsider-${role}-${randomUUID()}`,
          displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
          isSynthetic: true,
          roleAssignments: { create: { role } },
        },
      });
      await expect(
        getSafetyPlanView(data.episode.id, {
          userId: outsider.id,
          roles: [role],
          sessionId: randomUUID(),
        }),
      ).resolves.toBeNull();
    }
  });

  it("limita después de seleccionar más de cincuenta versiones actualmente visibles", async () => {
    const data = await arrangeEpisode();
    const patientUser = await prisma.user.create({
      data: {
        syntheticAlias: `safety-visible-patient-${randomUUID()}`,
        displayLabel: "SINTÉTICO / NO USO CLÍNICO — patient",
        isSynthetic: true,
        roleAssignments: { create: { role: "patient" } },
      },
    });
    await prisma.patient.update({
      where: { id: data.patient.id },
      data: { portalUserId: patientUser.id },
    });
    await createPlanHistory({
      episodeId: data.episode.id,
      nurseId: data.nurse.id,
      statesByVersion: Array.from({ length: 52 }, () => ["SUPERSEDED"] as const),
    });
    const principal = {
      userId: patientUser.id,
      roles: ["patient" as const],
      sessionId: randomUUID(),
    };

    const first = await getSafetyPlanView(data.episode.id, principal);
    const second = await getSafetyPlanView(data.episode.id, principal);

    expect(first?.plan?.versions).toHaveLength(50);
    expect(first?.plan?.collectionCoverage.versions).toMatchObject({
      returned: 50,
      limit: 50,
      truncated: true,
    });
    expect(first?.plan?.collectionCoverage.versions.returned).toBe(first?.plan?.versions.length);
    expect(second?.plan?.versions.map(({ versionNumber }) => versionNumber)).toEqual(
      first?.plan?.versions.map(({ versionNumber }) => versionNumber),
    );
  });

  it("carga el directorio del patient sin una consulta de detalle por episodio", async () => {
    const data = await arrangeEpisode();
    const patientUser = await prisma.user.create({
      data: {
        syntheticAlias: `safety-patient-${randomUUID()}`,
        displayLabel: "SINTÉTICO / NO USO CLÍNICO — patient",
        isSynthetic: true,
        roleAssignments: { create: { role: "patient" } },
      },
    });
    await prisma.patient.update({
      where: { id: data.episode.patientId },
      data: { portalUserId: patientUser.id },
    });
    await createPlanHistory({
      episodeId: data.episode.id,
      nurseId: data.nurse.id,
      statesByVersion: [["ACTIVE"]],
      activeVersionNumber: 1,
    });
    const instrumentedPrisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
    let queryCount = 0;
    instrumentedPrisma.$on("query", () => {
      queryCount += 1;
    });
    const principal = {
      userId: patientUser.id,
      roles: ["patient" as const],
      sessionId: randomUUID(),
    };
    try {
      const first = await listPatientSafetyPlanViews(principal, instrumentedPrisma);
      const oneEpisodeQueryCount = queryCount;
      expect(first?.values).toHaveLength(1);

      const secondEpisode = await prisma.dischargeEpisode.create({
        data: {
          patientId: data.episode.patientId,
          dischargeDate: new Date("2026-07-18T00:00:00Z"),
          programLengthDays: 30,
          responsibleNurseId: data.nurse.id,
          responsibleClinicianId: data.episode.responsibleClinicianId,
          createdById: data.nurse.id,
          checkInProtocolVersionId: data.episode.checkInProtocolVersionId,
        },
      });
      await createPlanHistory({
        episodeId: secondEpisode.id,
        nurseId: data.nurse.id,
        statesByVersion: [["ACTIVE"]],
        activeVersionNumber: 1,
      });
      queryCount = 0;
      const result = await listPatientSafetyPlanViews(principal, instrumentedPrisma);
      expect(result?.values).toHaveLength(2);
      expect(queryCount).toBe(oneEpisodeQueryCount);
    } finally {
      await instrumentedPrisma.$disconnect();
    }
  });

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
