import { Prisma } from "@prisma/client";

import type {
  CreateRelayPreviewRecordInput,
  RelayAttemptRecord,
  RelayAttemptStore,
} from "@/application/ports/continuity-relay";
import type { OutboundCallIntentState } from "@/application/ports/outbound-call";
import {
  isRelayResultState,
  relayResultState,
  type RelayLifecycleState,
  type RelayTechnicalDisposition,
} from "@/domain/relay/continuity-relay";
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
  return {
    ...attempt,
    recipientKind: attempt.recipientKind,
    purpose: attempt.purpose,
    lifecycleState: attempt.lifecycleState,
  };
}

function resultDisposition(state: OutboundCallIntentState): RelayTechnicalDisposition | null {
  switch (state) {
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    case "CANCELED":
      return "CANCELED";
    case "UNCERTAIN":
      return "UNCERTAIN";
    default:
      return null;
  }
}

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
      let attempt = await transaction.relayAttempt.findUniqueOrThrow({
        where: { id: input.attemptRef },
        select: attemptSelect,
      });
      const outboundIntent = await transaction.outboundCallIntent.findUniqueOrThrow({
        where: { id: input.outboundIntent.id },
        select: { id: true, idempotencyRef: true, providerRef: true, state: true },
      });
      if (outboundIntent.idempotencyRef !== attempt.idempotencyRef) {
        throw new Error("Relay outbound intent binding conflict");
      }
      if (!outboundIntent.providerRef) return toAttempt(attempt);
      if (attempt.outboundCallIntentRef && attempt.outboundCallIntentRef !== outboundIntent.id) {
        throw new Error("Relay outbound intent reference conflict");
      }

      if (attempt.lifecycleState === "CONFIRMED") {
        const linked = await transaction.relayAttempt.updateMany({
          where: {
            id: attempt.id,
            lifecycleState: "CONFIRMED",
            outboundCallIntentRef: null,
          },
          data: {
            outboundCallIntentRef: outboundIntent.id,
            lifecycleState: "PROVIDER_CREATED",
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

      const disposition = resultDisposition(outboundIntent.state as OutboundCallIntentState);
      if (attempt.lifecycleState === "PROVIDER_CREATED" && disposition) {
        const nextState = relayResultState(disposition);
        const updated = await transaction.relayAttempt.updateMany({
          where: { id: attempt.id, lifecycleState: "PROVIDER_CREATED" },
          data: { lifecycleState: nextState, updatedAt: input.now },
        });
        if (updated.count !== 1) throw new Error("Relay result transition conflict");
        await transaction.relayEvent.create({
          data: {
            attemptRef: attempt.id,
            fromState: "PROVIDER_CREATED",
            toState: nextState,
            technicalDisposition: disposition,
            occurredAt: input.now,
          },
        });
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
