import { beforeAll, vi } from "vitest";

const blockedHosts = new Set(["api.heycall-e.com", "heycall-e.com", "docs.heycall-e.com"]);

beforeAll(() => {
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const rawUrl = input instanceof Request ? input.url : input.toString();
      const url = new URL(rawUrl);
      if (blockedHosts.has(url.hostname) || url.hostname.endsWith(".heycall-e.com")) {
        throw new Error("External provider network is blocked in tests");
      }
      return originalFetch(input, init);
    },
  );
});
