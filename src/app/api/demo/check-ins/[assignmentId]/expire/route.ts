import { NextRequest, NextResponse } from "next/server";

import {
  CheckInConflictError,
  CheckInDeniedError,
  CheckInNotFoundError,
  CheckInWindowError,
  RecordExpiredCheckInNonResponseService,
} from "@/application/check-in/manage-check-ins";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoCheckInPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { PrismaCheckInUnitOfWork } from "@/infrastructure/persistence/prisma-check-in-unit-of-work";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoCheckInPrincipal(
      request,
      "check-in-assignment-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const { assignmentId } = await context.params;
    let result;
    try {
      result = await new RecordExpiredCheckInNonResponseService(
        new PrismaCheckInUnitOfWork(),
      ).execute({
        actor: principal,
        assignmentId,
        idempotencyKey: request.headers.get("idempotency-key") ?? "",
        correlationId,
      });
    } catch (error) {
      if (error instanceof CheckInDeniedError) throw errors.forbidden();
      if (error instanceof CheckInNotFoundError) throw errors.notFound();
      if (error instanceof CheckInConflictError) throw errors.conflict();
      if (error instanceof CheckInWindowError) throw errors.badRequest();
      throw error;
    }
    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-check-in-expire");
  }
}
