import {
  OutboundCallProviderError,
  type CreateOutboundCallInput,
  type OutboundCallFingerprint,
  type OutboundCallIntentRecord,
  type OutboundCallIntentStore,
  type OutboundCallProvider,
  type SanitizedOutboundCallError,
} from "@/application/ports/outbound-call";

export class OutboundCallIdempotencyConflictError extends Error {
  constructor() {
    super("Outbound call idempotency conflict");
    this.name = "OutboundCallIdempotencyConflictError";
  }
}

const UNKNOWN_ERROR: SanitizedOutboundCallError = {
  errorClass: "UNKNOWN",
  errorCode: "unknown_error",
  uncertain: true,
};

function sanitizeError(error: unknown): SanitizedOutboundCallError {
  return error instanceof OutboundCallProviderError
    ? {
        errorClass: error.errorClass,
        errorCode: error.errorCode,
        uncertain: error.uncertain,
      }
    : UNKNOWN_ERROR;
}

function isTerminal(state: OutboundCallIntentRecord["state"]): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "CANCELED";
}

export interface OutboundCallExecutionOptions {
  readonly pollingTimeoutMs: number;
  readonly pollingIntervalMs: number;
  readonly now?: () => Date;
  readonly delay?: (milliseconds: number) => Promise<void>;
}

const MAX_POLLING_TIMEOUT_MS = 120_000;
const MAX_POLLING_INTERVAL_MS = 10_000;

export class ExecuteOutboundCall {
  private readonly now: () => Date;
  private readonly delay: (milliseconds: number) => Promise<void>;

  constructor(
    private readonly provider: OutboundCallProvider,
    private readonly store: OutboundCallIntentStore,
    private readonly fingerprint: OutboundCallFingerprint,
    private readonly options: OutboundCallExecutionOptions,
  ) {
    if (
      !Number.isInteger(options.pollingTimeoutMs) ||
      options.pollingTimeoutMs < 1 ||
      options.pollingTimeoutMs > MAX_POLLING_TIMEOUT_MS
    ) {
      throw new Error("Outbound call polling timeout is invalid");
    }
    if (
      !Number.isInteger(options.pollingIntervalMs) ||
      options.pollingIntervalMs < 1 ||
      options.pollingIntervalMs > MAX_POLLING_INTERVAL_MS ||
      options.pollingIntervalMs > options.pollingTimeoutMs
    ) {
      throw new Error("Outbound call polling interval is invalid");
    }
    this.now = options.now ?? (() => new Date());
    this.delay =
      options.delay ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async execute(input: CreateOutboundCallInput): Promise<OutboundCallIntentRecord> {
    const protectedFingerprint = this.fingerprint.derive(input);
    let intent = await this.store.reserve({
      idempotencyRef: input.idempotencyRef,
      protectedFingerprint,
      now: this.now(),
    });
    if (!this.fingerprint.matches(intent.protectedFingerprint, protectedFingerprint)) {
      throw new OutboundCallIdempotencyConflictError();
    }
    if (isTerminal(intent.state)) return intent;
    if (intent.providerRef) return this.poll(intent, true);

    const claimed = await this.store.claimPost(intent.id, this.now());
    if (!claimed) {
      return (await this.store.getByIdempotencyRef(input.idempotencyRef)) ?? intent;
    }

    let snapshot;
    try {
      snapshot = await this.provider.create(input);
    } catch (error) {
      return this.store.recordError({
        intentId: intent.id,
        error: sanitizeError(error),
        reconciliationState: "REVIEW_REQUIRED",
        now: this.now(),
      });
    }

    try {
      intent = await this.store.persistProviderRef({
        intentId: intent.id,
        providerRef: snapshot.providerRef,
        snapshot,
        now: this.now(),
      });
    } catch {
      try {
        await this.store.recordError({
          intentId: intent.id,
          error: {
            errorClass: "CONNECTION_UNCERTAIN",
            errorCode: "provider_ref_persistence_failed",
            uncertain: true,
          },
          reconciliationState: "REVIEW_REQUIRED",
          now: this.now(),
        });
      } catch {
        // The acceptance/persistence gap cannot be repaired by another POST.
      }
      return {
        ...intent,
        state: "UNCERTAIN",
        reconciliationState: "REVIEW_REQUIRED",
        errorClass: "CONNECTION_UNCERTAIN",
        errorCode: "provider_ref_persistence_failed",
        updatedAt: this.now(),
      };
    }

    return this.poll(intent, false);
  }

  private async poll(
    intent: OutboundCallIntentRecord,
    reconciliation: boolean,
  ): Promise<OutboundCallIntentRecord> {
    const providerRef = intent.providerRef;
    if (!providerRef) return intent;
    const deadline = this.now().getTime() + this.options.pollingTimeoutMs;

    while (this.now().getTime() < deadline) {
      try {
        const snapshot = await this.provider.get(providerRef);
        intent = await this.store.recordSnapshot({
          intentId: intent.id,
          snapshot,
          reconciliationState: reconciliation ? "RECONCILED" : "NOT_REQUIRED",
          now: this.now(),
        });
        if (isTerminal(intent.state)) return intent;
      } catch (error) {
        const sanitized = sanitizeError(error);
        if (!sanitized.uncertain) {
          return this.store.recordError({
            intentId: intent.id,
            error: sanitized,
            reconciliationState: "REVIEW_REQUIRED",
            now: this.now(),
          });
        }
        return this.reconcileByGet(intent, providerRef, sanitized);
      }
      await this.delay(this.options.pollingIntervalMs);
    }

    return this.reconcileByGet(intent, providerRef, {
      errorClass: "TIMEOUT",
      errorCode: "polling_timeout",
      uncertain: true,
    });
  }

  private async reconcileByGet(
    intent: OutboundCallIntentRecord,
    providerRef: string,
    cause: SanitizedOutboundCallError,
  ): Promise<OutboundCallIntentRecord> {
    try {
      const snapshot = await this.provider.get(providerRef);
      return this.store.recordSnapshot({
        intentId: intent.id,
        snapshot,
        reconciliationState: "RECONCILED",
        now: this.now(),
      });
    } catch {
      return this.store.recordError({
        intentId: intent.id,
        error: cause,
        reconciliationState: "REVIEW_REQUIRED",
        now: this.now(),
      });
    }
  }
}
