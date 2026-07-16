import { Prisma } from "@prisma/client";

import { EpisodeIdempotencyConflictError } from "@/application/episode/manage-discharge-episode";
import type {
  EpisodeRecord,
  EpisodeTransaction,
  EpisodeUnitOfWork,
} from "@/application/ports/episode-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type {
  EpisodeActorRole,
  EpisodeStatus,
  ProgramLengthDays,
} from "@/domain/episode/discharge-episode";
import { prisma } from "@/infrastructure/persistence/prisma";

const episodeContextInclude = {
  patient: { include: { identityVerificationPolicyVersion: true } },
} satisfies Prisma.DischargeEpisodeInclude;

type EpisodeWithIdentity = Prisma.DischargeEpisodeGetPayload<{
  include: typeof episodeContextInclude;
}>;

function toEpisodeRecord(episode: EpisodeWithIdentity): EpisodeRecord {
  const policy = episode.patient.identityVerificationPolicyVersion;
  return {
    id: episode.id,
    patientId: episode.patientId,
    dischargeDate: episode.dischargeDate,
    programLengthDays: episode.programLengthDays as ProgramLengthDays,
    responsibleNurseId: episode.responsibleNurseId,
    responsibleClinicianId: episode.responsibleClinicianId,
    status: episode.status as EpisodeStatus,
    version: episode.version,
    identity: {
      patientIsSynthetic: episode.patient.isSynthetic,
      patientState: episode.patient.identityVerificationState,
      policyState: policy?.state ?? null,
      acceptedState: policy?.acceptedState ?? null,
      processCode: policy?.processCode ?? null,
      processVersion: policy?.processVersion ?? null,
      policyIsSyntheticDemo: policy?.isSyntheticDemo ?? null,
      identityVerifiedAt: episode.patient.identityVerifiedAt,
      identityVerifiedById: episode.patient.identityVerifiedById,
    },
  };
}

class PrismaEpisodeTransaction implements EpisodeTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async isActiveUserWithRole(userId: string, role: Role): Promise<boolean> {
    const user = await this.transaction.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        roleAssignments: { some: { role, revokedAt: null } },
      },
      select: { id: true },
    });
    return user !== null;
  }

  async findPatientByExternalId(externalPseudonymousId: string) {
    return this.transaction.patient.findUnique({
      where: { externalPseudonymousId },
      select: { id: true, isSynthetic: true },
    });
  }

  async createEpisode(input: {
    readonly patientId: string;
    readonly dischargeDate: Date;
    readonly programLengthDays: ProgramLengthDays;
    readonly responsibleNurseId: string;
    readonly responsibleClinicianId: string;
    readonly createdById: string;
  }): Promise<EpisodeRecord> {
    const episode = await this.transaction.dischargeEpisode.create({
      data: input,
      include: episodeContextInclude,
    });
    return toEpisodeRecord(episode);
  }

  async getEpisodeForTransition(episodeId: string): Promise<EpisodeRecord | null> {
    const episode = await this.transaction.dischargeEpisode.findUnique({
      where: { id: episodeId },
      include: episodeContextInclude,
    });
    return episode ? toEpisodeRecord(episode) : null;
  }

  async findIdempotentTransition(actorUserId: string, idempotencyKey: string) {
    return this.transaction.episodeTransition.findUnique({
      where: { actorUserId_idempotencyKey: { actorUserId, idempotencyKey } },
      select: {
        episodeId: true,
        requestFingerprint: true,
        toStatus: true,
        resultingVersion: true,
      },
    });
  }

  async updateEpisodeStatus(input: {
    readonly episodeId: string;
    readonly fromStatus: EpisodeStatus;
    readonly toStatus: EpisodeStatus;
    readonly expectedVersion: number;
    readonly actorUserId: string;
    readonly closedReason: string | null;
    readonly occurredAt: Date;
  }): Promise<boolean> {
    const closing = input.toStatus === "CLOSED";
    const result = await this.transaction.dischargeEpisode.updateMany({
      where: {
        id: input.episodeId,
        status: input.fromStatus,
        version: input.expectedVersion,
      },
      data: {
        status: input.toStatus,
        version: { increment: 1 },
        closedReason: closing ? input.closedReason : null,
        closedById: closing ? input.actorUserId : null,
        closedAt: closing ? input.occurredAt : null,
      },
    });
    return result.count === 1;
  }

  async createTransition(input: {
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
  }): Promise<{ readonly id: string }> {
    try {
      return await this.transaction.episodeTransition.create({
        data: input,
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new EpisodeIdempotencyConflictError("Duplicate episode transition");
      }
      throw error;
    }
  }

  async appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }> {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }
}

export class PrismaEpisodeUnitOfWork implements EpisodeUnitOfWork {
  async run<T>(operation: (transaction: EpisodeTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction((transaction) =>
      operation(new PrismaEpisodeTransaction(transaction)),
    );
  }
}

export async function listAssignedEpisodes(actorUserId: string) {
  return prisma.dischargeEpisode.findMany({
    where: {
      OR: [{ responsibleNurseId: actorUserId }, { responsibleClinicianId: actorUserId }],
    },
    select: {
      id: true,
      dischargeDate: true,
      programLengthDays: true,
      status: true,
      version: true,
      updatedAt: true,
      patient: { select: { externalPseudonymousId: true, isSynthetic: true } },
      responsibleNurse: { select: { syntheticAlias: true } },
      responsibleClinician: { select: { syntheticAlias: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAssignedEpisodeDetail(episodeId: string, actorUserId: string) {
  return prisma.dischargeEpisode.findFirst({
    where: {
      id: episodeId,
      OR: [{ responsibleNurseId: actorUserId }, { responsibleClinicianId: actorUserId }],
    },
    include: {
      patient: { select: { externalPseudonymousId: true, isSynthetic: true } },
      responsibleNurse: { select: { syntheticAlias: true } },
      responsibleClinician: { select: { syntheticAlias: true } },
      createdBy: { select: { syntheticAlias: true } },
      closedBy: { select: { syntheticAlias: true } },
      transitions: {
        include: { actor: { select: { syntheticAlias: true } } },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
}
