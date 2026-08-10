import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ActivateRuleVersionService,
  ApproveRuleVersionService,
  CreateRuleVersionService,
  EvaluateRuleService,
  ExplainableAlertConflictError,
  ExplainableAlertInvalidError,
  ReviewAlertService,
} from "@/application/alerts/manage-explainable-alerts";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { SYNTHETIC_RULE_FIXTURES } from "@/domain/alerts/synthetic-rule-fixtures";
import { prisma } from "@/infrastructure/persistence/prisma";
import {
  listVisibleAlerts,
  PrismaExplainableAlertsUnitOfWork,
} from "@/infrastructure/persistence/prisma-explainable-alerts-unit-of-work";

function actor(userId: string, role: "admin" | "nurse" | "clinician"): AuthenticatedPrincipal {
  return { userId, roles: [role], sessionId: randomUUID() };
}

async function createUser(role: "admin" | "nurse" | "clinician") {
  return prisma.user.create({
    data: {
      syntheticAlias: `alert-${role}-${randomUUID()}`,
      displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
      isSynthetic: true,
      roleAssignments: { create: { role } },
    },
  });
}

async function setupEpisode() {
  const [admin, nurse, clinician] = await Promise.all([
    createUser("admin"),
    createUser("nurse"),
    createUser("clinician"),
  ]);
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `SYNTH-ALERT-${randomUUID()}`,
      isSynthetic: true,
      createdById: nurse.id,
    },
  });
  const protocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `synthetic-alert-protocol-${randomUUID()}`,
      versionNumber: 1,
      title: "PLANTILLA SINTÉTICA / NO APROBADA",
      state: "DRAFT",
      isSyntheticFixture: true,
      createdById: admin.id,
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-07-01T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: nurse.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  return { admin, nurse, clinician, episode };
}

async function createNonResponseSource(input: Awaited<ReturnType<typeof setupEpisode>>) {
  return prisma.$transaction(async (transaction) => {
    const protocolVersionId = input.episode.checkInProtocolVersionId;
    const batch = await transaction.checkInAssignmentBatch.create({
      data: {
        episodeId: input.episode.id,
        checkInProtocolVersionId: protocolVersionId,
        createdById: input.nurse.id,
        idempotencyKey: `source-batch:${randomUUID()}`,
        requestFingerprint: "a".repeat(64),
      },
    });
    const assignment = await transaction.checkInAssignment.create({
      data: {
        batchId: batch.id,
        episodeId: input.episode.id,
        checkInProtocolVersionId: protocolVersionId,
        sequence: 1,
        scheduledFor: new Date("2026-07-17T07:00:00.000Z"),
        windowStartsAt: new Date("2026-07-17T07:00:00.000Z"),
        windowEndsAt: new Date("2026-07-17T08:00:00.000Z"),
        createdById: input.nurse.id,
      },
    });
    const outcome = await transaction.checkInOutcome.create({
      data: {
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocolVersionId,
        type: "EXPIRED",
        recordedById: input.nurse.id,
        idempotencyKey: `source-outcome:${randomUUID()}`,
        requestFingerprint: "b".repeat(64),
        recordedAt: new Date("2026-07-17T08:00:00.000Z"),
      },
    });
    return transaction.nonResponseEvent.create({
      data: {
        outcomeId: outcome.id,
        assignmentId: assignment.id,
        checkInProtocolVersionId: protocolVersionId,
        outcomeType: "EXPIRED",
        reason: "WINDOW_EXPIRED",
        recordedById: input.nurse.id,
        recordedAt: new Date("2026-07-17T08:00:00.000Z"),
      },
    });
  });
}

describe.sequential("PostgreSQL explainable alert guarantees", () => {
  it("selecciona avisos con el orden semántico antes del límite y aísla responsables", async () => {
    const fixture = SYNTHETIC_RULE_FIXTURES[2]!;
    const users = await setupEpisode();
    const isolated = await setupEpisode();
    const unitOfWork = new PrismaExplainableAlertsUnitOfWork();
    const created = await new CreateRuleVersionService(unitOfWork).execute({
      actor: actor(users.admin.id, "admin"),
      ruleKey: `boundary-${randomUUID()}`,
      name: "Aviso sintético de frontera",
      dsl: fixture.dsl,
      correlationId: randomUUID(),
    });
    const version = await prisma.ruleVersion.findUniqueOrThrow({
      where: { id: created.ruleVersionId },
      select: {
        ruleDefinitionId: true,
        versionNumber: true,
        administrativeSeverity: true,
        reviewOwner: true,
      },
    });
    const baseTime = new Date("2026-07-01T08:00:00.000Z").getTime();
    const evaluationIds = Array.from({ length: 53 }, () => randomUUID());
    await prisma.ruleEvaluation.createMany({
      data: evaluationIds.map((id, index) => ({
        id,
        ruleDefinitionId: version.ruleDefinitionId,
        ruleVersionId: created.ruleVersionId,
        ruleVersionNumber: version.versionNumber,
        episodeId: index === 52 ? isolated.episode.id : users.episode.id,
        evaluatedById: index === 52 ? isolated.nurse.id : users.nurse.id,
        idempotencyKey: `boundary-evaluation-${index}-${randomUUID()}`,
        requestFingerprint: index.toString(16).padStart(64, "a").slice(-64),
        evaluatedAt: new Date(baseTime + index * 60_000),
        inputSnapshot: [],
        inputHash: index.toString(16).padStart(64, "b").slice(-64),
        outcome: "MATCHED",
        missingInputs: [],
      })),
    });
    const alertIds = evaluationIds.map(() => randomUUID());
    await prisma.alert.createMany({
      data: alertIds.map((id, index) => ({
        id,
        ruleDefinitionId: version.ruleDefinitionId,
        ruleVersionId: created.ruleVersionId,
        ruleVersionNumber: version.versionNumber,
        evaluationId: evaluationIds[index]!,
        episodeId: index === 52 ? isolated.episode.id : users.episode.id,
        inputReferences: [],
        explanation: "Aviso determinista sintético de frontera.",
        administrativeSeverity: version.administrativeSeverity,
        reviewOwner: version.reviewOwner,
        triggeredAt: new Date(baseTime + index * 60_000),
        currentState: index === 0 || index === 52 ? "OPEN" : "RESOLVED",
      })),
    });

    const first = await listVisibleAlerts(actor(users.nurse.id, "nurse"));
    const second = await listVisibleAlerts(actor(users.nurse.id, "nurse"));

    expect(first?.values).toHaveLength(50);
    expect(first?.coverage).toMatchObject({ returned: 50, limit: 50, truncated: true });
    expect(first?.values[0]?.id).toBe(alertIds[0]);
    expect(first?.values.map(({ id }) => id)).not.toContain(alertIds[52]);
    expect(second?.values.map(({ id }) => id)).toEqual(first?.values.map(({ id }) => id));
  });

  it("conserva versión, aprobación, evaluación y revisión como historia auditable", async () => {
    const fixture = SYNTHETIC_RULE_FIXTURES[2]!;
    const users = await setupEpisode();
    const unitOfWork = new PrismaExplainableAlertsUnitOfWork();
    const correlationId = randomUUID();
    const created = await new CreateRuleVersionService(unitOfWork).execute({
      actor: actor(users.admin.id, "admin"),
      ruleKey: `test-${randomUUID()}`,
      name: fixture.name,
      dsl: fixture.dsl,
      correlationId,
    });
    await new ApproveRuleVersionService(unitOfWork).execute({
      actor: actor(users.clinician.id, "clinician"),
      ruleVersionId: created.ruleVersionId,
      approvalReference: "SYNTHETIC-INTEGRATION-APPROVAL",
      correlationId,
    });
    await new ActivateRuleVersionService(unitOfWork).execute({
      actor: actor(users.admin.id, "admin"),
      ruleVersionId: created.ruleVersionId,
      correlationId,
    });
    const evaluationService = new EvaluateRuleService(unitOfWork);
    const nonResponseSource = await createNonResponseSource(users);
    const idempotencyKey = `alert-evaluation:${randomUUID()}`;
    const evaluationInput = {
      actor: actor(users.nurse.id, "nurse"),
      ruleVersionId: created.ruleVersionId,
      episodeId: users.episode.id,
      inputs: [
        {
          inputKey: "non_response_hours",
          value: 49,
          observedAt: "2026-07-17T08:00:00.000Z",
          source: {
            resourceType: "NonResponseEvent",
            resourceId: nonResponseSource.id,
            field: "elapsedHours",
            episodeId: users.episode.id,
          },
        },
      ],
      idempotencyKey,
      correlationId,
    } as const;
    const evaluated = await evaluationService.execute({
      ...evaluationInput,
      evaluatedAt: new Date("2026-07-17T12:00:00.000Z"),
    });
    expect(evaluated).toMatchObject({ outcome: "matched", idempotent: false });
    expect(evaluated.alertId).not.toBeNull();
    const storedAlert = await prisma.alert.findUniqueOrThrow({
      where: { id: evaluated.alertId! },
      select: { inputReferences: true },
    });
    expect(storedAlert.inputReferences).toEqual([
      expect.objectContaining({
        schemaVersion: 1,
        episodeId: users.episode.id,
        subject: expect.objectContaining({ kind: "ALERT" }),
        parents: expect.arrayContaining([
          expect.objectContaining({ kind: "RULE_EVALUATION" }),
          expect.objectContaining({
            kind: "CHECK_IN_NON_RESPONSE",
            terminalOutcome: "EXPIRED",
            protocolVersion: expect.objectContaining({
              resourceId: users.episode.checkInProtocolVersionId,
              versionNumber: 1,
            }),
          }),
        ]),
      }),
    ]);
    expect(JSON.stringify(storedAlert.inputReferences)).not.toContain('"value":49');
    expect(JSON.stringify(storedAlert.inputReferences)).not.toContain("explanation");
    const persistedLineage = JSON.parse(JSON.stringify(storedAlert.inputReferences)) as [
      {
        parents: Array<{
          kind: string;
          timestamps?: Record<string, string>;
          ruleInputContext?: Record<string, string>;
        }>;
      },
    ];
    const persistedSource = persistedLineage[0].parents.find(
      ({ kind }) => kind === "CHECK_IN_NON_RESPONSE",
    );
    expect(persistedSource?.timestamps).toEqual({
      recordedAt: "2026-07-17T08:00:00.000Z",
    });
    expect(persistedSource?.ruleInputContext).toEqual({
      inputKey: "non_response_hours",
      sourceField: "elapsedHours",
      observedAt: "2026-07-17T08:00:00.000Z",
      verificationStatus: "DECLARED_NOT_SOURCE_VERIFIED",
    });
    const retry = await evaluationService.execute({
      ...evaluationInput,
      evaluatedAt: new Date("2026-07-17T12:05:00.000Z"),
    });
    expect(retry).toEqual({ ...evaluated, idempotent: true });
    await expect(
      evaluationService.execute({
        ...evaluationInput,
        inputs: [{ ...evaluationInput.inputs[0], value: 50 }],
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertConflictError);
    await expect(
      prisma.alertReview.count({ where: { alertId: evaluated.alertId! } }),
    ).resolves.toBe(0);

    const reviewService = new ReviewAlertService(unitOfWork);
    const reviewInput = {
      actor: actor(users.nurse.id, "nurse"),
      alertId: evaluated.alertId!,
      expectedState: "open",
      nextState: "reviewed",
      idempotencyKey: `alert-review:${randomUUID()}`,
      correlationId,
    } as const;
    const firstReview = await reviewService.execute(reviewInput);
    const replayedReview = await reviewService.execute(reviewInput);
    expect(firstReview).toMatchObject({ idempotent: false, state: "reviewed" });
    expect(replayedReview).toEqual({ ...firstReview, idempotent: true });
    await expect(
      reviewService.execute({
        ...reviewInput,
        nextState: "dismissed-with-reason",
        reason: "Huella distinta explícita",
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertConflictError);

    const [version, evaluation, alert, reviews, audits] = await Promise.all([
      prisma.ruleVersion.findUniqueOrThrow({
        where: { id: created.ruleVersionId },
        include: { approval: true },
      }),
      prisma.ruleEvaluation.findUniqueOrThrow({ where: { id: evaluated.evaluationId } }),
      prisma.alert.findUniqueOrThrow({ where: { id: evaluated.alertId! } }),
      prisma.alertReview.findMany({ where: { alertId: evaluated.alertId! } }),
      prisma.auditEvent.findMany({ where: { correlationId } }),
    ]);
    expect(version).toMatchObject({ versionNumber: 1, state: "ACTIVE" });
    expect(version.approval?.approvedById).toBe(users.clinician.id);
    expect(evaluation).toMatchObject({
      ruleVersionNumber: 1,
      outcome: "MATCHED",
      idempotencyKey,
      inputHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(alert).toMatchObject({
      evaluationId: evaluated.evaluationId,
      ruleVersionId: created.ruleVersionId,
      ruleVersionNumber: 1,
      currentState: "REVIEWED",
      explanation: expect.stringContaining(nonResponseSource.id),
    });
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      idempotencyKey: reviewInput.idempotencyKey,
      requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(audits.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        "RULE_VERSION_CREATED",
        "RULE_VERSION_APPROVED",
        "RULE_VERSION_ACTIVATED",
        "RULE_EVALUATED",
        "ALERT_CREATED",
        "ALERT_REVIEWED",
      ]),
    );
    await expect(
      prisma.ruleEvaluation.count({
        where: { evaluatedById: users.nurse.id, idempotencyKey },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: {
          correlationId,
          action: { in: ["RULE_EVALUATED", "ALERT_CREATED"] },
        },
      }),
    ).resolves.toBe(2);
    const unknownSourceKey = `alert-evaluation-unknown-source:${randomUUID()}`;
    await expect(
      evaluationService.execute({
        ...evaluationInput,
        idempotencyKey: unknownSourceKey,
        correlationId: randomUUID(),
        inputs: [
          {
            ...evaluationInput.inputs[0],
            source: {
              ...evaluationInput.inputs[0].source,
              resourceId: randomUUID(),
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ExplainableAlertInvalidError);
    await expect(
      prisma.ruleEvaluation.count({
        where: { evaluatedById: users.nurse.id, idempotencyKey: unknownSourceKey },
      }),
    ).resolves.toBe(0);
    const concurrentKey = `alert-evaluation-concurrent:${randomUUID()}`;
    const concurrentCorrelationId = randomUUID();
    const concurrentInput = {
      ...evaluationInput,
      idempotencyKey: concurrentKey,
      correlationId: concurrentCorrelationId,
      evaluatedAt: new Date("2026-07-17T13:00:00.000Z"),
    } as const;
    const concurrentResults = await Promise.all([
      evaluationService.execute(concurrentInput),
      evaluationService.execute(concurrentInput),
    ]);
    expect(concurrentResults.map(({ idempotent }) => idempotent).sort()).toEqual([false, true]);
    expect(concurrentResults[0]?.evaluationId).toBe(concurrentResults[1]?.evaluationId);
    expect(concurrentResults[0]?.alertId).toBe(concurrentResults[1]?.alertId);
    await expect(
      prisma.ruleEvaluation.count({
        where: { evaluatedById: users.nurse.id, idempotencyKey: concurrentKey },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: {
          correlationId: concurrentCorrelationId,
          action: { in: ["RULE_EVALUATED", "ALERT_CREATED"] },
        },
      }),
    ).resolves.toBe(2);
    const reviewerRace = await Promise.allSettled([
      reviewService.execute({
        actor: actor(users.nurse.id, "nurse"),
        alertId: concurrentResults[0]!.alertId!,
        expectedState: "open",
        nextState: "reviewed",
        idempotencyKey: `alert-review-race:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      reviewService.execute({
        actor: actor(users.clinician.id, "clinician"),
        alertId: concurrentResults[0]!.alertId!,
        expectedState: "open",
        nextState: "dismissed-with-reason",
        reason: "Revisión concurrente sintética",
        idempotencyKey: `alert-review-race:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);
    expect(reviewerRace.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(reviewerRace.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(reviewerRace.find(({ status }) => status === "rejected")).toMatchObject({
      reason: expect.any(ExplainableAlertConflictError),
    });
    await expect(
      prisma.alertReview.count({ where: { alertId: concurrentResults[0]!.alertId! } }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: {
          resourceType: "Alert",
          resourceId: concurrentResults[0]!.alertId!,
          action: { in: ["ALERT_REVIEWED", "ALERT_DISMISSED"] },
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.alertReview.create({
        data: {
          alertId: evaluated.alertId!,
          fromState: "OPEN",
          toState: "DISMISSED_WITH_REASON",
          reason: "Revisión obsoleta sintética",
          reviewedById: users.nurse.id,
          idempotencyKey: `alert-review-stale:${randomUUID()}`,
          requestFingerprint: "c".repeat(64),
        },
      }),
    ).rejects.toThrow("alert review must start from the current alert state");
    await expect(
      prisma.ruleVersion.create({
        data: {
          ruleDefinitionId: version.ruleDefinitionId,
          versionNumber: 2,
          state: "DRAFT",
          basedOnVersionId: null,
          schemaVersion: fixture.dsl.schemaVersion,
          allowedInputs: JSON.parse(JSON.stringify(fixture.dsl.allowedInputs)),
          temporalWindow: JSON.parse(JSON.stringify(fixture.dsl.window)),
          condition: JSON.parse(JSON.stringify(fixture.dsl.condition)),
          administrativeSeverity: fixture.dsl.administrativeSeverity.toUpperCase() as
            "STANDARD" | "PRIORITY",
          explanation: fixture.dsl.explanation,
          reviewOwner: fixture.dsl.reviewOwner.toUpperCase() as "NURSE" | "CLINICIAN",
          createdById: users.admin.id,
        },
      }),
    ).rejects.toThrow("rule version must derive from the previous version of the same definition");

    await expect(
      prisma.ruleVersion.update({
        where: { id: created.ruleVersionId },
        data: { explanation: "No debe sobrescribir la definición histórica." },
      }),
    ).rejects.toThrow("rule version definitions are immutable");
    await expect(
      prisma.ruleEvaluation.update({
        where: { id: evaluated.evaluationId },
        data: { outcome: "NOT_MATCHED" },
      }),
    ).rejects.toThrow("explainable alert history is append-only");
  }, 20_000);
});
