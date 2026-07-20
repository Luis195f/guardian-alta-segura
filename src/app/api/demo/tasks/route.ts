import { NextRequest, NextResponse } from "next/server";

import { CreateNursingTaskService } from "@/application/workqueue/manage-nursing-tasks";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoNursingWorkQueuePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { mapNursingTaskError } from "@/infrastructure/http/nursing-task-errors";
import { PrismaNursingWorkQueueUnitOfWork } from "@/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoNursingWorkQueuePrincipal(
      request,
      "task-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const body = (await request.json()) as Record<string, unknown>;
    let result;
    try {
      result = await new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute({
        actor: principal,
        episodeId: typeof body.episodeId === "string" ? body.episodeId : "",
        alertId: typeof body.alertId === "string" ? body.alertId : null,
        summary: body.summary,
        assignedToId: typeof body.assignedToId === "string" ? body.assignedToId : null,
        idempotencyKey: request.headers.get("idempotency-key") ?? "",
        correlationId,
      });
    } catch (error) {
      mapNursingTaskError(error);
    }
    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-task-create");
  }
}
