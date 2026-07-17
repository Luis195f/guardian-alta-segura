import { NextRequest, NextResponse } from "next/server";

import {
  CheckInConflictError,
  CheckInDeniedError,
  CheckInInvalidError,
  CheckInNotFoundError,
  CheckInParticipationRevokedError,
  CheckInWindowError,
  SubmitCheckInResponseService,
} from "@/application/check-in/manage-check-ins";
import type { CheckInAnswerInput } from "@/domain/check-in/check-in";
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
      "check-in-response-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const { assignmentId } = await context.params;
    const body = (await request.json()) as { answers?: unknown };
    let result;
    try {
      result = await new SubmitCheckInResponseService(new PrismaCheckInUnitOfWork()).execute({
        actor: principal,
        assignmentId,
        answers: Array.isArray(body.answers)
          ? (body.answers as unknown as CheckInAnswerInput[])
          : [],
        idempotencyKey: request.headers.get("idempotency-key") ?? "",
        correlationId,
      });
    } catch (error) {
      if (error instanceof CheckInDeniedError) throw errors.forbidden();
      if (error instanceof CheckInNotFoundError) throw errors.notFound();
      if (error instanceof CheckInConflictError) throw errors.conflict();
      if (error instanceof CheckInParticipationRevokedError) throw errors.forbidden();
      if (error instanceof CheckInWindowError || error instanceof CheckInInvalidError) {
        throw errors.badRequest();
      }
      throw error;
    }
    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-check-in-response");
  }
}
