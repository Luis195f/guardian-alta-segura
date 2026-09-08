import {
  Prisma,
  RelayBoundaryEvent as PrismaRelayBoundaryEvent,
  RelayAcknowledged as PrismaRelayAcknowledged,
  RelayAvailabilityToReview as PrismaRelayAvailabilityToReview,
  RelayCallbackPreference as PrismaRelayCallbackPreference,
  RelayContactStatus as PrismaRelayContactStatus,
  RelayIdentityStatus as PrismaRelayIdentityStatus,
  RelayGovernanceOutcome as PrismaRelayGovernanceOutcome,
} from "@prisma/client";

import type {
  CreateRelayPreviewRecordInput,
  RelayAttemptRecord,
  RelayAttemptStore,
  RelayTechnicalResult,
} from "@/application/ports/continuity-relay";
import type {
  PatientRelayBoundaryEvent,
  PatientRelayCallbackPreference,
  PatientRelayContactStatus,
  PatientRelayIdentityStatus,
} from "@/domain/relay/patient-relay-contract";
import type {
  ProfessionalRelayAcknowledged,
  ProfessionalRelayAvailabilityToReview,
  ProfessionalRelayBoundaryEvent,
  ProfessionalRelayContactStatus,
  ProfessionalRelayIdentityStatus,
  ProfessionalRelayTechnicalResult,
} from "@/domain/relay/professional-relay-contract";
import { isRelayResultState, type RelayLifecycleState } from "@/domain/relay/continuity-relay";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";
import { prisma } from "@/infrastructure/persistence/prisma";

assertServerOnlyRuntime();

const attemptSelect = {
  id: true,
  recipientKind: true,
  purpose: true,
  episodeRef: true,
  taskRef: true,
  targetRef: true,
  actorRef: true,
  authorityFingerprint: true,
  confirmationDigest: true,
  idempotencyRef: true,
  outboundCallIntentRef: true,
  lifecycleState: true,
  attestationVersion: true,
  revision: true,
  region: true,
  locale: true,
  lineRegion: true,
  governanceOutcome: true,
  resultValidity: true,
  identityStatus: true,
  contactStatus: true,
  callbackPreference: true,
  acknowledged: true,
  availabilityToReview: true,
  boundaryEvent: true,
  expiresAt: true,
  consumedAt: true,
  revokedAt: true,
  reviewedByRef: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RelayAttemptSelect;

type PrismaAttempt = Prisma.RelayAttemptGetPayload<{ select: typeof attemptSelect }>;

function toAttempt(attempt: PrismaAttempt): RelayAttemptRecord {
  let technicalResult: RelayTechnicalResult | null = null;
  if (
    attempt.resultValidity === "VALID" &&
    attempt.identityStatus &&
    attempt.contactStatus &&
    attempt.boundaryEvent
  ) {
    if (attempt.recipientKind === "PATIENT" && attempt.callbackPreference) {
      technicalResult = {
        identity_status: attempt.identityStatus.toLowerCase() as PatientRelayIdentityStatus,
        contact_status: attempt.contactStatus.toLowerCase() as PatientRelayContactStatus,
        callback_preference:
          attempt.callbackPreference.toLowerCase() as PatientRelayCallbackPreference,
        boundary_event: attempt.boundaryEvent.toLowerCase() as PatientRelayBoundaryEvent,
      };
    } else if (
      attempt.recipientKind === "PROFESSIONAL" &&
      attempt.acknowledged &&
      attempt.availabilityToReview
    ) {
      technicalResult = {
        identity_status: attempt.identityStatus.toLowerCase() as ProfessionalRelayIdentityStatus,
        contact_status: attempt.contactStatus.toLowerCase() as ProfessionalRelayContactStatus,
        acknowledged: attempt.acknowledged.toLowerCase() as ProfessionalRelayAcknowledged,
        availability_to_review:
          attempt.availabilityToReview.toLowerCase() as ProfessionalRelayAvailabilityToReview,
        boundary_event: attempt.boundaryEvent.toLowerCase() as ProfessionalRelayBoundaryEvent,
      } satisfies ProfessionalRelayTechnicalResult;
    }
  }
  return {
    ...attempt,
    recipientKind: attempt.recipientKind,
    purpose: attempt.purpose,
    lifecycleState: attempt.lifecycleState,
    governanceOutcome: attempt.governanceOutcome,
    resultValidity: attempt.resultValidity,
    technicalResult,
  };
}

const identityStatusToPrisma: Readonly<
  Record<RelayTechnicalResult["identity_status"], PrismaRelayIdentityStatus>
> = {
  intended_recipient: PrismaRelayIdentityStatus.INTENDED_RECIPIENT,
  intended_professional: PrismaRelayIdentityStatus.INTENDED_PROFESSIONAL,
  wrong_recipient: PrismaRelayIdentityStatus.WRONG_RECIPIENT,
  unknown: PrismaRelayIdentityStatus.UNKNOWN,
};

const contactStatusToPrisma: Readonly<Record<PatientRelayContactStatus, PrismaRelayContactStatus>> =
  {
    reached: PrismaRelayContactStatus.REACHED,
    not_reached: PrismaRelayContactStatus.NOT_REACHED,
    unknown: PrismaRelayContactStatus.UNKNOWN,
  };

const callbackPreferenceToPrisma: Readonly<
  Record<PatientRelayCallbackPreference, PrismaRelayCallbackPreference>
> = {
  requested: PrismaRelayCallbackPreference.REQUESTED,
  not_requested: PrismaRelayCallbackPreference.NOT_REQUESTED,
  unknown: PrismaRelayCallbackPreference.UNKNOWN,
};

const acknowledgedToPrisma: Readonly<
  Record<ProfessionalRelayAcknowledged, PrismaRelayAcknowledged>
> = {
  yes: PrismaRelayAcknowledged.YES,
  no: PrismaRelayAcknowledged.NO,
  unknown: PrismaRelayAcknowledged.UNKNOWN,
};

const availabilityToReviewToPrisma: Readonly<
  Record<ProfessionalRelayAvailabilityToReview, PrismaRelayAvailabilityToReview>
> = {
  yes: PrismaRelayAvailabilityToReview.YES,
  no: PrismaRelayAvailabilityToReview.NO,
  unknown: PrismaRelayAvailabilityToReview.UNKNOWN,
};

const boundaryEventToPrisma: Readonly<Record<PatientRelayBoundaryEvent, PrismaRelayBoundaryEvent>> =
  {
    none: PrismaRelayBoundaryEvent.NONE,
    out_of_scope_request: PrismaRelayBoundaryEvent.OUT_OF_SCOPE_REQUEST,
    emergency_statement: PrismaRelayBoundaryEvent.EMERGENCY_STATEMENT,
    unknown: PrismaRelayBoundaryEvent.UNKNOWN,
  };

export class PrismaContinuityRelayStore implements RelayAttemptStore {
  async createPreview(input: CreateRelayPreviewRecordInput): Promise<RelayAttemptRecord> {
    return prisma.$transaction(async (transaction) => {
      const attempt = await transaction.relayAttempt.create({
        data: {
          recipientKind: input.recipientKind,
          purpose: input.purpose,
          episodeRef: input.episodeRef,
          taskRef: input.taskRef,
          targetRef: input.targetRef,
          actorRef: input.actorRef,
          authorityFingerprint: input.authorityFingerprint,
          confirmationDigest: input.confirmationDigest,
          idempotencyRef: input.idempotencyRef,
          attestationVersion: input.attestationVersion,
          revision: input.revision,
          region: input.region,
          locale: input.locale,
          lineRegion: input.lineRegion,
          expiresAt: input.expiresAt,
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        },
        select: attemptSelect,
      });
      await transaction.relayEvent.create({
        data: {
          attemptRef: attempt.id,
          fromState: null,
          toState: "PREVIEWED",
          actorRef: input.actorRef,
          occurredAt: input.createdAt,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: input.actorRef,
          actorRole: input.actorRole,
          action: "RELAY_PREVIEW_ISSUED",
          resourceType: "RelayAttempt",
          resourceId: attempt.id,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt: input.createdAt,
        },
      });
      return toAttempt(attempt);
    });
  }

  async findByConfirmationDigest(digest: string): Promise<RelayAttemptRecord | null> {
    const attempt = await prisma.relayAttempt.findUnique({
      where: { confirmationDigest: digest },
      select: attemptSelect,
    });
    return attempt ? toAttempt(attempt) : null;
  }

  async getById(attemptRef: string): Promise<RelayAttemptRecord | null> {
    const attempt = await prisma.relayAttempt.findUnique({
      where: { id: attemptRef },
      select: attemptSelect,
    });
    return attempt ? toAttempt(attempt) : null;
  }

  async consumeConfirmation(
    input: Parameters<RelayAttemptStore["consumeConfirmation"]>[0],
  ): Promise<RelayAttemptRecord | null> {
    return prisma.$transaction(async (transaction) => {
      const eligibility = input.professionalEligibility;
      const professionalGuard: Prisma.RelayAttemptWhereInput =
        input.recipientKind !== "PROFESSIONAL"
          ? {}
          : !eligibility || !input.context.taskRef
            ? { NOT: { id: input.attemptRef } }
            : {
                episode: {
                  is: {
                    id: input.context.episodeRef,
                    status: "ACTIVE",
                    version: eligibility.episodeRevision,
                    ...(input.actorRole === "nurse"
                      ? { responsibleNurseId: input.actorRef }
                      : { responsibleClinicianId: input.actorRef }),
                    ...(eligibility.targetRole === "nurse"
                      ? { responsibleNurseId: input.targetRef }
                      : { responsibleClinicianId: input.targetRef }),
                  },
                },
                task: {
                  is: {
                    id: input.context.taskRef,
                    episodeId: input.context.episodeRef,
                    currentState: "OPEN",
                    revision: eligibility.taskRevision,
                    assignedToId: input.targetRef,
                    assignedTo: {
                      is: {
                        isSynthetic: true,
                        isActive: true,
                        roleAssignments: {
                          some: {
                            id: eligibility.targetRoleAssignmentRef,
                            role: eligibility.targetRole,
                            revokedAt: null,
                          },
                        },
                      },
                    },
                  },
                },
                actor: {
                  is: {
                    isSynthetic: true,
                    isActive: true,
                    roleAssignments: {
                      some: {
                        id: eligibility.actorRoleAssignmentRef,
                        role: input.actorRole,
                        revokedAt: null,
                      },
                    },
                  },
                },
              };
      const consumed = await transaction.relayAttempt.updateMany({
        where: {
          id: input.attemptRef,
          confirmationDigest: input.confirmationDigest,
          actorRef: input.actorRef,
          recipientKind: input.recipientKind,
          purpose: input.purpose,
          episodeRef: input.context.episodeRef,
          taskRef: input.context.taskRef,
          targetRef: input.targetRef,
          authorityFingerprint: input.authorityFingerprint,
          attestationVersion: input.attestationVersion,
          revision: input.revision,
          lifecycleState: "PREVIEWED",
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: input.now },
          ...professionalGuard,
        },
        data: {
          lifecycleState: "CONFIRMED",
          consumedAt: input.now,
          updatedAt: input.now,
        },
      });
      if (consumed.count !== 1) return null;
      await transaction.relayEvent.create({
        data: {
          attemptRef: input.attemptRef,
          fromState: "PREVIEWED",
          toState: "CONFIRMED",
          actorRef: input.actorRef,
          occurredAt: input.now,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: input.actorRef,
          actorRole: input.actorRole,
          action: "RELAY_CONFIRMATION_CONSUMED",
          resourceType: "RelayAttempt",
          resourceId: input.attemptRef,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt: input.now,
        },
      });
      const attempt = await transaction.relayAttempt.findUniqueOrThrow({
        where: { id: input.attemptRef },
        select: attemptSelect,
      });
      return toAttempt(attempt);
    });
  }

  async recordConfirmationRejection(
    input: Parameters<RelayAttemptStore["recordConfirmationRejection"]>[0],
  ): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      await transaction.auditEvent.create({
        data: {
          actorUserId: input.actorRef,
          actorRole: input.actorRole,
          action: "RELAY_CONFIRMATION_REJECTED",
          resourceType: "RelayAttempt",
          resourceId: input.attemptRef,
          outcome: "DENIED",
          correlationId: input.correlationId,
          createdAt: input.now,
        },
      });
      if (input.authorityStale) {
        await transaction.auditEvent.create({
          data: {
            actorUserId: input.actorRef,
            actorRole: input.actorRole,
            action: "RELAY_AUTHORITY_STALE",
            resourceType: "RelayAttempt",
            resourceId: input.attemptRef,
            outcome: "DENIED",
            correlationId: input.correlationId,
            createdAt: input.now,
          },
        });
      }
    });
  }

  async recordOutboundState(
    input: Parameters<RelayAttemptStore["recordOutboundState"]>[0],
  ): Promise<RelayAttemptRecord> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "relay_attempts"
        WHERE "id" = ${input.attemptRef}
        FOR UPDATE
      `;
      let attempt = await transaction.relayAttempt.findUniqueOrThrow({
        where: { id: input.attemptRef },
        select: attemptSelect,
      });
      const outboundIntent = await transaction.outboundCallIntent.findUniqueOrThrow({
        where: { id: input.outboundIntent.id },
        select: {
          id: true,
          idempotencyRef: true,
          providerRef: true,
          state: true,
          technicalStatus: true,
          errorClass: true,
          errorCode: true,
        },
      });
      if (outboundIntent.idempotencyRef !== attempt.idempotencyRef) {
        throw new Error("Relay outbound intent binding conflict");
      }
      if (attempt.outboundCallIntentRef && attempt.outboundCallIntentRef !== outboundIntent.id) {
        throw new Error("Relay outbound intent reference conflict");
      }
      if (
        outboundIntent.providerRef !== input.outboundIntent.providerRef ||
        outboundIntent.state !== input.outboundIntent.state ||
        outboundIntent.technicalStatus !== input.outboundIntent.technicalStatus ||
        outboundIntent.errorClass !== input.outboundIntent.errorClass ||
        outboundIntent.errorCode !== input.outboundIntent.errorCode
      ) {
        throw new Error("Relay outbound intent snapshot conflict");
      }

      const governed = input.governedResult;
      if (
        (governed.terminal &&
          (!governed.humanReviewRequired || governed.resultValidity === null)) ||
        (!governed.terminal &&
          (governed.humanReviewRequired ||
            governed.resultValidity !== null ||
            governed.technicalResult !== null))
      ) {
        throw new Error("Relay governed result is inconsistent");
      }
      const intentRequiresReconciliation =
        outboundIntent.state === "RESERVED" ||
        outboundIntent.state === "POSTING" ||
        outboundIntent.state === "PROVIDER_ACCEPTED" ||
        outboundIntent.state === "POLLING" ||
        (outboundIntent.state === "UNCERTAIN" && outboundIntent.providerRef !== null);
      if (intentRequiresReconciliation === governed.terminal) {
        throw new Error("Relay governed result conflicts with outbound lifecycle");
      }
      if (
        !outboundIntent.providerRef &&
        (governed.outcome === "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW" ||
          governed.outcome === "RESULT_SCHEMA_VIOLATION")
      ) {
        return toAttempt(attempt);
      }
      if (!outboundIntent.providerRef && !governed.terminal) return toAttempt(attempt);

      if (attempt.lifecycleState === "CONFIRMED" && outboundIntent.providerRef) {
        const linked = await transaction.relayAttempt.updateMany({
          where: {
            id: attempt.id,
            lifecycleState: "CONFIRMED",
            outboundCallIntentRef: null,
          },
          data: {
            outboundCallIntentRef: outboundIntent.id,
            lifecycleState: "PROVIDER_CREATED",
            governanceOutcome: governed.terminal
              ? null
              : (governed.outcome as PrismaRelayGovernanceOutcome),
            updatedAt: input.now,
          },
        });
        if (linked.count !== 1) throw new Error("Relay provider transition conflict");
        await transaction.relayEvent.create({
          data: {
            attemptRef: attempt.id,
            fromState: "CONFIRMED",
            toState: "PROVIDER_CREATED",
            occurredAt: input.now,
          },
        });
        if (input.syntheticExecution) {
          await transaction.auditEvent.create({
            data: {
              actorUserId: null,
              actorRole: null,
              action: "RELAY_SYNTHETIC_EXECUTION_RECORDED",
              resourceType: "RelayAttempt",
              resourceId: attempt.id,
              outcome: "SUCCESS",
              correlationId: input.correlationId,
              createdAt: input.now,
            },
          });
        }
        await transaction.auditEvent.create({
          data: {
            actorUserId: null,
            actorRole: null,
            action: "RELAY_PROVIDER_REF_CREATED",
            resourceType: "RelayAttempt",
            resourceId: attempt.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            createdAt: input.now,
          },
        });
        attempt = await transaction.relayAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
          select: attemptSelect,
        });
      }

      if (!governed.terminal && attempt.lifecycleState === "PROVIDER_CREATED") {
        await transaction.relayAttempt.updateMany({
          where: { id: attempt.id, lifecycleState: "PROVIDER_CREATED" },
          data: {
            governanceOutcome: governed.outcome as PrismaRelayGovernanceOutcome,
            updatedAt: input.now,
          },
        });
      }

      if (
        governed.terminal &&
        (attempt.lifecycleState === "PROVIDER_CREATED" ||
          (attempt.lifecycleState === "CONFIRMED" && !outboundIntent.providerRef))
      ) {
        const fromState = attempt.lifecycleState;
        const successfulProviderResult =
          governed.outcome === "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW" ||
          governed.outcome === "RESULT_SCHEMA_VIOLATION";
        const nextState = successfulProviderResult ? "RESULT_COMPLETED" : "RESULT_UNCERTAIN";
        const disposition = successfulProviderResult ? "COMPLETED" : "UNCERTAIN";
        const updated = await transaction.relayAttempt.updateMany({
          where: {
            id: attempt.id,
            lifecycleState: fromState,
            ...(fromState === "CONFIRMED" ? { outboundCallIntentRef: null } : {}),
          },
          data: {
            outboundCallIntentRef: outboundIntent.id,
            lifecycleState: nextState,
            governanceOutcome: governed.outcome as PrismaRelayGovernanceOutcome,
            resultValidity: governed.resultValidity,
            identityStatus: governed.technicalResult
              ? identityStatusToPrisma[governed.technicalResult.identity_status]
              : null,
            contactStatus: governed.technicalResult
              ? contactStatusToPrisma[governed.technicalResult.contact_status]
              : null,
            callbackPreference: governed.technicalResult
              ? "callback_preference" in governed.technicalResult
                ? callbackPreferenceToPrisma[governed.technicalResult.callback_preference]
                : null
              : null,
            acknowledged: governed.technicalResult
              ? "acknowledged" in governed.technicalResult
                ? acknowledgedToPrisma[governed.technicalResult.acknowledged]
                : null
              : null,
            availabilityToReview: governed.technicalResult
              ? "availability_to_review" in governed.technicalResult
                ? availabilityToReviewToPrisma[governed.technicalResult.availability_to_review]
                : null
              : null,
            boundaryEvent: governed.technicalResult
              ? boundaryEventToPrisma[governed.technicalResult.boundary_event]
              : null,
            updatedAt: input.now,
          },
        });
        if (updated.count === 1) {
          await transaction.relayEvent.create({
            data: {
              attemptRef: attempt.id,
              fromState,
              toState: nextState,
              technicalDisposition: disposition,
              governanceOutcome: governed.outcome as PrismaRelayGovernanceOutcome,
              occurredAt: input.now,
            },
          });
          if (fromState === "CONFIRMED" && input.syntheticExecution) {
            await transaction.auditEvent.create({
              data: {
                actorUserId: null,
                actorRole: null,
                action: "RELAY_SYNTHETIC_EXECUTION_RECORDED",
                resourceType: "RelayAttempt",
                resourceId: attempt.id,
                outcome: "SUCCESS",
                correlationId: input.correlationId,
                createdAt: input.now,
              },
            });
          }
          await transaction.auditEvent.create({
            data: {
              actorUserId: null,
              actorRole: null,
              action: "RELAY_TECHNICAL_RESULT_AVAILABLE",
              resourceType: "RelayAttempt",
              resourceId: attempt.id,
              outcome: "SUCCESS",
              correlationId: input.correlationId,
              createdAt: input.now,
            },
          });
        }
      }
      const current = await transaction.relayAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
        select: attemptSelect,
      });
      return toAttempt(current);
    });
  }

  async recordHumanReview(
    input: Parameters<RelayAttemptStore["recordHumanReview"]>[0],
  ): Promise<RelayAttemptRecord | null> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.relayAttempt.findUnique({
        where: { id: input.attemptRef },
        select: attemptSelect,
      });
      if (!current || !isRelayResultState(current.lifecycleState as RelayLifecycleState))
        return null;
      const updated = await transaction.relayAttempt.updateMany({
        where: { id: current.id, lifecycleState: current.lifecycleState, reviewedAt: null },
        data: {
          lifecycleState: "HUMAN_REVIEWED",
          reviewedByRef: input.reviewerRef,
          reviewedAt: input.now,
          updatedAt: input.now,
        },
      });
      if (updated.count !== 1) return null;
      await transaction.relayEvent.create({
        data: {
          attemptRef: current.id,
          fromState: current.lifecycleState,
          toState: "HUMAN_REVIEWED",
          actorRef: input.reviewerRef,
          occurredAt: input.now,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: input.reviewerRef,
          actorRole: input.reviewerRole,
          action: "RELAY_HUMAN_REVIEW_RECORDED",
          resourceType: "RelayAttempt",
          resourceId: current.id,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt: input.now,
        },
      });
      const reviewed = await transaction.relayAttempt.findUniqueOrThrow({
        where: { id: current.id },
        select: attemptSelect,
      });
      return toAttempt(reviewed);
    });
  }
}
