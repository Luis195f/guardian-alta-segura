import { NextRequest, NextResponse } from "next/server";

import { professionalRelayView } from "@/application/relay/professional-relay-view";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  expiredProfessionalRelayConfirmationCookie,
  PROFESSIONAL_RELAY_CONFIRMATION_COOKIE,
} from "@/infrastructure/http/professional-relay-confirmation-cookie";
import {
  createSyntheticDemoProfessionalRelayService,
  getLatestSyntheticProfessionalRelayAttempt,
  SyntheticDemoProfessionalRelayAuthority,
} from "@/infrastructure/relay/synthetic-demo-professional-relay";
import { mapProfessionalRelayError, requireEmptyJsonObject } from "../http";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  const secure = request.nextUrl.protocol === "https:";
  const { episodeId } = await context.params;
  try {
    const { principal, applicationOrigin } = await requireDemoEpisodePrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    await requireEmptyJsonObject(request);
    const confirmationToken = request.cookies.get(PROFESSIONAL_RELAY_CONFIRMATION_COOKIE)?.value;
    if (!confirmationToken) throw errors.conflict();
    try {
      await createSyntheticDemoProfessionalRelayService(principal).confirm({
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        episodeRef: episodeId,
        confirmationToken,
        correlationId,
      });
    } catch (error) {
      mapProfessionalRelayError(error);
    }
    const [attempt, authority] = await Promise.all([
      getLatestSyntheticProfessionalRelayAttempt(episodeId),
      new SyntheticDemoProfessionalRelayAuthority().resolve({
        actor: principal,
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        context: { episodeRef: episodeId, taskRef: null },
      }),
    ]);
    if (!attempt || !authority) throw new Error("Synthetic professional result unavailable");
    const response = NextResponse.json(professionalRelayView(attempt, authority, false), {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
    response.cookies.set(expiredProfessionalRelayConfirmationCookie(episodeId, secure));
    return response;
  } catch (error) {
    const response = errorResponse(error, correlationId, "demo-professional-relay-confirm");
    response.cookies.set(expiredProfessionalRelayConfirmationCookie(episodeId, secure));
    return response;
  }
}
