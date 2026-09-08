export type OutboundCallTaskKey = "SYNTHETIC_CONTINUITY_CHECK";

export interface OutboundCallRecipient {
  readonly phones: readonly string[];
  readonly region: string;
  readonly locale: string;
}

export interface CreateOutboundCallInput {
  readonly taskKey: string;
  readonly recipients: readonly OutboundCallRecipient[];
  readonly idempotencyRef: string;
}

export type OutboundCallTechnicalStatus =
  "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELED";

export interface OutboundCallSnapshot {
  readonly providerRef: string;
  readonly status: OutboundCallTechnicalStatus;
  readonly structuredResult: unknown;
  readonly providerCreatedAt: Date | null;
  readonly providerCompletedAt: Date | null;
}

export type OutboundCallErrorClass =
  | "CONFIGURATION_AUTH"
  | "RATE_LIMIT"
  | "BALANCE"
  | "REGION_LANGUAGE"
  | "RECIPIENT_PHONE"
  | "RESULT_SCHEMA"
  | "POLICY_REFUSAL"
  | "CALL_NOT_READY"
  | "IDEMPOTENCY_CONFLICT"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "CONNECTION_UNCERTAIN"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export interface SanitizedOutboundCallError {
  readonly errorClass: OutboundCallErrorClass;
  readonly errorCode: string;
  readonly uncertain: boolean;
}

export class OutboundCallProviderError extends Error {
  readonly errorClass: OutboundCallErrorClass;
  readonly errorCode: string;
  readonly uncertain: boolean;

  constructor(error: SanitizedOutboundCallError) {
    super("Outbound call provider operation failed");
    this.name = "OutboundCallProviderError";
    this.errorClass = error.errorClass;
    this.errorCode = error.errorCode;
    this.uncertain = error.uncertain;
  }
}

export interface OutboundCallProvider {
  create(input: CreateOutboundCallInput): Promise<OutboundCallSnapshot>;
  get(providerRef: string): Promise<OutboundCallSnapshot>;
}

export type OutboundCallIntentState =
  | "RESERVED"
  | "POSTING"
  | "PROVIDER_ACCEPTED"
  | "POLLING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "UNCERTAIN";

export type OutboundCallReconciliationState =
  "NOT_REQUIRED" | "PENDING" | "RECONCILED" | "REVIEW_REQUIRED";

export interface OutboundCallIntentRecord {
  readonly id: string;
  readonly idempotencyRef: string;
  readonly protectedFingerprint: string;
  readonly providerRef: string | null;
  readonly state: OutboundCallIntentState;
  readonly technicalStatus: OutboundCallTechnicalStatus | null;
  readonly reconciliationState: OutboundCallReconciliationState;
  readonly errorClass: OutboundCallErrorClass | null;
  readonly errorCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly providerAcceptedAt: Date | null;
  readonly lastPolledAt: Date | null;
  readonly completedAt: Date | null;
}

export interface OutboundCallIntentStore {
  reserve(input: {
    readonly idempotencyRef: string;
    readonly protectedFingerprint: string;
    readonly now: Date;
  }): Promise<OutboundCallIntentRecord>;
  claimPost(intentId: string, now: Date): Promise<boolean>;
  persistProviderRef(input: {
    readonly intentId: string;
    readonly providerRef: string;
    readonly snapshot: OutboundCallSnapshot;
    readonly now: Date;
  }): Promise<OutboundCallIntentRecord>;
  recordSnapshot(input: {
    readonly intentId: string;
    readonly snapshot: OutboundCallSnapshot;
    readonly reconciliationState: OutboundCallReconciliationState;
    readonly now: Date;
  }): Promise<OutboundCallIntentRecord>;
  recordError(input: {
    readonly intentId: string;
    readonly error: SanitizedOutboundCallError;
    readonly reconciliationState: OutboundCallReconciliationState;
    readonly now: Date;
  }): Promise<OutboundCallIntentRecord>;
  getByIdempotencyRef(idempotencyRef: string): Promise<OutboundCallIntentRecord | null>;
}

export interface OutboundCallFingerprint {
  derive(input: CreateOutboundCallInput): string;
  matches(stored: string, candidate: string): boolean;
}
