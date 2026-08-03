import { createHash, randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  CheckInDeniedError,
  CheckInParticipationRevokedError,
  CreateCheckInProtocolVersionService,
  GenerateCheckInAssignmentsService,
  OmitCheckInAssignmentService,
  RecordExpiredCheckInNonResponseService,
  SubmitCheckInResponseService,
} from "@/application/check-in/manage-check-ins";
import type {
  CheckInAssignmentRecord,
  CheckInOutcomeRecord,
  CheckInProtocolRecord,
  CheckInTransaction,
  CheckInUnitOfWork,
} from "@/application/ports/check-in-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";

function principal(userId: string, roles: AuthenticatedPrincipal["roles"]): AuthenticatedPrincipal {
  return { userId, roles, sessionId: randomUUID() };
}

function requestFingerprint(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const protocol: CheckInProtocolRecord = {
  id: "protocol-v1",
  protocolKey: "synthetic-check-in-template",
  versionNumber: 1,
  title: "PLANTILLA SINTÉTICA / NO APROBADA",
  state: "SYNTHETIC_DEMO",
  basedOnVersionId: null,
  isSyntheticFixture: true,
  schedule: {
    intervalDays: 3,
    firstDayOffset: 1,
    localTime: "09:30",
    timeZone: "Europe/Madrid",
    responseWindowMinutes: 180,
  },
  questions: [
    {
      id: "question-v1",
      questionKey: "mood",
      position: 1,
      type: "SCALE",
      prompt: "Ánimo sintético",
      required: true,
      scaleMinimum: 0,
      scaleMaximum: 4,
    },
  ],
};

const episode = {
  id: "episode-1",
  status: "ACTIVE" as const,
  dischargeDate: new Date("2026-07-01T00:00:00.000Z"),
  programLengthDays: 10,
  responsibleNurseId: "nurse-1",
  responsibleClinicianId: "clinician-1",
  patientPortalUserId: "patient-1",
  patientIsSynthetic: true,
  checkInProtocolVersionId: "protocol-v1",
};

function legalContext(revoked = false) {
  const recordedAt = new Date("2026-06-01T00:00:00.000Z");
  return {
    records: [
      {
        id: "digital-record-1",
        recordType: "DIGITAL_PARTICIPATION" as const,
        subjectUserId: "patient-1",
        state: "ACTIVE" as const,
        scope: "check-ins",
        policyVersionId: "policy-1",
        actorUserId: "clinician-1",
        recordedAt,
        expiresAt: null,
        origin: "PROFESSIONAL_ENTRY" as const,
        evidenceType: "RECORDED_INTERACTION" as const,
        evidenceRef: "SYNTHETIC-ONLY",
      },
    ],
    policies: [
      {
        id: "policy-1",
        policyKey: "synthetic-digital-check-ins",
        version: "demo-v1",
        recordType: "DIGITAL_PARTICIPATION" as const,
        state: "APPROVED" as const,
        scope: "check-ins",
        actorUserId: "admin-1",
        recordedAt,
        origin: "INSTITUTIONAL_CONFIGURATION" as const,
        evidenceType: "INSTITUTIONAL_DECISION_REFERENCE" as const,
        evidenceRef: "SYNTHETIC-ONLY",
      },
    ],
    revocations: revoked
      ? [
          {
            id: "revoke-1",
            state: "REVOKED" as const,
            targetType: "DIGITAL_PARTICIPATION" as const,
            targetRecordId: "digital-record-1",
            subjectUserId: "patient-1",
            scope: "check-ins",
            policyVersionId: "policy-1",
            actorUserId: "patient-1",
            recordedAt: new Date("2026-06-02T00:00:00.000Z"),
            origin: "DEMO_UI" as const,
            evidenceType: "RECORDED_INTERACTION" as const,
            evidenceRef: "SYNTHETIC-ONLY",
          },
        ]
      : [],
  };
}

function outcome(type: CheckInOutcomeRecord["type"] = "RESPONDED"): CheckInOutcomeRecord {
  return {
    id: "outcome-1",
    assignmentId: "assignment-1",
    protocolVersionId: protocol.id,
    type,
    recordedById: type === "EXPIRED" ? "nurse-1" : "patient-1",
    idempotencyKey: "response:idempotent-test",
    requestFingerprint: "a".repeat(64),
    responseId: type === "RESPONDED" ? "response-1" : null,
    nonResponseEventId: type === "RESPONDED" ? null : "non-response-1",
  };
}

function makeTransaction(overrides: Partial<CheckInTransaction> = {}): CheckInTransaction {
  return {
    isActiveUserWithRole: async () => true,
    getProtocol: async (id) => (id === protocol.id ? protocol : null),
    getLatestProtocolVersion: async () => protocol,
    createProtocolVersion: async (input) => ({
      ...protocol,
      id: "protocol-v2",
      versionNumber: input.versionNumber,
      title: input.title,
      basedOnVersionId: input.basedOnVersionId,
      isSyntheticFixture: input.isSyntheticFixture,
      questions: input.questions.map((question, index) => ({
        ...question,
        id: `question-v2-${index}`,
      })),
      schedule: input.schedule,
    }),
    getEpisode: async () => episode,
    getDigitalParticipationContext: async () => legalContext(),
    findAssignmentBatchByIdempotency: async () => null,
    claimAssignmentBatch: async (input) => ({
      created: true,
      batch: {
        id: "batch-1",
        episodeId: input.episodeId,
        protocolVersionId: input.protocolVersionId,
        createdById: input.createdById,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        assignmentIds: [],
      },
    }),
    createAssignments: async (input) =>
      input.slots.map((_, index) => ({ id: `assignment-${index + 1}` })),
    getAssignment: async () => null,
    findOutcomeByIdempotency: async () => null,
    claimOutcome: async (input) => ({
      created: true,
      outcome: {
        id: "outcome-1",
        assignmentId: input.assignmentId,
        protocolVersionId: input.protocolVersionId,
        type: input.type,
        recordedById: input.recordedById,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        responseId: null,
        nonResponseEventId: null,
      },
    }),
    createResponse: async () => ({ id: "response-1" }),
    createNonResponse: async () => ({ id: "non-response-1" }),
    appendAuditEvent: async () => ({ id: "audit-1" }),
    ...overrides,
  };
}

function unitOfWork(transaction: CheckInTransaction): CheckInUnitOfWork {
  return { run: (operation) => operation(transaction) };
}

function assignment(): CheckInAssignmentRecord {
  return {
    id: "assignment-1",
    episodeId: episode.id,
    checkInProtocolVersionId: protocol.id,
    scheduledFor: new Date("2026-07-02T07:30:00.000Z"),
    windowStartsAt: new Date("2026-07-02T07:30:00.000Z"),
    windowEndsAt: new Date("2026-07-02T10:30:00.000Z"),
    response: null,
    nonResponseEvent: null,
    outcome: null,
    episode,
    protocol,
  };
}

describe("check-in application services", () => {
  it("aplica RBAC: solo admin versiona y solo paciente responde", async () => {
    await expect(
      new CreateCheckInProtocolVersionService(unitOfWork(makeTransaction())).execute({
        actor: principal("nurse-1", ["nurse"]),
        protocolKey: protocol.protocolKey,
        title: protocol.title,
        state: "SYNTHETIC_DEMO",
        basedOnVersionId: protocol.id,
        questions: protocol.questions,
        schedule: protocol.schedule,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CheckInDeniedError);

    await expect(
      new SubmitCheckInResponseService(unitOfWork(makeTransaction())).execute({
        actor: principal("nurse-1", ["nurse"]),
        assignmentId: "assignment-1",
        answers: [],
        idempotencyKey: "response:rbac-test",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CheckInDeniedError);
  });

  it("fuerza toda versión creada por el servicio demo a fixture sintético", async () => {
    const createProtocolVersion = vi.fn(makeTransaction().createProtocolVersion);
    await new CreateCheckInProtocolVersionService(
      unitOfWork(makeTransaction({ createProtocolVersion })),
    ).execute({
      actor: principal("admin-1", ["admin"]),
      protocolKey: protocol.protocolKey,
      title: protocol.title,
      state: "DRAFT",
      basedOnVersionId: protocol.id,
      questions: protocol.questions,
      schedule: protocol.schedule,
      correlationId: randomUUID(),
    });
    expect(createProtocolVersion).toHaveBeenCalledWith(
      expect.objectContaining({ isSyntheticFixture: true }),
    );
  });

  it("crea una nueva versión sin modificar preguntas ni cadencia históricas", async () => {
    const oldSchedule = structuredClone(protocol.schedule);
    const oldQuestions = structuredClone(protocol.questions);
    const result = await new CreateCheckInProtocolVersionService(
      unitOfWork(makeTransaction()),
    ).execute({
      actor: principal("admin-1", ["admin"]),
      protocolKey: protocol.protocolKey,
      title: protocol.title,
      state: "SYNTHETIC_DEMO",
      basedOnVersionId: protocol.id,
      questions: protocol.questions,
      schedule: { ...protocol.schedule, intervalDays: 5 },
      correlationId: randomUUID(),
    });
    expect(result).toEqual({ protocolVersionId: "protocol-v2", versionNumber: 2 });
    expect(protocol.schedule).toEqual(oldSchedule);
    expect(protocol.questions).toEqual(oldQuestions);
  });

  it("genera slots desde la cadencia versionada y conserva su versión en la asignación", async () => {
    const createAssignments = vi.fn(
      async (input: Parameters<CheckInTransaction["createAssignments"]>[0]) =>
        input.slots.map((_, index) => ({ id: `assignment-${index + 1}` })),
    );
    const result = await new GenerateCheckInAssignmentsService(
      unitOfWork(makeTransaction({ createAssignments })),
    ).execute({
      actor: principal("nurse-1", ["nurse"]),
      episodeId: episode.id,
      protocolVersionId: protocol.id,
      idempotencyKey: "batch:cadence-test",
      correlationId: randomUUID(),
      now: new Date("2026-06-30T00:00:00.000Z"),
    });
    expect(result.assignmentIds).toHaveLength(3);
    expect(createAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: "batch-1",
        protocolVersionId: "protocol-v1",
        slots: expect.arrayContaining([
          expect.objectContaining({ scheduledFor: new Date("2026-07-02T07:30:00.000Z") }),
        ]),
      }),
    );
  });

  it("revocación digital impide nuevas asignaciones y conserva las existentes", async () => {
    const createAssignments = vi.fn();
    const transaction = makeTransaction({
      getDigitalParticipationContext: async () => legalContext(true),
      createAssignments,
    });
    await expect(
      new GenerateCheckInAssignmentsService(unitOfWork(transaction)).execute({
        actor: principal("nurse-1", ["nurse"]),
        episodeId: episode.id,
        protocolVersionId: protocol.id,
        idempotencyKey: "batch:revoked-test",
        correlationId: randomUUID(),
        now: new Date("2026-07-01T00:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(CheckInParticipationRevokedError);
    expect(createAssignments).not.toHaveBeenCalled();
  });

  it("reintento de respuesta es idempotente y no crea otra respuesta clínica", async () => {
    let savedOutcome: CheckInOutcomeRecord | null = null;
    const createResponse = vi.fn(async () => {
      savedOutcome = { ...outcome(), requestFingerprint: savedOutcome!.requestFingerprint };
      return { id: "response-1" };
    });
    const transaction = makeTransaction({
      getAssignment: async () => assignment(),
      findOutcomeByIdempotency: async () => savedOutcome,
      claimOutcome: async (input) => {
        savedOutcome = {
          id: "outcome-1",
          assignmentId: input.assignmentId,
          protocolVersionId: input.protocolVersionId,
          type: input.type,
          recordedById: input.recordedById,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: input.requestFingerprint,
          responseId: null,
          nonResponseEventId: null,
        };
        return { outcome: savedOutcome, created: true };
      },
      createResponse,
    });
    const service = new SubmitCheckInResponseService(unitOfWork(transaction));
    const input = {
      actor: principal("patient-1", ["patient"]),
      assignmentId: "assignment-1",
      answers: [{ questionDefinitionId: "question-v1", scaleValue: 3 }] as const,
      idempotencyKey: "response:idempotent-test",
      correlationId: randomUUID(),
      now: new Date("2026-07-02T08:00:00.000Z"),
    };
    await expect(service.execute(input)).resolves.toEqual({
      responseId: "response-1",
      idempotent: false,
    });
    await expect(service.execute(input)).resolves.toEqual({
      responseId: "response-1",
      idempotent: true,
    });
    expect(createResponse).toHaveBeenCalledTimes(1);
  });

  it("reconoce una respuesta idéntica completada entre el lookup y la carga", async () => {
    const idempotencyKey = "response:concurrent-replay";
    const answers = [{ questionDefinitionId: "question-v1", scaleValue: 3 }] as const;
    const persistedOutcome: CheckInOutcomeRecord = {
      ...outcome("RESPONDED"),
      idempotencyKey,
      requestFingerprint: requestFingerprint({
        operation: "submit-check-in",
        assignmentId: "assignment-1",
        answers,
      }),
    };
    const claimOutcome = vi.fn();
    const createResponse = vi.fn();
    const appendAuditEvent = vi.fn();
    const service = new SubmitCheckInResponseService(
      unitOfWork(
        makeTransaction({
          findOutcomeByIdempotency: async () => null,
          getAssignment: async () => ({ ...assignment(), outcome: persistedOutcome }),
          claimOutcome,
          createResponse,
          appendAuditEvent,
        }),
      ),
    );

    await expect(
      service.execute({
        actor: principal("patient-1", ["patient"]),
        assignmentId: "assignment-1",
        answers,
        idempotencyKey,
        correlationId: randomUUID(),
        now: new Date("2026-07-02T08:00:00.000Z"),
      }),
    ).resolves.toEqual({ responseId: "response-1", idempotent: true });
    expect(claimOutcome).not.toHaveBeenCalled();
    expect(createResponse).not.toHaveBeenCalled();
    expect(appendAuditEvent).not.toHaveBeenCalled();
  });

  it("reconoce una omisión idéntica completada entre el lookup y la carga", async () => {
    const idempotencyKey = "omission:concurrent-replay";
    const persistedOutcome: CheckInOutcomeRecord = {
      ...outcome("OMITTED"),
      idempotencyKey,
      requestFingerprint: requestFingerprint({
        operation: "omit-check-in",
        assignmentId: "assignment-1",
      }),
    };
    const claimOutcome = vi.fn();
    const createNonResponse = vi.fn();
    const appendAuditEvent = vi.fn();
    const service = new OmitCheckInAssignmentService(
      unitOfWork(
        makeTransaction({
          findOutcomeByIdempotency: async () => null,
          getAssignment: async () => ({ ...assignment(), outcome: persistedOutcome }),
          claimOutcome,
          createNonResponse,
          appendAuditEvent,
        }),
      ),
    );

    await expect(
      service.execute({
        actor: principal("patient-1", ["patient"]),
        assignmentId: "assignment-1",
        idempotencyKey,
        correlationId: randomUUID(),
        now: new Date("2026-07-02T08:00:00.000Z"),
      }),
    ).resolves.toEqual({ nonResponseEventId: "non-response-1", idempotent: true });
    expect(claimOutcome).not.toHaveBeenCalled();
    expect(createNonResponse).not.toHaveBeenCalled();
    expect(appendAuditEvent).not.toHaveBeenCalled();
  });

  it("reconoce un vencimiento idéntico completado entre el lookup y la carga", async () => {
    const idempotencyKey = "expiration:concurrent-replay";
    const persistedOutcome: CheckInOutcomeRecord = {
      ...outcome("EXPIRED"),
      idempotencyKey,
      requestFingerprint: requestFingerprint({
        operation: "expire-check-in",
        assignmentId: "assignment-1",
      }),
    };
    const claimOutcome = vi.fn();
    const createNonResponse = vi.fn();
    const appendAuditEvent = vi.fn();
    const service = new RecordExpiredCheckInNonResponseService(
      unitOfWork(
        makeTransaction({
          findOutcomeByIdempotency: async () => null,
          getAssignment: async () => ({ ...assignment(), outcome: persistedOutcome }),
          claimOutcome,
          createNonResponse,
          appendAuditEvent,
        }),
      ),
    );

    await expect(
      service.execute({
        actor: principal("nurse-1", ["nurse"]),
        assignmentId: "assignment-1",
        idempotencyKey,
        correlationId: randomUUID(),
        now: new Date("2026-07-02T11:00:00.000Z"),
      }),
    ).resolves.toEqual({ nonResponseEventId: "non-response-1", idempotent: true });
    expect(claimOutcome).not.toHaveBeenCalled();
    expect(createNonResponse).not.toHaveBeenCalled();
    expect(appendAuditEvent).not.toHaveBeenCalled();
  });

  it("valida pertenencia antes de devolver un outcome encontrado por clave", async () => {
    const idempotencyKey = "response:cross-patient-replay";
    const answers = [{ questionDefinitionId: "question-v1", scaleValue: 3 }] as const;
    const persistedOutcome: CheckInOutcomeRecord = {
      ...outcome("RESPONDED"),
      recordedById: "patient-2",
      idempotencyKey,
      requestFingerprint: requestFingerprint({
        operation: "submit-check-in",
        assignmentId: "assignment-1",
        answers,
      }),
    };
    const service = new SubmitCheckInResponseService(
      unitOfWork(
        makeTransaction({
          findOutcomeByIdempotency: async () => persistedOutcome,
          getAssignment: async () => assignment(),
        }),
      ),
    );

    await expect(
      service.execute({
        actor: principal("patient-2", ["patient"]),
        assignmentId: "assignment-1",
        answers,
        idempotencyKey,
        correlationId: randomUUID(),
        now: new Date("2026-07-02T08:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(CheckInDeniedError);
  });

  it("registra una ventana vencida como NonResponseEvent, no como respuesta", async () => {
    const createNonResponse = vi.fn(async () => ({ id: "non-response-expired-1" }));
    const createResponse = vi.fn();
    const service = new RecordExpiredCheckInNonResponseService(
      unitOfWork(
        makeTransaction({
          getAssignment: async () => assignment(),
          createNonResponse,
          createResponse,
        }),
      ),
    );
    await expect(
      service.execute({
        actor: principal("nurse-1", ["nurse"]),
        assignmentId: "assignment-1",
        idempotencyKey: "non-response:expired-test",
        correlationId: randomUUID(),
        now: new Date("2026-07-02T11:00:00.000Z"),
      }),
    ).resolves.toEqual({
      nonResponseEventId: "non-response-expired-1",
      idempotent: false,
    });
    expect(createNonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ outcomeType: "EXPIRED", reason: "WINDOW_EXPIRED" }),
    );
    expect(createResponse).not.toHaveBeenCalled();
  });
});
