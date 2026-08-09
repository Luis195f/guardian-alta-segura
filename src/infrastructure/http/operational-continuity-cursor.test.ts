import { describe, expect, it } from "vitest";

import {
  decodeOperationalCursor,
  encodeOperationalCursor,
  OperationalCursorError,
  operationalCursorContext,
} from "@/infrastructure/http/operational-continuity-cursor";

const context = operationalCursorContext({
  userId: "synthetic-professional-a",
  roles: ["nurse"],
  pageSize: 12,
});

function cursor() {
  return encodeOperationalCursor({
    position: {
      administrativeRank: 3,
      configuredAt: new Date("2026-08-09T09:00:00.000Z"),
      sourceType: "CHECK_IN",
      resourceId: "synthetic-check-in-001",
    },
    context,
    sessionId: "synthetic-session-a",
  });
}

describe("operational continuity cursor", () => {
  it("round-trips an opaque total-order position", () => {
    expect(
      decodeOperationalCursor({
        cursor: cursor(),
        context,
        sessionId: "synthetic-session-a",
      }),
    ).toEqual({
      administrativeRank: 3,
      configuredAt: new Date("2026-08-09T09:00:00.000Z"),
      sourceType: "CHECK_IN",
      resourceId: "synthetic-check-in-001",
    });
  });

  it("rejects a manipulated cursor", () => {
    const manipulated = cursor().replace(/^./u, (value) => (value === "a" ? "b" : "a"));
    expect(() =>
      decodeOperationalCursor({
        cursor: manipulated,
        context,
        sessionId: "synthetic-session-a",
      }),
    ).toThrow(OperationalCursorError);
  });

  it("rejects a cursor from another authorization context or session", () => {
    const otherContext = operationalCursorContext({
      userId: "synthetic-professional-b",
      roles: ["clinician"],
      pageSize: 12,
    });
    expect(() =>
      decodeOperationalCursor({
        cursor: cursor(),
        context: otherContext,
        sessionId: "synthetic-session-a",
      }),
    ).toThrow(OperationalCursorError);
    expect(() =>
      decodeOperationalCursor({
        cursor: cursor(),
        context,
        sessionId: "synthetic-session-b",
      }),
    ).toThrow(OperationalCursorError);
  });

  it("rejects malformed input without returning a fallback position", () => {
    expect(() =>
      decodeOperationalCursor({
        cursor: "not-a-cursor",
        context,
        sessionId: "synthetic-session-a",
      }),
    ).toThrow(OperationalCursorError);
  });
});
