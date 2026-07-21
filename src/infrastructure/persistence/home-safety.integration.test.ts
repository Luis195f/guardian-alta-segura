import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CreateHomeSafetyVersionService,
  HomeSafetyConflictError,
  HomeSafetyDeniedError,
} from "@/application/home-safety/manage-home-safety";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { HOME_SAFETY_ITEM_DEFINITIONS } from "@/domain/home-safety/home-safety";
import { prisma } from "@/infrastructure/persistence/prisma";
import {
  listHomeSafetyVersions,
  PrismaHomeSafetyUnitOfWork,
} from "@/infrastructure/persistence/prisma-home-safety-unit-of-work";

async function setup() {
  async function user(role: "admin" | "nurse" | "clinician") {
    return prisma.user.create({
      data: {
        syntheticAlias: `home-${role}-${randomUUID()}`,
        displayLabel: `SINTÉTICO ${role}`,
        isSynthetic: true,
        roleAssignments: { create: { role } },
      },
    });
  }
  const [admin, nurse, clinician, otherNurse] = await Promise.all([
    user("admin"),
    user("nurse"),
    user("clinician"),
    user("nurse"),
  ]);
  const protocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `home-protocol-${randomUUID()}`,
      versionNumber: 1,
      title: "PLANTILLA SINTÉTICA",
      state: "DRAFT",
      isSyntheticFixture: true,
      createdById: admin.id,
    },
  });
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `SYNTH-HOME-${randomUUID()}`,
      isSynthetic: true,
      createdById: nurse.id,
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-07-21T00:00:00Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  return { nurse, clinician, otherNurse, episode };
}

function principal(userId: string, role: "nurse" | "clinician"): AuthenticatedPrincipal {
  return { userId, roles: [role], sessionId: randomUUID() };
}
const items = HOME_SAFETY_ITEM_DEFINITIONS.map(({ key }) => ({
  itemKey: key,
  state: "INFORMATION_RECORDED" as const,
  provenance: "NURSE" as const,
}));

describe("persistencia de Domicilio Seguro", () => {
  it("solo acepta una creación concurrente para la misma versión esperada", async () => {
    const data = await setup();
    const service = new CreateHomeSafetyVersionService(new PrismaHomeSafetyUnitOfWork());
    const input = {
      actor: principal(data.nurse.id, "nurse"),
      episodeId: data.episode.id,
      expectedPreviousVersion: 0,
      informationalPurposeAcknowledged: true,
      humanReviewed: false,
      items,
    } as const;
    const results = await Promise.allSettled([
      service.execute({ ...input, correlationId: randomUUID() }),
      service.execute({ ...input, correlationId: randomUUID() }),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(results.find(({ status }) => status === "rejected")).toMatchObject({
      reason: expect.any(HomeSafetyConflictError),
    });
    await expect(
      prisma.homeSafetyReviewVersion.count({
        where: { dischargeEpisodeId: data.episode.id },
      }),
    ).resolves.toBe(1);
  });

  it("versiona, aísla por responsables, audita sin contenido y bloquea UPDATE/DELETE", async () => {
    const data = await setup();
    const service = new CreateHomeSafetyVersionService(new PrismaHomeSafetyUnitOfWork());
    const correlationId = randomUUID();
    const first = await service.execute({
      actor: principal(data.nurse.id, "nurse"),
      episodeId: data.episode.id,
      expectedPreviousVersion: 0,
      informationalPurposeAcknowledged: true,
      humanReviewed: false,
      items,
      correlationId,
    });
    const second = await service.execute({
      actor: principal(data.clinician.id, "clinician"),
      episodeId: data.episode.id,
      expectedPreviousVersion: 1,
      informationalPurposeAcknowledged: true,
      humanReviewed: true,
      items: items.map((item) => ({ ...item, provenance: "CLINICIAN" })),
      correlationId,
    });
    expect(second.versionNumber).toBe(2);
    const versions = await listHomeSafetyVersions(
      principal(data.nurse.id, "nurse"),
      data.episode.id,
    );
    expect(versions?.map(({ versionNumber }) => versionNumber)).toEqual([2, 1]);
    await expect(
      service.execute({
        actor: principal(data.otherNurse.id, "nurse"),
        episodeId: data.episode.id,
        expectedPreviousVersion: 2,
        informationalPurposeAcknowledged: true,
        humanReviewed: true,
        items,
        correlationId,
      }),
    ).rejects.toBeInstanceOf(HomeSafetyDeniedError);
    const audits = await prisma.auditEvent.findMany({ where: { correlationId } });
    expect(audits).toHaveLength(2);
    expect(JSON.stringify(audits)).not.toContain("environment-information");
    await expect(
      prisma.$executeRaw`UPDATE "home_safety_review_versions" SET "human_reviewed" = TRUE WHERE "id" = ${first.versionId}`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`DELETE FROM "home_safety_review_versions" WHERE "id" = ${first.versionId}`,
    ).rejects.toThrow();
  });
});
