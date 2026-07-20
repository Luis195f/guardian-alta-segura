import { createHash } from "node:crypto";

import type {
  ExplainableAlertsTransaction,
  ExplainableAlertsUnitOfWork,
  RecordedEvaluation,
} from "@/application/ports/explainable-alerts-unit-of-work";
import {
  assertAlertStateTransition,
  evaluateExplainableRule,
  type AlertState,
  type ExplainableRuleDsl,
  ExplainableRuleValidationError,
  type ReferencedRuleInput,
  validateExplainableRuleDsl,
} from "@/domain/alerts/explainable-rule";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";

export class ExplainableAlertDeniedError extends Error {}
export class ExplainableAlertInvalidError extends Error {}
export class ExplainableAlertNotFoundError extends Error {}
export class ExplainableAlertConflictError extends Error {}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]),
  );
}

function fingerprintEvaluationRequest(input: {
  readonly ruleVersionId: string;
  readonly episodeId: string;
  readonly inputs: readonly ReferencedRuleInput[];
}): string {
  const normalizedInputs = input.inputs
    .map((item) => canonicalize(item))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonicalize({
          operation: "evaluate-explainable-rule",
          ruleVersionId: input.ruleVersionId,
          episodeId: input.episodeId,
          inputs: normalizedInputs,
        }),
      ),
    )
    .digest("hex");
}

function validateIdempotencyKey(value: string): string {
  const key = value.trim();
  if (!/^[A-Za-z0-9._:-]{8,112}$/.test(key)) {
    throw new ExplainableAlertInvalidError("Invalid idempotency key");
  }
  return key;
}

function resultForIdempotentEvaluation(
  evaluation: RecordedEvaluation,
  expected: {
    readonly actorUserId: string;
    readonly ruleVersionId: string;
    readonly episodeId: string;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
  },
) {
  if (
    evaluation.evaluatedById !== expected.actorUserId ||
    evaluation.ruleVersionId !== expected.ruleVersionId ||
    evaluation.episodeId !== expected.episodeId ||
    evaluation.idempotencyKey !== expected.idempotencyKey ||
    evaluation.requestFingerprint !== expected.requestFingerprint
  ) {
    throw new ExplainableAlertConflictError(
      "Idempotency key already identifies another rule evaluation",
    );
  }
  return {
    evaluationId: evaluation.evaluationId,
    alertId: evaluation.alertId,
    outcome: evaluation.outcome,
    missingInputs: evaluation.missingInputs,
    idempotent: true,
  } as const;
}

function requireRole(actor: AuthenticatedPrincipal, allowed: readonly Role[]): Role {
  const role = actor.roles.find((candidate) => allowed.includes(candidate));
  if (!role) throw new ExplainableAlertDeniedError("Explainable alert access denied");
  return role;
}

async function assertActiveRole(
  transaction: ExplainableAlertsTransaction,
  actor: AuthenticatedPrincipal,
  role: Role,
): Promise<void> {
  if (!(await transaction.isActiveUserWithRole(actor.userId, role))) {
    throw new ExplainableAlertDeniedError("Actor role is no longer active");
  }
}

function assertAssignedToEpisode(
  actor: AuthenticatedPrincipal,
  episode: {
    readonly responsibleNurseId: string;
    readonly responsibleClinicianId: string;
  },
): void {
  if (
    episode.responsibleNurseId !== actor.userId &&
    episode.responsibleClinicianId !== actor.userId
  ) {
    throw new ExplainableAlertDeniedError("Actor is not assigned to episode");
  }
}

function validateRuleKey(ruleKey: string): string {
  const normalized = ruleKey.trim();
  if (!/^[a-z][a-z0-9-]{2,63}$/.test(normalized)) {
    throw new ExplainableAlertInvalidError("Invalid rule key");
  }
  return normalized;
}

function validateName(name: string): string {
  const normalized = name.trim();
  if (normalized.length < 5 || normalized.length > 160) {
    throw new ExplainableAlertInvalidError("Invalid rule name");
  }
  return normalized;
}

function validateApprovalReference(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9._:/-]{3,128}$/.test(normalized)) {
    throw new ExplainableAlertInvalidError("Invalid approval reference");
  }
  return normalized;
}

function auditActionForAlertState(
  state: Exclude<AlertState, "open">,
): "ALERT_REVIEWED" | "ALERT_ACTION_RECORDED" | "ALERT_RESOLVED" | "ALERT_DISMISSED" {
  if (state === "reviewed") return "ALERT_REVIEWED";
  if (state === "actioned") return "ALERT_ACTION_RECORDED";
  if (state === "resolved") return "ALERT_RESOLVED";
  return "ALERT_DISMISSED";
}

export class CreateRuleVersionService {
  constructor(private readonly unitOfWork: ExplainableAlertsUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly ruleKey: string;
    readonly name: string;
    readonly basedOnVersionId?: string | null;
    readonly dsl: ExplainableRuleDsl;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{
    readonly ruleDefinitionId: string;
    readonly ruleVersionId: string;
    readonly versionNumber: number;
  }> {
    const role = requireRole(input.actor, ["admin"]);
    const ruleKey = validateRuleKey(input.ruleKey);
    const name = validateName(input.name);
    let dsl: ExplainableRuleDsl;
    try {
      dsl = validateExplainableRuleDsl(input.dsl);
    } catch (error) {
      if (error instanceof ExplainableRuleValidationError) {
        throw new ExplainableAlertInvalidError(error.message);
      }
      throw error;
    }
    const createdAt = input.now ?? new Date();

    return this.unitOfWork.run(async (transaction) => {
      await assertActiveRole(transaction, input.actor, role);
      const definition =
        (await transaction.findDefinitionByKey(ruleKey)) ??
        (await transaction.createDefinition({
          ruleKey,
          name,
          isSyntheticFixture: true,
          createdById: input.actor.userId,
          createdAt,
        }));
      if (!definition.isSyntheticFixture) {
        throw new ExplainableAlertDeniedError("Demo rule catalog requires synthetic fixtures");
      }
      if (definition.name !== name) {
        throw new ExplainableAlertConflictError(
          "An existing rule definition cannot be renamed by a new version",
        );
      }
      const latest = await transaction.getLatestVersion(definition.id);
      if (latest && (!input.basedOnVersionId || input.basedOnVersionId !== latest.id)) {
        throw new ExplainableAlertConflictError(
          "A new rule version must derive from the current latest version",
        );
      }
      if (!latest && input.basedOnVersionId) {
        throw new ExplainableAlertConflictError("First rule version cannot have a base");
      }
      const version = await transaction.createVersion({
        definitionId: definition.id,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        state: "draft",
        basedOnVersionId: latest?.id ?? null,
        dsl,
        createdById: input.actor.userId,
        createdAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "RULE_VERSION_CREATED",
        resourceType: "RuleVersion",
        resourceId: version.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt,
      });
      return {
        ruleDefinitionId: definition.id,
        ruleVersionId: version.id,
        versionNumber: version.versionNumber,
      };
    });
  }
}

export class ApproveRuleVersionService {
  constructor(private readonly unitOfWork: ExplainableAlertsUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly ruleVersionId: string;
    readonly approvalReference: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly ruleVersionId: string; readonly state: "approved" }> {
    const role = requireRole(input.actor, ["clinician"]);
    const approvalReference = validateApprovalReference(input.approvalReference);
    const approvedAt = input.now ?? new Date();
    return this.unitOfWork.run(async (transaction) => {
      await assertActiveRole(transaction, input.actor, role);
      const version = await transaction.getVersion(input.ruleVersionId);
      if (!version) throw new ExplainableAlertNotFoundError("Rule version not found");
      if (version.state !== "draft" || version.approval) {
        throw new ExplainableAlertConflictError("Only an unapproved draft can be approved");
      }
      const approved = await transaction.approveVersion({
        versionId: version.id,
        approvedById: input.actor.userId,
        approvedAt,
        approvalReference,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "RULE_VERSION_APPROVED",
        resourceType: "RuleVersion",
        resourceId: approved.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: approvedAt,
      });
      return { ruleVersionId: approved.id, state: "approved" };
    });
  }
}

export class ActivateRuleVersionService {
  constructor(private readonly unitOfWork: ExplainableAlertsUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly ruleVersionId: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly ruleVersionId: string; readonly state: "active" }> {
    const role = requireRole(input.actor, ["admin"]);
    const activatedAt = input.now ?? new Date();
    return this.unitOfWork.run(async (transaction) => {
      await assertActiveRole(transaction, input.actor, role);
      const version = await transaction.getVersion(input.ruleVersionId);
      if (!version) throw new ExplainableAlertNotFoundError("Rule version not found");
      if (version.state !== "approved" || !version.approval) {
        throw new ExplainableAlertConflictError(
          "Rule requires recorded approval before activation",
        );
      }
      const activated = await transaction.activateVersion({
        definitionId: version.definitionId,
        versionId: version.id,
        activatedAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "RULE_VERSION_ACTIVATED",
        resourceType: "RuleVersion",
        resourceId: activated.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: activatedAt,
      });
      return { ruleVersionId: activated.id, state: "active" };
    });
  }
}

export class EvaluateRuleService {
  constructor(private readonly unitOfWork: ExplainableAlertsUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly ruleVersionId: string;
    readonly episodeId: string;
    readonly inputs: readonly ReferencedRuleInput[];
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly evaluatedAt?: Date;
  }): Promise<{
    readonly evaluationId: string;
    readonly alertId: string | null;
    readonly outcome: "matched" | "not-matched" | "abstained";
    readonly missingInputs: readonly string[];
    readonly idempotent: boolean;
  }> {
    const role = requireRole(input.actor, ["nurse", "clinician"]);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const evaluatedAt = input.evaluatedAt ?? new Date();
    const requestFingerprint = fingerprintEvaluationRequest({
      ruleVersionId: input.ruleVersionId,
      episodeId: input.episodeId,
      inputs: input.inputs,
    });
    const expectedEvaluation = {
      actorUserId: input.actor.userId,
      ruleVersionId: input.ruleVersionId,
      episodeId: input.episodeId,
      idempotencyKey,
      requestFingerprint,
    };
    return this.unitOfWork.run(async (transaction) => {
      await assertActiveRole(transaction, input.actor, role);
      const [version, episode] = await Promise.all([
        transaction.getVersion(input.ruleVersionId),
        transaction.getEpisode(input.episodeId),
      ]);
      if (!version || !episode) {
        throw new ExplainableAlertNotFoundError("Rule version or episode not found");
      }
      if (!episode.isSynthetic) {
        throw new ExplainableAlertDeniedError("Demo evaluation requires a synthetic episode");
      }
      assertAssignedToEpisode(input.actor, episode);
      const existing = await transaction.findEvaluationByIdempotency(
        input.actor.userId,
        idempotencyKey,
      );
      if (existing) {
        return resultForIdempotentEvaluation(existing, expectedEvaluation);
      }
      if (version.state !== "active" || !version.approval) {
        throw new ExplainableAlertConflictError("Only an approved active rule can execute");
      }
      let result;
      try {
        result = evaluateExplainableRule({
          definitionId: version.definitionId,
          ruleVersionId: version.id,
          ruleVersionNumber: version.versionNumber,
          dsl: version.dsl,
          evaluatedAt,
          inputs: input.inputs,
        });
      } catch (error) {
        if (error instanceof ExplainableRuleValidationError) {
          throw new ExplainableAlertInvalidError(error.message);
        }
        throw error;
      }
      const recorded = await transaction.recordEvaluation({
        ruleDefinitionId: version.definitionId,
        ruleVersionId: version.id,
        ruleVersionNumber: version.versionNumber,
        episodeId: episode.id,
        evaluatedById: input.actor.userId,
        idempotencyKey,
        requestFingerprint,
        evaluatedAt,
        inputSnapshot: result.normalizedInputs,
        inputHash: result.inputHash,
        outcome: result.outcome,
        missingInputs: result.missingInputs,
        alert:
          result.outcome === "matched" && result.explanation
            ? {
                inputReferences: result.referencedInputs,
                explanation: result.explanation,
                administrativeSeverity: version.dsl.administrativeSeverity,
                reviewOwner: version.dsl.reviewOwner,
                triggeredAt: evaluatedAt,
              }
            : null,
      });
      if (!recorded.created) {
        return resultForIdempotentEvaluation(recorded, expectedEvaluation);
      }
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "RULE_EVALUATED",
        resourceType: "RuleEvaluation",
        resourceId: recorded.evaluationId,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: evaluatedAt,
      });
      if (recorded.alertId) {
        await transaction.appendAuditEvent({
          actorUserId: input.actor.userId,
          actorRole: role,
          action: "ALERT_CREATED",
          resourceType: "Alert",
          resourceId: recorded.alertId,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt: evaluatedAt,
        });
      }
      return {
        evaluationId: recorded.evaluationId,
        alertId: recorded.alertId,
        outcome: result.outcome,
        missingInputs: result.missingInputs,
        idempotent: false,
      };
    });
  }
}

export class ReviewAlertService {
  constructor(private readonly unitOfWork: ExplainableAlertsUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly alertId: string;
    readonly nextState: Exclude<AlertState, "open">;
    readonly reason?: string | null;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{ readonly alertId: string; readonly reviewId: string; readonly state: AlertState }> {
    const role = requireRole(input.actor, ["nurse", "clinician"]);
    const reviewedAt = input.now ?? new Date();
    return this.unitOfWork.run(async (transaction) => {
      await assertActiveRole(transaction, input.actor, role);
      const alert = await transaction.getAlert(input.alertId);
      if (!alert) throw new ExplainableAlertNotFoundError("Alert not found");
      assertAssignedToEpisode(input.actor, alert);
      const reason = input.reason?.trim() || null;
      try {
        assertAlertStateTransition(alert.currentState, input.nextState, reason);
      } catch (error) {
        if (error instanceof ExplainableRuleValidationError) {
          throw new ExplainableAlertInvalidError(error.message);
        }
        throw error;
      }
      const review = await transaction.appendAlertReview({
        alertId: alert.id,
        fromState: alert.currentState,
        toState: input.nextState,
        reason,
        reviewedById: input.actor.userId,
        reviewedAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: auditActionForAlertState(input.nextState),
        resourceType: "Alert",
        resourceId: alert.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: reviewedAt,
      });
      return { alertId: alert.id, reviewId: review.reviewId, state: input.nextState };
    });
  }
}
