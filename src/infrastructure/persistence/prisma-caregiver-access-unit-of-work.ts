import { Prisma } from "@prisma/client";

import { CaregiverScopeWriteConflictError } from "@/application/ports/caregiver-access-unit-of-work";

import type {
  CaregiverAccessTransaction,
  CaregiverAccessUnitOfWork,
  CaregiverAuthorizationContext,
  CaregiverScopeRecord,
  NewCaregiverAccessAudit,
} from "@/application/ports/caregiver-access-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import {
  canViewCaregiverPlanSection,
  CAREGIVER_RESOURCE_CATALOG,
  hasCaregiverCapability,
  validateCaregiverObservation,
} from "@/domain/caregiver/caregiver-access";
import { evaluateLegalRecordAuthorization } from "@/domain/legal/legal-authorization";
import { sha256 } from "@/infrastructure/crypto/session-token";
import { prisma } from "@/infrastructure/persistence/prisma";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import {
  boundCollection,
  EXPOSED_COLLECTION_QUERY_TAKE,
} from "@/application/collections/bounded-collection";

async function authorizationContext(
  transaction: Prisma.TransactionClient,
  id: string,
): Promise<CaregiverAuthorizationContext | null> {
  const authorization = await transaction.caregiverAuthorization.findUnique({
    where: { id },
    include: { policyVersion: true },
  });
  if (!authorization) return null;
  const revocation = await transaction.revocationEvent.findFirst({
    where: { targetType: "CAREGIVER_AUTHORIZATION", targetRecordId: id },
    select: { recordedAt: true },
  });
  return {
    id: authorization.id,
    subjectUserId: authorization.subjectUserId,
    caregiverUserId: authorization.caregiverUserId,
    state: authorization.state,
    scope: authorization.scope,
    policyVersionId: authorization.policyVersionId,
    recordedAt: authorization.recordedAt,
    expiresAt: authorization.expiresAt,
    policy:
      authorization.policyVersion.recordType === "CAREGIVER_AUTHORIZATION"
        ? { ...authorization.policyVersion, recordType: "CAREGIVER_AUTHORIZATION" as const }
        : null,
    revokedAt: revocation?.recordedAt ?? null,
  };
}

async function lockCaregiverAuthorization(
  transaction: Prisma.TransactionClient,
  id: string,
): Promise<void> {
  const rows = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id"
    FROM "caregiver_authorizations"
    WHERE "id" = ${id}
    FOR SHARE
  `);
  if (rows.length !== 1) throw new Error("Caregiver authorization not found while locking");
}

class PrismaCaregiverAccessTransaction implements CaregiverAccessTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  lockAuthorization(id: string) {
    return lockCaregiverAuthorization(this.transaction, id);
  }

  getAuthorization(id: string) {
    return authorizationContext(this.transaction, id);
  }

  async getEpisode(id: string) {
    const episode = await this.transaction.dischargeEpisode.findUnique({
      where: { id },
      select: { id: true, patient: { select: { portalUserId: true, isSynthetic: true } } },
    });
    return episode
      ? {
          id: episode.id,
          patientPortalUserId: episode.patient.portalUserId,
          patientIsSynthetic: episode.patient.isSynthetic,
        }
      : null;
  }

  async isActiveUserWithRole(userId: string, role: "patient" | "caregiver") {
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

  async ensureProfile(input: {
    readonly caregiverUserId: string;
    readonly externalPseudonymousId: string;
  }) {
    return this.transaction.caregiverProfile.upsert({
      where: { caregiverUserId: input.caregiverUserId },
      create: input,
      update: {},
      select: { id: true, caregiverUserId: true, externalPseudonymousId: true },
    });
  }

  getLatestScope(
    caregiverAuthorizationId: string,
    dischargeEpisodeId: string,
  ): Promise<CaregiverScopeRecord | null> {
    return this.transaction.caregiverAuthorizationScope.findFirst({
      where: { caregiverAuthorizationId, dischargeEpisodeId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        dischargeEpisodeId: true,
        version: true,
        capabilities: true,
        allowedPlanSections: true,
        authorizedResourceKeys: true,
      },
    });
  }

  async createScope(input: Parameters<CaregiverAccessTransaction["createScope"]>[0]) {
    try {
      return await this.transaction.caregiverAuthorizationScope.create({
        data: {
          ...input,
          capabilities: [...input.capabilities],
          allowedPlanSections: [...input.allowedPlanSections],
          authorizedResourceKeys: [...input.authorizedResourceKeys],
        },
        select: {
          id: true,
          dischargeEpisodeId: true,
          version: true,
          capabilities: true,
          allowedPlanSections: true,
          authorizedResourceKeys: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new CaregiverScopeWriteConflictError();
      }
      throw error;
    }
  }

  createInvitation(input: Parameters<CaregiverAccessTransaction["createInvitation"]>[0]) {
    return this.transaction.caregiverInvitation.create({ data: input, select: { id: true } });
  }

  async findInvitationByTokenHash(hash: string) {
    const invitation = await this.transaction.caregiverInvitation.findUnique({
      where: { invitationTokenHash: hash },
      include: { caregiverProfile: true },
    });
    if (!invitation) return null;
    const authorization = await authorizationContext(
      this.transaction,
      invitation.caregiverAuthorizationId,
    );
    if (!authorization) return null;
    return {
      id: invitation.id,
      caregiverAuthorizationId: invitation.caregiverAuthorizationId,
      caregiverProfileId: invitation.caregiverProfileId,
      dischargeEpisodeId: invitation.dischargeEpisodeId,
      expiresAt: invitation.expiresAt,
      consumedAt: invitation.consumedAt,
      profile: invitation.caregiverProfile,
      authorization,
    };
  }

  async consumeInvitation(id: string, consumedAt: Date) {
    const result = await this.transaction.caregiverInvitation.updateMany({
      where: { id, consumedAt: null, expiresAt: { gt: consumedAt } },
      data: { consumedAt },
    });
    return result.count === 1;
  }

  createSession(input: Parameters<CaregiverAccessTransaction["createSession"]>[0]) {
    return this.transaction.caregiverSession.create({ data: input, select: { id: true } });
  }

  appendAuditEvent(input: NewAuditEvent) {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }

  appendAccessAudit(input: NewCaregiverAccessAudit) {
    return this.transaction.caregiverAccessAudit.create({ data: input, select: { id: true } });
  }
}

export class PrismaCaregiverAccessUnitOfWork implements CaregiverAccessUnitOfWork {
  run<T>(operation: (transaction: CaregiverAccessTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction((transaction) =>
      operation(new PrismaCaregiverAccessTransaction(transaction)),
    );
  }
}

type CaregiverAccessReaderDatabase = Pick<typeof prisma, "$transaction">;

type CurrentCaregiverScopeRow = CaregiverScopeRecord & {
  readonly caregiverAuthorizationId: string;
};

async function readCurrentCaregiverScopes(
  transaction: Prisma.TransactionClient,
  authorizationIds: readonly string[],
): Promise<readonly CurrentCaregiverScopeRow[]> {
  if (authorizationIds.length === 0) return [];
  return transaction.$queryRaw<CurrentCaregiverScopeRow[]>(Prisma.sql`
    WITH "rankedRevisions" AS (
      SELECT
        scope."id",
        scope."caregiver_authorization_id" AS "caregiverAuthorizationId",
        scope."discharge_episode_id" AS "dischargeEpisodeId",
        scope."version",
        scope."capabilities",
        scope."allowed_plan_sections" AS "allowedPlanSections",
        scope."authorized_resource_keys" AS "authorizedResourceKeys",
        ROW_NUMBER() OVER (
          PARTITION BY scope."caregiver_authorization_id", scope."discharge_episode_id"
          ORDER BY scope."version" DESC, scope."id" ASC
        ) AS "revisionRank"
      FROM "caregiver_authorization_scopes" AS scope
      WHERE scope."caregiver_authorization_id" IN (${Prisma.join(authorizationIds)})
    ),
    "currentScopes" AS (
      SELECT
        ranked.*,
        ROW_NUMBER() OVER (
          PARTITION BY ranked."caregiverAuthorizationId"
          ORDER BY ranked."dischargeEpisodeId" ASC, ranked."version" DESC, ranked."id" ASC
        ) AS "collectionRank"
      FROM "rankedRevisions" AS ranked
      WHERE ranked."revisionRank" = 1
    )
    SELECT
      current."id",
      current."caregiverAuthorizationId",
      current."dischargeEpisodeId",
      current."version",
      current."capabilities",
      current."allowedPlanSections",
      current."authorizedResourceKeys"
    FROM "currentScopes" AS current
    WHERE current."collectionRank" <= ${EXPOSED_COLLECTION_QUERY_TAKE}
    ORDER BY
      current."caregiverAuthorizationId" ASC,
      current."dischargeEpisodeId" ASC,
      current."version" DESC,
      current."id" ASC
  `);
}

export async function listPatientCaregiverAccess(
  principal: AuthenticatedPrincipal,
  database: CaregiverAccessReaderDatabase = prisma,
) {
  if (!principal.roles.includes("patient")) return null;
  return database.$transaction(async (transaction) => {
    const patient = await transaction.patient.findUnique({
      where: { portalUserId: principal.userId },
      select: {
        isSynthetic: true,
        dischargeEpisodes: {
          select: { id: true, status: true, dischargeDate: true },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        },
      },
    });
    if (!patient?.isSynthetic) return null;
    const authorizationRows = await transaction.caregiverAuthorization.findMany({
      where: { subjectUserId: principal.userId },
      include: {
        caregiver: { select: { caregiverProfile: true } },
        policyVersion: true,
        invitations: {
          select: { id: true, dischargeEpisodeId: true, expiresAt: true, consumedAt: true },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        },
      },
      orderBy: [{ recordedAt: "desc" }, { id: "asc" }],
      take: EXPOSED_COLLECTION_QUERY_TAKE,
    });
    const authorizations = boundCollection(authorizationRows);
    const authorizationIds = authorizations.values.map(({ id }) => id);
    const [revocations, currentScopeRows] = await Promise.all([
      authorizationIds.length === 0
        ? Promise.resolve([])
        : transaction.revocationEvent.findMany({
            where: {
              targetType: "CAREGIVER_AUTHORIZATION",
              targetRecordId: { in: authorizationIds },
            },
            select: { targetRecordId: true, recordedAt: true },
            orderBy: [{ targetRecordId: "asc" }, { recordedAt: "desc" }, { id: "asc" }],
            take: EXPOSED_COLLECTION_QUERY_TAKE,
          }),
      readCurrentCaregiverScopes(transaction, authorizationIds),
    ]);
    const revokedAtByAuthorization = new Map(
      revocations.map(({ targetRecordId, recordedAt }) => [targetRecordId, recordedAt]),
    );
    const scopesByAuthorization = new Map<string, CurrentCaregiverScopeRow[]>();
    for (const scope of currentScopeRows) {
      scopesByAuthorization.set(scope.caregiverAuthorizationId, [
        ...(scopesByAuthorization.get(scope.caregiverAuthorizationId) ?? []),
        scope,
      ]);
    }
    const views = authorizations.values.map((authorization) => {
      const scopes = boundCollection(scopesByAuthorization.get(authorization.id) ?? []);
      const invitations = boundCollection(authorization.invitations);
      const context: CaregiverAuthorizationContext = {
        id: authorization.id,
        subjectUserId: authorization.subjectUserId,
        caregiverUserId: authorization.caregiverUserId,
        state: authorization.state,
        scope: authorization.scope,
        policyVersionId: authorization.policyVersionId,
        recordedAt: authorization.recordedAt,
        expiresAt: authorization.expiresAt,
        policy:
          authorization.policyVersion.recordType === "CAREGIVER_AUTHORIZATION"
            ? {
                ...authorization.policyVersion,
                recordType: "CAREGIVER_AUTHORIZATION" as const,
              }
            : null,
        revokedAt: revokedAtByAuthorization.get(authorization.id) ?? null,
      };
      return {
        id: authorization.id,
        pseudonym:
          authorization.caregiver.caregiverProfile?.externalPseudonymousId ?? "perfil pendiente",
        state: authorization.state,
        legalScope: authorization.scope,
        expiresAt: authorization.expiresAt?.toISOString() ?? null,
        effective: authorizationIsEffective(context, new Date()),
        revoked: context.revokedAt !== null,
        scopes: scopes.values.map((scope) => ({
          dischargeEpisodeId: scope.dischargeEpisodeId,
          version: scope.version,
          capabilities: scope.capabilities,
          allowedPlanSections: scope.allowedPlanSections,
          authorizedResourceKeys: scope.authorizedResourceKeys,
        })),
        invitations: invitations.values.map((invitation) => ({
          ...invitation,
          expiresAt: invitation.expiresAt.toISOString(),
          consumedAt: invitation.consumedAt?.toISOString() ?? null,
        })),
        collectionCoverage: {
          scopes: scopes.coverage,
          invitations: invitations.coverage,
        },
      };
    });
    const episodes = boundCollection(patient.dischargeEpisodes);
    return {
      episodes: episodes.values.map((episode) => ({
        ...episode,
        dischargeDate: episode.dischargeDate.toISOString().slice(0, 10),
      })),
      authorizations: views,
      collectionCoverage: {
        episodes: episodes.coverage,
        authorizations: authorizations.coverage,
      },
    };
  });
}

function authorizationIsEffective(
  authorization: CaregiverAuthorizationContext,
  now: Date,
): boolean {
  if (authorization.scope !== "caregiver:portal") return false;
  return evaluateLegalRecordAuthorization(
    {
      id: authorization.id,
      recordType: "CAREGIVER_AUTHORIZATION",
      subjectUserId: authorization.subjectUserId,
      caregiverUserId: authorization.caregiverUserId,
      state: authorization.state,
      scope: authorization.scope,
      policyVersionId: authorization.policyVersionId,
      actorUserId: authorization.subjectUserId,
      recordedAt: authorization.recordedAt,
      expiresAt: authorization.expiresAt,
      origin: "DEMO_UI",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "REDACTED",
    },
    {
      policies: authorization.policy ? [authorization.policy] : [],
      revocations: authorization.revokedAt
        ? [
            {
              id: "revoked",
              state: "REVOKED",
              targetType: "CAREGIVER_AUTHORIZATION",
              targetRecordId: authorization.id,
              subjectUserId: authorization.subjectUserId,
              scope: authorization.scope,
              policyVersionId: authorization.policyVersionId,
              actorUserId: authorization.subjectUserId,
              recordedAt: authorization.revokedAt,
              origin: "DEMO_UI",
              evidenceType: "RECORDED_INTERACTION",
              evidenceRef: "REDACTED",
            },
          ]
        : [],
      now,
    },
  ).allowed;
}

async function activeSessionContext(
  transaction: Prisma.TransactionClient,
  rawToken: string,
  now: Date,
) {
  const tokenHash = sha256(rawToken);
  const sessionReference = await transaction.caregiverSession.findUnique({
    where: { sessionTokenHash: tokenHash },
    select: { caregiverAuthorizationId: true },
  });
  if (!sessionReference) return null;
  await lockCaregiverAuthorization(transaction, sessionReference.caregiverAuthorizationId);
  const session = await transaction.caregiverSession.findUnique({
    where: { sessionTokenHash: tokenHash },
    include: {
      caregiverProfile: {
        include: {
          caregiverUser: {
            select: {
              id: true,
              isActive: true,
              roleAssignments: { where: { revokedAt: null }, select: { role: true } },
            },
          },
        },
      },
      invitation: {
        select: {
          caregiverAuthorizationId: true,
          caregiverProfileId: true,
          dischargeEpisodeId: true,
        },
      },
      dischargeEpisode: {
        select: { patient: { select: { portalUserId: true, isSynthetic: true } } },
      },
    },
  });
  if (!session) return null;
  const [authorization, scope] = await Promise.all([
    authorizationContext(transaction, session.caregiverAuthorizationId),
    transaction.caregiverAuthorizationScope.findFirst({
      where: {
        caregiverAuthorizationId: session.caregiverAuthorizationId,
        dischargeEpisodeId: session.dischargeEpisodeId,
      },
      orderBy: { version: "desc" },
    }),
  ]);
  const valid =
    !session.revokedAt &&
    session.expiresAt > now &&
    session.caregiverProfile.caregiverUser.isActive &&
    session.caregiverProfile.caregiverUser.roleAssignments.some(
      ({ role }) => role === "caregiver",
    ) &&
    authorization &&
    session.invitation.caregiverAuthorizationId === session.caregiverAuthorizationId &&
    session.invitation.caregiverProfileId === session.caregiverProfileId &&
    session.invitation.dischargeEpisodeId === session.dischargeEpisodeId &&
    authorization.caregiverUserId === session.caregiverProfile.caregiverUserId &&
    authorization.subjectUserId === session.dischargeEpisode.patient.portalUserId &&
    session.dischargeEpisode.patient.isSynthetic &&
    authorizationIsEffective(authorization, now) &&
    scope;
  return valid ? { session, authorization, scope } : { session, authorization: null, scope: null };
}

export async function getCaregiverPortalView(input: {
  readonly rawSessionToken: string;
  readonly correlationId: string;
  readonly now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (transaction) => {
    const context = await activeSessionContext(transaction, input.rawSessionToken, now);
    if (!context?.authorization || !context.scope) {
      if (context?.session) {
        await transaction.caregiverAccessAudit.create({
          data: {
            caregiverAuthorizationId: context.session.caregiverAuthorizationId,
            caregiverProfileId: context.session.caregiverProfileId,
            caregiverSessionId: context.session.id,
            action: "SESSION_DENIED",
            outcome: "DENIED",
            resourceType: "CaregiverSession",
            resourceId: context.session.id,
            correlationId: input.correlationId,
            createdAt: now,
          },
        });
      }
      return null;
    }
    const episodeId = context.session.dischargeEpisodeId;
    const [episode, tasks] = await Promise.all([
      transaction.dischargeEpisode.findFirst({
        where: {
          id: episodeId,
          patient: { portalUserId: context.authorization.subjectUserId },
        },
        select: {
          safetyPlan: {
            select: {
              id: true,
              activeVersionNumber: true,
            },
          },
        },
      }),
      hasCaregiverCapability(context.scope, "VIEW_ASSIGNED_TASKS")
        ? transaction.task.findMany({
            where: {
              episodeId,
              assignedToId: context.session.caregiverProfile.caregiverUserId,
            },
            select: { id: true, summary: true, currentState: true, createdAt: true },
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            take: EXPOSED_COLLECTION_QUERY_TAKE,
          })
        : Promise.resolve([]),
    ]);
    if (!episode) return null;
    const activeVersion =
      episode.safetyPlan?.activeVersionNumber === null || !episode.safetyPlan
        ? null
        : await transaction.safetyPlanVersion.findUnique({
            where: {
              safetyPlanId_versionNumber: {
                safetyPlanId: episode.safetyPlan.id,
                versionNumber: episode.safetyPlan.activeVersionNumber,
              },
            },
            include: {
              sections: { orderBy: { step: "asc" }, include: { permissions: true } },
              stateChanges: { orderBy: { sequence: "desc" }, take: 1 },
            },
          });
    const authorizedActiveVersion =
      activeVersion?.stateChanges[0]?.resultingState === "ACTIVE" ? activeVersion : null;
    const planSections = authorizedActiveVersion
      ? authorizedActiveVersion.sections.flatMap((section) => {
          const allowedByDocument =
            section.permissions.find(({ audience }) => audience === "CAREGIVER")?.canView ?? false;
          return canViewCaregiverPlanSection(context.scope, section.step, allowedByDocument)
            ? [{ step: section.step, content: section.content }]
            : [];
        })
      : [];
    const boundedTasks = boundCollection(tasks);
    const resources = hasCaregiverCapability(context.scope, "VIEW_AUTHORIZED_RESOURCES")
      ? context.scope.authorizedResourceKeys.flatMap((key) =>
          key in CAREGIVER_RESOURCE_CATALOG
            ? [
                {
                  key,
                  ...CAREGIVER_RESOURCE_CATALOG[key as keyof typeof CAREGIVER_RESOURCE_CATALOG],
                },
              ]
            : [],
        )
      : [];
    await transaction.caregiverAccessAudit.create({
      data: {
        caregiverAuthorizationId: context.authorization.id,
        caregiverProfileId: context.session.caregiverProfileId,
        caregiverSessionId: context.session.id,
        action: "PORTAL_READ",
        outcome: "SUCCESS",
        resourceType: "DischargeEpisode",
        resourceId: episodeId,
        correlationId: input.correlationId,
        createdAt: now,
      },
    });
    return {
      pseudonym: context.session.caregiverProfile.externalPseudonymousId,
      scopeVersion: context.scope.version,
      capabilities: context.scope.capabilities,
      planSections,
      tasks: boundedTasks.values.map((task) => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
      })),
      collectionCoverage: { tasks: boundedTasks.coverage },
      resources,
      canSubmitObservation: hasCaregiverCapability(context.scope, "SEND_OBSERVATIONS"),
    };
  });
}

export async function recordCaregiverObservation(input: {
  readonly rawSessionToken: string;
  readonly content: unknown;
  readonly correlationId: string;
  readonly now?: Date;
}) {
  const content = validateCaregiverObservation(input.content);
  const now = input.now ?? new Date();
  return prisma.$transaction(async (transaction) => {
    const context = await activeSessionContext(transaction, input.rawSessionToken, now);
    if (
      !context?.authorization ||
      !context.scope ||
      !hasCaregiverCapability(context.scope, "SEND_OBSERVATIONS")
    ) {
      if (context?.session) {
        await transaction.caregiverAccessAudit.create({
          data: {
            caregiverAuthorizationId: context.session.caregiverAuthorizationId,
            caregiverProfileId: context.session.caregiverProfileId,
            caregiverSessionId: context.session.id,
            action: "OBSERVATION_DENIED",
            outcome: "DENIED",
            resourceType: "CaregiverObservation",
            correlationId: input.correlationId,
            createdAt: now,
          },
        });
      }
      return null;
    }
    const observation = await transaction.caregiverObservation.create({
      data: {
        caregiverAuthorizationId: context.authorization.id,
        caregiverProfileId: context.session.caregiverProfileId,
        caregiverSessionId: context.session.id,
        dischargeEpisodeId: context.session.dischargeEpisodeId,
        content,
        submittedAt: now,
      },
      select: { id: true, submittedAt: true },
    });
    await transaction.caregiverAccessAudit.create({
      data: {
        caregiverAuthorizationId: context.authorization.id,
        caregiverProfileId: context.session.caregiverProfileId,
        caregiverSessionId: context.session.id,
        action: "OBSERVATION_SUBMITTED",
        outcome: "SUCCESS",
        resourceType: "CaregiverObservation",
        resourceId: observation.id,
        correlationId: input.correlationId,
        createdAt: now,
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorUserId: context.session.caregiverProfile.caregiverUserId,
        actorRole: "caregiver",
        action: "CAREGIVER_OBSERVATION_RECORDED",
        resourceType: "CaregiverObservation",
        resourceId: observation.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: now,
      },
    });
    return observation;
  });
}

export async function logoutCaregiverSession(input: {
  readonly rawSessionToken: string;
  readonly correlationId: string;
  readonly now?: Date;
}) {
  const now = input.now ?? new Date();
  const tokenHash = sha256(input.rawSessionToken);
  return prisma.$transaction(async (transaction) => {
    const reference = await transaction.caregiverSession.findUnique({
      where: { sessionTokenHash: tokenHash },
      select: {
        id: true,
        caregiverAuthorizationId: true,
        caregiverProfileId: true,
        caregiverProfile: { select: { caregiverUserId: true } },
      },
    });
    if (!reference) return false;
    await lockCaregiverAuthorization(transaction, reference.caregiverAuthorizationId);
    const invalidated = await transaction.caregiverSession.updateMany({
      where: { id: reference.id, revokedAt: null },
      data: { revokedAt: now },
    });
    if (invalidated.count !== 1) return false;
    await transaction.caregiverAccessAudit.create({
      data: {
        caregiverAuthorizationId: reference.caregiverAuthorizationId,
        caregiverProfileId: reference.caregiverProfileId,
        caregiverSessionId: reference.id,
        actorUserId: reference.caregiverProfile.caregiverUserId,
        action: "SESSION_LOGGED_OUT",
        outcome: "SUCCESS",
        resourceType: "CaregiverSession",
        resourceId: reference.id,
        correlationId: input.correlationId,
        createdAt: now,
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorUserId: reference.caregiverProfile.caregiverUserId,
        actorRole: "caregiver",
        action: "CAREGIVER_SESSION_LOGGED_OUT",
        resourceType: "CaregiverSession",
        resourceId: reference.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: now,
      },
    });
    return true;
  });
}
