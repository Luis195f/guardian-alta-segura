import { describe, expect, it } from "vitest";

import {
  HOME_SAFETY_DISCLAIMER,
  HOME_SAFETY_ITEM_DEFINITIONS,
  HomeSafetyValidationError,
  parseHomeSafetySubmission,
} from "@/domain/home-safety/home-safety";

const items = HOME_SAFETY_ITEM_DEFINITIONS.map(({ key }) => ({
  itemKey: key,
  state: "NOT_REVIEWED" as const,
  provenance: "PATIENT" as const,
}));

describe("domicilio seguro informativo", () => {
  it("exige comprensión explícita y conserva únicamente estados no certificadores", () => {
    expect(
      parseHomeSafetySubmission({
        expectedPreviousVersion: 0,
        informationalPurposeAcknowledged: true,
        humanReviewed: false,
        items,
      }),
    ).toMatchObject({ expectedPreviousVersion: 0, humanReviewed: false });
    expect(HOME_SAFETY_DISCLAIMER).toContain("No certifica");
    expect(JSON.stringify(items)).not.toMatch(/score|safe|unsafe|certif/i);
  });

  it("rechaza falta de comprensión, ítems duplicados y valores libres", () => {
    expect(() =>
      parseHomeSafetySubmission({
        expectedPreviousVersion: 0,
        informationalPurposeAcknowledged: false,
        humanReviewed: false,
        items,
      }),
    ).toThrow(HomeSafetyValidationError);
    expect(() =>
      parseHomeSafetySubmission({
        expectedPreviousVersion: 0,
        informationalPurposeAcknowledged: true,
        humanReviewed: true,
        items: items.map((item) => ({ ...item, itemKey: items[0]!.itemKey })),
      }),
    ).toThrow(HomeSafetyValidationError);
  });
});
