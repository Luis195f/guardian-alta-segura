import { NextRequest, NextResponse } from "next/server";

import {
  ActiveRoleAssignmentExistsError,
  AssignRoleService,
  RoleAssignmentDeniedError,
  RoleAssignmentTargetDeniedError,
} from "@/application/admin/assign-role";
import { isRole } from "@/domain/auth/role";
import { readAuthenticatedPrincipal } from "@/infrastructure/auth/session-reader";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { SESSION_COOKIE_NAME } from "@/infrastructure/http/session-cookie";
import { PrismaSecurityUnitOfWork } from "@/infrastructure/persistence/prisma-security-unit-of-work";
import { assertLoopbackRequestHost } from "@/infrastructure/security/loopback";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const environment = readServerEnvironment();
    if (environment.demoMode) assertLoopbackRequestHost(request);
    assertSameOrigin(request, environment.appBaseUrl.origin);
    const actor = await readAuthenticatedPrincipal(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!actor) throw errors.unauthenticated();

    const input: unknown = await request.json().catch(() => null);
    if (
      !input ||
      typeof input !== "object" ||
      !("targetUserId" in input) ||
      typeof input.targetUserId !== "string" ||
      input.targetUserId.length > 128 ||
      !("role" in input) ||
      !isRole(input.role)
    ) {
      throw errors.badRequest();
    }

    const result = await new AssignRoleService(new PrismaSecurityUnitOfWork()).execute({
      actor,
      actingRole: "admin",
      targetUserId: input.targetUserId,
      role: input.role,
      correlationId,
    });
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    if (error instanceof RoleAssignmentDeniedError) {
      return errorResponse(errors.forbidden(), correlationId, "role-assignment-create");
    }
    if (error instanceof ActiveRoleAssignmentExistsError) {
      return errorResponse(errors.conflict(), correlationId, "role-assignment-create");
    }
    if (error instanceof RoleAssignmentTargetDeniedError) {
      return errorResponse(errors.forbidden(), correlationId, "role-assignment-create");
    }
    return errorResponse(error, correlationId, "role-assignment-create");
  }
}
