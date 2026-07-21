import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import syntheticRuleFixtures from "../src/domain/alerts/synthetic-rule-fixtures.json" with { type: "json" };

const prisma = new PrismaClient();

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableJson(value[key])]),
  );
}

function sameJson(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
}

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
    policyKey: "caregiver-portal",
    recordType: "CAREGIVER_AUTHORIZATION",
    scope: "caregiver:portal",
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

const syntheticCheckInFixture = {
  protocolKey: "synthetic-check-in-template",
  versionNumber: 1,
  title: "PLANTILLA SINTÉTICA / NO APROBADA",
  state: "SYNTHETIC_DEMO",
  isSyntheticFixture: true,
  schedule: {
    intervalDays: 3,
    firstDayOffset: 1,
    localTime: "09:30",
    timeZone: "Europe/Madrid",
    responseWindowMinutes: 180,
  },
  questions: [
    {
      questionKey: "sleep",
      position: 1,
      type: "SCALE",
      prompt: "Ejemplo sintético: ¿cómo valorarías tu sueño reciente?",
      required: true,
      scaleMinimum: 0,
      scaleMaximum: 4,
      scaleMinimumLabel: "Muy difícil",
      scaleMaximumLabel: "Muy reparador",
    },
    {
      questionKey: "anxiety",
      position: 2,
      type: "SCALE",
      prompt: "Ejemplo sintético: ¿qué intensidad de ansiedad has notado?",
      required: true,
      scaleMinimum: 0,
      scaleMaximum: 4,
      scaleMinimumLabel: "Ninguna",
      scaleMaximumLabel: "Muy intensa",
    },
    {
      questionKey: "mood",
      position: 3,
      type: "SCALE",
      prompt: "Ejemplo sintético: ¿cómo describirías tu ánimo?",
      required: true,
      scaleMinimum: 0,
      scaleMaximum: 4,
      scaleMinimumLabel: "Muy bajo",
      scaleMaximumLabel: "Muy bueno",
    },
    {
      questionKey: "adherence",
      position: 4,
      type: "YES_NO",
      prompt: "Ejemplo sintético: ¿has seguido el plan acordado con tu equipo?",
      required: true,
    },
    {
      questionKey: "substance-use",
      position: 5,
      type: "SINGLE_CHOICE",
      prompt: "Ejemplo sintético: selecciona la opción que mejor describa consumo reciente.",
      required: true,
      options: ["Sin consumo", "Consumo registrado", "Prefiero no contestar"],
    },
    {
      questionKey: "self-harm-ideation",
      position: 6,
      type: "YES_NO",
      prompt: "Ejemplo sintético: ¿has tenido pensamientos de hacerte daño?",
      required: true,
    },
    {
      questionKey: "irritability",
      position: 7,
      type: "SCALE",
      prompt: "Ejemplo sintético: ¿qué nivel de irritabilidad has notado?",
      required: true,
      scaleMinimum: 0,
      scaleMaximum: 4,
      scaleMinimumLabel: "Ninguno",
      scaleMaximumLabel: "Muy alto",
    },
    {
      questionKey: "family-conflict",
      position: 8,
      type: "RESTRICTED_SHORT_TEXT",
      prompt: "Ejemplo sintético: si quieres, describe brevemente algún conflicto familiar.",
      required: false,
      maximumTextLength: 160,
    },
  ],
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

    const existingCheckInFixture = await transaction.checkInProtocolVersion.findUnique({
      where: {
        protocolKey_versionNumber: {
          protocolKey: syntheticCheckInFixture.protocolKey,
          versionNumber: syntheticCheckInFixture.versionNumber,
        },
      },
      include: { schedule: true, questions: true },
    });
    if (!existingCheckInFixture) {
      const created = await transaction.checkInProtocolVersion.create({
        data: {
          protocolKey: syntheticCheckInFixture.protocolKey,
          versionNumber: syntheticCheckInFixture.versionNumber,
          title: syntheticCheckInFixture.title,
          state: syntheticCheckInFixture.state,
          isSyntheticFixture: true,
          createdById: admin.id,
          schedule: { create: syntheticCheckInFixture.schedule },
          questions: { create: syntheticCheckInFixture.questions },
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: admin.id,
          actorRole: "admin",
          action: "CHECK_IN_PROTOCOL_VERSION_CREATED",
          resourceType: "CheckInProtocolVersion",
          resourceId: created.id,
          outcome: "SUCCESS",
          correlationId,
          createdAt: normalizedAt,
        },
      });
    } else if (
      existingCheckInFixture.title !== syntheticCheckInFixture.title ||
      existingCheckInFixture.state !== syntheticCheckInFixture.state ||
      !existingCheckInFixture.isSyntheticFixture ||
      existingCheckInFixture.questions.length !== syntheticCheckInFixture.questions.length ||
      existingCheckInFixture.schedule?.intervalDays !==
        syntheticCheckInFixture.schedule.intervalDays
    ) {
      throw new CanonicalPolicyMismatchError(
        syntheticCheckInFixture.protocolKey,
        String(syntheticCheckInFixture.versionNumber),
      );
    }

    for (const fixture of syntheticRuleFixtures) {
      const existingDefinition = await transaction.ruleDefinition.findUnique({
        where: { ruleKey: fixture.ruleKey },
        include: {
          versions: {
            where: { versionNumber: 1 },
            include: { approval: true },
          },
        },
      });
      if (!existingDefinition) {
        const definition = await transaction.ruleDefinition.create({
          data: {
            ruleKey: fixture.ruleKey,
            name: fixture.name,
            isSyntheticFixture: true,
            createdById: admin.id,
            createdAt: normalizedAt,
            versions: {
              create: {
                versionNumber: 1,
                state: "DRAFT",
                schemaVersion: fixture.dsl.schemaVersion,
                allowedInputs: fixture.dsl.allowedInputs,
                temporalWindow: fixture.dsl.window,
                condition: fixture.dsl.condition,
                administrativeSeverity: fixture.dsl.administrativeSeverity.toUpperCase(),
                explanation: fixture.dsl.explanation,
                reviewOwner: fixture.dsl.reviewOwner.toUpperCase(),
                createdById: admin.id,
                createdAt: normalizedAt,
              },
            },
          },
          include: { versions: true },
        });
        await transaction.auditEvent.create({
          data: {
            actorUserId: admin.id,
            actorRole: "admin",
            action: "RULE_VERSION_CREATED",
            resourceType: "RuleVersion",
            resourceId: definition.versions[0].id,
            outcome: "SUCCESS",
            correlationId,
            createdAt: normalizedAt,
          },
        });
        continue;
      }

      const version = existingDefinition.versions[0];
      if (
        existingDefinition.name !== fixture.name ||
        !existingDefinition.isSyntheticFixture ||
        !version ||
        version.state !== "DRAFT" ||
        version.approval ||
        version.schemaVersion !== fixture.dsl.schemaVersion ||
        !sameJson(version.allowedInputs, fixture.dsl.allowedInputs) ||
        !sameJson(version.temporalWindow, fixture.dsl.window) ||
        !sameJson(version.condition, fixture.dsl.condition) ||
        version.administrativeSeverity.toLowerCase() !== fixture.dsl.administrativeSeverity ||
        version.explanation !== fixture.dsl.explanation ||
        version.reviewOwner.toLowerCase() !== fixture.dsl.reviewOwner
      ) {
        throw new CanonicalPolicyMismatchError(fixture.ruleKey, "1");
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
    const portalPatient = users.get("demo-patient");
    if (!portalPatient) throw new Error("Synthetic patient portal seed failed");
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
          portalUserId: portalPatient.id,
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
    } else {
      if (
        !existingPatient.isSynthetic ||
        existingPatient.identityVerificationState !== "VERIFIED" ||
        existingPatient.identityVerificationPolicyVersionId !== identityPolicy.id ||
        (existingPatient.portalUserId !== null && existingPatient.portalUserId !== portalPatient.id)
      ) {
        throw new CanonicalPolicyMismatchError(identityPolicyKey, syntheticPatientId);
      }
      if (existingPatient.portalUserId === null) {
        await transaction.patient.update({
          where: { id: existingPatient.id },
          data: { portalUserId: portalPatient.id },
        });
      }
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
