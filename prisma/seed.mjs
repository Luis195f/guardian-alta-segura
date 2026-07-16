import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CanonicalPolicyMismatchError extends Error {
  constructor(policyKey, version) {
    super("Canonical policy configuration does not match persisted append-only history");
    this.name = "CanonicalPolicyMismatchError";
    this.policyKey = policyKey;
    this.version = version;
  }
}

const syntheticUsers = [
  { alias: "demo-admin", role: "admin" },
  { alias: "demo-nurse", role: "nurse" },
  { alias: "demo-clinician", role: "clinician" },
  { alias: "demo-patient", role: "patient" },
  { alias: "demo-caregiver", role: "caregiver" },
  { alias: "demo-support", role: "support" },
];

const pendingPolicyVersions = [
  { policyKey: "pilot-participation", recordType: "PARTICIPATION", scope: "pilot" },
  { policyKey: "digital-participation", recordType: "DIGITAL_PARTICIPATION", scope: "check-ins" },
  {
    policyKey: "communication-permission-email-check-in",
    recordType: "COMMUNICATION_PERMISSION",
    scope: "communication:email:check-in",
  },
  {
    policyKey: "communication-permission-sms-check-in",
    recordType: "COMMUNICATION_PERMISSION",
    scope: "communication:sms:check-in",
  },
  {
    policyKey: "communication-permission-push-check-in",
    recordType: "COMMUNICATION_PERMISSION",
    scope: "communication:push:check-in",
  },
  {
    policyKey: "caregiver-safety-plan-summary",
    recordType: "CAREGIVER_AUTHORIZATION",
    scope: "caregiver:safety-plan-summary",
  },
  {
    policyKey: "caregiver-appointments",
    recordType: "CAREGIVER_AUTHORIZATION",
    scope: "caregiver:appointments",
  },
  {
    policyKey: "processing-basis-care-treatment",
    recordType: "PROCESSING_BASIS",
    scope: "care-treatment",
  },
  {
    policyKey: "processing-basis-email-check-in",
    recordType: "PROCESSING_BASIS",
    scope: "communication:email:check-in",
  },
  {
    policyKey: "processing-basis-sms-check-in",
    recordType: "PROCESSING_BASIS",
    scope: "communication:sms:check-in",
  },
  {
    policyKey: "processing-basis-push-check-in",
    recordType: "PROCESSING_BASIS",
    scope: "communication:push:check-in",
  },
];

const canonicalPolicy = {
  version: "pending-local-v1",
  state: "PENDING",
  origin: "INSTITUTIONAL_CONFIGURATION",
  evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
  evidenceRef: "DEC-003-OR-DEC-004-PENDING",
};

async function main() {
  const normalizedAt = new Date();
  const correlationId = randomUUID();

  await prisma.$transaction(async (transaction) => {
    const users = new Map();

    for (const { alias, role } of syntheticUsers) {
      const user = await transaction.user.upsert({
        where: { syntheticAlias: alias },
        create: {
          syntheticAlias: alias,
          displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
          isSynthetic: true,
        },
        update: {
          displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
          isActive: true,
          isSynthetic: true,
        },
      });
      users.set(alias, user);
    }

    const admin = users.get("demo-admin");
    if (!admin) throw new Error("Synthetic admin seed failed");

    for (const { alias, role } of syntheticUsers) {
      const user = users.get(alias);
      if (!user) throw new Error("Synthetic user seed failed");

      const unexpectedAssignments = await transaction.roleAssignment.findMany({
        where: { userId: user.id, revokedAt: null, NOT: { role } },
        select: { id: true },
      });
      for (const assignment of unexpectedAssignments) {
        await transaction.roleAssignment.update({
          where: { id: assignment.id },
          data: { revokedAt: normalizedAt },
        });
        await transaction.auditEvent.create({
          data: {
            actorUserId: null,
            actorRole: null,
            action: "ROLE_REVOKED",
            resourceType: "RoleAssignment",
            resourceId: assignment.id,
            outcome: "SUCCESS",
            correlationId,
            createdAt: normalizedAt,
          },
        });
      }

      const activeAssignment = await transaction.roleAssignment.findFirst({
        where: { userId: user.id, role, revokedAt: null },
        select: { id: true },
      });

      if (!activeAssignment) {
        const assignment = await transaction.roleAssignment.create({
          data: {
            userId: user.id,
            role,
            assignedById: alias === "demo-admin" ? null : admin.id,
            assignedAt: normalizedAt,
          },
          select: { id: true },
        });
        await transaction.auditEvent.create({
          data: {
            actorUserId: null,
            actorRole: null,
            action: "ROLE_ASSIGNED",
            resourceType: "RoleAssignment",
            resourceId: assignment.id,
            outcome: "SUCCESS",
            correlationId,
            createdAt: normalizedAt,
          },
        });
      }
    }

    for (const policy of pendingPolicyVersions) {
      const existing = await transaction.policyVersion.findUnique({
        where: {
          policyKey_version: { policyKey: policy.policyKey, version: canonicalPolicy.version },
        },
        select: {
          id: true,
          recordType: true,
          scope: true,
          state: true,
          origin: true,
          evidenceType: true,
          evidenceRef: true,
        },
      });
      if (existing) {
        const matchesCanonicalConfiguration =
          existing.recordType === policy.recordType &&
          existing.scope === policy.scope &&
          existing.state === canonicalPolicy.state &&
          existing.origin === canonicalPolicy.origin &&
          existing.evidenceType === canonicalPolicy.evidenceType &&
          existing.evidenceRef === canonicalPolicy.evidenceRef;
        if (!matchesCanonicalConfiguration) {
          throw new CanonicalPolicyMismatchError(policy.policyKey, canonicalPolicy.version);
        }
        continue;
      }
      const created = await transaction.policyVersion.create({
        data: {
          ...policy,
          ...canonicalPolicy,
          actorUserId: admin.id,
          recordedAt: normalizedAt,
        },
        select: { id: true },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: admin.id,
          actorRole: "admin",
          action: "POLICY_VERSION_CREATED",
          resourceType: "PolicyVersion",
          resourceId: created.id,
          outcome: "SUCCESS",
          correlationId,
          createdAt: normalizedAt,
        },
      });
    }

    const nurse = users.get("demo-nurse");
    if (!nurse) throw new Error("Synthetic nurse seed failed");
    const identityPolicyKey = "synthetic-demo-identity-verification";
    const identityPolicyVersion = "demo-v1";
    let identityPolicy = await transaction.identityVerificationPolicyVersion.findUnique({
      where: {
        policyKey_version: { policyKey: identityPolicyKey, version: identityPolicyVersion },
      },
    });
    if (!identityPolicy) {
      identityPolicy = await transaction.identityVerificationPolicyVersion.create({
        data: {
          policyKey: identityPolicyKey,
          version: identityPolicyVersion,
          state: "APPROVED",
          acceptedState: "VERIFIED",
          processCode: "RECORDED_HUMAN_REVIEW",
          processVersion: "demo-v1",
          isSyntheticDemo: true,
          actorUserId: admin.id,
          recordedAt: normalizedAt,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: admin.id,
          actorRole: "admin",
          action: "POLICY_VERSION_CREATED",
          resourceType: "IdentityVerificationPolicyVersion",
          resourceId: identityPolicy.id,
          outcome: "SUCCESS",
          correlationId,
          createdAt: normalizedAt,
        },
      });
    } else if (
      identityPolicy.state !== "APPROVED" ||
      identityPolicy.acceptedState !== "VERIFIED" ||
      identityPolicy.processCode !== "RECORDED_HUMAN_REVIEW" ||
      identityPolicy.processVersion !== "demo-v1" ||
      !identityPolicy.isSyntheticDemo
    ) {
      throw new CanonicalPolicyMismatchError(identityPolicyKey, identityPolicyVersion);
    }

    const syntheticPatientId = "SYNTH-PATIENT-001";
    const existingPatient = await transaction.patient.findUnique({
      where: { externalPseudonymousId: syntheticPatientId },
    });
    if (!existingPatient) {
      const patient = await transaction.patient.create({
        data: {
          externalPseudonymousId: syntheticPatientId,
          isSynthetic: true,
          identityVerificationState: "VERIFIED",
          identityVerificationPolicyVersionId: identityPolicy.id,
          identityVerifiedAt: normalizedAt,
          identityVerifiedById: nurse.id,
          createdById: nurse.id,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: nurse.id,
          actorRole: "nurse",
          action: "CRITICAL_MUTATION",
          resourceType: "Patient",
          resourceId: patient.id,
          outcome: "SUCCESS",
          correlationId,
          createdAt: normalizedAt,
        },
      });
    } else if (
      !existingPatient.isSynthetic ||
      existingPatient.identityVerificationState !== "VERIFIED" ||
      existingPatient.identityVerificationPolicyVersionId !== identityPolicy.id
    ) {
      throw new CanonicalPolicyMismatchError(identityPolicyKey, syntheticPatientId);
    }
  });
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        error instanceof CanonicalPolicyMismatchError
          ? {
              code: "CANONICAL_POLICY_MISMATCH",
              policyKey: error.policyKey,
              version: error.version,
            }
          : { code: "SYNTHETIC_SEED_FAILED" },
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
