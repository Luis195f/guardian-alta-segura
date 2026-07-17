import { Prisma } from "@prisma/client";

import type {
  SafetyPlanRecord,
  SafetyPlanTransaction,
  SafetyPlanUnitOfWork,
  SafetyPlanVersionRecord,
} from "@/application/ports/safety-plan-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import {
  canViewSafetyPlanSection,
  canViewSafetyPlanVersion,
  type SafetyPlanSectionDraft,
  type SafetyPlanVersionState,
} from "@/domain/safety-plan/safety-plan";
import { prisma } from "@/infrastructure/persistence/prisma";

function toPlanRecord(plan: {
  id: string;
  dischargeEpisodeId: string;
  revision: number;
  currentVersion: number;
  activeVersionNumber: number | null;
}): SafetyPlanRecord {
  return plan;
}

class PrismaSafetyPlanTransaction implements SafetyPlanTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async getEpisodeAccess(episodeId: string) {
    const episode = await this.transaction.dischargeEpisode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        responsibleNurseId: true,
        responsibleClinicianId: true,
        patient: { select: { isSynthetic: true, portalUserId: true } },
      },
    });
    return episode
      ? {
          episodeId: episode.id,
          patientIsSynthetic: episode.patient.isSynthetic,
          responsibleNurseId: episode.responsibleNurseId,
          responsibleClinicianId: episode.responsibleClinicianId,
          patientPortalUserId: episode.patient.portalUserId,
        }
      : null;
  }

  async findPlanByEpisode(episodeId: string): Promise<SafetyPlanRecord | null> {
    const plan = await this.transaction.safetyPlan.findUnique({
      where: { dischargeEpisodeId: episodeId },
    });
    return plan ? toPlanRecord(plan) : null;
  }

  async ensurePlan(episodeId: string, actorUserId: string): Promise<SafetyPlanRecord> {
    const plan = await this.transaction.safetyPlan.upsert({
      where: { dischargeEpisodeId: episodeId },
      create: { dischargeEpisodeId: episodeId, createdById: actorUserId },
      update: {},
    });
    return toPlanRecord(plan);
  }

  async claimNextVersion(safetyPlanId: string, expectedRevision: number) {
    const result = await this.transaction.safetyPlan.updateMany({
      where: { id: safetyPlanId, revision: expectedRevision },
      data: { revision: { increment: 1 }, currentVersion: { increment: 1 } },
    });
    if (result.count !== 1) return null;
    const plan = await this.transaction.safetyPlan.findUniqueOrThrow({
      where: { id: safetyPlanId },
      select: { revision: true, currentVersion: true },
    });
    return { revision: plan.revision, versionNumber: plan.currentVersion };
  }

  async claimLifecycleChange(
    safetyPlanId: string,
    expectedRevision: number,
    activeVersionNumber: number | null,
  ) {
    const result = await this.transaction.safetyPlan.updateMany({
      where: { id: safetyPlanId, revision: expectedRevision },
      data: { revision: { increment: 1 }, activeVersionNumber },
    });
    return result.count === 1 ? expectedRevision + 1 : null;
  }

  async createVersion(input: {
    readonly safetyPlanId: string;
    readonly versionNumber: number;
    readonly basedOnVersion: number | null;
    readonly createdById: string;
    readonly sections: readonly SafetyPlanSectionDraft[];
    readonly occurredAt: Date;
  }): Promise<SafetyPlanVersionRecord> {
    const version = await this.transaction.safetyPlanVersion.create({
      data: {
        safetyPlanId: input.safetyPlanId,
        versionNumber: input.versionNumber,
        basedOnVersion: input.basedOnVersion,
        createdById: input.createdById,
        createdAt: input.occurredAt,
        stateChanges: {
          create: {
            sequence: 1,
            resultingState: "DRAFT",
            actorUserId: input.createdById,
            occurredAt: input.occurredAt,
          },
        },
        sections: {
          create: input.sections.map((section) => ({
            step: section.step,
            content: section.content,
            provenance: section.provenance,
            permissions: {
              create: [
                { audience: "PATIENT", canView: section.patientCanView },
                { audience: "CAREGIVER", canView: section.caregiverCanView },
              ],
            },
          })),
        },
      },
      select: { id: true, versionNumber: true },
    });
    return { ...version, state: "DRAFT" };
  }

  async getVersion(
    safetyPlanId: string,
    versionNumber: number,
  ): Promise<SafetyPlanVersionRecord | null> {
    const version = await this.transaction.safetyPlanVersion.findUnique({
      where: { safetyPlanId_versionNumber: { safetyPlanId, versionNumber } },
      select: {
        id: true,
        versionNumber: true,
        stateChanges: { orderBy: { sequence: "desc" }, take: 1, select: { resultingState: true } },
      },
    });
    return version
      ? {
          id: version.id,
          versionNumber: version.versionNumber,
          state: version.stateChanges[0]?.resultingState ?? "DRAFT",
        }
      : null;
  }

  async appendStateChange(input: {
    readonly safetyPlanVersionId: string;
    readonly resultingState: SafetyPlanVersionState;
    readonly reason: string | null;
    readonly actorUserId: string;
    readonly occurredAt: Date;
  }): Promise<void> {
    const latest = await this.transaction.safetyPlanVersionStateChange.findFirst({
      where: { safetyPlanVersionId: input.safetyPlanVersionId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    await this.transaction.safetyPlanVersionStateChange.create({
      data: { ...input, sequence: (latest?.sequence ?? 0) + 1 },
    });
  }

  async appendAuditEvent(input: NewAuditEvent) {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }

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
}

export class PrismaSafetyPlanUnitOfWork implements SafetyPlanUnitOfWork {
  run<T>(operation: (transaction: SafetyPlanTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction((transaction) =>
      operation(new PrismaSafetyPlanTransaction(transaction)),
    );
  }
}

export async function getSafetyPlanView(episodeId: string, principal: AuthenticatedPrincipal) {
  const episode = await prisma.dischargeEpisode.findUnique({
    where: { id: episodeId },
    select: {
      responsibleNurseId: true,
      responsibleClinicianId: true,
      patient: { select: { portalUserId: true } },
      safetyPlan: {
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            include: {
              createdBy: { select: { syntheticAlias: true } },
              sections: {
                orderBy: { step: "asc" },
                include: { permissions: true },
              },
              stateChanges: {
                orderBy: { sequence: "asc" },
                include: { actor: { select: { syntheticAlias: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!episode) return null;
  const assignedProfessional =
    principal.userId === episode.responsibleNurseId ||
    principal.userId === episode.responsibleClinicianId;
  const patientOwner = principal.userId === episode.patient.portalUserId;
  const role = principal.roles.find(
    (candidate) =>
      ((candidate === "nurse" || candidate === "clinician") && assignedProfessional) ||
      (candidate === "patient" && patientOwner),
  );
  if (!role) return null;
  if (!episode.safetyPlan) {
    return { plan: null, access: { canEdit: role === "nurse" || role === "clinician" } };
  }
  const context = {
    assignedProfessional,
    patientOwner,
    caregiverAuthorizationActive: false,
  };
  const versions = episode.safetyPlan.versions.flatMap((version) => {
    const state = version.stateChanges.at(-1)?.resultingState ?? "DRAFT";
    if (!canViewSafetyPlanVersion(role, state, context)) return [];
    const sections = version.sections.flatMap((section) => {
      const permissions = {
        patientCanView:
          section.permissions.find((item) => item.audience === "PATIENT")?.canView ?? false,
        caregiverCanView:
          section.permissions.find((item) => item.audience === "CAREGIVER")?.canView ?? false,
      };
      if (!canViewSafetyPlanSection(role, permissions, context)) return [];
      return [
        {
          step: section.step,
          content: section.content,
          provenance: section.provenance,
          ...permissions,
        },
      ];
    });
    return [
      {
        versionNumber: version.versionNumber,
        basedOnVersion: version.basedOnVersion,
        state,
        createdAt: version.createdAt.toISOString(),
        createdBy: version.createdBy.syntheticAlias,
        sections,
        stateChanges: version.stateChanges.map((change) => ({
          state: change.resultingState,
          reason: change.reason,
          occurredAt: change.occurredAt.toISOString(),
          actor: change.actor.syntheticAlias,
        })),
      },
    ];
  });
  return {
    access: { canEdit: role === "nurse" || role === "clinician" },
    plan: {
      id: episode.safetyPlan.id,
      revision: episode.safetyPlan.revision,
      currentVersion: episode.safetyPlan.currentVersion,
      activeVersionNumber: episode.safetyPlan.activeVersionNumber,
      versions,
    },
  };
}

export async function listPatientSafetyPlanViews(principal: AuthenticatedPrincipal) {
  if (!principal.roles.includes("patient")) return null;
  const episodes = await prisma.dischargeEpisode.findMany({
    where: { patient: { portalUserId: principal.userId } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    episodes.map(async ({ id }) => ({
      episodeId: id,
      view: await getSafetyPlanView(id, principal),
    })),
  );
}
