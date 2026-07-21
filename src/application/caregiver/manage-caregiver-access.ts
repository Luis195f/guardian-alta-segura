import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import {
  type CaregiverScopeDraft,
  InvalidCaregiverAccessError,
  validateCaregiverScope,
} from "@/domain/caregiver/caregiver-access";
import { evaluateLegalRecordAuthorization } from "@/domain/legal/legal-authorization";
import { CaregiverScopeWriteConflictError } from "@/application/ports/caregiver-access-unit-of-work";
import type {
  CaregiverAccessTransaction,
  CaregiverAccessUnitOfWork,
  CaregiverPseudonymIssuer,
  CaregiverTokenIssuer,
  LocalCaregiverInvitationAdapter,
} from "@/application/ports/caregiver-access-unit-of-work";

export class CaregiverAccessDeniedError extends Error {}
export class CaregiverAccessNotFoundError extends Error {}
export class CaregiverAccessConflictError extends Error {}

export interface CaregiverDemoAccessTtl {
  readonly invitationTtlMs: number;
  readonly sessionTtlMs: number;
}

function assertCorrelationId(value: string): void {
  if (!/^[0-9a-f-]{36}$/iu.test(value))
    throw new InvalidCaregiverAccessError("Invalid correlation ID");
}

function patientRole(actor: AuthenticatedPrincipal): "patient" {
  if (!actor.roles.includes("patient")) throw new CaregiverAccessDeniedError();
  return "patient";
}

function caregiverRole(actor: AuthenticatedPrincipal): "caregiver" {
  if (!actor.roles.includes("caregiver")) throw new CaregiverAccessDeniedError();
  return "caregiver";
}

function legalAuthorizationIsEffective(
  authorization: NonNullable<Awaited<ReturnType<CaregiverAccessTransaction["getAuthorization"]>>>,
  now: Date,
): boolean {
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

async function authorizePatientManagement(
  transaction: CaregiverAccessTransaction,
  actor: AuthenticatedPrincipal,
  authorizationId: string,
  episodeId: string,
  now: Date,
) {
  patientRole(actor);
  await transaction.lockAuthorization(authorizationId);
  const [authorization, episode, activePatient] = await Promise.all([
    transaction.getAuthorization(authorizationId),
    transaction.getEpisode(episodeId),
    transaction.isActiveUserWithRole(actor.userId, "patient"),
  ]);
  if (!authorization || !episode) throw new CaregiverAccessNotFoundError();
  if (
    !activePatient ||
    actor.userId !== authorization.subjectUserId ||
    authorization.scope !== "caregiver:portal" ||
    episode.patientPortalUserId !== actor.userId ||
    !episode.patientIsSynthetic ||
    !legalAuthorizationIsEffective(authorization, now)
  ) {
    throw new CaregiverAccessDeniedError();
  }
  return authorization;
}

export class CreateCaregiverInvitationService {
  constructor(
    private readonly unitOfWork: CaregiverAccessUnitOfWork,
    private readonly tokenIssuer: CaregiverTokenIssuer,
    private readonly pseudonymIssuer: CaregiverPseudonymIssuer,
    private readonly invitationAdapter: LocalCaregiverInvitationAdapter,
    private readonly ttl: CaregiverDemoAccessTtl,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly caregiverAuthorizationId: string;
    readonly episodeId: string;
    readonly scope: CaregiverScopeDraft;
    readonly correlationId: string;
  }) {
    assertCorrelationId(input.correlationId);
    const scope = validateCaregiverScope(input.scope);
    const token = this.tokenIssuer.issue();
    const occurredAt = this.now();
    const expiresAt = new Date(occurredAt.getTime() + this.ttl.invitationTtlMs);
    const invitation = await this.unitOfWork.run(async (transaction) => {
      const authorization = await authorizePatientManagement(
        transaction,
        input.actor,
        input.caregiverAuthorizationId,
        input.episodeId,
        occurredAt,
      );
      const profile = await transaction.ensureProfile({
        caregiverUserId: authorization.caregiverUserId,
        externalPseudonymousId: this.pseudonymIssuer.issue(),
      });
      const latest = await transaction.getLatestScope(authorization.id, input.episodeId);
      if (!latest) {
        await transaction.createScope({
          caregiverAuthorizationId: authorization.id,
          dischargeEpisodeId: input.episodeId,
          version: 1,
          ...scope,
          actorUserId: input.actor.userId,
          recordedAt: occurredAt,
        });
      } else if (
        JSON.stringify(latest.capabilities) !== JSON.stringify(scope.capabilities) ||
        JSON.stringify(latest.allowedPlanSections) !== JSON.stringify(scope.allowedPlanSections) ||
        JSON.stringify(latest.authorizedResourceKeys) !==
          JSON.stringify(scope.authorizedResourceKeys)
      ) {
        throw new CaregiverAccessConflictError();
      }
      const created = await transaction.createInvitation({
        caregiverAuthorizationId: authorization.id,
        caregiverProfileId: profile.id,
        dischargeEpisodeId: input.episodeId,
        invitationTokenHash: token.hash,
        createdById: input.actor.userId,
        createdAt: occurredAt,
        expiresAt,
      });
      await transaction.appendAccessAudit({
        caregiverAuthorizationId: authorization.id,
        caregiverProfileId: profile.id,
        actorUserId: input.actor.userId,
        action: "INVITATION_CREATED",
        outcome: "SUCCESS",
        resourceType: "CaregiverInvitation",
        resourceId: created.id,
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: "patient",
        action: "CAREGIVER_INVITATION_CREATED",
        resourceType: "CaregiverInvitation",
        resourceId: created.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      return created;
    });
    const delivery = await this.invitationAdapter.deliver({
      invitationId: invitation.id,
      rawToken: token.raw,
      expiresAt,
    });
    return { invitationId: invitation.id, expiresAt, ...delivery };
  }
}

export class ChangeCaregiverScopeService {
  constructor(
    private readonly unitOfWork: CaregiverAccessUnitOfWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly caregiverAuthorizationId: string;
    readonly episodeId: string;
    readonly expectedVersion: number;
    readonly scope: CaregiverScopeDraft;
    readonly correlationId: string;
  }) {
    assertCorrelationId(input.correlationId);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
      throw new InvalidCaregiverAccessError("Invalid expected scope version");
    }
    const scope = validateCaregiverScope(input.scope);
    const occurredAt = this.now();
    try {
      return await this.unitOfWork.run(async (transaction) => {
        const authorization = await authorizePatientManagement(
          transaction,
          input.actor,
          input.caregiverAuthorizationId,
          input.episodeId,
          occurredAt,
        );
        const latest = await transaction.getLatestScope(authorization.id, input.episodeId);
        if (!latest || latest.version !== input.expectedVersion) {
          throw new CaregiverAccessConflictError();
        }
        const created = await transaction.createScope({
          caregiverAuthorizationId: authorization.id,
          dischargeEpisodeId: input.episodeId,
          version: latest.version + 1,
          ...scope,
          actorUserId: input.actor.userId,
          recordedAt: occurredAt,
        });
        await transaction.appendAccessAudit({
          caregiverAuthorizationId: authorization.id,
          actorUserId: input.actor.userId,
          action: "SCOPE_CHANGED",
          outcome: "SUCCESS",
          resourceType: "CaregiverAuthorizationScope",
          resourceId: created.id,
          correlationId: input.correlationId,
          createdAt: occurredAt,
        });
        await transaction.appendAuditEvent({
          actorUserId: input.actor.userId,
          actorRole: "patient",
          action: "CAREGIVER_SCOPE_CHANGED",
          resourceType: "CaregiverAuthorizationScope",
          resourceId: created.id,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt: occurredAt,
        });
        return created;
      });
    } catch (error) {
      if (error instanceof CaregiverScopeWriteConflictError) {
        throw new CaregiverAccessConflictError();
      }
      throw error;
    }
  }
}

export class AcceptCaregiverInvitationService {
  constructor(
    private readonly unitOfWork: CaregiverAccessUnitOfWork,
    private readonly tokenIssuer: CaregiverTokenIssuer,
    private readonly ttl: CaregiverDemoAccessTtl,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly invitationTokenHash: string;
    readonly correlationId: string;
  }) {
    assertCorrelationId(input.correlationId);
    caregiverRole(input.actor);
    const sessionToken = this.tokenIssuer.issue();
    const occurredAt = this.now();
    const result = await this.unitOfWork.run(async (transaction) => {
      let invitation = await transaction.findInvitationByTokenHash(input.invitationTokenHash);
      if (!invitation) throw new CaregiverAccessNotFoundError();
      await transaction.lockAuthorization(invitation.caregiverAuthorizationId);
      invitation = await transaction.findInvitationByTokenHash(input.invitationTokenHash);
      if (!invitation) throw new CaregiverAccessNotFoundError();
      const actorActive = await transaction.isActiveUserWithRole(input.actor.userId, "caregiver");
      if (
        !actorActive ||
        invitation.profile.caregiverUserId !== input.actor.userId ||
        invitation.consumedAt ||
        invitation.expiresAt <= occurredAt ||
        invitation.authorization.scope !== "caregiver:portal" ||
        !legalAuthorizationIsEffective(invitation.authorization, occurredAt)
      ) {
        await transaction.appendAccessAudit({
          caregiverAuthorizationId: invitation.authorization.id,
          caregiverProfileId: invitation.profile.id,
          actorUserId: input.actor.userId,
          action: "INVITATION_DENIED",
          outcome: "DENIED",
          resourceType: "CaregiverInvitation",
          resourceId: invitation.id,
          correlationId: input.correlationId,
          createdAt: occurredAt,
        });
        return { denied: true as const };
      }
      if (!(await transaction.consumeInvitation(invitation.id, occurredAt))) {
        throw new CaregiverAccessConflictError();
      }
      const expiresAt = new Date(
        Math.min(
          occurredAt.getTime() + this.ttl.sessionTtlMs,
          invitation.authorization.expiresAt?.getTime() ?? Infinity,
        ),
      );
      const session = await transaction.createSession({
        caregiverAuthorizationId: invitation.authorization.id,
        caregiverProfileId: invitation.profile.id,
        dischargeEpisodeId: invitation.dischargeEpisodeId,
        invitationId: invitation.id,
        sessionTokenHash: sessionToken.hash,
        createdAt: occurredAt,
        expiresAt,
      });
      await transaction.appendAccessAudit({
        caregiverAuthorizationId: invitation.authorization.id,
        caregiverProfileId: invitation.profile.id,
        caregiverSessionId: session.id,
        actorUserId: input.actor.userId,
        action: "INVITATION_ACCEPTED",
        outcome: "SUCCESS",
        resourceType: "CaregiverSession",
        resourceId: session.id,
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.actor.userId,
        actorRole: "caregiver",
        action: "CAREGIVER_INVITATION_ACCEPTED",
        resourceType: "CaregiverSession",
        resourceId: session.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: occurredAt,
      });
      return {
        denied: false as const,
        rawSessionToken: sessionToken.raw,
        sessionId: session.id,
        expiresAt,
      };
    });
    if (result.denied) throw new CaregiverAccessDeniedError();
    return result;
  }
}
