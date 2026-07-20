import fixtures from "@/domain/alerts/synthetic-rule-fixtures.json";
import {
  type ExplainableRuleDsl,
  validateExplainableRuleDsl,
} from "@/domain/alerts/explainable-rule";

export const SYNTHETIC_RULE_NOTICE =
  "EJEMPLO TÉCNICO SINTÉTICO / NO APROBADO / VALIDACIÓN CLÍNICA LOCAL PENDIENTE";

export interface SyntheticRuleFixture {
  readonly ruleKey: string;
  readonly name: string;
  readonly dsl: ExplainableRuleDsl;
}

export const SYNTHETIC_RULE_FIXTURES: readonly SyntheticRuleFixture[] = fixtures.map((fixture) => ({
  ruleKey: fixture.ruleKey,
  name: fixture.name,
  dsl: validateExplainableRuleDsl(fixture.dsl),
}));
