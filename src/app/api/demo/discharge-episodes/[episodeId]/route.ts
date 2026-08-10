import { NextRequest, NextResponse } from "next/server";

import {
  EpisodeClosureBlockedError,
  EpisodeConcurrencyConflictError,
  EpisodeDeniedError,
  EpisodeIdempotencyConflictError,
  EpisodeIdentityNotVerifiedError,
  EpisodeInvalidError,
  EpisodeNotFoundError,
  EpisodeResponsibleProfessionalsError,
  GetEpisodeGovernanceViewService,
  TransitionDischargeEpisodeService,
} from "@/application/episode/manage-discharge-episode";
import { PendingInstitutionalEpisodeGovernancePolicy } from "@/domain/episode/activation-policy";
import { TECHNICAL_COLLECTION_LIMIT_NOTICE } from "@/application/collections/bounded-collection";
import { IllegalEpisodeTransitionError, isEpisodeStatus } from "@/domain/episode/discharge-episode";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoEpisodePrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  getAssignedEpisodeDetail,
  PrismaEpisodeUnitOfWork,
} from "@/infrastructure/persistence/prisma-episode-unit-of-work";

export const dynamic = "force-dynamic";

const governancePolicy = new PendingInstitutionalEpisodeGovernancePolicy();

function mapTransitionError(error: unknown): never {
  if (error instanceof EpisodeDeniedError) throw errors.forbidden();
  if (error instanceof EpisodeNotFoundError) throw errors.notFound();
  if (
    error instanceof EpisodeConcurrencyConflictError ||
    error instanceof EpisodeIdempotencyConflictError ||
    error instanceof EpisodeIdentityNotVerifiedError ||
    error instanceof EpisodeClosureBlockedError ||
    error instanceof IllegalEpisodeTransitionError
  ) {
    throw errors.conflict();
  }
  if (
    error instanceof EpisodeInvalidError ||
    error instanceof EpisodeResponsibleProfessionalsError
  ) {
    throw errors.badRequest();
  }
  throw error;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoEpisodePrincipal(request, "read");
    const { episodeId } = await context.params;
    const [episode, governance] = await Promise.all([
      getAssignedEpisodeDetail(episodeId, principal.userId),
      new GetEpisodeGovernanceViewService(new PrismaEpisodeUnitOfWork(), governancePolicy).execute({
        actor: principal,
        episodeId,
        correlationId,
      }),
    ]);
    if (!episode) throw errors.notFound();
    if (episode.version !== governance.episodeVersion) throw errors.conflict();
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO",
        collectionLimitNotice: TECHNICAL_COLLECTION_LIMIT_NOTICE,
        episode,
        governance,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-discharge-episode-detail");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoEpisodePrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    const { episodeId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    if (!isEpisodeStatus(body.targetStatus)) throw errors.badRequest();
    let result;
    try {
      result = await new TransitionDischargeEpisodeService(
        new PrismaEpisodeUnitOfWork(),
        governancePolicy,
      ).execute({
        actor: principal,
        episodeId,
        targetStatus: body.targetStatus,
        expectedVersion: body.expectedVersion as number,
        reason: typeof body.reason === "string" ? body.reason : null,
        idempotencyKey: request.headers.get("idempotency-key") ?? "",
        correlationId,
      });
    } catch (error) {
      mapTransitionError(error);
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-discharge-episode-transition");
  }
}
