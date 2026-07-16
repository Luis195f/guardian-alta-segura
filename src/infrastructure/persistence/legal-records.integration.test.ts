import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  LegalRecordConflictError,
  LegalRecordDeniedError,
  RecordLegalDecisionService,
} from "@/application/legal/record-legal-decision";
import { evaluateLegalRecordAuthorization } from "@/domain/legal/legal-authorization";
import type { LegalRecordType } from "@/domain/legal/legal-records";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaLegalRecordsUnitOfWork } from "@/infrastructure/persistence/prisma-legal-records-unit-of-work";

async function demoContext() {
  const [
    patient,
    clinician,
    caregiver,
    caregiverPolicy,
    pilotPolicy,
    digitalPolicy,
    communicationPolicy,
    processingPolicy,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-patient" } }),
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-clinician" } }),
    prisma.user.findUniqueOrThrow({ where: { syntheticAlias: "demo-caregiver" } }),
    prisma.policyVersion.findUniqueOrThrow({
      where: {
        policyKey_version: {
          policyKey: "caregiver-appointments",
          version: "pending-local-v1",
        },
      },
    }),
    prisma.policyVersion.findUniqueOrThrow({
      where: {
        policyKey_version: {
          policyKey: "pilot-participation",
          version: "pending-local-v1",
        },
      },
    }),
    prisma.policyVersion.findUniqueOrThrow({
      where: {
        policyKey_version: {
          policyKey: "digital-participation",
          version: "pending-local-v1",
        },
      },
    }),
    prisma.policyVersion.findUniqueOrThrow({
      where: {
        policyKey_version: {
          policyKey: "communication-permission-email-check-in",
          version: "pending-local-v1",
        },
      },
    }),
    prisma.policyVersion.findUniqueOrThrow({
      where: {
        policyKey_version: {
          policyKey: "processing-basis-care-treatment",
          version: "pending-local-v1",
        },
      },
    }),
  ]);
  return {
    patient,
    clinician,
    caregiver,
    caregiverPolicy,
    pilotPolicy,
    digitalPolicy,
    communicationPolicy,
    processingPolicy,
    actor: { userId: patient.id, roles: ["patient" as const], sessionId: randomUUID() },
    clinicianActor: {
      userId: clinician.id,
      roles: ["clinician" as const],
      sessionId: randomUUID(),
    },
  };
}

async function createCaregiverAuthorization() {
  const context = await demoContext();
  const service = new RecordLegalDecisionService(new PrismaLegalRecordsUnitOfWork());
  const created = await service.record({
    actor: context.actor,
    subjectAlias: "demo-patient",
    recordType: "CAREGIVER_AUTHORIZATION",
    state: "ACTIVE",
    policyVersionId: context.caregiverPolicy.id,
    caregiverAlias: "demo-caregiver",
    scope: "caregiver:appointments",
    correlationId: randomUUID(),
  });
  return { ...context, ...created, service };
}

describe.sequential("PostgreSQL legal history guarantees", () => {
  it.each([
    ["patient", "PARTICIPATION", true],
    ["patient", "DIGITAL_PARTICIPATION", true],
    ["patient", "COMMUNICATION_PERMISSION", true],
    ["patient", "CAREGIVER_AUTHORIZATION", true],
    ["patient", "PROCESSING_BASIS", false],
    ["clinician", "PARTICIPATION", false],
    ["clinician", "DIGITAL_PARTICIPATION", false],
    ["clinician", "COMMUNICATION_PERMISSION", false],
    ["clinician", "CAREGIVER_AUTHORIZATION", false],
    ["clinician", "PROCESSING_BASIS", true],
  ] as const)(
    "aplica en PostgreSQL la matriz de creación %s / %s => %s",
    async (role, recordType, allowed) => {
      const context = await demoContext();
      const policyByType = {
        PARTICIPATION: context.pilotPolicy,
        DIGITAL_PARTICIPATION: context.digitalPolicy,
        COMMUNICATION_PERMISSION: context.communicationPolicy,
        CAREGIVER_AUTHORIZATION: context.caregiverPolicy,
        PROCESSING_BASIS: context.processingPolicy,
      } satisfies Record<LegalRecordType, { readonly id: string }>;
      const request = new RecordLegalDecisionService(new PrismaLegalRecordsUnitOfWork()).record({
        actor: role === "patient" ? context.actor : context.clinicianActor,
        subjectAlias: "demo-patient",
        recordType,
        state: "PENDING",
        policyVersionId: policyByType[recordType].id,
        correlationId: randomUUID(),
        ...(recordType === "COMMUNICATION_PERMISSION"
          ? { channel: "EMAIL" as const, purpose: "check-in" }
          : {}),
        ...(recordType === "CAREGIVER_AUTHORIZATION"
          ? { caregiverAlias: "demo-caregiver", scope: "caregiver:appointments" }
          : {}),
        ...(recordType === "PROCESSING_BASIS"
          ? { scope: "care-treatment", basisCode: "SYNTHETIC_INSTITUTIONAL_DECISION" }
          : {}),
      });

      if (allowed) {
        const created = await request;
        await expect(
          prisma.auditEvent.findFirst({
            where: { action: "LEGAL_RECORD_CREATED", resourceId: created.recordId },
          }),
        ).resolves.not.toBeNull();
      } else {
        await expect(request).rejects.toBeInstanceOf(LegalRecordDeniedError);
      }
    },
  );

  it("confirma registro, revocación y AuditEvent juntos sin contenido jurídico", async () => {
    const { patient, caregiver, recordId, service, actor } = await createCaregiverAuthorization();
    const revoked = await service.revoke({
      actor,
      targetType: "CAREGIVER_AUTHORIZATION",
      targetRecordId: recordId,
      correlationId: randomUUID(),
    });

    await expect(
      prisma.caregiverAuthorization.findUnique({ where: { id: recordId } }),
    ).resolves.toMatchObject({ caregiverUserId: caregiver.id, subjectUserId: patient.id });
    await expect(
      prisma.auditEvent.findFirst({
        where: { action: "LEGAL_RECORD_CREATED", resourceId: recordId },
      }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.revocationEvent.findUnique({ where: { id: revoked.revocationId } }),
    ).resolves.toMatchObject({ targetRecordId: recordId });
    const audit = await prisma.auditEvent.findFirstOrThrow({
      where: { action: "LEGAL_RECORD_REVOKED", resourceId: revoked.revocationId },
    });
    expect(JSON.stringify(audit)).not.toContain("DEMO-SYNTHETIC-REVOCATION");
    expect(JSON.stringify(audit)).not.toContain("caregiver:appointments");
  });

  it("revierte el registro jurídico si falla appendAuditEvent", async () => {
    const { patient, pilotPolicy, actor } = await demoContext();
    const recordsBefore = await prisma.participationRecord.count({
      where: { subjectUserId: patient.id },
    });
    const auditsBefore = await prisma.auditEvent.count({
      where: { action: "LEGAL_RECORD_CREATED" },
    });

    await expect(
      new RecordLegalDecisionService(new PrismaLegalRecordsUnitOfWork()).record({
        actor,
        subjectAlias: "demo-patient",
        recordType: "PARTICIPATION",
        state: "ACTIVE",
        policyVersionId: pilotPolicy.id,
        correlationId: "invalid-uuid",
      }),
    ).rejects.toThrow();

    await expect(
      prisma.participationRecord.count({ where: { subjectUserId: patient.id } }),
    ).resolves.toBe(recordsBefore);
    await expect(
      prisma.auditEvent.count({ where: { action: "LEGAL_RECORD_CREATED" } }),
    ).resolves.toBe(auditsBefore);
  });

  it("revierte la revocación si falla appendAuditEvent y conserva el registro original", async () => {
    const { recordId, service, actor } = await createCaregiverAuthorization();
    const auditsBefore = await prisma.auditEvent.count({
      where: { action: "LEGAL_RECORD_REVOKED" },
    });

    await expect(
      service.revoke({
        actor,
        targetType: "CAREGIVER_AUTHORIZATION",
        targetRecordId: recordId,
        correlationId: "invalid-uuid",
      }),
    ).rejects.toThrow();

    await expect(
      prisma.caregiverAuthorization.findUnique({ where: { id: recordId } }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.revocationEvent.count({
        where: { targetType: "CAREGIVER_AUTHORIZATION", targetRecordId: recordId },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.auditEvent.count({ where: { action: "LEGAL_RECORD_REVOKED" } }),
    ).resolves.toBe(auditsBefore);
  });

  it("confirma una sola revocación y un solo AuditEvent ante dos intentos concurrentes", async () => {
    const { recordId, actor } = await createCaregiverAuthorization();
    const attempts = await Promise.allSettled(
      [randomUUID(), randomUUID()].map((correlationId) =>
        new RecordLegalDecisionService(new PrismaLegalRecordsUnitOfWork()).revoke({
          actor,
          targetType: "CAREGIVER_AUTHORIZATION",
          targetRecordId: recordId,
          correlationId,
        }),
      ),
    );
    const fulfilled = attempts.filter(
      (attempt): attempt is PromiseFulfilledResult<{ readonly revocationId: string }> =>
        attempt.status === "fulfilled",
    );
    const rejected = attempts.filter(
      (attempt): attempt is PromiseRejectedResult => attempt.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(LegalRecordConflictError);
    const revocations = await prisma.revocationEvent.findMany({
      where: { targetType: "CAREGIVER_AUTHORIZATION", targetRecordId: recordId },
    });
    expect(revocations).toHaveLength(1);
    const revocation = revocations[0];
    if (!revocation) throw new Error("Expected one synthetic revocation");
    await expect(
      prisma.auditEvent.count({
        where: { action: "LEGAL_RECORD_REVOKED", resourceId: revocation.id },
      }),
    ).resolves.toBe(1);
  });

  it("deniega fixtures PostgreSQL con policy recordType o scope incompatibles", async () => {
    const { patient } = await demoContext();
    const configurations = [
      {
        label: "wrong-type",
        recordType: "PARTICIPATION" as const,
        scope: "check-ins",
        state: "APPROVED" as const,
        expected: "policy-record-type-mismatch",
      },
      {
        label: "wrong-scope",
        recordType: "DIGITAL_PARTICIPATION" as const,
        scope: "pilot",
        state: "APPROVED" as const,
        expected: "policy-scope-mismatch",
      },
      {
        label: "pending",
        recordType: "DIGITAL_PARTICIPATION" as const,
        scope: "check-ins",
        state: "PENDING" as const,
        expected: "pending-local-validation",
      },
      {
        label: "approved",
        recordType: "DIGITAL_PARTICIPATION" as const,
        scope: "check-ins",
        state: "APPROVED" as const,
        expected: "allowed",
      },
    ];

    for (const configuration of configurations) {
      const policy = await prisma.policyVersion.create({
        data: {
          policyKey: `integration-${configuration.label}-${randomUUID()}`,
          version: "synthetic-v1",
          recordType: configuration.recordType,
          state: configuration.state,
          scope: configuration.scope,
          actorUserId: patient.id,
          origin: "INSTITUTIONAL_CONFIGURATION",
          evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
          evidenceRef: "SYNTHETIC-POLICY-CONSISTENCY",
        },
      });
      const persisted = await prisma.digitalParticipationRecord.create({
        data: {
          subjectUserId: patient.id,
          state: "ACTIVE",
          scope: "check-ins",
          policyVersionId: policy.id,
          actorUserId: patient.id,
          origin: "DEMO_UI",
          evidenceType: "RECORDED_INTERACTION",
          evidenceRef: "SYNTHETIC-POLICY-CONSISTENCY",
        },
      });
      const decision = evaluateLegalRecordAuthorization(
        { ...persisted, recordType: "DIGITAL_PARTICIPATION" },
        { policies: [policy], revocations: [], now: new Date() },
      );
      expect(decision.reason, configuration.label).toBe(configuration.expected);
      expect(decision.allowed, configuration.label).toBe(configuration.label === "approved");
    }
  });

  it("conserva versiones anteriores y bloquea UPDATE/DELETE del historial jurídico", async () => {
    const { patient } = await demoContext();
    const policyKey = `versioned-policy-${randomUUID()}`;
    const first = await prisma.policyVersion.create({
      data: {
        policyKey,
        version: "synthetic-v1",
        recordType: "PARTICIPATION",
        state: "PENDING",
        scope: "pilot",
        actorUserId: patient.id,
        origin: "INSTITUTIONAL_CONFIGURATION",
        evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
        evidenceRef: "SYNTHETIC-V1",
      },
    });
    const second = await prisma.policyVersion.create({
      data: {
        policyKey,
        version: "synthetic-v2",
        recordType: "PARTICIPATION",
        state: "APPROVED",
        scope: "pilot",
        actorUserId: patient.id,
        origin: "INSTITUTIONAL_CONFIGURATION",
        evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
        evidenceRef: "SYNTHETIC-V2",
      },
    });

    await expect(
      prisma.policyVersion.findMany({ where: { policyKey }, orderBy: { version: "asc" } }),
    ).resolves.toMatchObject([{ id: first.id }, { id: second.id }]);
    await expect(
      prisma.policyVersion.update({ where: { id: first.id }, data: { state: "SUPERSEDED" } }),
    ).rejects.toThrow();
    await expect(prisma.policyVersion.delete({ where: { id: first.id } })).rejects.toThrow();
  });
});
