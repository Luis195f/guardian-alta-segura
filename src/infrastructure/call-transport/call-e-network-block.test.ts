import { describe, expect, it } from "vitest";

describe("CALL-E test network boundary", () => {
  it.each([
    "https://api.heycall-e.com/v1/calls",
    "https://heycall-e.com/",
    "https://docs.heycall-e.com/api-reference/calls",
  ])("blocks provider network before any request: %s", async (url) => {
    await expect(fetch(url)).rejects.toThrow("External provider network is blocked in tests");
  });
});
