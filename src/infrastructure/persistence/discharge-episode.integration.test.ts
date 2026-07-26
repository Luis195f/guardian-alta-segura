import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CreateDischargeEpisodeService,
  GetEpisodeGovernanceViewService,
  TransitionDischargeEpisodeService,
} from "@/application/episode/manage-discharge-episode";
import { CreateNursingTaskService } from "@/application/workqueue/manage-nursing-tasks";
import { PendingInstitutionalEpisodeGovernancePolicy } from "@/domain/episode/activation-policy";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaEpisodeUnitOfWork } from "@/infrastructure/persistence/prisma-episode-unit-of-work";
import { PrismaNursingWorkQueueUnitOfWork } from "@/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work";

const pendingGovernance = new PendingInstitutionalEpisodeGovernancePolicy();

async function createProfessional(prefix: string, role: "nurse" | "clinician") {
  const user = await prisma.user.create({
    data: {
      syntheticAlias: `${prefix}-${randomUUID()}`,
      displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
      isSynthetic: true,
    },
  });
  await prisma.roleAssignment.create({ data: { userId: user.id, role } });
  return user;
}

async function arrangeVerifiedPatient() {
  const nurse = await createProfessional("episode-nurse", "nurse");
  const clinician = await createProfessional("episode-clinician", "clinician");
  const policy = await prisma.identityVerificationPolicyVersion.create({
    data: {
      policyKey: `synthetic-test-${randomUUID()}`,
      version: "test-v1",
      state: "APPROVED",
      acceptedState: "VERIFIED",
      processCode: "RECORDED_HUMAN_REVIEW",
      processVersion: "test-v1",
      isSyntheticDemo: true,
      actorUserId: nurse.id,
    },
  });
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `SYNTH-${randomUUID()}`,
      isSynthetic: true,
      identityVerificationState: "VERIFIED",
      identityVerificationPolicyVersionId: policy.id,
      identityVerifiedAt: new Date(),
      identityVerifiedById: nurse.id,
      createdById: nurse.id,
    },
  });
  const checkInProtocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `synthetic-check-in-${randomUUID()}`,
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
          questionKey: "synthetic-mood",
          position: 1,
          type: "SCALE",
          prompt: "Pregunta sintética no aprobada",
          required: true,
          scaleMinimum: 0,
          scaleMaximum: 4,
        },
      },
    },
  });
  return { nurse, clinician, patient, checkInProtocol };
}

describe.sequential("PostgreSQL discharge episode guarantees", () => {
  it("crea y activa de forma transaccional, idempotente y auditada", async () => {
    const { nurse, clinician, patient, checkInProtocol } = await arrangeVerifiedPatient();
    const actor = { userId: nurse.id, roles: ["nurse"] as const, sessionId: randomUUID() };
    const unitOfWork = new PrismaEpisodeUnitOfWork();
    const created = await new CreateDischargeEpisodeService(unitOfWork).execute({
      actor,
      externalPseudonymousId: patient.externalPseudonymousId,
      dischargeDate: "2026-07-16",
      programLengthDays: 60,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      checkInProtocolVersionId: checkInProtocol.id,
      idempotencyKey: `create:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const activationKey = `activate:${randomUUID()}`;
    const service = new TransitionDischargeEpisodeService(unitOfWork, pendingGovernance);
    const first = await service.execute({
      actor,
      episodeId: created.episodeId,
      targetStatus: "ACTIVE",
      expectedVersion: 1,
      idempotencyKey: activationKey,
      correlationId: randomUUID(),
    });
    const retry = await service.execute({
      actor,
      episodeId: created.episodeId,
      targetStatus: "ACTIVE",
      expectedVersion: 1,
      idempotencyKey: activationKey,
      correlationId: randomUUID(),
    });

    expect(first).toMatchObject({ version: 2, idempotent: false });
    expect(retry).toMatchObject({ version: 2, idempotent: true });
    await expect(
      prisma.episodeTransition.count({ where: { episodeId: created.episodeId } }),
    ).resolves.toBe(2);
    await expect(
      prisma.auditEvent.count({
        where: {
          resourceId: created.episodeId,
          action: { in: ["EPISODE_CREATED", "EPISODE_TRANSITIONED"] },
        },
      }),
    ).resolves.toBe(2);

    const concurrent = await Promise.allSettled([
      service.execute({
        actor,
        episodeId: created.episodeId,
        targetStatus: "PAUSED",
        expectedVersion: 2,
        reason: "Revisión organizativa sintética A",
        idempotencyKey: `pause:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      service.execute({
        actor,
        episodeId: created.episodeId,
        targetStatus: "PAUSED",
        expectedVersion: 2,
        reason: "Revisión organizativa sintética B",
        idempotencyKey: `pause:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);
    expect(concurrent.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter(({ status }) => status === "rejected")).toHaveLength(1);
    await expect(
      prisma.dischargeEpisode.findUnique({
        where: { id: created.episodeId },
        select: { status: true, version: true },
      }),
    ).resolves.toEqual({ status: "PAUSED", version: 3 });
  });

  it("compone gobernanza desde avisos y tareas actuales sin copiar su contenido", async () => {
    const { nurse, clinician, patient, checkInProtocol } = await arrangeVerifiedPatient();
    const actor = { userId: nurse.id, roles: ["nurse"] as const, sessionId: randomUUID() };
    const unitOfWork = new PrismaEpisodeUnitOfWork();
    const created = await new CreateDischargeEpisodeService(unitOfWork).execute({
      actor,
      externalPseudonymousId: patient.externalPseudonymousId,
      dischargeDate: "2026-07-16",
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      checkInProtocolVersionId: checkInProtocol.id,
      idempotencyKey: `create:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    await new TransitionDischargeEpisodeService(unitOfWork, pendingGovernance).execute({
      actor,
      episodeId: created.episodeId,
      targetStatus: "ACTIVE",
      expectedVersion: 1,
      idempotencyKey: `activate:${randomUUID()}`,
      correlationId: randomUUID(),
    });

    const definition = await prisma.ruleDefinition.create({
      data: {
        ruleKey: `synthetic-governance-${randomUUID()}`,
        name: "Regla técnica sintética",
        isSyntheticFixture: true,
        createdById: nurse.id,
      },
    });
    const version = await prisma.ruleVersion.create({
      data: {
        ruleDefinitionId: definition.id,
        versionNumber: 1,
        state: "DRAFT",
        schemaVersion: 1,
        allowedInputs: [{ key: "synthetic_flag", type: "boolean", required: true }],
        temporalWindow: { lookbackHours: 24 },
        condition: {
          combinator: "all",
          clauses: [{ input: "synthetic_flag", operator: "eq", value: true }],
        },
        administrativeSeverity: "STANDARD",
        explanation: "Explicación sintética sensible que la gobernanza no debe copiar",
        reviewOwner: "NURSE",
        createdById: nurse.id,
      },
    });
    await prisma.ruleApproval.create({
      data: {
        ruleVersionId: version.id,
        approvedById: clinician.id,
        approvalReference: `synthetic-test:${randomUUID()}`,
      },
    });
    await prisma.ruleVersion.update({
      where: { id: version.id },
      data: { state: "APPROVED" },
    });
    await prisma.ruleVersion.update({
      where: { id: version.id },
      data: { state: "ACTIVE" },
    });
    const evaluation = await prisma.ruleEvaluation.create({
      data: {
        ruleDefinitionId: definition.id,
        ruleVersionId: version.id,
        ruleVersionNumber: version.versionNumber,
        episodeId: created.episodeId,
        evaluatedById: nurse.id,
        idempotencyKey: `evaluation:${randomUUID()}`,
        requestFingerprint: "a".repeat(64),
        evaluatedAt: new Date(),
        inputSnapshot: [],
        inputHash: "b".repeat(64),
        outcome: "MATCHED",
        missingInputs: [],
      },
    });
    const alert = await prisma.alert.create({
      data: {
        ruleDefinitionId: definition.id,
        ruleVersionId: version.id,
        ruleVersionNumber: version.versionNumber,
        evaluationId: evaluation.id,
        episodeId: created.episodeId,
        inputReferences: [],
        explanation: "Contenido sintético sensible del aviso",
        administrativeSeverity: "STANDARD",
        reviewOwner: "NURSE",
        triggeredAt: new Date(),
      },
    });
    const task = await new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute(
      {
        actor,
        episodeId: created.episodeId,
        alertId: null,
        summary: "Contenido sintético sensible de la tarea",
        assignedToId: nurse.id,
        idempotencyKey: `task:${randomUUID()}`,
        correlationId: randomUUID(),
      },
    );

    const view = await new GetEpisodeGovernanceViewService(unitOfWork, pendingGovernance).execute({
      actor,
      episodeId: created.episodeId,
      correlationId: randomUUID(),
    });

    expect(view.openObligations).toEqual(
      expect.arrayContaining([
        { kind: "ALERT", resourceId: alert.id, state: "open" },
        { kind: "TASK", resourceId: task.taskId, state: "open", revision: 1 },
      ]),
    );
    expect(view.blockers.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "UNRESOLVED_ALERTS",
        "OPEN_TASKS",
        "DEC_002_EPISODE_CLOSURE_POLICY_PENDING",
      ]),
    );
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("Contenido sintético sensible del aviso");
    expect(serialized).not.toContain("Contenido sintético sensible de la tarea");
  });

  it("impide hard-delete de episodio, paciente y timeline", async () => {
    const { nurse, clinician, patient, checkInProtocol } = await arrangeVerifiedPatient();
    const episode = await prisma.dischargeEpisode.create({
      data: {
        patientId: patient.id,
        dischargeDate: new Date("2026-07-16T00:00:00Z"),
        programLengthDays: 30,
        responsibleNurseId: nurse.id,
        responsibleClinicianId: clinician.id,
        createdById: nurse.id,
        checkInProtocolVersionId: checkInProtocol.id,
      },
    });
    const transition = await prisma.episodeTransition.create({
      data: {
        episodeId: episode.id,
        fromStatus: null,
        toStatus: "DRAFT",
        actorUserId: nurse.id,
        actorRole: "nurse",
        idempotencyKey: `create:${randomUUID()}`,
        requestFingerprint: "a".repeat(64),
        resultingVersion: 1,
      },
    });

    await expect(
      prisma.episodeTransition.delete({ where: { id: transition.id } }),
    ).rejects.toThrow();
    await expect(prisma.dischargeEpisode.delete({ where: { id: episode.id } })).rejects.toThrow();
    await expect(prisma.patient.delete({ where: { id: patient.id } })).rejects.toThrow();
    await expect(
      prisma.dischargeEpisode.findUnique({ where: { id: episode.id } }),
    ).resolves.not.toBeNull();
  });
});
