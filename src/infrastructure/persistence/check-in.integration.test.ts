import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  CheckInConflictError,
  CheckInDeniedError,
  CheckInParticipationRevokedError,
  GenerateCheckInAssignmentsService,
  OmitCheckInAssignmentService,
  RecordExpiredCheckInNonResponseService,
  SubmitCheckInResponseService,
} from "@/application/check-in/manage-check-ins";
import type { Role } from "@/domain/auth/role";
import { prisma } from "@/infrastructure/persistence/prisma";
import {
  listVisibleCheckInAssignments,
  PrismaCheckInUnitOfWork,
} from "@/infrastructure/persistence/prisma-check-in-unit-of-work";

async function createUser(prefix: string, role: Role) {
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

function clinicianActor(userId: string) {
  return { userId, roles: ["clinician"] as const, sessionId: randomUUID() };
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

async function terminalPersistence(assignmentId: string) {
  const [outcomes, responses, nonResponses] = await Promise.all([
    prisma.checkInOutcome.findMany({ where: { assignmentId }, select: { id: true } }),
    prisma.checkInResponse.findMany({ where: { assignmentId }, select: { id: true } }),
    prisma.nonResponseEvent.findMany({ where: { assignmentId }, select: { id: true } }),
  ]);
  const resultIds = [...responses, ...nonResponses].map(({ id }) => id);
  const terminalAuditEvents = await prisma.auditEvent.count({
    where: {
      resourceId: { in: resultIds },
      action: { in: ["CHECK_IN_RESPONSE_RECORDED", "CHECK_IN_NON_RESPONSE_RECORDED"] },
    },
  });
  return {
    outcomes: outcomes.length,
    responses: responses.length,
    nonResponses: nonResponses.length,
    terminalAuditEvents,
  };
}

async function downstreamPersistence(episodeId: string, subjectUserId: string) {
  const [ruleEvaluations, alerts, tasks, communications, commitments] = await Promise.all([
    prisma.ruleEvaluation.count({ where: { episodeId } }),
    prisma.alert.count({ where: { episodeId } }),
    prisma.task.count({ where: { episodeId } }),
    prisma.communicationPermission.count({ where: { subjectUserId } }),
    prisma.episodeCommitment.count({ where: { episodeId } }),
  ]);
  return { ruleEvaluations, alerts, tasks, communications, commitments };
}

describe.sequential("PostgreSQL check-in guarantees", () => {
  it("selecciona disponibilidad antes del límite con consultas constantes y aislamiento", async () => {
    const fixture = await setupFixture();
    const [outsider, support] = await Promise.all([
      createUser("checkin-boundary-outsider", "clinician"),
      createUser("checkin-boundary-support", "support"),
    ]);
    const batch = await prisma.checkInAssignmentBatch.create({
      data: {
        episodeId: fixture.episode.id,
        checkInProtocolVersionId: fixture.protocol.id,
        createdById: fixture.nurse.id,
        idempotencyKey: `boundary-batch:${randomUUID()}`,
        requestFingerprint: "e".repeat(64),
      },
    });
    const now = new Date("2026-07-10T08:00:00.000Z");
    const openAssignmentId = randomUUID();
    await prisma.checkInAssignment.createMany({
      data: [
        {
          id: openAssignmentId,
          batchId: batch.id,
          episodeId: fixture.episode.id,
          checkInProtocolVersionId: fixture.protocol.id,
          sequence: 1,
          scheduledFor: now,
          windowStartsAt: new Date(now.getTime() - 30 * 60_000),
          windowEndsAt: new Date(now.getTime() + 30 * 60_000),
          createdById: fixture.nurse.id,
        },
        ...Array.from({ length: 51 }, (_, index) => {
          const scheduledFor = new Date(now.getTime() + (index + 1) * 60 * 60_000);
          return {
            id: randomUUID(),
            batchId: batch.id,
            episodeId: fixture.episode.id,
            checkInProtocolVersionId: fixture.protocol.id,
            sequence: index + 2,
            scheduledFor,
            windowStartsAt: scheduledFor,
            windowEndsAt: new Date(scheduledFor.getTime() + 30 * 60_000),
            createdById: fixture.nurse.id,
          };
        }),
      ],
    });
    const querySpy = vi.spyOn(prisma.checkInAssignment, "findMany");
    try {
      const first = await listVisibleCheckInAssignments(patientActor(fixture.patientUser.id), now);
      expect(querySpy).toHaveBeenCalledTimes(4);
      expect(first?.values).toHaveLength(50);
      expect(first?.coverage).toMatchObject({ returned: 50, limit: 50, truncated: true });
      expect(first?.values[0]).toMatchObject({ id: openAssignmentId, availability: "OPEN" });
      expect(first?.values.slice(1).every(({ availability }) => availability === "UPCOMING")).toBe(
        true,
      );

      querySpy.mockClear();
      const second = await listVisibleCheckInAssignments(patientActor(fixture.patientUser.id), now);
      expect(querySpy).toHaveBeenCalledTimes(4);
      expect(second?.values.map(({ id }) => id)).toEqual(first?.values.map(({ id }) => id));
    } finally {
      querySpy.mockRestore();
    }

    await expect(
      listVisibleCheckInAssignments(clinicianActor(outsider.id), now),
    ).resolves.toMatchObject({ values: [] });
    await expect(
      listVisibleCheckInAssignments(
        { userId: support.id, roles: ["support"], sessionId: randomUUID() },
        now,
      ),
    ).resolves.toBeNull();
  });

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

  it("deniega otro paciente, support, caregiver y profesional ajeno", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    const [otherPatient, support, caregiver, outsider] = await Promise.all([
      createUser("checkin-other-patient", "patient"),
      createUser("checkin-support", "support"),
      createUser("checkin-caregiver", "caregiver"),
      createUser("checkin-outsider", "clinician"),
    ]);
    const responseService = new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork());
    const response = responseInput(
      fixture,
      fixture.assignment!.id,
      `response-authorization:${randomUUID()}`,
    );

    await expect(
      responseService.execute({ ...response, actor: patientActor(otherPatient.id) }),
    ).rejects.toBeInstanceOf(CheckInDeniedError);
    for (const actor of [
      { userId: support.id, roles: ["support"] as const, sessionId: randomUUID() },
      { userId: caregiver.id, roles: ["caregiver"] as const, sessionId: randomUUID() },
    ]) {
      await expect(responseService.execute({ ...response, actor })).rejects.toBeInstanceOf(
        CheckInDeniedError,
      );
    }
    await expect(
      new RecordExpiredCheckInNonResponseService(new PrismaCheckInUnitOfWork()).execute({
        actor: clinicianActor(outsider.id),
        assignmentId: fixture.assignment!.id,
        idempotencyKey: `expire-outsider:${randomUUID()}`,
        correlationId: randomUUID(),
        now: new Date("2026-07-02T11:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(CheckInDeniedError);
    await expect(terminalPersistence(fixture.assignment!.id)).resolves.toEqual({
      outcomes: 0,
      responses: 0,
      nonResponses: 0,
      terminalAuditEvents: 0,
    });
  });

  it("revoca antes de responder, bloquea la disponibilidad y conserva la asignación", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    await prisma.revocationEvent.create({
      data: {
        targetType: "DIGITAL_PARTICIPATION",
        targetRecordId: fixture.participation.id,
        subjectUserId: fixture.patientUser.id,
        scope: "check-ins",
        policyVersionId: fixture.policy.id,
        actorUserId: fixture.patientUser.id,
        recordedAt: new Date("2026-07-02T07:45:00.000Z"),
        origin: "DEMO_UI",
        evidenceType: "RECORDED_INTERACTION",
        evidenceRef: "SYNTHETIC-ONLY",
      },
    });
    const now = new Date("2026-07-02T08:00:00.000Z");

    await expect(
      new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork()).execute({
        ...responseInput(
          fixture,
          fixture.assignment!.id,
          `response-after-revocation:${randomUUID()}`,
        ),
        now,
      }),
    ).rejects.toBeInstanceOf(CheckInParticipationRevokedError);
    const visible = await listVisibleCheckInAssignments(patientActor(fixture.patientUser.id), now);
    expect(visible?.values).toHaveLength(1);
    expect(visible!.values[0]).toMatchObject({
      id: fixture.assignment!.id,
      availability: "BLOCKED",
      availabilityReason: "DIGITAL_PARTICIPATION_NOT_ACTIVE",
      isActionable: false,
    });
    await expect(
      prisma.checkInAssignment.count({ where: { episodeId: fixture.episode.id } }),
    ).resolves.toBe(1);
    await expect(terminalPersistence(fixture.assignment!.id)).resolves.toEqual({
      outcomes: 0,
      responses: 0,
      nonResponses: 0,
      terminalAuditEvents: 0,
    });
  });

  it("una respuesta no crea acciones automáticas aguas abajo", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    const before = await downstreamPersistence(fixture.episode.id, fixture.patientUser.id);
    await new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork()).execute(
      responseInput(fixture, fixture.assignment!.id, `response-no-downstream:${randomUUID()}`),
    );

    await expect(
      downstreamPersistence(fixture.episode.id, fixture.patientUser.id),
    ).resolves.toEqual(before);
    await expect(terminalPersistence(fixture.assignment!.id)).resolves.toEqual({
      outcomes: 1,
      responses: 1,
      nonResponses: 0,
      terminalAuditEvents: 1,
    });
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
    await expect(terminalPersistence(fixture.assignment!.id)).resolves.toEqual({
      outcomes: 1,
      responses: 1,
      nonResponses: 0,
      terminalAuditEvents: 1,
    });
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
    await expect(terminalPersistence(omittedFixture.assignment!.id)).resolves.toEqual({
      outcomes: 1,
      responses: 0,
      nonResponses: 1,
      terminalAuditEvents: 1,
    });

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
    await expect(terminalPersistence(expiredFixture.assignment!.id)).resolves.toEqual({
      outcomes: 1,
      responses: 0,
      nonResponses: 1,
      terminalAuditEvents: 1,
    });
  });

  it("rechaza actor, tipo, clave o fingerprint incompatibles sobre un outcome completo", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    const responseService = new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork());
    const omitService = new OmitCheckInAssignmentService(new PrismaCheckInUnitOfWork());
    const key = `response-conflicts:${randomUUID()}`;
    const original = responseInput(fixture, fixture.assignment!.id, key);
    await responseService.execute(original);

    const otherPatient = await createUser("checkin-other-patient", "patient");
    await expect(
      responseService.execute({ ...original, actor: patientActor(otherPatient.id) }),
    ).rejects.toBeInstanceOf(CheckInDeniedError);
    await expect(
      omitService.execute({
        actor: patientActor(fixture.patientUser.id),
        assignmentId: fixture.assignment!.id,
        idempotencyKey: key,
        correlationId: randomUUID(),
        now: new Date("2026-07-02T08:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(CheckInConflictError);
    await expect(
      responseService.execute({
        ...original,
        idempotencyKey: `response-different-key:${randomUUID()}`,
      }),
    ).rejects.toBeInstanceOf(CheckInConflictError);
    await expect(
      responseService.execute({
        ...original,
        answers: answer(fixture.protocol.questions[0]!.id, 2),
      }),
    ).rejects.toBeInstanceOf(CheckInConflictError);
    await expect(terminalPersistence(fixture.assignment!.id)).resolves.toEqual({
      outcomes: 1,
      responses: 1,
      nonResponses: 0,
      terminalAuditEvents: 1,
    });
  });

  it("no trata como replay un vencimiento idéntico solicitado por otro actor asignado", async () => {
    const fixture = await setupFixture({ withAssignment: true });
    const service = new RecordExpiredCheckInNonResponseService(new PrismaCheckInUnitOfWork());
    const input = {
      actor: nurseActor(fixture.nurse.id),
      assignmentId: fixture.assignment!.id,
      idempotencyKey: `expire-actor-conflict:${randomUUID()}`,
      correlationId: randomUUID(),
      now: new Date("2026-07-02T11:00:00.000Z"),
    };
    await service.execute(input);

    await expect(
      service.execute({ ...input, actor: clinicianActor(fixture.clinician.id) }),
    ).rejects.toBeInstanceOf(CheckInConflictError);
    await expect(terminalPersistence(fixture.assignment!.id)).resolves.toEqual({
      outcomes: 1,
      responses: 0,
      nonResponses: 1,
      terminalAuditEvents: 1,
    });
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
      const persistence = await terminalPersistence(fixture.assignment!.id);
      expect(persistence.outcomes).toBe(1);
      expect(persistence.responses + persistence.nonResponses).toBe(1);
      expect(persistence.terminalAuditEvents).toBe(1);
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
      const persistence = await terminalPersistence(fixture.assignment!.id);
      expect(persistence.outcomes).toBe(1);
      expect(persistence.responses + persistence.nonResponses).toBe(1);
      expect(persistence.terminalAuditEvents).toBe(1);
    }
  });

  it("carreras omit vs expire producen un único outcome terminal", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fixture = await setupFixture({ withAssignment: true });
      const omitService = new OmitCheckInAssignmentService(new PrismaCheckInUnitOfWork());
      const expireService = new RecordExpiredCheckInNonResponseService(
        new PrismaCheckInUnitOfWork(),
      );
      const settled = await Promise.allSettled([
        omitService.execute({
          actor: patientActor(fixture.patientUser.id),
          assignmentId: fixture.assignment!.id,
          idempotencyKey: `omit-expire-race:${randomUUID()}`,
          correlationId: randomUUID(),
          now: new Date("2026-07-02T08:00:00.000Z"),
        }),
        expireService.execute({
          actor: nurseActor(fixture.nurse.id),
          assignmentId: fixture.assignment!.id,
          idempotencyKey: `expire-omit-race:${randomUUID()}`,
          correlationId: randomUUID(),
          now: new Date("2026-07-02T11:00:00.000Z"),
        }),
      ]);
      expect(settled.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      const rejected = settled.find(({ status }) => status === "rejected");
      expect(rejected).toMatchObject({ reason: expect.any(CheckInConflictError) });
      await expect(terminalPersistence(fixture.assignment!.id)).resolves.toEqual({
        outcomes: 1,
        responses: 0,
        nonResponses: 1,
        terminalAuditEvents: 1,
      });
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
