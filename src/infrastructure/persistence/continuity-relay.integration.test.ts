import { createHash, randomBytes, randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import type { CreateRelayPreviewRecordInput } from "@/application/ports/continuity-relay";
import type { OutboundCallSnapshot } from "@/application/ports/outbound-call";
import { normalizeRelayResult } from "@/application/relay/result-governance";
import { SYNTHETIC_PATIENT_RELAY_RESULT } from "@/domain/relay/patient-relay-contract";
import { SYNTHETIC_PROFESSIONAL_RELAY_RESULT } from "@/domain/relay/professional-relay-contract";
import { PrismaContinuityRelayStore } from "@/infrastructure/persistence/prisma-continuity-relay-store";
import { PrismaOutboundCallIntentStore } from "@/infrastructure/persistence/prisma-outbound-call-intent-store";
import { prisma } from "@/infrastructure/persistence/prisma";

const relayStore = new PrismaContinuityRelayStore();
const outboundStore = new PrismaOutboundCallIntentStore();
const CORRELATION_ID = "018f673a-4e35-7060-99b5-7bc6feba3a97";
const NOW = new Date("2026-08-30T10:00:00.000Z");
const RESULT_FIELDS = {
  governedResult: {
    outcome: "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW" as const,
    terminal: true,
    resultValidity: "VALID" as const,
    technicalResult: SYNTHETIC_PATIENT_RELAY_RESULT,
    humanReviewRequired: true,
  },
  syntheticExecution: true,
};

let actorRef = "";
let episodeRef = "";
let professionalTargetRef = "";
let professionalTaskRef = "";
let actorRoleAssignmentRef = "";
let targetRoleAssignmentRef = "";

function hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function idempotencyRef(): string {
  return `relay_${randomBytes(24).toString("base64url")}`;
}

function previewInput(
  overrides: Partial<CreateRelayPreviewRecordInput> = {},
): CreateRelayPreviewRecordInput {
  const nonce = randomUUID();
  return {
    recipientKind: "PATIENT",
    purpose: "PATIENT_CALLBACK_OFFER",
    episodeRef,
    taskRef: null,
    targetRef: `synthetic-target-${nonce}`,
    actorRef,
    actorRole: "nurse",
    authorityFingerprint: hex(`fingerprint-${nonce}`),
    confirmationDigest: hex(`high-entropy-token-${nonce}`),
    idempotencyRef: idempotencyRef(),
    attestationVersion: "test-attestation-v1",
    revision: "episode-v1",
    region: "ES",
    locale: "es-ES",
    lineRegion: "TEST_ONLY_INTERNATIONAL",
    expiresAt: new Date(NOW.getTime() + 5 * 60_000),
    createdAt: NOW,
    correlationId: CORRELATION_ID,
    ...overrides,
  };
}

function consumeInput(
  record: Awaited<ReturnType<typeof relayStore.createPreview>>,
  overrides: Partial<Parameters<typeof relayStore.consumeConfirmation>[0]> = {},
): Parameters<typeof relayStore.consumeConfirmation>[0] {
  return {
    attemptRef: record.id,
    confirmationDigest: record.confirmationDigest,
    actorRef: record.actorRef,
    actorRole: "nurse",
    recipientKind: record.recipientKind,
    purpose: record.purpose,
    context: { episodeRef: record.episodeRef, taskRef: record.taskRef },
    targetRef: record.targetRef,
    authorityFingerprint: record.authorityFingerprint,
    attestationVersion: record.attestationVersion,
    revision: record.revision,
    professionalEligibility: null,
    correlationId: CORRELATION_ID,
    now: new Date(NOW.getTime() + 1_000),
    ...overrides,
  };
}

function snapshot(
  providerRef: string,
  status: OutboundCallSnapshot["status"],
): OutboundCallSnapshot {
  return {
    providerRef,
    status,
    structuredResult: "ABSTAINED",
    providerCreatedAt: NOW,
    providerCompletedAt: status === "COMPLETED" ? new Date(NOW.getTime() + 3_000) : null,
  };
}

beforeAll(async () => {
  const suffix = randomUUID();
  const nurse = await prisma.user.create({
    data: {
      syntheticAlias: `relay-nurse-${suffix}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — Relay nurse",
      isSynthetic: true,
      roleAssignments: { create: { role: "nurse" } },
    },
  });
  const clinician = await prisma.user.create({
    data: {
      syntheticAlias: `relay-clinician-${suffix}`,
      displayLabel: "SINTÉTICO / NO USO CLÍNICO — Relay clinician",
      isSynthetic: true,
      roleAssignments: { create: { role: "clinician" } },
    },
  });
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `relay-patient-${suffix}`,
      isSynthetic: true,
      createdById: nurse.id,
    },
  });
  const protocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `relay-test-${suffix}`,
      versionNumber: 1,
      title: "SINTÉTICO / TEST ONLY — Relay protocol",
      state: "SYNTHETIC_DEMO",
      isSyntheticFixture: true,
      createdById: nurse.id,
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-08-30T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
      status: "ACTIVE",
    },
  });
  actorRef = nurse.id;
  episodeRef = episode.id;
  professionalTargetRef = clinician.id;
  actorRoleAssignmentRef = (
    await prisma.roleAssignment.findFirstOrThrow({
      where: { userId: nurse.id, role: "nurse", revokedAt: null },
    })
  ).id;
  targetRoleAssignmentRef = (
    await prisma.roleAssignment.findFirstOrThrow({
      where: { userId: clinician.id, role: "clinician", revokedAt: null },
    })
  ).id;
  const task = await prisma.task.create({
    data: {
      episodeId: episode.id,
      summary: "SINTÉTICO — elemento opaco para relay profesional.",
      assignedToId: clinician.id,
      createdById: nurse.id,
      creationIdempotencyKey: `relay-professional-${suffix}`,
      creationFingerprint: hex(`relay-professional-${suffix}`),
      revision: 1,
      events: {
        create: {
          type: "CREATED",
          fromState: null,
          toState: "OPEN",
          fromAssignedToId: null,
          toAssignedToId: clinician.id,
          actorUserId: nurse.id,
          actorRole: "nurse",
          idempotencyKey: `relay-professional-event-${suffix}`,
          requestFingerprint: hex(`relay-professional-event-${suffix}`),
          resultingRevision: 1,
          occurredAt: NOW,
        },
      },
    },
  });
  professionalTaskRef = task.id;
});

describe.sequential("Continuity Relay PostgreSQL guarantees", () => {
  it("grants exactly one atomic consumer and rejects replay under concurrency", async () => {
    const record = await relayStore.createPreview(previewInput());
    const input = consumeInput(record);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => relayStore.consumeConfirmation(input)),
    );
    expect(results.filter((result) => result !== null)).toHaveLength(1);
    await expect(relayStore.consumeConfirmation(input)).resolves.toBeNull();
    expect(
      await prisma.relayEvent.count({ where: { attemptRef: record.id, toState: "CONFIRMED" } }),
    ).toBe(1);
    expect(
      await prisma.auditEvent.count({
        where: { resourceId: record.id, action: "RELAY_CONFIRMATION_CONSUMED" },
      }),
    ).toBe(1);
  });

  it.each([
    [
      "wrong actor",
      (record: Awaited<ReturnType<typeof relayStore.createPreview>>) => {
        void record;
        return { actorRef: "wrong-opaque-actor" };
      },
    ],
    [
      "crossed purpose",
      () => ({
        recipientKind: "PROFESSIONAL" as const,
        purpose: "PROFESSIONAL_REVIEW_REQUEST" as const,
      }),
    ],
    ["changed target", () => ({ targetRef: "synthetic-target-modified" })],
    ["stale revision", () => ({ revision: "episode-v2" })],
    ["expired", () => ({ now: new Date(NOW.getTime() + 10 * 60_000) })],
  ])("rejects %s without consuming", async (_label, mutate) => {
    const record = await relayStore.createPreview(previewInput());
    await expect(
      relayStore.consumeConfirmation(consumeInput(record, mutate(record))),
    ).resolves.toBeNull();
    await expect(relayStore.getById(record.id)).resolves.toMatchObject({
      lifecycleState: "PREVIEWED",
      consumedAt: null,
    });
  });

  it("rejects a revoked preview atomically", async () => {
    const record = await relayStore.createPreview(previewInput());
    await prisma.relayAttempt.update({
      where: { id: record.id },
      data: { revokedAt: new Date(NOW.getTime() + 500), updatedAt: new Date(NOW.getTime() + 500) },
    });
    await expect(relayStore.consumeConfirmation(consumeInput(record))).resolves.toBeNull();
  });

  it("atomically revalidates professional assignment and active roles before consumption", async () => {
    const professionalPreview = await relayStore.createPreview(
      previewInput({
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        taskRef: professionalTaskRef,
        targetRef: professionalTargetRef,
        revision: "professional-assignment-v1",
      }),
    );
    const professionalEligibility = {
      episodeRevision: 1,
      taskRevision: 1,
      actorRoleAssignmentRef,
      targetRoleAssignmentRef,
      targetRole: "clinician" as const,
    };
    await prisma.roleAssignment.update({
      where: { id: targetRoleAssignmentRef },
      data: { revokedAt: new Date(NOW.getTime() + 500) },
    });
    try {
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          relayStore.consumeConfirmation(
            consumeInput(professionalPreview, { professionalEligibility }),
          ),
        ),
      );
      expect(results.every((result) => result === null)).toBe(true);
      await expect(relayStore.getById(professionalPreview.id)).resolves.toMatchObject({
        lifecycleState: "PREVIEWED",
        consumedAt: null,
      });
    } finally {
      await prisma.roleAssignment.update({
        where: { id: targetRoleAssignmentRef },
        data: { revokedAt: null },
      });
    }

    const fresh = await relayStore.createPreview(
      previewInput({
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        taskRef: professionalTaskRef,
        targetRef: professionalTargetRef,
        revision: "professional-assignment-v1",
      }),
    );
    const concurrent = await Promise.all(
      Array.from({ length: 8 }, () =>
        relayStore.consumeConfirmation(consumeInput(fresh, { professionalEligibility })),
      ),
    );
    expect(concurrent.filter((result) => result !== null)).toHaveLength(1);
  });

  it("requires persisted providerRef, preserves terminal state, and records one human review", async () => {
    const preview = await relayStore.createPreview(previewInput());
    const confirmed = await relayStore.consumeConfirmation(consumeInput(preview));
    if (!confirmed) throw new Error("Synthetic confirmation was not consumed");
    const reserved = await outboundStore.reserve({
      idempotencyRef: confirmed.idempotencyRef,
      protectedFingerprint: hex(`outbound-${confirmed.id}`),
      now: new Date(NOW.getTime() + 2_000),
    });
    const withoutProvider = await relayStore.recordOutboundState({
      attemptRef: confirmed.id,
      outboundIntent: reserved,
      governedResult: normalizeRelayResult({
        purpose: confirmed.purpose,
        intent: reserved,
        structuredResult: null,
      }),
      syntheticExecution: true,
      now: new Date(NOW.getTime() + 2_000),
      correlationId: CORRELATION_ID,
    });
    expect(withoutProvider.lifecycleState).toBe("CONFIRMED");
    expect(await outboundStore.claimPost(reserved.id, new Date(NOW.getTime() + 2_000))).toBe(true);
    const providerRef = `synthetic-provider-${randomUUID()}`;
    const queued = await outboundStore.persistProviderRef({
      intentId: reserved.id,
      providerRef,
      snapshot: snapshot(providerRef, "QUEUED"),
      now: new Date(NOW.getTime() + 2_000),
    });
    const providerCreated = await relayStore.recordOutboundState({
      attemptRef: confirmed.id,
      outboundIntent: queued,
      governedResult: normalizeRelayResult({
        purpose: confirmed.purpose,
        intent: queued,
        structuredResult: null,
      }),
      syntheticExecution: true,
      now: new Date(NOW.getTime() + 2_000),
      correlationId: CORRELATION_ID,
    });
    expect(providerCreated.lifecycleState).toBe("PROVIDER_CREATED");

    const completed = await outboundStore.recordSnapshot({
      intentId: reserved.id,
      snapshot: snapshot(providerRef, "COMPLETED"),
      reconciliationState: "RECONCILED",
      now: new Date(NOW.getTime() + 3_000),
    });
    const concurrentResults = await Promise.all(
      Array.from({ length: 8 }, () =>
        relayStore.recordOutboundState({
          attemptRef: confirmed.id,
          outboundIntent: completed,
          ...RESULT_FIELDS,
          now: new Date(NOW.getTime() + 3_000),
          correlationId: CORRELATION_ID,
        }),
      ),
    );
    expect(concurrentResults).toHaveLength(8);
    expect(
      concurrentResults.every(({ lifecycleState }) => lifecycleState === "RESULT_COMPLETED"),
    ).toBe(true);
    expect(concurrentResults[0]).toMatchObject({
      governanceOutcome: "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW",
      resultValidity: "VALID",
      technicalResult: SYNTHETIC_PATIENT_RELAY_RESULT,
      reviewedAt: null,
    });
    expect(
      await prisma.relayEvent.count({
        where: { attemptRef: confirmed.id, toState: "RESULT_COMPLETED" },
      }),
    ).toBe(1);
    expect(
      await prisma.auditEvent.count({
        where: { resourceId: confirmed.id, action: "RELAY_SYNTHETIC_EXECUTION_RECORDED" },
      }),
    ).toBe(1);
    await expect(
      relayStore.recordOutboundState({
        attemptRef: confirmed.id,
        outboundIntent: queued,
        ...RESULT_FIELDS,
        now: new Date(NOW.getTime() + 4_000),
        correlationId: CORRELATION_ID,
      }),
    ).rejects.toThrow("Relay outbound intent snapshot conflict");
    await expect(relayStore.getById(confirmed.id)).resolves.toMatchObject({
      lifecycleState: "RESULT_COMPLETED",
      governanceOutcome: "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW",
    });

    const reviewed = await relayStore.recordHumanReview({
      attemptRef: confirmed.id,
      reviewerRef: actorRef,
      reviewerRole: "nurse",
      correlationId: CORRELATION_ID,
      now: new Date(NOW.getTime() + 5_000),
    });
    expect(reviewed).toMatchObject({ lifecycleState: "HUMAN_REVIEWED", reviewedByRef: actorRef });
    await expect(
      prisma.relayAttempt.update({
        where: { id: confirmed.id },
        data: { identityStatus: "UNKNOWN" },
      }),
    ).rejects.toThrow();
    await expect(
      relayStore.recordHumanReview({
        attemptRef: confirmed.id,
        reviewerRef: actorRef,
        reviewerRole: "nurse",
        correlationId: CORRELATION_ID,
        now: new Date(NOW.getTime() + 6_000),
      }),
    ).resolves.toBeNull();

    await expect(
      prisma.relayAttempt.update({
        where: { id: confirmed.id },
        data: { lifecycleState: "CONFIRMED", reviewedByRef: null, reviewedAt: null },
      }),
    ).rejects.toThrow();
    const event = await prisma.relayEvent.findFirstOrThrow({ where: { attemptRef: confirmed.id } });
    await expect(
      prisma.relayEvent.update({ where: { id: event.id }, data: { occurredAt: new Date() } }),
    ).rejects.toThrow();
    await expect(
      prisma.relayEvent.create({
        data: {
          attemptRef: confirmed.id,
          fromState: "RESULT_COMPLETED",
          toState: "HUMAN_REVIEWED",
          actorRef,
          occurredAt: new Date(NOW.getTime() + 7_000),
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.relayAttempt.update({
        where: { id: confirmed.id },
        data: { reviewedByRef: actorRef, reviewedAt: new Date(NOW.getTime() + 7_000) },
      }),
    ).rejects.toThrow();
  });

  it("records a pre-create provider error without inventing contact and requires review", async () => {
    const preview = await relayStore.createPreview(previewInput());
    const confirmed = await relayStore.consumeConfirmation(consumeInput(preview));
    if (!confirmed) throw new Error("Synthetic confirmation was not consumed");
    const reserved = await outboundStore.reserve({
      idempotencyRef: confirmed.idempotencyRef,
      protectedFingerprint: hex(`pre-create-${confirmed.id}`),
      now: new Date(NOW.getTime() + 2_000),
    });
    expect(await outboundStore.claimPost(reserved.id, new Date(NOW.getTime() + 2_000))).toBe(true);
    const failed = await outboundStore.recordError({
      intentId: reserved.id,
      error: {
        errorClass: "PROVIDER_UNAVAILABLE",
        errorCode: "provider_unavailable",
        uncertain: false,
      },
      reconciliationState: "NOT_REQUIRED",
      now: new Date(NOW.getTime() + 3_000),
    });
    const recorded = await relayStore.recordOutboundState({
      attemptRef: confirmed.id,
      outboundIntent: failed,
      governedResult: normalizeRelayResult({
        purpose: confirmed.purpose,
        intent: failed,
        structuredResult: null,
      }),
      syntheticExecution: true,
      now: new Date(NOW.getTime() + 3_000),
      correlationId: CORRELATION_ID,
    });
    expect(recorded).toMatchObject({
      lifecycleState: "RESULT_UNCERTAIN",
      governanceOutcome: "CHANNEL_UNAVAILABLE",
      resultValidity: "MISSING",
      technicalResult: null,
      reviewedAt: null,
    });
    await expect(
      relayStore.recordHumanReview({
        attemptRef: confirmed.id,
        reviewerRef: actorRef,
        reviewerRole: "nurse",
        correlationId: CORRELATION_ID,
        now: new Date(NOW.getTime() + 4_000),
      }),
    ).resolves.toMatchObject({ lifecycleState: "HUMAN_REVIEWED" });
  });

  it("keeps timeout after providerRef pending and reconciles the same intent", async () => {
    const preview = await relayStore.createPreview(previewInput());
    const confirmed = await relayStore.consumeConfirmation(consumeInput(preview));
    if (!confirmed) throw new Error("Synthetic confirmation was not consumed");
    const reserved = await outboundStore.reserve({
      idempotencyRef: confirmed.idempotencyRef,
      protectedFingerprint: hex(`reconcile-${confirmed.id}`),
      now: new Date(NOW.getTime() + 2_000),
    });
    expect(await outboundStore.claimPost(reserved.id, new Date(NOW.getTime() + 2_000))).toBe(true);
    const providerRef = `synthetic-reconcile-${randomUUID()}`;
    const queued = await outboundStore.persistProviderRef({
      intentId: reserved.id,
      providerRef,
      snapshot: snapshot(providerRef, "QUEUED"),
      now: new Date(NOW.getTime() + 3_000),
    });
    const uncertain = await outboundStore.recordError({
      intentId: queued.id,
      error: { errorClass: "TIMEOUT", errorCode: "polling_timeout", uncertain: true },
      reconciliationState: "PENDING",
      now: new Date(NOW.getTime() + 4_000),
    });
    const pending = await relayStore.recordOutboundState({
      attemptRef: confirmed.id,
      outboundIntent: uncertain,
      governedResult: normalizeRelayResult({
        purpose: confirmed.purpose,
        intent: uncertain,
        structuredResult: null,
      }),
      syntheticExecution: true,
      now: new Date(NOW.getTime() + 4_000),
      correlationId: CORRELATION_ID,
    });
    expect(pending).toMatchObject({
      lifecycleState: "PROVIDER_CREATED",
      governanceOutcome: "UNKNOWN_PENDING_RECONCILIATION",
      outboundCallIntentRef: reserved.id,
      reviewedAt: null,
    });
    await expect(
      relayStore.recordHumanReview({
        attemptRef: confirmed.id,
        reviewerRef: actorRef,
        reviewerRole: "nurse",
        correlationId: CORRELATION_ID,
        now: new Date(NOW.getTime() + 5_000),
      }),
    ).resolves.toBeNull();

    const completed = await outboundStore.recordSnapshot({
      intentId: reserved.id,
      snapshot: snapshot(providerRef, "COMPLETED"),
      reconciliationState: "RECONCILED",
      now: new Date(NOW.getTime() + 6_000),
    });
    const reconciled = await relayStore.recordOutboundState({
      attemptRef: confirmed.id,
      outboundIntent: completed,
      governedResult: normalizeRelayResult({
        purpose: confirmed.purpose,
        intent: completed,
        structuredResult: SYNTHETIC_PATIENT_RELAY_RESULT,
      }),
      syntheticExecution: true,
      now: new Date(NOW.getTime() + 6_000),
      correlationId: CORRELATION_ID,
    });
    expect(reconciled).toMatchObject({
      lifecycleState: "RESULT_COMPLETED",
      governanceOutcome: "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW",
      outboundCallIntentRef: reserved.id,
      reviewedAt: null,
    });
    expect(
      await prisma.outboundCallIntent.count({
        where: { idempotencyRef: confirmed.idempotencyRef, providerRef },
      }),
    ).toBe(1);
  });

  it("persists the Professional Relay result as the separate closed allowlist", async () => {
    const taskBefore = await prisma.task.findUniqueOrThrow({
      where: { id: professionalTaskRef },
      select: { currentState: true, assignedToId: true, revision: true, resolvedAt: true },
    });
    const preview = await relayStore.createPreview(
      previewInput({
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        taskRef: professionalTaskRef,
        targetRef: professionalTargetRef,
        revision: "professional-assignment-v1",
      }),
    );
    const confirmed = await relayStore.consumeConfirmation(
      consumeInput(preview, {
        professionalEligibility: {
          episodeRevision: 1,
          taskRevision: 1,
          actorRoleAssignmentRef,
          targetRoleAssignmentRef,
          targetRole: "clinician",
        },
      }),
    );
    if (!confirmed) throw new Error("Synthetic professional confirmation was not consumed");
    const reserved = await outboundStore.reserve({
      idempotencyRef: confirmed.idempotencyRef,
      protectedFingerprint: hex(`professional-${confirmed.id}`),
      now: new Date(NOW.getTime() + 2_000),
    });
    expect(await outboundStore.claimPost(reserved.id, new Date(NOW.getTime() + 2_000))).toBe(true);
    const providerRef = `synthetic-professional-${randomUUID()}`;
    const completed = await outboundStore.persistProviderRef({
      intentId: reserved.id,
      providerRef,
      snapshot: snapshot(providerRef, "COMPLETED"),
      now: new Date(NOW.getTime() + 3_000),
    });
    const recorded = await relayStore.recordOutboundState({
      attemptRef: confirmed.id,
      outboundIntent: completed,
      governedResult: {
        outcome: "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW",
        terminal: true,
        resultValidity: "VALID",
        technicalResult: SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
        humanReviewRequired: true,
      },
      syntheticExecution: true,
      now: new Date(NOW.getTime() + 3_000),
      correlationId: CORRELATION_ID,
    });
    expect(recorded).toMatchObject({
      lifecycleState: "RESULT_COMPLETED",
      technicalResult: SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
    });
    const stored = await prisma.relayAttempt.findUniqueOrThrow({ where: { id: confirmed.id } });
    expect(stored).toMatchObject({
      callbackPreference: null,
      acknowledged: "YES",
      availabilityToReview: "YES",
    });
    await expect(
      prisma.task.findUniqueOrThrow({
        where: { id: professionalTaskRef },
        select: { currentState: true, assignedToId: true, revision: true, resolvedAt: true },
      }),
    ).resolves.toEqual(taskBefore);
  });

  it("persists no phone, token, visible target, prompt, clinical content, or provider payload columns", async () => {
    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'relay_attempts',
          'relay_events',
          'outbound_call_intents',
          'outbound_call_intent_events'
        )
      ORDER BY table_name, column_name
    `;
    const serializedColumns = JSON.stringify(columns.map(({ column_name }) => column_name));
    for (const prohibited of [
      "phone",
      "token",
      "masked",
      "prompt",
      "task_contract",
      "transcript",
      "summary",
      "evidence",
      "recording",
      "payload",
      "headers",
      "api_key",
      "metadata",
      "clinical",
      "name",
      "attempts",
    ]) {
      expect(serializedColumns).not.toContain(prohibited);
    }
    const latest = await prisma.relayAttempt.findFirstOrThrow({ orderBy: { createdAt: "desc" } });
    expect(JSON.stringify(latest)).not.toContain("high-entropy-token");
    expect(JSON.stringify(latest)).not.toContain(SYNTHETIC_PHONE_SENTINEL);
  });
});

const SYNTHETIC_PHONE_SENTINEL = ["+", "34", "600", "000", "001"].join("");
