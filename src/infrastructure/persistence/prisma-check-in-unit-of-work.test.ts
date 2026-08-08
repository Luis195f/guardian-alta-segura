import { describe, expect, it } from "vitest";

import { availabilityFor } from "@/infrastructure/persistence/prisma-check-in-unit-of-work";

const windowStartsAt = new Date("2026-07-02T07:30:00.000Z");
const windowEndsAt = new Date("2026-07-02T10:30:00.000Z");

function availability(overrides: Partial<Parameters<typeof availabilityFor>[0]> = {}) {
  return availabilityFor({
    now: new Date("2026-07-02T08:00:00.000Z"),
    windowStartsAt,
    windowEndsAt,
    terminal: false,
    episodeActive: true,
    participationAllowed: true,
    ...overrides,
  });
}

describe("check-in assignment availability", () => {
  it("deriva los cuatro estados sin persistir una segunda fuente de verdad", () => {
    expect(availability()).toBe("OPEN");
    expect(availability({ now: new Date("2026-07-02T07:00:00.000Z") })).toBe("UPCOMING");
    expect(availability({ participationAllowed: false })).toBe("BLOCKED");
    expect(availability({ terminal: true })).toBe("CLOSED");
    expect(availability({ now: windowEndsAt })).toBe("CLOSED");
  });

  it("bloquea una ventana abierta cuando el episodio ya no está activo", () => {
    expect(availability({ episodeActive: false })).toBe("BLOCKED");
  });
});
