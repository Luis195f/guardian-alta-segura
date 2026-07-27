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
import type {
  NursingWorkQueueTransaction,
  NursingWorkQueueUnitOfWork,
} from "@/application/ports/nursing-workqueue-unit-of-work";
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
  const nonResponseSource = await prisma.$transaction(async (transaction) => {
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
    return transaction.nonResponseEvent.create({
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
  return {
    admin,
    nurse,
    clinician,
    otherNurse,
    otherClinician,
    activeEpisode,
    pausedEpisode,
    isolatedEpisode,
    nonResponseSource,
  };
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
          resourceId: users.nonResponseSource.id,
          field: "elapsedHours",
          episodeId: users.activeEpisode.id,
        },
      },
    ],
    idempotencyKey: `queue-evaluation:${randomUUID()}`,
    correlationId: randomUUID(),
    evaluatedAt: new Date("2026-07-20T10:00:00.000Z"),
  });
  return evaluated.alertId!;
}

type TargetAssignmentOperation = "create-assigned" | "assign" | "reassign";

async function waitForNamedLock(applicationName: string): Promise<boolean> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [activity] = await prisma.$queryRaw<Array<{ readonly waiting: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE application_name = ${applicationName}
          AND wait_event_type = 'Lock'
      ) AS waiting
    `);
    if (activity?.waiting) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

async function waitForTargetAuthorizationLock(): Promise<boolean> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [activity] = await prisma.$queryRaw<Array<{ readonly waiting: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
          AND query LIKE '%FROM "discharge_episodes" AS episode%'
          AND query LIKE '%FOR UPDATE OF episode, u, ra%'
      ) AS waiting
    `);
    if (activity?.waiting) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

async function waitForActorAuthorizationLock(): Promise<boolean> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [activity] = await prisma.$queryRaw<Array<{ readonly waiting: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
          AND query LIKE '%FROM "users" AS u%'
          AND query LIKE '%FOR UPDATE OF u, ra%'
      ) AS waiting
    `);
    if (activity?.waiting) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

async function prepareTargetAssignment(
  operation: TargetAssignmentOperation,
  users: Awaited<ReturnType<typeof setup>>,
  unitOfWork: NursingWorkQueueUnitOfWork,
) {
  const actor = principal(users.nurse.id, "nurse");
  if (operation === "create-assigned") {
    const idempotencyKey = `queue-target-create:${randomUUID()}`;
    return {
      existingTaskId: null,
      mutation: () =>
        new CreateNursingTaskService(unitOfWork).execute({
          actor,
          episodeId: users.activeEpisode.id,
          alertId: null,
          summary: "Creación asignada serializada contra revocación",
          assignedToId: users.clinician.id,
          idempotencyKey,
          correlationId: randomUUID(),
        }),
    };
  }

  const initiallyAssignedToId = operation === "reassign" ? users.nurse.id : null;
  const task = await new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute({
    actor,
    episodeId: users.activeEpisode.id,
    alertId: null,
    summary:
      operation === "assign"
        ? "Asignación serializada contra revocación"
        : "Reasignación serializada contra revocación",
    assignedToId: initiallyAssignedToId,
    idempotencyKey: `queue-target-base:${randomUUID()}`,
    correlationId: randomUUID(),
  });
  return {
    existingTaskId: task.taskId,
    mutation: () =>
      new UpdateNursingTaskService(unitOfWork).execute({
        actor,
        taskId: task.taskId,
        expectedRevision: task.revision,
        action: { kind: "assign", assignedToId: users.clinician.id },
        idempotencyKey: `queue-target-update:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
  };
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
    const review = await new ReviewAlertService(new PrismaExplainableAlertsUnitOfWork()).execute({
      actor: principal(users.clinician.id, "clinician"),
      alertId,
      nextState: "reviewed",
      correlationId: randomUUID(),
    });
    await expect(prisma.task.count({ where: { alertId } })).resolves.toBe(0);
    await prisma.roleAssignment.updateMany({
      where: { userId: users.clinician.id, role: "clinician", revokedAt: null },
      data: { revokedAt: new Date("2026-07-20T10:00:00.000Z") },
    });
    await expect(
      prisma.alertReview.findUniqueOrThrow({ where: { id: review.reviewId } }),
    ).resolves.toMatchObject({
      alertId,
      reviewedById: users.clinician.id,
    });
    await expect(
      prisma.task.create({
        data: {
          episodeId: users.pausedEpisode.id,
          alertId,
          summary: "Inserción cruzada tras revisión",
          createdById: users.nurse.id,
          creationIdempotencyKey: `queue-cross-episode:${randomUUID()}`,
          creationFingerprint: "e".repeat(64),
        },
      }),
    ).rejects.toThrow();
    const taskKey = `queue-task:${randomUUID()}`;
    const createInput = {
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId,
      summary: "Tarea humana vinculada al aviso revisado",
      assignedToId: users.nurse.id,
      idempotencyKey: taskKey,
      correlationId: randomUUID(),
    } as const;
    const task = await new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute(
      createInput,
    );
    const retry = await new CreateNursingTaskService(
      new PrismaNursingWorkQueueUnitOfWork(),
    ).execute(createInput);
    expect(retry).toMatchObject({ taskId: task.taskId, idempotent: true });
    const storedTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.taskId },
      include: { events: true },
    });
    expect(storedTask).toMatchObject({
      episodeId: users.activeEpisode.id,
      alertId,
      currentState: "OPEN",
      createdById: users.nurse.id,
      events: [expect.objectContaining({ type: "CREATED", actorUserId: users.nurse.id })],
    });
    expect(storedTask.events[0]?.occurredAt).toEqual(storedTask.createdAt);
    await expect(prisma.task.count({ where: { alertId } })).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: { resourceType: "Task", resourceId: task.taskId },
      }),
    ).resolves.toBe(2);
    await expect(
      prisma.dischargeEpisode.findUniqueOrThrow({ where: { id: users.activeEpisode.id } }),
    ).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("serializa la creación derivada contra la revocación concurrente del acting actor", async () => {
    const users = await setup();
    const alertId = await createAlert(users);
    await new ReviewAlertService(new PrismaExplainableAlertsUnitOfWork()).execute({
      actor: principal(users.clinician.id, "clinician"),
      alertId,
      nextState: "reviewed",
      correlationId: randomUUID(),
    });
    const roleAssignment = await prisma.roleAssignment.findFirstOrThrow({
      where: { userId: users.nurse.id, role: "nurse", revokedAt: null },
      select: { id: true },
    });

    let authorizationReached!: () => void;
    const afterAuthorization = new Promise<void>((resolve) => {
      authorizationReached = resolve;
    });
    let continueCreation!: () => void;
    const creationMayContinue = new Promise<void>((resolve) => {
      continueCreation = resolve;
    });
    const baseUnitOfWork = new PrismaNursingWorkQueueUnitOfWork();
    const interleavedUnitOfWork: NursingWorkQueueUnitOfWork = {
      run: <T>(operation: (transaction: NursingWorkQueueTransaction) => Promise<T>) =>
        baseUnitOfWork.run((transaction) =>
          operation(
            new Proxy(transaction, {
              get(target, property, receiver) {
                if (property === "getAlert") {
                  return async (requestedAlertId: string) => {
                    authorizationReached();
                    await creationMayContinue;
                    return target.getAlert(requestedAlertId);
                  };
                }
                const value = Reflect.get(target, property, receiver) as unknown;
                return typeof value === "function" ? value.bind(target) : value;
              },
            }),
          ),
        ),
    };
    const creation = new CreateNursingTaskService(interleavedUnitOfWork).execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId,
      summary: "Tarea serializada contra revocación sintética",
      assignedToId: null,
      idempotencyKey: `queue-revocation-race:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    await afterAuthorization;

    const applicationName = `gas-role-revocation-${randomUUID()}`;
    const revocation = prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT set_config('application_name', ${applicationName}, true)`,
      );
      return transaction.$executeRaw(
        Prisma.sql`
          UPDATE "role_assignments"
          SET "revoked_at" = clock_timestamp()
          WHERE "id" = ${roleAssignment.id}
            AND "revoked_at" IS NULL
        `,
      );
    });
    const waitDeadline = Date.now() + 5_000;
    let revocationWaitingOnLock = false;
    while (Date.now() < waitDeadline) {
      const [activity] = await prisma.$queryRaw<Array<{ readonly waiting: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE application_name = ${applicationName}
            AND wait_event_type = 'Lock'
        ) AS waiting
      `);
      if (activity?.waiting) {
        revocationWaitingOnLock = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const assignmentWhileRevocationWaited = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: roleAssignment.id },
    });
    const taskCountWhileRevocationWaited = await prisma.task.count({ where: { alertId } });
    continueCreation();
    expect(revocationWaitingOnLock).toBe(true);
    expect(assignmentWhileRevocationWaited).toMatchObject({ revokedAt: null });
    expect(taskCountWhileRevocationWaited).toBe(0);
    const [created, revokedRows] = await Promise.all([creation, revocation]);
    expect(revokedRows).toBe(1);
    const [storedTask, revokedAssignment] = await Promise.all([
      prisma.task.findUniqueOrThrow({ where: { id: created.taskId } }),
      prisma.roleAssignment.findUniqueOrThrow({ where: { id: roleAssignment.id } }),
    ]);
    expect(revokedAssignment.revokedAt).not.toBeNull();
    expect(storedTask.id).toBe(created.taskId);
    await expect(
      new CreateNursingTaskService(new PrismaNursingWorkQueueUnitOfWork()).execute({
        actor: principal(users.nurse.id, "nurse"),
        episodeId: users.activeEpisode.id,
        alertId,
        summary: "Nueva acción posterior a la revocación",
        assignedToId: null,
        idempotencyKey: `queue-after-revocation:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskDeniedError);
  });

  it("deniega la mutación si la revocación del acting actor obtiene primero el lock", async () => {
    const users = await setup();
    const unitOfWork = new PrismaNursingWorkQueueUnitOfWork();
    const task = await new CreateNursingTaskService(unitOfWork).execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Tarea sintética para revocación-first del actor",
      assignedToId: null,
      idempotencyKey: `queue-actor-revocation-first-base:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const roleAssignment = await prisma.roleAssignment.findFirstOrThrow({
      where: { userId: users.nurse.id, role: "nurse", revokedAt: null },
      select: { id: true },
    });

    let revocationWritten!: () => void;
    const revocationHasWritten = new Promise<void>((resolve) => {
      revocationWritten = resolve;
    });
    let commitRevocation!: () => void;
    const revocationMayCommit = new Promise<void>((resolve) => {
      commitRevocation = resolve;
    });
    const revocation = prisma.$transaction(async (transaction) => {
      const updated = await transaction.$executeRaw(
        Prisma.sql`
          UPDATE "role_assignments"
          SET "revoked_at" = clock_timestamp()
          WHERE "id" = ${roleAssignment.id}
            AND "revoked_at" IS NULL
        `,
      );
      revocationWritten();
      await revocationMayCommit;
      return updated;
    });
    await revocationHasWritten;

    const mutation = new UpdateNursingTaskService(unitOfWork).execute({
      actor: principal(users.nurse.id, "nurse"),
      taskId: task.taskId,
      expectedRevision: task.revision,
      action: { kind: "note", note: "Contenido sintético no persistido en logs" },
      idempotencyKey: `queue-actor-revocation-first:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    expect(await waitForActorAuthorizationLock()).toBe(true);
    commitRevocation();
    await expect(revocation).resolves.toBe(1);
    await expect(mutation).rejects.toBeInstanceOf(NursingTaskDeniedError);
    await expect(
      prisma.task.findUniqueOrThrow({
        where: { id: task.taskId },
        include: { events: true },
      }),
    ).resolves.toMatchObject({
      revision: 1,
      events: [expect.objectContaining({ type: "CREATED" })],
    });
  });

  it("serializa el cruce actor/assignee A→B y B→A en tareas distintas del mismo episodio", async () => {
    const users = await setup();
    const baseUnitOfWork = new PrismaNursingWorkQueueUnitOfWork();
    const [taskForNurse, taskForClinician] = await Promise.all([
      new CreateNursingTaskService(baseUnitOfWork).execute({
        actor: principal(users.nurse.id, "nurse"),
        episodeId: users.activeEpisode.id,
        alertId: null,
        summary: "Cruce sintético iniciado por enfermería",
        assignedToId: null,
        idempotencyKey: `queue-cross-base-nurse:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      new CreateNursingTaskService(baseUnitOfWork).execute({
        actor: principal(users.clinician.id, "clinician"),
        episodeId: users.activeEpisode.id,
        alertId: null,
        summary: "Cruce sintético iniciado por medicina",
        assignedToId: null,
        idempotencyKey: `queue-cross-base-clinician:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);

    let episodeLocksReached = 0;
    let releaseEpisodeBarrier!: () => void;
    const bothTransactionsReady = new Promise<void>((resolve) => {
      releaseEpisodeBarrier = resolve;
    });
    const interleavedUnitOfWork: NursingWorkQueueUnitOfWork = {
      run: <T>(operationInTransaction: (transaction: NursingWorkQueueTransaction) => Promise<T>) =>
        baseUnitOfWork.run((transaction) =>
          operationInTransaction(
            new Proxy(transaction, {
              get(target, property, receiver) {
                if (property === "lockEpisode") {
                  return async (episodeId: string) => {
                    episodeLocksReached += 1;
                    if (episodeLocksReached === 2) releaseEpisodeBarrier();
                    await bothTransactionsReady;
                    return target.lockEpisode(episodeId);
                  };
                }
                const value = Reflect.get(target, property, receiver) as unknown;
                return typeof value === "function" ? value.bind(target) : value;
              },
            }),
          ),
        ),
    };

    const results = await Promise.allSettled([
      new UpdateNursingTaskService(interleavedUnitOfWork).execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: taskForNurse.taskId,
        expectedRevision: taskForNurse.revision,
        action: { kind: "assign", assignedToId: users.clinician.id },
        idempotencyKey: `queue-cross-nurse-to-clinician:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      new UpdateNursingTaskService(interleavedUnitOfWork).execute({
        actor: principal(users.clinician.id, "clinician"),
        taskId: taskForClinician.taskId,
        expectedRevision: taskForClinician.revision,
        action: { kind: "assign", assignedToId: users.nurse.id },
        idempotencyKey: `queue-cross-clinician-to-nurse:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);

    expect(
      results.flatMap((result) =>
        result.status === "rejected"
          ? [
              result.reason instanceof Error
                ? `${result.reason.name}: ${result.reason.message}`
                : String(result.reason),
            ]
          : [],
      ),
    ).toEqual([]);
    await expect(
      prisma.task.findUniqueOrThrow({ where: { id: taskForNurse.taskId } }),
    ).resolves.toMatchObject({ revision: 2, assignedToId: users.clinician.id });
    await expect(
      prisma.task.findUniqueOrThrow({ where: { id: taskForClinician.taskId } }),
    ).resolves.toMatchObject({ revision: 2, assignedToId: users.nurse.id });
  }, 15_000);

  it("evita deadlock cross-episode cuando E1 hace A→B y E2 hace B→A", async () => {
    const users = await setup();
    const baseUnitOfWork = new PrismaNursingWorkQueueUnitOfWork();
    const [taskInEpisodeOne, taskInEpisodeTwo] = await Promise.all([
      new CreateNursingTaskService(baseUnitOfWork).execute({
        actor: principal(users.nurse.id, "nurse"),
        episodeId: users.activeEpisode.id,
        alertId: null,
        summary: "Cruce cross-episode sintético E1",
        assignedToId: null,
        idempotencyKey: `queue-cross-episode-base-one:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      new CreateNursingTaskService(baseUnitOfWork).execute({
        actor: principal(users.clinician.id, "clinician"),
        episodeId: users.pausedEpisode.id,
        alertId: null,
        summary: "Cruce cross-episode sintético E2",
        assignedToId: null,
        idempotencyKey: `queue-cross-episode-base-two:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);

    let participantLocksReached = 0;
    let releaseParticipantBarrier!: () => void;
    const bothMutationsReady = new Promise<void>((resolve) => {
      releaseParticipantBarrier = resolve;
    });
    const interleavedUnitOfWork: NursingWorkQueueUnitOfWork = {
      run: <T>(operationInTransaction: (transaction: NursingWorkQueueTransaction) => Promise<T>) =>
        baseUnitOfWork.run((transaction) =>
          operationInTransaction(
            new Proxy(transaction, {
              get(target, property, receiver) {
                if (property === "lockParticipantUsers") {
                  return async (userIds: readonly string[]) => {
                    participantLocksReached += 1;
                    if (participantLocksReached === 2) releaseParticipantBarrier();
                    await bothMutationsReady;
                    return target.lockParticipantUsers(userIds);
                  };
                }
                const value = Reflect.get(target, property, receiver) as unknown;
                return typeof value === "function" ? value.bind(target) : value;
              },
            }),
          ),
        ),
    };

    const results = await Promise.allSettled([
      new UpdateNursingTaskService(interleavedUnitOfWork).execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: taskInEpisodeOne.taskId,
        expectedRevision: taskInEpisodeOne.revision,
        action: { kind: "assign", assignedToId: users.clinician.id },
        idempotencyKey: `queue-cross-episode-one:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      new UpdateNursingTaskService(interleavedUnitOfWork).execute({
        actor: principal(users.clinician.id, "clinician"),
        taskId: taskInEpisodeTwo.taskId,
        expectedRevision: taskInEpisodeTwo.revision,
        action: { kind: "assign", assignedToId: users.nurse.id },
        idempotencyKey: `queue-cross-episode-two:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);

    expect(
      results.flatMap((result) =>
        result.status === "rejected"
          ? [
              result.reason instanceof Error
                ? `${result.reason.name}: ${result.reason.message}`
                : String(result.reason),
            ]
          : [],
      ),
    ).toEqual([]);
    await expect(
      prisma.task.findUniqueOrThrow({ where: { id: taskInEpisodeOne.taskId } }),
    ).resolves.toMatchObject({ revision: 2, assignedToId: users.clinician.id });
    await expect(
      prisma.task.findUniqueOrThrow({ where: { id: taskInEpisodeTwo.taskId } }),
    ).resolves.toMatchObject({ revision: 2, assignedToId: users.nurse.id });
  }, 15_000);

  it("permite actor igual a target y devuelve conflicto técnico al repetir assignment", async () => {
    const users = await setup();
    const unitOfWork = new PrismaNursingWorkQueueUnitOfWork();
    const task = await new CreateNursingTaskService(unitOfWork).execute({
      actor: principal(users.nurse.id, "nurse"),
      episodeId: users.activeEpisode.id,
      alertId: null,
      summary: "Self-assignment sintético sin ciclo de locks",
      assignedToId: null,
      idempotencyKey: `queue-self-assignment-base:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    const assigned = await new UpdateNursingTaskService(unitOfWork).execute({
      actor: principal(users.nurse.id, "nurse"),
      taskId: task.taskId,
      expectedRevision: task.revision,
      action: { kind: "assign", assignedToId: users.nurse.id },
      idempotencyKey: `queue-self-assignment:${randomUUID()}`,
      correlationId: randomUUID(),
    });
    expect(assigned).toMatchObject({ revision: 2, assignedToId: users.nurse.id });
    await expect(
      new UpdateNursingTaskService(unitOfWork).execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: task.taskId,
        expectedRevision: assigned.revision,
        action: { kind: "assign", assignedToId: users.nurse.id },
        idempotencyKey: `queue-self-assignment-repeat:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskConflictError);
  });

  it("mantiene paralelismo entre episodios con identidades participantes disjuntas", async () => {
    const users = await setup();
    const baseUnitOfWork = new PrismaNursingWorkQueueUnitOfWork();
    const [firstTask, secondTask] = await Promise.all([
      new CreateNursingTaskService(baseUnitOfWork).execute({
        actor: principal(users.nurse.id, "nurse"),
        episodeId: users.activeEpisode.id,
        alertId: null,
        summary: "Paralelismo sintético E1",
        assignedToId: null,
        idempotencyKey: `queue-parallel-base-one:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      new CreateNursingTaskService(baseUnitOfWork).execute({
        actor: principal(users.otherNurse.id, "nurse"),
        episodeId: users.isolatedEpisode.id,
        alertId: null,
        summary: "Paralelismo sintético E2",
        assignedToId: null,
        idempotencyKey: `queue-parallel-base-two:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);

    let participantLocksHeld = 0;
    let releaseParallelBarrier!: () => void;
    const bothParticipantSetsLocked = new Promise<void>((resolve) => {
      releaseParallelBarrier = resolve;
    });
    const interleavedUnitOfWork: NursingWorkQueueUnitOfWork = {
      run: <T>(operationInTransaction: (transaction: NursingWorkQueueTransaction) => Promise<T>) =>
        baseUnitOfWork.run((transaction) =>
          operationInTransaction(
            new Proxy(transaction, {
              get(target, property, receiver) {
                if (property === "lockParticipantUsers") {
                  return async (userIds: readonly string[]) => {
                    await target.lockParticipantUsers(userIds);
                    participantLocksHeld += 1;
                    if (participantLocksHeld === 2) releaseParallelBarrier();
                    await bothParticipantSetsLocked;
                  };
                }
                const value = Reflect.get(target, property, receiver) as unknown;
                return typeof value === "function" ? value.bind(target) : value;
              },
            }),
          ),
        ),
    };

    const [first, second] = await Promise.all([
      new UpdateNursingTaskService(interleavedUnitOfWork).execute({
        actor: principal(users.nurse.id, "nurse"),
        taskId: firstTask.taskId,
        expectedRevision: firstTask.revision,
        action: { kind: "assign", assignedToId: users.clinician.id },
        idempotencyKey: `queue-parallel-one:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
      new UpdateNursingTaskService(interleavedUnitOfWork).execute({
        actor: principal(users.otherNurse.id, "nurse"),
        taskId: secondTask.taskId,
        expectedRevision: secondTask.revision,
        action: { kind: "assign", assignedToId: users.otherClinician.id },
        idempotencyKey: `queue-parallel-two:${randomUUID()}`,
        correlationId: randomUUID(),
      }),
    ]);
    expect(participantLocksHeld).toBe(2);
    expect(first).toMatchObject({ revision: 2, assignedToId: users.clinician.id });
    expect(second).toMatchObject({ revision: 2, assignedToId: users.otherClinician.id });
  }, 15_000);

  it.each([
    ["create-assigned", "CREATED"],
    ["assign", "ASSIGNED"],
    ["reassign", "REASSIGNED"],
  ] as const)(
    "serializa %s contra revocación del assignee objetivo en ambos órdenes",
    async (operation, expectedEventType) => {
      const assignmentFirstUsers = await setup();
      const assignmentFirstRole = await prisma.roleAssignment.findFirstOrThrow({
        where: {
          userId: assignmentFirstUsers.clinician.id,
          role: "clinician",
          revokedAt: null,
        },
        select: { id: true },
      });
      let targetLocked!: () => void;
      const targetLockReached = new Promise<void>((resolve) => {
        targetLocked = resolve;
      });
      let continueAssignment!: () => void;
      const assignmentMayContinue = new Promise<void>((resolve) => {
        continueAssignment = resolve;
      });
      const baseUnitOfWork = new PrismaNursingWorkQueueUnitOfWork();
      const pausedAfterTargetLock: NursingWorkQueueUnitOfWork = {
        run: <T>(
          operationInTransaction: (transaction: NursingWorkQueueTransaction) => Promise<T>,
        ) =>
          baseUnitOfWork.run((transaction) =>
            operationInTransaction(
              new Proxy(transaction, {
                get(target, property, receiver) {
                  if (property === "lockAuthorizedAssignee") {
                    return async (userId: string, episodeId: string) => {
                      const authorized = await target.lockAuthorizedAssignee(userId, episodeId);
                      targetLocked();
                      await assignmentMayContinue;
                      return authorized;
                    };
                  }
                  const value = Reflect.get(target, property, receiver) as unknown;
                  return typeof value === "function" ? value.bind(target) : value;
                },
              }),
            ),
          ),
      };
      const assignmentFirst = await prepareTargetAssignment(
        operation,
        assignmentFirstUsers,
        pausedAfterTargetLock,
      );
      const mutation = assignmentFirst.mutation();
      await targetLockReached;

      const revocationApplicationName = `gas-target-revocation-${randomUUID()}`;
      const revocation = prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT set_config('application_name', ${revocationApplicationName}, true)`,
        );
        return transaction.$executeRaw(
          Prisma.sql`
            UPDATE "role_assignments"
            SET "revoked_at" = clock_timestamp()
            WHERE "id" = ${assignmentFirstRole.id}
              AND "revoked_at" IS NULL
          `,
        );
      });
      expect(await waitForNamedLock(revocationApplicationName)).toBe(true);
      continueAssignment();
      const mutated = await mutation;
      const revokedRows = await revocation;
      expect(revokedRows).toBe(1);
      const assignedTask = await prisma.task.findUniqueOrThrow({
        where: { id: mutated.taskId },
        include: { events: { orderBy: { resultingRevision: "asc" } } },
      });
      expect(assignedTask.assignedToId).toBe(assignmentFirstUsers.clinician.id);
      expect(assignedTask.events.at(-1)?.type).toBe(expectedEventType);
      await expect(
        prisma.roleAssignment.findUniqueOrThrow({
          where: { id: assignmentFirstRole.id },
        }),
      ).resolves.toMatchObject({ revokedAt: expect.any(Date) });
      const queueAfterRevocation = await listNursingWorkQueue(
        principal(assignmentFirstUsers.nurse.id, "nurse"),
        {},
      );
      const projectedTask = queueAfterRevocation!.entries
        .flatMap(({ tasks }) => tasks)
        .find(({ id }) => id === mutated.taskId)!;
      expect(projectedTask.accountability).toMatchObject({
        currentAssigneeId: assignmentFirstUsers.clinician.id,
        currentAssigneeEligibility: "NOT_CURRENTLY_AUTHORIZED",
        consistencyStatus: "VALID",
        blockers: ["CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED"],
      });

      const revocationFirstUsers = await setup();
      const revocationFirstRole = await prisma.roleAssignment.findFirstOrThrow({
        where: {
          userId: revocationFirstUsers.clinician.id,
          role: "clinician",
          revokedAt: null,
        },
        select: { id: true },
      });
      const revocationFirstBase = new PrismaNursingWorkQueueUnitOfWork();
      const revocationFirst = await prepareTargetAssignment(
        operation,
        revocationFirstUsers,
        revocationFirstBase,
      );
      let revocationWritten!: () => void;
      const revocationHasWritten = new Promise<void>((resolve) => {
        revocationWritten = resolve;
      });
      let commitRevocation!: () => void;
      const revocationMayCommit = new Promise<void>((resolve) => {
        commitRevocation = resolve;
      });
      const blockingRevocation = prisma.$transaction(async (transaction) => {
        const updated = await transaction.$executeRaw(
          Prisma.sql`
            UPDATE "role_assignments"
            SET "revoked_at" = clock_timestamp()
            WHERE "id" = ${revocationFirstRole.id}
              AND "revoked_at" IS NULL
          `,
        );
        revocationWritten();
        await revocationMayCommit;
        return updated;
      });
      await revocationHasWritten;
      const deniedMutation = revocationFirst.mutation();
      expect(await waitForTargetAuthorizationLock()).toBe(true);
      commitRevocation();
      await expect(blockingRevocation).resolves.toBe(1);
      await expect(deniedMutation).rejects.toBeInstanceOf(NursingTaskDeniedError);
      if (revocationFirst.existingTaskId === null) {
        await expect(
          prisma.task.count({
            where: {
              episodeId: revocationFirstUsers.activeEpisode.id,
              assignedToId: revocationFirstUsers.clinician.id,
            },
          }),
        ).resolves.toBe(0);
      } else {
        await expect(
          prisma.task.findUniqueOrThrow({
            where: { id: revocationFirst.existingTaskId },
            include: { events: true },
          }),
        ).resolves.toMatchObject({
          revision: 1,
          assignedToId: operation === "reassign" ? revocationFirstUsers.nurse.id : null,
          events: [expect.objectContaining({ type: "CREATED" })],
        });
      }
    },
  );

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
