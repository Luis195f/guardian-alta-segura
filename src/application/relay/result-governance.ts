import type {
  GovernedRelayResult,
  RelayResultValidity,
  RelayTechnicalResult,
} from "@/application/ports/continuity-relay";
import type {
  OutboundCallErrorClass,
  OutboundCallIntentRecord,
  SanitizedOutboundCallError,
} from "@/application/ports/outbound-call";
import type { RelayGovernanceOutcome, RelayPurpose } from "@/domain/relay/continuity-relay";
import { parsePatientRelayTechnicalResult } from "@/domain/relay/patient-relay-contract";
import { parseProfessionalRelayTechnicalResult } from "@/domain/relay/professional-relay-contract";

export type RelayProviderTerminalEvent =
  "call.completed" | "call.failed" | "call.result_validation_failed";

interface ErrorContract extends SanitizedOutboundCallError {
  readonly outcome: Exclude<
    RelayGovernanceOutcome,
    | "UNKNOWN_PENDING_RECONCILIATION"
    | "RESULT_SCHEMA_VIOLATION"
    | "RESULT_AVAILABLE_PENDING_HUMAN_REVIEW"
  >;
}

const ERROR_CONTRACT = {
  unsupported_region: ["REGION_LANGUAGE", "CALL_NOT_ATTEMPTED", false],
  unsupported_language: ["REGION_LANGUAGE", "CALL_NOT_ATTEMPTED", false],
  invalid_phone: ["RECIPIENT_PHONE", "CALL_NOT_ATTEMPTED", false],
  invalid_recipient: ["RECIPIENT_PHONE", "CALL_NOT_ATTEMPTED", false],
  no_recipients: ["RECIPIENT_PHONE", "CALL_NOT_ATTEMPTED", false],
  result_schema_invalid: ["RESULT_SCHEMA", "CALL_NOT_ATTEMPTED", false],
  recipient_result_schema_invalid: ["RESULT_SCHEMA", "CALL_NOT_ATTEMPTED", false],
  provider_unavailable: ["PROVIDER_UNAVAILABLE", "CHANNEL_UNAVAILABLE", false],
  insufficient_balance: ["BALANCE", "CHANNEL_UNAVAILABLE", false],
  unauthorized: ["CONFIGURATION_AUTH", "CHANNEL_UNAVAILABLE", false],
  forbidden: ["CONFIGURATION_AUTH", "CHANNEL_UNAVAILABLE", false],
  rate_limit_exceeded: ["RATE_LIMIT", "CHANNEL_UNAVAILABLE", false],
  idempotency_conflict: ["IDEMPOTENCY_CONFLICT", "CONFIRMATION_CONFLICT", false],
  recipient_blocked: ["POLICY_REFUSAL", "PROVIDER_POLICY_REFUSAL", false],
  policy_violation: ["POLICY_REFUSAL", "PROVIDER_POLICY_REFUSAL", false],
  call_not_ready: ["CALL_NOT_READY", "CALL_NOT_READY", true],
} as const satisfies Record<
  string,
  readonly [OutboundCallErrorClass, ErrorContract["outcome"], boolean]
>;

export function normalizeProviderErrorCode(code: unknown): ErrorContract {
  if (typeof code !== "string" || !Object.hasOwn(ERROR_CONTRACT, code)) {
    return {
      errorClass: "UNKNOWN",
      errorCode: "unknown_error",
      uncertain: true,
      outcome: "UNKNOWN_PROVIDER_ERROR",
    };
  }
  const [errorClass, outcome, uncertain] = ERROR_CONTRACT[code as keyof typeof ERROR_CONTRACT];
  return { errorClass, errorCode: code, uncertain, outcome };
}

function isUncertainClass(errorClass: OutboundCallErrorClass): boolean {
  return (
    errorClass === "TIMEOUT" ||
    errorClass === "CONNECTION_UNCERTAIN" ||
    errorClass === "INVALID_RESPONSE" ||
    errorClass === "UNKNOWN"
  );
}

function outcomeForFailure(
  intent: Pick<OutboundCallIntentRecord, "providerRef" | "errorClass" | "errorCode">,
): RelayGovernanceOutcome {
  if (intent.errorCode && Object.hasOwn(ERROR_CONTRACT, intent.errorCode)) {
    const normalized = normalizeProviderErrorCode(intent.errorCode);
    if (normalized.outcome === "CALL_NOT_READY") return "CALL_NOT_READY";
    if (intent.providerRef && intent.errorClass && isUncertainClass(intent.errorClass)) {
      return "UNKNOWN_PENDING_RECONCILIATION";
    }
    return normalized.outcome;
  }
  if (intent.errorClass === "CALL_NOT_READY") return "CALL_NOT_READY";
  if (intent.providerRef && intent.errorClass && isUncertainClass(intent.errorClass)) {
    return "UNKNOWN_PENDING_RECONCILIATION";
  }
  switch (intent.errorClass) {
    case "RECIPIENT_PHONE":
    case "REGION_LANGUAGE":
    case "RESULT_SCHEMA":
      return "CALL_NOT_ATTEMPTED";
    case "CONFIGURATION_AUTH":
    case "RATE_LIMIT":
    case "BALANCE":
    case "PROVIDER_UNAVAILABLE":
    case "TIMEOUT":
    case "CONNECTION_UNCERTAIN":
      return "CHANNEL_UNAVAILABLE";
    case "IDEMPOTENCY_CONFLICT":
      return "CONFIRMATION_CONFLICT";
    case "POLICY_REFUSAL":
      return "PROVIDER_POLICY_REFUSAL";
    case "INVALID_RESPONSE":
    case "UNKNOWN":
    case null:
      return "UNKNOWN_PROVIDER_ERROR";
  }
}

function pending(outcome: RelayGovernanceOutcome): GovernedRelayResult {
  return {
    outcome,
    terminal: false,
    resultValidity: null,
    technicalResult: null,
    humanReviewRequired: false,
  };
}

function terminal(
  outcome: RelayGovernanceOutcome,
  resultValidity: RelayResultValidity,
  technicalResult: RelayTechnicalResult | null = null,
): GovernedRelayResult {
  return {
    outcome,
    terminal: true,
    resultValidity,
    technicalResult,
    humanReviewRequired: true,
  };
}

function isKnownEvent(value: unknown): value is RelayProviderTerminalEvent {
  return (
    value === "call.completed" ||
    value === "call.failed" ||
    value === "call.result_validation_failed"
  );
}

export function normalizeRelayResult(input: {
  readonly purpose: RelayPurpose;
  readonly intent: Pick<
    OutboundCallIntentRecord,
    "state" | "technicalStatus" | "providerRef" | "errorCode" | "errorClass"
  >;
  readonly structuredResult: unknown;
  readonly providerEventType?: unknown;
}): GovernedRelayResult {
  if (input.providerEventType !== undefined && !isKnownEvent(input.providerEventType)) {
    return terminal("UNKNOWN_PROVIDER_ERROR", "INVALID");
  }
  if (input.providerEventType === "call.result_validation_failed") {
    return terminal("RESULT_SCHEMA_VIOLATION", "INVALID");
  }

  const failureOutcome = outcomeForFailure(input.intent);
  if (failureOutcome === "CALL_NOT_READY") return pending(failureOutcome);
  if (
    input.intent.state === "RESERVED" ||
    input.intent.state === "POSTING" ||
    input.intent.state === "PROVIDER_ACCEPTED" ||
    input.intent.state === "POLLING"
  ) {
    return pending(
      input.intent.providerRef ? "UNKNOWN_PENDING_RECONCILIATION" : "UNKNOWN_PROVIDER_ERROR",
    );
  }
  if (input.intent.state === "UNCERTAIN" && input.intent.providerRef) {
    return pending("UNKNOWN_PENDING_RECONCILIATION");
  }
  if (
    input.intent.state === "FAILED" ||
    input.intent.state === "CANCELED" ||
    input.intent.state === "UNCERTAIN"
  ) {
    return terminal(failureOutcome, "MISSING");
  }
  if (
    input.intent.state !== "COMPLETED" ||
    input.intent.technicalStatus !== "COMPLETED" ||
    !input.intent.providerRef ||
    input.providerEventType === "call.failed"
  ) {
    return terminal("UNKNOWN_PROVIDER_ERROR", "INVALID");
  }

  const technicalResult =
    input.purpose === "PATIENT_CALLBACK_OFFER"
      ? parsePatientRelayTechnicalResult(input.structuredResult)
      : parseProfessionalRelayTechnicalResult(input.structuredResult);
  if (!technicalResult) {
    return terminal(
      "RESULT_SCHEMA_VIOLATION",
      input.structuredResult === null || input.structuredResult === undefined
        ? "MISSING"
        : "INVALID",
    );
  }
  return terminal("RESULT_AVAILABLE_PENDING_HUMAN_REVIEW", "VALID", technicalResult);
}
