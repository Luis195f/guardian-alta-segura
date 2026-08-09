import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  CreateNursingTaskService,
  UpdateNursingTaskService,
} from "@/application/workqueue/manage-nursing-tasks";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { operationalCursorPosition } from "@/domain/continuity/operational-continuity";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaNursingWorkQueueUnitOfWork } from "@/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work";
import { listOperationalContinuity } from "@/infrastructure/persistence/prisma-operational-continuity-reader";

async function professional(role: "nurse" | "clinician" | "support") {
  return prisma.user.create({
    data: {
      syntheticAlias: `continuity-${role}-${randomUUID()}`,
      displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
      isSynthetic: true,
      roleAssignments: { create: { role } },
    },
  });
}

function principal(
  userId: string,
  role: "nurse" | "clinician" | "support",
): AuthenticatedPrincipal {
  return { userId, roles: [role], sessionId: randomUUID() };
}

async function fixture() {
  const [nurse, clinician, otherNurse, otherClinician, support] = await Promise.all([
    professional("nurse"),
    professional("clinician"),
    professional("nurse"),
    professional("clinician"),
    professional("support"),
  ]);
  const protocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `continuity-protocol-${randomUUID()}`,
      versionNumber: 1,
      title: "PLANTILLA SINTÉTICA P10",
      state: "DRAFT",
      isSyntheticFixture: true,
      createdById: nurse.id,
    },
  });

  async function episode(
    alias: string,
    responsibleNurseId: string,
    responsibleClinicianId: string,
    status: "ACTIVE" | "PAUSED",
  ) {
    const patient = await prisma.patient.create({
      data: {
        externalPseudonymousId: `SYNTH-P10-${alias}-${randomUUID()}`,
        isSynthetic: true,
        createdById: responsibleNurseId,
      },
    });
    return prisma.dischargeEpisode.create({
      data: {
        patientId: patient.id,
        dischargeDate: new Date("2026-08-01T00:00:00.000Z"),
        programLengthDays: 30,
        responsibleNurseId,
        responsibleClinicianId,
        status,
        createdById: responsibleNurseId,
        checkInProtocolVersionId: protocol.id,
      },
    });
  }

  const [visibleEpisode, isolatedEpisode] = await Promise.all([
    episode("VISIBLE", nurse.id, clinician.id, "ACTIVE"),
    episode("ISOLATED", otherNurse.id, otherClinician.id, "ACTIVE"),
  ]);
  await prisma.checkInAssignmentBatch.create({
    data: {
      episodeId: visibleEpisode.id,
      checkInProtocolVersionId: protocol.id,
      createdById: nurse.id,
      idempotencyKey: `continuity-batch:${randomUUID()}`,
      requestFingerprint: "c".repeat(64),
      assignments: {
        create: {
          episodeId: visibleEpisode.id,
          checkInProtocolVersionId: protocol.id,
          sequence: 1,
          scheduledFor: new Date("2026-08-02T09:00:00.000Z"),
          windowStartsAt: new Date("2026-08-02T08:00:00.000Z"),
          windowEndsAt: new Date("2026-08-03T08:00:00.000Z"),
          createdById: nurse.id,
        },
      },
    },
  });
  const taskService = new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork());
  const eligibleTask = await taskService.execute({
    actor: principal(nurse.id, "nurse"),
    episodeId: visibleEpisode.id,
    alertId: null,
    summary: "Resumen sintético que no debe salir en la proyección P10",
    assignedToId: clinician.id,
    idempotencyKey: `continuity-task:${randomUUID()}`,
    correlationId: randomUUID(),
  });
  await taskService.execute({
    actor: principal(nurse.id, "nurse"),
    episodeId: visibleEpisode.id,
    alertId: null,
    summary: "Segunda tarea sintética para comprobar empates del orden total",
    assignedToId: clinician.id,
    idempotencyKey: `continuity-task:${randomUUID()}`,
    correlationId: randomUUID(),
  });
  const unassignedTask = await taskService.execute({
    actor: principal(nurse.id, "nurse"),
    episodeId: visibleEpisode.id,
    alertId: null,
    summary: "Tarea sintética abierta sin assignee",
    assignedToId: null,
    idempotencyKey: `continuity-task:${randomUUID()}`,
    correlationId: randomUUID(),
  });
  const resolvedTask = await taskService.execute({
    actor: principal(nurse.id, "nurse"),
    episodeId: visibleEpisode.id,
    alertId: null,
    summary: "Tarea sintética que se resolverá mediante acción humana",
    assignedToId: clinician.id,
    idempotencyKey: `continuity-task:${randomUUID()}`,
    correlationId: randomUUID(),
  });
  await new UpdateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute({
    actor: principal(nurse.id, "nurse"),
    taskId: resolvedTask.taskId,
    expectedRevision: resolvedTask.revision,
    action: { kind: "resolve", reason: "Resolución sintética verificada" },
    idempotencyKey: `continuity-task-resolution:${randomUUID()}`,
    correlationId: randomUUID(),
  });

  const definition = await prisma.ruleDefinition.create({
    data: {
      ruleKey: `continuity-rule-${randomUUID()}`,
      name: "Regla sintética P10",
      isSyntheticFixture: true,
      createdById: nurse.id,
    },
  });
  const version = await prisma.ruleVersion.create({
    data: {
      ruleDefinitionId: definition.id,
      versionNumber: 1,
      state: "DRAFT",
      schemaVersion: 1,
      allowedInputs: [{ key: "synthetic_flag", type: "boolean", required: true }],
      temporalWindow: { lookbackHours: 24 },
      condition: {
        combinator: "all",
        clauses: [{ input: "synthetic_flag", operator: "eq", value: true }],
      },
      administrativeSeverity: "STANDARD",
      explanation: "Explicación sintética P10",
      reviewOwner: "NURSE",
      createdById: nurse.id,
    },
  });
  await prisma.ruleApproval.create({
    data: {
      ruleVersionId: version.id,
      approvedById: clinician.id,
      approvalReference: `continuity-approval:${randomUUID()}`,
    },
  });
  await prisma.ruleVersion.update({ where: { id: version.id }, data: { state: "APPROVED" } });
  await prisma.ruleVersion.update({ where: { id: version.id }, data: { state: "ACTIVE" } });
  async function evaluationAndAlert(reviewOwner: "NURSE" | "CLINICIAN") {
    const evaluation = await prisma.ruleEvaluation.create({
      data: {
        ruleDefinitionId: definition.id,
        ruleVersionId: version.id,
        ruleVersionNumber: version.versionNumber,
        episodeId: visibleEpisode.id,
        evaluatedById: clinician.id,
        idempotencyKey: `continuity-evaluation:${randomUUID()}`,
        requestFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0"),
        evaluatedAt: new Date("2026-08-04T10:00:00.000Z"),
        inputSnapshot: [],
        inputHash: randomUUID().replaceAll("-", "").padEnd(64, "0"),
        outcome: "MATCHED",
        missingInputs: [],
      },
    });
    const alert = await prisma.alert.create({
      data: {
        ruleDefinitionId: definition.id,
        ruleVersionId: version.id,
        ruleVersionNumber: version.versionNumber,
        evaluationId: evaluation.id,
        episodeId: visibleEpisode.id,
        inputReferences: [],
        explanation: "Aviso sintético P10",
        administrativeSeverity: "STANDARD",
        reviewOwner,
        triggeredAt: new Date("2026-08-04T10:01:00.000Z"),
      },
    });
    return { evaluation, alert };
  }
  const openAlert = await evaluationAndAlert("CLINICIAN");
  const resolvedAlert = await evaluationAndAlert("NURSE");
  const historicalReview = await prisma.alertReview.create({
    data: {
      alertId: resolvedAlert.alert.id,
      fromState: "OPEN",
      toState: "REVIEWED",
      reason: "Revisión sintética histórica",
      reviewedById: nurse.id,
      idempotencyKey: `continuity-review:${randomUUID()}`,
      requestFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0"),
      reviewedAt: new Date("2026-08-04T11:00:00.000Z"),
    },
  });
  await prisma.alert.update({
    where: { id: resolvedAlert.alert.id },
    data: { currentState: "REVIEWED" },
  });
  const terminalReview = await prisma.alertReview.create({
    data: {
      alertId: resolvedAlert.alert.id,
      fromState: "REVIEWED",
      toState: "RESOLVED",
      reason: "Resolución sintética histórica",
      reviewedById: clinician.id,
      idempotencyKey: `continuity-review:${randomUUID()}`,
      requestFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0"),
      reviewedAt: new Date("2026-08-04T12:00:00.000Z"),
    },
  });
  await prisma.alert.update({
    where: { id: resolvedAlert.alert.id },
    data: { currentState: "RESOLVED" },
  });
  return {
    nurse,
    clinician,
    otherNurse,
    support,
    protocol,
    visibleEpisode,
    isolatedEpisode,
    eligibleTask,
    unassignedTask,
    resolvedTask,
    openAlert,
    resolvedAlert,
    historicalReview,
    terminalReview,
  };
}

describe.sequential("PostgreSQL operational continuity read model", () => {
  it("compone fuentes separadas, minimizadas y autorizadas con consultas acotadas", async () => {
    const value = await fixture();
    const rawSpy = vi.spyOn(prisma, "$queryRaw");
    const countSpy = vi.spyOn(prisma.user, "count");
    const result = await listOperationalContinuity({
      principal: principal(value.nurse.id, "nurse"),
      pageSize: 25,
      after: null,
      now: new Date("2026-08-09T12:00:00.000Z"),
    });

    expect(result).not.toBeNull();
    expect(rawSpy).toHaveBeenCalledTimes(1);
    expect(countSpy).toHaveBeenCalledTimes(1);
    const visible = result!.items.filter(({ episodeId }) => episodeId === value.visibleEpisode.id);
    expect(visible.map(({ sourceType }) => sourceType)).toEqual(
      expect.arrayContaining(["EPISODE", "CHECK_IN", "TASK", "GOVERNANCE_EVIDENCE"]),
    );
    expect([...new Set(visible.map(({ sourceType }) => sourceType))]).not.toContain("COMMITMENT");
    expect(visible.find(({ sourceType }) => sourceType === "CHECK_IN")).toMatchObject({
      administrativeState: "TECHNICALLY_OVERDUE",
      currentResponsibility: null,
    });
    expect(visible.find(({ sourceType }) => sourceType === "EPISODE")).toMatchObject({
      currentResponsibility: `Enfermería: ${value.nurse.syntheticAlias} · Profesional clínico: ${value.clinician.syntheticAlias}`,
    });
    expect(
      visible.find(({ resourceId }) => resourceId === value.openAlert.evaluation.id),
    ).toMatchObject({ sourceType: "RULE_EVALUATION", currentResponsibility: null });
    expect(
      visible.find(({ resourceId }) => resourceId === value.historicalReview.id),
    ).toMatchObject({ sourceType: "ALERT_REVIEW", currentResponsibility: null });
    expect(visible.find(({ resourceId }) => resourceId === value.terminalReview.id)).toMatchObject({
      sourceType: "ALERT_REVIEW",
      currentResponsibility: null,
    });
    expect(visible.find(({ resourceId }) => resourceId === value.openAlert.alert.id)).toMatchObject(
      {
        sourceType: "ALERT",
        administrativeState: "PENDING",
        currentResponsibility: value.clinician.syntheticAlias,
      },
    );
    expect(
      visible.find(({ resourceId }) => resourceId === value.resolvedAlert.alert.id),
    ).toMatchObject({
      sourceType: "ALERT",
      administrativeState: "RESOLVED",
      currentResponsibility: null,
    });
    expect(
      visible.find(({ resourceId }) => resourceId === value.eligibleTask.taskId),
    ).toMatchObject({
      sourceType: "TASK",
      administrativeState: "PENDING",
      currentResponsibility: value.clinician.syntheticAlias,
    });
    expect(
      visible.find(({ resourceId }) => resourceId === value.unassignedTask.taskId),
    ).toMatchObject({
      sourceType: "TASK",
      administrativeState: "PENDING",
      currentResponsibility: null,
    });
    expect(
      visible.find(({ resourceId }) => resourceId === value.resolvedTask.taskId),
    ).toMatchObject({
      sourceType: "TASK",
      administrativeState: "RESOLVED",
      currentResponsibility: null,
    });
    expect(visible.find(({ sourceType }) => sourceType === "GOVERNANCE_EVIDENCE")).toMatchObject({
      sourceState: "READ_MODEL_REFERENCE",
      administrativeState: "UPDATE_UNKNOWN",
      currentResponsibility: null,
      sourceUpdatedAt: null,
    });
    const tiedTaskIds = visible
      .filter(
        ({ sourceType, administrativeState, currentResponsibility }) =>
          sourceType === "TASK" &&
          administrativeState === "PENDING" &&
          currentResponsibility === value.clinician.syntheticAlias,
      )
      .map(({ resourceId }) => resourceId);
    expect(tiedTaskIds).toHaveLength(2);
    expect(tiedTaskIds).toEqual([...tiedTaskIds].sort());
    expect(result!.items.some(({ episodeId }) => episodeId === value.isolatedEpisode.id)).toBe(
      false,
    );
    expect(JSON.stringify(result)).not.toMatch(
      /Resumen sintético que no debe salir|inputSnapshot|shortTextValue/iu,
    );
    expect(result!.page).toMatchObject({ size: 25, hasNextPage: false, truncated: false });
    expect(result!.freshness.state).toBe("UPDATE_UNKNOWN");
    rawSpy.mockRestore();
    countSpy.mockRestore();
  });

  it("deniega support y no revela el episodio de otro profesional", async () => {
    const value = await fixture();
    await expect(
      listOperationalContinuity({
        principal: principal(value.support.id, "support"),
        pageSize: 12,
        after: null,
      }),
    ).resolves.toBeNull();
    const other = await listOperationalContinuity({
      principal: principal(value.otherNurse.id, "nurse"),
      pageSize: 25,
      after: null,
    });
    expect(other!.items.every(({ episodeId }) => episodeId === value.isolatedEpisode.id)).toBe(
      true,
    );

    const mismatchedRolePatient = await prisma.patient.create({
      data: {
        externalPseudonymousId: `SYNTH-P10-ROLE-MISMATCH-${randomUUID()}`,
        isSynthetic: true,
        createdById: value.otherNurse.id,
      },
    });
    const mismatchedRoleEpisode = await prisma.dischargeEpisode.create({
      data: {
        patientId: mismatchedRolePatient.id,
        dischargeDate: new Date("2026-08-01T00:00:00.000Z"),
        programLengthDays: 30,
        responsibleNurseId: value.otherNurse.id,
        responsibleClinicianId: value.nurse.id,
        status: "ACTIVE",
        createdById: value.otherNurse.id,
        checkInProtocolVersionId: value.protocol.id,
      },
    });
    const mismatched = await listOperationalContinuity({
      principal: principal(value.nurse.id, "nurse"),
      pageSize: 25,
      after: null,
    });
    expect(mismatched!.items.some(({ episodeId }) => episodeId === mismatchedRoleEpisode.id)).toBe(
      false,
    );
  });

  it("bloquea responsabilidades que dejan de ser elegibles sin usar actores históricos", async () => {
    const value = await fixture();
    const actor = principal(value.nurse.id, "nurse");

    await prisma.user.update({ where: { id: value.clinician.id }, data: { isActive: false } });
    const inactive = await listOperationalContinuity({
      principal: actor,
      pageSize: 25,
      after: null,
    });
    expect(
      inactive!.items.find(({ resourceId }) => resourceId === value.eligibleTask.taskId),
    ).toMatchObject({ administrativeState: "BLOCKED", currentResponsibility: null });
    expect(
      inactive!.items.find(({ resourceId }) => resourceId === value.openAlert.alert.id),
    ).toMatchObject({ administrativeState: "BLOCKED", currentResponsibility: null });
    expect(
      inactive!.items.find(
        ({ sourceType, episodeId }) =>
          sourceType === "EPISODE" && episodeId === value.visibleEpisode.id,
      )?.currentResponsibility,
    ).toBe(`Enfermería: ${value.nurse.syntheticAlias}`);

    await prisma.user.update({ where: { id: value.clinician.id }, data: { isActive: true } });
    await prisma.roleAssignment.updateMany({
      where: { userId: value.clinician.id, role: "clinician", revokedAt: null },
      data: { revokedAt: new Date("2026-08-09T13:00:00.000Z") },
    });
    await prisma.roleAssignment.create({
      data: { userId: value.clinician.id, role: "nurse" },
    });
    const wrongRole = await listOperationalContinuity({
      principal: actor,
      pageSize: 25,
      after: null,
    });
    expect(
      wrongRole!.items.find(({ resourceId }) => resourceId === value.eligibleTask.taskId),
    ).toMatchObject({ administrativeState: "BLOCKED", currentResponsibility: null });
    expect(
      wrongRole!.items.find(({ resourceId }) => resourceId === value.openAlert.alert.id),
    ).toMatchObject({ administrativeState: "BLOCKED", currentResponsibility: null });
    expect(
      wrongRole!.items.find(
        ({ sourceType, episodeId }) =>
          sourceType === "EPISODE" && episodeId === value.visibleEpisode.id,
      )?.currentResponsibility,
    ).toBe(`Enfermería: ${value.nurse.syntheticAlias}`);
  });

  it("mantiene orden total y no duplica ni amplía visibilidad tras una inserción concurrente", async () => {
    const value = await fixture();
    const actor = principal(value.nurse.id, "nurse");
    const first = await listOperationalContinuity({
      principal: actor,
      pageSize: 1,
      after: null,
      now: new Date("2026-08-09T12:00:00.000Z"),
    });
    expect(first!.page).toMatchObject({ returned: 1, hasNextPage: true, truncated: true });
    const firstItem = first!.items[0]!;

    const insertedPatient = await prisma.patient.create({
      data: {
        externalPseudonymousId: `SYNTH-P10-CONCURRENT-${randomUUID()}`,
        isSynthetic: true,
        createdById: value.nurse.id,
      },
    });
    const inserted = await prisma.dischargeEpisode.create({
      data: {
        patientId: insertedPatient.id,
        dischargeDate: new Date("2026-07-31T00:00:00.000Z"),
        programLengthDays: 30,
        responsibleNurseId: value.nurse.id,
        responsibleClinicianId: value.clinician.id,
        status: "PAUSED",
        createdById: value.nurse.id,
        checkInProtocolVersionId: value.protocol.id,
      },
    });

    const second = await listOperationalContinuity({
      principal: actor,
      pageSize: 1,
      after: operationalCursorPosition(firstItem),
      now: new Date("2026-08-09T12:00:00.000Z"),
    });
    expect(second!.items).toHaveLength(1);
    expect(second!.items[0]).not.toMatchObject({
      sourceType: firstItem.sourceType,
      resourceId: firstItem.resourceId,
    });
    expect(second!.items.some(({ episodeId }) => episodeId === inserted.id)).toBe(false);
    expect(second!.items.some(({ episodeId }) => episodeId === value.isolatedEpisode.id)).toBe(
      false,
    );
  });
});
