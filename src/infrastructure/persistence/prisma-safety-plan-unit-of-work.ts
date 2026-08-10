import { Prisma } from "@prisma/client";

import type {
  SafetyPlanRecord,
  SafetyPlanTransaction,
  SafetyPlanUnitOfWork,
  SafetyPlanVersionRecord,
} from "@/application/ports/safety-plan-unit-of-work";
import {
  boundCollection,
  EXPOSED_COLLECTION_LIMIT,
  EXPOSED_COLLECTION_QUERY_TAKE,
} from "@/application/collections/bounded-collection";
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

const safetyPlanEpisodeSelect = {
  id: true,
  responsibleNurseId: true,
  responsibleClinicianId: true,
  patient: { select: { portalUserId: true } },
  safetyPlan: {
    select: {
      id: true,
      revision: true,
      currentVersion: true,
      activeVersionNumber: true,
    },
  },
} satisfies Prisma.DischargeEpisodeSelect;

type SafetyPlanViewEpisode = Prisma.DischargeEpisodeGetPayload<{
  select: typeof safetyPlanEpisodeSelect;
}>;

const safetyPlanVersionInclude = {
  createdBy: { select: { syntheticAlias: true } },
  sections: {
    orderBy: { step: "asc" as const },
    include: { permissions: true },
  },
  stateChanges: {
    orderBy: [{ sequence: "desc" as const }, { id: "asc" as const }],
    take: EXPOSED_COLLECTION_QUERY_TAKE,
    include: { actor: { select: { syntheticAlias: true } } },
  },
} satisfies Prisma.SafetyPlanVersionInclude;

type SafetyPlanViewVersion = Prisma.SafetyPlanVersionGetPayload<{
  include: typeof safetyPlanVersionInclude;
}>;

type VisibleSafetyPlanVersionId = {
  readonly id: string;
  readonly safetyPlanId: string;
  readonly versionNumber: number;
};

type SafetyPlanReaderDatabase = Pick<typeof prisma, "$transaction">;

const SAFETY_PLAN_VERSION_BATCH_TAKE = EXPOSED_COLLECTION_LIMIT * EXPOSED_COLLECTION_QUERY_TAKE;

function viewerRole(
  episode: SafetyPlanViewEpisode,
  principal: AuthenticatedPrincipal,
): Role | null {
  const assignedProfessional =
    principal.userId === episode.responsibleNurseId ||
    principal.userId === episode.responsibleClinicianId;
  const patientOwner = principal.userId === episode.patient.portalUserId;
  return (
    principal.roles.find(
      (candidate) =>
        ((candidate === "nurse" || candidate === "clinician") && assignedProfessional) ||
        (candidate === "patient" && patientOwner),
    ) ?? null
  );
}

async function readVisibleSafetyPlanVersions(input: {
  readonly transaction: Prisma.TransactionClient;
  readonly safetyPlanIds: readonly string[];
  readonly patientOnly: boolean;
}): Promise<ReadonlyMap<string, readonly SafetyPlanViewVersion[]>> {
  if (input.safetyPlanIds.length === 0) return new Map();
  const visibility = input.patientOnly
    ? Prisma.sql`current."currentState" IN (
        CAST(${"ACTIVE"} AS "SafetyPlanVersionState"),
        CAST(${"SUPERSEDED"} AS "SafetyPlanVersionState")
      )`
    : Prisma.sql`TRUE`;
  const selectedRows = await input.transaction.$queryRaw<VisibleSafetyPlanVersionId[]>(Prisma.sql`
    WITH "rankedStateChanges" AS (
      SELECT
        change."safety_plan_version_id" AS "safetyPlanVersionId",
        change."resulting_state" AS "resultingState",
        ROW_NUMBER() OVER (
          PARTITION BY change."safety_plan_version_id"
          ORDER BY change."sequence" DESC, change."id" ASC
        ) AS "stateRank"
      FROM "safety_plan_version_state_changes" AS change
      INNER JOIN "safety_plan_versions" AS version
        ON version."id" = change."safety_plan_version_id"
      WHERE version."safety_plan_id" IN (${Prisma.join(input.safetyPlanIds)})
    ),
    "currentVersions" AS (
      SELECT
        version."id",
        version."safety_plan_id" AS "safetyPlanId",
        version."version_number" AS "versionNumber",
        COALESCE(
          state."resultingState",
          CAST(${"DRAFT"} AS "SafetyPlanVersionState")
        ) AS "currentState"
      FROM "safety_plan_versions" AS version
      LEFT JOIN "rankedStateChanges" AS state
        ON state."safetyPlanVersionId" = version."id" AND state."stateRank" = 1
      WHERE version."safety_plan_id" IN (${Prisma.join(input.safetyPlanIds)})
    ),
    "visibleVersions" AS (
      SELECT
        current.*,
        ROW_NUMBER() OVER (
          PARTITION BY current."safetyPlanId"
          ORDER BY current."versionNumber" DESC, current."id" ASC
        ) AS "collectionRank"
      FROM "currentVersions" AS current
      WHERE ${visibility}
    )
    SELECT visible."id", visible."safetyPlanId", visible."versionNumber"
    FROM "visibleVersions" AS visible
    WHERE visible."collectionRank" <= ${EXPOSED_COLLECTION_QUERY_TAKE}
    ORDER BY visible."safetyPlanId" ASC, visible."versionNumber" DESC, visible."id" ASC
  `);
  if (selectedRows.length === 0) return new Map();
  const versions = await input.transaction.safetyPlanVersion.findMany({
    where: { id: { in: selectedRows.map(({ id }) => id) } },
    include: safetyPlanVersionInclude,
    orderBy: [{ safetyPlanId: "asc" }, { versionNumber: "desc" }, { id: "asc" }],
    take: SAFETY_PLAN_VERSION_BATCH_TAKE,
  });
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const bySafetyPlan = new Map<string, SafetyPlanViewVersion[]>();
  for (const selected of selectedRows) {
    const version = versionById.get(selected.id);
    if (!version) throw new Error("Selected safety plan version could not be projected");
    bySafetyPlan.set(selected.safetyPlanId, [
      ...(bySafetyPlan.get(selected.safetyPlanId) ?? []),
      version,
    ]);
  }
  return bySafetyPlan;
}

function projectSafetyPlanView(
  episode: SafetyPlanViewEpisode,
  principal: AuthenticatedPrincipal,
  selectedVersions: readonly SafetyPlanViewVersion[],
) {
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
  const boundedVersions = boundCollection(selectedVersions);
  const versions = boundedVersions.values.map((version) => {
    const boundedStateChanges = boundCollection(version.stateChanges);
    const state = version.stateChanges[0]?.resultingState ?? "DRAFT";
    if (!canViewSafetyPlanVersion(role, state, context)) {
      throw new Error("Selected safety plan version is not visible to this principal");
    }
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
    return {
      versionNumber: version.versionNumber,
      basedOnVersion: version.basedOnVersion,
      state,
      createdAt: version.createdAt.toISOString(),
      createdBy: version.createdBy.syntheticAlias,
      sections,
      stateChanges: [...boundedStateChanges.values].reverse().map((change) => ({
        state: change.resultingState,
        reason: change.reason,
        occurredAt: change.occurredAt.toISOString(),
        actor: change.actor.syntheticAlias,
      })),
      collectionCoverage: { stateChanges: boundedStateChanges.coverage },
    };
  });
  return {
    access: { canEdit: role === "nurse" || role === "clinician" },
    plan: {
      id: episode.safetyPlan.id,
      revision: episode.safetyPlan.revision,
      currentVersion: episode.safetyPlan.currentVersion,
      activeVersionNumber: episode.safetyPlan.activeVersionNumber,
      versions,
      collectionCoverage: { versions: boundedVersions.coverage },
    },
  };
}

export async function getSafetyPlanView(
  episodeId: string,
  principal: AuthenticatedPrincipal,
  database: SafetyPlanReaderDatabase = prisma,
) {
  return database.$transaction(
    async (transaction) => {
      const episode = await transaction.dischargeEpisode.findUnique({
        where: { id: episodeId },
        select: safetyPlanEpisodeSelect,
      });
      if (!episode) return null;
      const role = viewerRole(episode, principal);
      if (!role) return null;
      const versions = episode.safetyPlan
        ? await readVisibleSafetyPlanVersions({
            transaction,
            safetyPlanIds: [episode.safetyPlan.id],
            patientOnly: role === "patient",
          })
        : new Map();
      return projectSafetyPlanView(
        episode,
        principal,
        episode.safetyPlan ? (versions.get(episode.safetyPlan.id) ?? []) : [],
      );
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function listPatientSafetyPlanViews(
  principal: AuthenticatedPrincipal,
  database: SafetyPlanReaderDatabase = prisma,
) {
  if (!principal.roles.includes("patient")) return null;
  return database.$transaction(
    async (transaction) => {
      const episodes = await transaction.dischargeEpisode.findMany({
        where: { patient: { portalUserId: principal.userId } },
        select: safetyPlanEpisodeSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: EXPOSED_COLLECTION_QUERY_TAKE,
      });
      const boundedEpisodes = boundCollection(episodes);
      const safetyPlanIds = boundedEpisodes.values.flatMap((episode) =>
        episode.safetyPlan ? [episode.safetyPlan.id] : [],
      );
      const versions = await readVisibleSafetyPlanVersions({
        transaction,
        safetyPlanIds,
        patientOnly: true,
      });
      return {
        values: boundedEpisodes.values.map((episode) => ({
          episodeId: episode.id,
          view: projectSafetyPlanView(
            episode,
            principal,
            episode.safetyPlan ? (versions.get(episode.safetyPlan.id) ?? []) : [],
          ),
        })),
        coverage: boundedEpisodes.coverage,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
