import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  CheckInConflictError,
  GenerateCheckInAssignmentsService,
  OmitCheckInAssignmentService,
  RecordExpiredCheckInNonResponseService,
  SubmitCheckInResponseService,
} from "@/application/check-in/manage-check-ins";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaCheckInUnitOfWork } from "@/infrastructure/persistence/prisma-check-in-unit-of-work";

async function createUser(prefix: string, role: "admin" | "nurse" | "clinician" | "patient") {
  return prisma.user.create({
    data: {
      syntheticAlias: `${prefix}-${randomUUID()}`,
      displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
      isSynthetic: true,
      roleAssignments: { create: { role } },
    },
  });
}

async function createProtocol(input: {
  adminId: string;
  protocolKey: string;
  versionNumber: number;
  basedOnVersionId?: string;
  prompt?: string;
}) {
  return prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: input.protocolKey,
      versionNumber: input.versionNumber,
      title: "PLANTILLA SINTÉTICA / NO APROBADA",
      state: "SYNTHETIC_DEMO",
      basedOnVersionId: input.basedOnVersionId ?? null,
      isSyntheticFixture: true,
      createdById: input.adminId,
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
          prompt: input.prompt ?? "Ejemplo sintético de ánimo",
          required: true,
          scaleMinimum: 0,
          scaleMaximum: 4,
        },
      },
    },
    include: { questions: true },
  });
}

async function setupFixture(options: { readonly withAssignment?: boolean } = {}) {
  const [admin, nurse, clinician, patientUser] = await Promise.all([
    createUser("checkin-admin", "admin"),
    createUser("checkin-nurse", "nurse"),
    createUser("checkin-clinician", "clinician"),
    createUser("checkin-patient", "patient"),
  ]);
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `SYNTH-CHECKIN-${randomUUID()}`,
      isSynthetic: true,
      createdById: nurse.id,
      portalUserId: patientUser.id,
    },
  });
  const protocolKey = `synthetic-check-in-${randomUUID()}`;
  const protocol = await createProtocol({
    adminId: admin.id,
    protocolKey,
    versionNumber: 1,
  });
  const otherProtocol = await createProtocol({
    adminId: admin.id,
    protocolKey,
    versionNumber: 2,
    basedOnVersionId: protocol.id,
    prompt: "Ejemplo sintético de ánimo v2",
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-07-01T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  const policy = await prisma.policyVersion.create({
    data: {
      policyKey: `ci-part-${randomUUID()}`,
      version: "demo-v1",
      recordType: "DIGITAL_PARTICIPATION",
      state: "APPROVED",
      scope: "check-ins",
      actorUserId: admin.id,
      origin: "INSTITUTIONAL_CONFIGURATION",
      evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
      evidenceRef: "SYNTHETIC-ONLY",
    },
  });
  const participation = await prisma.digitalParticipationRecord.create({
    data: {
      subjectUserId: patientUser.id,
      state: "ACTIVE",
      scope: "check-ins",
      policyVersionId: policy.id,
      actorUserId: clinician.id,
      origin: "PROFESSIONAL_ENTRY",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "SYNTHETIC-ONLY",
    },
  });
  let assignment = null;
  if (options.withAssignment) {
    const batch = await prisma.checkInAssignmentBatch.create({
      data: {
        episodeId: episode.id,
        checkInProtocolVersionId: protocol.id,
        createdById: nurse.id,
        idempotencyKey: `fixture-batch:${randomUUID()}`,
        requestFingerprint: "b".repeat(64),
      },
    });
    assignment = await prisma.checkInAssignment.create({
      data: {
        batchId: batch.id,
        episodeId: episode.id,
        checkInProtocolVersionId: protocol.id,
        sequence: 1,
        scheduledFor: new Date("2026-07-02T07:30:00.000Z"),
        windowStartsAt: new Date("2026-07-02T07:30:00.000Z"),
        windowEndsAt: new Date("2026-07-02T10:30:00.000Z"),
        createdById: nurse.id,
      },
    });
  }
  return {
    admin,
    nurse,
    clinician,
    patientUser,
    patient,
    protocol,
    otherProtocol,
    episode,
    policy,
    participation,
    assignment,
  };
}

async function createAdditionalAssignment(
  fixture: Awaited<ReturnType<typeof setupFixture>>,
  sequence: number,
) {
  let batch = await prisma.checkInAssignmentBatch.findUnique({
    where: { episodeId: fixture.episode.id },
  });
  if (!batch) {
    batch = await prisma.checkInAssignmentBatch.create({
      data: {
        episodeId: fixture.episode.id,
        checkInProtocolVersionId: fixture.protocol.id,
        createdById: fixture.nurse.id,
        idempotencyKey: `fixture-batch:${randomUUID()}`,
        requestFingerprint: "c".repeat(64),
      },
    });
  }
  return prisma.checkInAssignment.create({
    data: {
      batchId: batch.id,
      episodeId: fixture.episode.id,
      checkInProtocolVersionId: fixture.protocol.id,
      sequence,
      scheduledFor: new Date(`2026-07-${String(sequence + 1).padStart(2, "0")}T07:30:00.000Z`),
      windowStartsAt: new Date(`2026-07-${String(sequence + 1).padStart(2, "0")}T07:30:00.000Z`),
      windowEndsAt: new Date(`2026-07-${String(sequence + 1).padStart(2, "0")}T10:30:00.000Z`),
      createdById: fixture.nurse.id,
    },
  });
}

function patientActor(userId: string) {
  return { userId, roles: ["patient"] as const, sessionId: randomUUID() };
}

function nurseActor(userId: string) {
  return { userId, roles: ["nurse"] as const, sessionId: randomUUID() };
}

function answer(questionId: string, value = 3) {
  return [{ questionDefinitionId: questionId, scaleValue: value }] as const;
}

function responseInput(
  fixture: Awaited<ReturnType<typeof setupFixture>>,
  assignmentId: string,
  idempotencyKey: string,
  value = 3,
) {
  return {
    actor: patientActor(fixture.patientUser.id),
    assignmentId,
    answers: answer(fixture.protocol.questions[0]!.id, value),
    idempotencyKey,
    correlationId: randomUUID(),
    now: new Date("2026-07-02T08:00:00.000Z"),
  };
}

describe.sequential("PostgreSQL check-in guarantees", () => {
  it("rechaza directamente una asignación con protocolo distinto al episodio", async () => {
    const fixture = await setupFixture();
    const batch = await prisma.checkInAssignmentBatch.create({
      data: {
        episodeId: fixture.episode.id,
        checkInProtocolVersionId: fixture.protocol.id,
        createdById: fixture.nurse.id,
        idempotencyKey: `negative-batch:${randomUUID()}`,
        requestFingerprint: "d".repeat(64),
      },
    });
    await expect(
      prisma.checkInAssignment.create({
        data: {
          batchId: batch.id,
          episodeId: fixture.episode.id,
          checkInProtocolVersionId: fixture.otherProtocol.id,
          sequence: 1,
          scheduledFor: new Date("2026-07-02T07:30:00.000Z"),
          windowStartsAt: new Date("2026-07-02T07:30:00.000Z"),
          windowEndsAt: new Date("2026-07-02T10:30:00.000Z"),
          createdById: fixture.nurse.id,
        },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("rechaza directamente una respuesta cuya versión difiere de la asignación", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    await expect(
      prisma.$transaction(async (transaction) => {
        const outcome = await transaction.checkInOutcome.create({
          data: {
            assignmentId: fixture.assignment!.id,
            checkInProtocolVersionId: fixture.protocol.id,
            type: "RESPONDED",
            recordedById: fixture.patientUser.id,
            idempotencyKey: `negative-response:${randomUUID()}`,
            requestFingerprint: "e".repeat(64),
          },
        });
        await transaction.checkInResponse.create({
          data: {
            outcomeId: outcome.id,
            assignmentId: fixture.assignment!.id,
            checkInProtocolVersionId: fixture.otherProtocol.id,
            outcomeType: "RESPONDED",
            submittedById: fixture.patientUser.id,
          },
        });
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("rechaza directamente una respuesta con pregunta de otra versión", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    await expect(
      prisma.$transaction(async (transaction) => {
        const outcome = await transaction.checkInOutcome.create({
          data: {
            assignmentId: fixture.assignment!.id,
            checkInProtocolVersionId: fixture.protocol.id,
            type: "RESPONDED",
            recordedById: fixture.patientUser.id,
            idempotencyKey: `negative-answer:${randomUUID()}`,
            requestFingerprint: "f".repeat(64),
          },
        });
        const response = await transaction.checkInResponse.create({
          data: {
            outcomeId: outcome.id,
            assignmentId: fixture.assignment!.id,
            checkInProtocolVersionId: fixture.protocol.id,
            outcomeType: "RESPONDED",
            submittedById: fixture.patientUser.id,
          },
        });
        await transaction.checkInAnswer.create({
          data: {
            checkInResponseId: response.id,
            questionDefinitionId: fixture.otherProtocol.questions[0]!.id,
            checkInProtocolVersionId: fixture.protocol.id,
            scaleValue: 3,
          },
        });
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("hace idempotente una generación concurrente con la misma clave y fingerprint", async () => {
    const fixture = await setupFixture();
    const service = new GenerateCheckInAssignmentsService(new PrismaCheckInUnitOfWork());
    const input = {
      actor: nurseActor(fixture.nurse.id),
      episodeId: fixture.episode.id,
      protocolVersionId: fixture.protocol.id,
      idempotencyKey: `batch-concurrent:${randomUUID()}`,
      correlationId: randomUUID(),
      now: new Date("2026-06-30T00:00:00.000Z"),
    };
    const results = await Promise.all([service.execute(input), service.execute(input)]);
    expect(results.map(({ idempotent }) => idempotent).sort()).toEqual([false, true]);
    expect(results[0].assignmentIds).toEqual(results[1].assignmentIds);
    await expect(
      prisma.checkInAssignmentBatch.count({ where: { episodeId: fixture.episode.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.checkInAssignment.count({ where: { episodeId: fixture.episode.id } }),
    ).resolves.toBe(10);
  });

  it("hace idempotente una respuesta concurrente y rechaza fingerprint distinto", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    const service = new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork());
    const key = `response-concurrent:${randomUUID()}`;
    const input = responseInput(fixture, fixture.assignment!.id, key);
    const results = await Promise.all([service.execute(input), service.execute(input)]);
    expect(results.map(({ idempotent }) => idempotent).sort()).toEqual([false, true]);
    expect(results[0].responseId).toBe(results[1].responseId);
    await expect(
      service.execute(responseInput(fixture, fixture.assignment!.id, key, 2)),
    ).rejects.toBeInstanceOf(CheckInConflictError);
    await expect(
      prisma.checkInOutcome.count({ where: { assignmentId: fixture.assignment!.id } }),
    ).resolves.toBe(1);
  });

  it("hace idempotentes omisión y vencimiento concurrentes", async () => {
    const omittedFixture = await setupFixture({ withAssignment: true });
    const omitService = new OmitCheckInAssignmentService(new PrismaCheckInUnitOfWork());
    const omitInput = {
      actor: patientActor(omittedFixture.patientUser.id),
      assignmentId: omittedFixture.assignment!.id,
      idempotencyKey: `omit-concurrent:${randomUUID()}`,
      correlationId: randomUUID(),
      now: new Date("2026-07-02T08:00:00.000Z"),
    };
    const omitted = await Promise.all([
      omitService.execute(omitInput),
      omitService.execute(omitInput),
    ]);
    expect(omitted.map(({ idempotent }) => idempotent).sort()).toEqual([false, true]);
    expect(omitted[0].nonResponseEventId).toBe(omitted[1].nonResponseEventId);

    const expiredFixture = await setupFixture({ withAssignment: true });
    const expireService = new RecordExpiredCheckInNonResponseService(new PrismaCheckInUnitOfWork());
    const expireInput = {
      actor: nurseActor(expiredFixture.nurse.id),
      assignmentId: expiredFixture.assignment!.id,
      idempotencyKey: `expire-concurrent:${randomUUID()}`,
      correlationId: randomUUID(),
      now: new Date("2026-07-02T11:00:00.000Z"),
    };
    const expired = await Promise.all([
      expireService.execute(expireInput),
      expireService.execute(expireInput),
    ]);
    expect(expired.map(({ idempotent }) => idempotent).sort()).toEqual([false, true]);
    expect(expired[0].nonResponseEventId).toBe(expired[1].nonResponseEventId);
  });

  it("carreras response vs omit producen un único outcome terminal", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fixture = await setupFixture({ withAssignment: true });
      const responseService = new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork());
      const omitService = new OmitCheckInAssignmentService(new PrismaCheckInUnitOfWork());
      const settled = await Promise.allSettled([
        responseService.execute(
          responseInput(fixture, fixture.assignment!.id, `response-race:${randomUUID()}`),
        ),
        omitService.execute({
          actor: patientActor(fixture.patientUser.id),
          assignmentId: fixture.assignment!.id,
          idempotencyKey: `omit-race:${randomUUID()}`,
          correlationId: randomUUID(),
          now: new Date("2026-07-02T08:00:00.000Z"),
        }),
      ]);
      expect(settled.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      const rejected = settled.find(({ status }) => status === "rejected");
      expect(rejected).toMatchObject({ reason: expect.any(CheckInConflictError) });
      const [outcomes, responses, nonResponses] = await Promise.all([
        prisma.checkInOutcome.count({ where: { assignmentId: fixture.assignment!.id } }),
        prisma.checkInResponse.count({ where: { assignmentId: fixture.assignment!.id } }),
        prisma.nonResponseEvent.count({ where: { assignmentId: fixture.assignment!.id } }),
      ]);
      expect(outcomes).toBe(1);
      expect(responses + nonResponses).toBe(1);
    }
  });

  it("carreras response vs expire producen un único outcome terminal", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fixture = await setupFixture({ withAssignment: true });
      const responseService = new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork());
      const expireService = new RecordExpiredCheckInNonResponseService(
        new PrismaCheckInUnitOfWork(),
      );
      const settled = await Promise.allSettled([
        responseService.execute(
          responseInput(fixture, fixture.assignment!.id, `response-expire-race:${randomUUID()}`),
        ),
        expireService.execute({
          actor: nurseActor(fixture.nurse.id),
          assignmentId: fixture.assignment!.id,
          idempotencyKey: `expire-response-race:${randomUUID()}`,
          correlationId: randomUUID(),
          now: new Date("2026-07-02T11:00:00.000Z"),
        }),
      ]);
      expect(settled.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      const rejected = settled.find(({ status }) => status === "rejected");
      expect(rejected).toMatchObject({ reason: expect.any(CheckInConflictError) });
      const [outcomes, responses, nonResponses] = await Promise.all([
        prisma.checkInOutcome.count({ where: { assignmentId: fixture.assignment!.id } }),
        prisma.checkInResponse.count({ where: { assignmentId: fixture.assignment!.id } }),
        prisma.nonResponseEvent.count({ where: { assignmentId: fixture.assignment!.id } }),
      ]);
      expect(outcomes).toBe(1);
      expect(responses + nonResponses).toBe(1);
    }
  });

  it("conserva histórico exacto tras nueva versión y revocación", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    const response = await new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork()).execute(
      responseInput(fixture, fixture.assignment!.id, `response-history:${randomUUID()}`),
    );
    await prisma.revocationEvent.create({
      data: {
        targetType: "DIGITAL_PARTICIPATION",
        targetRecordId: fixture.participation.id,
        subjectUserId: fixture.patientUser.id,
        scope: "check-ins",
        policyVersionId: fixture.policy.id,
        actorUserId: fixture.patientUser.id,
        origin: "DEMO_UI",
        evidenceType: "RECORDED_INTERACTION",
        evidenceRef: "SYNTHETIC-ONLY",
      },
    });
    const stored = await prisma.checkInResponse.findUniqueOrThrow({
      where: { id: response.responseId },
      include: { answers: true, assignment: true },
    });
    expect(stored.assignment.checkInProtocolVersionId).toBe(fixture.protocol.id);
    expect(stored.checkInProtocolVersionId).toBe(fixture.protocol.id);
    expect(stored.answers[0]!.questionDefinitionId).toBe(fixture.protocol.questions[0]!.id);
    await expect(
      prisma.questionDefinition.update({
        where: { id: fixture.protocol.questions[0]!.id },
        data: { prompt: "No debe sobrescribirse" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.checkInAssignment.count({ where: { episodeId: fixture.episode.id } }),
    ).resolves.toBe(1);
  });

  it("rechaza outcomes huérfanos al confirmar la transacción", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    await expect(
      prisma.checkInOutcome.create({
        data: {
          assignmentId: fixture.assignment!.id,
          checkInProtocolVersionId: fixture.protocol.id,
          type: "RESPONDED",
          recordedById: fixture.patientUser.id,
          idempotencyKey: `orphan:${randomUUID()}`,
          requestFingerprint: "9".repeat(64),
        },
      }),
    ).rejects.toThrow("responded outcome requires a check-in response");
  });

  it("permite crear una segunda asignación válida sin alterar la primera", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    const second = await createAdditionalAssignment(fixture, 2);
    expect(second.checkInProtocolVersionId).toBe(fixture.protocol.id);
    await expect(
      prisma.checkInAssignment.count({ where: { episodeId: fixture.episode.id } }),
    ).resolves.toBe(2);
  });
});
