import { describe, expect, it, vi } from "vitest";

import {
  CanonicalPolicyMismatchError,
  formatSafeSeedError,
  writeSafeSeedError,
} from "./seed-error.mjs";

const SYNTHETIC_MARKER = "SUPER_SECRET_SYNTHETIC_VALUE_DO_NOT_LOG";

function serialize(error) {
  return JSON.stringify(formatSafeSeedError(error));
}

function expectNoUntrustedDetail(output) {
  expect(output).not.toContain(SYNTHETIC_MARKER);
  expect(output).not.toContain("Invalid value");
}

describe("safe synthetic seed error envelope", () => {
  it("drops a normal Error message instead of filtering it", () => {
    const message = `Invalid value ${SYNTHETIC_MARKER}`;
    const output = serialize(new Error(message));

    expectNoUntrustedDetail(output);
    expect(output).not.toContain(message);
    expect(JSON.parse(output)).toEqual({
      code: "SYNTHETIC_SEED_FAILED",
      technicalCode: "UNCLASSIFIED",
    });
  });

  it("drops stack content", () => {
    const error = new Error("Static test failure");
    error.stack = `Error\n${SYNTHETIC_MARKER}`;

    expectNoUntrustedDetail(serialize(error));
  });

  it("drops cause content", () => {
    const error = new Error("Static test failure", {
      cause: new Error(SYNTHETIC_MARKER),
    });

    expectNoUntrustedDetail(serialize(error));
  });

  it("preserves only a closed-format Prisma technical code", () => {
    expect(formatSafeSeedError({ code: "P2002" })).toEqual({
      code: "SYNTHETIC_SEED_FAILED",
      technicalCode: "P2002",
    });
  });

  it("rejects a malicious technical code", () => {
    const output = serialize({ code: `P2002 ${SYNTHETIC_MARKER}` });

    expectNoUntrustedDetail(output);
    expect(JSON.parse(output).technicalCode).toBe("UNCLASSIFIED");
  });

  it("never reflects an arbitrary error name", () => {
    const output = serialize({ name: SYNTHETIC_MARKER });

    expectNoUntrustedDetail(output);
    expect(output).not.toContain("technicalName");
  });

  it("handles a thrown string with a static envelope", () => {
    const output = serialize(SYNTHETIC_MARKER);

    expectNoUntrustedDetail(output);
    expect(JSON.parse(output)).toEqual({
      code: "SYNTHETIC_SEED_FAILED",
      technicalCode: "UNCLASSIFIED",
    });
  });

  it("drops all free-form fields from a thrown object", () => {
    const output = serialize({
      message: SYNTHETIC_MARKER,
      stack: SYNTHETIC_MARKER,
      cause: SYNTHETIC_MARKER,
      code: `P2002 ${SYNTHETIC_MARKER}`,
      name: SYNTHETIC_MARKER,
    });

    expectNoUntrustedDetail(output);
    expect(JSON.parse(output)).toEqual({
      code: "SYNTHETIC_SEED_FAILED",
      technicalCode: "UNCLASSIFIED",
    });
  });

  it("drops Prisma-like meta", () => {
    expectNoUntrustedDetail(
      serialize({
        code: "P2002",
        meta: { target: SYNTHETIC_MARKER },
      }),
    );
  });

  it("rejects newline, carriage return, tab, ANSI, and control injection", () => {
    const controls = `P2002\n\r\t\u001b[31m${SYNTHETIC_MARKER}\u0000`;
    const output = serialize({
      code: controls,
      name: controls,
      message: controls,
    });

    expectNoUntrustedDetail(output);
    expect(output).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);
    expect(JSON.parse(output).technicalCode).toBe("UNCLASSIFIED");
  });

  it("preserves allowlisted canonical policy mismatch metadata", () => {
    expect(
      formatSafeSeedError(
        new CanonicalPolicyMismatchError("synthetic-check-in-template", "pending-local-v1"),
      ),
    ).toEqual({
      code: "CANONICAL_POLICY_MISMATCH",
      policyKey: "synthetic-check-in-template",
      version: "pending-local-v1",
    });
  });

  it("rejects control characters in canonical policy mismatch metadata", () => {
    const output = serialize(
      new CanonicalPolicyMismatchError(
        `synthetic-policy\n${SYNTHETIC_MARKER}`,
        `1\u001b${SYNTHETIC_MARKER}`,
      ),
    );

    expectNoUntrustedDetail(output);
    expect(JSON.parse(output)).toEqual({
      code: "CANONICAL_POLICY_MISMATCH",
      policyKey: "UNCLASSIFIED",
      version: "UNCLASSIFIED",
    });
  });

  it("produces parseable, deterministic JSON without the raw error", () => {
    const error = new Error(SYNTHETIC_MARKER);
    const first = serialize(error);
    const second = serialize(error);

    expect(() => JSON.parse(first)).not.toThrow();
    expect(first).toBe(second);
    expectNoUntrustedDetail(first);
  });

  it("writes one safe JSON string through the seed stderr path", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error(`Invalid value ${SYNTHETIC_MARKER}`);
    error.stack = SYNTHETIC_MARKER;
    error.cause = SYNTHETIC_MARKER;

    writeSafeSeedError(error);

    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError.mock.calls[0]).toHaveLength(1);
    const stderr = consoleError.mock.calls[0][0];
    expect(typeof stderr).toBe("string");
    expect(() => JSON.parse(stderr)).not.toThrow();
    expectNoUntrustedDetail(stderr);
  });
});
