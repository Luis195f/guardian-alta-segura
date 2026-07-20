import { createHash } from "node:crypto";

export const TASK_STATES = ["open", "resolved"] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const CONTACT_ATTEMPT_OUTCOMES = ["reached", "no-answer", "other"] as const;
export type ContactAttemptOutcome = (typeof CONTACT_ATTEMPT_OUTCOMES)[number];

export type TaskEventType =
  "created" | "assigned" | "reassigned" | "contact-attempt" | "note-recorded" | "resolved";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,112}$/;

export class NursingTaskValidationError extends Error {}

export function normalizeTaskSummary(value: unknown): string {
  if (typeof value !== "string") throw new NursingTaskValidationError("Task summary is required");
  const summary = value.trim();
  if (summary.length < 5 || summary.length > 160) {
    throw new NursingTaskValidationError("Task summary must contain 5 to 160 characters");
  }
  return summary;
}

export function normalizeBriefNote(value: unknown): string {
  if (typeof value !== "string") throw new NursingTaskValidationError("Brief note is required");
  const note = value.trim();
  if (note.length < 3 || note.length > 280) {
    throw new NursingTaskValidationError("Brief note must contain 3 to 280 characters");
  }
  return note;
}

export function normalizeResolutionReason(value: unknown): string {
  if (typeof value !== "string") {
    throw new NursingTaskValidationError("Resolution reason is required");
  }
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new NursingTaskValidationError("Resolution reason must contain 3 to 500 characters");
  }
  return reason;
}

export function validateIdempotencyKey(value: string): void {
  if (!IDEMPOTENCY_KEY.test(value)) {
    throw new NursingTaskValidationError("A valid idempotency key is required");
  }
}

export function validateExpectedRevision(value: unknown): asserts value is number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new NursingTaskValidationError("A positive expected revision is required");
  }
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]),
  );
}

export function taskRequestFingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
