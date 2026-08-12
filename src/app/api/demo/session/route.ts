import { NextRequest, NextResponse } from "next/server";

import { AuthenticationDeniedError, DemoLoginService } from "@/application/auth/demo-login";
import { LogoutService } from "@/application/auth/logout";
import { isRole } from "@/domain/auth/role";
import { readAuthenticatedPrincipal } from "@/infrastructure/auth/session-reader";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { hashUserAgent, secureSessionTokenIssuer } from "@/infrastructure/crypto/session-token";
import { PrismaDemoIdentityProvider } from "@/infrastructure/identity/demo-identity-provider";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { DemoLoginRateLimiter } from "@/infrastructure/http/rate-limiter";
import {
  expiredSessionCookie,
  SESSION_COOKIE_NAME,
  sessionCookie,
} from "@/infrastructure/http/session-cookie";
import { PrismaSecurityUnitOfWork } from "@/infrastructure/persistence/prisma-security-unit-of-work";
import { assertLoopbackRequestHost } from "@/infrastructure/security/loopback";

export const dynamic = "force-dynamic";

const loginLimiter = new DemoLoginRateLimiter(5, 60_000);
const aliasPattern = /^demo-(admin|nurse|clinician|patient|caregiver|support)$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const environment = readServerEnvironment();
    if (!environment.demoMode) throw errors.notFound();
    assertLoopbackRequestHost(request);
    assertSameOrigin(request, environment.appBaseUrl.origin);

    const input: unknown = await request.json().catch(() => null);
    if (
      !input ||
      typeof input !== "object" ||
      !("syntheticAlias" in input) ||
      typeof input.syntheticAlias !== "string" ||
      !aliasPattern.test(input.syntheticAlias)
    ) {
      throw errors.badRequest();
    }

    const userAgent = request.headers.get("user-agent");
    if (!loginLimiter.takeForSyntheticAlias(input.syntheticAlias)) throw errors.rateLimited();

    const service = new DemoLoginService(
      new PrismaDemoIdentityProvider(),
      new PrismaSecurityUnitOfWork(),
      secureSessionTokenIssuer,
      environment.demoSessionTtlHours * 60 * 60 * 1000,
    );
    const result = await service.execute({
      syntheticAlias: input.syntheticAlias,
      correlationId,
      userAgentHash: hashUserAgent(userAgent),
    });
    if (!result.principal.roles.every(isRole)) throw errors.unauthenticated();

    const response = NextResponse.json(
      {
        authenticated: true,
        synthetic: true,
        roles: result.principal.roles,
        notice: "SINTÉTICO / NO USO CLÍNICO",
      },
      { status: 201, headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
    response.cookies.set(
      sessionCookie(result.rawSessionToken, result.expiresAt, environment.sessionCookieSecure),
    );
    return response;
  } catch (error) {
    if (error instanceof AuthenticationDeniedError) {
      return errorResponse(errors.unauthenticated(), correlationId, "demo-session-create");
    }
    return errorResponse(error, correlationId, "demo-session-create");
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const environment = readServerEnvironment();
    if (!environment.demoMode) throw errors.notFound();
    assertLoopbackRequestHost(request);
    assertSameOrigin(request, environment.appBaseUrl.origin);
    const principal = await readAuthenticatedPrincipal(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!principal) throw errors.unauthenticated();

    await new LogoutService(new PrismaSecurityUnitOfWork()).execute({ principal, correlationId });
    const response = NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
    response.cookies.set(expiredSessionCookie(environment.sessionCookieSecure));
    return response;
  } catch (error) {
    return errorResponse(error, correlationId, "demo-session-delete");
  }
}
