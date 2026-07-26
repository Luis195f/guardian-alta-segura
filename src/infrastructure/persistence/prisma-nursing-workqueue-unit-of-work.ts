import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { NursingTaskConflictError } from "@/application/workqueue/manage-nursing-tasks";
import type {
  NursingTaskEventRecord,
  NursingTaskRecord,
  NursingWorkQueueTransaction,
  NursingWorkQueueUnitOfWork,
} from "@/application/ports/nursing-workqueue-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import { readAlertProvenance } from "@/domain/provenance/signal-provenance";
import type { ContactAttemptOutcome, TaskEventType } from "@/domain/workqueue/nursing-task";
import { prisma } from "@/infrastructure/persistence/prisma";

const taskSelect = {
  id: true,
  episodeId: true,
  alertId: true,
  summary: true,
  currentState: true,
  assignedToId: true,
  createdById: true,
  creationIdempotencyKey: true,
  creationFingerprint: true,
  revision: true,
  resolvedById: true,
  resolvedAt: true,
  resolutionReason: true,
  createdAt: true,
} satisfies Prisma.TaskSelect;

type PrismaTaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

function toTask(task: PrismaTaskRecord): NursingTaskRecord {
  return {
    ...task,
    currentState: task.currentState.toLowerCase() as NursingTaskRecord["currentState"],
  };
}

const eventSelect = {
  id: true,
  taskId: true,
  type: true,
  actorUserId: true,
  idempotencyKey: true,
  requestFingerprint: true,
  resultingRevision: true,
} satisfies Prisma.TaskEventSelect;

type PrismaTaskEventRecord = Prisma.TaskEventGetPayload<{ select: typeof eventSelect }>;

function fromEventType(type: PrismaTaskEventRecord["type"]): TaskEventType {
  return type.toLowerCase().replaceAll("_", "-") as TaskEventType;
}

function toEvent(event: PrismaTaskEventRecord): NursingTaskEventRecord {
  return { ...event, type: fromEventType(event.type) };
}

function toPrismaEventType(type: Exclude<TaskEventType, "created">) {
  return type.toUpperCase().replaceAll("-", "_") as
    "ASSIGNED" | "REASSIGNED" | "CONTACT_ATTEMPT" | "NOTE_RECORDED" | "RESOLVED";
}

function toPrismaContactOutcome(outcome: ContactAttemptOutcome | null) {
  return outcome?.toUpperCase().replaceAll("-", "_") as
    "REACHED" | "NO_ANSWER" | "OTHER" | undefined;
}

class PrismaNursingWorkQueueTransaction implements NursingWorkQueueTransaction {
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

  async getEpisode(episodeId: string) {
    const episode = await this.transaction.dischargeEpisode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        responsibleNurseId: true,
        responsibleClinicianId: true,
        patient: { select: { isSynthetic: true } },
      },
    });
    return episode
      ? {
          id: episode.id,
          isSynthetic: episode.patient.isSynthetic,
          responsibleNurseId: episode.responsibleNurseId,
          responsibleClinicianId: episode.responsibleClinicianId,
        }
      : null;
  }

  async getAlert(alertId: string) {
    const alert = await this.transaction.alert.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        episodeId: true,
        currentState: true,
        _count: { select: { reviews: true } },
      },
    });
    return alert
      ? {
          id: alert.id,
          episodeId: alert.episodeId,
          state: alert.currentState.toLowerCase().replaceAll("_", "-") as
            "open" | "reviewed" | "actioned" | "resolved" | "dismissed-with-reason",
          hasHumanReview: alert._count.reviews > 0,
        }
      : null;
  }

  async isAuthorizedAssignee(userId: string, episodeId: string): Promise<boolean> {
    return (
      (await this.transaction.dischargeEpisode.count({
        where: {
          id: episodeId,
          OR: [{ responsibleNurseId: userId }, { responsibleClinicianId: userId }],
          AND: {
            OR: [
              {
                responsibleNurse: {
                  id: userId,
                  isActive: true,
                  roleAssignments: { some: { role: "nurse", revokedAt: null } },
                },
              },
              {
                responsibleClinician: {
                  id: userId,
                  isActive: true,
                  roleAssignments: { some: { role: "clinician", revokedAt: null } },
                },
              },
            ],
          },
        },
      })) === 1
    );
  }

  async getTask(taskId: string) {
    const task = await this.transaction.task.findUnique({
      where: { id: taskId },
      select: taskSelect,
    });
    return task ? toTask(task) : null;
  }

  async findTaskByCreationIdempotency(createdById: string, idempotencyKey: string) {
    const task = await this.transaction.task.findUnique({
      where: {
        createdById_creationIdempotencyKey: { createdById, creationIdempotencyKey: idempotencyKey },
      },
      select: taskSelect,
    });
    return task ? toTask(task) : null;
  }

  async claimTask(input: {
    readonly episodeId: string;
    readonly alertId: string | null;
    readonly summary: string;
    readonly assignedToId: string | null;
    readonly createdById: string;
    readonly actorRole: "nurse" | "clinician";
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly createdAt: Date;
  }) {
    const id = randomUUID();
    const result = await this.transaction.task.createMany({
      data: {
        id,
        episodeId: input.episodeId,
        alertId: input.alertId,
        summary: input.summary,
        assignedToId: input.assignedToId,
        createdById: input.createdById,
        creationIdempotencyKey: input.idempotencyKey,
        creationFingerprint: input.requestFingerprint,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      },
      skipDuplicates: true,
    });
    const task = await this.transaction.task.findUniqueOrThrow({
      where: {
        createdById_creationIdempotencyKey: {
          createdById: input.createdById,
          creationIdempotencyKey: input.idempotencyKey,
        },
      },
      select: taskSelect,
    });
    if (result.count === 1) {
      await this.transaction.taskEvent.create({
        data: {
          taskId: task.id,
          type: "CREATED",
          fromState: null,
          toState: "OPEN",
          toAssignedToId: input.assignedToId,
          actorUserId: input.createdById,
          actorRole: input.actorRole,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: input.requestFingerprint,
          resultingRevision: 1,
          occurredAt: input.createdAt,
        },
      });
    }
    return { task: toTask(task), created: result.count === 1 };
  }

  async findEventByIdempotency(actorUserId: string, idempotencyKey: string) {
    const event = await this.transaction.taskEvent.findUnique({
      where: { actorUserId_idempotencyKey: { actorUserId, idempotencyKey } },
      select: eventSelect,
    });
    return event ? toEvent(event) : null;
  }

  async applyTaskEvent(input: {
    readonly task: NursingTaskRecord;
    readonly type: "assigned" | "reassigned" | "contact-attempt" | "note-recorded" | "resolved";
    readonly actorUserId: string;
    readonly actorRole: "nurse" | "clinician";
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly occurredAt: Date;
    readonly toAssignedToId: string | null;
    readonly note: string | null;
    readonly contactOutcome: ContactAttemptOutcome | null;
    readonly resolutionReason: string | null;
  }) {
    const resultingRevision = input.task.revision + 1;
    const toState = input.type === "resolved" ? "RESOLVED" : "OPEN";
    const eventId = randomUUID();
    const claimed = await this.transaction.taskEvent.createMany({
      data: {
        id: eventId,
        taskId: input.task.id,
        type: toPrismaEventType(input.type),
        fromState: "OPEN",
        toState,
        fromAssignedToId: input.task.assignedToId,
        toAssignedToId: input.toAssignedToId,
        note: input.note,
        contactOutcome: toPrismaContactOutcome(input.contactOutcome) ?? null,
        resolutionReason: input.resolutionReason,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        resultingRevision,
        occurredAt: input.occurredAt,
      },
      skipDuplicates: true,
    });
    const event = await this.transaction.taskEvent.findFirstOrThrow({
      where: {
        OR: [
          { actorUserId: input.actorUserId, idempotencyKey: input.idempotencyKey },
          { taskId: input.task.id, resultingRevision },
        ],
      },
      select: eventSelect,
    });
    if (claimed.count === 0) {
      const current = await this.transaction.task.findUniqueOrThrow({
        where: { id: input.task.id },
        select: taskSelect,
      });
      return { task: toTask(current), event: toEvent(event), created: false };
    }

    const updated = await this.transaction.task.updateMany({
      where: {
        id: input.task.id,
        revision: input.task.revision,
        currentState: "OPEN",
        assignedToId: input.task.assignedToId,
      },
      data: {
        currentState: toState,
        assignedToId: input.toAssignedToId,
        revision: resultingRevision,
        resolvedById: input.type === "resolved" ? input.actorUserId : null,
        resolvedAt: input.type === "resolved" ? input.occurredAt : null,
        resolutionReason: input.resolutionReason,
        updatedAt: input.occurredAt,
      },
    });
    if (updated.count !== 1) throw new NursingTaskConflictError();
    const current = await this.transaction.task.findUniqueOrThrow({
      where: { id: input.task.id },
      select: taskSelect,
    });
    return { task: toTask(current), event: toEvent(event), created: true };
  }

  appendAuditEvent(input: NewAuditEvent) {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }
}

export class PrismaNursingWorkQueueUnitOfWork implements NursingWorkQueueUnitOfWork {
  async run<T>(operation: (transaction: NursingWorkQueueTransaction) => Promise<T>): Promise<T> {
    try {
      return await prisma.$transaction((transaction) =>
        operation(new PrismaNursingWorkQueueTransaction(transaction)),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientUnknownRequestError &&
        error.message.includes("task event does not start from current revision")
      ) {
        throw new NursingTaskConflictError();
      }
      throw error;
    }
  }
}

export interface NursingWorkQueueFilters {
  readonly status?: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
  readonly taskState?: "OPEN" | "RESOLVED";
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly responsibleProfessionalId?: string;
  readonly pendingOnly?: boolean;
}

export async function listNursingWorkQueue(
  principal: AuthenticatedPrincipal,
  filters: NursingWorkQueueFilters,
  now: Date = new Date(),
) {
  const activeProfessionalRoles = principal.roles.filter(
    (role): role is "nurse" | "clinician" => role === "nurse" || role === "clinician",
  );
  if (
    activeProfessionalRoles.length === 0 ||
    (await prisma.user.count({
      where: {
        id: principal.userId,
        isActive: true,
        roleAssignments: { some: { role: { in: activeProfessionalRoles }, revokedAt: null } },
      },
    })) !== 1
  ) {
    return null;
  }
  const visibleEpisode = {
    OR: [{ responsibleNurseId: principal.userId }, { responsibleClinicianId: principal.userId }],
  } satisfies Prisma.DischargeEpisodeWhereInput;
  const pending = {
    OR: [
      { alerts: { some: { currentState: "OPEN" } } },
      { tasks: { some: { currentState: "OPEN" } } },
      {
        checkInAssignments: {
          some: { outcome: null, windowStartsAt: { lte: now }, windowEndsAt: { gt: now } },
        },
      },
    ],
  } satisfies Prisma.DischargeEpisodeWhereInput;
  const dateFilter: Prisma.DateTimeFilter = {
    ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
    ...(filters.dateTo ? { lte: filters.dateTo } : {}),
  };
  const queueInclude = {
    patient: { select: { externalPseudonymousId: true } },
    responsibleNurse: { select: { id: true, syntheticAlias: true } },
    responsibleClinician: { select: { id: true, syntheticAlias: true } },
    checkInAssignments: {
      where: { outcome: { isNot: null } },
      orderBy: { outcome: { recordedAt: "desc" as const } },
      take: 1,
      select: {
        id: true,
        scheduledFor: true,
        windowStartsAt: true,
        windowEndsAt: true,
        outcome: { select: { type: true, recordedAt: true } },
      },
    },
    alerts: {
      where: { currentState: { in: ["OPEN", "REVIEWED", "ACTIONED"] as const } },
      orderBy: { triggeredAt: "desc" as const },
      select: {
        id: true,
        currentState: true,
        explanation: true,
        ruleVersionId: true,
        ruleVersionNumber: true,
        inputReferences: true,
        triggeredAt: true,
        definition: { select: { name: true } },
        _count: { select: { reviews: true } },
      },
    },
    tasks: {
      orderBy: { createdAt: "desc" as const },
      include: {
        assignedTo: { select: { id: true, syntheticAlias: true } },
        events: {
          orderBy: { resultingRevision: "asc" as const },
          select: {
            id: true,
            type: true,
            note: true,
            contactOutcome: true,
            resolutionReason: true,
            resultingRevision: true,
            occurredAt: true,
            actor: { select: { syntheticAlias: true } },
            toAssignedTo: { select: { id: true, syntheticAlias: true } },
          },
        },
      },
    },
    _count: {
      select: {
        checkInAssignments: {
          where: { outcome: null, windowStartsAt: { lte: now }, windowEndsAt: { gt: now } },
        },
      },
    },
  } satisfies Prisma.DischargeEpisodeInclude;
  const episodes = await prisma.dischargeEpisode.findMany({
    where: {
      AND: [
        visibleEpisode,
        filters.status ? { status: filters.status } : {},
        filters.taskState ? { tasks: { some: { currentState: filters.taskState } } } : {},
        filters.dateFrom || filters.dateTo ? { dischargeDate: dateFilter } : {},
        filters.responsibleProfessionalId
          ? {
              OR: [
                { responsibleNurseId: filters.responsibleProfessionalId },
                { responsibleClinicianId: filters.responsibleProfessionalId },
              ],
            }
          : {},
        filters.pendingOnly ? pending : {},
      ],
    },
    include: queueInclude,
    orderBy: [{ dischargeDate: "desc" }, { id: "asc" }],
  });

  const entries = episodes.map((episode) => {
    const openTaskCount = episode.tasks.filter(
      ({ currentState }) => currentState === "OPEN",
    ).length;
    const unreviewedAlertCount = episode.alerts.filter(
      ({ currentState }) => currentState === "OPEN",
    ).length;
    const pendingElementCount =
      openTaskCount + unreviewedAlertCount + episode._count.checkInAssignments;
    const last = episode.checkInAssignments[0] ?? null;
    return {
      episode: {
        id: episode.id,
        status: episode.status,
        dischargeDate: episode.dischargeDate,
        patientPseudonymousId: episode.patient.externalPseudonymousId,
        responsibleNurse: episode.responsibleNurse,
        responsibleClinician: episode.responsibleClinician,
      },
      pendingElementCount,
      lastRelevantCheckIn: last
        ? {
            id: last.id,
            scheduledFor: last.scheduledFor,
            windowStartsAt: last.windowStartsAt,
            windowEndsAt: last.windowEndsAt,
            outcome: last.outcome
              ? { type: last.outcome.type, recordedAt: last.outcome.recordedAt }
              : null,
          }
        : null,
      openAlerts: episode.alerts.map((alert) => ({
        id: alert.id,
        state: alert.currentState.toLowerCase(),
        ruleName: alert.definition.name,
        ruleVersionId: alert.ruleVersionId,
        ruleVersionNumber: alert.ruleVersionNumber,
        explanation: alert.explanation,
        provenance: readAlertProvenance(alert.inputReferences),
        triggeredAt: alert.triggeredAt,
        reviewedByHuman: alert._count.reviews > 0,
      })),
      tasks: episode.tasks.map((task) => ({
        id: task.id,
        alertId: task.alertId,
        summary: task.summary,
        state: task.currentState.toLowerCase(),
        revision: task.revision,
        assignedTo: task.assignedTo,
        resolvedAt: task.resolvedAt,
        resolutionReason: task.resolutionReason,
        createdAt: task.createdAt,
        events: task.events.map((event) => ({
          ...event,
          type: event.type.toLowerCase().replaceAll("_", "-"),
          contactOutcome: event.contactOutcome?.toLowerCase().replaceAll("_", "-") ?? null,
        })),
      })),
    };
  });

  const tasks = entries.flatMap((entry) => entry.tasks);
  const openTasks = tasks.filter(({ state }) => state === "open");
  const oldestOpenTaskAgeHours =
    openTasks.length === 0
      ? null
      : Math.max(
          0,
          Math.floor(
            (now.getTime() - Math.min(...openTasks.map(({ createdAt }) => createdAt.getTime()))) /
              3_600_000,
          ),
        );
  return {
    entries,
    metrics: {
      episodeCount: entries.length,
      pendingElementCount: entries.reduce((total, entry) => total + entry.pendingElementCount, 0),
      openTaskCount: openTasks.length,
      resolvedTaskCount: tasks.length - openTasks.length,
      oldestOpenTaskAgeHours,
    },
  };
}
