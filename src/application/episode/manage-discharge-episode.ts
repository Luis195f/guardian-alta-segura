import { createHash } from "node:crypto";

import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { EpisodeClosurePolicy } from "@/domain/episode/activation-policy";
import { isIdentityEligibleForActivation } from "@/domain/episode/activation-policy";
import {
  assertLegalEpisodeTransition,
  isProgramLengthDays,
  normalizeRequiredReason,
  selectEpisodeActorRole,
  type EpisodeStatus,
  type ProgramLengthDays,
} from "@/domain/episode/discharge-episode";
import type { EpisodeUnitOfWork } from "@/application/ports/episode-unit-of-work";

export class EpisodeDeniedError extends Error {}
export class EpisodeInvalidError extends Error {}
export class EpisodeNotFoundError extends Error {}
export class EpisodeConcurrencyConflictError extends Error {}
export class EpisodeIdempotencyConflictError extends Error {}
export class EpisodeIdentityNotVerifiedError extends Error {}
export class EpisodeResponsibleProfessionalsError extends Error {}
export class EpisodeClosureBlockedError extends Error {}

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
    private readonly closurePolicy: EpisodeClosurePolicy,
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
      assertLegalEpisodeTransition(episode.status, input.targetStatus);
      await assertActiveProfessionals(
        transaction,
        input.actor,
        actorRole,
        episode.responsibleNurseId,
        episode.responsibleClinicianId,
      );
      if (input.targetStatus === "ACTIVE" && !isIdentityEligibleForActivation(episode.identity)) {
        throw new EpisodeIdentityNotVerifiedError("Identity policy does not permit activation");
      }
      if (input.targetStatus === "CLOSED") {
        const decision = await this.closurePolicy.evaluate(episode.id);
        if (!decision.allowed) throw new EpisodeClosureBlockedError(decision.reason);
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
