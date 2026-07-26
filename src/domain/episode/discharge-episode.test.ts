import { describe, expect, it } from "vitest";

import {
  isIdentityEligibleForActivation,
  PendingInstitutionalEpisodeGovernancePolicy,
  type EpisodeGovernanceInput,
} from "@/domain/episode/activation-policy";
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
    policyVersionId: "identity-policy-v1",
    policyKey: "synthetic-identity-policy",
    policyVersion: "demo-v1",
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

describe("episode governance policy", () => {
  const input: EpisodeGovernanceInput = {
    episode: {
      id: "episode-1",
      version: 2,
      status: "ACTIVE",
      responsibleNurseId: "nurse-1",
      responsibleClinicianId: "clinician-1",
      checkInProtocolVersionId: "protocol-v1",
      identity: {
        patientIsSynthetic: true,
        patientState: "VERIFIED",
        policyVersionId: "identity-policy-v1",
        policyKey: "synthetic-identity-policy",
        policyVersion: "demo-v1",
        policyState: "APPROVED",
        acceptedState: "VERIFIED",
        processCode: "RECORDED_HUMAN_REVIEW",
        processVersion: "demo-v1",
        policyIsSyntheticDemo: true,
        identityVerifiedAt: new Date("2026-07-16T08:00:00Z"),
        identityVerifiedById: "nurse-1",
      },
    },
    responsibleProfessionals: { nurseActive: true, clinicianActive: true },
    checkInProtocol: {
      versionId: "protocol-v1",
      protocolKey: "synthetic-check-in",
      versionNumber: 1,
      state: "SYNTHETIC_DEMO",
      isSyntheticFixture: true,
    },
    openObligations: [
      { kind: "ALERT", resourceId: "alert-1", state: "open" },
      { kind: "TASK", resourceId: "task-1", state: "open", revision: 3 },
    ],
    evaluatedAt: new Date("2026-07-25T12:00:00Z"),
    correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
  };

  it("mantiene DEC-002 pendiente, cierre no autorizado y obligaciones existentes visibles", async () => {
    const view = await new PendingInstitutionalEpisodeGovernancePolicy().evaluate(input);

    expect(view.transitionDecision).toEqual({
      targetStatus: "CLOSED",
      authorization: "NOT_AUTHORIZED",
    });
    expect(view.pendingInstitutionalDecisions).toEqual([
      { decisionId: "DEC-002", status: "PENDING" },
    ]);
    expect(view.openObligations).toEqual(input.openObligations);
    expect(view.blockers.map(({ code }) => code)).toEqual([
      "UNRESOLVED_ALERTS",
      "OPEN_TASKS",
      "DEC_002_EPISODE_CLOSURE_POLICY_PENDING",
    ]);
  });

  it("expone solo referencias técnicas y nunca texto clínico de avisos o tareas", async () => {
    const serialized = JSON.stringify(
      await new PendingInstitutionalEpisodeGovernancePolicy().evaluate(input),
    );

    expect(serialized).toContain("alert-1");
    expect(serialized).toContain("task-1");
    expect(serialized).not.toContain("texto clínico sintético que no debe copiarse");
    expect(Object.keys(input.openObligations[0] ?? {})).toEqual(["kind", "resourceId", "state"]);
  });
});
