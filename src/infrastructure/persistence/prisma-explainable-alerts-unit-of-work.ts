import { randomUUID } from "node:crypto";

import { AlertState as PrismaAlertState, Prisma } from "@prisma/client";

import { ExplainableAlertConflictError } from "@/application/alerts/manage-explainable-alerts";
import type {
  AlertRecord,
  ExplainableAlertsTransaction,
  ExplainableAlertsUnitOfWork,
  RecordedAlertReview,
  RuleDefinitionRecord,
  RuleVersionRecord,
} from "@/application/ports/explainable-alerts-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import {
  type AlertState as DomainAlertState,
  type ExplainableRuleDsl,
  type RuleEvaluationOutcome as DomainRuleEvaluationOutcome,
  validateExplainableRuleDsl,
} from "@/domain/alerts/explainable-rule";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import {
  attachRuleObservationToVerifiedSource,
  createAlertLineage,
  createRuleEvaluationLineage,
  mapCaregiverObservationProvenance,
  mapCheckInNonResponseProvenance,
  mapCheckInResponseProvenance,
  mapHomeSafetyReviewVersionProvenance,
  mapRuleInputSourceClaim,
  mapSafetyPlanVersionProvenance,
  ProvenanceValidationError,
  readAlertProvenance,
  type SourceEvidenceReference,
} from "@/domain/provenance/signal-provenance";
import { prisma } from "@/infrastructure/persistence/prisma";

const versionInclude = {
  approval: { select: { id: true, approvedById: true, approvedAt: true } },
} satisfies Prisma.RuleVersionInclude;

type VersionWithApproval = Prisma.RuleVersionGetPayload<{ include: typeof versionInclude }>;

function stateFromPrisma(state: VersionWithApproval["state"]): RuleVersionRecord["state"] {
  return state.toLowerCase() as RuleVersionRecord["state"];
}

function stateToPrisma(state: RuleVersionRecord["state"]) {
  return state.toUpperCase() as VersionWithApproval["state"];
}

function alertStateFromPrisma(state: PrismaAlertState): DomainAlertState {
  return state.toLowerCase().replaceAll("_", "-") as DomainAlertState;
}

function alertStateToPrisma(state: DomainAlertState): PrismaAlertState {
  return state.toUpperCase().replaceAll("-", "_") as PrismaAlertState;
}

function evaluationOutcomeFromPrisma(value: string): DomainRuleEvaluationOutcome {
  return value.toLowerCase().replaceAll("_", "-") as DomainRuleEvaluationOutcome;
}

function stringArray(value: Prisma.JsonValue): readonly string[] {
  if (!Array.isArray(value)) {
    throw new ExplainableAlertConflictError("Stored evaluation has invalid missing inputs");
  }
  const values: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new ExplainableAlertConflictError("Stored evaluation has invalid missing inputs");
    }
    values.push(item);
  }
  return values;
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toRuleVersion(version: VersionWithApproval): RuleVersionRecord {
  const dsl = validateExplainableRuleDsl({
    schemaVersion: version.schemaVersion,
    allowedInputs: version.allowedInputs,
    window: version.temporalWindow,
    condition: version.condition,
    administrativeSeverity: version.administrativeSeverity.toLowerCase(),
    explanation: version.explanation,
    reviewOwner: version.reviewOwner.toLowerCase(),
  });
  return {
    id: version.id,
    definitionId: version.ruleDefinitionId,
    versionNumber: version.versionNumber,
    state: stateFromPrisma(version.state),
    basedOnVersionId: version.basedOnVersionId,
    dsl,
    createdById: version.createdById,
    approval: version.approval,
  };
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

class PrismaExplainableAlertsTransaction implements ExplainableAlertsTransaction {
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

  async findDefinitionByKey(ruleKey: string): Promise<RuleDefinitionRecord | null> {
    return this.transaction.ruleDefinition.findUnique({
      where: { ruleKey },
      select: { id: true, ruleKey: true, name: true, isSyntheticFixture: true },
    });
  }

  async createDefinition(input: {
    readonly ruleKey: string;
    readonly name: string;
    readonly isSyntheticFixture: true;
    readonly createdById: string;
    readonly createdAt: Date;
  }): Promise<RuleDefinitionRecord> {
    try {
      return await this.transaction.ruleDefinition.create({
        data: input,
        select: { id: true, ruleKey: true, name: true, isSyntheticFixture: true },
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ExplainableAlertConflictError("Concurrent rule definition already exists");
      }
      throw error;
    }
  }

  async getLatestVersion(definitionId: string): Promise<RuleVersionRecord | null> {
    const version = await this.transaction.ruleVersion.findFirst({
      where: { ruleDefinitionId: definitionId },
      orderBy: { versionNumber: "desc" },
      include: versionInclude,
    });
    return version ? toRuleVersion(version) : null;
  }

  async getVersion(versionId: string): Promise<RuleVersionRecord | null> {
    const version = await this.transaction.ruleVersion.findUnique({
      where: { id: versionId },
      include: versionInclude,
    });
    return version ? toRuleVersion(version) : null;
  }

  async createVersion(input: {
    readonly definitionId: string;
    readonly versionNumber: number;
    readonly state: "draft";
    readonly basedOnVersionId: string | null;
    readonly dsl: ExplainableRuleDsl;
    readonly createdById: string;
    readonly createdAt: Date;
  }): Promise<RuleVersionRecord> {
    try {
      const version = await this.transaction.ruleVersion.create({
        data: {
          ruleDefinitionId: input.definitionId,
          versionNumber: input.versionNumber,
          state: stateToPrisma(input.state),
          basedOnVersionId: input.basedOnVersionId,
          schemaVersion: input.dsl.schemaVersion,
          allowedInputs: inputJson(input.dsl.allowedInputs),
          temporalWindow: inputJson(input.dsl.window),
          condition: inputJson(input.dsl.condition),
          administrativeSeverity: input.dsl.administrativeSeverity.toUpperCase() as
            "STANDARD" | "PRIORITY",
          explanation: input.dsl.explanation,
          reviewOwner: input.dsl.reviewOwner.toUpperCase() as "NURSE" | "CLINICIAN",
          createdById: input.createdById,
          createdAt: input.createdAt,
        },
        include: versionInclude,
      });
      return toRuleVersion(version);
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ExplainableAlertConflictError("Concurrent rule version already exists");
      }
      throw error;
    }
  }

  async approveVersion(input: {
    readonly versionId: string;
    readonly approvedById: string;
    readonly approvedAt: Date;
    readonly approvalReference: string;
  }): Promise<RuleVersionRecord> {
    try {
      await this.transaction.ruleApproval.create({
        data: {
          ruleVersionId: input.versionId,
          approvedById: input.approvedById,
          approvedAt: input.approvedAt,
          approvalReference: input.approvalReference,
        },
      });
      const version = await this.transaction.ruleVersion.update({
        where: { id: input.versionId },
        data: { state: "APPROVED" },
        include: versionInclude,
      });
      return toRuleVersion(version);
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ExplainableAlertConflictError("Rule version already has approval");
      }
      throw error;
    }
  }

  async activateVersion(input: {
    readonly definitionId: string;
    readonly versionId: string;
    readonly activatedAt: Date;
  }): Promise<RuleVersionRecord> {
    try {
      await this.transaction.ruleVersion.updateMany({
        where: { ruleDefinitionId: input.definitionId, state: "ACTIVE" },
        data: { state: "RETIRED" },
      });
      const version = await this.transaction.ruleVersion.update({
        where: { id: input.versionId, ruleDefinitionId: input.definitionId, state: "APPROVED" },
        data: { state: "ACTIVE" },
        include: versionInclude,
      });
      return toRuleVersion(version);
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ExplainableAlertConflictError("Another rule version is already active");
      }
      throw error;
    }
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

  async resolveSourceProvenance(
    inputs: Parameters<ExplainableAlertsTransaction["resolveSourceProvenance"]>[0],
    episodeId: string,
  ) {
    for (const input of inputs) mapRuleInputSourceClaim(input, episodeId);
    const ids = (resourceType: string) =>
      inputs
        .filter((input) => input.source.resourceType === resourceType)
        .map((input) => input.source.resourceId);
    const [responses, nonResponses, observations, safetyPlans, homeSafetyReviews] =
      await Promise.all([
        this.transaction.checkInResponse.findMany({
          where: { id: { in: ids("CheckInResponse") } },
          select: {
            id: true,
            outcomeId: true,
            assignmentId: true,
            submittedById: true,
            submittedAt: true,
            assignment: {
              select: {
                episodeId: true,
                episode: {
                  select: {
                    checkInProtocolVersion: {
                      select: { id: true, versionNumber: true },
                    },
                  },
                },
              },
            },
          },
        }),
        this.transaction.nonResponseEvent.findMany({
          where: { id: { in: ids("NonResponseEvent") } },
          select: {
            id: true,
            outcomeId: true,
            assignmentId: true,
            outcomeType: true,
            recordedById: true,
            recordedAt: true,
            assignment: {
              select: {
                episodeId: true,
                episode: {
                  select: {
                    checkInProtocolVersion: {
                      select: { id: true, versionNumber: true },
                    },
                  },
                },
              },
            },
          },
        }),
        this.transaction.caregiverObservation.findMany({
          where: { id: { in: ids("CaregiverObservation") } },
          select: {
            id: true,
            caregiverAuthorizationId: true,
            caregiverProfileId: true,
            caregiverSessionId: true,
            dischargeEpisodeId: true,
            submittedAt: true,
            caregiverProfile: { select: { caregiverUserId: true } },
          },
        }),
        this.transaction.safetyPlanVersion.findMany({
          where: { id: { in: ids("SafetyPlanVersion") } },
          select: {
            id: true,
            versionNumber: true,
            createdById: true,
            createdAt: true,
            safetyPlan: { select: { id: true, dischargeEpisodeId: true } },
          },
        }),
        this.transaction.homeSafetyReviewVersion.findMany({
          where: { id: { in: ids("HomeSafetyReviewVersion") } },
          select: {
            id: true,
            dischargeEpisodeId: true,
            versionNumber: true,
            templateKey: true,
            templateVersion: true,
            actorUserId: true,
            recordedAt: true,
          },
        }),
      ]);
    const responseById = new Map(responses.map((record) => [record.id, record]));
    const nonResponseById = new Map(nonResponses.map((record) => [record.id, record]));
    const observationById = new Map(observations.map((record) => [record.id, record]));
    const safetyPlanById = new Map(safetyPlans.map((record) => [record.id, record]));
    const homeSafetyById = new Map(homeSafetyReviews.map((record) => [record.id, record]));

    return inputs.map((input) => {
      let verified: SourceEvidenceReference;
      if (input.source.resourceType === "CheckInResponse") {
        const record = responseById.get(input.source.resourceId);
        if (!record || record.assignment.episodeId !== episodeId) {
          throw new ProvenanceValidationError("INVALID_REFERENCE");
        }
        verified = mapCheckInResponseProvenance({
          responseId: record.id,
          assignmentId: record.assignmentId,
          outcomeId: record.outcomeId,
          episodeId: record.assignment.episodeId,
          protocolVersionId: record.assignment.episode.checkInProtocolVersion.id,
          protocolVersionNumber: record.assignment.episode.checkInProtocolVersion.versionNumber,
          submittedById: record.submittedById,
          submittedAt: record.submittedAt,
        });
      } else if (input.source.resourceType === "NonResponseEvent") {
        const record = nonResponseById.get(input.source.resourceId);
        if (
          !record ||
          record.assignment.episodeId !== episodeId ||
          !["OMITTED", "EXPIRED"].includes(record.outcomeType)
        ) {
          throw new ProvenanceValidationError("INVALID_REFERENCE");
        }
        verified = mapCheckInNonResponseProvenance({
          nonResponseEventId: record.id,
          assignmentId: record.assignmentId,
          outcomeId: record.outcomeId,
          episodeId: record.assignment.episodeId,
          protocolVersionId: record.assignment.episode.checkInProtocolVersion.id,
          protocolVersionNumber: record.assignment.episode.checkInProtocolVersion.versionNumber,
          outcomeType: record.outcomeType as "OMITTED" | "EXPIRED",
          recordedById: record.recordedById,
          recordedAt: record.recordedAt,
        });
      } else if (input.source.resourceType === "CaregiverObservation") {
        const record = observationById.get(input.source.resourceId);
        if (!record || record.dischargeEpisodeId !== episodeId) {
          throw new ProvenanceValidationError("INVALID_REFERENCE");
        }
        verified = mapCaregiverObservationProvenance({
          observationId: record.id,
          episodeId: record.dischargeEpisodeId,
          caregiverUserId: record.caregiverProfile.caregiverUserId,
          caregiverAuthorizationId: record.caregiverAuthorizationId,
          caregiverProfileId: record.caregiverProfileId,
          caregiverSessionId: record.caregiverSessionId,
          submittedAt: record.submittedAt,
        });
      } else if (input.source.resourceType === "SafetyPlanVersion") {
        const record = safetyPlanById.get(input.source.resourceId);
        if (!record || record.safetyPlan.dischargeEpisodeId !== episodeId) {
          throw new ProvenanceValidationError("INVALID_REFERENCE");
        }
        verified = mapSafetyPlanVersionProvenance({
          versionId: record.id,
          safetyPlanId: record.safetyPlan.id,
          episodeId: record.safetyPlan.dischargeEpisodeId,
          versionNumber: record.versionNumber,
          createdById: record.createdById,
          createdAt: record.createdAt,
        });
      } else if (input.source.resourceType === "HomeSafetyReviewVersion") {
        const record = homeSafetyById.get(input.source.resourceId);
        if (!record || record.dischargeEpisodeId !== episodeId) {
          throw new ProvenanceValidationError("INVALID_REFERENCE");
        }
        verified = mapHomeSafetyReviewVersionProvenance({
          versionId: record.id,
          episodeId: record.dischargeEpisodeId,
          versionNumber: record.versionNumber,
          templateKey: record.templateKey,
          templateVersion: record.templateVersion,
          actorUserId: record.actorUserId,
          recordedAt: record.recordedAt,
        });
      } else {
        throw new ProvenanceValidationError("UNKNOWN_EVIDENCE_KIND");
      }
      return attachRuleObservationToVerifiedSource(input, episodeId, verified);
    });
  }

  async findEvaluationByIdempotency(evaluatedById: string, idempotencyKey: string) {
    const evaluation = await this.transaction.ruleEvaluation.findUnique({
      where: {
        evaluatedById_idempotencyKey: { evaluatedById, idempotencyKey },
      },
      select: {
        id: true,
        evaluatedById: true,
        ruleVersionId: true,
        episodeId: true,
        idempotencyKey: true,
        requestFingerprint: true,
        outcome: true,
        missingInputs: true,
        alert: { select: { id: true } },
      },
    });
    return evaluation
      ? {
          evaluationId: evaluation.id,
          alertId: evaluation.alert?.id ?? null,
          created: false,
          evaluatedById: evaluation.evaluatedById,
          ruleVersionId: evaluation.ruleVersionId,
          episodeId: evaluation.episodeId,
          idempotencyKey: evaluation.idempotencyKey,
          requestFingerprint: evaluation.requestFingerprint,
          outcome: evaluationOutcomeFromPrisma(evaluation.outcome),
          missingInputs: stringArray(evaluation.missingInputs),
        }
      : null;
  }

  async recordEvaluation(input: Parameters<ExplainableAlertsTransaction["recordEvaluation"]>[0]) {
    const evaluationId = randomUUID();
    const created = await this.transaction.ruleEvaluation.createMany({
      data: {
        id: evaluationId,
        ruleDefinitionId: input.ruleDefinitionId,
        ruleVersionId: input.ruleVersionId,
        ruleVersionNumber: input.ruleVersionNumber,
        episodeId: input.episodeId,
        evaluatedById: input.evaluatedById,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        evaluatedAt: input.evaluatedAt,
        inputSnapshot: inputJson(input.inputSnapshot),
        inputHash: input.inputHash,
        outcome: input.outcome.toUpperCase().replace("-", "_") as
          "MATCHED" | "NOT_MATCHED" | "ABSTAINED",
        missingInputs: inputJson(input.missingInputs),
      },
      skipDuplicates: true,
    });
    if (created.count === 0) {
      const existing = await this.findEvaluationByIdempotency(
        input.evaluatedById,
        input.idempotencyKey,
      );
      if (!existing) throw new ExplainableAlertConflictError("Concurrent evaluation conflict");
      return existing;
    }
    let alertId: string | null = null;
    if (input.alert) {
      alertId = randomUUID();
      const evaluationLineage = createRuleEvaluationLineage({
        evaluationId,
        episodeId: input.episodeId,
        ruleDefinitionId: input.ruleDefinitionId,
        ruleVersionId: input.ruleVersionId,
        ruleVersionNumber: input.ruleVersionNumber,
        evaluatedById: input.evaluatedById,
        evaluatedAt: input.evaluatedAt,
        outcome: input.outcome,
        inputHash: input.inputHash,
        sources: input.alert.sourceReferences,
      });
      const alertLineage = createAlertLineage({
        alertId,
        triggeredAt: input.alert.triggeredAt,
        evaluationLineage,
      });
      const alert = await this.transaction.alert.create({
        data: {
          id: alertId,
          ruleDefinitionId: input.ruleDefinitionId,
          ruleVersionId: input.ruleVersionId,
          ruleVersionNumber: input.ruleVersionNumber,
          evaluationId,
          episodeId: input.episodeId,
          inputReferences: inputJson([alertLineage]),
          explanation: input.alert.explanation,
          administrativeSeverity: input.alert.administrativeSeverity.toUpperCase() as
            "STANDARD" | "PRIORITY",
          reviewOwner: input.alert.reviewOwner.toUpperCase() as "NURSE" | "CLINICIAN",
          triggeredAt: input.alert.triggeredAt,
          currentState: "OPEN",
        },
        select: { id: true },
      });
      alertId = alert.id;
    }
    return {
      evaluationId,
      alertId,
      created: true,
      evaluatedById: input.evaluatedById,
      ruleVersionId: input.ruleVersionId,
      episodeId: input.episodeId,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      outcome: input.outcome,
      missingInputs: input.missingInputs,
    };
  }

  async getAlert(alertId: string): Promise<AlertRecord | null> {
    const rows = await this.transaction.$queryRaw<
      {
        id: string;
        episodeId: string;
        currentState: PrismaAlertState;
        responsibleNurseId: string;
        responsibleClinicianId: string;
      }[]
    >(Prisma.sql`
      SELECT
        alert."id",
        alert."episode_id" AS "episodeId",
        alert."current_state" AS "currentState",
        episode."responsible_nurse_id" AS "responsibleNurseId",
        episode."responsible_clinician_id" AS "responsibleClinicianId"
      FROM "alerts" AS alert
      INNER JOIN "discharge_episodes" AS episode ON episode."id" = alert."episode_id"
      WHERE alert."id" = ${alertId}
      FOR UPDATE OF alert
    `);
    const alert = rows[0];
    return alert ? { ...alert, currentState: alertStateFromPrisma(alert.currentState) } : null;
  }

  async findAlertReviewByIdempotency(
    reviewedById: string,
    idempotencyKey: string,
  ): Promise<RecordedAlertReview | null> {
    const review = await this.transaction.alertReview.findUnique({
      where: {
        reviewedById_idempotencyKey: { reviewedById, idempotencyKey },
      },
      select: {
        id: true,
        alertId: true,
        fromState: true,
        toState: true,
        reviewedById: true,
        idempotencyKey: true,
        requestFingerprint: true,
      },
    });
    return review
      ? {
          reviewId: review.id,
          alertId: review.alertId,
          fromState: alertStateFromPrisma(review.fromState),
          toState: alertStateFromPrisma(review.toState) as Exclude<DomainAlertState, "open">,
          reviewedById: review.reviewedById,
          idempotencyKey: review.idempotencyKey,
          requestFingerprint: review.requestFingerprint,
          created: false,
        }
      : null;
  }

  async appendAlertReview(input: Parameters<ExplainableAlertsTransaction["appendAlertReview"]>[0]) {
    const reviewId = randomUUID();
    const created = await this.transaction.alertReview.createMany({
      data: {
        id: reviewId,
        alertId: input.alertId,
        fromState: alertStateToPrisma(input.fromState),
        toState: alertStateToPrisma(input.toState),
        reason: input.reason,
        reviewedById: input.reviewedById,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        reviewedAt: input.reviewedAt,
      },
      skipDuplicates: true,
    });
    if (created.count === 0) {
      const existing = await this.findAlertReviewByIdempotency(
        input.reviewedById,
        input.idempotencyKey,
      );
      if (!existing) throw new ExplainableAlertConflictError("Concurrent alert review conflict");
      return existing;
    }
    const updated = await this.transaction.alert.updateMany({
      where: {
        id: input.alertId,
        currentState: alertStateToPrisma(input.fromState),
      },
      data: { currentState: alertStateToPrisma(input.toState) },
    });
    if (updated.count !== 1) {
      throw new ExplainableAlertConflictError("Alert was reviewed concurrently");
    }
    return {
      reviewId,
      alertId: input.alertId,
      fromState: input.fromState,
      toState: input.toState,
      reviewedById: input.reviewedById,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      created: true,
    };
  }

  appendAuditEvent(input: NewAuditEvent) {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }
}

export class PrismaExplainableAlertsUnitOfWork implements ExplainableAlertsUnitOfWork {
  async run<T>(operation: (transaction: ExplainableAlertsTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await prisma.$transaction(
          (transaction) => operation(new PrismaExplainableAlertsTransaction(transaction)),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" ||
            (error.code === "P2010" &&
              typeof error.meta === "object" &&
              error.meta !== null &&
              "code" in error.meta &&
              error.meta.code === "40001"));
        if (!isSerializationConflict || attempt >= 3) {
          throw error;
        }
      }
    }
    throw new ExplainableAlertConflictError("Concurrent explainable alert transaction failed");
  }
}

export async function listRuleCatalog() {
  const definitions = await prisma.ruleDefinition.findMany({
    where: { isSyntheticFixture: true },
    include: {
      versions: {
        include: versionInclude,
        orderBy: { versionNumber: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return definitions.map((definition) => ({
    id: definition.id,
    ruleKey: definition.ruleKey,
    name: definition.name,
    isSyntheticFixture: definition.isSyntheticFixture,
    versions: definition.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      state: stateFromPrisma(version.state),
      basedOnVersionId: version.basedOnVersionId,
      dsl: toRuleVersion(version).dsl,
      approvedAt: version.approval?.approvedAt ?? null,
    })),
  }));
}

export async function listVisibleAlerts(principal: AuthenticatedPrincipal) {
  const canSeeAsNurse = principal.roles.includes("nurse");
  const canSeeAsClinician = principal.roles.includes("clinician");
  if (!canSeeAsNurse && !canSeeAsClinician) return null;
  const alerts = await prisma.alert.findMany({
    where: {
      OR: [
        ...(canSeeAsNurse ? [{ episode: { responsibleNurseId: principal.userId } }] : []),
        ...(canSeeAsClinician ? [{ episode: { responsibleClinicianId: principal.userId } }] : []),
      ],
    },
    include: {
      definition: { select: { ruleKey: true, name: true } },
      reviews: { orderBy: { reviewedAt: "asc" } },
    },
  });
  const stateOrder: Readonly<Record<DomainAlertState, number>> = {
    open: 0,
    reviewed: 1,
    actioned: 2,
    resolved: 3,
    "dismissed-with-reason": 4,
  };
  return alerts
    .map((alert) => ({
      id: alert.id,
      evaluationId: alert.evaluationId,
      episodeId: alert.episodeId,
      ruleKey: alert.definition.ruleKey,
      ruleName: alert.definition.name,
      ruleVersionId: alert.ruleVersionId,
      ruleVersionNumber: alert.ruleVersionNumber,
      provenance: readAlertProvenance(alert.inputReferences),
      explanation: alert.explanation,
      administrativeSeverity: alert.administrativeSeverity.toLowerCase(),
      reviewOwner: alert.reviewOwner.toLowerCase(),
      triggeredAt: alert.triggeredAt,
      state: alertStateFromPrisma(alert.currentState),
      reviews: alert.reviews.map((review) => ({
        id: review.id,
        fromState: alertStateFromPrisma(review.fromState),
        toState: alertStateFromPrisma(review.toState),
        reason: review.reason,
        reviewedAt: review.reviewedAt,
      })),
    }))
    .sort(
      (left, right) =>
        stateOrder[left.state] - stateOrder[right.state] ||
        left.ruleName.localeCompare(right.ruleName) ||
        right.triggeredAt.getTime() - left.triggeredAt.getTime(),
    );
}
