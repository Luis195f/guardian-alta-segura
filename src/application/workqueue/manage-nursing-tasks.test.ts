import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type {
  NursingTaskEventRecord,
  NursingTaskRecord,
  NursingWorkQueueTransaction,
  NursingWorkQueueUnitOfWork,
} from "@/application/ports/nursing-workqueue-unit-of-work";
import {
  CreateNursingTaskService,
  NursingTaskConflictError,
  NursingTaskDeniedError,
  NursingTaskValidationError,
  UpdateNursingTaskService,
} from "@/application/workqueue/manage-nursing-tasks";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { HumanAuthorizationPolicy } from "@/domain/authorization/human-authorization";

const fixedNow = new Date("2026-07-20T10:00:00.000Z");
const permissivePolicy: HumanAuthorizationPolicy = {
  evaluate: () => ({
    status: "AUTHORIZED",
    action: "CREATE_TASK_FROM_REVIEWED_ALERT",
    episodeId: "episode-1",
    actorId: "permissive-policy-does-not-check-actor",
    evaluatedAt: fixedNow,
    evidence: null,
    blockers: [],
  }),
};

function actor(
  userId = "nurse-1",
  roles: AuthenticatedPrincipal["roles"] = ["nurse"],
): AuthenticatedPrincipal {
  return { userId, roles, sessionId: randomUUID() };
}

class MemoryWorkQueue implements NursingWorkQueueUnitOfWork, NursingWorkQueueTransaction {
  readonly tasks = new Map<string, NursingTaskRecord>();
  readonly events: NursingTaskEventRecord[] = [];
  readonly audits: NewAuditEvent[] = [];
  readonly revokedUsers = new Set<string>();
  readonly episode = {
    id: "episode-1",
    isSynthetic: true,
    responsibleNurseId: "nurse-1",
    responsibleClinicianId: "clinician-1",
  };

  run<T>(operation: (transaction: NursingWorkQueueTransaction) => Promise<T>) {
    return operation(this);
  }
  async lockActiveUserWithRole(userId: string, role: string) {
    if (this.revokedUsers.has(userId)) return false;
    return (
      (["nurse-1", "nurse-other"].includes(userId) && role === "nurse") ||
      (userId === "clinician-1" && role === "clinician")
    );
  }
  async getEpisode(episodeId: string) {
    return episodeId === this.episode.id ? this.episode : null;
  }
  async getAlert(alertId: string) {
    if (alertId === "alert-1") {
      return {
        id: alertId,
        episodeId: this.episode.id,
        state: "reviewed" as const,
        ruleVersionId: "rule-version-1",
        ruleVersionNumber: 1,
        review: {
          id: "review-1",
          alertId,
          reviewedById: "clinician-1",
          reviewedAt: new Date("2026-07-20T09:00:00.000Z"),
        },
      };
    }
    if (alertId === "alert-open") {
      return {
        id: alertId,
        episodeId: this.episode.id,
        state: "open" as const,
        ruleVersionId: "rule-version-1",
        ruleVersionNumber: 1,
        review: null,
      };
    }
    if (alertId === "alert-invalid-review") {
      return {
        id: alertId,
        episodeId: this.episode.id,
        state: "reviewed" as const,
        ruleVersionId: "rule-version-1",
        ruleVersionNumber: 1,
        review: {
          id: "review-invalid",
          alertId: "alert-other",
          reviewedById: "clinician-1",
          reviewedAt: new Date("2026-07-20T09:00:00.000Z"),
        },
      };
    }
    return null;
  }
  async isAuthorizedAssignee(userId: string, episodeId: string) {
    return episodeId === this.episode.id && ["nurse-1", "clinician-1"].includes(userId);
  }
  async getTask(taskId: string) {
    return this.tasks.get(taskId) ?? null;
  }
  async findTaskByCreationIdempotency(createdById: string, idempotencyKey: string) {
    return (
      [...this.tasks.values()].find(
        (task) =>
          task.createdById === createdById && task.creationIdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }
  async claimTask(input: Parameters<NursingWorkQueueTransaction["claimTask"]>[0]) {
    const existing = await this.findTaskByCreationIdempotency(
      input.createdById,
      input.idempotencyKey,
    );
    if (existing) return { task: existing, created: false };
    const task: NursingTaskRecord = {
      id: `task-${this.tasks.size + 1}`,
      episodeId: input.episodeId,
      alertId: input.alertId,
      summary: input.summary,
      currentState: "open",
      assignedToId: input.assignedToId,
      createdById: input.createdById,
      creationIdempotencyKey: input.idempotencyKey,
      creationFingerprint: input.requestFingerprint,
      revision: 1,
      resolvedById: null,
      resolvedAt: null,
      resolutionReason: null,
      createdAt: input.createdAt,
    };
    this.tasks.set(task.id, task);
    return { task, created: true };
  }
  async findEventByIdempotency(actorUserId: string, idempotencyKey: string) {
    return (
      this.events.find(
        (event) => event.actorUserId === actorUserId && event.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }
  async applyTaskEvent(input: Parameters<NursingWorkQueueTransaction["applyTaskEvent"]>[0]) {
    const existing = await this.findEventByIdempotency(input.actorUserId, input.idempotencyKey);
    if (existing) return { task: this.tasks.get(input.task.id)!, event: existing, created: false };
    const event: NursingTaskEventRecord = {
      id: `event-${this.events.length + 1}`,
      taskId: input.task.id,
      type: input.type,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      resultingRevision: input.task.revision + 1,
    };
    const resolved = input.type === "resolved";
    const task: NursingTaskRecord = {
      ...input.task,
      currentState: resolved ? "resolved" : "open",
      assignedToId: input.toAssignedToId,
      revision: input.task.revision + 1,
      resolvedById: resolved ? input.actorUserId : null,
      resolvedAt: resolved ? input.occurredAt : null,
      resolutionReason: input.resolutionReason,
    };
    this.events.push(event);
    this.tasks.set(task.id, task);
    return { task, event, created: true };
  }
  async appendAuditEvent(input: NewAuditEvent) {
    this.audits.push(input);
    return { id: `audit-${this.audits.length}` };
  }
}

describe("nursing task application services", () => {
  it("crea únicamente por llamada humana explícita, ligada al episodio y opcionalmente al aviso", async () => {
    const store = new MemoryWorkQueue();
    expect(store.tasks).toHaveProperty("size", 0);
    const service = new CreateNursingTaskService(store, () => fixedNow);
    const result = await service.execute({
      actor: actor(),
      episodeId: "episode-1",
      alertId: "alert-1",
      summary: "Revisar seguimiento sintético",
      assignedToId: null,
      idempotencyKey: "task:create-001",
      correlationId: randomUUID(),
    });
    expect(result).toMatchObject({ state: "open", revision: 1, idempotent: false });
    expect(store.tasks.get(result.taskId)).toMatchObject({
      episodeId: "episode-1",
      alertId: "alert-1",
    });
    expect(store.audits).toEqual([
      expect.objectContaining({
        action: "TASK_CREATED",
        resourceType: "Task",
        resourceId: result.taskId,
      }),
    ]);
    expect(JSON.stringify(store.audits)).not.toContain("Revisar seguimiento");

    const retry = await service.execute({
      actor: actor(),
      episodeId: "episode-1",
      alertId: "alert-1",
      summary: "Revisar seguimiento sintético",
      assignedToId: null,
      idempotencyKey: "task:create-001",
      correlationId: randomUUID(),
    });
    expect(retry).toMatchObject({ taskId: result.taskId, idempotent: true });
    expect(store.tasks.size).toBe(1);
  });

  it("usa la revisión real como evidencia y permite reviewer distinto del acting actor", async () => {
    const store = new MemoryWorkQueue();
    store.revokedUsers.add("clinician-1");
    const result = await new CreateNursingTaskService(store, () => fixedNow).execute({
      actor: actor("nurse-1", ["nurse"]),
      episodeId: "episode-1",
      alertId: "alert-1",
      summary: "Seguimiento explícito por otro profesional",
      assignedToId: null,
      idempotencyKey: "task:reviewer-different",
      correlationId: randomUUID(),
    });
    expect(result).toMatchObject({ state: "open", idempotent: false });
    expect(store.tasks.get(result.taskId)?.createdById).toBe("nurse-1");
  });

  it("una policy permisiva no permite que un profesional activo pero no responsable cree una tarea", async () => {
    const store = new MemoryWorkQueue();
    const evaluate = vi.fn(permissivePolicy.evaluate);
    await expect(
      new CreateNursingTaskService(store, () => fixedNow, { evaluate }).execute({
        actor: actor("nurse-other", ["nurse"]),
        episodeId: "episode-1",
        alertId: "alert-1",
        summary: "No debe ampliar acceso por policy inyectada",
        assignedToId: null,
        idempotencyKey: "task:permissive-not-responsible",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskDeniedError);
    expect(evaluate).not.toHaveBeenCalled();
    expect(store.tasks.size).toBe(0);
  });

  it("una policy permisiva no permite actuar con un rol revocado", async () => {
    const store = new MemoryWorkQueue();
    store.revokedUsers.add("nurse-1");
    const evaluate = vi.fn(permissivePolicy.evaluate);
    await expect(
      new CreateNursingTaskService(store, () => fixedNow, { evaluate }).execute({
        actor: actor("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        alertId: "alert-1",
        summary: "No debe sustituir RBAC por autorización humana",
        assignedToId: null,
        idempotencyKey: "task:permissive-revoked",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskDeniedError);
    expect(evaluate).not.toHaveBeenCalled();
    expect(store.tasks.size).toBe(0);
  });

  it("una policy permisiva preserva la creación explícita para un actor autorizado y responsable", async () => {
    const store = new MemoryWorkQueue();
    const evaluate = vi.fn(permissivePolicy.evaluate);
    const result = await new CreateNursingTaskService(store, () => fixedNow, { evaluate }).execute({
      actor: actor("nurse-1", ["nurse"]),
      episodeId: "episode-1",
      alertId: "alert-1",
      summary: "Acción explícita tras guards independientes",
      assignedToId: null,
      idempotencyKey: "task:permissive-authorized",
      correlationId: randomUUID(),
    });
    expect(evaluate).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ state: "open", idempotent: false });
    expect(store.tasks.get(result.taskId)).toMatchObject({
      episodeId: "episode-1",
      alertId: "alert-1",
      createdById: "nurse-1",
    });
  });

  it("deniega a un profesional no responsable y una vinculación cruzada de aviso", async () => {
    const store = new MemoryWorkQueue();
    const service = new CreateNursingTaskService(store);
    await expect(
      service.execute({
        actor: actor("nurse-other"),
        episodeId: "episode-1",
        alertId: null,
        summary: "Acción que debe denegarse",
        assignedToId: null,
        idempotencyKey: "task:denied-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskDeniedError);
    await expect(
      service.execute({
        actor: actor(),
        episodeId: "episode-1",
        alertId: "alert-other",
        summary: "Aviso ajeno inexistente",
        assignedToId: null,
        idempotencyKey: "task:denied-002",
        correlationId: randomUUID(),
      }),
    ).rejects.toThrow();
    await expect(
      service.execute({
        actor: actor(),
        episodeId: "episode-1",
        alertId: "alert-open",
        summary: "Aviso todavía sin revisión humana",
        assignedToId: null,
        idempotencyKey: "task:denied-003",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskConflictError);
    await expect(
      service.execute({
        actor: actor(),
        episodeId: "episode-1",
        alertId: "alert-invalid-review",
        summary: "Evidencia de revisión inconsistente",
        assignedToId: null,
        idempotencyKey: "task:denied-review",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskConflictError);
    await expect(
      service.execute({
        actor: actor(),
        episodeId: "episode-1",
        alertId: null,
        summary: "Asignación fuera de responsables",
        assignedToId: "nurse-other",
        idempotencyKey: "task:denied-004",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskDeniedError);
    expect(store.tasks.size).toBe(0);
  });

  it("revalida la autorización actual del acting actor aunque exista revisión histórica", async () => {
    const store = new MemoryWorkQueue();
    store.revokedUsers.add("nurse-1");
    await expect(
      new CreateNursingTaskService(store).execute({
        actor: actor("nurse-1", ["nurse"]),
        episodeId: "episode-1",
        alertId: "alert-1",
        summary: "No debe aceptar al actor revocado",
        assignedToId: null,
        idempotencyKey: "task:actor-revoked",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskDeniedError);
    expect(store.tasks.size).toBe(0);
  });

  it("distingue tarea abierta de resuelta y exige motivo, actor, fecha y revisión vigente", async () => {
    const store = new MemoryWorkQueue();
    const created = await new CreateNursingTaskService(store, () => fixedNow).execute({
      actor: actor(),
      episodeId: "episode-1",
      alertId: null,
      summary: "Seguimiento manual sin aviso",
      assignedToId: "nurse-1",
      idempotencyKey: "task:create-002",
      correlationId: randomUUID(),
    });
    expect(created.state).toBe("open");
    const update = new UpdateNursingTaskService(store, () => fixedNow);
    await expect(
      update.execute({
        actor: actor(),
        taskId: created.taskId,
        expectedRevision: 1,
        action: { kind: "resolve", reason: "" },
        idempotencyKey: "task:resolve-bad",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskValidationError);
    const resolved = await update.execute({
      actor: actor(),
      taskId: created.taskId,
      expectedRevision: 1,
      action: { kind: "resolve", reason: "Seguimiento organizativo completado" },
      idempotencyKey: "task:resolve-001",
      correlationId: randomUUID(),
    });
    expect(resolved).toMatchObject({
      state: "resolved",
      revision: 2,
      resolvedById: "nurse-1",
      resolvedAt: fixedNow,
    });
    expect(store.audits.at(-1)).toMatchObject({
      action: "TASK_RESOLVED",
      resourceId: created.taskId,
    });
    await expect(
      update.execute({
        actor: actor(),
        taskId: created.taskId,
        expectedRevision: 1,
        action: { kind: "note", note: "Escritura obsoleta" },
        idempotencyKey: "task:stale-001",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NursingTaskConflictError);
  });

  it("audita asignación, contacto y nota sin copiar su contenido", async () => {
    const store = new MemoryWorkQueue();
    let current = await new CreateNursingTaskService(store, () => fixedNow).execute({
      actor: actor(),
      episodeId: "episode-1",
      alertId: null,
      summary: "Coordinar revisión manual",
      assignedToId: null,
      idempotencyKey: "task:create-003",
      correlationId: randomUUID(),
    });
    const update = new UpdateNursingTaskService(store, () => fixedNow);
    for (const [action, key] of [
      [{ kind: "assign", assignedToId: "clinician-1" }, "task:assign-001"],
      [{ kind: "contact-attempt", outcome: "no-answer" }, "task:contact-001"],
      [{ kind: "note", note: "Nota sintética minimizada" }, "task:note-001"],
    ] as const) {
      current = await update.execute({
        actor: actor(),
        taskId: current.taskId,
        expectedRevision: current.revision,
        action,
        idempotencyKey: key,
        correlationId: randomUUID(),
      });
    }
    expect(store.audits.map(({ action }) => action)).toEqual([
      "TASK_CREATED",
      "TASK_ASSIGNED",
      "TASK_CONTACT_ATTEMPT_RECORDED",
      "TASK_NOTE_RECORDED",
    ]);
    expect(JSON.stringify(store.audits)).not.toContain("Nota sintética");
  });
});
