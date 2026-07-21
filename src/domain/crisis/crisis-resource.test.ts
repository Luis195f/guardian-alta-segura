import { describe, expect, it } from "vitest";

import { CRISIS_RESOURCE_STATUS } from "@/domain/crisis/crisis-resource";

describe("recurso de crisis fail-closed", () => {
  it("permanece no operativo y no incorpora silenciosamente teléfonos o URI", () => {
    expect(CRISIS_RESOURCE_STATUS).toMatchObject({
      configured: false,
      enabled: false,
      actionUri: null,
    });
    expect(CRISIS_RESOURCE_STATUS.message).toContain("pendiente de protocolo local");
    expect(JSON.stringify(CRISIS_RESOURCE_STATUS)).not.toMatch(/tel:|\+?\d[\d\s()-]{5,}/);
  });
});
