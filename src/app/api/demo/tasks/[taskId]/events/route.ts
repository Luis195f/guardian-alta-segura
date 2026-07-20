import { NextRequest, NextResponse } from "next/server";

import {
  type NursingTaskAction,
  UpdateNursingTaskService,
} from "@/application/workqueue/manage-nursing-tasks";
import type { ContactAttemptOutcome } from "@/domain/workqueue/nursing-task";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoNursingWorkQueuePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { mapNursingTaskError } from "@/infrastructure/http/nursing-task-errors";
import { PrismaNursingWorkQueueUnitOfWork } from "@/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work";

function parseAction(body: Record<string, unknown>): NursingTaskAction {
  if (body.action === "assign" && typeof body.assignedToId === "string") {
    return { kind: "assign", assignedToId: body.assignedToId };
  }
  if (body.action === "contact-attempt" && typeof body.outcome === "string") {
    return { kind: "contact-attempt", outcome: body.outcome as ContactAttemptOutcome };
  }
  if (body.action === "note") return { kind: "note", note: body.note };
  if (body.action === "resolve") return { kind: "resolve", reason: body.reason };
  throw errors.badRequest();
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoNursingWorkQueuePrincipal(
      request,
      "task-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const [{ taskId }, body] = await Promise.all([
      context.params,
      request.json() as Promise<Record<string, unknown>>,
    ]);
    let result;
    try {
      result = await new UpdateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute({
        actor: principal,
        taskId,
        expectedRevision: body.expectedRevision,
        action: parseAction(body),
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
    return errorResponse(error, correlationId, "demo-task-event");
  }
}
