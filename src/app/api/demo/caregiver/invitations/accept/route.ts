import { NextRequest, NextResponse } from "next/server";

import {
  AcceptCaregiverInvitationService,
  CaregiverAccessConflictError,
  CaregiverAccessDeniedError,
  CaregiverAccessNotFoundError,
} from "@/application/caregiver/manage-caregiver-access";
import { secureSessionTokenIssuer, sha256 } from "@/infrastructure/crypto/session-token";
import { errors } from "@/infrastructure/http/app-error";
import { caregiverSessionCookie } from "@/infrastructure/http/caregiver-session-cookie";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoCaregiverAccessPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { PrismaCaregiverAccessUnitOfWork } from "@/infrastructure/persistence/prisma-caregiver-access-unit-of-work";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoCaregiverAccessPrincipal(
      request,
      "caregiver-invitation-accept",
    );
    assertSameOrigin(request, applicationOrigin);
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{40,64}$/u.test(body.token)) {
      throw errors.badRequest();
    }
    let result;
    try {
      const environment = readServerEnvironment();
      result = await new AcceptCaregiverInvitationService(
        new PrismaCaregiverAccessUnitOfWork(),
        secureSessionTokenIssuer,
        {
          invitationTtlMs: environment.caregiverDemoInvitationTtlMinutes * 60 * 1000,
          sessionTtlMs: environment.caregiverDemoSessionTtlHours * 60 * 60 * 1000,
        },
      ).execute({
        actor: principal,
        invitationTokenHash: sha256(body.token),
        correlationId,
      });
    } catch (error) {
      if (error instanceof CaregiverAccessNotFoundError) throw errors.notFound();
      if (error instanceof CaregiverAccessDeniedError) throw errors.forbidden();
      if (error instanceof CaregiverAccessConflictError) throw errors.conflict();
      throw error;
    }
    const response = NextResponse.json(
      {
        notice:
          "Acceso limitado y revocable. No sustituye atención profesional ni acredita representación legal.",
        expiresAt: result.expiresAt,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
    response.cookies.set(
      caregiverSessionCookie(
        result.rawSessionToken,
        result.expiresAt,
        readServerEnvironment().sessionCookieSecure,
      ),
    );
    return response;
  } catch (error) {
    return errorResponse(error, correlationId, "demo-caregiver-invitation-accept");
  }
}
