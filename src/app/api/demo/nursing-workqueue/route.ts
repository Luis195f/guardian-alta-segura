import { NextRequest, NextResponse } from "next/server";

import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { requireDemoNursingWorkQueuePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errors } from "@/infrastructure/http/app-error";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  listNursingWorkQueue,
  type NursingWorkQueueFilters,
} from "@/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work";

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"] as const;
const TASK_STATES = ["open", "resolved"] as const;

function dateParameter(value: string | null, endOfDay = false): Date | undefined {
  if (value === null) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw errors.badRequest();
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(parsed.getTime())) throw errors.badRequest();
  return parsed;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoNursingWorkQueuePrincipal(
      request,
      "nursing-workqueue-read",
    );
    const status = request.nextUrl.searchParams.get("status");
    if (status && !STATUSES.some((candidate) => candidate === status)) throw errors.badRequest();
    const taskState = request.nextUrl.searchParams.get("taskState");
    if (taskState && !TASK_STATES.some((candidate) => candidate === taskState)) {
      throw errors.badRequest();
    }
    const pending = request.nextUrl.searchParams.get("pendingOnly");
    if (pending !== null && pending !== "true" && pending !== "false") throw errors.badRequest();
    const dateFrom = dateParameter(request.nextUrl.searchParams.get("dateFrom"));
    const dateTo = dateParameter(request.nextUrl.searchParams.get("dateTo"), true);
    const responsibleProfessionalId = request.nextUrl.searchParams.get("responsibleProfessionalId");
    const filters: NursingWorkQueueFilters = {
      ...(status ? { status: status as NonNullable<NursingWorkQueueFilters["status"]> } : {}),
      ...(taskState
        ? {
            taskState: taskState.toUpperCase() as NonNullable<NursingWorkQueueFilters["taskState"]>,
          }
        : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(responsibleProfessionalId ? { responsibleProfessionalId } : {}),
      pendingOnly: pending === "true",
    };
    const queue = await listNursingWorkQueue(principal, filters);
    if (!queue) throw errors.forbidden();
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO — revisión y tareas exclusivamente humanas",
        ...queue,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-nursing-workqueue-list");
  }
}
