import { describe, expect, it } from "vitest";

import {
  boundCollection,
  TECHNICAL_COLLECTION_LIMIT_NOTICE,
} from "@/application/collections/bounded-collection";

describe("bounded collection contract", () => {
  it("returns the full collection when it fits within the technical limit", () => {
    expect(boundCollection(["a", "b"], 2)).toEqual({
      values: ["a", "b"],
      coverage: {
        returned: 2,
        limit: 2,
        truncated: false,
        basis: "TECHNICAL_DEMO_LIMIT",
      },
    });
  });

  it("uses the sentinel row to report truncation without presenting a clinical threshold", () => {
    expect(boundCollection(["a", "b", "c"], 2)).toEqual({
      values: ["a", "b"],
      coverage: {
        returned: 2,
        limit: 2,
        truncated: true,
        basis: "TECHNICAL_DEMO_LIMIT",
      },
    });
    expect(TECHNICAL_COLLECTION_LIMIT_NOTICE).toContain("Límite técnico");
    expect(TECHNICAL_COLLECTION_LIMIT_NOTICE).toContain("no es una regla ni un umbral clínico");
  });
});
