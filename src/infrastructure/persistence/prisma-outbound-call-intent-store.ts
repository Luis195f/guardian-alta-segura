import { Prisma } from "@prisma/client";

import type {
  OutboundCallErrorClass,
  OutboundCallIntentRecord,
  OutboundCallIntentState,
  OutboundCallIntentStore,
  OutboundCallReconciliationState,
  OutboundCallSnapshot,
  OutboundCallTechnicalStatus,
} from "@/application/ports/outbound-call";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";
import { prisma } from "@/infrastructure/persistence/prisma";

assertServerOnlyRuntime();

const intentSelect = {
  id: true,
  idempotencyRef: true,
  protectedFingerprint: true,
  providerRef: true,
  state: true,
  technicalStatus: true,
  reconciliationState: true,
  errorClass: true,
  errorCode: true,
  createdAt: true,
  updatedAt: true,
  providerAcceptedAt: true,
  lastPolledAt: true,
  completedAt: true,
} satisfies Prisma.OutboundCallIntentSelect;

type PrismaIntent = Prisma.OutboundCallIntentGetPayload<{ select: typeof intentSelect }>;

function toIntent(intent: PrismaIntent): OutboundCallIntentRecord {
  return {
    ...intent,
    state: intent.state as OutboundCallIntentState,
    technicalStatus: intent.technicalStatus as OutboundCallTechnicalStatus | null,
    reconciliationState: intent.reconciliationState as OutboundCallReconciliationState,
    errorClass: intent.errorClass as OutboundCallErrorClass | null,
  };
}

function stateFor(snapshot: OutboundCallSnapshot): OutboundCallIntentState {
  switch (snapshot.status) {
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    case "CANCELED":
      return "CANCELED";
    case "QUEUED":
    case "IN_PROGRESS":
      return "POLLING";
  }
}

function completedAt(snapshot: OutboundCallSnapshot, now: Date): Date | null {
  return snapshot.status === "COMPLETED" ||
    snapshot.status === "FAILED" ||
    snapshot.status === "CANCELED"
    ? (snapshot.providerCompletedAt ?? now)
    : null;
}

function isTerminalState(state: OutboundCallIntentState): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "CANCELED";
}

export class PrismaOutboundCallIntentStore implements OutboundCallIntentStore {
  async reserve(input: {
    readonly idempotencyRef: string;
    readonly protectedFingerprint: string;
    readonly now: Date;
  }): Promise<OutboundCallIntentRecord> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const intent = await transaction.outboundCallIntent.create({
          data: {
            idempotencyRef: input.idempotencyRef,
            protectedFingerprint: input.protectedFingerprint,
            createdAt: input.now,
            updatedAt: input.now,
          },
          select: intentSelect,
        });
        await transaction.outboundCallIntentEvent.create({
          data: {
            intentId: intent.id,
            type: "RESERVED",
            fromState: null,
            toState: "RESERVED",
            occurredAt: input.now,
          },
        });
        return toIntent(intent);
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002")
        throw error;
      const existing = await this.getByIdempotencyRef(input.idempotencyRef);
      if (!existing) throw error;
      return existing;
    }
  }

  async claimPost(intentId: string, now: Date): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const claimed = await transaction.outboundCallIntent.updateMany({
        where: { id: intentId, state: "RESERVED", providerRef: null },
        data: {
          state: "POSTING",
          reconciliationState: "PENDING",
          updatedAt: now,
        },
      });
      if (claimed.count !== 1) return false;
      await transaction.outboundCallIntentEvent.create({
        data: {
          intentId,
          type: "POST_CLAIMED",
          fromState: "RESERVED",
          toState: "POSTING",
          occurredAt: now,
        },
      });
      return true;
    });
  }

  async persistProviderRef(input: {
    readonly intentId: string;
    readonly providerRef: string;
    readonly snapshot: OutboundCallSnapshot;
    readonly now: Date;
  }): Promise<OutboundCallIntentRecord> {
    return prisma.$transaction(async (transaction) => {
      const nextState = stateFor(input.snapshot);
      const updated = await transaction.outboundCallIntent.updateMany({
        where: { id: input.intentId, state: "POSTING", providerRef: null },
        data: {
          providerRef: input.providerRef,
          state: nextState,
          technicalStatus: input.snapshot.status,
          reconciliationState: "NOT_REQUIRED",
          errorClass: null,
          errorCode: null,
          providerAcceptedAt: input.now,
          updatedAt: input.now,
          completedAt: completedAt(input.snapshot, input.now),
        },
      });
      if (updated.count !== 1) throw new Error("Provider reference persistence conflict");
      await transaction.outboundCallIntentEvent.create({
        data: {
          intentId: input.intentId,
          type: "PROVIDER_REF_STORED",
          fromState: "POSTING",
          toState: nextState,
          occurredAt: input.now,
        },
      });
      const intent = await transaction.outboundCallIntent.findUniqueOrThrow({
        where: { id: input.intentId },
        select: intentSelect,
      });
      return toIntent(intent);
    });
  }

  async recordSnapshot(input: {
    readonly intentId: string;
    readonly snapshot: OutboundCallSnapshot;
    readonly reconciliationState: OutboundCallReconciliationState;
    readonly now: Date;
  }): Promise<OutboundCallIntentRecord> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.outboundCallIntent.findUniqueOrThrow({
        where: { id: input.intentId },
        select: intentSelect,
      });
      if (isTerminalState(current.state as OutboundCallIntentState)) return toIntent(current);
      if (!current.providerRef || current.providerRef !== input.snapshot.providerRef) {
        throw new Error("Provider reference reconciliation conflict");
      }
      const nextState = stateFor(input.snapshot);
      const updated = await transaction.outboundCallIntent.updateMany({
        where: { id: input.intentId, state: current.state, providerRef: current.providerRef },
        data: {
          state: nextState,
          technicalStatus: input.snapshot.status,
          reconciliationState: input.reconciliationState,
          errorClass: null,
          errorCode: null,
          lastPolledAt: input.now,
          updatedAt: input.now,
          completedAt: completedAt(input.snapshot, input.now),
        },
      });
      if (updated.count !== 1) {
        const latest = await transaction.outboundCallIntent.findUniqueOrThrow({
          where: { id: input.intentId },
          select: intentSelect,
        });
        if (isTerminalState(latest.state as OutboundCallIntentState)) return toIntent(latest);
        throw new Error("Provider snapshot persistence conflict");
      }
      await transaction.outboundCallIntentEvent.create({
        data: {
          intentId: input.intentId,
          type: "SNAPSHOT_RECORDED",
          fromState: current.state,
          toState: nextState,
          occurredAt: input.now,
        },
      });
      const intent = await transaction.outboundCallIntent.findUniqueOrThrow({
        where: { id: input.intentId },
        select: intentSelect,
      });
      return toIntent(intent);
    });
  }

  async recordError(
    input: Parameters<OutboundCallIntentStore["recordError"]>[0],
  ): Promise<OutboundCallIntentRecord> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.outboundCallIntent.findUniqueOrThrow({
        where: { id: input.intentId },
        select: intentSelect,
      });
      if (isTerminalState(current.state as OutboundCallIntentState)) return toIntent(current);
      const callNotReady = input.error.errorClass === "CALL_NOT_READY" && current.providerRef;
      const nextState: OutboundCallIntentState = callNotReady
        ? "POLLING"
        : input.error.uncertain
          ? "UNCERTAIN"
          : "FAILED";
      const updated = await transaction.outboundCallIntent.updateMany({
        where: { id: input.intentId, state: current.state },
        data: {
          state: nextState,
          reconciliationState: input.reconciliationState,
          errorClass: input.error.errorClass,
          errorCode: input.error.errorCode,
          updatedAt: input.now,
          completedAt: input.error.uncertain || callNotReady ? null : input.now,
        },
      });
      if (updated.count !== 1) {
        const latest = await transaction.outboundCallIntent.findUniqueOrThrow({
          where: { id: input.intentId },
          select: intentSelect,
        });
        if (isTerminalState(latest.state as OutboundCallIntentState)) return toIntent(latest);
        throw new Error("Provider error persistence conflict");
      }
      await transaction.outboundCallIntentEvent.create({
        data: {
          intentId: input.intentId,
          type: "ERROR_RECORDED",
          fromState: current.state,
          toState: nextState,
          occurredAt: input.now,
        },
      });
      const intent = await transaction.outboundCallIntent.findUniqueOrThrow({
        where: { id: input.intentId },
        select: intentSelect,
      });
      return toIntent(intent);
    });
  }

  async getByIdempotencyRef(idempotencyRef: string): Promise<OutboundCallIntentRecord | null> {
    const intent = await prisma.outboundCallIntent.findUnique({
      where: { idempotencyRef },
      select: intentSelect,
    });
    return intent ? toIntent(intent) : null;
  }
}
