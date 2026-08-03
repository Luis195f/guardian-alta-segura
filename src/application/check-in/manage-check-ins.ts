import { createHash } from "node:crypto";

import type {
  CheckInAssignmentBatchRecord,
  CheckInOutcomeRecord,
  CheckInUnitOfWork,
} from "@/application/ports/check-in-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import {
  buildScheduleSlots,
  type CheckInAnswerInput,
  type CheckInProtocolState,
  CheckInValidationError,
  type QuestionDefinitionInput,
  type ScheduleConfigurationInput,
  validateAnswers,
  validateProtocolDefinition,
} from "@/domain/check-in/check-in";
import { LegalAuthorizationService } from "@/domain/legal/legal-authorization";

export class CheckInDeniedError extends Error {}
export class CheckInInvalidError extends Error {}
export class CheckInNotFoundError extends Error {}
export class CheckInConflictError extends Error {}
export class CheckInParticipationRevokedError extends Error {}
export class CheckInWindowError extends Error {}

function fingerprint(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validateIdempotencyKey(value: string): string {
  const key = value.trim();
  if (!/^[A-Za-z0-9._:-]{8,112}$/.test(key)) {
    throw new CheckInInvalidError("Invalid idempotency key");
  }
  return key;
}

function requireOnlyRole(actor: AuthenticatedPrincipal, allowed: readonly Role[]): Role {
  const role = actor.roles.find((candidate) => allowed.includes(candidate));
  if (!role) throw new CheckInDeniedError("Check-in access denied");
  return role;
}

async function assertActiveRole(
  transaction: Parameters<Parameters<CheckInUnitOfWork["run"]>[0]>[0],
  actor: AuthenticatedPrincipal,
  role: Role,
) {
  if (!(await transaction.isActiveUserWithRole(actor.userId, role))) {
    throw new CheckInDeniedError("Actor role is no longer active");
  }
}

async function assertDigitalParticipation(
  transaction: Parameters<Parameters<CheckInUnitOfWork["run"]>[0]>[0],
  subjectUserId: string,
  now: Date,
): Promise<void> {
  const participation = new LegalAuthorizationService().authorizeFutureCheckIn({
    subjectUserId,
    featureEnabled: true,
    ...(await transaction.getDigitalParticipationContext(subjectUserId)),
    now,
  });
  if (!participation.allowed) {
    throw new CheckInParticipationRevokedError(participation.reason);
  }
}

function assignmentIdsForIdempotentBatch(
  batch: CheckInAssignmentBatchRecord,
  expected: {
    readonly actorUserId: string;
    readonly episodeId: string;
    readonly protocolVersionId: string;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
  },
): readonly string[] {
  if (
    batch.createdById !== expected.actorUserId ||
    batch.episodeId !== expected.episodeId ||
    batch.protocolVersionId !== expected.protocolVersionId ||
    batch.idempotencyKey !== expected.idempotencyKey ||
    batch.requestFingerprint !== expected.requestFingerprint
  ) {
    throw new CheckInConflictError("Idempotency key or episode already has another batch");
  }
  return batch.assignmentIds;
}

function resultIdForIdempotentOutcome(
  outcome: CheckInOutcomeRecord,
  expected: {
    readonly actorUserId: string;
    readonly assignmentId: string;
    readonly type: "RESPONDED" | "OMITTED" | "EXPIRED";
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
  },
): string {
  if (
    outcome.recordedById !== expected.actorUserId ||
    outcome.assignmentId !== expected.assignmentId ||
    outcome.type !== expected.type ||
    outcome.idempotencyKey !== expected.idempotencyKey ||
    outcome.requestFingerprint !== expected.requestFingerprint
  ) {
    throw new CheckInConflictError("Idempotency key or assignment already has another outcome");
  }
  const resultId = expected.type === "RESPONDED" ? outcome.responseId : outcome.nonResponseEventId;
  if (!resultId) throw new CheckInConflictError("Terminal outcome is incomplete");
  return resultId;
}

export class CreateCheckInProtocolVersionService {
  constructor(private readonly unitOfWork: CheckInUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly protocolKey: string;
    readonly title: string;
    readonly state: CheckInProtocolState;
    readonly basedOnVersionId?: string | null;
    readonly questions: readonly QuestionDefinitionInput[];
    readonly schedule: ScheduleConfigurationInput;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly protocolVersionId: string; readonly versionNumber: number }> {
    const role = requireOnlyRole(input.actor, ["admin"]);
    if (!["DRAFT", "SYNTHETIC_DEMO", "RETIRED"].includes(input.state)) {
      throw new CheckInInvalidError("Invalid protocol state");
    }
    try {
      validateProtocolDefinition(input);
    } catch (error) {
      if (error instanceof CheckInValidationError) throw new CheckInInvalidError(error.message);
      throw error;
    }
    const createdAt = input.now ?? new Date();
    return this.unitOfWork.run(async (transaction) => {
      await assertActiveRole(transaction, input.actor, role);
      const latest = await transaction.getLatestProtocolVersion(input.protocolKey);
      const base = input.basedOnVersionId
        ? await transaction.getProtocol(input.basedOnVersionId)
        : null;
      if (input.basedOnVersionId && (!base || base.protocolKey !== input.protocolKey)) {
        throw new CheckInInvalidError("Base version belongs to another protocol");
      }
      if (latest && base?.id !== latest.id) {
        throw new CheckInConflictError("A newer protocol version already exists");
      }
      const versionNumber = (latest?.versionNumber ?? 0) + 1;
      const protocol = await transaction.createProtocolVersion({
        protocolKey: input.protocolKey,
        versionNumber,
        title: input.title.trim(),
        state: input.state,
        basedOnVersionId: base?.id ?? null,
        isSyntheticFixture: true,
        createdById: input.actor.userId,
        questions: input.questions,
        schedule: input.schedule,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "CHECK_IN_PROTOCOL_VERSION_CREATED",
        resourceType: "CheckInProtocolVersion",
        resourceId: protocol.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt,
      });
      return { protocolVersionId: protocol.id, versionNumber };
    });
  }
}

export class GenerateCheckInAssignmentsService {
  constructor(private readonly unitOfWork: CheckInUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly protocolVersionId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly assignmentIds: readonly string[]; readonly idempotent: boolean }> {
    const role = requireOnlyRole(input.actor, ["nurse", "clinician"]);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const now = input.now ?? new Date();
    const requestFingerprint = fingerprint({
      operation: "generate-check-in-assignments",
      episodeId: input.episodeId,
      protocolVersionId: input.protocolVersionId,
    });
    const expectedBatch = {
      actorUserId: input.actor.userId,
      episodeId: input.episodeId,
      protocolVersionId: input.protocolVersionId,
      idempotencyKey,
      requestFingerprint,
    };

    return this.unitOfWork.run(async (transaction) => {
      const existing = await transaction.findAssignmentBatchByIdempotency(
        input.actor.userId,
        idempotencyKey,
      );
      if (existing) {
        return {
          assignmentIds: assignmentIdsForIdempotentBatch(existing, expectedBatch),
          idempotent: true,
        };
      }
      await assertActiveRole(transaction, input.actor, role);
      const [episode, protocol] = await Promise.all([
        transaction.getEpisode(input.episodeId),
        transaction.getProtocol(input.protocolVersionId),
      ]);
      if (!episode || !protocol) throw new CheckInNotFoundError("Episode or protocol not found");
      if (
        episode.responsibleNurseId !== input.actor.userId &&
        episode.responsibleClinicianId !== input.actor.userId
      ) {
        throw new CheckInDeniedError("Actor is not assigned to episode");
      }
      if (!episode.patientIsSynthetic || !protocol.isSyntheticFixture) {
        throw new CheckInDeniedError("Demo check-ins require synthetic data");
      }
      if (!episode.patientPortalUserId) {
        throw new CheckInInvalidError("Episode has no patient portal identity");
      }
      if (episode.checkInProtocolVersionId !== protocol.id) {
        throw new CheckInConflictError("Episode already references another protocol version");
      }
      await assertDigitalParticipation(transaction, episode.patientPortalUserId, now);
      const slots = buildScheduleSlots({
        episodeStartDate: episode.dischargeDate.toISOString().slice(0, 10),
        episodeLengthDays: episode.programLengthDays,
        schedule: protocol.schedule,
      });
      const claimed = await transaction.claimAssignmentBatch({
        episodeId: episode.id,
        protocolVersionId: protocol.id,
        createdById: input.actor.userId,
        idempotencyKey,
        requestFingerprint,
        createdAt: now,
      });
      if (!claimed.created) {
        return {
          assignmentIds: assignmentIdsForIdempotentBatch(claimed.batch, expectedBatch),
          idempotent: true,
        };
      }
      const created = await transaction.createAssignments({
        batchId: claimed.batch.id,
        episodeId: episode.id,
        protocolVersionId: protocol.id,
        createdById: input.actor.userId,
        slots,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "CHECK_IN_ASSIGNMENTS_CREATED",
        resourceType: "DischargeEpisode",
        resourceId: episode.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: now,
      });
      return { assignmentIds: created.map(({ id }) => id), idempotent: false };
    });
  }
}

export class SubmitCheckInResponseService {
  constructor(private readonly unitOfWork: CheckInUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly assignmentId: string;
    readonly answers: readonly CheckInAnswerInput[];
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly responseId: string; readonly idempotent: boolean }> {
    const role = requireOnlyRole(input.actor, ["patient"]);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const submittedAt = input.now ?? new Date();
    const requestFingerprint = fingerprint({
      operation: "submit-check-in",
      assignmentId: input.assignmentId,
      answers: input.answers,
    });
    const expectedOutcome = {
      actorUserId: input.actor.userId,
      assignmentId: input.assignmentId,
      type: "RESPONDED" as const,
      idempotencyKey,
      requestFingerprint,
    };

    return this.unitOfWork.run(async (transaction) => {
      const existing = await transaction.findOutcomeByIdempotency(
        input.actor.userId,
        idempotencyKey,
      );
      await assertActiveRole(transaction, input.actor, role);
      const assignment = await transaction.getAssignment(input.assignmentId);
      if (!assignment) throw new CheckInNotFoundError("Assignment not found");
      if (assignment.episode.patientPortalUserId !== input.actor.userId) {
        throw new CheckInDeniedError("Patient cannot answer another episode");
      }
      const replayedOutcome = existing ?? assignment.outcome;
      if (replayedOutcome) {
        return {
          responseId: resultIdForIdempotentOutcome(replayedOutcome, expectedOutcome),
          idempotent: true,
        };
      }
      await assertDigitalParticipation(transaction, input.actor.userId, submittedAt);
      if (submittedAt < assignment.windowStartsAt || submittedAt >= assignment.windowEndsAt) {
        throw new CheckInWindowError("Assignment is outside its configured response window");
      }
      try {
        validateAnswers(assignment.protocol.questions, input.answers);
      } catch (error) {
        if (error instanceof CheckInValidationError) throw new CheckInInvalidError(error.message);
        throw error;
      }
      const claimed = await transaction.claimOutcome({
        assignmentId: assignment.id,
        protocolVersionId: assignment.checkInProtocolVersionId,
        type: "RESPONDED",
        recordedById: input.actor.userId,
        idempotencyKey,
        requestFingerprint,
        recordedAt: submittedAt,
      });
      if (!claimed.created) {
        return {
          responseId: resultIdForIdempotentOutcome(claimed.outcome, expectedOutcome),
          idempotent: true,
        };
      }
      const response = await transaction.createResponse({
        outcomeId: claimed.outcome.id,
        assignmentId: assignment.id,
        protocolVersionId: assignment.checkInProtocolVersionId,
        submittedById: input.actor.userId,
        submittedAt,
        answers: input.answers,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "CHECK_IN_RESPONSE_RECORDED",
        resourceType: "CheckInResponse",
        resourceId: response.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: submittedAt,
      });
      return { responseId: response.id, idempotent: false };
    });
  }
}

export class OmitCheckInAssignmentService {
  constructor(private readonly unitOfWork: CheckInUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly assignmentId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly nonResponseEventId: string; readonly idempotent: boolean }> {
    const role = requireOnlyRole(input.actor, ["patient"]);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const recordedAt = input.now ?? new Date();
    const requestFingerprint = fingerprint({
      operation: "omit-check-in",
      assignmentId: input.assignmentId,
    });
    const expectedOutcome = {
      actorUserId: input.actor.userId,
      assignmentId: input.assignmentId,
      type: "OMITTED" as const,
      idempotencyKey,
      requestFingerprint,
    };

    return this.unitOfWork.run(async (transaction) => {
      const existing = await transaction.findOutcomeByIdempotency(
        input.actor.userId,
        idempotencyKey,
      );
      await assertActiveRole(transaction, input.actor, role);
      const assignment = await transaction.getAssignment(input.assignmentId);
      if (!assignment) throw new CheckInNotFoundError("Assignment not found");
      if (assignment.episode.patientPortalUserId !== input.actor.userId) {
        throw new CheckInDeniedError("Patient cannot omit another episode");
      }
      const replayedOutcome = existing ?? assignment.outcome;
      if (replayedOutcome) {
        return {
          nonResponseEventId: resultIdForIdempotentOutcome(replayedOutcome, expectedOutcome),
          idempotent: true,
        };
      }
      await assertDigitalParticipation(transaction, input.actor.userId, recordedAt);
      if (recordedAt < assignment.windowStartsAt || recordedAt >= assignment.windowEndsAt) {
        throw new CheckInWindowError("Assignment is outside its configured response window");
      }
      const claimed = await transaction.claimOutcome({
        assignmentId: assignment.id,
        protocolVersionId: assignment.checkInProtocolVersionId,
        type: "OMITTED",
        recordedById: input.actor.userId,
        idempotencyKey,
        requestFingerprint,
        recordedAt,
      });
      if (!claimed.created) {
        return {
          nonResponseEventId: resultIdForIdempotentOutcome(claimed.outcome, expectedOutcome),
          idempotent: true,
        };
      }
      const event = await transaction.createNonResponse({
        outcomeId: claimed.outcome.id,
        assignmentId: assignment.id,
        protocolVersionId: assignment.checkInProtocolVersionId,
        outcomeType: "OMITTED",
        recordedById: input.actor.userId,
        reason: "PATIENT_OMITTED",
        recordedAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "CHECK_IN_NON_RESPONSE_RECORDED",
        resourceType: "NonResponseEvent",
        resourceId: event.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: recordedAt,
      });
      return { nonResponseEventId: event.id, idempotent: false };
    });
  }
}

export class RecordExpiredCheckInNonResponseService {
  constructor(private readonly unitOfWork: CheckInUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly assignmentId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly nonResponseEventId: string; readonly idempotent: boolean }> {
    const role = requireOnlyRole(input.actor, ["nurse", "clinician"]);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const recordedAt = input.now ?? new Date();
    const requestFingerprint = fingerprint({
      operation: "expire-check-in",
      assignmentId: input.assignmentId,
    });
    const expectedOutcome = {
      actorUserId: input.actor.userId,
      assignmentId: input.assignmentId,
      type: "EXPIRED" as const,
      idempotencyKey,
      requestFingerprint,
    };

    return this.unitOfWork.run(async (transaction) => {
      const existing = await transaction.findOutcomeByIdempotency(
        input.actor.userId,
        idempotencyKey,
      );
      await assertActiveRole(transaction, input.actor, role);
      const assignment = await transaction.getAssignment(input.assignmentId);
      if (!assignment) throw new CheckInNotFoundError("Assignment not found");
      if (
        assignment.episode.responsibleNurseId !== input.actor.userId &&
        assignment.episode.responsibleClinicianId !== input.actor.userId
      ) {
        throw new CheckInDeniedError("Actor is not assigned to episode");
      }
      const replayedOutcome = existing ?? assignment.outcome;
      if (replayedOutcome) {
        return {
          nonResponseEventId: resultIdForIdempotentOutcome(replayedOutcome, expectedOutcome),
          idempotent: true,
        };
      }
      if (recordedAt < assignment.windowEndsAt) {
        throw new CheckInWindowError("Configured response window has not expired");
      }
      const claimed = await transaction.claimOutcome({
        assignmentId: assignment.id,
        protocolVersionId: assignment.checkInProtocolVersionId,
        type: "EXPIRED",
        recordedById: input.actor.userId,
        idempotencyKey,
        requestFingerprint,
        recordedAt,
      });
      if (!claimed.created) {
        return {
          nonResponseEventId: resultIdForIdempotentOutcome(claimed.outcome, expectedOutcome),
          idempotent: true,
        };
      }
      const event = await transaction.createNonResponse({
        outcomeId: claimed.outcome.id,
        assignmentId: assignment.id,
        protocolVersionId: assignment.checkInProtocolVersionId,
        outcomeType: "EXPIRED",
        recordedById: input.actor.userId,
        reason: "WINDOW_EXPIRED",
        recordedAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "CHECK_IN_NON_RESPONSE_RECORDED",
        resourceType: "NonResponseEvent",
        resourceId: event.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: recordedAt,
      });
      return { nonResponseEventId: event.id, idempotent: false };
    });
  }
}
