import { describe, expect, it } from "vitest";

import {
  assertCommitmentTransition,
  COMMITMENT_COMMANDS,
  COMMITMENT_EVENT_TYPES,
  COMMITMENT_STATES,
  CommitmentTransitionError,
  commitmentRequestFingerprint,
  normalizeCorrectionReason,
  parseExplicitUtcInstant,
  validateDueSource,
  validateTimeZone,
} from "@/domain/commitment/commitment";

describe("commitment sandbox domain", () => {
  it("expone únicamente los catálogos alcanzables por 5B", () => {
    expect(COMMITMENT_STATES).toEqual(["DRAFT", "AWAITING_EVIDENCE", "SUPERSEDED_BY_CORRECTION"]);
    expect(COMMITMENT_COMMANDS).toEqual([
      "CREATE_COMMITMENT_DRAFT",
      "ACTIVATE_COMMITMENT",
      "SUPERSEDE_DRAFT",
      "SUPERSEDE_ACTIVE_VERSION",
    ]);
    expect(COMMITMENT_EVENT_TYPES).toEqual([
      "COMMITMENT_DRAFT_CREATED",
      "COMMITMENT_ACTIVATED",
      "COMMITMENT_SUPERSEDED",
    ]);
  });

  it.each([
    ["CREATE_COMMITMENT_DRAFT", null, "DRAFT"],
    ["ACTIVATE_COMMITMENT", "DRAFT", "AWAITING_EVIDENCE"],
    ["SUPERSEDE_DRAFT", "DRAFT", "SUPERSEDED_BY_CORRECTION"],
    ["SUPERSEDE_ACTIVE_VERSION", "AWAITING_EVIDENCE", "SUPERSEDED_BY_CORRECTION"],
  ] as const)("permite %s desde %s", (command, fromState, expected) => {
    expect(assertCommitmentTransition(command, fromState)).toBe(expected);
  });

  it("rechaza todas las combinaciones de transición no autorizadas", () => {
    const allowed = new Set([
      "CREATE_COMMITMENT_DRAFT:null",
      "ACTIVATE_COMMITMENT:DRAFT",
      "SUPERSEDE_DRAFT:DRAFT",
      "SUPERSEDE_ACTIVE_VERSION:AWAITING_EVIDENCE",
    ]);
    for (const command of COMMITMENT_COMMANDS) {
      for (const state of [null, ...COMMITMENT_STATES] as const) {
        if (allowed.has(`${command}:${state}`)) continue;
        expect(() => assertCommitmentTransition(command, state)).toThrow(CommitmentTransitionError);
      }
    }
  });

  it("rechaza específicamente reactivar una versión superseded", () => {
    expect(() =>
      assertCommitmentTransition("ACTIVATE_COMMITMENT", "SUPERSEDED_BY_CORRECTION"),
    ).toThrow(CommitmentTransitionError);
  });

  it("normaliza huellas de forma estable sin depender del orden de claves", () => {
    expect(commitmentRequestFingerprint({ b: 2, a: { d: 4, c: 3 } })).toBe(
      commitmentRequestFingerprint({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });

  it("exige instante UTC explícito, zona IANA y fuente completa sin calcular vencimientos", () => {
    expect(parseExplicitUtcInstant("2026-08-03T10:00:00.000Z").toISOString()).toBe(
      "2026-08-03T10:00:00.000Z",
    );
    expect(() => parseExplicitUtcInstant("2026-08-03T10:00:00+02:00")).toThrow();
    expect(() => validateTimeZone("Invalid/SyntheticZone")).toThrow();
    expect(() => validateDueSource({ kind: "fixture", sourceId: "", version: "v1" })).toThrow();
  });

  it("exige una referencia correctiva explícita y acotada", () => {
    expect(normalizeCorrectionReason("  synthetic correction reference  ")).toBe(
      "synthetic correction reference",
    );
    expect(() => normalizeCorrectionReason("short")).toThrow();
  });
});
