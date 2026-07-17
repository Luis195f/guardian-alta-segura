import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { CheckInConflictError } from "@/application/check-in/manage-check-ins";
import type {
  CheckInAssignmentBatchRecord,
  CheckInAssignmentRecord,
  CheckInEpisodeRecord,
  CheckInOutcomeRecord,
  CheckInProtocolRecord,
  CheckInTransaction,
  CheckInUnitOfWork,
} from "@/application/ports/check-in-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import type {
  CheckInAnswerInput,
  CheckInProtocolState,
  QuestionDefinitionInput,
  ScheduleConfigurationInput,
  ScheduledCheckInSlot,
} from "@/domain/check-in/check-in";
import { getAssignmentStatus } from "@/domain/check-in/check-in";
import { LegalAuthorizationService } from "@/domain/legal/legal-authorization";
import { prisma } from "@/infrastructure/persistence/prisma";

const protocolInclude = {
  questions: { orderBy: { position: "asc" as const } },
  schedule: true,
} satisfies Prisma.CheckInProtocolVersionInclude;

type ProtocolWithDefinition = Prisma.CheckInProtocolVersionGetPayload<{
  include: typeof protocolInclude;
}>;

function toQuestionDefinition(
  question: ProtocolWithDefinition["questions"][number],
): QuestionDefinitionInput & { readonly id: string } {
  const base = {
    id: question.id,
    questionKey: question.questionKey,
    position: question.position,
    prompt: question.prompt,
    required: question.required,
  };
  if (question.type === "SCALE") {
    return {
      ...base,
      type: "SCALE",
      scaleMinimum: question.scaleMinimum ?? 0,
      scaleMaximum: question.scaleMaximum ?? 0,
      scaleMinimumLabel: question.scaleMinimumLabel,
      scaleMaximumLabel: question.scaleMaximumLabel,
    };
  }
  if (question.type === "YES_NO") return { ...base, type: "YES_NO" };
  if (question.type === "SINGLE_CHOICE") {
    return {
      ...base,
      type: "SINGLE_CHOICE",
      options: Array.isArray(question.options)
        ? question.options.filter((option): option is string => typeof option === "string")
        : [],
    };
  }
  return {
    ...base,
    type: "RESTRICTED_SHORT_TEXT",
    maximumTextLength: question.maximumTextLength ?? 0,
  };
}

function toProtocolRecord(protocol: ProtocolWithDefinition): CheckInProtocolRecord {
  if (!protocol.schedule) throw new Error("CHECK_IN_PROTOCOL_SCHEDULE_MISSING");
  return {
    id: protocol.id,
    protocolKey: protocol.protocolKey,
    versionNumber: protocol.versionNumber,
    title: protocol.title,
    state: protocol.state as CheckInProtocolState,
    basedOnVersionId: protocol.basedOnVersionId,
    isSyntheticFixture: protocol.isSyntheticFixture,
    questions: protocol.questions.map(toQuestionDefinition),
    schedule: {
      intervalDays: protocol.schedule.intervalDays,
      firstDayOffset: protocol.schedule.firstDayOffset,
      localTime: protocol.schedule.localTime,
      timeZone: protocol.schedule.timeZone,
      responseWindowMinutes: protocol.schedule.responseWindowMinutes,
    },
  };
}

const episodeSelect = {
  id: true,
  status: true,
  dischargeDate: true,
  programLengthDays: true,
  responsibleNurseId: true,
  responsibleClinicianId: true,
  checkInProtocolVersionId: true,
  patient: { select: { portalUserId: true, isSynthetic: true } },
} satisfies Prisma.DischargeEpisodeSelect;

type EpisodeForCheckIn = Prisma.DischargeEpisodeGetPayload<{ select: typeof episodeSelect }>;

function toEpisodeRecord(episode: EpisodeForCheckIn): CheckInEpisodeRecord {
  return {
    id: episode.id,
    status: episode.status,
    dischargeDate: episode.dischargeDate,
    programLengthDays: episode.programLengthDays,
    responsibleNurseId: episode.responsibleNurseId,
    responsibleClinicianId: episode.responsibleClinicianId,
    patientPortalUserId: episode.patient.portalUserId,
    patientIsSynthetic: episode.patient.isSynthetic,
    checkInProtocolVersionId: episode.checkInProtocolVersionId,
  };
}

const outcomeInclude = {
  response: { select: { id: true } },
  nonResponseEvent: { select: { id: true } },
} satisfies Prisma.CheckInOutcomeInclude;

type OutcomeWithResult = Prisma.CheckInOutcomeGetPayload<{ include: typeof outcomeInclude }>;

function toOutcomeRecord(outcome: OutcomeWithResult): CheckInOutcomeRecord {
  return {
    id: outcome.id,
    assignmentId: outcome.assignmentId,
    protocolVersionId: outcome.checkInProtocolVersionId,
    type: outcome.type,
    recordedById: outcome.recordedById,
    idempotencyKey: outcome.idempotencyKey,
    requestFingerprint: outcome.requestFingerprint,
    responseId: outcome.response?.id ?? null,
    nonResponseEventId: outcome.nonResponseEvent?.id ?? null,
  };
}

const assignmentInclude = {
  response: { select: { id: true } },
  nonResponseEvent: { select: { reason: true } },
  outcome: { include: outcomeInclude },
  episode: {
    select: {
      ...episodeSelect,
      checkInProtocolVersion: { include: protocolInclude },
    },
  },
} satisfies Prisma.CheckInAssignmentInclude;

type AssignmentWithContext = Prisma.CheckInAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

function toAssignmentRecord(assignment: AssignmentWithContext): CheckInAssignmentRecord {
  return {
    id: assignment.id,
    episodeId: assignment.episodeId,
    checkInProtocolVersionId: assignment.checkInProtocolVersionId,
    scheduledFor: assignment.scheduledFor,
    windowStartsAt: assignment.windowStartsAt,
    windowEndsAt: assignment.windowEndsAt,
    response: assignment.response,
    nonResponseEvent: assignment.nonResponseEvent,
    outcome: assignment.outcome ? toOutcomeRecord(assignment.outcome) : null,
    episode: toEpisodeRecord(assignment.episode),
    protocol: toProtocolRecord(assignment.episode.checkInProtocolVersion),
  };
}

function questionCreateData(question: QuestionDefinitionInput) {
  const base = {
    questionKey: question.questionKey,
    position: question.position,
    type: question.type,
    prompt: question.prompt.trim(),
    required: question.required,
  };
  if (question.type === "SCALE") {
    return {
      ...base,
      scaleMinimum: question.scaleMinimum,
      scaleMaximum: question.scaleMaximum,
      scaleMinimumLabel: question.scaleMinimumLabel ?? null,
      scaleMaximumLabel: question.scaleMaximumLabel ?? null,
    };
  }
  if (question.type === "SINGLE_CHOICE") {
    return { ...base, options: [...question.options] };
  }
  if (question.type === "RESTRICTED_SHORT_TEXT") {
    return { ...base, maximumTextLength: question.maximumTextLength };
  }
  return base;
}

function answerCreateData(answer: CheckInAnswerInput, protocolVersionId: string) {
  const base = {
    questionDefinitionId: answer.questionDefinitionId,
    checkInProtocolVersionId: protocolVersionId,
  };
  if ("scaleValue" in answer) return { ...base, scaleValue: answer.scaleValue };
  if ("yesNoValue" in answer) return { ...base, yesNoValue: answer.yesNoValue };
  if ("selectedOption" in answer) return { ...base, selectedOption: answer.selectedOption };
  return { ...base, shortTextValue: answer.shortTextValue.trim() };
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const batchInclude = {
  assignments: { select: { id: true }, orderBy: { sequence: "asc" as const } },
} satisfies Prisma.CheckInAssignmentBatchInclude;

type BatchWithAssignments = Prisma.CheckInAssignmentBatchGetPayload<{
  include: typeof batchInclude;
}>;

function toBatchRecord(batch: BatchWithAssignments): CheckInAssignmentBatchRecord {
  return {
    id: batch.id,
    episodeId: batch.episodeId,
    protocolVersionId: batch.checkInProtocolVersionId,
    createdById: batch.createdById,
    idempotencyKey: batch.idempotencyKey,
    requestFingerprint: batch.requestFingerprint,
    assignmentIds: batch.assignments.map(({ id }) => id),
  };
}

class PrismaCheckInTransaction implements CheckInTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async isActiveUserWithRole(userId: string, role: Role): Promise<boolean> {
    return (
      (await this.transaction.user.count({
        where: {
          id: userId,
          isActive: true,
          roleAssignments: { some: { role, revokedAt: null } },
        },
      })) === 1
    );
  }

  async getProtocol(protocolVersionId: string) {
    const protocol = await this.transaction.checkInProtocolVersion.findUnique({
      where: { id: protocolVersionId },
      include: protocolInclude,
    });
    return protocol?.schedule ? toProtocolRecord(protocol) : null;
  }

  async getLatestProtocolVersion(protocolKey: string) {
    const protocol = await this.transaction.checkInProtocolVersion.findFirst({
      where: { protocolKey },
      orderBy: { versionNumber: "desc" },
      include: protocolInclude,
    });
    return protocol?.schedule ? toProtocolRecord(protocol) : null;
  }

  async createProtocolVersion(input: {
    readonly protocolKey: string;
    readonly versionNumber: number;
    readonly title: string;
    readonly state: CheckInProtocolState;
    readonly basedOnVersionId: string | null;
    readonly isSyntheticFixture: boolean;
    readonly createdById: string;
    readonly questions: readonly QuestionDefinitionInput[];
    readonly schedule: ScheduleConfigurationInput;
  }) {
    try {
      const protocol = await this.transaction.checkInProtocolVersion.create({
        data: {
          protocolKey: input.protocolKey,
          versionNumber: input.versionNumber,
          title: input.title,
          state: input.state,
          basedOnVersionId: input.basedOnVersionId,
          isSyntheticFixture: true,
          createdById: input.createdById,
          questions: { create: input.questions.map(questionCreateData) },
          schedule: { create: input.schedule },
        },
        include: protocolInclude,
      });
      return toProtocolRecord(protocol);
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new CheckInConflictError("Concurrent protocol version already exists");
      }
      throw error;
    }
  }

  async getEpisode(episodeId: string) {
    const episode = await this.transaction.dischargeEpisode.findUnique({
      where: { id: episodeId },
      select: episodeSelect,
    });
    return episode ? toEpisodeRecord(episode) : null;
  }

  async getDigitalParticipationContext(subjectUserId: string) {
    const [records, policies, revocations] = await Promise.all([
      this.transaction.digitalParticipationRecord.findMany({ where: { subjectUserId } }),
      this.transaction.policyVersion.findMany(),
      this.transaction.revocationEvent.findMany({ where: { subjectUserId } }),
    ]);
    return {
      records: records.map((record) => ({
        ...record,
        recordType: "DIGITAL_PARTICIPATION" as const,
      })),
      policies,
      revocations,
    };
  }

  async findAssignmentBatchByIdempotency(createdById: string, idempotencyKey: string) {
    const batch = await this.transaction.checkInAssignmentBatch.findUnique({
      where: { createdById_idempotencyKey: { createdById, idempotencyKey } },
      include: batchInclude,
    });
    return batch ? toBatchRecord(batch) : null;
  }

  async claimAssignmentBatch(input: {
    readonly episodeId: string;
    readonly protocolVersionId: string;
    readonly createdById: string;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly createdAt: Date;
  }) {
    const id = randomUUID();
    const result = await this.transaction.checkInAssignmentBatch.createMany({
      data: {
        id,
        episodeId: input.episodeId,
        checkInProtocolVersionId: input.protocolVersionId,
        createdById: input.createdById,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        createdAt: input.createdAt,
      },
      skipDuplicates: true,
    });
    const batch = await this.transaction.checkInAssignmentBatch.findFirstOrThrow({
      where: {
        OR: [
          {
            createdById: input.createdById,
            idempotencyKey: input.idempotencyKey,
          },
          { episodeId: input.episodeId },
        ],
      },
      include: batchInclude,
    });
    return { batch: toBatchRecord(batch), created: result.count === 1 };
  }

  async createAssignments(input: {
    readonly batchId: string;
    readonly episodeId: string;
    readonly protocolVersionId: string;
    readonly createdById: string;
    readonly slots: readonly ScheduledCheckInSlot[];
  }) {
    const created: { id: string }[] = [];
    try {
      for (const slot of input.slots) {
        created.push(
          await this.transaction.checkInAssignment.create({
            data: {
              batchId: input.batchId,
              episodeId: input.episodeId,
              checkInProtocolVersionId: input.protocolVersionId,
              createdById: input.createdById,
              ...slot,
            },
            select: { id: true },
          }),
        );
      }
      return created;
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new CheckInConflictError("Concurrent assignment batch already exists");
      }
      throw error;
    }
  }

  async getAssignment(assignmentId: string) {
    const assignment = await this.transaction.checkInAssignment.findUnique({
      where: { id: assignmentId },
      include: assignmentInclude,
    });
    return assignment ? toAssignmentRecord(assignment) : null;
  }

  async findOutcomeByIdempotency(recordedById: string, idempotencyKey: string) {
    const outcome = await this.transaction.checkInOutcome.findUnique({
      where: { recordedById_idempotencyKey: { recordedById, idempotencyKey } },
      include: outcomeInclude,
    });
    return outcome ? toOutcomeRecord(outcome) : null;
  }

  async claimOutcome(input: {
    readonly assignmentId: string;
    readonly protocolVersionId: string;
    readonly type: "RESPONDED" | "OMITTED" | "EXPIRED";
    readonly recordedById: string;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly recordedAt: Date;
  }) {
    const id = randomUUID();
    const result = await this.transaction.checkInOutcome.createMany({
      data: {
        id,
        assignmentId: input.assignmentId,
        checkInProtocolVersionId: input.protocolVersionId,
        type: input.type,
        recordedById: input.recordedById,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        recordedAt: input.recordedAt,
      },
      skipDuplicates: true,
    });
    const outcome = await this.transaction.checkInOutcome.findFirstOrThrow({
      where: {
        OR: [
          {
            recordedById: input.recordedById,
            idempotencyKey: input.idempotencyKey,
          },
          { assignmentId: input.assignmentId },
        ],
      },
      include: outcomeInclude,
    });
    return { outcome: toOutcomeRecord(outcome), created: result.count === 1 };
  }

  async createResponse(input: {
    readonly outcomeId: string;
    readonly assignmentId: string;
    readonly protocolVersionId: string;
    readonly submittedById: string;
    readonly submittedAt: Date;
    readonly answers: readonly CheckInAnswerInput[];
  }) {
    try {
      const response = await this.transaction.checkInResponse.create({
        data: {
          outcomeId: input.outcomeId,
          assignmentId: input.assignmentId,
          checkInProtocolVersionId: input.protocolVersionId,
          outcomeType: "RESPONDED",
          submittedById: input.submittedById,
          submittedAt: input.submittedAt,
        },
        select: { id: true },
      });
      await this.transaction.checkInAnswer.createMany({
        data: input.answers.map((answer) => ({
          checkInResponseId: response.id,
          ...answerCreateData(answer, input.protocolVersionId),
        })),
      });
      return response;
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new CheckInConflictError("Concurrent terminal outcome already exists");
      }
      throw error;
    }
  }

  async createNonResponse(input: {
    readonly outcomeId: string;
    readonly assignmentId: string;
    readonly protocolVersionId: string;
    readonly outcomeType: "OMITTED" | "EXPIRED";
    readonly recordedById: string;
    readonly reason: "WINDOW_EXPIRED" | "PATIENT_OMITTED";
    readonly recordedAt: Date;
  }) {
    try {
      return await this.transaction.nonResponseEvent.create({
        data: {
          outcomeId: input.outcomeId,
          assignmentId: input.assignmentId,
          checkInProtocolVersionId: input.protocolVersionId,
          outcomeType: input.outcomeType,
          recordedById: input.recordedById,
          reason: input.reason,
          recordedAt: input.recordedAt,
        },
        select: { id: true },
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new CheckInConflictError("Concurrent terminal outcome already exists");
      }
      throw error;
    }
  }

  appendAuditEvent(input: NewAuditEvent) {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }
}

export class PrismaCheckInUnitOfWork implements CheckInUnitOfWork {
  run<T>(operation: (transaction: CheckInTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction((transaction) =>
      operation(new PrismaCheckInTransaction(transaction)),
    );
  }
}

export async function listCheckInProtocols() {
  const protocols = await prisma.checkInProtocolVersion.findMany({
    where: { schedule: { isNot: null } },
    include: protocolInclude,
    orderBy: [{ protocolKey: "asc" }, { versionNumber: "desc" }],
  });
  return protocols.map(toProtocolRecord);
}

type Availability = "OPEN" | "UPCOMING" | "BLOCKED" | "CLOSED";

function availabilityFor(input: {
  readonly now: Date;
  readonly windowStartsAt: Date;
  readonly windowEndsAt: Date;
  readonly terminal: boolean;
  readonly participationAllowed: boolean;
}): Availability {
  if (input.terminal || input.now >= input.windowEndsAt) return "CLOSED";
  if (input.now < input.windowStartsAt) return "UPCOMING";
  if (!input.participationAllowed) return "BLOCKED";
  return "OPEN";
}

async function patientParticipationAllowed(subjectUserId: string, now: Date): Promise<boolean> {
  const [records, policies, revocations] = await Promise.all([
    prisma.digitalParticipationRecord.findMany({ where: { subjectUserId } }),
    prisma.policyVersion.findMany(),
    prisma.revocationEvent.findMany({ where: { subjectUserId } }),
  ]);
  return new LegalAuthorizationService().authorizeFutureCheckIn({
    subjectUserId,
    featureEnabled: true,
    records: records.map((record) => ({
      ...record,
      recordType: "DIGITAL_PARTICIPATION" as const,
    })),
    policies,
    revocations,
    now,
  }).allowed;
}

export async function listVisibleCheckInAssignments(
  principal: AuthenticatedPrincipal,
  now: Date = new Date(),
) {
  const isPatient = principal.roles.includes("patient");
  const isProfessional = principal.roles.includes("nurse") || principal.roles.includes("clinician");
  if (!isPatient && !isProfessional) return null;
  const participationAllowed = isPatient
    ? await patientParticipationAllowed(principal.userId, now)
    : true;

  const assignments = await prisma.checkInAssignment.findMany({
    where: isPatient
      ? { episode: { patient: { portalUserId: principal.userId } } }
      : {
          episode: {
            OR: [
              { responsibleNurseId: principal.userId },
              { responsibleClinicianId: principal.userId },
            ],
          },
        },
    include: {
      episode: {
        select: {
          id: true,
          patient: { select: { externalPseudonymousId: true } },
          checkInProtocolVersion: { include: protocolInclude },
        },
      },
      response: {
        include: {
          answers: {
            select: {
              questionDefinitionId: true,
              scaleValue: true,
              yesNoValue: true,
              selectedOption: true,
              shortTextValue: true,
            },
          },
        },
      },
      outcome: { select: { type: true } },
      nonResponseEvent: { select: { reason: true, recordedAt: true } },
    },
  });

  const views = assignments.map((assignment) => {
    const availability = availabilityFor({
      now,
      windowStartsAt: assignment.windowStartsAt,
      windowEndsAt: assignment.windowEndsAt,
      terminal: assignment.outcome !== null,
      participationAllowed,
    });
    return {
      id: assignment.id,
      episodeId: assignment.episodeId,
      patientPseudonymousId: assignment.episode.patient.externalPseudonymousId,
      scheduledFor: assignment.scheduledFor,
      windowStartsAt: assignment.windowStartsAt,
      windowEndsAt: assignment.windowEndsAt,
      status: getAssignmentStatus({
        now,
        windowEndsAt: assignment.windowEndsAt,
        hasResponse: assignment.outcome?.type === "RESPONDED",
        nonResponseReason: assignment.nonResponseEvent?.reason ?? null,
      }),
      availability,
      availabilityReason:
        availability === "BLOCKED"
          ? "DIGITAL_PARTICIPATION_NOT_ACTIVE"
          : availability === "UPCOMING"
            ? "WINDOW_NOT_OPEN"
            : availability === "CLOSED"
              ? "TERMINAL_OR_WINDOW_CLOSED"
              : null,
      isActionable: isPatient && availability === "OPEN",
      serverNow: now,
      protocol: toProtocolRecord(assignment.episode.checkInProtocolVersion),
      response: assignment.response,
      nonResponseEvent: assignment.nonResponseEvent,
    };
  });

  const rank: Record<Availability, number> = {
    OPEN: 0,
    UPCOMING: 1,
    BLOCKED: 2,
    CLOSED: 3,
  };
  return views.sort((left, right) => {
    const rankDifference = rank[left.availability] - rank[right.availability];
    if (rankDifference !== 0) return rankDifference;
    if (left.availability === "OPEN" || left.availability === "UPCOMING") {
      return left.scheduledFor.getTime() - right.scheduledFor.getTime();
    }
    return right.scheduledFor.getTime() - left.scheduledFor.getTime();
  });
}
