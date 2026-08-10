import { randomUUID } from "node:crypto";

import { Prisma, PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  AcceptCaregiverInvitationService,
  CaregiverAccessDeniedError,
  ChangeCaregiverScopeService,
} from "@/application/caregiver/manage-caregiver-access";

import { RecordLegalDecisionService } from "@/application/legal/record-legal-decision";
import { secureSessionTokenIssuer, sha256 } from "@/infrastructure/crypto/session-token";
import {
  getCaregiverPortalView,
  listPatientCaregiverAccess,
  logoutCaregiverSession,
  PrismaCaregiverAccessUnitOfWork,
  recordCaregiverObservation,
} from "@/infrastructure/persistence/prisma-caregiver-access-unit-of-work";
import { PrismaLegalRecordsUnitOfWork } from "@/infrastructure/persistence/prisma-legal-records-unit-of-work";
import { prisma } from "@/infrastructure/persistence/prisma";

const correlationId = "018f673a-4e35-7060-99b5-7bc6feba3a97";
const demoTtl = { invitationTtlMs: 30 * 60 * 1000, sessionTtlMs: 8 * 60 * 60 * 1000 };
const testNow = new Date("2026-07-21T12:00:00.000Z");

async function syntheticUser(role: "admin" | "nurse" | "clinician" | "patient" | "caregiver") {
  return prisma.user.create({
    data: {
      syntheticAlias: `caregiver-${role}-${randomUUID()}`,
      displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
      isSynthetic: true,
      roleAssignments: { create: { role } },
    },
  });
}

async function setup() {
  const [admin, nurse, clinician, patientUser, caregiverUser] = await Promise.all([
    syntheticUser("admin"),
    syntheticUser("nurse"),
    syntheticUser("clinician"),
    syntheticUser("patient"),
    syntheticUser("caregiver"),
  ]);
  const identityPolicy = await prisma.identityVerificationPolicyVersion.create({
    data: {
      policyKey: `caregiver-identity-${randomUUID()}`,
      version: "demo-v1",
      state: "APPROVED",
      acceptedState: "VERIFIED",
      processCode: "RECORDED_HUMAN_REVIEW",
      processVersion: "demo-v1",
      isSyntheticDemo: true,
      actorUserId: admin.id,
    },
  });
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `synthetic-${randomUUID()}`,
      isSynthetic: true,
      identityVerificationState: "VERIFIED",
      identityVerificationPolicyVersionId: identityPolicy.id,
      identityVerifiedAt: new Date(),
      identityVerifiedById: admin.id,
      createdById: nurse.id,
      portalUserId: patientUser.id,
    },
  });
  const protocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `caregiver-protocol-${randomUUID()}`,
      versionNumber: 1,
      title: "SINTÉTICO / NO USO CLÍNICO",
      state: "SYNTHETIC_DEMO",
      isSyntheticFixture: true,
      createdById: admin.id,
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-07-21T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  const policy = await prisma.policyVersion.create({
    data: {
      policyKey: `caregiver-portal-${randomUUID()}`,
      version: "test-v1",
      recordType: "CAREGIVER_AUTHORIZATION",
      state: "APPROVED",
      scope: "caregiver:portal",
      actorUserId: admin.id,
      origin: "INSTITUTIONAL_CONFIGURATION",
      evidenceType: "INSTITUTIONAL_DECISION_REFERENCE",
      evidenceRef: "SYNTHETIC-TEST-APPROVAL",
      recordedAt: new Date("2026-07-21T08:00:00.000Z"),
    },
  });
  const authorization = await prisma.caregiverAuthorization.create({
    data: {
      subjectUserId: patientUser.id,
      caregiverUserId: caregiverUser.id,
      state: "ACTIVE",
      scope: "caregiver:portal",
      policyVersionId: policy.id,
      actorUserId: patientUser.id,
      expiresAt: new Date("2026-08-21T00:00:00.000Z"),
      origin: "DEMO_UI",
      evidenceType: "RECORDED_INTERACTION",
      evidenceRef: "SYNTHETIC-TEST-AUTHORIZATION",
      recordedAt: new Date("2026-07-21T09:00:00.000Z"),
    },
  });
  const profile = await prisma.caregiverProfile.create({
    data: {
      caregiverUserId: caregiverUser.id,
      externalPseudonymousId: `cg_${randomUUID().replaceAll("-", "").slice(0, 24)}`,
    },
  });
  await prisma.caregiverAuthorizationScope.create({
    data: {
      caregiverAuthorizationId: authorization.id,
      dischargeEpisodeId: episode.id,
      version: 1,
      capabilities: ["VIEW_PLAN_SECTIONS", "VIEW_ASSIGNED_TASKS", "SEND_OBSERVATIONS"],
      allowedPlanSections: ["WARNING_SIGNS"],
      authorizedResourceKeys: [],
      actorUserId: patientUser.id,
    },
  });
  const plan = await prisma.safetyPlan.create({
    data: {
      dischargeEpisodeId: episode.id,
      revision: 1,
      currentVersion: 1,
      activeVersionNumber: 1,
      createdById: nurse.id,
    },
  });
  await prisma.safetyPlanVersion.create({
    data: {
      safetyPlanId: plan.id,
      versionNumber: 1,
      createdById: nurse.id,
      stateChanges: {
        create: {
          sequence: 1,
          resultingState: "ACTIVE",
          actorUserId: nurse.id,
        },
      },
      sections: {
        create: [
          {
            step: "WARNING_SIGNS",
            content: "Señal sintética autorizada",
            provenance: "PATIENT",
            permissions: { create: { audience: "CAREGIVER", canView: true } },
          },
          {
            step: "MEANS_REDUCTION",
            content: "Contenido sintético fuera de scope",
            provenance: "CLINICIAN",
            permissions: { create: { audience: "CAREGIVER", canView: true } },
          },
          {
            step: "SUPPORT_CONTACTS",
            content: "Contenido sintético denegado por documento",
            provenance: "PATIENT",
            permissions: { create: { audience: "CAREGIVER", canView: false } },
          },
        ],
      },
    },
  });
  await prisma.safetyPlanVersion.create({
    data: {
      safetyPlanId: plan.id,
      versionNumber: 2,
      createdById: nurse.id,
      stateChanges: {
        create: { sequence: 1, resultingState: "DRAFT", actorUserId: nurse.id },
      },
      sections: {
        create: {
          step: "WARNING_SIGNS",
          content: "Borrador sintético no activo y no autorizable",
          provenance: "CLINICIAN",
          permissions: { create: { audience: "CAREGIVER", canView: true } },
        },
      },
    },
  });
  const task = await prisma.task.create({
    data: {
      episodeId: episode.id,
      summary: "Tarea sintética asignada al cuidador",
      currentState: "OPEN",
      assignedToId: caregiverUser.id,
      createdById: nurse.id,
      creationIdempotencyKey: `caregiver-task-${randomUUID()}`,
      creationFingerprint: sha256(`caregiver-task-${randomUUID()}`),
    },
  });
  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      type: "CREATED",
      toState: "OPEN",
      toAssignedToId: caregiverUser.id,
      actorUserId: nurse.id,
      actorRole: "nurse",
      idempotencyKey: `caregiver-task-event-${randomUUID()}`,
      requestFingerprint: sha256(`caregiver-task-event-${randomUUID()}`),
      resultingRevision: 1,
    },
  });
  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      type: "NOTE_RECORDED",
      fromState: "OPEN",
      toState: "OPEN",
      fromAssignedToId: caregiverUser.id,
      toAssignedToId: caregiverUser.id,
      note: "Nota clínica sintética que el portal no debe exponer",
      actorUserId: nurse.id,
      actorRole: "nurse",
      idempotencyKey: `caregiver-task-note-${randomUUID()}`,
      requestFingerprint: sha256(`caregiver-task-note-${randomUUID()}`),
      resultingRevision: 2,
    },
  });
  await prisma.task.update({ where: { id: task.id }, data: { revision: 2 } });

  const question = await prisma.questionDefinition.create({
    data: {
      checkInProtocolVersionId: protocol.id,
      questionKey: `private-answer-${randomUUID()}`,
      position: 1,
      type: "RESTRICTED_SHORT_TEXT",
      prompt: "Pregunta sintética privada",
      maximumTextLength: 280,
    },
  });
  const batch = await prisma.checkInAssignmentBatch.create({
    data: {
      episodeId: episode.id,
      checkInProtocolVersionId: protocol.id,
      createdById: nurse.id,
      idempotencyKey: `caregiver-checkin-${randomUUID()}`,
      requestFingerprint: sha256(`caregiver-checkin-${randomUUID()}`),
    },
  });
  const assignment = await prisma.checkInAssignment.create({
    data: {
      batchId: batch.id,
      episodeId: episode.id,
      checkInProtocolVersionId: protocol.id,
      sequence: 1,
      scheduledFor: new Date("2026-07-21T11:00:00.000Z"),
      windowStartsAt: new Date("2026-07-21T10:00:00.000Z"),
      windowEndsAt: new Date("2026-07-21T13:00:00.000Z"),
      createdById: nurse.id,
    },
  });
  await prisma.$transaction(async (transaction) => {
    const outcome = await transaction.checkInOutcome.create({
      data: {
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocol.id,
        type: "RESPONDED",
        recordedById: patientUser.id,
        idempotencyKey: `caregiver-outcome-${randomUUID()}`,
        requestFingerprint: sha256(`caregiver-outcome-${randomUUID()}`),
      },
    });
    const response = await transaction.checkInResponse.create({
      data: {
        outcomeId: outcome.id,
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocol.id,
        submittedById: patientUser.id,
      },
    });
    await transaction.checkInAnswer.create({
      data: {
        checkInResponseId: response.id,
        questionDefinitionId: question.id,
        checkInProtocolVersionId: protocol.id,
        shortTextValue: "Respuesta de check-in sintética confidencial",
      },
    });
  });

  const rawTokens = [`caregiver-session-${randomUUID()}`, `caregiver-session-${randomUUID()}`];
  for (const [index, rawToken] of rawTokens.entries()) {
    const invitation = await prisma.caregiverInvitation.create({
      data: {
        caregiverAuthorizationId: authorization.id,
        caregiverProfileId: profile.id,
        dischargeEpisodeId: episode.id,
        invitationTokenHash: sha256(`invitation-${index}-${randomUUID()}`),
        createdById: patientUser.id,
        createdAt: new Date("2026-07-21T09:30:00.000Z"),
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
        consumedAt: new Date("2026-07-21T10:00:00.000Z"),
      },
    });
    await prisma.caregiverSession.create({
      data: {
        caregiverAuthorizationId: authorization.id,
        caregiverProfileId: profile.id,
        dischargeEpisodeId: episode.id,
        invitationId: invitation.id,
        sessionTokenHash: sha256(rawToken),
        createdAt: new Date("2026-07-21T10:00:00.000Z"),
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    });
  }
  return {
    admin,
    nurse,
    clinician,
    patient,
    patientUser,
    caregiverUser,
    authorization,
    profile,
    policy,
    protocol,
    episode,
    rawTokens,
  };
}

type SetupContext = Awaited<ReturnType<typeof setup>>;

async function createEpisode(context: SetupContext, patientId: string = context.patient.id) {
  return prisma.dischargeEpisode.create({
    data: {
      patientId,
      dischargeDate: new Date("2026-07-22T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: context.nurse.id,
      responsibleClinicianId: context.clinician.id,
      status: "ACTIVE",
      createdById: context.nurse.id,
      checkInProtocolVersionId: context.protocol.id,
    },
  });
}

async function createInvitation(
  context: SetupContext,
  options: { readonly episodeId?: string; readonly expiresAt?: Date } = {},
) {
  const rawToken = `caregiver-invitation-${randomUUID()}`;
  const invitation = await prisma.caregiverInvitation.create({
    data: {
      caregiverAuthorizationId: context.authorization.id,
      caregiverProfileId: context.profile.id,
      dischargeEpisodeId: options.episodeId ?? context.episode.id,
      invitationTokenHash: sha256(rawToken),
      createdById: context.patientUser.id,
      createdAt: new Date("2026-07-21T10:00:00.000Z"),
      expiresAt: options.expiresAt ?? new Date("2026-07-21T13:00:00.000Z"),
    },
  });
  return { invitation, rawToken };
}

async function createSessionForInvitation(
  context: SetupContext,
  invitationId: string,
  rawSessionToken: string,
  episodeId = context.episode.id,
) {
  await prisma.caregiverInvitation.update({
    where: { id: invitationId },
    data: { consumedAt: new Date("2026-07-21T11:00:00.000Z") },
  });
  return prisma.caregiverSession.create({
    data: {
      caregiverAuthorizationId: context.authorization.id,
      caregiverProfileId: context.profile.id,
      dischargeEpisodeId: episodeId,
      invitationId,
      sessionTokenHash: sha256(rawSessionToken),
      createdAt: new Date("2026-07-21T11:00:00.000Z"),
      expiresAt: new Date("2026-07-21T20:00:00.000Z"),
    },
  });
}

async function waitForBlockedCaregiverAuthorizationLock() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const [state] = await prisma.$queryRaw<{ blocked: bigint }[]>(Prisma.sql`
      SELECT count(*)::bigint AS "blocked"
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock'
        AND query LIKE '%caregiver_authorizations%'
    `);
    if ((state?.blocked ?? 0n) > 0n) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Expected a caregiver authorization request blocked on the revocation lock");
}

async function revokeWhileOperationIsBlocked<T>(
  context: SetupContext,
  operation: () => Promise<T>,
): Promise<T> {
  let markLocked!: () => void;
  let releaseRevocation!: () => void;
  const locked = new Promise<void>((resolve) => {
    markLocked = resolve;
  });
  const release = new Promise<void>((resolve) => {
    releaseRevocation = resolve;
  });
  const revocation = prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT "id" FROM "caregiver_authorizations"
      WHERE "id" = ${context.authorization.id}
      FOR UPDATE
    `);
    markLocked();
    await release;
    await transaction.revocationEvent.create({
      data: {
        state: "REVOKED",
        targetType: "CAREGIVER_AUTHORIZATION",
        targetRecordId: context.authorization.id,
        subjectUserId: context.patientUser.id,
        scope: context.authorization.scope,
        policyVersionId: context.authorization.policyVersionId,
        actorUserId: context.patientUser.id,
        recordedAt: new Date("2026-07-21T12:00:00.000Z"),
        origin: "DEMO_UI",
        evidenceType: "RECORDED_INTERACTION",
        evidenceRef: "SYNTHETIC-CONCURRENCY-REVOCATION",
      },
    });
    await transaction.caregiverSession.updateMany({
      where: { caregiverAuthorizationId: context.authorization.id, revokedAt: null },
      data: { revokedAt: new Date("2026-07-21T12:00:00.000Z") },
    });
  });
  await locked;
  const pendingOperation = operation();
  await waitForBlockedCaregiverAuthorizationLock();
  releaseRevocation();
  await revocation;
  return pendingOperation;
}

describe("caregiver access persistence", () => {
  it("selecciona el alcance vigente por episodio antes del límite y declara cobertura real", async () => {
    const data = await setup();
    const laterEpisode = await prisma.dischargeEpisode.create({
      data: {
        id: `zz-synthetic-scope-${randomUUID()}`,
        patientId: data.patient.id,
        dischargeDate: new Date("2026-07-23T00:00:00.000Z"),
        programLengthDays: 30,
        responsibleNurseId: data.nurse.id,
        responsibleClinicianId: data.clinician.id,
        status: "ACTIVE",
        createdById: data.nurse.id,
        checkInProtocolVersionId: data.protocol.id,
      },
    });
    const principal = {
      userId: data.patientUser.id,
      roles: ["patient" as const],
      sessionId: randomUUID(),
    };
    const instrumentedPrisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
    let queryCount = 0;
    instrumentedPrisma.$on("query", () => {
      queryCount += 1;
    });
    try {
      await listPatientCaregiverAccess(principal, instrumentedPrisma);
      const baselineQueryCount = queryCount;
      await prisma.caregiverAuthorizationScope.createMany({
        data: [
          ...Array.from({ length: 50 }, (_, index) => ({
            caregiverAuthorizationId: data.authorization.id,
            dischargeEpisodeId: data.episode.id,
            version: index + 2,
            capabilities: ["VIEW_PLAN_SECTIONS" as const],
            allowedPlanSections: ["WARNING_SIGNS" as const],
            authorizedResourceKeys: [],
            actorUserId: data.patientUser.id,
            recordedAt: new Date(`2026-07-22T${String(index % 24).padStart(2, "0")}:00:00.000Z`),
          })),
          {
            caregiverAuthorizationId: data.authorization.id,
            dischargeEpisodeId: laterEpisode.id,
            version: 1,
            capabilities: ["VIEW_ASSIGNED_TASKS" as const],
            allowedPlanSections: [],
            authorizedResourceKeys: [],
            actorUserId: data.patientUser.id,
            recordedAt: new Date("2026-07-23T09:00:00.000Z"),
          },
        ],
      });

      queryCount = 0;
      const result = await listPatientCaregiverAccess(principal, instrumentedPrisma);
      const authorization = result?.authorizations.find(({ id }) => id === data.authorization.id);

      expect(queryCount).toBe(baselineQueryCount);
      expect(authorization?.scopes).toEqual([
        expect.objectContaining({ dischargeEpisodeId: data.episode.id, version: 51 }),
        expect.objectContaining({ dischargeEpisodeId: laterEpisode.id, version: 1 }),
      ]);
      expect(
        new Set(authorization?.scopes.map(({ dischargeEpisodeId }) => dischargeEpisodeId)),
      ).toHaveLength(2);
      expect(authorization?.collectionCoverage.scopes).toMatchObject({
        returned: 2,
        limit: 50,
        truncated: false,
      });
      expect(authorization?.collectionCoverage.scopes.returned).toBe(authorization?.scopes.length);
    } finally {
      await instrumentedPrisma.$disconnect();
    }
  });

  it("limita después de seleccionar más de cincuenta alcances vigentes distintos", async () => {
    const data = await setup();
    const episodeRows = Array.from({ length: 51 }, (_, index) => ({
      id: `scope-episode-${String(index).padStart(2, "0")}-${randomUUID()}`,
      patientId: data.patient.id,
      dischargeDate: new Date("2026-07-24T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: data.nurse.id,
      responsibleClinicianId: data.clinician.id,
      status: "ACTIVE" as const,
      createdById: data.nurse.id,
      checkInProtocolVersionId: data.protocol.id,
    }));
    await prisma.dischargeEpisode.createMany({ data: episodeRows });
    await prisma.caregiverAuthorizationScope.createMany({
      data: episodeRows.map((episode) => ({
        caregiverAuthorizationId: data.authorization.id,
        dischargeEpisodeId: episode.id,
        version: 1,
        capabilities: ["VIEW_PLAN_SECTIONS" as const],
        allowedPlanSections: ["WARNING_SIGNS" as const],
        authorizedResourceKeys: [],
        actorUserId: data.patientUser.id,
      })),
    });
    const principal = {
      userId: data.patientUser.id,
      roles: ["patient" as const],
      sessionId: randomUUID(),
    };

    const first = await listPatientCaregiverAccess(principal);
    const second = await listPatientCaregiverAccess(principal);
    const firstAuthorization = first?.authorizations.find(({ id }) => id === data.authorization.id);
    const secondAuthorization = second?.authorizations.find(
      ({ id }) => id === data.authorization.id,
    );

    expect(firstAuthorization?.scopes).toHaveLength(50);
    expect(firstAuthorization?.collectionCoverage.scopes).toMatchObject({
      returned: 50,
      limit: 50,
      truncated: true,
    });
    expect(firstAuthorization?.collectionCoverage.scopes.returned).toBe(
      firstAuthorization?.scopes.length,
    );
    expect(
      new Set(firstAuthorization?.scopes.map(({ dischargeEpisodeId }) => dischargeEpisodeId)).size,
    ).toBe(50);
    expect(secondAuthorization?.scopes.map(({ dischargeEpisodeId }) => dischargeEpisodeId)).toEqual(
      firstAuthorization?.scopes.map(({ dischargeEpisodeId }) => dischargeEpisodeId),
    );
  });

  it("resuelve autorizaciones en batch sin consultas por fila", async () => {
    const data = await setup();
    const instrumentedPrisma = new PrismaClient({
      log: [{ emit: "event", level: "query" }],
    });
    let queryCount = 0;
    instrumentedPrisma.$on("query", () => {
      queryCount += 1;
    });
    const principal = {
      userId: data.patientUser.id,
      roles: ["patient" as const],
      sessionId: randomUUID(),
    };
    try {
      const first = await listPatientCaregiverAccess(principal, instrumentedPrisma);
      const oneAuthorizationQueryCount = queryCount;
      expect(first?.authorizations).toHaveLength(1);

      const secondCaregiver = await syntheticUser("caregiver");
      await prisma.caregiverAuthorization.create({
        data: {
          subjectUserId: data.patientUser.id,
          caregiverUserId: secondCaregiver.id,
          state: "ACTIVE",
          scope: "caregiver:portal",
          policyVersionId: data.policy.id,
          actorUserId: data.patientUser.id,
          expiresAt: new Date("2026-08-21T00:00:00.000Z"),
          origin: "DEMO_UI",
          evidenceType: "RECORDED_INTERACTION",
          evidenceRef: "SYNTHETIC-BATCH-AUTHORIZATION",
          recordedAt: new Date("2026-07-21T09:05:00.000Z"),
        },
      });

      queryCount = 0;
      const result = await listPatientCaregiverAccess(principal, instrumentedPrisma);
      expect(result?.authorizations).toHaveLength(2);
      expect(queryCount).toBe(oneAuthorizationQueryCount);
    } finally {
      await instrumentedPrisma.$disconnect();
    }
  });

  it("rechaza por SQL directo cada combinación relacional imposible", async () => {
    const context = await setup();
    const otherCaregiver = await syntheticUser("caregiver");
    const otherProfile = await prisma.caregiverProfile.create({
      data: {
        caregiverUserId: otherCaregiver.id,
        externalPseudonymousId: `cg_${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      },
    });
    const parallelAuthorization = await prisma.caregiverAuthorization.create({
      data: {
        subjectUserId: context.patientUser.id,
        caregiverUserId: context.caregiverUser.id,
        state: "ACTIVE",
        scope: "caregiver:portal",
        policyVersionId: context.policy.id,
        actorUserId: context.patientUser.id,
        expiresAt: new Date("2026-08-21T00:00:00.000Z"),
        origin: "DEMO_UI",
        evidenceType: "RECORDED_INTERACTION",
        evidenceRef: "SYNTHETIC-PARALLEL-AUTHORIZATION",
      },
    });
    const otherPatientUser = await syntheticUser("patient");
    const otherPatient = await prisma.patient.create({
      data: {
        externalPseudonymousId: `synthetic-${randomUUID()}`,
        isSynthetic: true,
        identityVerificationState: "VERIFIED",
        identityVerificationPolicyVersionId: context.patient.identityVerificationPolicyVersionId,
        identityVerifiedAt: new Date(),
        identityVerifiedById: context.admin.id,
        createdById: context.nurse.id,
        portalUserId: otherPatientUser.id,
      },
    });
    const otherSubjectEpisode = await createEpisode(context, otherPatient.id);
    const fresh = await createInvitation(context);
    await prisma.caregiverInvitation.update({
      where: { id: fresh.invitation.id },
      data: { consumedAt: new Date("2026-07-21T11:00:00.000Z") },
    });
    const validSession = await prisma.caregiverSession.findFirstOrThrow({
      where: { caregiverAuthorizationId: context.authorization.id },
    });
    const before = {
      invitations: await prisma.caregiverInvitation.count(),
      scopes: await prisma.caregiverAuthorizationScope.count(),
      sessions: await prisma.caregiverSession.count(),
      observations: await prisma.caregiverObservation.count(),
      audits: await prisma.caregiverAccessAudit.count(),
    };

    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_invitations" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id",
          "invitation_token_hash", "created_by_id", "created_at", "expires_at"
        ) VALUES (
          ${randomUUID()}, ${context.authorization.id}, ${otherProfile.id}, ${context.episode.id},
          ${sha256(`bad-profile-${randomUUID()}`)}, ${context.patientUser.id},
          ${new Date("2026-07-21T10:00:00.000Z")}, ${new Date("2026-07-21T13:00:00.000Z")}
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_access_audits" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "caregiver_session_id",
          "action", "outcome", "resource_type", "resource_id", "correlation_id"
        ) VALUES (
          ${randomUUID()}, ${parallelAuthorization.id}, ${context.profile.id}, ${validSession.id},
          'SESSION_DENIED', 'DENIED', 'CaregiverSession', ${validSession.id}, ${randomUUID()}::uuid
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_invitations" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id",
          "invitation_token_hash", "created_by_id", "created_at", "expires_at"
        ) VALUES (
          ${randomUUID()}, ${context.authorization.id}, ${context.profile.id}, ${otherSubjectEpisode.id},
          ${sha256(`bad-episode-${randomUUID()}`)}, ${context.patientUser.id},
          ${new Date("2026-07-21T10:00:00.000Z")}, ${new Date("2026-07-21T13:00:00.000Z")}
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_authorization_scopes" (
          "id", "caregiver_authorization_id", "discharge_episode_id", "version",
          "capabilities", "allowed_plan_sections", "authorized_resource_keys", "actor_user_id"
        ) VALUES (
          ${randomUUID()}, ${context.authorization.id}, ${otherSubjectEpisode.id}, 1,
          ARRAY['SEND_OBSERVATIONS']::"CaregiverCapability"[],
          ARRAY[]::"SafetyPlanStep"[], ARRAY[]::TEXT[], ${context.patientUser.id}
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_sessions" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id",
          "invitation_id", "session_token_hash", "created_at", "expires_at"
        ) VALUES (
          ${randomUUID()}, ${parallelAuthorization.id}, ${context.profile.id}, ${context.episode.id},
          ${fresh.invitation.id}, ${sha256(`bad-session-auth-${randomUUID()}`)},
          ${new Date("2026-07-21T11:00:00.000Z")}, ${new Date("2026-07-21T20:00:00.000Z")}
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_sessions" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id",
          "invitation_id", "session_token_hash", "created_at", "expires_at"
        ) VALUES (
          ${randomUUID()}, ${context.authorization.id}, ${otherProfile.id}, ${context.episode.id},
          ${fresh.invitation.id}, ${sha256(`bad-session-profile-${randomUUID()}`)},
          ${new Date("2026-07-21T11:00:00.000Z")}, ${new Date("2026-07-21T20:00:00.000Z")}
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_observations" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "caregiver_session_id",
          "discharge_episode_id", "content", "submitted_at"
        ) VALUES (
          ${randomUUID()}, ${parallelAuthorization.id}, ${context.profile.id}, ${validSession.id},
          ${context.episode.id}, 'Observación sintética inválida', ${testNow}
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_observations" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "caregiver_session_id",
          "discharge_episode_id", "content", "submitted_at"
        ) VALUES (
          ${randomUUID()}, ${context.authorization.id}, ${otherProfile.id}, ${validSession.id},
          ${context.episode.id}, 'Observación sintética inválida', ${testNow}
        )
      `),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "caregiver_observations" (
          "id", "caregiver_authorization_id", "caregiver_profile_id", "caregiver_session_id",
          "discharge_episode_id", "content", "submitted_at"
        ) VALUES (
          ${randomUUID()}, ${context.authorization.id}, ${context.profile.id}, ${validSession.id},
          ${otherSubjectEpisode.id}, 'Observación sintética inválida', ${testNow}
        )
      `),
    ).rejects.toThrow();

    await expect(prisma.caregiverInvitation.count()).resolves.toBe(before.invitations);
    await expect(prisma.caregiverAuthorizationScope.count()).resolves.toBe(before.scopes);
    await expect(prisma.caregiverSession.count()).resolves.toBe(before.sessions);
    await expect(prisma.caregiverObservation.count()).resolves.toBe(before.observations);
    await expect(prisma.caregiverAccessAudit.count()).resolves.toBe(before.audits);
  });

  it("mantiene scopes N+1 aislados por autorización y episodio", async () => {
    const context = await setup();
    const episodeB = await createEpisode(context);
    await prisma.caregiverAuthorizationScope.create({
      data: {
        caregiverAuthorizationId: context.authorization.id,
        dischargeEpisodeId: episodeB.id,
        version: 1,
        capabilities: ["VIEW_AUTHORIZED_RESOURCES"],
        allowedPlanSections: [],
        authorizedResourceKeys: ["demo-caregiver-boundaries"],
        actorUserId: context.patientUser.id,
      },
    });
    const invitationB = await createInvitation(context, { episodeId: episodeB.id });
    const tokenB = `caregiver-episode-b-${randomUUID()}`;
    await createSessionForInvitation(context, invitationB.invitation.id, tokenB, episodeB.id);

    const changed = await new ChangeCaregiverScopeService(
      new PrismaCaregiverAccessUnitOfWork(),
      () => testNow,
    ).execute({
      actor: { userId: context.patientUser.id, roles: ["patient"], sessionId: randomUUID() },
      caregiverAuthorizationId: context.authorization.id,
      episodeId: context.episode.id,
      expectedVersion: 1,
      scope: {
        capabilities: ["SEND_OBSERVATIONS"],
        allowedPlanSections: [],
        authorizedResourceKeys: [],
      },
      correlationId: randomUUID(),
    });
    expect(changed).toMatchObject({ dischargeEpisodeId: context.episode.id, version: 2 });

    const [viewA, viewB] = await Promise.all([
      getCaregiverPortalView({
        rawSessionToken: context.rawTokens[0]!,
        correlationId: randomUUID(),
        now: testNow,
      }),
      getCaregiverPortalView({
        rawSessionToken: tokenB,
        correlationId: randomUUID(),
        now: testNow,
      }),
    ]);
    expect(viewA).toMatchObject({ scopeVersion: 2, resources: [] });
    expect(viewB).toMatchObject({
      scopeVersion: 1,
      resources: [expect.objectContaining({ key: "demo-caregiver-boundaries" })],
    });
    await expect(
      prisma.caregiverAuthorizationScope.groupBy({
        by: ["dischargeEpisodeId"],
        where: { caregiverAuthorizationId: context.authorization.id },
        _count: true,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dischargeEpisodeId: context.episode.id, _count: 2 }),
        expect.objectContaining({ dischargeEpisodeId: episodeB.id, _count: 1 }),
      ]),
    );
  });

  it("invalida logout en servidor y deniega reutilizar el mismo token", async () => {
    const context = await setup();
    const rawSessionToken = context.rawTokens[0]!;
    await expect(
      logoutCaregiverSession({ rawSessionToken, correlationId: randomUUID(), now: testNow }),
    ).resolves.toBe(true);
    await expect(
      getCaregiverPortalView({ rawSessionToken, correlationId: randomUUID(), now: testNow }),
    ).resolves.toBeNull();
    const persisted = await prisma.caregiverSession.findUniqueOrThrow({
      where: { sessionTokenHash: sha256(rawSessionToken) },
    });
    expect(persisted.revokedAt).toEqual(testNow);
    await expect(
      prisma.caregiverAccessAudit.count({
        where: { caregiverSessionId: persisted.id, action: "SESSION_LOGGED_OUT" },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: { resourceId: persisted.id, action: "CAREGIVER_SESSION_LOGGED_OUT" },
      }),
    ).resolves.toBe(1);
  });

  it("hace atómica la doble aceptación y conserva consumedAt ante denegaciones", async () => {
    const concurrent = await setup();
    const valid = await createInvitation(concurrent);
    const accept = () =>
      new AcceptCaregiverInvitationService(
        new PrismaCaregiverAccessUnitOfWork(),
        secureSessionTokenIssuer,
        demoTtl,
        () => testNow,
      ).execute({
        actor: {
          userId: concurrent.caregiverUser.id,
          roles: ["caregiver"],
          sessionId: randomUUID(),
        },
        invitationTokenHash: sha256(valid.rawToken),
        correlationId: randomUUID(),
      });
    const attempts = await Promise.allSettled([accept(), accept()]);
    expect(attempts.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === "rejected")).toHaveLength(1);
    await expect(
      prisma.caregiverSession.count({ where: { invitationId: valid.invitation.id } }),
    ).resolves.toBe(1);

    const wrongIdentity = await setup();
    const wrongInvitation = await createInvitation(wrongIdentity);
    const otherCaregiver = await syntheticUser("caregiver");
    await expect(
      new AcceptCaregiverInvitationService(
        new PrismaCaregiverAccessUnitOfWork(),
        secureSessionTokenIssuer,
        demoTtl,
        () => testNow,
      ).execute({
        actor: { userId: otherCaregiver.id, roles: ["caregiver"], sessionId: randomUUID() },
        invitationTokenHash: sha256(wrongInvitation.rawToken),
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
    await expect(
      prisma.caregiverInvitation.findUniqueOrThrow({
        where: { id: wrongInvitation.invitation.id },
      }),
    ).resolves.toMatchObject({ consumedAt: null });

    const revokedRole = await setup();
    const roleInvitation = await createInvitation(revokedRole);
    await prisma.roleAssignment.updateMany({
      where: { userId: revokedRole.caregiverUser.id, role: "caregiver", revokedAt: null },
      data: { revokedAt: new Date("2026-07-21T11:30:00.000Z") },
    });
    await expect(
      new AcceptCaregiverInvitationService(
        new PrismaCaregiverAccessUnitOfWork(),
        secureSessionTokenIssuer,
        demoTtl,
        () => testNow,
      ).execute({
        actor: {
          userId: revokedRole.caregiverUser.id,
          roles: ["caregiver"],
          sessionId: randomUUID(),
        },
        invitationTokenHash: sha256(roleInvitation.rawToken),
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
    await expect(
      prisma.caregiverInvitation.findUniqueOrThrow({ where: { id: roleInvitation.invitation.id } }),
    ).resolves.toMatchObject({ consumedAt: null });

    const revokedAuthorization = await setup();
    const revokedInvitation = await createInvitation(revokedAuthorization);
    await new RecordLegalDecisionService(new PrismaLegalRecordsUnitOfWork(), () => testNow).revoke({
      actor: {
        userId: revokedAuthorization.patientUser.id,
        roles: ["patient"],
        sessionId: randomUUID(),
      },
      targetType: "CAREGIVER_AUTHORIZATION",
      targetRecordId: revokedAuthorization.authorization.id,
      correlationId: randomUUID(),
    });
    await expect(
      new AcceptCaregiverInvitationService(
        new PrismaCaregiverAccessUnitOfWork(),
        secureSessionTokenIssuer,
        demoTtl,
        () => new Date("2026-07-21T12:01:00.000Z"),
      ).execute({
        actor: {
          userId: revokedAuthorization.caregiverUser.id,
          roles: ["caregiver"],
          sessionId: randomUUID(),
        },
        invitationTokenHash: sha256(revokedInvitation.rawToken),
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
    await expect(
      prisma.caregiverInvitation.findUniqueOrThrow({
        where: { id: revokedInvitation.invitation.id },
      }),
    ).resolves.toMatchObject({ consumedAt: null });

    const expired = await setup();
    const expiredInvitation = await createInvitation(expired, {
      expiresAt: new Date("2026-07-21T11:00:00.000Z"),
    });
    await expect(
      new AcceptCaregiverInvitationService(
        new PrismaCaregiverAccessUnitOfWork(),
        secureSessionTokenIssuer,
        demoTtl,
        () => testNow,
      ).execute({
        actor: {
          userId: expired.caregiverUser.id,
          roles: ["caregiver"],
          sessionId: randomUUID(),
        },
        invitationTokenHash: sha256(expiredInvitation.rawToken),
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
  });

  it("serializa lecturas y mutaciones contra una revocación concurrente confirmada", async () => {
    const portal = await setup();
    await expect(
      revokeWhileOperationIsBlocked(portal, () =>
        getCaregiverPortalView({
          rawSessionToken: portal.rawTokens[0]!,
          correlationId: randomUUID(),
          now: new Date("2026-07-21T12:01:00.000Z"),
        }),
      ),
    ).resolves.toBeNull();

    const observation = await setup();
    const observationsBefore = await prisma.caregiverObservation.count({
      where: { caregiverAuthorizationId: observation.authorization.id },
    });
    await expect(
      revokeWhileOperationIsBlocked(observation, () =>
        recordCaregiverObservation({
          rawSessionToken: observation.rawTokens[0]!,
          content: "Observación sintética concurrente que debe denegarse",
          correlationId: randomUUID(),
          now: new Date("2026-07-21T12:01:00.000Z"),
        }),
      ),
    ).resolves.toBeNull();
    await expect(
      prisma.caregiverObservation.count({
        where: { caregiverAuthorizationId: observation.authorization.id },
      }),
    ).resolves.toBe(observationsBefore);

    const acceptance = await setup();
    const invitation = await createInvitation(acceptance);
    await expect(
      revokeWhileOperationIsBlocked(acceptance, () =>
        new AcceptCaregiverInvitationService(
          new PrismaCaregiverAccessUnitOfWork(),
          secureSessionTokenIssuer,
          demoTtl,
          () => new Date("2026-07-21T12:01:00.000Z"),
        ).execute({
          actor: {
            userId: acceptance.caregiverUser.id,
            roles: ["caregiver"],
            sessionId: randomUUID(),
          },
          invitationTokenHash: sha256(invitation.rawToken),
          correlationId: randomUUID(),
        }),
      ),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
    await expect(
      prisma.caregiverInvitation.findUniqueOrThrow({ where: { id: invitation.invitation.id } }),
    ).resolves.toMatchObject({ consumedAt: null });

    const scopeChange = await setup();
    const scopesBefore = await prisma.caregiverAuthorizationScope.count({
      where: {
        caregiverAuthorizationId: scopeChange.authorization.id,
        dischargeEpisodeId: scopeChange.episode.id,
      },
    });
    await expect(
      revokeWhileOperationIsBlocked(scopeChange, () =>
        new ChangeCaregiverScopeService(
          new PrismaCaregiverAccessUnitOfWork(),
          () => new Date("2026-07-21T12:01:00.000Z"),
        ).execute({
          actor: {
            userId: scopeChange.patientUser.id,
            roles: ["patient"],
            sessionId: randomUUID(),
          },
          caregiverAuthorizationId: scopeChange.authorization.id,
          episodeId: scopeChange.episode.id,
          expectedVersion: 1,
          scope: { capabilities: [], allowedPlanSections: [], authorizedResourceKeys: [] },
          correlationId: randomUUID(),
        }),
      ),
    ).rejects.toBeInstanceOf(CaregiverAccessDeniedError);
    await expect(
      prisma.caregiverAuthorizationScope.count({
        where: {
          caregiverAuthorizationId: scopeChange.authorization.id,
          dischargeEpisodeId: scopeChange.episode.id,
        },
      }),
    ).resolves.toBe(scopesBefore);
  });

  it("filtra por campo, conserva observaciones y tumba sesiones concurrentes al revocar", async () => {
    const context = await setup();
    const before = await getCaregiverPortalView({
      rawSessionToken: context.rawTokens[0]!,
      correlationId,
      now: new Date("2026-07-21T12:00:00.000Z"),
    });
    expect(before?.planSections).toEqual([
      { step: "WARNING_SIGNS", content: "Señal sintética autorizada" },
    ]);
    expect(JSON.stringify(before)).not.toContain("fuera de scope");
    expect(JSON.stringify(before)).not.toContain("denegado por documento");
    expect(JSON.stringify(before)).not.toContain("Borrador sintético no activo");
    expect(JSON.stringify(before)).not.toContain("Nota clínica sintética");
    expect(JSON.stringify(before)).not.toContain("Respuesta de check-in sintética");
    expect(before?.tasks).toEqual([
      expect.objectContaining({ summary: "Tarea sintética asignada al cuidador" }),
    ]);
    expect(before).not.toHaveProperty("diagnoses");
    expect(before).not.toHaveProperty("clinicalNotes");
    expect(before).not.toHaveProperty("checkIns");

    const alertCountBefore = await prisma.alert.count({ where: { episodeId: context.episode.id } });
    const observation = await recordCaregiverObservation({
      rawSessionToken: context.rawTokens[0]!,
      content: "Observación sintética que requiere revisión humana",
      correlationId,
      now: new Date("2026-07-21T12:05:00.000Z"),
    });
    expect(observation).not.toBeNull();
    await expect(prisma.alert.count({ where: { episodeId: context.episode.id } })).resolves.toBe(
      alertCountBefore,
    );
    const historyBefore = {
      authorizations: await prisma.caregiverAuthorization.count({
        where: { id: context.authorization.id },
      }),
      invitations: await prisma.caregiverInvitation.count({
        where: { caregiverAuthorizationId: context.authorization.id },
      }),
      scopes: await prisma.caregiverAuthorizationScope.count({
        where: { caregiverAuthorizationId: context.authorization.id },
      }),
      sessions: await prisma.caregiverSession.count({
        where: { caregiverAuthorizationId: context.authorization.id },
      }),
      observations: await prisma.caregiverObservation.count({
        where: { caregiverAuthorizationId: context.authorization.id },
      }),
      safetyPlans: await prisma.safetyPlan.count({
        where: { dischargeEpisodeId: context.episode.id },
      }),
      episodes: await prisma.dischargeEpisode.count({ where: { id: context.episode.id } }),
      processingBasis: await prisma.processingBasisRecord.count({
        where: { subjectUserId: context.patientUser.id },
      }),
    };

    await new RecordLegalDecisionService(
      new PrismaLegalRecordsUnitOfWork(),
      () => new Date("2026-07-21T12:10:00.000Z"),
    ).revoke({
      actor: {
        userId: context.patientUser.id,
        roles: ["patient"],
        sessionId: randomUUID(),
      },
      targetType: "CAREGIVER_AUTHORIZATION",
      targetRecordId: context.authorization.id,
      correlationId,
    });

    for (const rawSessionToken of context.rawTokens) {
      await expect(
        getCaregiverPortalView({
          rawSessionToken,
          correlationId,
          now: new Date("2026-07-21T12:11:00.000Z"),
        }),
      ).resolves.toBeNull();
    }
    const [sessions, persistedObservation, authorization, scopeCount] = await Promise.all([
      prisma.caregiverSession.findMany({
        where: { caregiverAuthorizationId: context.authorization.id },
      }),
      prisma.caregiverObservation.findUnique({ where: { id: observation!.id } }),
      prisma.caregiverAuthorization.findUnique({ where: { id: context.authorization.id } }),
      prisma.caregiverAuthorizationScope.count({
        where: { caregiverAuthorizationId: context.authorization.id },
      }),
    ]);
    expect(sessions).toHaveLength(2);
    expect(sessions.every(({ revokedAt }) => revokedAt !== null)).toBe(true);
    expect(persistedObservation?.content).toContain("revisión humana");
    expect(authorization).not.toBeNull();
    expect(scopeCount).toBe(1);
    await expect(
      prisma.revocationEvent.count({
        where: {
          targetType: "CAREGIVER_AUTHORIZATION",
          targetRecordId: context.authorization.id,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      Promise.all([
        prisma.caregiverAuthorization.count({ where: { id: context.authorization.id } }),
        prisma.caregiverInvitation.count({
          where: { caregiverAuthorizationId: context.authorization.id },
        }),
        prisma.caregiverAuthorizationScope.count({
          where: { caregiverAuthorizationId: context.authorization.id },
        }),
        prisma.caregiverSession.count({
          where: { caregiverAuthorizationId: context.authorization.id },
        }),
        prisma.caregiverObservation.count({
          where: { caregiverAuthorizationId: context.authorization.id },
        }),
        prisma.safetyPlan.count({ where: { dischargeEpisodeId: context.episode.id } }),
        prisma.dischargeEpisode.count({ where: { id: context.episode.id } }),
        prisma.processingBasisRecord.count({ where: { subjectUserId: context.patientUser.id } }),
      ]),
    ).resolves.toEqual([
      historyBefore.authorizations,
      historyBefore.invitations,
      historyBefore.scopes,
      historyBefore.sessions,
      historyBefore.observations,
      historyBefore.safetyPlans,
      historyBefore.episodes,
      historyBefore.processingBasis,
    ]);
    await expect(
      prisma.caregiverObservation.delete({ where: { id: observation!.id } }),
    ).rejects.toThrow();

    const accessAudits = await prisma.caregiverAccessAudit.findMany({
      where: { caregiverAuthorizationId: context.authorization.id },
    });
    const serializedAudit = JSON.stringify(accessAudits);
    expect(serializedAudit).not.toContain("Observación sintética");
    expect(serializedAudit).not.toContain("Señal sintética");
    expect(serializedAudit).not.toContain(context.rawTokens[0]!);
    expect(serializedAudit).not.toContain(sha256(context.rawTokens[0]!));
    const generalAudits = await prisma.auditEvent.findMany({
      where: {
        resourceId: { in: [context.authorization.id, observation!.id] },
      },
    });
    const serializedGeneralAudit = JSON.stringify(generalAudits);
    expect(serializedGeneralAudit).not.toContain("Observación sintética");
    expect(serializedGeneralAudit).not.toContain("Señal sintética");
    expect(serializedGeneralAudit).not.toContain(context.rawTokens[0]!);
    expect(serializedGeneralAudit).not.toContain(sha256(context.rawTokens[0]!));
  });
});
