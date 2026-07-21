import { NextRequest, NextResponse } from "next/server";

import { InvalidCaregiverAccessError } from "@/domain/caregiver/caregiver-access";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { errors } from "@/infrastructure/http/app-error";
import {
  CAREGIVER_SESSION_COOKIE_NAME,
  expiredCaregiverSessionCookie,
} from "@/infrastructure/http/caregiver-session-cookie";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  getCaregiverPortalView,
  logoutCaregiverSession,
  recordCaregiverObservation,
} from "@/infrastructure/persistence/prisma-caregiver-access-unit-of-work";
import { assertLoopbackRequestHost } from "@/infrastructure/security/loopback";

function requireDemoPortalRequest(request: NextRequest) {
  const environment = readServerEnvironment();
  if (!environment.demoMode) throw errors.notFound();
  assertLoopbackRequestHost(request);
  const rawSessionToken = request.cookies.get(CAREGIVER_SESSION_COOKIE_NAME)?.value;
  if (!rawSessionToken) throw errors.unauthenticated();
  return { environment, rawSessionToken };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { environment, rawSessionToken } = requireDemoPortalRequest(request);
    const result = await getCaregiverPortalView({ rawSessionToken, correlationId });
    if (!result) {
      const response = errorResponse(
        errors.unauthenticated(),
        correlationId,
        "demo-caregiver-portal-read",
      );
      response.cookies.set(expiredCaregiverSessionCookie(environment.sessionCookieSecure));
      return response;
    }
    return NextResponse.json(
      {
        notice:
          "Acceso limitado: no incluye diagnósticos, notas clínicas ni check-ins completos. Ante una urgencia usa solo los recursos oficiales indicados por tu centro.",
        ...result,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-caregiver-portal-read");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { environment, rawSessionToken } = requireDemoPortalRequest(request);
    assertSameOrigin(request, environment.appBaseUrl.origin);
    const body = (await request.json()) as Record<string, unknown>;
    let result;
    try {
      result = await recordCaregiverObservation({
        rawSessionToken,
        content: body.content,
        correlationId,
      });
    } catch (error) {
      if (error instanceof InvalidCaregiverAccessError) throw errors.badRequest();
      throw error;
    }
    if (!result) throw errors.forbidden();
    return NextResponse.json(
      {
        observationId: result.id,
        submittedAt: result.submittedAt,
        notice:
          "Observación registrada para revisión humana; no crea una alerta ni una actuación automática.",
      },
      { status: 201, headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-caregiver-observation-create");
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { environment, rawSessionToken } = requireDemoPortalRequest(request);
    assertSameOrigin(request, environment.appBaseUrl.origin);
    await logoutCaregiverSession({ rawSessionToken, correlationId });
    const response = new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
    response.cookies.set(expiredCaregiverSessionCookie(environment.sessionCookieSecure));
    return response;
  } catch (error) {
    return errorResponse(error, correlationId, "demo-caregiver-portal-logout");
  }
}
