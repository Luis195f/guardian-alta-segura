import { createHash } from "node:crypto";

export const RULE_STATES = ["draft", "approved", "active", "retired"] as const;
export const ALERT_STATES = [
  "open",
  "reviewed",
  "actioned",
  "resolved",
  "dismissed-with-reason",
] as const;
export const RULE_EVALUATION_OUTCOMES = ["matched", "not-matched", "abstained"] as const;

export type RuleState = (typeof RULE_STATES)[number];
export type AlertState = (typeof ALERT_STATES)[number];
export type RuleEvaluationOutcome = (typeof RULE_EVALUATION_OUTCOMES)[number];
export type AdministrativeSeverity = "standard" | "priority";
export type RuleReviewOwner = "nurse" | "clinician";
export type RuleInputValue = number | boolean | string;

export interface AllowedRuleInput {
  readonly key: string;
  readonly type: "number" | "boolean" | "enum";
  readonly required: boolean;
  readonly allowedValues?: readonly string[];
}

export interface RuleClause {
  readonly input: string;
  readonly operator: "eq" | "lte" | "gte";
  readonly value: RuleInputValue;
  readonly minimumOccurrences?: number;
  readonly minimumDistinctDays?: number;
}

export interface ExplainableRuleDsl {
  readonly schemaVersion: 1;
  readonly allowedInputs: readonly AllowedRuleInput[];
  readonly window: {
    readonly lookbackHours: number;
  };
  readonly condition: {
    readonly combinator: "all" | "any";
    readonly clauses: readonly RuleClause[];
  };
  readonly administrativeSeverity: AdministrativeSeverity;
  readonly explanation: string;
  readonly reviewOwner: RuleReviewOwner;
}

export interface ReferencedRuleInput {
  readonly inputKey: string;
  readonly value: RuleInputValue;
  readonly observedAt: string;
  readonly source: {
    readonly resourceType: string;
    readonly resourceId: string;
    readonly field: string;
    readonly episodeId: string;
  };
}

export interface RuleEvaluationRequest {
  readonly definitionId: string;
  readonly ruleVersionId: string;
  readonly ruleVersionNumber: number;
  readonly episodeId: string;
  readonly dsl: ExplainableRuleDsl;
  readonly evaluatedAt: Date;
  readonly inputs: readonly ReferencedRuleInput[];
}

export interface DeterministicRuleEvaluation {
  readonly outcome: RuleEvaluationOutcome;
  readonly inputHash: string;
  readonly normalizedInputs: readonly ReferencedRuleInput[];
  readonly referencedInputs: readonly ReferencedRuleInput[];
  readonly explanation: string | null;
  readonly missingInputs: readonly string[];
}

export class ExplainableRuleValidationError extends Error {}

const SAFE_KEY = /^[a-z][a-z0-9_]{1,63}$/;
const SAFE_ENUM_VALUE = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/;
const SAFE_SOURCE_FIELD = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const SAFE_RESOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertIntegerInRange(
  name: string,
  value: number | undefined,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value === undefined || value < minimum || value > maximum) {
    throw new ExplainableRuleValidationError(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return value;
}

function assertValueMatchesInput(input: AllowedRuleInput, value: RuleInputValue): void {
  if (input.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new ExplainableRuleValidationError(`Input ${input.key} requires a finite number`);
  }
  if (input.type === "boolean" && typeof value !== "boolean") {
    throw new ExplainableRuleValidationError(`Input ${input.key} requires a boolean`);
  }
  if (
    input.type === "enum" &&
    (typeof value !== "string" || !input.allowedValues?.includes(value))
  ) {
    throw new ExplainableRuleValidationError(`Input ${input.key} requires an allowed enum value`);
  }
}

export function validateExplainableRuleDsl(value: unknown): ExplainableRuleDsl {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new ExplainableRuleValidationError("Rule DSL must use schemaVersion 1");
  }
  if (!Array.isArray(value.allowedInputs) || value.allowedInputs.length === 0) {
    throw new ExplainableRuleValidationError("Rule DSL requires explicit allowedInputs");
  }
  if (value.allowedInputs.length > 16) {
    throw new ExplainableRuleValidationError("Rule DSL permits at most 16 inputs");
  }

  const allowedInputs = value.allowedInputs.map((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate.key !== "string" ||
      !SAFE_KEY.test(candidate.key)
    ) {
      throw new ExplainableRuleValidationError("Every allowed input requires a safe key");
    }
    if (!["number", "boolean", "enum"].includes(String(candidate.type))) {
      throw new ExplainableRuleValidationError(`Input ${candidate.key} has an invalid type`);
    }
    if (typeof candidate.required !== "boolean") {
      throw new ExplainableRuleValidationError(`Input ${candidate.key} must declare required`);
    }
    const type = candidate.type as AllowedRuleInput["type"];
    const allowedValues =
      type === "enum" && Array.isArray(candidate.allowedValues)
        ? candidate.allowedValues.map((allowedValue) => {
            if (
              typeof allowedValue !== "string" ||
              allowedValue.length === 0 ||
              allowedValue.length > 64 ||
              !SAFE_ENUM_VALUE.test(allowedValue)
            ) {
              throw new ExplainableRuleValidationError(
                `Input ${candidate.key} has an invalid enum value`,
              );
            }
            return allowedValue;
          })
        : undefined;
    if (type === "enum" && (!allowedValues || allowedValues.length === 0)) {
      throw new ExplainableRuleValidationError(
        `Enum input ${candidate.key} requires allowedValues`,
      );
    }
    if (type !== "enum" && "allowedValues" in candidate) {
      throw new ExplainableRuleValidationError(
        `Only enum input ${candidate.key} may declare allowedValues`,
      );
    }
    return {
      key: candidate.key,
      type,
      required: candidate.required,
      ...(allowedValues ? { allowedValues } : {}),
    } satisfies AllowedRuleInput;
  });

  if (new Set(allowedInputs.map(({ key }) => key)).size !== allowedInputs.length) {
    throw new ExplainableRuleValidationError("Allowed input keys must be unique");
  }
  if (!isRecord(value.window)) {
    throw new ExplainableRuleValidationError("Rule DSL requires a temporal window");
  }
  const lookbackHours = assertIntegerInRange(
    "window.lookbackHours",
    value.window.lookbackHours as number | undefined,
    1,
    2160,
  );
  if (!isRecord(value.condition) || !["all", "any"].includes(String(value.condition.combinator))) {
    throw new ExplainableRuleValidationError("Rule condition combinator must be all or any");
  }
  if (!Array.isArray(value.condition.clauses) || value.condition.clauses.length === 0) {
    throw new ExplainableRuleValidationError("Rule condition requires at least one clause");
  }
  if (value.condition.clauses.length > 24) {
    throw new ExplainableRuleValidationError("Rule condition permits at most 24 clauses");
  }
  const inputsByKey = new Map(allowedInputs.map((input) => [input.key, input]));
  const clauses = value.condition.clauses.map((candidate) => {
    if (!isRecord(candidate) || typeof candidate.input !== "string") {
      throw new ExplainableRuleValidationError("Every clause requires an input");
    }
    const input = inputsByKey.get(candidate.input);
    if (!input) {
      throw new ExplainableRuleValidationError(
        `Clause references input ${candidate.input} outside allowedInputs`,
      );
    }
    if (!["eq", "lte", "gte"].includes(String(candidate.operator))) {
      throw new ExplainableRuleValidationError(`Clause ${candidate.input} has invalid operator`);
    }
    const operator = candidate.operator as RuleClause["operator"];
    if (input.type !== "number" && operator !== "eq") {
      throw new ExplainableRuleValidationError(`Input ${candidate.input} only supports equality`);
    }
    if (!["number", "boolean", "string"].includes(typeof candidate.value)) {
      throw new ExplainableRuleValidationError(`Clause ${candidate.input} has invalid value`);
    }
    const clauseValue = candidate.value as RuleInputValue;
    assertValueMatchesInput(input, clauseValue);
    const minimumOccurrences =
      candidate.minimumOccurrences === undefined
        ? 1
        : assertIntegerInRange(
            `Clause ${candidate.input} minimumOccurrences`,
            candidate.minimumOccurrences as number,
            1,
            90,
          );
    const minimumDistinctDays =
      candidate.minimumDistinctDays === undefined
        ? undefined
        : assertIntegerInRange(
            `Clause ${candidate.input} minimumDistinctDays`,
            candidate.minimumDistinctDays as number,
            1,
            minimumOccurrences,
          );
    return {
      input: candidate.input,
      operator,
      value: clauseValue,
      minimumOccurrences,
      ...(minimumDistinctDays ? { minimumDistinctDays } : {}),
    } satisfies RuleClause;
  });

  if (!["standard", "priority"].includes(String(value.administrativeSeverity))) {
    throw new ExplainableRuleValidationError("Administrative severity is invalid");
  }
  if (
    typeof value.explanation !== "string" ||
    value.explanation.trim().length < 10 ||
    value.explanation.trim().length > 500
  ) {
    throw new ExplainableRuleValidationError("Rule explanation must contain 10 to 500 characters");
  }
  if (!["nurse", "clinician"].includes(String(value.reviewOwner))) {
    throw new ExplainableRuleValidationError("Rule reviewOwner must be nurse or clinician");
  }

  return {
    schemaVersion: 1,
    allowedInputs,
    window: { lookbackHours },
    condition: {
      combinator: value.condition.combinator as "all" | "any",
      clauses,
    },
    administrativeSeverity: value.administrativeSeverity as AdministrativeSeverity,
    explanation: value.explanation.trim(),
    reviewOwner: value.reviewOwner as RuleReviewOwner,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function compare(value: RuleInputValue, clause: RuleClause): boolean {
  if (clause.operator === "eq") return value === clause.value;
  if (typeof value !== "number" || typeof clause.value !== "number") return false;
  return clause.operator === "lte" ? value <= clause.value : value >= clause.value;
}

function selectClauseEvidence(
  candidates: readonly ReferencedRuleInput[],
  clause: RuleClause,
): readonly ReferencedRuleInput[] {
  const matching = candidates.filter(({ value }) => compare(value, clause));
  const requiredOccurrences = clause.minimumOccurrences ?? 1;
  const requiredDays = clause.minimumDistinctDays ?? 0;
  if (matching.length < requiredOccurrences) return [];
  if (
    requiredDays > 0 &&
    new Set(matching.map(({ observedAt }) => observedAt.slice(0, 10))).size < requiredDays
  ) {
    return [];
  }
  if (requiredDays === 0) return matching.slice(0, requiredOccurrences);

  const selected: ReferencedRuleInput[] = [];
  const selectedDays = new Set<string>();
  for (const candidate of matching) {
    const day = candidate.observedAt.slice(0, 10);
    if (
      !selectedDays.has(day) ||
      selected.length + (requiredDays - selectedDays.size) <= requiredOccurrences
    ) {
      selected.push(candidate);
      selectedDays.add(day);
    }
    if (selected.length >= requiredOccurrences && selectedDays.size >= requiredDays) break;
  }
  return selectedDays.size >= requiredDays && selected.length >= requiredOccurrences
    ? selected
    : [];
}

function explainMatchedClause(
  clause: RuleClause,
  evidence: readonly ReferencedRuleInput[],
): string {
  const operator = clause.operator === "eq" ? "=" : clause.operator === "lte" ? "<=" : ">=";
  const occurrences = clause.minimumOccurrences ?? 1;
  const distinctDays = clause.minimumDistinctDays
    ? ` en al menos ${clause.minimumDistinctDays} días distintos`
    : "";
  return (
    `${clause.input} ${operator} ${JSON.stringify(clause.value)} ` +
    `(${evidence.length}/${occurrences} coincidencias requeridas${distinctDays})`
  );
}

function normalizeInputs(
  inputs: readonly ReferencedRuleInput[],
  dsl: ExplainableRuleDsl,
  evaluatedAt: Date,
  episodeId: string,
): readonly ReferencedRuleInput[] {
  if (inputs.length > 500) {
    throw new ExplainableRuleValidationError("An evaluation permits at most 500 input references");
  }
  const allowedByKey = new Map(dsl.allowedInputs.map((input) => [input.key, input]));
  const normalized = inputs
    .map((input) => {
      const allowed = allowedByKey.get(input.inputKey);
      if (!allowed) {
        throw new ExplainableRuleValidationError(
          `Input ${input.inputKey} is not explicitly permitted`,
        );
      }
      assertValueMatchesInput(allowed, input.value);
      const observedAt = new Date(input.observedAt);
      if (Number.isNaN(observedAt.valueOf()) || observedAt > evaluatedAt) {
        throw new ExplainableRuleValidationError(`Input ${input.inputKey} has invalid observedAt`);
      }
      if (
        !input.source ||
        typeof input.source.resourceType !== "string" ||
        !SAFE_SOURCE_FIELD.test(input.source.resourceType) ||
        typeof input.source.resourceId !== "string" ||
        !SAFE_RESOURCE_ID.test(input.source.resourceId) ||
        typeof input.source.field !== "string" ||
        !SAFE_SOURCE_FIELD.test(input.source.field) ||
        typeof input.source.episodeId !== "string" ||
        !SAFE_RESOURCE_ID.test(input.source.episodeId)
      ) {
        throw new ExplainableRuleValidationError(
          `Input ${input.inputKey} has an invalid source reference`,
        );
      }
      if (input.source.episodeId !== episodeId) {
        throw new ExplainableRuleValidationError("Input source belongs to another episode");
      }
      return {
        inputKey: input.inputKey,
        value: input.value,
        observedAt: observedAt.toISOString(),
        source: {
          resourceType: input.source.resourceType,
          resourceId: input.source.resourceId,
          field: input.source.field,
          episodeId: input.source.episodeId,
        },
      };
    })
    .sort(
      (left, right) =>
        left.inputKey.localeCompare(right.inputKey) ||
        left.observedAt.localeCompare(right.observedAt) ||
        left.source.resourceType.localeCompare(right.source.resourceType) ||
        left.source.resourceId.localeCompare(right.source.resourceId) ||
        left.source.field.localeCompare(right.source.field) ||
        left.source.episodeId.localeCompare(right.source.episodeId),
    );
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1]!;
    const current = normalized[index]!;
    if (
      previous.inputKey === current.inputKey &&
      previous.observedAt === current.observedAt &&
      previous.source.resourceType === current.source.resourceType &&
      previous.source.resourceId === current.source.resourceId &&
      previous.source.field === current.source.field &&
      previous.source.episodeId === current.source.episodeId
    ) {
      throw new ExplainableRuleValidationError(
        `Input ${current.inputKey} contains a duplicate source reference`,
      );
    }
  }
  return normalized;
}

export function evaluateExplainableRule(
  request: RuleEvaluationRequest,
): DeterministicRuleEvaluation {
  const dsl = validateExplainableRuleDsl(request.dsl);
  if (!Number.isInteger(request.ruleVersionNumber) || request.ruleVersionNumber < 1) {
    throw new ExplainableRuleValidationError("Rule version number must be positive");
  }
  if (Number.isNaN(request.evaluatedAt.valueOf())) {
    throw new ExplainableRuleValidationError("Evaluation timestamp is invalid");
  }
  if (!SAFE_RESOURCE_ID.test(request.episodeId)) {
    throw new ExplainableRuleValidationError("Evaluation episode is invalid");
  }
  const normalizedInputs = normalizeInputs(
    request.inputs,
    dsl,
    request.evaluatedAt,
    request.episodeId,
  );
  const windowStartsAt = new Date(
    request.evaluatedAt.getTime() - dsl.window.lookbackHours * 60 * 60 * 1000,
  );
  const inWindow = normalizedInputs.filter(
    ({ observedAt }) => new Date(observedAt) >= windowStartsAt,
  );
  const missingInputs = dsl.allowedInputs
    .filter(({ key, required }) => required && !inWindow.some(({ inputKey }) => inputKey === key))
    .map(({ key }) => key)
    .sort();
  const inputHash = createHash("sha256")
    .update(
      JSON.stringify(
        canonicalize({
          definitionId: request.definitionId,
          ruleVersionId: request.ruleVersionId,
          ruleVersionNumber: request.ruleVersionNumber,
          episodeId: request.episodeId,
          dsl,
          evaluatedAt: request.evaluatedAt.toISOString(),
          inputs: normalizedInputs,
        }),
      ),
    )
    .digest("hex");

  if (missingInputs.length > 0) {
    return {
      outcome: "abstained",
      inputHash,
      normalizedInputs,
      referencedInputs: [],
      explanation: null,
      missingInputs,
    };
  }

  const evidenceByClause = dsl.condition.clauses.map((clause) =>
    selectClauseEvidence(
      inWindow.filter(({ inputKey }) => inputKey === clause.input),
      clause,
    ),
  );
  const clauseMatches = evidenceByClause.map((evidence) => evidence.length > 0);
  const matched =
    dsl.condition.combinator === "all" ? clauseMatches.every(Boolean) : clauseMatches.some(Boolean);
  if (!matched) {
    return {
      outcome: "not-matched",
      inputHash,
      normalizedInputs,
      referencedInputs: [],
      explanation: null,
      missingInputs: [],
    };
  }

  const referencedInputs = evidenceByClause
    .filter((_, index) => clauseMatches[index])
    .flat()
    .filter(
      (input, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.inputKey === input.inputKey &&
            candidate.observedAt === input.observedAt &&
            candidate.source.resourceType === input.source.resourceType &&
            candidate.source.resourceId === input.source.resourceId &&
            candidate.source.field === input.source.field,
        ) === index,
    );
  const sourceExplanation = referencedInputs
    .map(
      (input) =>
        `${input.inputKey}=${JSON.stringify(input.value)} ` +
        `(${input.source.resourceType}/${input.source.resourceId}.${input.source.field}, ${input.observedAt})`,
    )
    .join("; ");
  const conditionExplanation = evidenceByClause
    .map((evidence, index) =>
      clauseMatches[index] ? explainMatchedClause(dsl.condition.clauses[index]!, evidence) : null,
    )
    .filter((value): value is string => value !== null)
    .join(dsl.condition.combinator === "all" ? " Y " : " O ");

  return {
    outcome: "matched",
    inputHash,
    normalizedInputs,
    referencedInputs,
    explanation:
      `Regla v${request.ruleVersionNumber}, ventana ${dsl.window.lookbackHours} h. ` +
      `${dsl.explanation} Condición coincidente: ${conditionExplanation}. ` +
      `Datos de origen: ${sourceExplanation}.`,
    missingInputs: [],
  };
}

export function assertAlertStateTransition(
  current: AlertState,
  next: Exclude<AlertState, "open">,
  reason: string | null,
): void {
  const allowed: Readonly<Record<AlertState, readonly AlertState[]>> = {
    open: ["reviewed", "dismissed-with-reason"],
    reviewed: ["actioned", "resolved", "dismissed-with-reason"],
    actioned: ["resolved", "dismissed-with-reason"],
    resolved: [],
    "dismissed-with-reason": [],
  };
  if (!allowed[current].includes(next)) {
    throw new ExplainableRuleValidationError(`Invalid alert transition ${current} -> ${next}`);
  }
  if (next === "dismissed-with-reason" && (!reason || reason.trim().length < 3)) {
    throw new ExplainableRuleValidationError("Dismissed alerts require a reason");
  }
  if (reason && reason.trim().length > 500) {
    throw new ExplainableRuleValidationError("Alert review reason is too long");
  }
}
