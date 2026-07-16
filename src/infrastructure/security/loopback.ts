import { errors } from "@/infrastructure/http/app-error";

export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function hostnameFromAuthority(authority: string): string | null {
  try {
    const parsed = new URL(`http://${authority.trim()}`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.hostname;
  } catch {
    return null;
  }
}

function isLoopbackAuthority(authority: string): boolean {
  const hostname = hostnameFromAuthority(authority);
  return hostname !== null && isLoopbackHostname(hostname);
}

export function assertLoopbackRequestHost(request: Pick<Request, "headers">): void {
  const host = request.headers.get("host");
  if (!host || !isLoopbackAuthority(host)) throw errors.forbidden();

  const forwardedHosts = request.headers.get("x-forwarded-host");
  if (
    forwardedHosts &&
    forwardedHosts.split(",").some((forwardedHost) => !isLoopbackAuthority(forwardedHost))
  ) {
    throw errors.forbidden();
  }
}
