import { describe, expect, it } from "vitest";

import {
  evaluateExplainableRule,
  type ReferencedRuleInput,
} from "@/domain/alerts/explainable-rule";
import { SYNTHETIC_RULE_FIXTURES } from "@/domain/alerts/synthetic-rule-fixtures";

const evaluatedAt = new Date("2026-07-17T12:00:00.000Z");
const episodeId = "episode-1";

function input(
  inputKey: string,
  value: ReferencedRuleInput["value"],
  observedAt = "2026-07-17T08:00:00.000Z",
  sourceId = "synthetic-source-1",
): ReferencedRuleInput {
  return {
    inputKey,
    value,
    observedAt,
    source: {
      resourceType: "CheckInResponse",
      resourceId: sourceId,
      field: inputKey,
      episodeId,
    },
  };
}

const matchingInputs: Readonly<Record<string, readonly ReferencedRuleInput[]>> = {
  "synthetic-low-sleep-and-non-adherence": [
    input("sleep_hours", 4, "2026-07-16T08:00:00.000Z", "sleep-day-1"),
    input("sleep_hours", 3.5, "2026-07-17T08:00:00.000Z", "sleep-day-2"),
    input("medication_adherence", false),
  ],
  "synthetic-positive-self-harm-ideation": [input("self_harm_ideation_positive", true)],
  "synthetic-no-response-48-hours": [input("non_response_hours", 48)],
  "synthetic-repeated-severe-family-conflict": [
    input("family_conflict_severity", "severe", "2026-07-15T08:00:00.000Z", "conflict-1"),
    input("family_conflict_severity", "severe", "2026-07-17T08:00:00.000Z", "conflict-2"),
  ],
};

describe("explainable deterministic rule engine", () => {
  it.each(SYNTHETIC_RULE_FIXTURES)(
    "caja negra: $ruleKey coincide solo con sus inputs explícitos",
    (fixture) => {
      const result = evaluateExplainableRule({
        definitionId: fixture.ruleKey,
        ruleVersionId: `${fixture.ruleKey}-v1`,
        ruleVersionNumber: 1,
        episodeId,
        dsl: fixture.dsl,
        evaluatedAt,
        inputs: matchingInputs[fixture.ruleKey]!,
      });
      expect(result.outcome).toBe("matched");
      expect(result.explanation).toContain("Datos de origen:");
      expect(result.referencedInputs.length).toBeGreaterThan(0);
    },
  );

  it("se abstiene si falta un input requerido dentro de la ventana", () => {
    const fixture = SYNTHETIC_RULE_FIXTURES[0]!;
    const result = evaluateExplainableRule({
      definitionId: fixture.ruleKey,
      ruleVersionId: `${fixture.ruleKey}-v1`,
      ruleVersionNumber: 1,
      episodeId,
      dsl: fixture.dsl,
      evaluatedAt,
      inputs: [input("sleep_hours", 3)],
    });
    expect(result).toMatchObject({
      outcome: "abstained",
      missingInputs: ["medication_adherence"],
      explanation: null,
      referencedInputs: [],
    });
  });

  it("es reproducible aunque los inputs lleguen en otro orden", () => {
    const fixture = SYNTHETIC_RULE_FIXTURES[0]!;
    const inputs = matchingInputs[fixture.ruleKey]!;
    const first = evaluateExplainableRule({
      definitionId: fixture.ruleKey,
      ruleVersionId: `${fixture.ruleKey}-v1`,
      ruleVersionNumber: 1,
      episodeId,
      dsl: fixture.dsl,
      evaluatedAt,
      inputs,
    });
    const second = evaluateExplainableRule({
      definitionId: fixture.ruleKey,
      ruleVersionId: `${fixture.ruleKey}-v1`,
      ruleVersionNumber: 1,
      episodeId,
      dsl: fixture.dsl,
      evaluatedAt,
      inputs: [...inputs].reverse(),
    });
    expect(second).toEqual(first);
  });

  it("la explicación conserva versión implícita por hash y referencias de origen visibles", () => {
    const fixture = SYNTHETIC_RULE_FIXTURES[2]!;
    const result = evaluateExplainableRule({
      definitionId: fixture.ruleKey,
      ruleVersionId: `${fixture.ruleKey}-v1`,
      ruleVersionNumber: 1,
      episodeId,
      dsl: fixture.dsl,
      evaluatedAt,
      inputs: matchingInputs[fixture.ruleKey]!,
    });
    expect(result.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.explanation).toContain("Regla v1, ventana 72 h");
    expect(result.explanation).toContain("non_response_hours >= 48");
    expect(result.explanation).toContain("CheckInResponse/synthetic-source-1.non_response_hours");
    expect(result.explanation).toContain("non_response_hours=48");
  });

  it("rechaza referencias duplicadas o incompletas para no fabricar repetición", () => {
    const fixture = SYNTHETIC_RULE_FIXTURES[3]!;
    const repeated = input("family_conflict_severity", "severe");
    expect(() =>
      evaluateExplainableRule({
        definitionId: fixture.ruleKey,
        ruleVersionId: `${fixture.ruleKey}-v1`,
        ruleVersionNumber: 1,
        episodeId,
        dsl: fixture.dsl,
        evaluatedAt,
        inputs: [repeated, repeated],
      }),
    ).toThrow("duplicate source reference");

    expect(() =>
      evaluateExplainableRule({
        definitionId: fixture.ruleKey,
        ruleVersionId: `${fixture.ruleKey}-v1`,
        ruleVersionNumber: 1,
        episodeId,
        dsl: fixture.dsl,
        evaluatedAt,
        inputs: [
          {
            ...repeated,
            source: {
              resourceType: "CheckInResponse",
              resourceId: "",
              field: repeated.inputKey,
              episodeId,
            },
          },
        ],
      }),
    ).toThrow("invalid source reference");
  });
});
