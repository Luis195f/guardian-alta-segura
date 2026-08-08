import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ActivateRuleVersionService,
  ApproveRuleVersionService,
  CreateRuleVersionService,
  EvaluateRuleService,
  ReviewAlertService,
} from "@/application/alerts/manage-explainable-alerts";
import { GetEpisodeGovernanceEvidenceService } from "@/application/governance/get-governance-evidence";
import { CreateNursingTaskService } from "@/application/workqueue/manage-nursing-tasks";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { PendingInstitutionalEpisodeGovernancePolicy } from "@/domain/episode/activation-policy";
import { SYNTHETIC_RULE_FIXTURES } from "@/domain/alerts/synthetic-rule-fixtures";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaExplainableAlertsUnitOfWork } from "@/infrastructure/persistence/prisma-explainable-alerts-unit-of-work";
import { PrismaGovernanceEvidenceReader } from "@/infrastructure/persistence/prisma-governance-evidence-reader";
import { PrismaNursingWorkQueueUnitOfWork } from "@/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work";

function principal(userId: string, role: "admin" | "nurse" | "clinician"): AuthenticatedPrincipal {
  return { userId, roles: [role], sessionId: randomUUID() };
}

async function user(role: "admin" | "nurse" | "clinician") {
  return prisma.user.create({
    data: {
      syntheticAlias: `evidence-${role}-${randomUUID()}`,
      displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
      isSynthetic: true,
      roleAssignments: { create: { role } },
    },
  });
}

async function setup() {
  const [admin, nurse, clinician, otherNurse, otherClinician] = await Promise.all([
    user("admin"),
    user("nurse"),
    user("clinician"),
    user("nurse"),
    user("clinician"),
  ]);
  const protocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `evidence-protocol-${randomUUID()}`,
      versionNumber: 1,
      title: "PLANTILLA SINTÉTICA PARA EVIDENCIA",
      state: "SYNTHETIC_DEMO",
      isSyntheticFixture: true,
      createdById: admin.id,
    },
  });
  async function episode(
    suffix: string,
    responsibleNurseId: string,
    responsibleClinicianId: string,
  ) {
    const patient = await prisma.patient.create({
      data: {
        externalPseudonymousId: `SYNTH-EVIDENCE-${suffix}-${randomUUID()}`,
        isSynthetic: true,
        createdById: responsibleNurseId,
      },
    });
    const created = await prisma.dischargeEpisode.create({
      data: {
        patientId: patient.id,
        dischargeDate: new Date("2026-07-27T00:00:00.000Z"),
        programLengthDays: 30,
        responsibleNurseId,
        responsibleClinicianId,
        status: "ACTIVE",
        version: 2,
        createdById: responsibleNurseId,
        checkInProtocolVersionId: protocol.id,
      },
    });
    await prisma.episodeTransition.create({
      data: {
        episodeId: created.id,
        fromStatus: "DRAFT",
        toStatus: "ACTIVE",
        actorUserId: responsibleNurseId,
        actorRole: "nurse",
        idempotencyKey: `evidence-transition:${randomUUID()}`,
        requestFingerprint: "c".repeat(64),
        resultingVersion: 2,
        occurredAt: new Date("2026-07-27T07:00:00.000Z"),
      },
    });
    return created;
  }
  const [episodeUnderReview, isolatedEpisode] = await Promise.all([
    episode("PRIMARY", nurse.id, clinician.id),
    episode("ISOLATED", otherNurse.id, otherClinician.id),
  ]);
  const batch = await prisma.checkInAssignmentBatch.create({
    data: {
      episodeId: episodeUnderReview.id,
      checkInProtocolVersionId: protocol.id,
      createdById: nurse.id,
      idempotencyKey: `evidence-batch:${randomUUID()}`,
      requestFingerprint: "d".repeat(64),
      assignments: {
        create: {
          episodeId: episodeUnderReview.id,
          checkInProtocolVersionId: protocol.id,
          createdById: nurse.id,
          sequence: 1,
          scheduledFor: new Date("2026-07-27T07:30:00.000Z"),
          windowStartsAt: new Date("2026-07-27T07:00:00.000Z"),
          windowEndsAt: new Date("2026-07-27T08:00:00.000Z"),
        },
      },
    },
    include: { assignments: true },
  });
  const assignment = batch.assignments[0]!;
  const nonResponse = await prisma.$transaction(async (transaction) => {
    const outcome = await transaction.checkInOutcome.create({
      data: {
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocol.id,
        type: "EXPIRED",
        recordedById: nurse.id,
        idempotencyKey: `evidence-outcome:${randomUUID()}`,
        requestFingerprint: "e".repeat(64),
        recordedAt: new Date("2026-07-27T08:05:00.000Z"),
      },
    });
    return transaction.nonResponseEvent.create({
      data: {
        outcomeId: outcome.id,
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocol.id,
        outcomeType: "EXPIRED",
        reason: "WINDOW_EXPIRED",
        recordedById: nurse.id,
        recordedAt: new Date("2026-07-27T08:05:00.000Z"),
      },
    });
  });
  return {
    admin,
    nurse,
    clinician,
    otherNurse,
    otherClinician,
    episodeUnderReview,
    isolatedEpisode,
    nonResponse,
  };
}

async function counts() {
  const [
    episodes,
    transitions,
    evaluations,
    alerts,
    reviews,
    tasks,
    taskEvents,
    audits,
    caregiverAudits,
  ] = await Promise.all([
    prisma.dischargeEpisode.count(),
    prisma.episodeTransition.count(),
    prisma.ruleEvaluation.count(),
    prisma.alert.count(),
    prisma.alertReview.count(),
    prisma.task.count(),
    prisma.taskEvent.count(),
    prisma.auditEvent.count(),
    prisma.caregiverAccessAudit.count(),
  ]);
  return {
    episodes,
    transitions,
    evaluations,
    alerts,
    reviews,
    tasks,
    taskEvents,
    audits,
    caregiverAudits,
  };
}

async function evidenceStateSnapshot(episodeId: string) {
  const [episode, alerts, tasks] = await Promise.all([
    prisma.dischargeEpisode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        status: true,
        version: true,
        responsibleNurseId: true,
        responsibleClinicianId: true,
        updatedAt: true,
      },
    }),
    prisma.alert.findMany({
      where: { episodeId },
      select: {
        id: true,
        evaluationId: true,
        currentState: true,
        ruleVersionId: true,
        ruleVersionNumber: true,
        triggeredAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.task.findMany({
      where: { episodeId },
      select: {
        id: true,
        alertId: true,
        currentState: true,
        assignedToId: true,
        revision: true,
        resolvedById: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);
  const alertIds = alerts.map(({ id }) => id);
  const evaluationIds = alerts.map(({ evaluationId }) => evaluationId);
  const taskIds = tasks.map(({ id }) => id);
  const [reviews, taskEvents, audits] = await Promise.all([
    prisma.alertReview.findMany({
      where: { alertId: { in: alertIds } },
      select: {
        id: true,
        alertId: true,
        fromState: true,
        toState: true,
        reviewedById: true,
        reviewedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.taskEvent.findMany({
      where: { taskId: { in: taskIds } },
      select: {
        id: true,
        taskId: true,
        type: true,
        fromState: true,
        toState: true,
        fromAssignedToId: true,
        toAssignedToId: true,
        actorUserId: true,
        actorRole: true,
        resultingRevision: true,
        occurredAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: {
        OR: [
          { resourceType: "DischargeEpisode", resourceId: episodeId },
          { resourceType: "RuleEvaluation", resourceId: { in: evaluationIds } },
          { resourceType: "Alert", resourceId: { in: alertIds } },
          { resourceType: "Task", resourceId: { in: taskIds } },
        ],
      },
      select: {
        id: true,
        action: true,
        outcome: true,
        actorUserId: true,
        actorRole: true,
        resourceType: true,
        resourceId: true,
        correlationId: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);
  return { episode, alerts, reviews, tasks, taskEvents, audits };
}

describe.sequential("PostgreSQL governance evidence projection", () => {
  it("reconstruye una cadena sintética real, conserva historia revocada y no muta tablas", async () => {
    const fixture = await setup();
    const alertUnitOfWork = new PrismaExplainableAlertsUnitOfWork();
    const ruleFixture = SYNTHETIC_RULE_FIXTURES[2]!;
    const rule = await new CreateRuleVersionService(alertUnitOfWork).execute({
      actor: principal(fixture.admin.id, "admin"),
      ruleKey: `evidence-rule-${randomUUID()}`,
      name: "Aviso sintético de evidencia",
      dsl: ruleFixture.dsl,
      correlationId: randomUUID(),
    });
    await new ApproveRuleVersionService(alertUnitOfWork).execute({
      actor: principal(fixture.clinician.id, "clinician"),
      ruleVersionId: rule.ruleVersionId,
      approvalReference: "SYNTHETIC-EVIDENCE-TEST",
      correlationId: randomUUID(),
    });
    await new ActivateRuleVersionService(alertUnitOfWork).execute({
      actor: principal(fixture.admin.id, "admin"),
      ruleVersionId: rule.ruleVersionId,
      correlationId: randomUUID(),
    });
    const evaluation = await new EvaluateRuleService(alertUnitOfWork).execute({
      actor: principal(fixture.nurse.id, "nurse"),
      ruleVersionId: rule.ruleVersionId,
      episodeId: fixture.episodeUnderReview.id,
      inputs: [
        {
          inputKey: "non_response_hours",
          value: 48,
          observedAt: "2026-07-27T08:05:00.000Z",
          source: {
            resourceType: "NonResponseEvent",
            resourceId: fixture.nonResponse.id,
            field: "elapsedHours",
            episodeId: fixture.episodeUnderReview.id,
          },
        },
      ],
      idempotencyKey: `evidence-evaluation:${randomUUID()}`,
      correlationId: randomUUID(),
      evaluatedAt: new Date("2026-07-27T08:10:00.000Z"),
    });
    const review = await new ReviewAlertService(alertUnitOfWork).execute({
      actor: principal(fixture.nurse.id, "nurse"),
      alertId: evaluation.alertId!,
      expectedState: "open",
      nextState: "reviewed",
      idempotencyKey: `evidence-alert-review:${randomUUID()}`,
      correlationId: randomUUID(),
      now: new Date("2026-07-27T08:20:00.000Z"),
    });
    const derivedTask = await new CreateNursingTaskService(
      new PrismaNursingWorkQueueUnitOfWork(),
      () => new Date("2026-07-27T08:30:00.000Z"),
    ).execute({
      actor: principal(fixture.nurse.id, "nurse"),
      episodeId: fixture.episodeUnderReview.id,
      alertId: evaluation.alertId,
      summary: "Contenido sintético que la evidencia no debe copiar",
      assignedToId: fixture.clinician.id,
      idempotencyKey: `evidence-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const isolatedTask = await new CreateNursingTaskService(
      new PrismaNursingWorkQueueUnitOfWork(),
    ).execute({
      actor: principal(fixture.otherNurse.id, "nurse"),
      episodeId: fixture.isolatedEpisode.id,
      alertId: null,
      summary: "Tarea humana directa en otro episodio",
      assignedToId: fixture.otherNurse.id,
      idempotencyKey: `isolated-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    await prisma.roleAssignment.updateMany({
      where: { userId: fixture.clinician.id, role: "clinician", revokedAt: null },
      data: { revokedAt: new Date("2026-07-27T09:00:00.000Z") },
    });

    const before = await counts();
    const stateBefore = await evidenceStateSnapshot(fixture.episodeUnderReview.id);
    const view = await new GetEpisodeGovernanceEvidenceService(
      new PrismaGovernanceEvidenceReader(new PendingInstitutionalEpisodeGovernancePolicy()),
    ).execute({
      actor: principal(fixture.nurse.id, "nurse"),
      episodeId: fixture.episodeUnderReview.id,
      correlationId: randomUUID(),
      now: new Date("2026-07-27T09:30:00.000Z"),
    });
    const after = await counts();
    const stateAfter = await evidenceStateSnapshot(fixture.episodeUnderReview.id);

    expect(after).toEqual(before);
    expect(stateAfter).toEqual(stateBefore);
    expect(view.episode.id).toBe(fixture.episodeUnderReview.id);
    expect(view.alerts[0]).toMatchObject({
      alertId: evaluation.alertId,
      evaluation: { evaluationId: evaluation.evaluationId },
      humanReviews: [{ reviewId: review.reviewId }],
      integrity: { status: "COMPLETE" },
    });
    expect(view.tasks[0]?.accountability).toMatchObject({
      taskId: derivedTask.taskId,
      consistencyStatus: "VALID",
      currentAssigneeEligibility: "NOT_CURRENTLY_AUTHORIZED",
      blockers: ["CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED"],
    });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("Contenido sintético que la evidencia no debe copiar");
    expect(serialized).not.toContain(isolatedTask.taskId);
    expect(view.auditReferences.every(({ resourceId }) => resourceId !== isolatedTask.taskId)).toBe(
      true,
    );
    expect(
      view.auditReferences.every(
        ({ resourceType, resourceId }) =>
          (resourceType === "DischargeEpisode" && resourceId === fixture.episodeUnderReview.id) ||
          (resourceType === "RuleEvaluation" && resourceId === evaluation.evaluationId) ||
          (resourceType === "Alert" && resourceId === evaluation.alertId) ||
          (resourceType === "Task" && resourceId === derivedTask.taskId),
      ),
    ).toBe(true);
  });

  it("permite al clinician responsable y no devuelve fuentes a otro profesional", async () => {
    const fixture = await setup();
    const reader = new PrismaGovernanceEvidenceReader(
      new PendingInstitutionalEpisodeGovernancePolicy(),
    );
    const input = {
      episodeId: fixture.episodeUnderReview.id,
      correlationId: randomUUID(),
      evaluatedAt: new Date("2026-07-27T10:00:00.000Z"),
    };
    await expect(
      reader.readAuthorizedEpisodeEvidenceSnapshot({
        ...input,
        actorUserId: fixture.clinician.id,
        actorProfessionalRoles: ["clinician"],
      }),
    ).resolves.toMatchObject({
      source: { episode: { id: fixture.episodeUnderReview.id } },
      governance: { responsibleClinician: { userId: fixture.clinician.id, active: true } },
    });
    await expect(
      reader.readAuthorizedEpisodeEvidenceSnapshot({
        ...input,
        actorUserId: fixture.otherNurse.id,
        actorProfessionalRoles: ["nurse"],
      }),
    ).resolves.toBeNull();
  });

  it("mantiene Task y governance en el mismo snapshot ante una creación concurrente", async () => {
    const fixture = await setup();
    let evidenceRead!: () => void;
    let continueComposition!: () => void;
    const evidenceWasRead = new Promise<void>((resolve) => {
      evidenceRead = resolve;
    });
    const mayContinue = new Promise<void>((resolve) => {
      continueComposition = resolve;
    });
    const coordinatedReader = new PrismaGovernanceEvidenceReader(
      new PendingInstitutionalEpisodeGovernancePolicy(),
      async () => {
        evidenceRead();
        await mayContinue;
      },
    );
    const composition = new GetEpisodeGovernanceEvidenceService(coordinatedReader).execute({
      actor: principal(fixture.nurse.id, "nurse"),
      episodeId: fixture.episodeUnderReview.id,
      correlationId: randomUUID(),
      now: new Date("2026-07-27T10:00:00.000Z"),
    });

    await evidenceWasRead;
    const task = await new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute(
      {
        actor: principal(fixture.nurse.id, "nurse"),
        episodeId: fixture.episodeUnderReview.id,
        alertId: null,
        summary: "Tarea sintética creada en la barrera pre-fix",
        assignedToId: fixture.nurse.id,
        idempotencyKey: `mixed-snapshot-task:${randomUUID()}`,
        correlationId: randomUUID(),
      },
    );
    continueComposition();
    const view = await composition;

    expect(view.tasks.some(({ accountability }) => accountability.taskId === task.taskId)).toBe(
      false,
    );
    expect(
      view.governance.openObligations.some(
        (obligation) => obligation.kind === "TASK" && obligation.resourceId === task.taskId,
      ),
    ).toBe(false);
    expect(view.episode.version).toBe(2);
  });

  it("mantiene elegibilidad y governance en el mismo snapshot ante revocación concurrente", async () => {
    const fixture = await setup();
    const task = await new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute(
      {
        actor: principal(fixture.nurse.id, "nurse"),
        episodeId: fixture.episodeUnderReview.id,
        alertId: null,
        summary: "Tarea sintética para carrera de rol",
        assignedToId: fixture.clinician.id,
        idempotencyKey: `mixed-snapshot-role:${randomUUID()}`,
        correlationId: randomUUID(),
      },
    );
    let evidenceRead!: () => void;
    let continueComposition!: () => void;
    const evidenceWasRead = new Promise<void>((resolve) => {
      evidenceRead = resolve;
    });
    const mayContinue = new Promise<void>((resolve) => {
      continueComposition = resolve;
    });
    const coordinatedReader = new PrismaGovernanceEvidenceReader(
      new PendingInstitutionalEpisodeGovernancePolicy(),
      async () => {
        evidenceRead();
        await mayContinue;
      },
    );
    const composition = new GetEpisodeGovernanceEvidenceService(coordinatedReader).execute({
      actor: principal(fixture.nurse.id, "nurse"),
      episodeId: fixture.episodeUnderReview.id,
      correlationId: randomUUID(),
      now: new Date("2026-07-27T10:00:00.000Z"),
    });

    await evidenceWasRead;
    await prisma.roleAssignment.updateMany({
      where: { userId: fixture.clinician.id, role: "clinician", revokedAt: null },
      data: { revokedAt: new Date("2026-07-27T09:59:00.000Z") },
    });
    continueComposition();
    const view = await composition;
    const projectedTask = view.tasks.find(
      ({ accountability }) => accountability.taskId === task.taskId,
    );

    expect(projectedTask?.accountability.currentAssigneeEligibility).toBe("CURRENTLY_AUTHORIZED");
    expect(view.governance.responsibleClinician.active).toBe(true);
    expect(view.episode.version).toBe(2);
  });
});
