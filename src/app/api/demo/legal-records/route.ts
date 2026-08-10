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
import {
  boundCollection,
  EXPOSED_COLLECTION_QUERY_TAKE,
  TECHNICAL_COLLECTION_LIMIT_NOTICE,
} from "@/application/collections/bounded-collection";

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

    const [policyRows, participation, digital, communications, caregivers, processing] =
      await Promise.all([
        prisma.policyVersion.findMany({
          orderBy: [{ state: "asc" }, { recordedAt: "desc" }, { id: "desc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        }),
        prisma.participationRecord.findMany({
          where: { subjectUserId: subject.id },
          orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        }),
        prisma.digitalParticipationRecord.findMany({
          where: { subjectUserId: subject.id },
          orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        }),
        prisma.communicationPermission.findMany({
          where: { subjectUserId: subject.id },
          orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        }),
        prisma.caregiverAuthorization.findMany({
          where: { subjectUserId: subject.id },
          include: { caregiver: { select: { syntheticAlias: true } } },
          orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        }),
        prisma.processingBasisRecord.findMany({
          where: { subjectUserId: subject.id },
          orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
          take: EXPOSED_COLLECTION_QUERY_TAKE,
        }),
      ]);
    const policyCatalog = boundCollection(policyRows);
    const recordCandidates: {
      readonly record: LegalRecord;
      readonly options?: {
        readonly detail?: string;
        readonly basisConfigured?: true;
        readonly label?: string;
      };
    }[] = [
      ...participation.map((record) => ({
        record: { ...record, recordType: "PARTICIPATION" as const },
      })),
      ...digital.map((record) => ({
        record: { ...record, recordType: "DIGITAL_PARTICIPATION" as const },
      })),
      ...communications.map((record) => ({
        record: { ...record, recordType: "COMMUNICATION_PERMISSION" as const },
        options: { detail: `${record.channel} / ${record.purpose}` },
      })),
      ...caregivers.map((record) => ({
        record: { ...record, recordType: "CAREGIVER_AUTHORIZATION" as const },
        options: { detail: record.caregiver.syntheticAlias },
      })),
      ...processing.map((record) => ({
        record: { ...record, recordType: "PROCESSING_BASIS" as const },
        options: { basisConfigured: true as const, label: "Base institucional registrada" },
      })),
    ].sort(
      (left, right) =>
        right.record.recordedAt.getTime() - left.record.recordedAt.getTime() ||
        right.record.id.localeCompare(left.record.id),
    );
    const boundedRecords = boundCollection(recordCandidates);
    const revocationTargets = boundedRecords.values.map(({ record }) => ({
      targetType: record.recordType,
      targetRecordId: record.id,
    }));
    const recordPolicyIds = [
      ...new Set(boundedRecords.values.map(({ record }) => record.policyVersionId)),
    ];
    const [recordPolicies, revocations] = await Promise.all([
      recordPolicyIds.length === 0
        ? Promise.resolve([])
        : prisma.policyVersion.findMany({
            where: { id: { in: recordPolicyIds } },
            take: EXPOSED_COLLECTION_QUERY_TAKE,
          }),
      revocationTargets.length === 0
        ? Promise.resolve([])
        : prisma.revocationEvent.findMany({
            where: { OR: revocationTargets },
            orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
            take: EXPOSED_COLLECTION_QUERY_TAKE,
          }),
    ]);
    const policies = [...new Map(recordPolicies.map((policy) => [policy.id, policy])).values()];
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

    const records = boundedRecords.values.map(({ record, options }) => serialize(record, options));

    return NextResponse.json(
      {
        notice: "SINTÉTICO / NO USO CLÍNICO",
        collectionLimitNotice: TECHNICAL_COLLECTION_LIMIT_NOTICE,
        collectionCoverage: {
          policies: policyCatalog.coverage,
          records: boundedRecords.coverage,
        },
        subjectAlias: subject.syntheticAlias,
        policies: policyCatalog.values.map(
          ({ id, policyKey, version, recordType, state, scope }) => ({
            id,
            policyKey,
            version,
            recordType,
            state,
            scope,
          }),
        ),
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
