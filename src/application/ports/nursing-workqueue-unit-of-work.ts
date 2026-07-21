import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type {
  ContactAttemptOutcome,
  TaskEventType,
  TaskState,
} from "@/domain/workqueue/nursing-task";

export interface WorkQueueEpisodeRecord {
  readonly id: string;
  readonly isSynthetic: boolean;
  readonly responsibleNurseId: string;
  readonly responsibleClinicianId: string;
}

export interface WorkQueueAlertRecord {
  readonly id: string;
  readonly episodeId: string;
  readonly state: "open" | "reviewed" | "actioned" | "resolved" | "dismissed-with-reason";
  readonly hasHumanReview: boolean;
}

export interface NursingTaskRecord {
  readonly id: string;
  readonly episodeId: string;
  readonly alertId: string | null;
  readonly summary: string;
  readonly currentState: TaskState;
  readonly assignedToId: string | null;
  readonly createdById: string;
  readonly creationIdempotencyKey: string;
  readonly creationFingerprint: string;
  readonly revision: number;
  readonly resolvedById: string | null;
  readonly resolvedAt: Date | null;
  readonly resolutionReason: string | null;
  readonly createdAt: Date;
}

export interface NursingTaskEventRecord {
  readonly id: string;
  readonly taskId: string;
  readonly type: TaskEventType;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly resultingRevision: number;
}

export interface NursingWorkQueueTransaction {
  isActiveUserWithRole(userId: string, role: Role): Promise<boolean>;
  getEpisode(episodeId: string): Promise<WorkQueueEpisodeRecord | null>;
  getAlert(alertId: string): Promise<WorkQueueAlertRecord | null>;
  isAuthorizedAssignee(userId: string, episodeId: string): Promise<boolean>;
  getTask(taskId: string): Promise<NursingTaskRecord | null>;
  findTaskByCreationIdempotency(
    createdById: string,
    idempotencyKey: string,
  ): Promise<NursingTaskRecord | null>;
  claimTask(input: {
    readonly episodeId: string;
    readonly alertId: string | null;
    readonly summary: string;
    readonly assignedToId: string | null;
    readonly createdById: string;
    readonly actorRole: "nurse" | "clinician";
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly createdAt: Date;
  }): Promise<{ readonly task: NursingTaskRecord; readonly created: boolean }>;
  findEventByIdempotency(
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<NursingTaskEventRecord | null>;
  applyTaskEvent(input: {
    readonly task: NursingTaskRecord;
    readonly type: Exclude<TaskEventType, "created">;
    readonly actorUserId: string;
    readonly actorRole: "nurse" | "clinician";
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly occurredAt: Date;
    readonly toAssignedToId: string | null;
    readonly note: string | null;
    readonly contactOutcome: ContactAttemptOutcome | null;
    readonly resolutionReason: string | null;
  }): Promise<{
    readonly task: NursingTaskRecord;
    readonly event: NursingTaskEventRecord;
    readonly created: boolean;
  }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
}

export interface NursingWorkQueueUnitOfWork {
  run<T>(operation: (transaction: NursingWorkQueueTransaction) => Promise<T>): Promise<T>;
}
