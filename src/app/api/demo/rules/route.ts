import { NextRequest, NextResponse } from "next/server";

import { CreateRuleVersionService } from "@/application/alerts/manage-explainable-alerts";
import type { ExplainableRuleDsl } from "@/domain/alerts/explainable-rule";
import { SYNTHETIC_RULE_NOTICE } from "@/domain/alerts/synthetic-rule-fixtures";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoExplainableAlertPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { mapExplainableAlertError } from "@/infrastructure/http/explainable-alert-errors";
import {
  listRuleCatalog,
  PrismaExplainableAlertsUnitOfWork,
} from "@/infrastructure/persistence/prisma-explainable-alerts-unit-of-work";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    await requireDemoExplainableAlertPrincipal(request, "rule-catalog-read");
    return NextResponse.json(
      { notice: SYNTHETIC_RULE_NOTICE, rules: await listRuleCatalog() },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-rule-catalog-list");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoExplainableAlertPrincipal(
      request,
      "rule-definition-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const body = (await request.json()) as Record<string, unknown>;
    let result;
    try {
      result = await new CreateRuleVersionService(new PrismaExplainableAlertsUnitOfWork()).execute({
        actor: principal,
        ruleKey: typeof body.ruleKey === "string" ? body.ruleKey : "",
        name: typeof body.name === "string" ? body.name : "",
        basedOnVersionId: typeof body.basedOnVersionId === "string" ? body.basedOnVersionId : null,
        dsl: body.dsl as ExplainableRuleDsl,
        correlationId,
      });
    } catch (error) {
      mapExplainableAlertError(error);
    }
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-rule-version-create");
  }
}
