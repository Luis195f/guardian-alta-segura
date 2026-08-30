import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { OutboundCallSnapshot } from "@/application/ports/outbound-call";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaOutboundCallIntentStore } from "@/infrastructure/persistence/prisma-outbound-call-intent-store";

const store = new PrismaOutboundCallIntentStore();

function idempotencyRef(): string {
  return `synthetic-${randomUUID()}`;
}

function fingerprint(character = "a"): string {
  return character.repeat(64);
}

function snapshot(status: OutboundCallSnapshot["status"] = "QUEUED"): OutboundCallSnapshot {
  return {
    providerRef: `synthetic-provider-${randomUUID()}`,
    status,
    structuredResult: "ABSTAINED",
    providerCreatedAt: new Date("2026-08-29T10:00:00.000Z"),
    providerCompletedAt: status === "COMPLETED" ? new Date("2026-08-29T10:01:00.000Z") : null,
  };
}

describe("minimal outbound call intent persistence", () => {
  it("reserves one intent and grants one POST claim under concurrency", async () => {
    const ref = idempotencyRef();
    const now = new Date("2026-08-29T10:00:00.000Z");
    const reservations = await Promise.all(
      Array.from({ length: 8 }, () =>
        store.reserve({ idempotencyRef: ref, protectedFingerprint: fingerprint(), now }),
      ),
    );
    expect(new Set(reservations.map((record) => record.id)).size).toBe(1);
    const reservedIntentId = reservations[0]?.id;
    if (!reservedIntentId) throw new Error("Synthetic reservation was not created");
    const claims = await Promise.all(reservations.map((record) => store.claimPost(record.id, now)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await prisma.outboundCallIntent.count({ where: { idempotencyRef: ref } })).toBe(1);
    expect(
      await prisma.outboundCallIntentEvent.count({ where: { intentId: reservedIntentId } }),
    ).toBe(2);
  });

  it("stores providerRef before polling data and only the technical allowlist", async () => {
    const now = new Date("2026-08-29T10:00:00.000Z");
    const intent = await store.reserve({
      idempotencyRef: idempotencyRef(),
      protectedFingerprint: fingerprint(),
      now,
    });
    expect(await store.claimPost(intent.id, now)).toBe(true);
    const created = snapshot();
    const accepted = await store.persistProviderRef({
      intentId: intent.id,
      providerRef: created.providerRef,
      snapshot: created,
      now,
    });
    expect(accepted.providerRef).toBe(created.providerRef);
    expect(accepted.lastPolledAt).toBeNull();

    const terminal = { ...created, status: "COMPLETED" as const };
    const reconciled = await store.recordSnapshot({
      intentId: intent.id,
      snapshot: terminal,
      reconciliationState: "RECONCILED",
      now: new Date("2026-08-29T10:01:00.000Z"),
    });
    expect(reconciled.state).toBe("COMPLETED");
    expect(reconciled.reconciliationState).toBe("RECONCILED");

    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'outbound_call_intents'
      ORDER BY column_name
    `;
    const names = columns.map((column) => column.column_name);
    for (const prohibited of [
      "phone",
      "task",
      "payload",
      "summary",
      "evidence",
      "transcript",
      "attempts",
      "recording",
      "provider_body",
    ]) {
      expect(names.some((name) => name.includes(prohibited))).toBe(false);
    }
  });

  it("keeps identity immutable and technical events append-only", async () => {
    const now = new Date("2026-08-29T10:00:00.000Z");
    const intent = await store.reserve({
      idempotencyRef: idempotencyRef(),
      protectedFingerprint: fingerprint(),
      now,
    });
    await expect(
      prisma.outboundCallIntent.update({
        where: { id: intent.id },
        data: { protectedFingerprint: fingerprint("b") },
      }),
    ).rejects.toThrow();
    const event = await prisma.outboundCallIntentEvent.findFirstOrThrow({
      where: { intentId: intent.id },
    });
    await expect(
      prisma.outboundCallIntentEvent.update({
        where: { id: event.id },
        data: { occurredAt: new Date("2026-08-29T10:02:00.000Z") },
      }),
    ).rejects.toThrow();
  });

  it("does not regress a terminal state under stale polling or error results", async () => {
    const now = new Date("2026-08-29T10:00:00.000Z");
    const intent = await store.reserve({
      idempotencyRef: idempotencyRef(),
      protectedFingerprint: fingerprint(),
      now,
    });
    expect(await store.claimPost(intent.id, now)).toBe(true);
    const queued = snapshot();
    await store.persistProviderRef({
      intentId: intent.id,
      providerRef: queued.providerRef,
      snapshot: queued,
      now,
    });
    const completed = await store.recordSnapshot({
      intentId: intent.id,
      snapshot: { ...queued, status: "COMPLETED" },
      reconciliationState: "RECONCILED",
      now: new Date("2026-08-29T10:01:00.000Z"),
    });
    const eventCount = await prisma.outboundCallIntentEvent.count({
      where: { intentId: intent.id },
    });

    const stale = await store.recordSnapshot({
      intentId: intent.id,
      snapshot: { ...queued, status: "IN_PROGRESS" },
      reconciliationState: "NOT_REQUIRED",
      now: new Date("2026-08-29T10:02:00.000Z"),
    });
    const lateError = await store.recordError({
      intentId: intent.id,
      error: { errorClass: "TIMEOUT", errorCode: "late_timeout", uncertain: true },
      reconciliationState: "REVIEW_REQUIRED",
      now: new Date("2026-08-29T10:03:00.000Z"),
    });

    expect(completed.state).toBe("COMPLETED");
    expect(stale.state).toBe("COMPLETED");
    expect(lateError.state).toBe("COMPLETED");
    expect(await prisma.outboundCallIntentEvent.count({ where: { intentId: intent.id } })).toBe(
      eventCount,
    );
  });
});
