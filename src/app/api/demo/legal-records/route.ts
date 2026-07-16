import { NextRequest, NextResponse } from "next/server";

import {
  LegalRecordConflictError,
  LegalRecordDeniedError,
  LegalRecordInvalidError,
  RecordLegalDecisionService,
} from "@/application/legal/record-legal-decision";
import {
  type LegalRecord,
  isCommunicationChannel,
  isLegalRecordState,
  isLegalRecordType,
} from "@/domain/legal/legal-records";
import { evaluateLegalRecordAuthorization } from "@/domain/legal/legal-authorization";
import { readAuthenticatedPrincipal } from "@/infrastructure/auth/session-reader";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { errors } from "@/infrastructure/http/app-error";
import { getCorrelationId } from "@/infrastructure/http/correlation-id";
import { assertSameOrigin } from "@/infrastructure/http/csrf";
import { errorResponse } from "@/infrastructure/http/error-handler";
import { SESSION_COOKIE_NAME } from "@/infrastructure/http/session-cookie";
import { PrismaLegalRecordsUnitOfWork } from "@/infrastructure/persistence/prisma-legal-records-unit-of-work";
import { prisma } from "@/infrastructure/persistence/prisma";
import { assertLoopbackRequestHost } from "@/infrastructure/security/loopback";

export const dynamic = "force-dynamic";

async function requireDemoPrincipal(request: NextRequest) {
  const environment = readServerEnvironment();
  if (!environment.demoMode) throw errors.notFound();
  assertLoopbackRequestHost(request);
  const principal = await readAuthenticatedPrincipal(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!principal) throw errors.unauthenticated();
  if (!principal.roles.includes("patient") && !principal.roles.includes("clinician")) {
    throw errors.forbidden();
  }
  return { environment, principal };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { principal } = await requireDemoPrincipal(request);
    const subjectAlias = request.nextUrl.searchParams.get("subject") ?? "demo-patient";
    if (subjectAlias.length > 64) throw errors.badRequest();
    if (subjectAlias !== "demo-patient") throw errors.forbidden();
    const subject = await prisma.user.findUnique({
      where: { syntheticAlias: subjectAlias },
      select: { id: true, syntheticAlias: true, isSynthetic: true },
    });
    if (!subject?.isSynthetic) throw errors.notFound();
    if (principal.roles.includes("patient") && principal.userId !== subject.id) {
      throw errors.forbidden();
    }

    const [policies, participation, digital, communications, caregivers, processing, revocations] =
      await Promise.all([
        prisma.policyVersion.findMany({ orderBy: { recordedAt: "desc" } }),
        prisma.participationRecord.findMany({ where: { subjectUserId: subject.id } }),
        prisma.digitalParticipationRecord.findMany({ where: { subjectUserId: subject.id } }),
        prisma.communicationPermission.findMany({ where: { subjectUserId: subject.id } }),
        prisma.caregiverAuthorization.findMany({
          where: { subjectUserId: subject.id },
          include: { caregiver: { select: { syntheticAlias: true } } },
        }),
        prisma.processingBasisRecord.findMany({ where: { subjectUserId: subject.id } }),
        prisma.revocationEvent.findMany({ where: { subjectUserId: subject.id } }),
      ]);

    const policyById = new Map(policies.map((policy) => [policy.id, policy]));
    const serialize = (
      record: LegalRecord,
      options: {
        readonly detail?: string;
        readonly basisConfigured?: true;
        readonly label?: string;
      } = {},
    ) => {
      const policy = policyById.get(record.policyVersionId);
      const now = new Date();
      const effectiveAuthorization = evaluateLegalRecordAuthorization(record, {
        policies,
        revocations,
        now,
      });
      return {
        id: record.id,
        recordType: record.recordType,
        state: record.state,
        scope: record.scope,
        policyVersion: policy?.version ?? "unknown",
        policyState: policy?.state ?? "unknown",
        recordedAt: record.recordedAt,
        expiresAt: record.expiresAt,
        origin: record.origin,
        evidenceType: record.evidenceType,
        evidencePresent: record.evidenceRef.length > 0,
        effectiveAuthorization,
        detail: options.detail ?? null,
        basisConfigured: options.basisConfigured,
        label: options.label,
        revoked: effectiveAuthorization.reason === "revoked",
      };
    };

    const records = [
      ...participation.map((record) => serialize({ ...record, recordType: "PARTICIPATION" })),
      ...digital.map((record) => serialize({ ...record, recordType: "DIGITAL_PARTICIPATION" })),
      ...communications.map((record) =>
        serialize(
          { ...record, recordType: "COMMUNICATION_PERMISSION" },
          { detail: `${record.channel} / ${record.purpose}` },
        ),
      ),
      ...caregivers.map((record) =>
        serialize(
          { ...record, recordType: "CAREGIVER_AUTHORIZATION" },
          { detail: record.caregiver.syntheticAlias },
        ),
      ),
      ...processing.map((record) =>
        serialize(
          { ...record, recordType: "PROCESSING_BASIS" },
          { basisConfigured: true, label: "Base institucional registrada" },
        ),
      ),
    ].sort((left, right) => right.recordedAt.getTime() - left.recordedAt.getTime());

    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO",
        subjectAlias: subject.syntheticAlias,
        policies: policies.map(({ id, policyKey, version, recordType, state, scope }) => ({
          id,
          policyKey,
          version,
          recordType,
          state,
          scope,
        })),
        records,
      },
      { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } },
    );
  } catch (error) {
    return errorResponse(error, correlationId, "demo-legal-records-read");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  try {
    const { environment, principal } = await requireDemoPrincipal(request);
    assertSameOrigin(request, environment.appBaseUrl.origin);
    const input: unknown = await request.json().catch(() => null);
    if (!input || typeof input !== "object" || !("action" in input)) throw errors.badRequest();
    const service = new RecordLegalDecisionService(new PrismaLegalRecordsUnitOfWork());

    let result: { recordId: string } | { revocationId: string };
    if (input.action === "revoke") {
      if (
        !("targetType" in input) ||
        !isLegalRecordType(input.targetType) ||
        !("targetRecordId" in input) ||
        typeof input.targetRecordId !== "string" ||
        input.targetRecordId.length > 128
      ) {
        throw errors.badRequest();
      }
      result = await service.revoke({
        actor: principal,
        targetType: input.targetType,
        targetRecordId: input.targetRecordId,
        correlationId,
      });
    } else if (input.action === "record") {
      if (
        !("subjectAlias" in input) ||
        typeof input.subjectAlias !== "string" ||
        input.subjectAlias.length > 64 ||
        !("recordType" in input) ||
        !isLegalRecordType(input.recordType) ||
        !("state" in input) ||
        !isLegalRecordState(input.state) ||
        !("policyVersionId" in input) ||
        typeof input.policyVersionId !== "string" ||
        input.policyVersionId.length > 128
      ) {
        throw errors.badRequest();
      }
      const channel =
        "channel" in input && isCommunicationChannel(input.channel) ? input.channel : undefined;
      result = await service.record({
        actor: principal,
        subjectAlias: input.subjectAlias,
        recordType: input.recordType,
        state: input.state,
        policyVersionId: input.policyVersionId,
        correlationId,
        ...(channel ? { channel } : {}),
        ...("purpose" in input && typeof input.purpose === "string"
          ? { purpose: input.purpose }
          : {}),
        ...("caregiverAlias" in input && typeof input.caregiverAlias === "string"
          ? { caregiverAlias: input.caregiverAlias }
          : {}),
        ...("scope" in input && typeof input.scope === "string" ? { scope: input.scope } : {}),
        ...("basisCode" in input && typeof input.basisCode === "string"
          ? { basisCode: input.basisCode }
          : {}),
      });
    } else {
      throw errors.badRequest();
    }
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    if (error instanceof LegalRecordDeniedError) {
      return errorResponse(errors.forbidden(), correlationId, "demo-legal-records-write");
    }
    if (error instanceof LegalRecordInvalidError) {
      return errorResponse(errors.badRequest(), correlationId, "demo-legal-records-write");
    }
    if (error instanceof LegalRecordConflictError) {
      return errorResponse(errors.conflict(), correlationId, "demo-legal-records-write");
    }
    return errorResponse(error, correlationId, "demo-legal-records-write");
  }
}
