import { describe, expect, it } from "vitest";

import { isIdentityEligibleForActivation } from "@/domain/episode/activation-policy";
import {
  assertLegalEpisodeTransition,
  IllegalEpisodeTransitionError,
  isProgramLengthDays,
} from "@/domain/episode/discharge-episode";

describe("discharge episode state machine", () => {
  it.each([
    ["DRAFT", "ACTIVE"],
    ["ACTIVE", "PAUSED"],
    ["PAUSED", "ACTIVE"],
    ["ACTIVE", "CLOSED"],
    ["PAUSED", "CLOSED"],
  ] as const)("permite %s -> %s", (from, to) => {
    expect(() => assertLegalEpisodeTransition(from, to)).not.toThrow();
  });

  it.each([
    ["DRAFT", "PAUSED"],
    ["ACTIVE", "ACTIVE"],
    ["CLOSED", "ACTIVE"],
    ["CLOSED", "PAUSED"],
  ] as const)("rechaza %s -> %s", (from, to) => {
    expect(() => assertLegalEpisodeTransition(from, to)).toThrow(IllegalEpisodeTransitionError);
  });

  it("limita la duración a 30, 60 o 90 sin valor clínico por defecto", () => {
    expect([30, 60, 90].every(isProgramLengthDays)).toBe(true);
    expect(isProgramLengthDays(45)).toBe(false);
  });
});

describe("identity activation policy", () => {
  const verified = {
    patientIsSynthetic: true,
    patientState: "VERIFIED" as const,
    policyState: "APPROVED" as const,
    acceptedState: "VERIFIED" as const,
    processCode: "RECORDED_HUMAN_REVIEW",
    processVersion: "demo-v1",
    policyIsSyntheticDemo: true,
    identityVerifiedAt: new Date("2026-07-16T08:00:00Z"),
    identityVerifiedById: "nurse-1",
  };

  it("acepta solo una verificación humana registrada bajo política aprobada", () => {
    expect(isIdentityEligibleForActivation(verified)).toBe(true);
  });

  it.each([
    { ...verified, patientState: "PENDING" as const },
    { ...verified, policyState: "PENDING" as const },
    { ...verified, processCode: "" },
    { ...verified, identityVerifiedById: null },
    { ...verified, patientIsSynthetic: false },
  ])("deniega configuración o evidencia incompleta", (context) => {
    expect(isIdentityEligibleForActivation(context)).toBe(false);
  });
});
