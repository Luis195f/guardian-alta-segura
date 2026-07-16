import { NextRequest, NextResponse } from "next/server";

import {
  CreateDischargeEpisodeService,
  EpisodeDeniedError,
  EpisodeIdempotencyConflictError,
  EpisodeInvalidError,
  EpisodeNotFoundError,
  EpisodeResponsibleProfessionalsError,
} from "@/application/episode/manage-discharge-episode";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  listAssignedEpisodes,
  PrismaEpisodeUnitOfWork,
} from "@/infrastructure/persistence/prisma-episode-unit-of-work";
import { prisma } from "@/infrastructure/persistence/prisma";

export const dynamic = "force-dynamic";

function mapEpisodeError(error: unknown): never {
  if (error instanceof EpisodeDeniedError) throw errors.forbidden();
  if (error instanceof EpisodeNotFoundError) throw errors.notFound();
  if (error instanceof EpisodeIdempotencyConflictError) throw errors.conflict();
  if (error instanceof EpisodeResponsibleProfessionalsError) throw errors.badRequest();
  if (error instanceof EpisodeInvalidError) throw errors.badRequest();
  throw error;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoEpisodePrincipal(request, "read");
    const episodes = await listAssignedEpisodes(principal.userId);
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO",
        episodes: episodes.map((episode) => ({
          ...episode,
          dischargeDate: episode.dischargeDate.toISOString().slice(0, 10),
          updatedAt: episode.updatedAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-discharge-episode-list");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoEpisodePrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    const body = (await request.json()) as Record<string, unknown>;
    const nurseAlias =
      typeof body.responsibleNurseAlias === "string" ? body.responsibleNurseAlias : "";
    const clinicianAlias =
      typeof body.responsibleClinicianAlias === "string" ? body.responsibleClinicianAlias : "";
    const [nurse, clinician] = await Promise.all([
      prisma.user.findUnique({ where: { syntheticAlias: nurseAlias }, select: { id: true } }),
      prisma.user.findUnique({ where: { syntheticAlias: clinicianAlias }, select: { id: true } }),
    ]);
    if (!nurse || !clinician) throw errors.badRequest();
    let result;
    try {
      result = await new CreateDischargeEpisodeService(new PrismaEpisodeUnitOfWork()).execute({
        actor: principal,
        externalPseudonymousId:
          typeof body.externalPseudonymousId === "string" ? body.externalPseudonymousId : "",
        dischargeDate: typeof body.dischargeDate === "string" ? body.dischargeDate : "",
        programLengthDays: body.programLengthDays as number,
        responsibleNurseId: nurse.id,
        responsibleClinicianId: clinician.id,
        idempotencyKey,
        correlationId,
      });
    } catch (error) {
      mapEpisodeError(error);
    }
    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-discharge-episode-create");
  }
}
