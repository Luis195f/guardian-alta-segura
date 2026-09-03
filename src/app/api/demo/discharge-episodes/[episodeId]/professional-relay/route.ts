import { NextRequest, NextResponse } from "next/server";

import {
  emptyProfessionalRelayView,
  professionalRelayView,
} from "@/application/relay/professional-relay-view";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { PROFESSIONAL_RELAY_CONFIRMATION_COOKIE } from "@/infrastructure/http/professional-relay-confirmation-cookie";
import {
  getLatestSyntheticProfessionalRelayAttempt,
  SyntheticDemoProfessionalRelayAuthority,
} from "@/infrastructure/relay/synthetic-demo-professional-relay";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoEpisodePrincipal(request, "read");
    const { episodeId } = await context.params;
    const authority = await new SyntheticDemoProfessionalRelayAuthority().resolve({
      actor: principal,
      recipientKind: "PROFESSIONAL",
      purpose: "PROFESSIONAL_REVIEW_REQUEST",
      context: { episodeRef: episodeId, taskRef: null },
    });
    if (!authority) return NextResponse.json(emptyProfessionalRelayView(), { status: 404 });
    const attempt = await getLatestSyntheticProfessionalRelayAttempt(episodeId);
    const relay = attempt
      ? professionalRelayView(
          attempt,
          authority,
          Boolean(request.cookies.get(PROFESSIONAL_RELAY_CONFIRMATION_COOKIE)?.value),
        )
      : emptyProfessionalRelayView();
    return NextResponse.json(relay, {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-professional-relay-read");
  }
}
