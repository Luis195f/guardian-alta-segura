import { NextRequest, NextResponse } from "next/server";

import {
  CreateHomeSafetyVersionService,
  HomeSafetyConflictError,
  HomeSafetyDeniedError,
  HomeSafetyNotFoundError,
} from "@/application/home-safety/manage-home-safety";
import {
  HOME_SAFETY_DISCLAIMER,
  HomeSafetyValidationError,
} from "@/domain/home-safety/home-safety";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoBuildWeekPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  listHomeSafetyVersions,
  PrismaHomeSafetyUnitOfWork,
} from "@/infrastructure/persistence/prisma-home-safety-unit-of-work";
import { TECHNICAL_COLLECTION_LIMIT_NOTICE } from "@/application/collections/bounded-collection";

export const dynamic = "force-dynamic";

function mapError(error: unknown): never {
  if (error instanceof HomeSafetyDeniedError) throw errors.forbidden();
  if (error instanceof HomeSafetyNotFoundError) throw errors.notFound();
  if (error instanceof HomeSafetyConflictError) throw errors.conflict();
  if (error instanceof HomeSafetyValidationError) throw errors.badRequest();
  throw error;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
) {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoBuildWeekPrincipal(request, "home-safety-read");
    const { episodeId } = await context.params;
    const versions = await listHomeSafetyVersions(principal, episodeId);
    if (!versions) throw errors.forbidden();
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO",
        disclaimer: HOME_SAFETY_DISCLAIMER,
        collectionLimitNotice: TECHNICAL_COLLECTION_LIMIT_NOTICE,
        collectionCoverage: { versions: versions.coverage },
        versions: versions.values,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-home-safety-list");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
) {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoBuildWeekPrincipal(
      request,
      "home-safety-write",
    );
    assertSameOrigin(request, applicationOrigin);
    const [{ episodeId }, body] = await Promise.all([
      context.params,
      request.json() as Promise<Record<string, unknown>>,
    ]);
    let result;
    try {
      result = await new CreateHomeSafetyVersionService(new PrismaHomeSafetyUnitOfWork()).execute({
        actor: principal,
        episodeId,
        expectedPreviousVersion: body.expectedPreviousVersion,
        informationalPurposeAcknowledged: body.informationalPurposeAcknowledged,
        humanReviewed: body.humanReviewed,
        items: body.items,
        correlationId,
      });
    } catch (error) {
      mapError(error);
    }
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-home-safety-create");
  }
}
