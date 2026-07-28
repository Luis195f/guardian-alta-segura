import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";

import { PrismaClient } from "@prisma/client";
import syntheticRuleFixtures from "../src/domain/alerts/synthetic-rule-fixtures.json" with { type: "json" };
import { CanonicalPolicyMismatchError, writeSafeSeedError } from "./seed-error.mjs";

if (existsSync(".env")) {
  delete process.env.DATABASE_URL;
  process.loadEnvFile(".env");
}

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

    const syntheticPatient = await transaction.patient.findUniqueOrThrow({
      where: { externalPseudonymousId: syntheticPatientId },
    });
    const demoProtocol = await transaction.checkInProtocolVersion.findUniqueOrThrow({
      where: {
        protocolKey_versionNumber: {
          protocolKey: syntheticCheckInFixture.protocolKey,
          versionNumber: syntheticCheckInFixture.versionNumber,
        },
      },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    const clinician = users.get("demo-clinician");
    if (!clinician) throw new Error("Synthetic clinician seed failed");
    const demoEpisodeId = "synthetic-demo-episode-buildweek";
    const existingDemoEpisode = await transaction.dischargeEpisode.findUnique({
      where: { id: demoEpisodeId },
      select: {
        patientId: true,
        responsibleNurseId: true,
        responsibleClinicianId: true,
        status: true,
        checkInProtocolVersionId: true,
      },
    });
    if (!existingDemoEpisode) {
      await transaction.dischargeEpisode.create({
        data: {
          id: demoEpisodeId,
          patientId: syntheticPatient.id,
          dischargeDate: new Date("2026-07-21T00:00:00.000Z"),
          programLengthDays: 30,
          responsibleNurseId: nurse.id,
          responsibleClinicianId: clinician.id,
          status: "ACTIVE",
          createdById: nurse.id,
          checkInProtocolVersionId: demoProtocol.id,
          version: 2,
          transitions: {
            create: [
              {
                fromStatus: null,
                toStatus: "DRAFT",
                actorUserId: nurse.id,
                actorRole: "nurse",
                idempotencyKey: "synthetic-seed:episode-created:v1",
                requestFingerprint: "1".repeat(64),
                resultingVersion: 1,
                occurredAt: new Date("2026-07-21T08:00:00.000Z"),
              },
              {
                fromStatus: "DRAFT",
                toStatus: "ACTIVE",
                actorUserId: nurse.id,
                actorRole: "nurse",
                idempotencyKey: "synthetic-seed:episode-activated:v2",
                requestFingerprint: "2".repeat(64),
                resultingVersion: 2,
                occurredAt: new Date("2026-07-21T08:05:00.000Z"),
              },
            ],
          },
        },
      });
    } else if (
      existingDemoEpisode.patientId !== syntheticPatient.id ||
      existingDemoEpisode.responsibleNurseId !== nurse.id ||
      existingDemoEpisode.responsibleClinicianId !== clinician.id ||
      existingDemoEpisode.status !== "ACTIVE" ||
      existingDemoEpisode.checkInProtocolVersionId !== demoProtocol.id
    ) {
      throw new CanonicalPolicyMismatchError("synthetic-buildweek-episode", "demo-v1");
    }

    const safetyPlanId = "synthetic-demo-safety-plan-buildweek";
    if (!(await transaction.safetyPlan.findUnique({ where: { id: safetyPlanId } }))) {
      const steps = [
        "WARNING_SIGNS",
        "INTERNAL_COPING",
        "DISTRACTION_CONTACTS",
        "SUPPORT_CONTACTS",
        "PROFESSIONAL_RESOURCES",
        "MEANS_REDUCTION",
      ];
      await transaction.safetyPlan.create({
        data: {
          id: safetyPlanId,
          dischargeEpisodeId: demoEpisodeId,
          revision: 2,
          currentVersion: 1,
          activeVersionNumber: 1,
          createdById: nurse.id,
          versions: {
            create: {
              id: "synthetic-demo-safety-plan-version-1",
              versionNumber: 1,
              createdById: nurse.id,
              createdAt: new Date("2026-07-21T08:10:00.000Z"),
              sections: {
                create: steps.map((step, index) => ({
                  step,
                  content: `SYNTHETIC DEMO — paso estructurado ${index + 1}; contenido no clínico para mostrar versionado.`,
                  provenance: "PATIENT",
                  permissions: {
                    create: [
                      { audience: "PATIENT", canView: true },
                      { audience: "CAREGIVER", canView: index < 4 },
                    ],
                  },
                })),
              },
              stateChanges: {
                create: [
                  {
                    sequence: 1,
                    resultingState: "DRAFT",
                    actorUserId: nurse.id,
                    occurredAt: new Date("2026-07-21T08:10:00.000Z"),
                  },
                  {
                    sequence: 2,
                    resultingState: "ACTIVE",
                    actorUserId: nurse.id,
                    occurredAt: new Date("2026-07-21T08:15:00.000Z"),
                  },
                ],
              },
            },
          },
        },
      });
    }

    const batchId = "synthetic-demo-checkin-batch-buildweek";
    if (!(await transaction.checkInAssignmentBatch.findUnique({ where: { id: batchId } }))) {
      await transaction.checkInAssignmentBatch.create({
        data: {
          id: batchId,
          episodeId: demoEpisodeId,
          checkInProtocolVersionId: demoProtocol.id,
          createdById: nurse.id,
          idempotencyKey: "synthetic-seed:checkin-batch",
          requestFingerprint: "3".repeat(64),
          assignments: {
            create: {
              id: "synthetic-demo-checkin-assignment-1",
              episodeId: demoEpisodeId,
              checkInProtocolVersionId: demoProtocol.id,
              sequence: 1,
              scheduledFor: new Date("2026-07-21T09:30:00.000Z"),
              windowStartsAt: new Date("2026-07-21T09:00:00.000Z"),
              windowEndsAt: new Date("2026-07-21T12:00:00.000Z"),
              createdById: nurse.id,
            },
          },
        },
      });
      const outcome = await transaction.checkInOutcome.create({
        data: {
          id: "synthetic-demo-checkin-outcome-1",
          assignmentId: "synthetic-demo-checkin-assignment-1",
          checkInProtocolVersionId: demoProtocol.id,
          type: "RESPONDED",
          recordedById: portalPatient.id,
          idempotencyKey: "synthetic-seed:checkin-response",
          requestFingerprint: "4".repeat(64),
          recordedAt: new Date("2026-07-21T09:45:00.000Z"),
        },
      });
      const response = await transaction.checkInResponse.create({
        data: {
          id: "synthetic-demo-checkin-response-1",
          outcomeId: outcome.id,
          assignmentId: "synthetic-demo-checkin-assignment-1",
          checkInProtocolVersionId: demoProtocol.id,
          outcomeType: "RESPONDED",
          submittedById: portalPatient.id,
          submittedAt: new Date("2026-07-21T09:45:00.000Z"),
        },
      });
      await transaction.checkInAnswer.createMany({
        data: demoProtocol.questions.map((question) => ({
          checkInResponseId: response.id,
          questionDefinitionId: question.id,
          checkInProtocolVersionId: demoProtocol.id,
          ...(question.type === "SCALE" ? { scaleValue: 2 } : {}),
          ...(question.type === "YES_NO" ? { yesNoValue: false } : {}),
          ...(question.type === "SINGLE_CHOICE" ? { selectedOption: "Prefiero no contestar" } : {}),
          ...(question.type === "RESTRICTED_SHORT_TEXT"
            ? { shortTextValue: "DEMO SYNTHETIC — sin contenido clínico." }
            : {}),
        })),
      });
    }

    if (
      !(await transaction.homeSafetyReviewVersion.findUnique({
        where: { id: "synthetic-demo-home-safety-v1" },
      }))
    ) {
      await transaction.homeSafetyReviewVersion.create({
        data: {
          id: "synthetic-demo-home-safety-v1",
          dischargeEpisodeId: demoEpisodeId,
          versionNumber: 1,
          templateKey: "synthetic-home-safety-information",
          templateVersion: "demo-v1",
          informationalPurposeAcknowledged: true,
          humanReviewed: false,
          actorUserId: nurse.id,
          recordedAt: new Date("2026-07-21T10:00:00.000Z"),
          items: {
            create: [
              "environment-information",
              "pending-elements",
              "information-source",
              "professional-follow-up",
            ].map((itemKey) => ({ itemKey, state: "NOT_REVIEWED", provenance: "PATIENT" })),
          },
        },
      });
    }

    const demoRuleKey = "synthetic-demo-flow-mechanics";
    let demoRule = await transaction.ruleDefinition.findUnique({
      where: { ruleKey: demoRuleKey },
      include: { versions: { include: { approval: true } } },
    });
    if (!demoRule) {
      demoRule = await transaction.ruleDefinition.create({
        data: {
          id: "synthetic-demo-flow-rule",
          ruleKey: demoRuleKey,
          name: "AVISO SINTÉTICO — validación clínica pendiente",
          isSyntheticFixture: true,
          createdById: admin.id,
          versions: {
            create: {
              id: "synthetic-demo-flow-rule-v1",
              versionNumber: 1,
              state: "DRAFT",
              schemaVersion: 1,
              allowedInputs: [{ key: "synthetic_demo_signal", type: "boolean", required: true }],
              temporalWindow: { lookbackHours: 24 },
              condition: {
                combinator: "all",
                clauses: [{ input: "synthetic_demo_signal", operator: "eq", value: true }],
              },
              administrativeSeverity: "STANDARD",
              explanation:
                "Coincidencia de un fixture técnico sintético; requiere revisión humana y no constituye evaluación clínica.",
              reviewOwner: "NURSE",
              createdById: admin.id,
            },
          },
        },
        include: { versions: { include: { approval: true } } },
      });
    }
    const demoRuleVersion = demoRule.versions[0];
    if (!demoRuleVersion) throw new Error("Synthetic demo rule version missing");
    if (!demoRuleVersion.approval) {
      await transaction.ruleApproval.create({
        data: {
          ruleVersionId: demoRuleVersion.id,
          approvedById: clinician.id,
          approvalReference: "SYNTHETIC-DEMO-TECHNICAL-ONLY",
          approvedAt: new Date("2026-07-21T10:10:00.000Z"),
        },
      });
    }
    if (demoRuleVersion.state === "DRAFT") {
      await transaction.ruleVersion.update({
        where: { id: demoRuleVersion.id },
        data: { state: "APPROVED" },
      });
      await transaction.ruleVersion.update({
        where: { id: demoRuleVersion.id },
        data: { state: "ACTIVE" },
      });
    } else if (demoRuleVersion.state !== "ACTIVE") {
      throw new CanonicalPolicyMismatchError(demoRuleKey, "1");
    }

    const demoEvaluationId = "synthetic-demo-flow-evaluation-1";
    if (!(await transaction.ruleEvaluation.findUnique({ where: { id: demoEvaluationId } }))) {
      const inputSnapshot = [
        {
          inputKey: "synthetic_demo_signal",
          value: true,
          observedAt: "2026-07-21T10:15:00.000Z",
          source: {
            resourceType: "CheckInResponse",
            resourceId: "synthetic-demo-checkin-response-1",
            field: "syntheticFixture",
          },
        },
      ];
      await transaction.ruleEvaluation.create({
        data: {
          id: demoEvaluationId,
          ruleDefinitionId: demoRule.id,
          ruleVersionId: demoRuleVersion.id,
          ruleVersionNumber: 1,
          episodeId: demoEpisodeId,
          evaluatedById: nurse.id,
          idempotencyKey: "synthetic-seed:demo-evaluation",
          requestFingerprint: "5".repeat(64),
          evaluatedAt: new Date("2026-07-21T10:15:00.000Z"),
          inputSnapshot,
          inputHash: "6".repeat(64),
          outcome: "MATCHED",
          missingInputs: [],
        },
      });
      await transaction.alert.create({
        data: {
          id: "synthetic-demo-flow-alert-1",
          ruleDefinitionId: demoRule.id,
          ruleVersionId: demoRuleVersion.id,
          ruleVersionNumber: 1,
          evaluationId: demoEvaluationId,
          episodeId: demoEpisodeId,
          inputReferences: inputSnapshot.map(({ source }) => source),
          explanation:
            "Coincidencia de un fixture técnico sintético; requiere revisión humana y no constituye evaluación clínica.",
          administrativeSeverity: "STANDARD",
          reviewOwner: "NURSE",
          triggeredAt: new Date("2026-07-21T10:15:00.000Z"),
          currentState: "OPEN",
        },
      });
    }
  });
}

main()
  .catch((error) => {
    writeSafeSeedError(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
