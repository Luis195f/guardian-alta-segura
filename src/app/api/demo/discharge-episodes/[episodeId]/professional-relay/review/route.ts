import { NextRequest, NextResponse } from "next/server";

import { professionalRelayView } from "@/application/relay/professional-relay-view";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
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
    const attempt = await getLatestSyntheticProfessionalRelayAttempt(episodeId);
    if (!attempt) throw errors.conflict();
    try {
      await createSyntheticDemoProfessionalRelayService(principal).recordHumanReview({
        attemptRef: attempt.id,
        correlationId,
      });
    } catch (error) {
      mapProfessionalRelayError(error);
    }
    const [reviewed, authority] = await Promise.all([
      getLatestSyntheticProfessionalRelayAttempt(episodeId),
      new SyntheticDemoProfessionalRelayAuthority().resolve({
        actor: principal,
        recipientKind: "PROFESSIONAL",
        purpose: "PROFESSIONAL_REVIEW_REQUEST",
        context: { episodeRef: episodeId, taskRef: null },
      }),
    ]);
    if (!reviewed || !authority) throw new Error("Synthetic professional review unavailable");
    return NextResponse.json(professionalRelayView(reviewed, authority, false), {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-professional-relay-review");
  }
}
