import type { NextRequest } from "next/server";

import { authorize } from "@/domain/auth/authorization";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { readAuthenticatedPrincipal } from "@/infrastructure/auth/session-reader";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { errors } from "@/infrastructure/http/app-error";
import { SESSION_COOKIE_NAME } from "@/infrastructure/http/session-cookie";
import { assertLoopbackRequestHost } from "@/infrastructure/security/loopback";

export async function requireDemoEpisodePrincipal(
  request: NextRequest,
  operation: "read" | "write",
): Promise<{ readonly principal: AuthenticatedPrincipal; readonly applicationOrigin: string }> {
  const environment = readServerEnvironment();
  if (!environment.demoMode) throw errors.notFound();
  assertLoopbackRequestHost(request);
  const principal = await readAuthenticatedPrincipal(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!principal) throw errors.unauthenticated();
  if (!authorize(principal, `discharge-episode-${operation}`).allowed) throw errors.forbidden();
  return { principal, applicationOrigin: environment.appBaseUrl.origin };
}

export async function requireDemoSafetyPlanPrincipal(
  request: NextRequest,
  operation: "read" | "write",
): Promise<{ readonly principal: AuthenticatedPrincipal; readonly applicationOrigin: string }> {
  const environment = readServerEnvironment();
  if (!environment.demoMode) throw errors.notFound();
  assertLoopbackRequestHost(request);
  const principal = await readAuthenticatedPrincipal(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!principal) throw errors.unauthenticated();
  if (!authorize(principal, `safety-plan-${operation}`).allowed) throw errors.forbidden();
  return { principal, applicationOrigin: environment.appBaseUrl.origin };
}
