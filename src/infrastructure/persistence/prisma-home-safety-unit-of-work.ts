import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  HomeSafetyTransaction,
  HomeSafetyUnitOfWork,
} from "@/application/ports/home-safety-unit-of-work";
import { HomeSafetyConflictError } from "@/application/home-safety/manage-home-safety";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { prisma } from "@/infrastructure/persistence/prisma";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export class PrismaHomeSafetyUnitOfWork implements HomeSafetyUnitOfWork {
  async run<T>(operation: (transaction: HomeSafetyTransaction) => Promise<T>): Promise<T> {
    try {
      return await prisma.$transaction(
        async (transaction) => operation(this.transaction(transaction)),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw new HomeSafetyConflictError();
      }
      throw error;
    }
  }

  private transaction(transaction: TransactionClient): HomeSafetyTransaction {
    return {
      async isActiveUserWithRole(userId, role) {
        return (
          (await transaction.user.count({
            where: {
              id: userId,
              isActive: true,
              roleAssignments: { some: { role, revokedAt: null } },
            },
          })) === 1
        );
      },
      async getEpisode(episodeId) {
        const episode = await transaction.dischargeEpisode.findUnique({
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
      },
      async getLatestVersionNumber(episodeId) {
        const latest = await transaction.homeSafetyReviewVersion.findFirst({
          where: { dischargeEpisodeId: episodeId },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });
        return latest?.versionNumber ?? 0;
      },
      async createVersion(input) {
        return transaction.homeSafetyReviewVersion.create({
          data: {
            dischargeEpisodeId: input.episodeId,
            versionNumber: input.versionNumber,
            templateKey: input.templateKey,
            templateVersion: input.templateVersion,
            informationalPurposeAcknowledged: input.informationalPurposeAcknowledged,
            humanReviewed: input.humanReviewed,
            actorUserId: input.actorUserId,
            recordedAt: input.recordedAt,
            items: { create: [...input.items] },
          },
          select: { id: true },
        });
      },
      async appendAuditEvent(input) {
        return transaction.auditEvent.create({ data: input, select: { id: true } });
      },
    };
  }
}

export async function listHomeSafetyVersions(principal: AuthenticatedPrincipal, episodeId: string) {
  const professionalRoles = principal.roles.filter(
    (role): role is "nurse" | "clinician" => role === "nurse" || role === "clinician",
  );
  if (professionalRoles.length === 0) return null;
  const episode = await prisma.dischargeEpisode.findFirst({
    where: {
      id: episodeId,
      patient: { isSynthetic: true },
      OR: [{ responsibleNurseId: principal.userId }, { responsibleClinicianId: principal.userId }],
    },
    select: { id: true },
  });
  const activeRole = await prisma.user.count({
    where: {
      id: principal.userId,
      isActive: true,
      roleAssignments: { some: { role: { in: professionalRoles }, revokedAt: null } },
    },
  });
  if (!episode || activeRole !== 1) return null;
  return prisma.homeSafetyReviewVersion.findMany({
    where: { dischargeEpisodeId: episodeId },
    orderBy: { versionNumber: "desc" },
    include: {
      actor: { select: { syntheticAlias: true } },
      items: { orderBy: { itemKey: "asc" } },
    },
  });
}
