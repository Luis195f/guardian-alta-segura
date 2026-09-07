import { describe, expect, it } from "vitest";

import type { OutboundCallIntentRecord } from "@/application/ports/outbound-call";
import {
  normalizeProviderErrorCode,
  normalizeRelayResult,
} from "@/application/relay/result-governance";
import { SYNTHETIC_PATIENT_RELAY_RESULT } from "@/domain/relay/patient-relay-contract";
import { SYNTHETIC_PROFESSIONAL_RELAY_RESULT } from "@/domain/relay/professional-relay-contract";

const NOW = new Date("2026-09-07T10:00:00.000Z");

function intent(overrides: Partial<OutboundCallIntentRecord> = {}): OutboundCallIntentRecord {
  return {
    id: "synthetic-intent-ref",
    idempotencyRef: "synthetic-ref-0001",
    protectedFingerprint: "f".repeat(64),
    providerRef: "synthetic-provider-ref",
    state: "COMPLETED",
    technicalStatus: "COMPLETED",
    reconciliationState: "NOT_REQUIRED",
    errorClass: null,
    errorCode: null,
    createdAt: NOW,
    updatedAt: NOW,
    providerAcceptedAt: NOW,
    lastPolledAt: NOW,
    completedAt: NOW,
    ...overrides,
  };
}

describe("Continuity Relay provider error governance", () => {
  it.each([
    "unsupported_region",
    "unsupported_language",
    "invalid_phone",
    "invalid_recipient",
    "no_recipients",
    "result_schema_invalid",
    "recipient_result_schema_invalid",
  ])("maps %s exactly to CALL_NOT_ATTEMPTED", (code) => {
    expect(normalizeProviderErrorCode(code)).toMatchObject({
      errorCode: code,
      outcome: "CALL_NOT_ATTEMPTED",
      uncertain: false,
    });
  });

  it.each([
    "provider_unavailable",
    "insufficient_balance",
    "unauthorized",
    "forbidden",
    "rate_limit_exceeded",
  ])("maps %s exactly to CHANNEL_UNAVAILABLE", (code) => {
    expect(normalizeProviderErrorCode(code)).toMatchObject({
      errorCode: code,
      outcome: "CHANNEL_UNAVAILABLE",
      uncertain: false,
    });
  });

  it.each(["recipient_blocked", "policy_violation"])(
    "maps %s exactly to PROVIDER_POLICY_REFUSAL",
    (code) => {
      expect(normalizeProviderErrorCode(code)).toMatchObject({
        errorCode: code,
        outcome: "PROVIDER_POLICY_REFUSAL",
        uncertain: false,
      });
    },
  );

  it("keeps idempotency conflict and call-not-ready distinct", () => {
    expect(normalizeProviderErrorCode("idempotency_conflict")).toMatchObject({
      outcome: "CONFIRMATION_CONFLICT",
      uncertain: false,
    });
    expect(normalizeProviderErrorCode("call_not_ready")).toMatchObject({
      outcome: "CALL_NOT_READY",
      uncertain: true,
    });
  });

  it.each([
    "invalid_request",
    "goal_not_published",
    "goal_not_executable",
    "goal_not_ready",
    "schema_override_not_allowed",
    "variables_invalid",
    "internal_error",
    "not_found",
    "rate_limit_exceeded_later",
    "RATE_LIMIT_EXCEEDED",
    " rate_limit_exceeded",
    "",
    null,
    429,
    [],
  ])("keeps unknown or malformed code %# explicitly unknown", (code) => {
    expect(normalizeProviderErrorCode(code)).toEqual({
      errorClass: "UNKNOWN",
      errorCode: "unknown_error",
      uncertain: true,
      outcome: "UNKNOWN_PROVIDER_ERROR",
    });
  });

  it("maps transport failure before providerRef to channel unavailable without contact inference", () => {
    const result = normalizeRelayResult({
      purpose: "PATIENT_CALLBACK_OFFER",
      intent: intent({
        providerRef: null,
        state: "UNCERTAIN",
        technicalStatus: null,
        errorClass: "CONNECTION_UNCERTAIN",
        errorCode: "connection_uncertain",
      }),
      structuredResult: null,
    });
    expect(result).toMatchObject({
      outcome: "CHANNEL_UNAVAILABLE",
      terminal: true,
      resultValidity: "MISSING",
      humanReviewRequired: true,
    });
  });

  it("keeps timeout after providerRef pending reconciliation", () => {
    const result = normalizeRelayResult({
      purpose: "PATIENT_CALLBACK_OFFER",
      intent: intent({
        state: "UNCERTAIN",
        technicalStatus: "IN_PROGRESS",
        errorClass: "TIMEOUT",
        errorCode: "polling_timeout",
        completedAt: null,
      }),
      structuredResult: null,
    });
    expect(result).toEqual({
      outcome: "UNKNOWN_PENDING_RECONCILIATION",
      terminal: false,
      resultValidity: null,
      technicalResult: null,
      humanReviewRequired: false,
    });
  });

  it("keeps call_not_ready non-terminal", () => {
    expect(
      normalizeRelayResult({
        purpose: "PATIENT_CALLBACK_OFFER",
        intent: intent({
          state: "POLLING",
          technicalStatus: "IN_PROGRESS",
          errorClass: "CALL_NOT_READY",
          errorCode: "call_not_ready",
          completedAt: null,
        }),
        structuredResult: null,
      }),
    ).toEqual({
      outcome: "CALL_NOT_READY",
      terminal: false,
      resultValidity: null,
      technicalResult: null,
      humanReviewRequired: false,
    });
  });
});

describe("Continuity Relay structured result governance", () => {
  it("accepts a valid Patient result only as pending human review", () => {
    expect(
      normalizeRelayResult({
        purpose: "PATIENT_CALLBACK_OFFER",
        intent: intent(),
        structuredResult: SYNTHETIC_PATIENT_RELAY_RESULT,
        providerEventType: "call.completed",
      }),
    ).toEqual({
      outcome: "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW",
      terminal: true,
      resultValidity: "VALID",
      technicalResult: SYNTHETIC_PATIENT_RELAY_RESULT,
      humanReviewRequired: true,
    });
  });

  it("accepts a valid Professional result only under its separate schema", () => {
    expect(
      normalizeRelayResult({
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        intent: intent(),
        structuredResult: SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
      }),
    ).toMatchObject({
      outcome: "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW",
      resultValidity: "VALID",
      technicalResult: SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
      humanReviewRequired: true,
    });
    expect(
      normalizeRelayResult({
        purpose: "PATIENT_CALLBACK_OFFER",
        intent: intent(),
        structuredResult: SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
      }),
    ).toMatchObject({ outcome: "RESULT_SCHEMA_VIOLATION", resultValidity: "INVALID" });
  });

  it.each([
    null,
    [],
    "invalid",
    true,
    { ...SYNTHETIC_PATIENT_RELAY_RESULT, summary: "ignored source must not be accepted" },
    { ...SYNTHETIC_PATIENT_RELAY_RESULT, contact_status: ["reached"] },
    { ...SYNTHETIC_PATIENT_RELAY_RESULT, contact_status: true },
    { ...SYNTHETIC_PATIENT_RELAY_RESULT, callback_preference: null },
    { ...SYNTHETIC_PATIENT_RELAY_RESULT, boundary_event: "other" },
  ])("treats malformed Patient result %# as a schema violation", (structuredResult) => {
    const result = normalizeRelayResult({
      purpose: "PATIENT_CALLBACK_OFFER",
      intent: intent(),
      structuredResult,
    });
    expect(result).toMatchObject({
      outcome: "RESULT_SCHEMA_VIOLATION",
      terminal: true,
      technicalResult: null,
      humanReviewRequired: true,
    });
  });

  it("treats call.result_validation_failed as a schema violation", () => {
    expect(
      normalizeRelayResult({
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        intent: intent({ state: "FAILED", technicalStatus: "FAILED" }),
        structuredResult: SYNTHETIC_PROFESSIONAL_RELAY_RESULT,
        providerEventType: "call.result_validation_failed",
      }),
    ).toEqual({
      outcome: "RESULT_SCHEMA_VIOLATION",
      terminal: true,
      resultValidity: "INVALID",
      technicalResult: null,
      humanReviewRequired: true,
    });
  });

  it("does not infer from resultValidation, summary, evidence, confidence, transcript or taskCompleted", () => {
    const result = normalizeRelayResult({
      purpose: "PATIENT_CALLBACK_OFFER",
      intent: intent(),
      structuredResult: null,
      resultValidation: { valid: true },
      summary: "requested",
      evidence: ["requested"],
      completionConfidence: { score: 1, label: "high" },
      transcript: "requested",
      taskCompleted: true,
    } as Parameters<typeof normalizeRelayResult>[0]);
    expect(result).toEqual({
      outcome: "RESULT_SCHEMA_VIOLATION",
      terminal: true,
      resultValidity: "MISSING",
      technicalResult: null,
      humanReviewRequired: true,
    });
  });

  it("keeps unknown event formats explicitly unknown", () => {
    expect(
      normalizeRelayResult({
        purpose: "PATIENT_CALLBACK_OFFER",
        intent: intent(),
        structuredResult: SYNTHETIC_PATIENT_RELAY_RESULT,
        providerEventType: "call.completed_later",
      }),
    ).toMatchObject({
      outcome: "UNKNOWN_PROVIDER_ERROR",
      resultValidity: "INVALID",
      technicalResult: null,
    });
  });
});
