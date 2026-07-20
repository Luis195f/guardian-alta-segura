import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  ActivateRuleVersionService,
  ApproveRuleVersionService,
  CreateRuleVersionService,
  EvaluateRuleService,
  ReviewAlertService,
} from "@/application/alerts/manage-explainable-alerts";
import {
  CreateNursingTaskService,
  NursingTaskConflictError,
  NursingTaskDeniedError,
  UpdateNursingTaskService,
} from "@/application/workqueue/manage-nursing-tasks";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { SYNTHETIC_RULE_FIXTURES } from "@/domain/alerts/synthetic-rule-fixtures";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaExplainableAlertsUnitOfWork } from "@/infrastructure/persistence/prisma-explainable-alerts-unit-of-work";
import {
  listNursingWorkQueue,
  PrismaNursingWorkQueueUnitOfWork,
} from "@/infrastructure/persistence/prisma-nursing-workqueue-unit-of-work";

function principal(userId: string, role: "admin" | "nurse" | "clinician"): AuthenticatedPrincipal {
  return { userId, roles: [role], sessionId: randomUUID() };
}

async function user(role: "admin" | "nurse" | "clinician") {
  return prisma.user.create({
    data: {
      syntheticAlias: `queue-${role}-${randomUUID()}`,
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
      protocolKey: `queue-protocol-${randomUUID()}`,
      versionNumber: 1,
      title: "PLANTILLA SINTÉTICA PARA COLA",
      state: "DRAFT",
      isSyntheticFixture: true,
      createdById: admin.id,
    },
  });
  async function episode(
    suffix: string,
    responsibleNurseId: string,
    responsibleClinicianId: string,
    status: "ACTIVE" | "PAUSED",
    dischargeDate: string,
  ) {
    const patient = await prisma.patient.create({
      data: {
        externalPseudonymousId: `SYNTH-QUEUE-${suffix}-${randomUUID()}`,
        isSynthetic: true,
        createdById: responsibleNurseId,
      },
    });
    return prisma.dischargeEpisode.create({
      data: {
        patientId: patient.id,
        dischargeDate: new Date(dischargeDate),
        programLengthDays: 30,
        responsibleNurseId,
        responsibleClinicianId,
        status,
        createdById: responsibleNurseId,
        checkInProtocolVersionId: protocol.id,
      },
    });
  }
  const [activeEpisode, pausedEpisode, isolatedEpisode] = await Promise.all([
    episode("ACTIVE", nurse.id, clinician.id, "ACTIVE", "2026-07-10T00:00:00.000Z"),
    episode("PAUSED", nurse.id, clinician.id, "PAUSED", "2026-07-15T00:00:00.000Z"),
    episode("ISOLATED", otherNurse.id, otherClinician.id, "ACTIVE", "2026-07-12T00:00:00.000Z"),
  ]);
  await prisma.checkInAssignmentBatch.create({
    data: {
      episodeId: activeEpisode.id,
      checkInProtocolVersionId: protocol.id,
      createdById: nurse.id,
      idempotencyKey: `queue-batch:${randomUUID()}`,
      requestFingerprint: "a".repeat(64),
      assignments: {
        create: [
          {
            episodeId: activeEpisode.id,
            checkInProtocolVersionId: protocol.id,
            createdById: nurse.id,
            sequence: 1,
            scheduledFor: new Date("2026-07-18T09:00:00.000Z"),
            windowStartsAt: new Date("2026-07-18T08:00:00.000Z"),
            windowEndsAt: new Date("2026-07-19T08:00:00.000Z"),
          },
          {
            episodeId: activeEpisode.id,
            checkInProtocolVersionId: protocol.id,
            createdById: nurse.id,
            sequence: 2,
            scheduledFor: new Date("2026-07-20T09:00:00.000Z"),
            windowStartsAt: new Date("2026-07-20T08:00:00.000Z"),
            windowEndsAt: new Date("2026-07-21T08:00:00.000Z"),
          },
          {
            episodeId: activeEpisode.id,
            checkInProtocolVersionId: protocol.id,
            createdById: nurse.id,
            sequence: 3,
            scheduledFor: new Date("2026-07-22T09:00:00.000Z"),
            windowStartsAt: new Date("2026-07-22T08:00:00.000Z"),
            windowEndsAt: new Date("2026-07-23T08:00:00.000Z"),
          },
          {
            episodeId: activeEpisode.id,
            checkInProtocolVersionId: protocol.id,
            createdById: nurse.id,
            sequence: 4,
            scheduledFor: new Date("2026-07-25T09:00:00.000Z"),
            windowStartsAt: new Date("2026-07-25T08:00:00.000Z"),
            windowEndsAt: new Date("2026-07-26T08:00:00.000Z"),
          },
        ],
      },
    },
  });
  const terminalAssignment = await prisma.checkInAssignment.findUniqueOrThrow({
    where: { episodeId_sequence: { episodeId: activeEpisode.id, sequence: 1 } },
  });
  await prisma.$transaction(async (transaction) => {
    const outcome = await transaction.checkInOutcome.create({
      data: {
        assignmentId: terminalAssignment.id,
        checkInProtocolVersionId: protocol.id,
        type: "EXPIRED",
        recordedById: nurse.id,
        idempotencyKey: `queue-outcome:${randomUUID()}`,
        requestFingerprint: "b".repeat(64),
        recordedAt: new Date("2026-07-19T09:00:00.000Z"),
      },
    });
    await transaction.nonResponseEvent.create({
      data: {
        outcomeId: outcome.id,
        assignmentId: terminalAssignment.id,
        checkInProtocolVersionId: protocol.id,
        outcomeType: "EXPIRED",
        reason: "WINDOW_EXPIRED",
        recordedById: nurse.id,
        recordedAt: new Date("2026-07-19T09:00:00.000Z"),
      },
    });
  });
  return { admin, nurse, clinician, otherNurse, activeEpisode, pausedEpisode, isolatedEpisode };
}

async function createAlert(users: Awaited<ReturnType<typeof setup>>) {
  const fixture = SYNTHETIC_RULE_FIXTURES[2]!;
  const uow = new PrismaExplainableAlertsUnitOfWork();
  const created = await new CreateRuleVersionService(uow).execute({
    actor: principal(users.admin.id, "admin"),
    ruleKey: `queue-rule-${randomUUID()}`,
    name: "Aviso sintético para cola",
    dsl: fixture.dsl,
    correlationId: randomUUID(),
  });
  await new ApproveRuleVersionService(uow).execute({
    actor: principal(users.clinician.id, "clinician"),
    ruleVersionId: created.ruleVersionId,
    approvalReference: "SYNTHETIC-QUEUE-TEST",
    correlationId: randomUUID(),
  });
  await new ActivateRuleVersionService(uow).execute({
    actor: principal(users.admin.id, "admin"),
    ruleVersionId: created.ruleVersionId,
    correlationId: randomUUID(),
  });
  const evaluated = await new EvaluateRuleService(uow).execute({
    actor: principal(users.nurse.id, "nurse"),
    ruleVersionId: created.ruleVersionId,
    episodeId: users.activeEpisode.id,
    inputs: [
      {
        inputKey: "non_response_hours",
        value: 48,
        observedAt: "2026-07-20T08:00:00.000Z",
        source: {
          resourceType: "NonResponseEvent",
          resourceId: `synthetic-queue-source-${randomUUID()}`,
          field: "elapsedHours",
        },
      },
    ],
    idempotencyKey: `queue-evaluation:${randomUUID()}`,
    correlationId: randomUUID(),
    evaluatedAt: new Date("2026-07-20T10:00:00.000Z"),
  });
  return evaluated.alertId!;
}

describe.sequential("PostgreSQL nursing workqueue guarantees", () => {
  it("aísla profesionales, filtra la cola y minimiza el último check-in", async () => {
    const users = await setup();
    const uow = new PrismaNursingWorkQueueUnitOfWork();
    await new CreateNursingTaskService(uow).execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Pendiente organizativo sintético",
      assignedToId: null,
      idempotencyKey: `queue-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const now = new Date("2026-07-20T10:00:00.000Z");
    const visible = await listNursingWorkQueue(principal(users.nurse.id, "nurse"), {}, now);
    expect(visible!.entries.map(({ episode }) => episode.id)).toEqual(
      expect.arrayContaining([users.activeEpisode.id, users.pausedEpisode.id]),
    );
    expect(visible!.entries.some(({ episode }) => episode.id === users.isolatedEpisode.id)).toBe(
      false,
    );
    const active = visible!.entries.find(({ episode }) => episode.id === users.activeEpisode.id)!;
    expect(active.lastRelevantCheckIn).toMatchObject({
      scheduledFor: new Date("2026-07-18T09:00:00.000Z"),
      outcome: { type: "EXPIRED", recordedAt: new Date("2026-07-19T09:00:00.000Z") },
    });
    expect(active.lastRelevantCheckIn).not.toHaveProperty("answers");
    expect(active.pendingElementCount).toBe(2);

    const isolated = await listNursingWorkQueue(principal(users.otherNurse.id, "nurse"), {}, now);
    expect(isolated!.entries.map(({ episode }) => episode.id)).toEqual([users.isolatedEpisode.id]);
    const filtered = await listNursingWorkQueue(
      principal(users.nurse.id, "nurse"),
      {
        status: "ACTIVE",
        taskState: "OPEN",
        dateFrom: new Date("2026-07-09T00:00:00.000Z"),
        dateTo: new Date("2026-07-11T23:59:59.999Z"),
        responsibleProfessionalId: users.clinician.id,
        pendingOnly: true,
      },
      now,
    );
    expect(filtered!.entries.map(({ episode }) => episode.id)).toEqual([users.activeEpisode.id]);
    expect(filtered!.metrics).toMatchObject({ openTaskCount: 1, resolvedTaskCount: 0 });
  });

  it("revisar un aviso no crea tarea; la creación humana conserva el vínculo opcional", async () => {
    const users = await setup();
    const alertId = await createAlert(users);
    await expect(
      new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute({
        actor: principal(users.nurse.id, "nurse"),
        episodeId: users.activeEpisode.id,
        alertId,
        summary: "No debe vincular un aviso abierto",
        assignedToId: null,
        idempotencyKey: `queue-task:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskConflictError);
    await expect(
      prisma.task.create({
        data: {
          episodeId: users.activeEpisode.id,
          alertId,
          summary: "Inserción directa con aviso abierto",
          createdById: users.nurse.id,
          creationIdempotencyKey: `queue-direct-open:${randomUUID()}`,
          creationFingerprint: "d".repeat(64),
        },
      }),
    ).rejects.toThrow(/linked alert requires prior human review/);
    await new ReviewAlertService(new PrismaExplainableAlertsUnitOfWork()).execute({
      actor: principal(users.nurse.id, "nurse"),
      alertId,
      nextState: "reviewed",
      correlationId: randomUUID(),
    });
    await expect(prisma.task.count({ where: { alertId } })).resolves.toBe(0);
    const task = await new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute(
      {
        actor: principal(users.nurse.id, "nurse"),
        episodeId: users.activeEpisode.id,
        alertId,
        summary: "Tarea humana vinculada al aviso revisado",
        assignedToId: users.nurse.id,
        idempotencyKey: `queue-task:${randomUUID()}`,
        correlationId: randomUUID(),
      },
    );
    await expect(
      prisma.task.findUniqueOrThrow({ where: { id: task.taskId } }),
    ).resolves.toMatchObject({
      episodeId: users.activeEpisode.id,
      alertId,
      currentState: "OPEN",
    });
    await expect(
      prisma.dischargeEpisode.findUniqueOrThrow({ where: { id: users.activeEpisode.id } }),
    ).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("resuelve carreras de asignación y resolución sin actualización perdida", async () => {
    const users = await setup();
    const uow = new PrismaNursingWorkQueueUnitOfWork();
    const created = await new CreateNursingTaskService(uow).execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Tarea para concurrencia sintética",
      assignedToId: null,
      idempotencyKey: `queue-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const update = new UpdateNursingTaskService(uow);
    const assignments = await Promise.allSettled([
      update.execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: created.taskId,
        expectedRevision: 1,
        action: { kind: "assign", assignedToId: users.nurse.id },
        idempotencyKey: `queue-assign:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      update.execute({
        actor: principal(users.clinician.id, "clinician"),
        taskId: created.taskId,
        expectedRevision: 1,
        action: { kind: "assign", assignedToId: users.clinician.id },
        idempotencyKey: `queue-assign:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);
    expect(assignments.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(assignments.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(assignments.find(({ status }) => status === "rejected")).toMatchObject({
      reason: expect.any(NursingTaskConflictError),
    });
    const afterAssignment = await prisma.task.findUniqueOrThrow({ where: { id: created.taskId } });
    expect(afterAssignment.revision).toBe(2);
    await expect(
      prisma.taskEvent.count({ where: { taskId: created.taskId, resultingRevision: 2 } }),
    ).resolves.toBe(1);

    const resolutions = await Promise.allSettled([
      update.execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: created.taskId,
        expectedRevision: 2,
        action: { kind: "resolve", reason: "Completada por revisión humana A" },
        idempotencyKey: `queue-resolve:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      update.execute({
        actor: principal(users.clinician.id, "clinician"),
        taskId: created.taskId,
        expectedRevision: 2,
        action: { kind: "resolve", reason: "Completada por revisión humana B" },
        idempotencyKey: `queue-resolve:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);
    expect(resolutions.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(resolutions.filter(({ status }) => status === "rejected")).toHaveLength(1);
    const resolved = await prisma.task.findUniqueOrThrow({ where: { id: created.taskId } });
    expect(resolved).toMatchObject({
      currentState: "RESOLVED",
      revision: 3,
      resolvedById: expect.any(String),
      resolvedAt: expect.any(Date),
      resolutionReason: expect.stringContaining("revisión humana"),
    });
    await expect(
      prisma.dischargeEpisode.findUniqueOrThrow({ where: { id: users.activeEpisode.id } }),
    ).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("hace idempotente la creación concurrente y rechaza una huella distinta", async () => {
    const users = await setup();
    const service = new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork());
    const actor = principal(users.nurse.id, "nurse");
    const sameKey = `queue-create-race:${randomUUID()}`;
    const sameInput = {
      actor,
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Creación concurrente con la misma huella",
      assignedToId: null,
      idempotencyKey: sameKey,
      correlationId: randomUUID(),
    } as const;
    const same = await Promise.all([service.execute(sameInput), service.execute(sameInput)]);
    expect(new Set(same.map(({ taskId }) => taskId)).size).toBe(1);
    expect(same.filter(({ idempotent }) => !idempotent)).toHaveLength(1);

    const differentKey = `queue-create-race:${randomUUID()}`;
    const different = await Promise.allSettled([
      service.execute({
        ...sameInput,
        idempotencyKey: differentKey,
        summary: "Huella A concurrente",
      }),
      service.execute({
        ...sameInput,
        idempotencyKey: differentKey,
        summary: "Huella B concurrente",
      }),
    ]);
    expect(different.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(different.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(different.find(({ status }) => status === "rejected")).toMatchObject({
      reason: expect.any(NursingTaskConflictError),
    });
  });

  it("serializa nota contra resolución y reasignación contra resolución", async () => {
    const users = await setup();
    const uow = new PrismaNursingWorkQueueUnitOfWork();
    const create = new CreateNursingTaskService(uow);
    const update = new UpdateNursingTaskService(uow);

    const noteTask = await create.execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Carrera entre nota y resolución",
      assignedToId: null,
      idempotencyKey: `queue-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const noteVsResolve = await Promise.allSettled([
      update.execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: noteTask.taskId,
        expectedRevision: 1,
        action: { kind: "note", note: "Nota concurrente sintética" },
        idempotencyKey: `queue-note:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      update.execute({
        actor: principal(users.clinician.id, "clinician"),
        taskId: noteTask.taskId,
        expectedRevision: 1,
        action: { kind: "resolve", reason: "Resolución concurrente sintética" },
        idempotencyKey: `queue-resolve:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);
    expect(noteVsResolve.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(noteVsResolve.filter(({ status }) => status === "rejected")).toHaveLength(1);
    await expect(
      prisma.task.findUniqueOrThrow({ where: { id: noteTask.taskId } }),
    ).resolves.toMatchObject({
      revision: 2,
    });

    const assignedTask = await create.execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Carrera entre reasignación y resolución",
      assignedToId: users.nurse.id,
      idempotencyKey: `queue-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const reassignVsResolve = await Promise.allSettled([
      update.execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: assignedTask.taskId,
        expectedRevision: 1,
        action: { kind: "assign", assignedToId: users.clinician.id },
        idempotencyKey: `queue-reassign:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      update.execute({
        actor: principal(users.clinician.id, "clinician"),
        taskId: assignedTask.taskId,
        expectedRevision: 1,
        action: { kind: "resolve", reason: "Resolución frente a reasignación" },
        idempotencyKey: `queue-resolve:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);
    expect(reassignVsResolve.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(reassignVsResolve.filter(({ status }) => status === "rejected")).toHaveLength(1);
    await expect(
      prisma.taskEvent.count({ where: { taskId: assignedTask.taskId, resultingRevision: 2 } }),
    ).resolves.toBe(1);
  });

  it("revalida el rol persistido al leer y mutar la cola", async () => {
    const users = await setup();
    const actor = principal(users.nurse.id, "nurse");
    await expect(listNursingWorkQueue(actor, {})).resolves.not.toBeNull();
    await prisma.roleAssignment.updateMany({
      where: { userId: users.nurse.id, role: "nurse", revokedAt: null },
      data: { revokedAt: new Date("2026-07-20T10:00:00.000Z") },
    });
    await expect(listNursingWorkQueue(actor, {})).resolves.toBeNull();
    await expect(
      new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute({
        actor,
        episodeId: users.activeEpisode.id,
        alertId: null,
        summary: "No debe aceptar un rol revocado",
        assignedToId: null,
        idempotencyKey: `queue-task:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskDeniedError);
  });

  it("impide por SQL semánticas falsas y mutaciones sin evento append-only", async () => {
    const users = await setup();
    const create = new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork());
    const unassigned = await create.execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Garantías SQL sin asignación",
      assignedToId: null,
      idempotencyKey: `queue-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const assigned = await create.execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Garantías SQL con asignación",
      assignedToId: users.nurse.id,
      idempotencyKey: `queue-task:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    async function insertEvent(input: {
      taskId: string;
      type: "assigned" | "reassigned" | "contact-attempt" | "note-recorded" | "resolved";
      fromAssignedToId: string | null;
      toAssignedToId: string | null;
      note?: string | null;
      contactOutcome?: "reached" | null;
      resolutionReason?: string | null;
    }) {
      return prisma.$executeRaw(Prisma.sql`
        INSERT INTO "task_events" (
          "id", "task_id", "type", "from_state", "to_state",
          "from_assigned_to_id", "to_assigned_to_id", "note", "contact_outcome",
          "resolution_reason", "actor_user_id", "actor_role", "idempotency_key",
          "request_fingerprint", "resulting_revision", "occurred_at"
        ) VALUES (
          ${randomUUID()}, ${input.taskId}, ${input.type}::"TaskEventType", 'open',
          ${input.type === "resolved" ? Prisma.sql`'resolved'` : Prisma.sql`'open'`}::"TaskState",
          ${input.fromAssignedToId}, ${input.toAssignedToId}, ${input.note ?? null},
          ${input.contactOutcome ?? null}::"ContactAttemptOutcome", ${input.resolutionReason ?? null},
          ${users.nurse.id}, 'nurse', ${`queue-sql:${randomUUID()}`}, ${"c".repeat(64)}, 2, NOW()
        )
      `);
    }

    await expect(
      insertEvent({
        taskId: assigned.taskId,
        type: "assigned",
        fromAssignedToId: users.nurse.id,
        toAssignedToId: users.clinician.id,
      }),
    ).rejects.toThrow();
    await expect(
      insertEvent({
        taskId: unassigned.taskId,
        type: "reassigned",
        fromAssignedToId: null,
        toAssignedToId: users.clinician.id,
      }),
    ).rejects.toThrow();
    await expect(
      insertEvent({
        taskId: assigned.taskId,
        type: "contact-attempt",
        fromAssignedToId: users.nurse.id,
        toAssignedToId: users.clinician.id,
        contactOutcome: "reached",
      }),
    ).rejects.toThrow();
    await expect(
      insertEvent({
        taskId: assigned.taskId,
        type: "note-recorded",
        fromAssignedToId: users.nurse.id,
        toAssignedToId: users.clinician.id,
        note: "Cambio de asignación encubierto",
      }),
    ).rejects.toThrow();
    await expect(
      insertEvent({
        taskId: assigned.taskId,
        type: "resolved",
        fromAssignedToId: users.nurse.id,
        toAssignedToId: users.clinician.id,
        resolutionReason: "Cambio de asignación encubierto",
      }),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`UPDATE "tasks" SET "revision" = 2 WHERE "id" = ${unassigned.taskId}`,
    ).rejects.toThrow();
    const createdEvent = await prisma.taskEvent.findFirstOrThrow({
      where: { taskId: unassigned.taskId, type: "CREATED" },
    });
    await expect(
      prisma.$executeRaw`UPDATE "task_events" SET "occurred_at" = NOW() WHERE "id" = ${createdEvent.id}`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`DELETE FROM "task_events" WHERE "id" = ${createdEvent.id}`,
    ).rejects.toThrow();
  });

  it("audita acciones sin copiar resumen, nota, explicación o motivo", async () => {
    const users = await setup();
    const uow = new PrismaNursingWorkQueueUnitOfWork();
    const correlationId = randomUUID();
    let task = await new CreateNursingTaskService(uow).execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "RESUMEN-SENSIBLE-SINTETICO",
      assignedToId: null,
      idempotencyKey: `queue-task:${randomUUID()}`,
      correlationId,
    });
    const update = new UpdateNursingTaskService(uow);
    task = await update.execute({
      actor: principal(users.nurse.id, "nurse"),
      taskId: task.taskId,
      expectedRevision: task.revision,
      action: { kind: "contact-attempt", outcome: "no-answer" },
      idempotencyKey: `queue-contact:${randomUUID()}`,
      correlationId,
    });
    task = await update.execute({
      actor: principal(users.nurse.id, "nurse"),
      taskId: task.taskId,
      expectedRevision: task.revision,
      action: { kind: "note", note: "NOTA-SENSIBLE-SINTETICA" },
      idempotencyKey: `queue-note:${randomUUID()}`,
      correlationId,
    });
    await update.execute({
      actor: principal(users.nurse.id, "nurse"),
      taskId: task.taskId,
      expectedRevision: task.revision,
      action: { kind: "resolve", reason: "MOTIVO-SENSIBLE-SINTETICO" },
      idempotencyKey: `queue-resolve:${randomUUID()}`,
      correlationId,
    });
    const audits = await prisma.auditEvent.findMany({ where: { correlationId } });
    expect(audits.map(({ action }) => action)).toEqual([
      "TASK_CREATED",
      "TASK_CONTACT_ATTEMPT_RECORDED",
      "TASK_NOTE_RECORDED",
      "TASK_RESOLVED",
    ]);
    expect(JSON.stringify(audits)).not.toMatch(/RESUMEN-SENSIBLE|NOTA-SENSIBLE|MOTIVO-SENSIBLE/);
  });
});
