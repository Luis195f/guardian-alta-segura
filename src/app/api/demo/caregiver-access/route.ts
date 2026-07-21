import { NextRequest, NextResponse } from "next/server";
import type { CaregiverCapability } from "@prisma/client";

import {
  CaregiverAccessConflictError,
  CaregiverAccessDeniedError,
  CaregiverAccessNotFoundError,
  ChangeCaregiverScopeService,
  CreateCaregiverInvitationService,
} from "@/application/caregiver/manage-caregiver-access";
import {
  LegalRecordConflictError,
  LegalRecordDeniedError,
  LegalRecordInvalidError,
  RecordLegalDecisionService,
} from "@/application/legal/record-legal-decision";
import {
  CAREGIVER_CAPABILITIES,
  InvalidCaregiverAccessError,
  type CaregiverScopeDraft,
} from "@/domain/caregiver/caregiver-access";
import { isSafetyPlanStep } from "@/domain/safety-plan/safety-plan";
import { secureSessionTokenIssuer } from "@/infrastructure/crypto/session-token";
import { readServerEnvironment } from "@/infrastructure/config/env";
import {
  localCaregiverInvitationAdapter,
  randomCaregiverPseudonymIssuer,
} from "@/infrastructure/caregiver/local-caregiver-invitation-adapter";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { requireDemoCaregiverAccessPrincipal } from "@/infrastructure/http/demo-episode-request";
import { errorResponse } from "@/infrastructure/http/error-handler";
import {
  listPatientCaregiverAccess,
  PrismaCaregiverAccessUnitOfWork,
} from "@/infrastructure/persistence/prisma-caregiver-access-unit-of-work";
import { PrismaLegalRecordsUnitOfWork } from "@/infrastructure/persistence/prisma-legal-records-unit-of-work";

export const dynamic = "force-dynamic";

function mapError(error: unknown): never {
  if (error instanceof CaregiverAccessDeniedError) throw errors.forbidden();
  if (error instanceof CaregiverAccessNotFoundError) throw errors.notFound();
  if (error instanceof CaregiverAccessConflictError) throw errors.conflict();
  if (error instanceof InvalidCaregiverAccessError) throw errors.badRequest();
  throw error;
}

function parseScope(value: unknown): CaregiverScopeDraft {
  if (!value || typeof value !== "object") throw errors.badRequest();
  const scope = value as Record<string, unknown>;
  if (
    !Array.isArray(scope.capabilities) ||
    !Array.isArray(scope.allowedPlanSections) ||
    !Array.isArray(scope.authorizedResourceKeys) ||
    !scope.capabilities.every(
      (item): item is CaregiverCapability =>
        typeof item === "string" && CAREGIVER_CAPABILITIES.includes(item as CaregiverCapability),
    ) ||
    !scope.allowedPlanSections.every(isSafetyPlanStep) ||
    !scope.authorizedResourceKeys.every((item) => typeof item === "string")
  ) {
    throw errors.badRequest();
  }
  return {
    capabilities: scope.capabilities,
    allowedPlanSections: scope.allowedPlanSections,
    authorizedResourceKeys: scope.authorizedResourceKeys,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoCaregiverAccessPrincipal(
      request,
      "caregiver-access-manage",
    );
    const result = await listPatientCaregiverAccess(principal);
    if (!result) throw errors.notFound();
    return NextResponse.json(
      {
        notice:
          "SINTÉTICO / NO USO CLÍNICO — autorizar no presume capacidad ni representación legal",
        ...result,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-caregiver-access-read");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal, applicationOrigin } = await requireDemoCaregiverAccessPrincipal(
      request,
      "caregiver-access-manage",
    );
    assertSameOrigin(request, applicationOrigin);
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "invite") {
      if (typeof body.caregiverAuthorizationId !== "string" || typeof body.episodeId !== "string") {
        throw errors.badRequest();
      }
      try {
        const environment = readServerEnvironment();
        const result = await new CreateCaregiverInvitationService(
          new PrismaCaregiverAccessUnitOfWork(),
          secureSessionTokenIssuer,
          randomCaregiverPseudonymIssuer,
          localCaregiverInvitationAdapter,
          {
            invitationTtlMs: environment.caregiverDemoInvitationTtlMinutes * 60 * 1000,
            sessionTtlMs: environment.caregiverDemoSessionTtlHours * 60 * 60 * 1000,
          },
        ).execute({
          actor: principal,
          caregiverAuthorizationId: body.caregiverAuthorizationId,
          episodeId: body.episodeId,
          scope: parseScope(body.scope),
          correlationId,
        });
        return NextResponse.json(result, {
          status: 201,
          headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
        });
      } catch (error) {
        mapError(error);
      }
    }
    if (body.action === "change-scope") {
      if (
        typeof body.caregiverAuthorizationId !== "string" ||
        typeof body.episodeId !== "string" ||
        typeof body.expectedVersion !== "number"
      ) {
        throw errors.badRequest();
      }
      try {
        const result = await new ChangeCaregiverScopeService(
          new PrismaCaregiverAccessUnitOfWork(),
        ).execute({
          actor: principal,
          caregiverAuthorizationId: body.caregiverAuthorizationId,
          episodeId: body.episodeId,
          expectedVersion: body.expectedVersion,
          scope: parseScope(body.scope),
          correlationId,
        });
        return NextResponse.json(result, {
          headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
        });
      } catch (error) {
        mapError(error);
      }
    }
    if (body.action === "revoke") {
      if (typeof body.caregiverAuthorizationId !== "string") throw errors.badRequest();
      let result;
      try {
        result = await new RecordLegalDecisionService(new PrismaLegalRecordsUnitOfWork()).revoke({
          actor: principal,
          targetType: "CAREGIVER_AUTHORIZATION",
          targetRecordId: body.caregiverAuthorizationId,
          correlationId,
        });
      } catch (error) {
        if (error instanceof LegalRecordDeniedError) throw errors.forbidden();
        if (error instanceof LegalRecordInvalidError) throw errors.badRequest();
        if (error instanceof LegalRecordConflictError) throw errors.conflict();
        throw error;
      }
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
      });
    }
    throw errors.badRequest();
  } catch (error) {
    return errorResponse(error, correlationId, "demo-caregiver-access-write");
  }
}
