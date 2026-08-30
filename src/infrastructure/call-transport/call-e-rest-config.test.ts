import { describe, expect, it } from "vitest";

import {
  CALL_E_API_BASE_URL,
  CallERestConfigurationError,
  readCallERestConfiguration,
} from "@/infrastructure/call-transport/call-e-rest-config";
import { KeyedCallFingerprint } from "@/infrastructure/call-transport/keyed-call-fingerprint";
import { DisabledCallERestRuntime } from "@/infrastructure/call-transport/call-e-rest-runtime";

function syntheticPhone(): string {
  return ["+", "34", "600", "000", "001"].join("");
}

describe("CALL-E REST server-only configuration", () => {
  it("is disabled by default and does not read secrets eagerly", () => {
    expect(readCallERestConfiguration({})).toEqual({
      enabled: false,
      apiKey: null,
      fingerprintKey: null,
      requestTimeoutMs: 10_000,
    });
  });

  it("fails closed when explicitly enabled without both server secrets", () => {
    expect(() => readCallERestConfiguration({ CALL_E_REST_ENABLED: "true" })).toThrowError(
      CallERestConfigurationError,
    );
    expect(() =>
      readCallERestConfiguration({
        CALL_E_REST_ENABLED: "true",
        CALL_E_API_KEY: ["synthetic", "key"].join("-"),
      }),
    ).toThrow("Outbound call REST configuration is unavailable");
  });

  it("rejects ambiguous flags, weak fingerprint keys, and unsafe timeouts", () => {
    expect(() => readCallERestConfiguration({ CALL_E_REST_ENABLED: "1" })).toThrow();
    expect(() =>
      readCallERestConfiguration({
        CALL_E_REST_ENABLED: "true",
        CALL_E_API_KEY: "synthetic",
        CALL_E_FINGERPRINT_KEY: "short",
      }),
    ).toThrow();
    expect(() => readCallERestConfiguration({ CALL_E_REST_REQUEST_TIMEOUT_MS: "999" })).toThrow();
  });

  it("pins the only production base and derives a keyed, opaque fingerprint", () => {
    expect(CALL_E_API_BASE_URL).toBe("https://api.heycall-e.com");
    const phone = syntheticPhone();
    const service = new KeyedCallFingerprint("k".repeat(32));
    const fingerprint = service.derive({
      idempotencyRef: "synthetic-ref-0001",
      taskKey: "SYNTHETIC_CONTINUITY_CHECK",
      recipients: [{ phones: [phone], region: "ES", locale: "es-ES" }],
    });
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(fingerprint.includes(phone)).toBe(false);
    expect(service.matches(fingerprint, fingerprint)).toBe(true);
    expect(service.matches(fingerprint, "0".repeat(64))).toBe(false);
    expect(service.matches(fingerprint, "invalid")).toBe(false);
  });

  it("initializes lazily and fails closed while the default flag is off", () => {
    const runtime = new DisabledCallERestRuntime({});
    expect(() => runtime.getExecutor()).toThrow("Outbound call REST configuration is unavailable");
  });
});
