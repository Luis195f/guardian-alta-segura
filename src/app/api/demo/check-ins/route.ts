import { NextRequest, NextResponse } from "next/server";

import {
  CheckInConflictError,
  CheckInDeniedError,
  CheckInInvalidError,
  CheckInNotFoundError,
  CheckInParticipationRevokedError,
  GenerateCheckInAssignmentsService,
} from "@/application/check-in/manage-check-ins";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoCheckInPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  listVisibleCheckInAssignments,
  PrismaCheckInUnitOfWork,
} from "@/infrastructure/persistence/prisma-check-in-unit-of-work";

export const dynamic = "force-dynamic";

function mapError(error: unknown): never {
  if (error instanceof CheckInDeniedError) throw errors.forbidden();
  if (error instanceof CheckInNotFoundError) throw errors.notFound();
  if (error instanceof CheckInConflictError) throw errors.conflict();
  if (error instanceof CheckInParticipationRevokedError) throw errors.forbidden();
  if (error instanceof CheckInInvalidError) throw errors.badRequest();
  throw error;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoCheckInPrincipal(request, "check-in-read");
    const assignments = await listVisibleCheckInAssignments(principal);
    if (!assignments) throw errors.forbidden();
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO — sin interpretación automática",
        assignments: assignments.map((assignment) => ({
          ...assignment,
          scheduledFor: assignment.scheduledFor.toISOString(),
          windowStartsAt: assignment.windowStartsAt.toISOString(),
          windowEndsAt: assignment.windowEndsAt.toISOString(),
          serverNow: assignment.serverNow.toISOString(),
          nonResponseEvent: assignment.nonResponseEvent
            ? {
                ...assignment.nonResponseEvent,
                recordedAt: assignment.nonResponseEvent.recordedAt.toISOString(),
              }
            : null,
          response: assignment.response
            ? {
                ...assignment.response,
                submittedAt: assignment.response.submittedAt.toISOString(),
              }
            : null,
        })),
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-check-in-list");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoCheckInPrincipal(
      request,
      "check-in-assignment-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const body = (await request.json()) as Record<string, unknown>;
    let result;
    try {
      result = await new GenerateCheckInAssignmentsService(new PrismaCheckInUnitOfWork()).execute({
        actor: principal,
        episodeId: typeof body.episodeId === "string" ? body.episodeId : "",
        protocolVersionId: typeof body.protocolVersionId === "string" ? body.protocolVersionId : "",
        idempotencyKey: request.headers.get("idempotency-key") ?? "",
        correlationId,
      });
    } catch (error) {
      mapError(error);
    }
    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-check-in-assignment-create");
  }
}
