import type {
  NursingTaskRecord,
  NursingWorkQueueTransaction,
  NursingWorkQueueUnitOfWork,
  WorkQueueEpisodeRecord,
} from "@/application/ports/nursing-workqueue-unit-of-work";
import type { AuditAction } from "@/domain/audit/audit-event";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import {
  DefaultHumanAuthorizationPolicy,
  type HumanAuthorizationDecision,
  type HumanAuthorizationPolicy,
} from "@/domain/authorization/human-authorization";
import {
  CONTACT_ATTEMPT_OUTCOMES,
  type ContactAttemptOutcome,
  normalizeBriefNote,
  normalizeResolutionReason,
  normalizeTaskSummary,
  NursingTaskValidationError,
  taskRequestFingerprint,
  validateExpectedRevision,
  validateIdempotencyKey,
} from "@/domain/workqueue/nursing-task";

export { NursingTaskValidationError };
export class NursingTaskDeniedError extends Error {}
export class NursingTaskNotFoundError extends Error {}
export class NursingTaskConflictError extends Error {}

type ProfessionalRole = "nurse" | "clinician";

async function currentProfessionalRole(
  transaction: NursingWorkQueueTransaction,
  actor: AuthenticatedPrincipal,
): Promise<ProfessionalRole | null> {
  for (const role of ["nurse", "clinician"] as const) {
    if (
      actor.roles.includes(role) &&
      (await transaction.lockActiveUserWithRole(actor.userId, role))
    ) {
      return role;
    }
  }
  return null;
}

async function authorizeEpisode(
  transaction: NursingWorkQueueTransaction,
  actor: AuthenticatedPrincipal,
  episodeId: string,
  targetUserId: string | null,
): Promise<{ readonly episode: WorkQueueEpisodeRecord; readonly role: ProfessionalRole }> {
  const episode = await transaction.lockEpisode(episodeId);
  if (!episode) throw new NursingTaskNotFoundError();
  if (!episode.isSynthetic) throw new NursingTaskDeniedError();
  if (
    episode.responsibleNurseId !== actor.userId &&
    episode.responsibleClinicianId !== actor.userId
  ) {
    throw new NursingTaskDeniedError();
  }
  await transaction.lockParticipantUsers(
    targetUserId === null ? [actor.userId] : [actor.userId, targetUserId],
  );
  const role = await currentProfessionalRole(transaction, actor);
  if (role) return { episode, role };
  throw new NursingTaskDeniedError();
}

function enforceHumanAuthorization(decision: HumanAuthorizationDecision): void {
  if (decision.status === "AUTHORIZED") return;
  if (decision.blockers.includes("ALERT_NOT_FOUND")) {
    throw new NursingTaskNotFoundError();
  }
  if (
    decision.blockers.some((blocker) =>
      ["ACTOR_NOT_AUTHENTICATED", "ACTOR_NOT_AUTHORIZED", "ACTOR_NOT_RESPONSIBLE"].includes(
        blocker,
      ),
    )
  ) {
    throw new NursingTaskDeniedError();
  }
  throw new NursingTaskConflictError();
}

function taskResult(task: NursingTaskRecord, idempotent: boolean) {
  return {
    taskId: task.id,
    state: task.currentState,
    revision: task.revision,
    assignedToId: task.assignedToId,
    resolvedById: task.resolvedById,
    resolvedAt: task.resolvedAt,
    idempotent,
  };
}

export class CreateNursingTaskService {
  constructor(
    private readonly unitOfWork: NursingWorkQueueUnitOfWork,
    private readonly now: () => Date = () => new Date(),
    private readonly humanAuthorizationPolicy: HumanAuthorizationPolicy = new DefaultHumanAuthorizationPolicy(),
  ) {}

  execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly alertId: string | null;
    readonly summary: unknown;
    readonly assignedToId: string | null;
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }) {
    const summary = normalizeTaskSummary(input.summary);
    validateIdempotencyKey(input.idempotencyKey);
    const requestFingerprint = taskRequestFingerprint({
      episodeId: input.episodeId,
      alertId: input.alertId,
      summary,
      assignedToId: input.assignedToId,
    });

    return this.unitOfWork.run(async (transaction) => {
      const { episode, role } = await authorizeEpisode(
        transaction,
        input.actor,
        input.episodeId,
        input.assignedToId,
      );
      const evaluatedAt = this.now();
      if (input.alertId) {
        const alert = await transaction.getAlert(input.alertId);
        const decision = this.humanAuthorizationPolicy.evaluate({
          action: "CREATE_TASK_FROM_REVIEWED_ALERT",
          actor: input.actor,
          activeRole: role,
          episode,
          alert,
          review: alert?.review ?? null,
          evaluatedAt,
        });
        enforceHumanAuthorization(decision);
      }

      const existing = await transaction.findTaskByCreationIdempotency(
        input.actor.userId,
        input.idempotencyKey,
      );
      if (existing) {
        if (existing.creationFingerprint !== requestFingerprint) {
          throw new NursingTaskConflictError();
        }
        return taskResult(existing, true);
      }
      if (
        input.assignedToId &&
        !(await transaction.lockAuthorizedAssignee(input.assignedToId, input.episodeId))
      ) {
        throw new NursingTaskDeniedError();
      }

      const createdAt = evaluatedAt;
      const claimed = await transaction.claimTask({
        episodeId: input.episodeId,
        alertId: input.alertId,
        summary,
        assignedToId: input.assignedToId,
        createdById: input.actor.userId,
        actorRole: role,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint,
        createdAt,
      });
      if (!claimed.created) {
        if (claimed.task.creationFingerprint !== requestFingerprint) {
          throw new NursingTaskConflictError();
        }
        return taskResult(claimed.task, true);
      }
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "TASK_CREATED",
        resourceType: "Task",
        resourceId: claimed.task.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt,
      });
      if (input.assignedToId) {
        await transaction.appendAuditEvent({
          actorUserId: input.actor.userId,
          actorRole: role,
          action: "TASK_ASSIGNED",
          resourceType: "Task",
          resourceId: claimed.task.id,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt,
        });
      }
      return taskResult(claimed.task, false);
    });
  }
}

export type NursingTaskAction =
  | { readonly kind: "assign"; readonly assignedToId: string }
  | { readonly kind: "contact-attempt"; readonly outcome: ContactAttemptOutcome }
  | { readonly kind: "note"; readonly note: unknown }
  | { readonly kind: "resolve"; readonly reason: unknown };

function auditActionFor(type: string): AuditAction {
  if (type === "assigned") return "TASK_ASSIGNED";
  if (type === "reassigned") return "TASK_REASSIGNED";
  if (type === "contact-attempt") return "TASK_CONTACT_ATTEMPT_RECORDED";
  if (type === "note-recorded") return "TASK_NOTE_RECORDED";
  return "TASK_RESOLVED";
}

export class UpdateNursingTaskService {
  constructor(
    private readonly unitOfWork: NursingWorkQueueUnitOfWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly taskId: string;
    readonly expectedRevision: unknown;
    readonly action: NursingTaskAction;
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }) {
    validateExpectedRevision(input.expectedRevision);
    validateIdempotencyKey(input.idempotencyKey);

    return this.unitOfWork.run(async (transaction) => {
      const task = await transaction.getTask(input.taskId);
      if (!task) throw new NursingTaskNotFoundError();
      const { role } = await authorizeEpisode(
        transaction,
        input.actor,
        task.episodeId,
        input.action.kind === "assign" ? input.action.assignedToId : null,
      );

      let type: "assigned" | "reassigned" | "contact-attempt" | "note-recorded" | "resolved";
      let toAssignedToId = task.assignedToId;
      let note: string | null = null;
      let contactOutcome: ContactAttemptOutcome | null = null;
      let resolutionReason: string | null = null;

      if (input.action.kind === "assign") {
        type = task.assignedToId ? "reassigned" : "assigned";
        toAssignedToId = input.action.assignedToId;
      } else if (input.action.kind === "contact-attempt") {
        if (!CONTACT_ATTEMPT_OUTCOMES.includes(input.action.outcome)) {
          throw new NursingTaskValidationError("Invalid contact outcome");
        }
        type = "contact-attempt";
        contactOutcome = input.action.outcome;
      } else if (input.action.kind === "note") {
        type = "note-recorded";
        note = normalizeBriefNote(input.action.note);
      } else {
        type = "resolved";
        resolutionReason = normalizeResolutionReason(input.action.reason);
      }

      const existing = await transaction.findEventByIdempotency(
        input.actor.userId,
        input.idempotencyKey,
      );
      if (existing) {
        const replayType =
          input.action.kind === "assign" &&
          (existing.type === "assigned" || existing.type === "reassigned")
            ? existing.type
            : type;
        const requestFingerprint = taskRequestFingerprint({
          taskId: input.taskId,
          expectedRevision: input.expectedRevision,
          type: replayType,
          toAssignedToId,
          note,
          contactOutcome,
          resolutionReason,
        });
        if (existing.taskId !== task.id || existing.requestFingerprint !== requestFingerprint) {
          throw new NursingTaskConflictError();
        }
        const current = await transaction.getTask(task.id);
        if (!current) throw new NursingTaskNotFoundError();
        return taskResult(current, true);
      }
      if (input.action.kind === "assign") {
        if (
          !(await transaction.lockAuthorizedAssignee(input.action.assignedToId, task.episodeId))
        ) {
          throw new NursingTaskDeniedError();
        }
        if (input.action.assignedToId === task.assignedToId) {
          throw new NursingTaskConflictError();
        }
      }
      if (task.currentState === "resolved" || task.revision !== input.expectedRevision) {
        throw new NursingTaskConflictError();
      }

      const requestFingerprint = taskRequestFingerprint({
        taskId: input.taskId,
        expectedRevision: input.expectedRevision,
        type,
        toAssignedToId,
        note,
        contactOutcome,
        resolutionReason,
      });
      const occurredAt = this.now();
      const applied = await transaction.applyTaskEvent({
        task,
        type,
        actorUserId: input.actor.userId,
        actorRole: role,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint,
        occurredAt,
        toAssignedToId,
        note,
        contactOutcome,
        resolutionReason,
      });
      if (!applied.created) {
        if (
          applied.event.actorUserId !== input.actor.userId ||
          applied.event.idempotencyKey !== input.idempotencyKey ||
          applied.event.requestFingerprint !== requestFingerprint
        ) {
          throw new NursingTaskConflictError();
        }
        return taskResult(applied.task, true);
      }
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role as Role,
        action: auditActionFor(type),
        resourceType: "Task",
        resourceId: task.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      return taskResult(applied.task, false);
    });
  }
}
