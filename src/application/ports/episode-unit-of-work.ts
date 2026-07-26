import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type {
  EpisodeGovernanceInput,
  IdentityActivationContext,
} from "@/domain/episode/activation-policy";
import type {
  EpisodeActorRole,
  EpisodeStatus,
  ProgramLengthDays,
} from "@/domain/episode/discharge-episode";

export interface EpisodeRecord {
  readonly id: string;
  readonly patientId: string;
  readonly dischargeDate: Date;
  readonly programLengthDays: ProgramLengthDays;
  readonly responsibleNurseId: string;
  readonly responsibleClinicianId: string;
  readonly status: EpisodeStatus;
  readonly version: number;
  readonly checkInProtocolVersionId: string;
  readonly identity: IdentityActivationContext;
}

export interface IdempotentEpisodeTransition {
  readonly episodeId: string;
  readonly requestFingerprint: string;
  readonly toStatus: EpisodeStatus;
  readonly resultingVersion: number;
}

export interface EpisodeGovernanceFacts {
  readonly responsibleProfessionals: EpisodeGovernanceInput["responsibleProfessionals"];
  readonly checkInProtocol: EpisodeGovernanceInput["checkInProtocol"];
  readonly openObligations: EpisodeGovernanceInput["openObligations"];
}

export interface EpisodeTransaction {
  isActiveUserWithRole(userId: string, role: Role): Promise<boolean>;
  findPatientByExternalId(externalPseudonymousId: string): Promise<{
    readonly id: string;
    readonly isSynthetic: boolean;
  } | null>;
  isSyntheticDemoCheckInProtocol(protocolVersionId: string): Promise<boolean>;
  createEpisode(input: {
    readonly patientId: string;
    readonly dischargeDate: Date;
    readonly programLengthDays: ProgramLengthDays;
    readonly responsibleNurseId: string;
    readonly responsibleClinicianId: string;
    readonly createdById: string;
    readonly checkInProtocolVersionId: string;
  }): Promise<EpisodeRecord>;
  getEpisodeForTransition(episodeId: string): Promise<EpisodeRecord | null>;
  getEpisodeGovernanceFacts(episodeId: string): Promise<EpisodeGovernanceFacts>;
  findIdempotentTransition(
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<IdempotentEpisodeTransition | null>;
  updateEpisodeStatus(input: {
    readonly episodeId: string;
    readonly fromStatus: EpisodeStatus;
    readonly toStatus: EpisodeStatus;
    readonly expectedVersion: number;
    readonly actorUserId: string;
    readonly closedReason: string | null;
    readonly occurredAt: Date;
  }): Promise<boolean>;
  createTransition(input: {
    readonly episodeId: string;
    readonly fromStatus: EpisodeStatus | null;
    readonly toStatus: EpisodeStatus;
    readonly actorUserId: string;
    readonly actorRole: EpisodeActorRole;
    readonly reason: string | null;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly resultingVersion: number;
    readonly occurredAt: Date;
  }): Promise<{ readonly id: string }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
}

export interface EpisodeUnitOfWork {
  run<T>(operation: (transaction: EpisodeTransaction) => Promise<T>): Promise<T>;
}
