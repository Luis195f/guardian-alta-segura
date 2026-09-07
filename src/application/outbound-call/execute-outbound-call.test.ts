import { describe, expect, it, vi } from "vitest";

import {
  ExecuteOutboundCall,
  OutboundCallIdempotencyConflictError,
} from "@/application/outbound-call/execute-outbound-call";
import {
  OutboundCallProviderError,
  type CreateOutboundCallInput,
  type OutboundCallFingerprint,
  type OutboundCallIntentRecord,
  type OutboundCallIntentStore,
  type OutboundCallProvider,
  type OutboundCallSnapshot,
} from "@/application/ports/outbound-call";

function syntheticPhone(suffix = "001"): string {
  return ["+", "34", "600", "000", suffix].join("");
}

function request(phone = syntheticPhone()): CreateOutboundCallInput {
  return {
    taskKey: "SYNTHETIC_CONTINUITY_CHECK",
    recipients: [{ phones: [phone], region: "ES", locale: "es-ES" }],
    idempotencyRef: "synthetic-ref-0001",
  };
}

function snapshot(status: OutboundCallSnapshot["status"]): OutboundCallSnapshot {
  return {
    providerRef: "synthetic-provider-ref",
    status,
    structuredResult: "ABSTAINED",
    providerCreatedAt: new Date("2026-08-29T10:00:00.000Z"),
    providerCompletedAt: status === "COMPLETED" ? new Date("2026-08-29T10:01:00.000Z") : null,
  };
}

class MemoryFingerprint implements OutboundCallFingerprint {
  derive(input: CreateOutboundCallInput): string {
    return `protected:${input.recipients[0]?.phones[0] ?? "none"}`;
  }

  matches(stored: string, candidate: string): boolean {
    return stored === candidate;
  }
}

class MemoryStore implements OutboundCallIntentStore {
  record: OutboundCallIntentRecord | null = null;
  readonly order: string[] = [];
  failProviderRefPersistence = false;

  async reserve(input: Parameters<OutboundCallIntentStore["reserve"]>[0]) {
    this.order.push("reserve");
    this.record ??= {
      id: "intent-1",
      idempotencyRef: input.idempotencyRef,
      protectedFingerprint: input.protectedFingerprint,
      providerRef: null,
      state: "RESERVED",
      technicalStatus: null,
      reconciliationState: "NOT_REQUIRED",
      errorClass: null,
      errorCode: null,
      createdAt: input.now,
      updatedAt: input.now,
      providerAcceptedAt: null,
      lastPolledAt: null,
      completedAt: null,
    };
    return this.record;
  }

  async claimPost(_intentId: string, now: Date) {
    this.order.push("claim");
    if (!this.record || this.record.state !== "RESERVED") return false;
    this.record = {
      ...this.record,
      state: "POSTING",
      reconciliationState: "PENDING",
      updatedAt: now,
    };
    return true;
  }

  async persistProviderRef(input: Parameters<OutboundCallIntentStore["persistProviderRef"]>[0]) {
    this.order.push("persist-provider-ref");
    if (this.failProviderRefPersistence) throw new Error("synthetic persistence failure");
    if (!this.record) throw new Error("missing intent");
    this.record = {
      ...this.record,
      providerRef: input.providerRef,
      state: input.snapshot.status === "COMPLETED" ? "COMPLETED" : "POLLING",
      technicalStatus: input.snapshot.status,
      reconciliationState: "NOT_REQUIRED",
      providerAcceptedAt: input.now,
      updatedAt: input.now,
      completedAt: input.snapshot.providerCompletedAt,
    };
    return this.record;
  }

  async recordSnapshot(input: Parameters<OutboundCallIntentStore["recordSnapshot"]>[0]) {
    this.order.push("get-result-persisted");
    if (!this.record) throw new Error("missing intent");
    const current = this.record;
    const terminal =
      input.snapshot.status === "COMPLETED" ||
      input.snapshot.status === "FAILED" ||
      input.snapshot.status === "CANCELED";
    const state = terminal ? input.snapshot.status : "POLLING";
    this.record = {
      ...current,
      state,
      technicalStatus: input.snapshot.status,
      reconciliationState: input.reconciliationState,
      lastPolledAt: input.now,
      updatedAt: input.now,
      completedAt: terminal ? (input.snapshot.providerCompletedAt ?? input.now) : null,
    };
    return this.record;
  }

  async recordError(input: Parameters<OutboundCallIntentStore["recordError"]>[0]) {
    this.order.push("error-persisted");
    if (!this.record) throw new Error("missing intent");
    const callNotReady = input.error.errorClass === "CALL_NOT_READY" && this.record.providerRef;
    this.record = {
      ...this.record,
      state: callNotReady ? "POLLING" : input.error.uncertain ? "UNCERTAIN" : "FAILED",
      reconciliationState: input.reconciliationState,
      errorClass: input.error.errorClass,
      errorCode: input.error.errorCode,
      updatedAt: input.now,
    };
    return this.record;
  }

  async getByIdempotencyRef(idempotencyRef: string) {
    return this.record?.idempotencyRef === idempotencyRef ? this.record : null;
  }
}

function service(
  provider: OutboundCallProvider,
  store: MemoryStore,
  clock = { value: new Date("2026-08-29T10:00:00.000Z") },
) {
  return new ExecuteOutboundCall(provider, store, new MemoryFingerprint(), {
    pollingTimeoutMs: 2_000,
    pollingIntervalMs: 1_000,
    now: () => new Date(clock.value),
    delay: async (milliseconds) => {
      clock.value = new Date(clock.value.getTime() + milliseconds);
    },
  });
}

describe("outbound call idempotent execution", () => {
  it("rejects polling bounds that could produce an unbounded wait", () => {
    const provider: OutboundCallProvider = { create: vi.fn(), get: vi.fn() };
    const store = new MemoryStore();
    const fingerprint = new MemoryFingerprint();
    expect(
      () =>
        new ExecuteOutboundCall(provider, store, fingerprint, {
          pollingTimeoutMs: 120_001,
          pollingIntervalMs: 1_000,
        }),
    ).toThrow("polling timeout is invalid");
    expect(
      () =>
        new ExecuteOutboundCall(provider, store, fingerprint, {
          pollingTimeoutMs: 2_000,
          pollingIntervalMs: 2_001,
        }),
    ).toThrow("polling interval is invalid");
  });

  it("persists providerRef before the first GET and maps a terminal result", async () => {
    const store = new MemoryStore();
    const provider: OutboundCallProvider = {
      create: vi.fn(async () => {
        store.order.push("post");
        return snapshot("QUEUED");
      }),
      get: vi.fn(async () => {
        store.order.push("get");
        return snapshot("COMPLETED");
      }),
    };
    const result = await service(provider, store).execute(request());
    expect(result.state).toBe("COMPLETED");
    expect(store.order).toEqual([
      "reserve",
      "claim",
      "post",
      "persist-provider-ref",
      "get",
      "get-result-persisted",
    ]);
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(provider.get).toHaveBeenCalledTimes(1);
  });

  it("performs one final GET after polling timeout and never a second POST", async () => {
    const store = new MemoryStore();
    const provider: OutboundCallProvider = {
      create: vi.fn(async () => snapshot("QUEUED")),
      get: vi
        .fn<OutboundCallProvider["get"]>()
        .mockResolvedValueOnce(snapshot("IN_PROGRESS"))
        .mockResolvedValueOnce(snapshot("IN_PROGRESS"))
        .mockResolvedValueOnce(snapshot("COMPLETED")),
    };
    const result = await service(provider, store).execute(request());
    expect(result.state).toBe("COMPLETED");
    expect(result.reconciliationState).toBe("RECONCILED");
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(provider.get).toHaveBeenCalledTimes(3);
  });

  it("keeps call_not_ready polling the same providerRef without another POST", async () => {
    const store = new MemoryStore();
    const notReady = new OutboundCallProviderError({
      errorClass: "CALL_NOT_READY",
      errorCode: "call_not_ready",
      uncertain: true,
    });
    const provider: OutboundCallProvider = {
      create: vi.fn(async () => snapshot("QUEUED")),
      get: vi.fn(async () => {
        throw notReady;
      }),
    };
    const executor = service(provider, store);
    const first = await executor.execute(request());
    const replay = await executor.execute(request());
    expect(first).toMatchObject({
      state: "POLLING",
      providerRef: "synthetic-provider-ref",
      errorClass: "CALL_NOT_READY",
      errorCode: "call_not_ready",
      reconciliationState: "PENDING",
    });
    expect(replay.state).toBe("POLLING");
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(provider.get).toHaveBeenCalledTimes(6);
  });

  it("does not regenerate idempotency after provider idempotency_conflict", async () => {
    const store = new MemoryStore();
    const provider: OutboundCallProvider = {
      create: vi.fn(async () => {
        throw new OutboundCallProviderError({
          errorClass: "IDEMPOTENCY_CONFLICT",
          errorCode: "idempotency_conflict",
          uncertain: false,
        });
      }),
      get: vi.fn(),
    };
    const executor = service(provider, store);
    const first = await executor.execute(request());
    const replay = await executor.execute(request());
    expect(first).toMatchObject({
      state: "FAILED",
      errorClass: "IDEMPOTENCY_CONFLICT",
      errorCode: "idempotency_conflict",
    });
    expect(replay.idempotencyRef).toBe(request().idempotencyRef);
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(provider.get).not.toHaveBeenCalled();
  });

  it("does not retry POST after uncertain create or providerRef persistence failure", async () => {
    const uncertainStore = new MemoryStore();
    const uncertainProvider: OutboundCallProvider = {
      create: vi.fn(async () => {
        throw new OutboundCallProviderError({
          errorClass: "CONNECTION_UNCERTAIN",
          errorCode: "connection_uncertain",
          uncertain: true,
        });
      }),
      get: vi.fn(),
    };
    const uncertainService = service(uncertainProvider, uncertainStore);
    const first = await uncertainService.execute(request());
    const replay = await uncertainService.execute(request());
    expect(first.state).toBe("UNCERTAIN");
    expect(replay.state).toBe("UNCERTAIN");
    expect(uncertainProvider.create).toHaveBeenCalledTimes(1);
    expect(uncertainProvider.get).not.toHaveBeenCalled();

    const persistenceStore = new MemoryStore();
    persistenceStore.failProviderRefPersistence = true;
    const acceptedProvider: OutboundCallProvider = {
      create: vi.fn(async () => snapshot("QUEUED")),
      get: vi.fn(),
    };
    const persistenceService = service(acceptedProvider, persistenceStore);
    const failed = await persistenceService.execute(request());
    const failedReplay = await persistenceService.execute(request());
    expect(failed.state).toBe("UNCERTAIN");
    expect(failedReplay.state).toBe("UNCERTAIN");
    expect(acceptedProvider.create).toHaveBeenCalledTimes(1);
    expect(acceptedProvider.get).not.toHaveBeenCalled();
  });

  it("returns identical replay without another POST and conflicts on another fingerprint", async () => {
    const store = new MemoryStore();
    const provider: OutboundCallProvider = {
      create: vi.fn(async () => snapshot("QUEUED")),
      get: vi.fn(async () => snapshot("COMPLETED")),
    };
    const executor = service(provider, store);
    const first = await executor.execute(request());
    const replay = await executor.execute(request());
    expect(replay.id).toBe(first.id);
    expect(provider.create).toHaveBeenCalledTimes(1);
    await expect(executor.execute(request(syntheticPhone("002")))).rejects.toBeInstanceOf(
      OutboundCallIdempotencyConflictError,
    );
    expect(provider.create).toHaveBeenCalledTimes(1);
  });

  it("allows at most one POST under concurrent identical execution", async () => {
    const store = new MemoryStore();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider: OutboundCallProvider = {
      create: vi.fn(async () => {
        await pending;
        return snapshot("QUEUED");
      }),
      get: vi.fn(async () => snapshot("COMPLETED")),
    };
    const executor = service(provider, store);
    const first = executor.execute(request());
    await vi.waitFor(() => expect(provider.create).toHaveBeenCalledTimes(1));
    const second = executor.execute(request());
    release();
    await Promise.all([first, second]);
    expect(provider.create).toHaveBeenCalledTimes(1);
  });
});
