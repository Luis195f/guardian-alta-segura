import { NextRequest, NextResponse } from "next/server";

import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { requireDemoNursingWorkQueuePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  decodeOperationalCursor,
  encodeOperationalCursor,
  OperationalCursorError,
  operationalCursorContext,
} from "@/infrastructure/http/operational-continuity-cursor";
import {
  listOperationalContinuity,
  OPERATIONAL_CONTINUITY_DEFAULT_PAGE_SIZE,
  OPERATIONAL_CONTINUITY_MAX_PAGE_SIZE,
} from "@/infrastructure/persistence/prisma-operational-continuity-reader";
import { operationalCursorPosition } from "@/domain/continuity/operational-continuity";

export const dynamic = "force-dynamic";

function pageSizeParameter(value: string | null): number {
  if (value === null) return OPERATIONAL_CONTINUITY_DEFAULT_PAGE_SIZE;
  if (!/^\d{1,2}$/u.test(value)) throw errors.badRequest();
  const parsed = Number(value);
  if (parsed < 1 || parsed > OPERATIONAL_CONTINUITY_MAX_PAGE_SIZE) throw errors.badRequest();
  return parsed;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoNursingWorkQueuePrincipal(
      request,
      "nursing-workqueue-read",
    );
    const pageSize = pageSizeParameter(request.nextUrl.searchParams.get("pageSize"));
    const context = operationalCursorContext({
      userId: principal.userId,
      roles: principal.roles,
      pageSize,
    });
    const cursor = request.nextUrl.searchParams.get("cursor");
    let after = null;
    try {
      after = cursor
        ? decodeOperationalCursor({ cursor, context, sessionId: principal.sessionId })
        : null;
    } catch (error) {
      if (error instanceof OperationalCursorError) throw errors.badRequest();
      throw error;
    }
    const result = await listOperationalContinuity({ principal, pageSize, after });
    if (!result) throw errors.forbidden();
    const last = result.items.at(-1);
    const nextCursor =
      result.page.hasNextPage && last
        ? encodeOperationalCursor({
            position: operationalCursorPosition(last),
            context,
            sessionId: principal.sessionId,
          })
        : null;
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO — vista administrativa de solo lectura",
        limitation:
          "No clasifica riesgo, no recomienda decisiones y no acredita actualidad clínica.",
        ...result,
        items: result.items.map((item) => ({
          ...item,
          configuredAt: item.configuredAt?.toISOString() ?? null,
          lastEvidenceAt: item.lastEvidenceAt?.toISOString() ?? null,
          sourceUpdatedAt: item.sourceUpdatedAt?.toISOString() ?? null,
        })),
        freshness: {
          ...result.freshness,
          generatedAt: result.freshness.generatedAt.toISOString(),
        },
        page: { ...result.page, nextCursor },
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-operational-continuity-list");
  }
}
