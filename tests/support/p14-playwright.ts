import { expect, test as base, type Request } from "@playwright/test";

interface UnexpectedBrowserRequest {
  readonly method: string;
  readonly destination: string;
}

function sanitizedDestination(request: Request): string {
  const url = new URL(request.url());
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function isAuthorizedLocalRequest(request: Request): boolean {
  const url = new URL(request.url());
  if (["about:", "blob:", "data:"].includes(url.protocol)) return true;
  return (
    ["http:", "https:"].includes(url.protocol) &&
    url.hostname === "127.0.0.1" &&
    url.port === "3000"
  );
}

export const test = base.extend<{ localNetworkBoundary: void }>({
  localNetworkBoundary: [
    async ({ page }, use) => {
      const unexpectedRequests: UnexpectedBrowserRequest[] = [];
      const inspectRequest = (request: Request) => {
        if (!isAuthorizedLocalRequest(request)) {
          unexpectedRequests.push({
            method: request.method(),
            destination: sanitizedDestination(request),
          });
        }
      };

      page.on("request", inspectRequest);
      await use();
      page.off("request", inspectRequest);

      expect(
        unexpectedRequests,
        "El navegador intentó contactar un destino no autorizado; las URL se muestran sin query ni fragmento.",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
