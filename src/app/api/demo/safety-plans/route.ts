import { NextRequest, NextResponse } from "next/server";

import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { requireDemoSafetyPlanPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { listPatientSafetyPlanViews } from "@/infrastructure/persistence/prisma-safety-plan-unit-of-work";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoSafetyPlanPrincipal(request, "read");
    const plans = await listPatientSafetyPlanViews(principal);
    if (!plans) throw errors.forbidden();
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO — no sustituye atención profesional",
        plans,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-patient-safety-plans");
  }
}
