import { NextRequest, NextResponse } from "next/server";

import { professionalRelayView } from "@/application/relay/professional-relay-view";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { professionalRelayConfirmationCookie } from "@/infrastructure/http/professional-relay-confirmation-cookie";
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
  try {
    const { principal, applicationOrigin } = await requireDemoEpisodePrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    await requireEmptyJsonObject(request);
    const { episodeId } = await context.params;
    const service = createSyntheticDemoProfessionalRelayService(principal);
    let preview;
    try {
      preview = await service.preview({
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        episodeRef: episodeId,
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
    if (!attempt || !authority) throw new Error("Synthetic professional preview unavailable");
    const response = NextResponse.json(professionalRelayView(attempt, authority, true), {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
    response.cookies.set(
      professionalRelayConfirmationCookie(
        episodeId,
        preview.confirmationToken,
        preview.expiresAt,
        request.nextUrl.protocol === "https:",
      ),
    );
    return response;
  } catch (error) {
    return errorResponse(error, correlationId, "demo-professional-relay-preview");
  }
}
