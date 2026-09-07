import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  ContinuityRelayService,
  RelayConflictError,
  RelayDeniedError,
  RelayInvalidError,
  type RelayConfirmationRequest,
  type RelayPreviewRequest,
} from "@/application/relay/manage-continuity-relay";
import type {
  CreateRelayPreviewRecordInput,
  RelayActorContext,
  RelayAttemptRecord,
  RelayAttemptStore,
  RelayAttestationVerifier,
  RelayAuthorityResolver,
  RelayAuthoritySnapshot,
  RelayOutboundExecutor,
  RelayPreviewPolicy,
} from "@/application/ports/continuity-relay";
import type { OutboundCallIntentRecord } from "@/application/ports/outbound-call";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { isValidRelayPair, RELAY_NO_CANCEL_NOTICE } from "@/domain/relay/continuity-relay";
import { SYNTHETIC_PATIENT_RELAY_RESULT } from "@/domain/relay/patient-relay-contract";
import { SYNTHETIC_PROFESSIONAL_RELAY_RESULT } from "@/domain/relay/professional-relay-contract";
import { HmacRelaySecretProtector } from "@/infrastructure/relay/hmac-relay-secret-protector";
import {
  UnavailableRelayAttestationVerifier,
  UnavailableRelayAuthorityResolver,
} from "@/infrastructure/relay/unavailable-relay-authority";

const FIXED_NOW = new Date("2026-08-30T10:00:00.000Z");
const CORRELATION_ID = "018f673a-4e35-7060-99b5-7bc6feba3a97";
const SYNTHETIC_PHONE = ["+", "34", "600", "000", "001"].join("");

const TEST_ONLY_SYNTHETIC_RELAY_POLICY: RelayPreviewPolicy = {
  expiresAt: ({ issuedAt }) => new Date(issuedAt.getTime() + 5 * 60_000),
  taskContract: ({ purpose }) => ({
    key: purpose,
    version: "test-v1",
    outboundTaskKey: "SYNTHETIC_CONTINUITY_CHECK",
  }),
};

function principal(userId = "nurse-1"): AuthenticatedPrincipal {
  return { userId, roles: ["nurse"], sessionId: `session-${userId}` };
}

class MutableActorContext implements RelayActorContext {
  actor: AuthenticatedPrincipal | null = principal();
  async current() {
    return this.actor;
  }
}

class MutableAuthority implements RelayAuthorityResolver {
  resolveCalls = 0;
  unavailableAtCall: number | null = null;
  snapshot: RelayAuthoritySnapshot | null = {
    actingRole: "nurse",
    episodeRef: "episode-1",
    taskRef: null,
    targetRef: "patient-target-opaque-1",
    destinationPhone: SYNTHETIC_PHONE,
    maskedTarget: "+34*******01",
    region: "ES",
    locale: "es-ES",
    lineRegion: "TEST_ONLY_INTERNATIONAL",
    revision: "episode-v1",
    professionalEligibility: null,
  };
  reviewAllowed = true;

  async resolve(input: Parameters<RelayAuthorityResolver["resolve"]>[0]) {
    this.resolveCalls += 1;
    if (this.resolveCalls === this.unavailableAtCall) return null;
    if (!this.snapshot || input.actor.userId !== "nurse-1") return null;
    if (
      this.snapshot.episodeRef !== input.context.episodeRef ||
      (input.context.taskRef !== null && this.snapshot.taskRef !== input.context.taskRef)
    ) {
      return null;
    }
    return this.snapshot;
  }

  async authorizeReview(input: Parameters<RelayAuthorityResolver["authorizeReview"]>[0]) {
    return this.reviewAllowed && input.actor.userId === "nurse-1" ? ("nurse" as const) : null;
  }
}

class MutableAttestation implements RelayAttestationVerifier {
  version = "test-attestation-v1";
  current = true;
  async verify() {
    return { version: this.version, current: this.current };
  }
}

interface RecordedAudit {
  readonly action: string;
  readonly actorRef: string | null;
  readonly attemptRef: string | null;
}

class MemoryAttemptStore implements RelayAttemptStore {
  readonly records = new Map<string, RelayAttemptRecord>();
  readonly audits: RecordedAudit[] = [];
  consumeEnabled = true;
  sequence = 0;

  async createPreview(input: CreateRelayPreviewRecordInput): Promise<RelayAttemptRecord> {
    const record: RelayAttemptRecord = {
      id: `attempt-${++this.sequence}`,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
      episodeRef: input.episodeRef,
      taskRef: input.taskRef,
      targetRef: input.targetRef,
      actorRef: input.actorRef,
      authorityFingerprint: input.authorityFingerprint,
      confirmationDigest: input.confirmationDigest,
      idempotencyRef: input.idempotencyRef,
      outboundCallIntentRef: null,
      lifecycleState: "PREVIEWED",
      attestationVersion: input.attestationVersion,
      revision: input.revision,
      region: input.region,
      locale: input.locale,
      lineRegion: input.lineRegion,
      governanceOutcome: null,
      resultValidity: null,
      technicalResult: null,
      expiresAt: input.expiresAt,
      consumedAt: null,
      revokedAt: null,
      reviewedByRef: null,
      reviewedAt: null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    this.records.set(record.id, record);
    this.audits.push({
      action: "RELAY_PREVIEW_ISSUED",
      actorRef: input.actorRef,
      attemptRef: record.id,
    });
    return record;
  }

  async findByConfirmationDigest(digest: string) {
    return (
      [...this.records.values()].find((record) => record.confirmationDigest === digest) ?? null
    );
  }

  async getById(attemptRef: string) {
    return this.records.get(attemptRef) ?? null;
  }

  async consumeConfirmation(input: Parameters<RelayAttemptStore["consumeConfirmation"]>[0]) {
    const current = this.records.get(input.attemptRef);
    if (
      !this.consumeEnabled ||
      !current ||
      current.lifecycleState !== "PREVIEWED" ||
      current.consumedAt ||
      current.revokedAt ||
      current.expiresAt <= input.now ||
      current.confirmationDigest !== input.confirmationDigest ||
      current.actorRef !== input.actorRef ||
      current.recipientKind !== input.recipientKind ||
      current.purpose !== input.purpose ||
      current.episodeRef !== input.context.episodeRef ||
      current.taskRef !== input.context.taskRef ||
      current.targetRef !== input.targetRef ||
      current.authorityFingerprint !== input.authorityFingerprint ||
      current.attestationVersion !== input.attestationVersion ||
      current.revision !== input.revision
    )
      return null;
    const consumed: RelayAttemptRecord = {
      ...current,
      lifecycleState: "CONFIRMED",
      consumedAt: input.now,
      updatedAt: input.now,
    };
    this.records.set(consumed.id, consumed);
    this.audits.push({
      action: "RELAY_CONFIRMATION_CONSUMED",
      actorRef: input.actorRef,
      attemptRef: consumed.id,
    });
    return consumed;
  }

  async recordConfirmationRejection(
    input: Parameters<RelayAttemptStore["recordConfirmationRejection"]>[0],
  ) {
    this.audits.push({
      action: "RELAY_CONFIRMATION_REJECTED",
      actorRef: input.actorRef,
      attemptRef: input.attemptRef,
    });
    if (input.authorityStale) {
      this.audits.push({
        action: "RELAY_AUTHORITY_STALE",
        actorRef: input.actorRef,
        attemptRef: input.attemptRef,
      });
    }
  }

  async recordOutboundState(input: Parameters<RelayAttemptStore["recordOutboundState"]>[0]) {
    let current = this.records.get(input.attemptRef);
    if (!current) throw new Error("missing synthetic attempt");
    if (!input.outboundIntent.providerRef && !input.governedResult.terminal) return current;
    if (current.lifecycleState === "CONFIRMED" && input.outboundIntent.providerRef) {
      current = {
        ...current,
        lifecycleState: "PROVIDER_CREATED",
        outboundCallIntentRef: input.outboundIntent.id,
        governanceOutcome: input.governedResult.terminal ? null : input.governedResult.outcome,
        updatedAt: input.now,
      };
      if (input.syntheticExecution) {
        this.audits.push({
          action: "RELAY_SYNTHETIC_EXECUTION_RECORDED",
          actorRef: null,
          attemptRef: current.id,
        });
      }
      this.audits.push({
        action: "RELAY_PROVIDER_REF_CREATED",
        actorRef: null,
        attemptRef: current.id,
      });
    }
    if (
      input.governedResult.terminal &&
      (current.lifecycleState === "PROVIDER_CREATED" ||
        (current.lifecycleState === "CONFIRMED" && !input.outboundIntent.providerRef))
    ) {
      const successfulProviderResult =
        input.governedResult.outcome === "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW" ||
        input.governedResult.outcome === "RESULT_SCHEMA_VIOLATION";
      current = {
        ...current,
        lifecycleState: successfulProviderResult ? "RESULT_COMPLETED" : "RESULT_UNCERTAIN",
        outboundCallIntentRef: input.outboundIntent.id,
        governanceOutcome: input.governedResult.outcome,
        resultValidity: input.governedResult.resultValidity,
        technicalResult: input.governedResult.technicalResult,
        updatedAt: input.now,
      };
      this.audits.push({
        action: "RELAY_TECHNICAL_RESULT_AVAILABLE",
        actorRef: null,
        attemptRef: current.id,
      });
    } else if (!input.governedResult.terminal && current.lifecycleState === "PROVIDER_CREATED") {
      current = {
        ...current,
        governanceOutcome: input.governedResult.outcome,
        updatedAt: input.now,
      };
    }
    this.records.set(current.id, current);
    return current;
  }

  async recordHumanReview(input: Parameters<RelayAttemptStore["recordHumanReview"]>[0]) {
    const current = this.records.get(input.attemptRef);
    if (!current || !current.lifecycleState.startsWith("RESULT_") || current.reviewedAt)
      return null;
    const reviewed: RelayAttemptRecord = {
      ...current,
      lifecycleState: "HUMAN_REVIEWED",
      reviewedByRef: input.reviewerRef,
      reviewedAt: input.now,
      updatedAt: input.now,
    };
    this.records.set(reviewed.id, reviewed);
    this.audits.push({
      action: "RELAY_HUMAN_REVIEW_RECORDED",
      actorRef: input.reviewerRef,
      attemptRef: reviewed.id,
    });
    return reviewed;
  }
}

function outboundIntent(
  idempotencyRef: string,
  state: OutboundCallIntentRecord["state"] = "COMPLETED",
  overrides: Partial<OutboundCallIntentRecord> = {},
): OutboundCallIntentRecord {
  return {
    id: "outbound-intent-1",
    idempotencyRef,
    protectedFingerprint: "f".repeat(64),
    providerRef: "synthetic-provider-ref",
    state,
    technicalStatus: state === "COMPLETED" ? "COMPLETED" : "QUEUED",
    reconciliationState: "NOT_REQUIRED",
    errorClass: null,
    errorCode: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    providerAcceptedAt: FIXED_NOW,
    lastPolledAt: null,
    completedAt: state === "COMPLETED" ? FIXED_NOW : null,
    ...overrides,
  };
}

function patientRequest(): RelayPreviewRequest {
  return {
    recipientKind: "PATIENT",
    purpose: "PATIENT_CALLBACK_OFFER",
    episodeRef: "episode-1",
    correlationId: CORRELATION_ID,
  };
}

function createHarness(clock = { value: FIXED_NOW }) {
  const actors = new MutableActorContext();
  const authority = new MutableAuthority();
  const attestations = new MutableAttestation();
  const attempts = new MemoryAttemptStore();
  const execution = { rawTechnicalResult: SYNTHETIC_PATIENT_RELAY_RESULT as unknown };
  const outbound: RelayOutboundExecutor = {
    execute: vi.fn(async (input) => {
      const attempt = [...attempts.records.values()][0];
      expect(attempt?.lifecycleState).toBe("CONFIRMED");
      return {
        outboundIntent: outboundIntent(input.idempotencyRef),
        rawTechnicalResult: execution.rawTechnicalResult,
        syntheticExecution: true,
      };
    }),
  };
  const service = new ContinuityRelayService(
    actors,
    authority,
    attestations,
    TEST_ONLY_SYNTHETIC_RELAY_POLICY,
    new HmacRelaySecretProtector("test-only-relay-key-material-32-bytes-minimum"),
    attempts,
    outbound,
    () => new Date(clock.value),
  );
  return { service, actors, authority, attestations, attempts, outbound, execution, clock };
}

async function previewAndConfirmation(harness = createHarness()) {
  const request = patientRequest();
  const preview = await harness.service.preview(request);
  const confirmation: RelayConfirmationRequest = {
    ...request,
    confirmationToken: preview.confirmationToken,
  };
  return { ...harness, preview, confirmation };
}

describe("Continuity Relay typed authority core", () => {
  it("accepts exactly the two declared recipient/purpose pairs", () => {
    expect(isValidRelayPair("PATIENT", "PATIENT_CALLBACK_OFFER")).toBe(true);
    expect(isValidRelayPair("PROFESSIONAL", "PROFESSIONAL_REVIEW_REQUEST")).toBe(true);
    expect(isValidRelayPair("PATIENT", "PROFESSIONAL_REVIEW_REQUEST")).toBe(false);
    expect(isValidRelayPair("PROFESSIONAL", "PATIENT_CALLBACK_OFFER")).toBe(false);
  });

  it("produces a minimized preview with explicit notices and zero provider contact", async () => {
    const harness = createHarness();
    const preview = await harness.service.preview(patientRequest());
    expect(preview.providerContacted).toBe(false);
    expect(preview.noCancellationNotice).toBe(RELAY_NO_CANCEL_NOTICE);
    expect(preview.costNotice).toContain("no consulta ni afirma saldo o precio actual");
    expect(preview.maskedTarget).toContain("*");
    expect(JSON.stringify(preview)).not.toContain(SYNTHETIC_PHONE);
    expect(harness.outbound.execute).not.toHaveBeenCalled();
    const stored = [...harness.attempts.records.values()][0];
    expect(stored?.confirmationDigest).not.toBe(preview.confirmationToken);
    expect(JSON.stringify(stored)).not.toContain(SYNTHETIC_PHONE);
    expect(JSON.stringify(stored)).not.toContain(preview.maskedTarget);
  });

  it("rejects crossed pairs and arbitrary destination fields before preview persistence", async () => {
    const harness = createHarness();
    await expect(
      harness.service.preview({
        ...patientRequest(),
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
      }),
    ).rejects.toBeInstanceOf(RelayDeniedError);
    await expect(
      harness.service.preview({
        ...patientRequest(),
        targetUserId: "arbitrary-target",
      } as RelayPreviewRequest),
    ).rejects.toBeInstanceOf(RelayInvalidError);
    await expect(
      harness.service.preview({
        ...patientRequest(),
        taskRef: "client-selected-task",
      } as RelayPreviewRequest),
    ).rejects.toBeInstanceOf(RelayInvalidError);
    expect(harness.attempts.records.size).toBe(0);
    expect(harness.outbound.execute).not.toHaveBeenCalled();
  });

  it("derives a professional task reference exclusively from server-side authority", async () => {
    const harness = createHarness();
    harness.authority.snapshot = {
      ...harness.authority.snapshot!,
      episodeRef: "episode-1",
      taskRef: "task-derived-by-authority",
      targetRef: "professional-target-opaque-1",
      revision: "assignment-v1",
      professionalEligibility: {
        episodeRevision: 1,
        taskRevision: 1,
        actorRoleAssignmentRef: "actor-role-assignment-1",
        targetRoleAssignmentRef: "target-role-assignment-1",
        targetRole: "clinician",
      },
    };
    const request: RelayPreviewRequest = {
      recipientKind: "PROFESSIONAL",
      purpose: "PROFESSIONAL_REVIEW_REQUEST",
      episodeRef: "episode-1",
      correlationId: CORRELATION_ID,
    };

    const preview = await harness.service.preview(request);
    expect(preview.context).toEqual({
      episodeRef: "episode-1",
      taskRef: "task-derived-by-authority",
    });
    expect([...harness.attempts.records.values()][0]?.taskRef).toBe("task-derived-by-authority");
    harness.execution.rawTechnicalResult = SYNTHETIC_PROFESSIONAL_RELAY_RESULT;

    await expect(
      harness.service.confirm({
        ...request,
        confirmationToken: preview.confirmationToken,
        taskRef: "client-selected-task",
      } as RelayConfirmationRequest),
    ).rejects.toBeInstanceOf(RelayInvalidError);
    expect(harness.outbound.execute).not.toHaveBeenCalled();

    await expect(
      harness.service.confirm({ ...request, confirmationToken: preview.confirmationToken }),
    ).resolves.toMatchObject({ lifecycleState: "RESULT_COMPLETED" });
    expect(harness.outbound.execute).toHaveBeenCalledOnce();
  });

  it("consumes before composition and records only technical lifecycle states", async () => {
    const harness = await previewAndConfirmation();
    const result = await harness.service.confirm(harness.confirmation);
    expect(result).toMatchObject({
      attemptRef: "attempt-1",
      lifecycleState: "RESULT_COMPLETED",
      outboundCallIntentRef: "outbound-intent-1",
    });
    expect(harness.outbound.execute).toHaveBeenCalledOnce();
    expect(harness.attempts.audits.map(({ action }) => action)).toEqual([
      "RELAY_PREVIEW_ISSUED",
      "RELAY_CONFIRMATION_CONSUMED",
      "RELAY_SYNTHETIC_EXECUTION_RECORDED",
      "RELAY_PROVIDER_REF_CREATED",
      "RELAY_TECHNICAL_RESULT_AVAILABLE",
    ]);
  });

  it("keeps a synthetic provider-unavailable result technical and pending human review", async () => {
    const harness = createHarness();
    harness.outbound.execute = vi.fn(async (input) => ({
      outboundIntent: outboundIntent(input.idempotencyRef, "FAILED", {
        providerRef: null,
        technicalStatus: "FAILED",
        errorClass: "PROVIDER_UNAVAILABLE",
        errorCode: "provider_unavailable",
        providerAcceptedAt: null,
      }),
      rawTechnicalResult: null,
      syntheticExecution: true,
    }));
    const prepared = await previewAndConfirmation(harness);
    await expect(prepared.service.confirm(prepared.confirmation)).resolves.toMatchObject({
      lifecycleState: "RESULT_UNCERTAIN",
    });
    expect(prepared.attempts.records.get("attempt-1")).toMatchObject({
      lifecycleState: "RESULT_UNCERTAIN",
      governanceOutcome: "CHANNEL_UNAVAILABLE",
      resultValidity: "MISSING",
      technicalResult: null,
      reviewedAt: null,
    });
  });

  it.each([
    ["missing", null, "MISSING"],
    ["invalid", { ...SYNTHETIC_PATIENT_RELAY_RESULT, free_text: "prohibited" }, "INVALID"],
  ])(
    "keeps a %s result reviewable without inventing a negative answer",
    async (_label, value, validity) => {
      const base = createHarness();
      base.execution.rawTechnicalResult = value;
      const harness = await previewAndConfirmation(base);
      await expect(harness.service.confirm(harness.confirmation)).resolves.toMatchObject({
        lifecycleState: "RESULT_COMPLETED",
      });
      expect(harness.attempts.records.get("attempt-1")).toMatchObject({
        resultValidity: validity,
        technicalResult: null,
        lifecycleState: "RESULT_COMPLETED",
      });
    },
  );

  it("allows exactly one consumer under concurrent confirmation and rejects replay", async () => {
    const harness = await previewAndConfirmation();
    const results = await Promise.allSettled([
      harness.service.confirm(harness.confirmation),
      harness.service.confirm(harness.confirmation),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(harness.outbound.execute).toHaveBeenCalledTimes(1);
    await expect(harness.service.confirm(harness.confirmation)).rejects.toBeInstanceOf(
      RelayDeniedError,
    );
    expect(harness.outbound.execute).toHaveBeenCalledTimes(1);
  });

  it("rejects a different actor and a crossed purpose without provider contact", async () => {
    const wrongActor = await previewAndConfirmation();
    wrongActor.actors.actor = principal("nurse-other");
    await expect(wrongActor.service.confirm(wrongActor.confirmation)).rejects.toBeInstanceOf(
      RelayDeniedError,
    );
    expect(wrongActor.outbound.execute).not.toHaveBeenCalled();

    const crossed = await previewAndConfirmation();
    await expect(
      crossed.service.confirm({
        ...crossed.confirmation,
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
      }),
    ).rejects.toBeInstanceOf(RelayDeniedError);
    expect(crossed.outbound.execute).not.toHaveBeenCalled();
  });

  it.each([
    [
      "target changed",
      (h: ReturnType<typeof createHarness>) => {
        h.authority.snapshot = { ...h.authority.snapshot!, targetRef: "patient-target-opaque-2" };
      },
    ],
    [
      "revision stale",
      (h: ReturnType<typeof createHarness>) => {
        h.authority.snapshot = { ...h.authority.snapshot!, revision: "episode-v2" };
      },
    ],
    [
      "assignment revoked",
      (h: ReturnType<typeof createHarness>) => {
        h.authority.snapshot = null;
      },
    ],
    [
      "attestation stale",
      (h: ReturnType<typeof createHarness>) => {
        h.attestations.current = false;
      },
    ],
  ])("fails closed when %s", async (_label, mutate) => {
    const base = createHarness();
    const harness = await previewAndConfirmation(base);
    mutate(base);
    await expect(harness.service.confirm(harness.confirmation)).rejects.toBeInstanceOf(
      RelayDeniedError,
    );
    expect(harness.outbound.execute).not.toHaveBeenCalled();
    expect(harness.attempts.audits.some(({ action }) => action === "RELAY_AUTHORITY_STALE")).toBe(
      true,
    );
  });

  it("rejects expired confirmation and atomic-consume failure with zero provider calls", async () => {
    const expired = await previewAndConfirmation();
    expired.clock.value = new Date(FIXED_NOW.getTime() + 5 * 60_000 + 1);
    await expect(expired.service.confirm(expired.confirmation)).rejects.toBeInstanceOf(
      RelayDeniedError,
    );
    expect(expired.outbound.execute).not.toHaveBeenCalled();

    const conflict = await previewAndConfirmation();
    conflict.attempts.consumeEnabled = false;
    await expect(conflict.service.confirm(conflict.confirmation)).rejects.toBeInstanceOf(
      RelayConflictError,
    );
    expect(conflict.outbound.execute).not.toHaveBeenCalled();
  });

  it("revalidates again after consumption and executes zero times on a concurrent revocation", async () => {
    const harness = await previewAndConfirmation();
    harness.authority.unavailableAtCall = 3;
    await expect(harness.service.confirm(harness.confirmation)).rejects.toMatchObject({
      errorCode: "authority_stale_before_execution",
    });
    expect(harness.outbound.execute).not.toHaveBeenCalled();
    expect(harness.attempts.records.get("attempt-1")).toMatchObject({
      lifecycleState: "CONFIRMED",
    });
    expect(harness.attempts.audits.some(({ action }) => action === "RELAY_AUTHORITY_STALE")).toBe(
      true,
    );
  });

  it("records human review with current server actor without treating it as clinical approval", async () => {
    const harness = await previewAndConfirmation();
    await harness.service.confirm(harness.confirmation);
    const reviewed = await harness.service.recordHumanReview({
      attemptRef: "attempt-1",
      correlationId: randomUUID(),
    });
    expect(reviewed).toMatchObject({ lifecycleState: "HUMAN_REVIEWED", reviewedAt: FIXED_NOW });
    expect(harness.attempts.records.get("attempt-1")).toMatchObject({
      reviewedByRef: "nurse-1",
      lifecycleState: "HUMAN_REVIEWED",
    });
    await expect(
      harness.service.recordHumanReview({ attemptRef: "attempt-1", correlationId: randomUUID() }),
    ).rejects.toBeInstanceOf(RelayConflictError);
  });

  it("never copies token, phone, mask, payload, prompt, or result into audits", async () => {
    const harness = await previewAndConfirmation();
    await harness.service.confirm(harness.confirmation);
    const serialized = JSON.stringify(harness.attempts.audits);
    for (const prohibited of [
      harness.preview.confirmationToken,
      SYNTHETIC_PHONE,
      harness.preview.maskedTarget,
      "payload",
      "prompt",
      "transcript",
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
  });

  it("ships production defaults that deny absent authority and attestation", async () => {
    await expect(
      new UnavailableRelayAuthorityResolver().resolve({
        actor: principal(),
        recipientKind: "PATIENT",
        purpose: "PATIENT_CALLBACK_OFFER",
        context: { episodeRef: "episode-1", taskRef: null },
      }),
    ).resolves.toBeNull();
    await expect(
      new UnavailableRelayAttestationVerifier().verify({
        actor: principal(),
        recipientKind: "PATIENT",
        purpose: "PATIENT_CALLBACK_OFFER",
      }),
    ).resolves.toEqual({ version: "PENDING_LOCAL_DECISION", current: false });
  });
});
