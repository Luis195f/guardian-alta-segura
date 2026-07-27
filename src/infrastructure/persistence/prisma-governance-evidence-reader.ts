import { Prisma } from "@prisma/client";

import {
  GOVERNANCE_EVIDENCE_COLLECTION_LIMIT,
  type GovernanceEvidenceCollectionCoverage,
  type GovernanceEvidenceReader,
  type GovernanceEvidenceSource,
} from "@/application/ports/governance-evidence-reader";
import {
  buildEpisodeGovernanceInput,
  evaluateEpisodeGovernance,
} from "@/application/episode/manage-discharge-episode";
import type { AuditAction, AuditOutcome } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type { EpisodeGovernancePolicy } from "@/domain/episode/activation-policy";
import { readAlertProvenance } from "@/domain/provenance/signal-provenance";
import type { TaskEventType, TaskState } from "@/domain/workqueue/nursing-task";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaEpisodeTransaction } from "@/infrastructure/persistence/prisma-episode-unit-of-work";

const QUERY_TAKE = GOVERNANCE_EVIDENCE_COLLECTION_LIMIT + 1;

function coverage<T>(rows: readonly T[]): {
  readonly values: readonly T[];
  readonly coverage: GovernanceEvidenceCollectionCoverage;
} {
  const truncated = rows.length > GOVERNANCE_EVIDENCE_COLLECTION_LIMIT;
  const values = truncated ? rows.slice(0, GOVERNANCE_EVIDENCE_COLLECTION_LIMIT) : rows;
  return {
    values,
    coverage: {
      returned: values.length,
      limit: GOVERNANCE_EVIDENCE_COLLECTION_LIMIT,
      truncated,
    },
  };
}

function alertState(value: string): GovernanceEvidenceSource["alerts"][number]["state"] {
  return value
    .toLowerCase()
    .replaceAll("_", "-") as GovernanceEvidenceSource["alerts"][number]["state"];
}

function evaluationOutcome(
  value: string,
): GovernanceEvidenceSource["alerts"][number]["evaluation"]["outcome"] {
  return value
    .toLowerCase()
    .replaceAll("_", "-") as GovernanceEvidenceSource["alerts"][number]["evaluation"]["outcome"];
}

function taskState(value: string): TaskState {
  return value.toLowerCase() as TaskState;
}

function taskEventType(value: string): TaskEventType {
  return value.toLowerCase().replaceAll("_", "-") as TaskEventType;
}

export class PrismaGovernanceEvidenceReader implements GovernanceEvidenceReader {
  constructor(
    private readonly governancePolicy: EpisodeGovernancePolicy | null,
    private readonly afterEvidenceSourcesRead: () => Promise<void> = async () => undefined,
  ) {}

  async readAuthorizedEpisodeEvidenceSnapshot(input: {
    readonly episodeId: string;
    readonly actorUserId: string;
    readonly actorProfessionalRoles: readonly ("nurse" | "clinician")[];
    readonly correlationId: string;
    readonly evaluatedAt: Date;
  }): ReturnType<GovernanceEvidenceReader["readAuthorizedEpisodeEvidenceSnapshot"]> {
    return prisma.$transaction(
      async (transaction) => {
        const [activeActor, episode] = await Promise.all([
          transaction.user.findFirst({
            where: {
              id: input.actorUserId,
              isActive: true,
              roleAssignments: {
                some: { role: { in: [...input.actorProfessionalRoles] }, revokedAt: null },
              },
            },
            select: { id: true },
          }),
          transaction.dischargeEpisode.findFirst({
            where: {
              id: input.episodeId,
              OR: [
                { responsibleNurseId: input.actorUserId },
                { responsibleClinicianId: input.actorUserId },
              ],
            },
            select: {
              id: true,
              status: true,
              version: true,
              responsibleNurseId: true,
              responsibleClinicianId: true,
              createdAt: true,
              updatedAt: true,
              checkInProtocolVersion: {
                select: { id: true, protocolKey: true, versionNumber: true },
              },
            },
          }),
        ]);
        if (!activeActor || !episode) return null;

        const [transitionRows, alertRows, taskRows] = await Promise.all([
          transaction.episodeTransition.findMany({
            where: { episodeId: episode.id },
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              actorUserId: true,
              actorRole: true,
              resultingVersion: true,
              occurredAt: true,
            },
            orderBy: [{ resultingVersion: "asc" }, { id: "asc" }],
            take: QUERY_TAKE,
          }),
          transaction.alert.findMany({
            where: { episodeId: episode.id },
            select: {
              id: true,
              episodeId: true,
              currentState: true,
              triggeredAt: true,
              ruleDefinitionId: true,
              ruleVersionId: true,
              ruleVersionNumber: true,
              inputReferences: true,
              evaluation: {
                select: {
                  id: true,
                  episodeId: true,
                  evaluatedById: true,
                  evaluatedAt: true,
                  outcome: true,
                  inputHash: true,
                  ruleDefinitionId: true,
                  ruleVersionId: true,
                  ruleVersionNumber: true,
                },
              },
            },
            orderBy: [{ triggeredAt: "asc" }, { id: "asc" }],
            take: QUERY_TAKE,
          }),
          transaction.task.findMany({
            where: { episodeId: episode.id },
            select: {
              id: true,
              episodeId: true,
              alertId: true,
              currentState: true,
              assignedToId: true,
              createdById: true,
              revision: true,
              resolvedById: true,
              resolvedAt: true,
              createdAt: true,
              assignedTo: {
                select: {
                  id: true,
                  isActive: true,
                  roleAssignments: {
                    where: { revokedAt: null },
                    select: { role: true },
                  },
                },
              },
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: QUERY_TAKE,
          }),
        ]);

        const transitions = coverage(transitionRows);
        const selectedAlerts = coverage(alertRows);
        const selectedTasks = coverage(taskRows);
        const alertIds = selectedAlerts.values.map(({ id }) => id);
        const taskIds = selectedTasks.values.map(({ id }) => id);

        const [reviewRows, taskEventRows] = await Promise.all([
          alertIds.length === 0
            ? Promise.resolve([])
            : transaction.alertReview.findMany({
                where: { alertId: { in: alertIds } },
                select: {
                  id: true,
                  alertId: true,
                  fromState: true,
                  toState: true,
                  reviewedById: true,
                  reviewedAt: true,
                },
                orderBy: [{ reviewedAt: "asc" }, { id: "asc" }],
                take: QUERY_TAKE,
              }),
          taskIds.length === 0
            ? Promise.resolve([])
            : transaction.taskEvent.findMany({
                where: { taskId: { in: taskIds } },
                select: {
                  id: true,
                  taskId: true,
                  type: true,
                  fromState: true,
                  toState: true,
                  fromAssignedToId: true,
                  toAssignedToId: true,
                  actorUserId: true,
                  actorRole: true,
                  resultingRevision: true,
                  occurredAt: true,
                },
                orderBy: [{ taskId: "asc" }, { resultingRevision: "asc" }, { id: "asc" }],
                take: QUERY_TAKE,
              }),
        ]);
        const reviews = coverage(reviewRows);
        const taskEvents = coverage(taskEventRows);
        const evaluationIds = selectedAlerts.values.map(({ evaluation }) => evaluation.id);
        const auditResourceFilters: Prisma.AuditEventWhereInput[] = [
          { resourceType: "DischargeEpisode", resourceId: episode.id },
          ...(alertIds.length > 0 ? [{ resourceType: "Alert", resourceId: { in: alertIds } }] : []),
          ...(evaluationIds.length > 0
            ? [{ resourceType: "RuleEvaluation", resourceId: { in: evaluationIds } }]
            : []),
          ...(taskIds.length > 0 ? [{ resourceType: "Task", resourceId: { in: taskIds } }] : []),
        ];
        const auditRows = await transaction.auditEvent.findMany({
          where: { OR: auditResourceFilters },
          select: {
            id: true,
            action: true,
            outcome: true,
            actorUserId: true,
            actorRole: true,
            resourceType: true,
            resourceId: true,
            createdAt: true,
            correlationId: true,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: QUERY_TAKE,
        });
        const audits = coverage(auditRows);

        const reviewsByAlert = new Map<
          string,
          GovernanceEvidenceSource["alerts"][number]["reviews"]
        >();
        for (const review of reviews.values) {
          const projected = {
            reviewId: review.id,
            alertId: review.alertId,
            fromState: alertState(review.fromState),
            toState: alertState(review.toState),
            reviewedById: review.reviewedById,
            reviewedAt: review.reviewedAt,
          };
          reviewsByAlert.set(review.alertId, [
            ...(reviewsByAlert.get(review.alertId) ?? []),
            projected,
          ]);
        }
        const eventsByTask = new Map<string, GovernanceEvidenceSource["tasks"][number]["events"]>();
        for (const event of taskEvents.values) {
          const projected = {
            id: event.id,
            taskId: event.taskId,
            type: taskEventType(event.type),
            fromState: event.fromState === null ? null : taskState(event.fromState),
            toState: taskState(event.toState),
            fromAssignedToId: event.fromAssignedToId,
            toAssignedToId: event.toAssignedToId,
            actorUserId: event.actorUserId,
            actorRole: event.actorRole as Role,
            resultingRevision: event.resultingRevision,
            occurredAt: event.occurredAt,
          };
          eventsByTask.set(event.taskId, [...(eventsByTask.get(event.taskId) ?? []), projected]);
        }

        const source: GovernanceEvidenceSource = {
          episode: {
            id: episode.id,
            state: episode.status,
            version: episode.version,
            responsibleNurseId: episode.responsibleNurseId,
            responsibleClinicianId: episode.responsibleClinicianId,
            createdAt: episode.createdAt,
            updatedAt: episode.updatedAt,
            checkInProtocol: {
              versionId: episode.checkInProtocolVersion.id,
              protocolKey: episode.checkInProtocolVersion.protocolKey,
              versionNumber: episode.checkInProtocolVersion.versionNumber,
            },
          },
          transitions: transitions.values.map((transition) => ({
            transitionId: transition.id,
            fromState: transition.fromStatus,
            toState: transition.toStatus,
            actorUserId: transition.actorUserId,
            actorRole: transition.actorRole as Role,
            resultingVersion: transition.resultingVersion,
            occurredAt: transition.occurredAt,
          })),
          alerts: selectedAlerts.values.map((alert) => ({
            alertId: alert.id,
            episodeId: alert.episodeId,
            state: alertState(alert.currentState),
            triggeredAt: alert.triggeredAt,
            rule: {
              definitionId: alert.ruleDefinitionId,
              versionId: alert.ruleVersionId,
              versionNumber: alert.ruleVersionNumber,
            },
            evaluation: {
              evaluationId: alert.evaluation.id,
              episodeId: alert.evaluation.episodeId,
              evaluatedById: alert.evaluation.evaluatedById,
              evaluatedAt: alert.evaluation.evaluatedAt,
              outcome: evaluationOutcome(alert.evaluation.outcome),
              inputHash: alert.evaluation.inputHash,
              ruleDefinitionId: alert.evaluation.ruleDefinitionId,
              ruleVersionId: alert.evaluation.ruleVersionId,
              ruleVersionNumber: alert.evaluation.ruleVersionNumber,
            },
            provenance: readAlertProvenance(alert.inputReferences),
            reviews: reviewsByAlert.get(alert.id) ?? [],
          })),
          tasks: selectedTasks.values.map((task) => {
            const currentAssigneeCurrentlyAuthorized =
              task.assignedTo !== null &&
              task.assignedTo.isActive &&
              ((task.assignedTo.id === episode.responsibleNurseId &&
                task.assignedTo.roleAssignments.some(({ role }) => role === "nurse")) ||
                (task.assignedTo.id === episode.responsibleClinicianId &&
                  task.assignedTo.roleAssignments.some(({ role }) => role === "clinician")));
            return {
              task: {
                id: task.id,
                episodeId: task.episodeId,
                alertId: task.alertId,
                currentState: taskState(task.currentState),
                assignedToId: task.assignedToId,
                createdById: task.createdById,
                revision: task.revision,
                resolvedById: task.resolvedById,
                resolvedAt: task.resolvedAt,
                createdAt: task.createdAt,
              },
              events: eventsByTask.get(task.id) ?? [],
              currentAssigneeCurrentlyAuthorized,
            };
          }),
          auditEvents: audits.values.map((event) => ({
            auditEventId: event.id,
            action: event.action as AuditAction,
            result: event.outcome as AuditOutcome,
            actorUserId: event.actorUserId,
            actorRole: event.actorRole as Role | null,
            resourceType: event.resourceType,
            resourceId: event.resourceId,
            occurredAt: event.createdAt,
            correlationId: event.correlationId,
          })),
          coverage: {
            episodeTransitions: transitions.coverage,
            alerts: selectedAlerts.coverage,
            alertReviews: reviews.coverage,
            tasks: selectedTasks.coverage,
            taskEvents: taskEvents.coverage,
            auditEvents: audits.coverage,
          },
        };
        await this.afterEvidenceSourcesRead();
        const episodeTransaction = new PrismaEpisodeTransaction(transaction);
        const governanceEpisode = await episodeTransaction.getEpisodeForTransition(episode.id);
        if (!governanceEpisode) return null;
        const governance = await evaluateEpisodeGovernance(
          this.governancePolicy,
          await buildEpisodeGovernanceInput(
            episodeTransaction,
            governanceEpisode,
            input.correlationId,
            input.evaluatedAt,
          ),
        );
        return { source, governance };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
