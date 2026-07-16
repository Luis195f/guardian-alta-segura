import { NextRequest, NextResponse } from "next/server";

import { authorize, isProtectedResource } from "@/domain/auth/authorization";
import { readAuthenticatedPrincipal } from "@/infrastructure/auth/session-reader";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { SESSION_COOKIE_NAME } from "@/infrastructure/http/session-cookie";
import { assertLoopbackRequestHost } from "@/infrastructure/security/loopback";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const environment = readServerEnvironment();
    if (!environment.demoMode) throw errors.notFound();
    assertLoopbackRequestHost(request);
    const { resource } = await context.params;
    if (!isProtectedResource(resource)) throw errors.notFound();
    const principal = await readAuthenticatedPrincipal(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!principal) throw errors.unauthenticated();
    if (!authorize(principal, resource).allowed) throw errors.forbidden();

    return NextResponse.json(
      { resource, notice: "SINTÉTICO / NO USO CLÍNICO" },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-protected-resource-read");
  }
}
