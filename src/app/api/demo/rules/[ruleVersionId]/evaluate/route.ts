import { NextRequest, NextResponse } from "next/server";

import { EvaluateRuleService } from "@/application/alerts/manage-explainable-alerts";
import type { ReferencedRuleInput } from "@/domain/alerts/explainable-rule";
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
      "alert-evaluation-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const [{ ruleVersionId }, body] = await Promise.all([
      context.params,
      request.json() as Promise<Record<string, unknown>>,
    ]);
    let result;
    try {
      result = await new EvaluateRuleService(new PrismaExplainableAlertsUnitOfWork()).execute({
        actor: principal,
        ruleVersionId,
        episodeId: typeof body.episodeId === "string" ? body.episodeId : "",
        inputs: Array.isArray(body.inputs) ? (body.inputs as unknown as ReferencedRuleInput[]) : [],
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
    return errorResponse(error, correlationId, "demo-rule-evaluate");
  }
}
