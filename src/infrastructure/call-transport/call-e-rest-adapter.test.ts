import { describe, expect, it, vi } from "vitest";

import { OutboundCallProviderError } from "@/application/ports/outbound-call";
import {
  CallERestAdapter,
  type CallERestTransport,
} from "@/infrastructure/call-transport/call-e-rest-adapter";

function syntheticPhone(): string {
  return ["+", "34", "600", "000", "001"].join("");
}

function syntheticApiKey(): string {
  return ["synthetic", "never", "live", "key"].join("-");
}

function input() {
  return {
    taskKey: "SYNTHETIC_CONTINUITY_CHECK",
    recipients: [{ phones: [syntheticPhone()], region: "ES", locale: "es-ES" }],
    idempotencyRef: "synthetic-ref-0001",
  } as const;
}

function callResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "synthetic-call-ref",
    status: "queued",
    structured_result: null,
    created_at: "2026-08-29T10:00:00.000Z",
    completed_at: null,
    summary: "must be discarded",
    evidence: [{ content: "must be discarded" }],
    recipients: [{ attempts: [{ status: "queued" }] }],
    transcript_turns: [{ content: "must be discarded" }],
    metadata: { unsafe: true },
    ...overrides,
  };
}

function adapter(transport: CallERestTransport, log = vi.fn()) {
  return {
    client: new CallERestAdapter({
      apiKey: syntheticApiKey(),
      requestTimeoutMs: 1_000,
      transport,
      log,
    }),
    log,
  };
}

describe("CALL-E REST adapter", () => {
  it("creates the singular payload with Bearer and Idempotency-Key without leaking either", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const transport: CallERestTransport = async (url, init) => {
      capturedUrl = url.toString();
      capturedInit = init;
      return Response.json(callResponse(), { status: 201 });
    };
    const { client, log } = adapter(transport);
    const result = await client.create(input());
    const headers = new Headers(capturedInit?.headers);
    const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
    const recipients = body.recipients as Array<Record<string, unknown>>;
    const phones = recipients[0]?.phones as string[];

    expect(capturedUrl).toBe("https://api.heycall-e.com/v1/calls");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.redirect).toBe("error");
    expect(headers.get("Idempotency-Key")).toBe(input().idempotencyRef);
    expect(headers.get("Authorization") === `Bearer ${syntheticApiKey()}`).toBe(true);
    expect(Object.keys(body).sort()).toEqual(["recipients", "task"]);
    expect(recipients).toHaveLength(1);
    expect(Object.keys(recipients[0] ?? {}).sort()).toEqual(["locale", "phones", "region"]);
    expect(phones).toHaveLength(1);
    expect(phones[0] === syntheticPhone()).toBe(true);
    expect(result).toEqual({
      providerRef: "synthetic-call-ref",
      status: "QUEUED",
      structuredResult: "ABSTAINED",
      providerCreatedAt: new Date("2026-08-29T10:00:00.000Z"),
      providerCompletedAt: null,
    });
    expect(JSON.stringify(log.mock.calls).includes(syntheticApiKey())).toBe(false);
    expect(JSON.stringify(log.mock.calls).includes(syntheticPhone())).toBe(false);
  });

  it.each([
    { ...input(), recipients: [] },
    { ...input(), recipients: [input().recipients[0], input().recipients[0]] },
    { ...input(), recipients: [{ ...input().recipients[0], phones: [] }] },
    {
      ...input(),
      recipients: [{ ...input().recipients[0], phones: [syntheticPhone(), syntheticPhone()] }],
    },
    { ...input(), recipients: [{ ...input().recipients[0], region: "" }] },
    { ...input(), recipients: [{ ...input().recipients[0], locale: "es" }] },
    { ...input(), taskKey: "free-form-task" },
  ])("rejects invalid local cardinality, destination, locale, region, or task", async (invalid) => {
    const transport = vi.fn<CallERestTransport>();
    const { client } = adapter(transport);
    await expect(client.create(invalid)).rejects.toBeInstanceOf(OutboundCallProviderError);
    expect(transport).not.toHaveBeenCalled();
  });

  it("rejects ambiguous or sensitive extra input fields before transport", async () => {
    const transport = vi.fn<CallERestTransport>();
    const { client } = adapter(transport);
    const extraTopLevel = { ...input(), metadata: { unsafe: true } };
    const extraRecipient = {
      ...input(),
      recipients: [{ ...input().recipients[0], alternatePhones: [syntheticPhone()] }],
    };
    await expect(client.create(extraTopLevel)).rejects.toMatchObject({
      errorCode: "invalid_request_shape",
    });
    await expect(client.create(extraRecipient)).rejects.toMatchObject({
      errorCode: "invalid_recipient_shape",
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("GET maps only the technical allowlist and discards the raw provider object", async () => {
    const transport: CallERestTransport = async () =>
      Response.json(
        callResponse({
          status: "completed",
          completed_at: "2026-08-29T10:01:00.000Z",
        }),
      );
    const { client } = adapter(transport);
    const result = await client.get("synthetic-call-ref");
    expect(Object.keys(result).sort()).toEqual([
      "providerCompletedAt",
      "providerCreatedAt",
      "providerRef",
      "status",
      "structuredResult",
    ]);
    expect(JSON.stringify(result).includes("must be discarded")).toBe(false);
    expect(result.structuredResult).toBe("ABSTAINED");
  });

  it("treats a non-null unvalidated structured result and malformed bodies as invalid", async () => {
    const withUnvalidatedResult = adapter(async () =>
      Response.json(callResponse({ structured_result: { decision: true } })),
    ).client;
    const malformed = adapter(async () => Response.json({ id: "synthetic-call-ref" })).client;
    await expect(withUnvalidatedResult.get("synthetic-call-ref")).rejects.toMatchObject({
      errorClass: "INVALID_RESPONSE",
      errorCode: "invalid_response",
    });
    await expect(malformed.get("synthetic-call-ref")).rejects.toMatchObject({
      errorClass: "INVALID_RESPONSE",
    });
  });

  it("rejects redirected and oversized provider responses", async () => {
    const redirectedResponse = Response.json(callResponse());
    Object.defineProperty(redirectedResponse, "redirected", { value: true });
    const redirected = adapter(async () => redirectedResponse).client;
    await expect(redirected.get("synthetic-call-ref")).rejects.toMatchObject({
      errorClass: "INVALID_RESPONSE",
      errorCode: "invalid_response",
    });

    const oversized = adapter(
      async () =>
        new Response(JSON.stringify({ padding: "x".repeat(65 * 1024) }), {
          headers: { "Content-Type": "application/json" },
        }),
    ).client;
    await expect(oversized.get("synthetic-call-ref")).rejects.toMatchObject({
      errorClass: "INVALID_RESPONSE",
      errorCode: "invalid_response",
    });
  });

  it.each([
    [401, "unauthorized", "CONFIGURATION_AUTH", "authentication_failed"],
    [429, "rate_limit_exceeded", "RATE_LIMIT", "rate_limited"],
    [402, "insufficient_balance", "BALANCE", "insufficient_balance"],
    [422, "unsupported_region", "REGION_LANGUAGE", "unsupported_region"],
    [422, "invalid_phone", "RECIPIENT_PHONE", "invalid_phone"],
    [409, "idempotency_conflict", "IDEMPOTENCY_CONFLICT", "idempotency_conflict"],
    [503, "provider_unavailable", "PROVIDER_UNAVAILABLE", "provider_unavailable"],
  ])(
    "sanitizes provider errors without retaining messages",
    async (status, code, errorClass, errorCode) => {
      const rawMessage = ["raw", syntheticPhone(), syntheticApiKey()].join("-");
      const { client, log } = adapter(async () =>
        Response.json(
          { error: { code, message: rawMessage, details: { rawMessage } } },
          { status },
        ),
      );
      const caught = await client.create(input()).catch((error: unknown) => error);
      expect(caught).toMatchObject({ errorClass, errorCode });
      expect(JSON.stringify(caught).includes(rawMessage)).toBe(false);
      expect(JSON.stringify(log.mock.calls).includes(rawMessage)).toBe(false);
    },
  );

  it("classifies an uncertain connection without logging request data", async () => {
    const { client, log } = adapter(async () => {
      throw new Error(["transport", syntheticPhone(), syntheticApiKey()].join("-"));
    });
    await expect(client.create(input())).rejects.toMatchObject({
      errorClass: "CONNECTION_UNCERTAIN",
      errorCode: "connection_uncertain",
      uncertain: true,
    });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged.includes(syntheticPhone())).toBe(false);
    expect(logged.includes(syntheticApiKey())).toBe(false);
    expect(logged.includes("SYNTHETIC continuity")).toBe(false);
  });
});
