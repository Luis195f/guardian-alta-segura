import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import {
  canAuthorSafetyPlan,
  InvalidSafetyPlanError,
  type SafetyPlanSectionDraft,
  validateSafetyPlanSections,
} from "@/domain/safety-plan/safety-plan";
import type {
  SafetyPlanAccessContext,
  SafetyPlanTransaction,
  SafetyPlanUnitOfWork,
} from "@/application/ports/safety-plan-unit-of-work";

export class SafetyPlanDeniedError extends Error {}
export class SafetyPlanNotFoundError extends Error {}
export class SafetyPlanConcurrencyConflictError extends Error {}
export class SafetyPlanInvalidStateError extends Error {}

function actorRole(actor: AuthenticatedPrincipal): "nurse" | "clinician" {
  const role = actor.roles.find((item) => item === "nurse" || item === "clinician");
  if (!role || !canAuthorSafetyPlan(actor.roles)) throw new SafetyPlanDeniedError();
  return role;
}

async function authorizeMutation(
  transaction: SafetyPlanTransaction,
  actor: AuthenticatedPrincipal,
  episodeId: string,
): Promise<{ readonly role: "nurse" | "clinician"; readonly context: SafetyPlanAccessContext }> {
  const role = actorRole(actor);
  const context = await transaction.getEpisodeAccess(episodeId);
  if (!context) throw new SafetyPlanNotFoundError();
  if (!context.patientIsSynthetic)
    throw new InvalidSafetyPlanError("Demo accepts synthetic data only");
  if (
    actor.userId !== context.responsibleNurseId &&
    actor.userId !== context.responsibleClinicianId
  ) {
    throw new SafetyPlanDeniedError();
  }
  if (!(await transaction.isActiveUserWithRole(actor.userId, role as Role))) {
    throw new SafetyPlanDeniedError();
  }
  return { role, context };
}

function assertCommonInput(input: {
  readonly expectedPlanRevision: number;
  readonly correlationId: string;
}): void {
  if (!Number.isInteger(input.expectedPlanRevision) || input.expectedPlanRevision < 0) {
    throw new InvalidSafetyPlanError("Expected plan revision is invalid");
  }
  if (!/^[0-9a-f-]{36}$/iu.test(input.correlationId)) {
    throw new InvalidSafetyPlanError("Correlation ID is invalid");
  }
}

export class CreateSafetyPlanVersionService {
  constructor(private readonly unitOfWork: SafetyPlanUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly expectedPlanRevision: number;
    readonly sections: readonly SafetyPlanSectionDraft[];
    readonly correlationId: string;
  }) {
    assertCommonInput(input);
    const sections = validateSafetyPlanSections(input.sections);
    return this.unitOfWork.run(async (transaction) => {
      const { role } = await authorizeMutation(transaction, input.actor, input.episodeId);
      const plan = await transaction.ensurePlan(input.episodeId, input.actor.userId);
      if (plan.revision !== input.expectedPlanRevision) {
        throw new SafetyPlanConcurrencyConflictError();
      }
      const claimed = await transaction.claimNextVersion(plan.id, input.expectedPlanRevision);
      if (!claimed) throw new SafetyPlanConcurrencyConflictError();
      const occurredAt = new Date();
      const version = await transaction.createVersion({
        safetyPlanId: plan.id,
        versionNumber: claimed.versionNumber,
        basedOnVersion: plan.currentVersion || null,
        createdById: input.actor.userId,
        sections,
        occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action: "SAFETY_PLAN_VERSION_CREATED",
        resourceType: "SafetyPlanVersion",
        resourceId: version.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      return {
        safetyPlanId: plan.id,
        versionNumber: claimed.versionNumber,
        planRevision: claimed.revision,
      };
    });
  }
}

export class ChangeSafetyPlanVersionStateService {
  constructor(private readonly unitOfWork: SafetyPlanUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly versionNumber: number;
    readonly action: "activate" | "invalidate";
    readonly reason?: string | null;
    readonly expectedPlanRevision: number;
    readonly correlationId: string;
  }) {
    assertCommonInput(input);
    if (!Number.isInteger(input.versionNumber) || input.versionNumber < 1) {
      throw new InvalidSafetyPlanError("Version number is invalid");
    }
    const reason = input.reason?.trim() || null;
    if (input.action === "invalidate" && (!reason || reason.length < 3 || reason.length > 500)) {
      throw new InvalidSafetyPlanError("Invalidation requires a documented reason");
    }
    return this.unitOfWork.run(async (transaction) => {
      const { role } = await authorizeMutation(transaction, input.actor, input.episodeId);
      const plan = await transaction.findPlanByEpisode(input.episodeId);
      if (!plan) throw new SafetyPlanNotFoundError();
      if (plan.revision !== input.expectedPlanRevision) {
        throw new SafetyPlanConcurrencyConflictError();
      }
      const version = await transaction.getVersion(plan.id, input.versionNumber);
      if (!version) throw new SafetyPlanNotFoundError();
      if (input.action === "activate" && version.state !== "DRAFT") {
        throw new SafetyPlanInvalidStateError();
      }
      if (input.action === "invalidate" && version.state === "INVALIDATED") {
        throw new SafetyPlanInvalidStateError();
      }

      const nextActive =
        input.action === "activate"
          ? input.versionNumber
          : plan.activeVersionNumber === input.versionNumber
            ? null
            : plan.activeVersionNumber;
      const revision = await transaction.claimLifecycleChange(
        plan.id,
        input.expectedPlanRevision,
        nextActive,
      );
      if (revision === null) throw new SafetyPlanConcurrencyConflictError();
      const occurredAt = new Date();

      if (input.action === "activate" && plan.activeVersionNumber !== null) {
        const previous = await transaction.getVersion(plan.id, plan.activeVersionNumber);
        if (previous?.state === "ACTIVE") {
          await transaction.appendStateChange({
            safetyPlanVersionId: previous.id,
            resultingState: "SUPERSEDED",
            reason: null,
            actorUserId: input.actor.userId,
            occurredAt,
          });
        }
      }
      await transaction.appendStateChange({
        safetyPlanVersionId: version.id,
        resultingState: input.action === "activate" ? "ACTIVE" : "INVALIDATED",
        reason: input.action === "invalidate" ? reason : null,
        actorUserId: input.actor.userId,
        occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: role,
        action:
          input.action === "activate"
            ? "SAFETY_PLAN_VERSION_ACTIVATED"
            : "SAFETY_PLAN_VERSION_INVALIDATED",
        resourceType: "SafetyPlanVersion",
        resourceId: version.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      return {
        safetyPlanId: plan.id,
        versionNumber: input.versionNumber,
        planRevision: revision,
        state: input.action === "activate" ? ("ACTIVE" as const) : ("INVALIDATED" as const),
      };
    });
  }
}
