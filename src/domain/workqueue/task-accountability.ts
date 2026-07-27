import type { Role } from "@/domain/auth/role";
import type { TaskEventType, TaskState } from "@/domain/workqueue/nursing-task";

export type TaskAccountabilityOrigin = "DIRECT_HUMAN_INITIATION" | "REVIEWED_ALERT_DERIVED";

export type TaskAssignmentStatus = "UNASSIGNED" | "ASSIGNED" | "RESOLVED";

export type CurrentAssigneeEligibility =
  "NOT_APPLICABLE" | "CURRENTLY_AUTHORIZED" | "NOT_CURRENTLY_AUTHORIZED";

export type TaskAccountabilityBlocker =
  | "TASK_EVENT_STREAM_EMPTY"
  | "TASK_EVENT_TASK_MISMATCH"
  | "TASK_EVENT_REVISION_GAP"
  | "CREATION_EVENT_MISMATCH"
  | "TASK_EVENT_STATE_MISMATCH"
  | "ASSIGNMENT_CHAIN_MISMATCH"
  | "CURRENT_ASSIGNEE_EVENT_MISMATCH"
  | "TASK_REVISION_EVENT_MISMATCH"
  | "CURRENT_STATE_EVENT_MISMATCH"
  | "RESOLUTION_EVENT_MISSING"
  | "RESOLUTION_EVENT_MISMATCH"
  | "CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED";

export interface TaskAccountabilityTask {
  readonly id: string;
  readonly episodeId: string;
  readonly alertId: string | null;
  readonly currentState: TaskState;
  readonly assignedToId: string | null;
  readonly createdById: string;
  readonly revision: number;
  readonly resolvedById: string | null;
  readonly resolvedAt: Date | null;
  readonly createdAt: Date;
}

export interface TaskAccountabilityEvent {
  readonly id: string;
  readonly taskId: string;
  readonly type: TaskEventType;
  readonly fromState: TaskState | null;
  readonly toState: TaskState;
  readonly fromAssignedToId: string | null;
  readonly toAssignedToId: string | null;
  readonly actorUserId: string;
  readonly actorRole: Role;
  readonly resultingRevision: number;
  readonly occurredAt: Date;
}

export interface TaskAssignmentChange {
  readonly kind: "INITIAL_ASSIGNMENT" | "ASSIGNMENT" | "REASSIGNMENT";
  readonly fromAssignedToId: string | null;
  readonly toAssignedToId: string;
  readonly actorUserId: string;
  readonly actorRole: Role;
  readonly occurredAt: Date;
  readonly resultingRevision: number;
}

export interface TaskAccountabilityProjection {
  readonly taskId: string;
  readonly episodeId: string;
  readonly taskRevision: number;
  readonly taskState: TaskState;
  readonly origin: {
    readonly kind: TaskAccountabilityOrigin;
    readonly alertId: string | null;
  };
  readonly createdById: string;
  readonly createdAt: Date;
  readonly currentAssigneeId: string | null;
  readonly assignmentStatus: TaskAssignmentStatus;
  readonly assignmentHistory: readonly TaskAssignmentChange[];
  readonly lifecycle: readonly TaskAccountabilityEvent[];
  readonly resolvedById: string | null;
  readonly resolvedAt: Date | null;
  readonly currentAssigneeEligibility: CurrentAssigneeEligibility;
  readonly consistencyStatus: "VALID" | "INCONSISTENT";
  readonly blockers: readonly TaskAccountabilityBlocker[];
}

const STRUCTURAL_BLOCKERS = new Set<TaskAccountabilityBlocker>([
  "TASK_EVENT_STREAM_EMPTY",
  "TASK_EVENT_TASK_MISMATCH",
  "TASK_EVENT_REVISION_GAP",
  "CREATION_EVENT_MISMATCH",
  "TASK_EVENT_STATE_MISMATCH",
  "ASSIGNMENT_CHAIN_MISMATCH",
  "CURRENT_ASSIGNEE_EVENT_MISMATCH",
  "TASK_REVISION_EVENT_MISMATCH",
  "CURRENT_STATE_EVENT_MISMATCH",
  "RESOLUTION_EVENT_MISSING",
  "RESOLUTION_EVENT_MISMATCH",
]);

function sameInstant(left: Date | null, right: Date | null): boolean {
  return left?.getTime() === right?.getTime();
}

export function projectTaskAccountability(input: {
  readonly task: TaskAccountabilityTask;
  readonly events: readonly TaskAccountabilityEvent[];
  readonly currentAssigneeCurrentlyAuthorized: boolean;
}): TaskAccountabilityProjection {
  const { task } = input;
  const blockers = new Set<TaskAccountabilityBlocker>();
  const assignmentHistory: TaskAssignmentChange[] = [];
  const orderedEvents = [...input.events].sort(
    (left, right) =>
      left.resultingRevision - right.resultingRevision ||
      left.occurredAt.getTime() - right.occurredAt.getTime() ||
      left.id.localeCompare(right.id),
  );
  const lifecycle: TaskAccountabilityEvent[] = orderedEvents.map((event) => ({
    id: event.id,
    taskId: event.taskId,
    type: event.type,
    fromState: event.fromState,
    toState: event.toState,
    fromAssignedToId: event.fromAssignedToId,
    toAssignedToId: event.toAssignedToId,
    actorUserId: event.actorUserId,
    actorRole: event.actorRole,
    resultingRevision: event.resultingRevision,
    occurredAt: event.occurredAt,
  }));

  if (lifecycle.length === 0) blockers.add("TASK_EVENT_STREAM_EMPTY");

  let reconstructedState: TaskState | null = null;
  let reconstructedAssigneeId: string | null = null;
  let resolvedEvent: TaskAccountabilityEvent | null = null;

  for (const [index, event] of lifecycle.entries()) {
    const expectedRevision = index + 1;
    if (event.taskId !== task.id) blockers.add("TASK_EVENT_TASK_MISMATCH");
    if (event.resultingRevision !== expectedRevision) {
      blockers.add("TASK_EVENT_REVISION_GAP");
    }

    if (index === 0) {
      if (
        event.type !== "created" ||
        event.resultingRevision !== 1 ||
        event.actorUserId !== task.createdById ||
        event.fromState !== null ||
        event.toState !== "open" ||
        event.fromAssignedToId !== null ||
        !sameInstant(task.createdAt, event.occurredAt)
      ) {
        blockers.add("CREATION_EVENT_MISMATCH");
      }
      reconstructedState = event.toState;
      reconstructedAssigneeId = event.toAssignedToId;
      if (event.toAssignedToId !== null) {
        assignmentHistory.push({
          kind: "INITIAL_ASSIGNMENT",
          fromAssignedToId: null,
          toAssignedToId: event.toAssignedToId,
          actorUserId: event.actorUserId,
          actorRole: event.actorRole,
          occurredAt: event.occurredAt,
          resultingRevision: event.resultingRevision,
        });
      }
      continue;
    }

    if (event.fromState !== reconstructedState) blockers.add("TASK_EVENT_STATE_MISMATCH");

    if (event.type === "assigned") {
      if (
        reconstructedState !== "open" ||
        reconstructedAssigneeId !== null ||
        event.fromAssignedToId !== null ||
        event.toAssignedToId === null ||
        event.toState !== "open"
      ) {
        blockers.add("ASSIGNMENT_CHAIN_MISMATCH");
      } else {
        assignmentHistory.push({
          kind: "ASSIGNMENT",
          fromAssignedToId: null,
          toAssignedToId: event.toAssignedToId,
          actorUserId: event.actorUserId,
          actorRole: event.actorRole,
          occurredAt: event.occurredAt,
          resultingRevision: event.resultingRevision,
        });
      }
      reconstructedAssigneeId = event.toAssignedToId;
    } else if (event.type === "reassigned") {
      if (
        reconstructedState !== "open" ||
        reconstructedAssigneeId === null ||
        event.fromAssignedToId !== reconstructedAssigneeId ||
        event.toAssignedToId === null ||
        event.toAssignedToId === reconstructedAssigneeId ||
        event.toState !== "open"
      ) {
        blockers.add("ASSIGNMENT_CHAIN_MISMATCH");
      } else {
        assignmentHistory.push({
          kind: "REASSIGNMENT",
          fromAssignedToId: reconstructedAssigneeId,
          toAssignedToId: event.toAssignedToId,
          actorUserId: event.actorUserId,
          actorRole: event.actorRole,
          occurredAt: event.occurredAt,
          resultingRevision: event.resultingRevision,
        });
      }
      reconstructedAssigneeId = event.toAssignedToId;
    } else {
      if (
        event.fromAssignedToId !== reconstructedAssigneeId ||
        event.toAssignedToId !== reconstructedAssigneeId
      ) {
        blockers.add("ASSIGNMENT_CHAIN_MISMATCH");
      }
      if (event.type === "resolved") {
        if (
          reconstructedState !== "open" ||
          event.fromState !== "open" ||
          event.toState !== "resolved" ||
          resolvedEvent !== null
        ) {
          blockers.add("RESOLUTION_EVENT_MISMATCH");
        }
        resolvedEvent = event;
      } else if (event.toState !== reconstructedState) {
        blockers.add("TASK_EVENT_STATE_MISMATCH");
      }
    }
    reconstructedState = event.toState;
  }

  const finalRevision = lifecycle.at(-1)?.resultingRevision ?? 0;
  if (task.revision !== finalRevision) blockers.add("TASK_REVISION_EVENT_MISMATCH");
  if (task.assignedToId !== reconstructedAssigneeId) {
    blockers.add("CURRENT_ASSIGNEE_EVENT_MISMATCH");
  }
  if (task.currentState !== reconstructedState) blockers.add("CURRENT_STATE_EVENT_MISMATCH");

  if (task.currentState === "resolved") {
    if (resolvedEvent === null) {
      blockers.add("RESOLUTION_EVENT_MISSING");
    } else if (
      task.resolvedById !== resolvedEvent.actorUserId ||
      !sameInstant(task.resolvedAt, resolvedEvent.occurredAt)
    ) {
      blockers.add("RESOLUTION_EVENT_MISMATCH");
    }
  } else if (resolvedEvent !== null || task.resolvedById !== null || task.resolvedAt !== null) {
    blockers.add("RESOLUTION_EVENT_MISMATCH");
  }

  const currentAssigneeEligibility: CurrentAssigneeEligibility =
    task.assignedToId === null
      ? "NOT_APPLICABLE"
      : input.currentAssigneeCurrentlyAuthorized
        ? "CURRENTLY_AUTHORIZED"
        : "NOT_CURRENTLY_AUTHORIZED";
  if (currentAssigneeEligibility === "NOT_CURRENTLY_AUTHORIZED") {
    blockers.add("CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED");
  }

  return {
    taskId: task.id,
    episodeId: task.episodeId,
    taskRevision: task.revision,
    taskState: task.currentState,
    origin: {
      kind: task.alertId === null ? "DIRECT_HUMAN_INITIATION" : "REVIEWED_ALERT_DERIVED",
      alertId: task.alertId,
    },
    createdById: task.createdById,
    createdAt: task.createdAt,
    currentAssigneeId: task.assignedToId,
    assignmentStatus:
      task.currentState === "resolved"
        ? "RESOLVED"
        : task.assignedToId === null
          ? "UNASSIGNED"
          : "ASSIGNED",
    assignmentHistory,
    lifecycle,
    resolvedById: task.resolvedById,
    resolvedAt: task.resolvedAt,
    currentAssigneeEligibility,
    consistencyStatus: [...blockers].some((value) => STRUCTURAL_BLOCKERS.has(value))
      ? "INCONSISTENT"
      : "VALID",
    blockers: [...blockers],
  };
}
