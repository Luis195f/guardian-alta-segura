import { createHash } from "node:crypto";

import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import {
  EPISODE_CLOSURE_INSTITUTIONAL_DECISION,
  failClosedEpisodeGovernanceView,
  isIdentityEligibleForActivation,
  type EpisodeGovernanceBlockerCode,
  type EpisodeGovernanceInput,
  type EpisodeGovernancePolicy,
  type EpisodeGovernanceView,
} from "@/domain/episode/activation-policy";
import {
  assertLegalEpisodeTransition,
  isProgramLengthDays,
  normalizeRequiredReason,
  selectEpisodeActorRole,
  type EpisodeStatus,
  type ProgramLengthDays,
} from "@/domain/episode/discharge-episode";
import type { EpisodeRecord, EpisodeUnitOfWork } from "@/application/ports/episode-unit-of-work";

export class EpisodeDeniedError extends Error {}
export class EpisodeInvalidError extends Error {}
export class EpisodeNotFoundError extends Error {}
export class EpisodeConcurrencyConflictError extends Error {}
export class EpisodeIdempotencyConflictError extends Error {}
export class EpisodeIdentityNotVerifiedError extends Error {}
export class EpisodeResponsibleProfessionalsError extends Error {}
export class EpisodeClosureBlockedError extends Error {
  constructor(readonly blockerCodes: readonly EpisodeGovernanceBlockerCode[]) {
    super("Episode closure is not authorized by governance");
  }
}

function fingerprint(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validateIdempotencyKey(value: string): string {
  const key = value.trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    throw new EpisodeInvalidError("Invalid idempotency key");
  }
  return key;
}

function validateDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new EpisodeInvalidError("Invalid date");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new EpisodeInvalidError("Invalid date");
  }
  return parsed;
}

function normalizeOptionalReason(value: string | null | undefined): string | null {
  const reason = value?.trim() ?? "";
  if (reason.length > 500) throw new EpisodeInvalidError("Reason is too long");
  return reason || null;
}

function requireActor(actor: AuthenticatedPrincipal) {
  const actorRole = selectEpisodeActorRole(actor.roles);
  if (!actorRole) throw new EpisodeDeniedError("Episode access denied");
  return actorRole;
}

async function assertActiveProfessionals(
  transaction: Parameters<Parameters<EpisodeUnitOfWork["run"]>[0]>[0],
  actor: AuthenticatedPrincipal,
  actorRole: "nurse" | "clinician",
  nurseId: string,
  clinicianId: string,
): Promise<void> {
  const [activeActor, activeNurse, activeClinician] = await Promise.all([
    transaction.isActiveUserWithRole(actor.userId, actorRole),
    transaction.isActiveUserWithRole(nurseId, "nurse"),
    transaction.isActiveUserWithRole(clinicianId, "clinician"),
  ]);
  if (!activeActor) throw new EpisodeDeniedError("Actor role is no longer active");
  if (!activeNurse || !activeClinician) {
    throw new EpisodeResponsibleProfessionalsError("Responsible professionals are required");
  }
}

async function governanceInput(
  transaction: Parameters<Parameters<EpisodeUnitOfWork["run"]>[0]>[0],
  episode: EpisodeRecord,
  correlationId: string,
  evaluatedAt: Date,
): Promise<EpisodeGovernanceInput> {
  const facts = await transaction.getEpisodeGovernanceFacts(episode.id);
  return {
    episode: {
      id: episode.id,
      version: episode.version,
      status: episode.status,
      responsibleNurseId: episode.responsibleNurseId,
      responsibleClinicianId: episode.responsibleClinicianId,
      checkInProtocolVersionId: episode.checkInProtocolVersionId,
      identity: episode.identity,
    },
    ...facts,
    evaluatedAt,
    correlationId,
  };
}

function isGovernanceViewConsistent(
  view: EpisodeGovernanceView,
  input: EpisodeGovernanceInput,
): boolean {
  if (
    view.episodeId !== input.episode.id ||
    view.episodeVersion !== input.episode.version ||
    view.episodeStatus !== input.episode.status ||
    view.transitionDecision.targetStatus !== "CLOSED"
  ) {
    return false;
  }
  if (
    view.transitionDecision.authorization === "AUTHORIZED" &&
    (!view.organizationallyGoverned ||
      view.blockers.length > 0 ||
      view.pendingInstitutionalDecisions.length > 0)
  ) {
    return false;
  }
  return true;
}

async function evaluateGovernance(
  policy: EpisodeGovernancePolicy | null,
  input: EpisodeGovernanceInput,
): Promise<EpisodeGovernanceView> {
  if (!policy) {
    return failClosedEpisodeGovernanceView(input, "GOVERNANCE_POLICY_UNAVAILABLE");
  }
  try {
    const view = await policy.evaluate(input);
    return isGovernanceViewConsistent(view, input)
      ? view
      : failClosedEpisodeGovernanceView(input, "GOVERNANCE_STATE_INCONSISTENT");
  } catch {
    return failClosedEpisodeGovernanceView(input, "GOVERNANCE_EVALUATION_FAILED");
  }
}

export class GetEpisodeGovernanceViewService {
  constructor(
    private readonly unitOfWork: EpisodeUnitOfWork,
    private readonly governancePolicy: EpisodeGovernancePolicy | null,
  ) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<EpisodeGovernanceView> {
    const actorRole = requireActor(input.actor);
    if (!input.episodeId) throw new EpisodeInvalidError("Invalid episode governance request");
    const evaluatedAt = input.now ?? new Date();
    return this.unitOfWork.run(async (transaction) => {
      const episode = await transaction.getEpisodeForTransition(input.episodeId);
      if (!episode) throw new EpisodeNotFoundError("Episode not found");
      if (
        input.actor.userId !== episode.responsibleNurseId &&
        input.actor.userId !== episode.responsibleClinicianId
      ) {
        throw new EpisodeDeniedError("Actor is not assigned to episode");
      }
      if (!(await transaction.isActiveUserWithRole(input.actor.userId, actorRole))) {
        throw new EpisodeDeniedError("Actor role is no longer active");
      }
      return evaluateGovernance(
        this.governancePolicy,
        await governanceInput(transaction, episode, input.correlationId, evaluatedAt),
      );
    });
  }
}

export class CreateDischargeEpisodeService {
  constructor(private readonly unitOfWork: EpisodeUnitOfWork) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly externalPseudonymousId: string;
    readonly dischargeDate: string;
    readonly programLengthDays: number;
    readonly responsibleNurseId: string;
    readonly responsibleClinicianId: string;
    readonly checkInProtocolVersionId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{
    readonly episodeId: string;
    readonly version: number;
    readonly idempotent: boolean;
  }> {
    const actorRole = requireActor(input.actor);
    const externalPseudonymousId = input.externalPseudonymousId.trim();
    if (!externalPseudonymousId || externalPseudonymousId.length > 64) {
      throw new EpisodeInvalidError("Invalid pseudonymous id");
    }
    if (!isProgramLengthDays(input.programLengthDays)) {
      throw new EpisodeInvalidError("Program length must be 30, 60 or 90");
    }
    const programLengthDays: ProgramLengthDays = input.programLengthDays;
    const dischargeDate = validateDate(input.dischargeDate);
    if (!input.checkInProtocolVersionId.trim()) {
      throw new EpisodeInvalidError("A check-in protocol version is required");
    }
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const requestFingerprint = fingerprint({
      operation: "create",
      externalPseudonymousId,
      dischargeDate: input.dischargeDate,
      programLengthDays,
      responsibleNurseId: input.responsibleNurseId,
      responsibleClinicianId: input.responsibleClinicianId,
      checkInProtocolVersionId: input.checkInProtocolVersionId,
    });
    const occurredAt = input.now ?? new Date();

    return this.unitOfWork.run(async (transaction) => {
      const existing = await transaction.findIdempotentTransition(
        input.actor.userId,
        idempotencyKey,
      );
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint || existing.toStatus !== "DRAFT") {
          throw new EpisodeIdempotencyConflictError("Idempotency key was reused");
        }
        return {
          episodeId: existing.episodeId,
          version: existing.resultingVersion,
          idempotent: true,
        };
      }
      await assertActiveProfessionals(
        transaction,
        input.actor,
        actorRole,
        input.responsibleNurseId,
        input.responsibleClinicianId,
      );
      if (!(await transaction.isSyntheticDemoCheckInProtocol(input.checkInProtocolVersionId))) {
        throw new EpisodeInvalidError("Synthetic check-in protocol version not found");
      }
      const patient = await transaction.findPatientByExternalId(externalPseudonymousId);
      if (!patient?.isSynthetic) throw new EpisodeNotFoundError("Synthetic patient not found");
      const episode = await transaction.createEpisode({
        patientId: patient.id,
        dischargeDate,
        programLengthDays,
        responsibleNurseId: input.responsibleNurseId,
        responsibleClinicianId: input.responsibleClinicianId,
        createdById: input.actor.userId,
        checkInProtocolVersionId: input.checkInProtocolVersionId,
      });
      const transition = await transaction.createTransition({
        episodeId: episode.id,
        fromStatus: null,
        toStatus: "DRAFT",
        actorUserId: input.actor.userId,
        actorRole,
        reason: null,
        idempotencyKey,
        requestFingerprint,
        resultingVersion: 1,
        occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole,
        action: "EPISODE_CREATED",
        resourceType: "DischargeEpisode",
        resourceId: episode.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      void transition;
      return { episodeId: episode.id, version: 1, idempotent: false };
    });
  }
}

export class TransitionDischargeEpisodeService {
  constructor(
    private readonly unitOfWork: EpisodeUnitOfWork,
    private readonly governancePolicy: EpisodeGovernancePolicy | null,
  ) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly episodeId: string;
    readonly targetStatus: EpisodeStatus;
    readonly expectedVersion: number;
    readonly reason?: string | null;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly now?: Date;
  }): Promise<{
    readonly episodeId: string;
    readonly version: number;
    readonly idempotent: boolean;
  }> {
    const actorRole = requireActor(input.actor);
    if (!input.episodeId || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
      throw new EpisodeInvalidError("Invalid episode transition request");
    }
    let reason: string | null;
    try {
      reason =
        input.targetStatus === "CLOSED"
          ? normalizeRequiredReason(input.reason)
          : normalizeOptionalReason(input.reason);
    } catch {
      throw new EpisodeInvalidError("A closure reason is required");
    }
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const requestFingerprint = fingerprint({
      operation: "transition",
      episodeId: input.episodeId,
      targetStatus: input.targetStatus,
      expectedVersion: input.expectedVersion,
      reason,
    });
    const occurredAt = input.now ?? new Date();

    return this.unitOfWork.run(async (transaction) => {
      const existing = await transaction.findIdempotentTransition(
        input.actor.userId,
        idempotencyKey,
      );
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new EpisodeIdempotencyConflictError("Idempotency key was reused");
        }
        return {
          episodeId: existing.episodeId,
          version: existing.resultingVersion,
          idempotent: true,
        };
      }
      const episode = await transaction.getEpisodeForTransition(input.episodeId);
      if (!episode) throw new EpisodeNotFoundError("Episode not found");
      if (
        input.actor.userId !== episode.responsibleNurseId &&
        input.actor.userId !== episode.responsibleClinicianId
      ) {
        throw new EpisodeDeniedError("Actor is not assigned to episode");
      }
      if (episode.version !== input.expectedVersion) {
        throw new EpisodeConcurrencyConflictError("Episode was edited concurrently");
      }
      assertLegalEpisodeTransition(episode.status, input.targetStatus);
      if (input.targetStatus !== "CLOSED") {
        await assertActiveProfessionals(
          transaction,
          input.actor,
          actorRole,
          episode.responsibleNurseId,
          episode.responsibleClinicianId,
        );
      }
      if (input.targetStatus === "ACTIVE" && !isIdentityEligibleForActivation(episode.identity)) {
        throw new EpisodeIdentityNotVerifiedError("Identity policy does not permit activation");
      }
      if (input.targetStatus === "CLOSED") {
        const governance = await evaluateGovernance(
          this.governancePolicy,
          await governanceInput(transaction, episode, input.correlationId, occurredAt),
        );
        const blockerCodes = governance.blockers.map(({ code }) => code);
        if (
          EPISODE_CLOSURE_INSTITUTIONAL_DECISION.status === "PENDING" &&
          !blockerCodes.includes("DEC_002_EPISODE_CLOSURE_POLICY_PENDING")
        ) {
          blockerCodes.push("DEC_002_EPISODE_CLOSURE_POLICY_PENDING");
        }
        throw new EpisodeClosureBlockedError(blockerCodes);
      }
      const updated = await transaction.updateEpisodeStatus({
        episodeId: episode.id,
        fromStatus: episode.status,
        toStatus: input.targetStatus,
        expectedVersion: input.expectedVersion,
        actorUserId: input.actor.userId,
        closedReason: reason,
        occurredAt,
      });
      if (!updated) throw new EpisodeConcurrencyConflictError("Episode was edited concurrently");
      const resultingVersion = input.expectedVersion + 1;
      await transaction.createTransition({
        episodeId: episode.id,
        fromStatus: episode.status,
        toStatus: input.targetStatus,
        actorUserId: input.actor.userId,
        actorRole,
        reason,
        idempotencyKey,
        requestFingerprint,
        resultingVersion,
        occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole,
        action: "EPISODE_TRANSITIONED",
        resourceType: "DischargeEpisode",
        resourceId: episode.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      return { episodeId: episode.id, version: resultingVersion, idempotent: false };
    });
  }
}
