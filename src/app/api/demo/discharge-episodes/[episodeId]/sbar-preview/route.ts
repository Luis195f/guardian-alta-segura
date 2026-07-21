import { NextRequest, NextResponse } from "next/server";

import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoBuildWeekPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { generateSbarPreview } from "@/infrastructure/persistence/prisma-sbar-preview";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
) {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoBuildWeekPrincipal(
      request,
      "sbar-preview-generate",
    );
    assertSameOrigin(request, applicationOrigin);
    const { episodeId } = await context.params;
    const preview = await generateSbarPreview(principal, episodeId, correlationId);
    if (!preview) throw errors.forbidden();
    return NextResponse.json(preview, {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-sbar-preview");
  }
}
