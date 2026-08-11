import { createHash } from "node:crypto";

export const COMMITMENT_STATES = [
  "DRAFT",
  "AWAITING_EVIDENCE",
  "SUPERSEDED_BY_CORRECTION",
] as const;

export type CommitmentState = (typeof COMMITMENT_STATES)[number];

export const COMMITMENT_COMMANDS = [
  "CREATE_COMMITMENT_DRAFT",
  "ACTIVATE_COMMITMENT",
  "SUPERSEDE_DRAFT",
  "SUPERSEDE_ACTIVE_VERSION",
] as const;

export type CommitmentCommandKind = (typeof COMMITMENT_COMMANDS)[number];

export const COMMITMENT_EVENT_TYPES = [
  "COMMITMENT_DRAFT_CREATED",
  "COMMITMENT_ACTIVATED",
  "COMMITMENT_SUPERSEDED",
] as const;

export type CommitmentEventType = (typeof COMMITMENT_EVENT_TYPES)[number];

export interface DueSourceReference {
  readonly kind: string;
  readonly sourceId: string;
  readonly version: string;
}

export interface EvidenceReferenceV1 {
  readonly schemaVersion: 1;
  readonly sourceType: string;
  readonly sourceResourceId: string;
  readonly episodeId: string;
  readonly sourceVersionRef: string;
  readonly actionKind: string;
  readonly recordedAt: string;
  readonly resolverVersion: string;
  readonly integritySha256: string;
}

export class CommitmentValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_ID"
      | "INVALID_IDEMPOTENCY_KEY"
      | "INVALID_CORRELATION_ID"
      | "INVALID_REVISION"
      | "INVALID_DUE_AT"
      | "INVALID_TIME_ZONE"
      | "INVALID_DUE_SOURCE"
      | "INVALID_CORRECTION_REASON"
      | "INVALID_EVIDENCE_REFERENCE",
  ) {
    super(message);
    this.name = "CommitmentValidationError";
  }
}

export class CommitmentTransitionError extends Error {
  constructor(
    readonly command: CommitmentCommandKind,
    readonly fromState: CommitmentState | null,
  ) {
    super(`Command ${command} is not allowed from ${fromState ?? "NONEXISTENT"}`);
    this.name = "CommitmentTransitionError";
  }
}

const ID = /^[A-Za-z0-9._:-]{1,128}$/u;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256 = /^[a-f0-9]{64}$/u;
const EVIDENCE_REFERENCE_V1_KEYS = [
  "actionKind",
  "episodeId",
  "integritySha256",
  "recordedAt",
  "resolverVersion",
  "schemaVersion",
  "sourceResourceId",
  "sourceType",
  "sourceVersionRef",
] as const;

export function validateTechnicalId(name: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || !ID.test(value)) {
    throw new CommitmentValidationError(`${name} is invalid`, "INVALID_ID");
  }
}

export function validateIdempotencyKey(value: unknown): asserts value is string {
  if (typeof value !== "string" || !IDEMPOTENCY_KEY.test(value)) {
    throw new CommitmentValidationError(
      "A valid idempotency key is required",
      "INVALID_IDEMPOTENCY_KEY",
    );
  }
}

export function validateCorrelationId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new CommitmentValidationError(
      "A valid correlation ID is required",
      "INVALID_CORRELATION_ID",
    );
  }
}

export function validateExpectedRevision(value: unknown): asserts value is number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new CommitmentValidationError(
      "A positive expected revision is required",
      "INVALID_REVISION",
    );
  }
}

export function parseExplicitUtcInstant(value: unknown): Date {
  if (typeof value !== "string") {
    throw new CommitmentValidationError("dueAt must be an explicit UTC instant", "INVALID_DUE_AT");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new CommitmentValidationError("dueAt must be an explicit UTC instant", "INVALID_DUE_AT");
  }
  return parsed;
}

export function validateClockInstant(value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) {
    throw new CommitmentValidationError(
      "The injected clock returned an invalid instant",
      "INVALID_DUE_AT",
    );
  }
  return new Date(value.valueOf());
}

export function validateTimeZone(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 64 ||
    value.trim() !== value
  ) {
    throw new CommitmentValidationError("A valid IANA time zone is required", "INVALID_TIME_ZONE");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
  } catch {
    throw new CommitmentValidationError("A valid IANA time zone is required", "INVALID_TIME_ZONE");
  }
}

export function validateDueSource(value: DueSourceReference): void {
  try {
    validateTechnicalId("dueSource.kind", value.kind);
    validateTechnicalId("dueSource.sourceId", value.sourceId);
    validateTechnicalId("dueSource.version", value.version);
  } catch (error) {
    if (error instanceof CommitmentValidationError) {
      throw new CommitmentValidationError(
        "A complete due source is required",
        "INVALID_DUE_SOURCE",
      );
    }
    throw error;
  }
}

export function normalizeCorrectionReason(value: unknown): string {
  if (typeof value !== "string") {
    throw new CommitmentValidationError(
      "A correction reason is required",
      "INVALID_CORRECTION_REASON",
    );
  }
  const reason = value.trim();
  if (reason.length < 8 || reason.length > 280) {
    throw new CommitmentValidationError(
      "A correction reason must contain 8 to 280 characters",
      "INVALID_CORRECTION_REASON",
    );
  }
  return reason;
}

export function createEvidenceReferenceV1(value: unknown): EvidenceReferenceV1 {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error();
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (
      keys.length !== EVIDENCE_REFERENCE_V1_KEYS.length ||
      keys.some((key, index) => key !== EVIDENCE_REFERENCE_V1_KEYS[index]) ||
      record.schemaVersion !== 1
    ) {
      throw new Error();
    }
    validateTechnicalId("sourceType", record.sourceType);
    validateTechnicalId("sourceResourceId", record.sourceResourceId);
    validateTechnicalId("episodeId", record.episodeId);
    validateTechnicalId("sourceVersionRef", record.sourceVersionRef);
    validateTechnicalId("actionKind", record.actionKind);
    validateTechnicalId("resolverVersion", record.resolverVersion);
    if (typeof record.recordedAt !== "string") throw new Error();
    parseExplicitUtcInstant(record.recordedAt);
    if (typeof record.integritySha256 !== "string" || !SHA256.test(record.integritySha256)) {
      throw new Error();
    }
    return Object.freeze({
      schemaVersion: 1,
      sourceType: record.sourceType,
      sourceResourceId: record.sourceResourceId,
      episodeId: record.episodeId,
      sourceVersionRef: record.sourceVersionRef,
      actionKind: record.actionKind,
      recordedAt: record.recordedAt,
      resolverVersion: record.resolverVersion,
      integritySha256: record.integritySha256,
    });
  } catch {
    throw new CommitmentValidationError(
      "EvidenceReferenceV1 is invalid",
      "INVALID_EVIDENCE_REFERENCE",
    );
  }
}

export function assertCommitmentTransition(
  command: CommitmentCommandKind,
  fromState: CommitmentState | null,
): CommitmentState {
  if (command === "CREATE_COMMITMENT_DRAFT" && fromState === null) return "DRAFT";
  if (command === "ACTIVATE_COMMITMENT" && fromState === "DRAFT") {
    return "AWAITING_EVIDENCE";
  }
  if (command === "SUPERSEDE_DRAFT" && fromState === "DRAFT") {
    return "SUPERSEDED_BY_CORRECTION";
  }
  if (command === "SUPERSEDE_ACTIVE_VERSION" && fromState === "AWAITING_EVIDENCE") {
    return "SUPERSEDED_BY_CORRECTION";
  }
  throw new CommitmentTransitionError(command, fromState);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]),
  );
}

export function commitmentRequestFingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
