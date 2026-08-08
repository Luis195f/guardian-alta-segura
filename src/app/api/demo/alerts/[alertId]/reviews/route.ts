import { NextRequest, NextResponse } from "next/server";

import { ReviewAlertService } from "@/application/alerts/manage-explainable-alerts";
import type { AlertState } from "@/domain/alerts/explainable-rule";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoExplainableAlertPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { mapExplainableAlertError } from "@/infrastructure/http/explainable-alert-errors";
import { PrismaExplainableAlertsUnitOfWork } from "@/infrastructure/persistence/prisma-explainable-alerts-unit-of-work";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoExplainableAlertPrincipal(
      request,
      "alert-review-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const [{ alertId }, body] = await Promise.all([
      context.params,
      request.json() as Promise<Record<string, unknown>>,
    ]);
    let result;
    try {
      result = await new ReviewAlertService(new PrismaExplainableAlertsUnitOfWork()).execute({
        actor: principal,
        alertId,
        expectedState: body.expectedState as AlertState,
        nextState: body.nextState as Exclude<AlertState, "open">,
        reason: typeof body.reason === "string" ? body.reason : null,
        idempotencyKey: request.headers.get("idempotency-key") ?? "",
        correlationId,
      });
    } catch (error) {
      mapExplainableAlertError(error);
    }
    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-alert-review");
  }
}
