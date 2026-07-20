import { NextRequest, NextResponse } from "next/server";

import { ActivateRuleVersionService } from "@/application/alerts/manage-explainable-alerts";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoExplainableAlertPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { mapExplainableAlertError } from "@/infrastructure/http/explainable-alert-errors";
import { PrismaExplainableAlertsUnitOfWork } from "@/infrastructure/persistence/prisma-explainable-alerts-unit-of-work";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ruleVersionId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoExplainableAlertPrincipal(
      request,
      "rule-activation-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const { ruleVersionId } = await context.params;
    let result;
    try {
      result = await new ActivateRuleVersionService(
        new PrismaExplainableAlertsUnitOfWork(),
      ).execute({ actor: principal, ruleVersionId, correlationId });
    } catch (error) {
      mapExplainableAlertError(error);
    }
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-rule-version-activate");
  }
}
