import { NextRequest, NextResponse } from "next/server";

import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { errors } from "@/infrastructure/http/app-error";
import { requireDemoExplainableAlertPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { listVisibleAlerts } from "@/infrastructure/persistence/prisma-explainable-alerts-unit-of-work";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, explainableTrafficLight } = await requireDemoExplainableAlertPrincipal(
      request,
      "alert-read",
    );
    const alerts = await listVisibleAlerts(principal);
    if (!alerts) throw errors.forbidden();
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO — priorización textual, revisión humana obligatoria",
        explainableTrafficLight,
        alerts: alerts.map((alert) => ({
          ...alert,
          triggeredAt: alert.triggeredAt.toISOString(),
          reviews: alert.reviews.map((review) => ({
            ...review,
            reviewedAt: review.reviewedAt.toISOString(),
          })),
        })),
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-alert-list");
  }
}
