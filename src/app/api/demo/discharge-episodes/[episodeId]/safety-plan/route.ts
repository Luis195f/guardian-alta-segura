import { NextRequest, NextResponse } from "next/server";

import {
  ChangeSafetyPlanVersionStateService,
  CreateSafetyPlanVersionService,
  SafetyPlanConcurrencyConflictError,
  SafetyPlanDeniedError,
  SafetyPlanInvalidStateError,
  SafetyPlanNotFoundError,
} from "@/application/safety-plan/manage-safety-plan";
import {
  InvalidSafetyPlanError,
  isSafetyPlanProvenance,
  isSafetyPlanStep,
  type SafetyPlanSectionDraft,
} from "@/domain/safety-plan/safety-plan";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoSafetyPlanPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  getSafetyPlanView,
  PrismaSafetyPlanUnitOfWork,
} from "@/infrastructure/persistence/prisma-safety-plan-unit-of-work";

export const dynamic = "force-dynamic";

function mapError(error: unknown): never {
  if (error instanceof SafetyPlanDeniedError) throw errors.forbidden();
  if (error instanceof SafetyPlanNotFoundError) throw errors.notFound();
  if (
    error instanceof SafetyPlanConcurrencyConflictError ||
    error instanceof SafetyPlanInvalidStateError
  ) {
    throw errors.conflict();
  }
  if (error instanceof InvalidSafetyPlanError) throw errors.badRequest();
  throw error;
}

function parseSections(value: unknown): readonly SafetyPlanSectionDraft[] {
  if (!Array.isArray(value)) throw errors.badRequest();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw errors.badRequest();
    const section = item as Record<string, unknown>;
    if (
      !isSafetyPlanStep(section.step) ||
      typeof section.content !== "string" ||
      !isSafetyPlanProvenance(section.provenance) ||
      typeof section.patientCanView !== "boolean" ||
      typeof section.caregiverCanView !== "boolean"
    ) {
      throw errors.badRequest();
    }
    return {
      step: section.step,
      content: section.content,
      provenance: section.provenance,
      patientCanView: section.patientCanView,
      caregiverCanView: section.caregiverCanView,
    };
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoSafetyPlanPrincipal(request, "read");
    const { episodeId } = await context.params;
    const result = await getSafetyPlanView(episodeId, principal);
    if (!result) throw errors.notFound();
    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO — no sustituye atención profesional",
        ...result,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-safety-plan-read");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoSafetyPlanPrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    const { episodeId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    let result;
    try {
      result = await new CreateSafetyPlanVersionService(new PrismaSafetyPlanUnitOfWork()).execute({
        actor: principal,
        episodeId,
        expectedPlanRevision: body.expectedPlanRevision as number,
        sections: parseSections(body.sections),
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
    return errorResponse(error, correlationId, "demo-safety-plan-create-version");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> },
): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoSafetyPlanPrincipal(request, "write");
    assertSameOrigin(request, applicationOrigin);
    const { episodeId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action !== "activate" && body.action !== "invalidate") throw errors.badRequest();
    let result;
    try {
      result = await new ChangeSafetyPlanVersionStateService(
        new PrismaSafetyPlanUnitOfWork(),
      ).execute({
        actor: principal,
        episodeId,
        versionNumber: body.versionNumber as number,
        action: body.action,
        reason: typeof body.reason === "string" ? body.reason : null,
        expectedPlanRevision: body.expectedPlanRevision as number,
        correlationId,
      });
    } catch (error) {
      mapError(error);
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    return errorResponse(error, correlationId, "demo-safety-plan-state-change");
  }
}
