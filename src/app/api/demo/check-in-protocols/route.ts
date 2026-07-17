import { NextRequest, NextResponse } from "next/server";

import {
  CheckInConflictError,
  CheckInDeniedError,
  CheckInInvalidError,
  CreateCheckInProtocolVersionService,
} from "@/application/check-in/manage-check-ins";
import type {
  CheckInProtocolState,
  QuestionDefinitionInput,
  ScheduleConfigurationInput,
} from "@/domain/check-in/check-in";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoCheckInPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  listCheckInProtocols,
  PrismaCheckInUnitOfWork,
} from "@/infrastructure/persistence/prisma-check-in-unit-of-work";

export const dynamic = "force-dynamic";

function mapError(error: unknown): never {
  if (error instanceof CheckInDeniedError) throw errors.forbidden();
  if (error instanceof CheckInConflictError) throw errors.conflict();
  if (error instanceof CheckInInvalidError) throw errors.badRequest();
  throw error;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    await requireDemoCheckInPrincipal(request, "check-in-protocol-read");
    const protocols = await listCheckInProtocols();
    return NextResponse.json(
      {
        notice: "PLANTILLA SINTÉTICA / NO APROBADA / NO USO CLÍNICO",
        protocols,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-check-in-protocol-list");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoCheckInPrincipal(
      request,
      "check-in-protocol-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const body = (await request.json()) as Record<string, unknown>;
    if ("isSyntheticFixture" in body && body.isSyntheticFixture !== true) {
      throw errors.badRequest();
    }
    let result;
    try {
      result = await new CreateCheckInProtocolVersionService(new PrismaCheckInUnitOfWork()).execute(
        {
          actor: principal,
          protocolKey: typeof body.protocolKey === "string" ? body.protocolKey : "",
          title: typeof body.title === "string" ? body.title : "",
          state: body.state as CheckInProtocolState,
          basedOnVersionId:
            typeof body.basedOnVersionId === "string" ? body.basedOnVersionId : null,
          questions: Array.isArray(body.questions)
            ? (body.questions as unknown as QuestionDefinitionInput[])
            : [],
          schedule: body.schedule as unknown as ScheduleConfigurationInput,
          correlationId,
        },
      );
    } catch (error) {
      mapError(error);
    }
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-check-in-protocol-create");
  }
}
