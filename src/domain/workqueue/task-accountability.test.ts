import { describe, expect, it } from "vitest";

import {
  projectTaskAccountability,
  type TaskAccountabilityEvent,
  type TaskAccountabilityTask,
} from "@/domain/workqueue/task-accountability";

const createdAt = new Date("2026-07-27T08:00:00.000Z");

function task(overrides: Partial<TaskAccountabilityTask> = {}): TaskAccountabilityTask {
  return {
    id: "task-1",
    episodeId: "episode-1",
    alertId: null,
    currentState: "open",
    assignedToId: null,
    createdById: "creator-a",
    revision: 1,
    resolvedById: null,
    resolvedAt: null,
    createdAt,
    ...overrides,
  };
}

function event(overrides: Partial<TaskAccountabilityEvent> = {}): TaskAccountabilityEvent {
  return {
    id: "event-1",
    taskId: "task-1",
    type: "created",
    fromState: null,
    toState: "open",
    fromAssignedToId: null,
    toAssignedToId: null,
    actorUserId: "creator-a",
    actorRole: "nurse",
    resultingRevision: 1,
    occurredAt: createdAt,
    ...overrides,
  };
}

function project(
  currentTask: TaskAccountabilityTask,
  events: readonly TaskAccountabilityEvent[],
  currentAssigneeCurrentlyAuthorized = true,
) {
  return projectTaskAccountability({
    task: currentTask,
    events,
    currentAssigneeCurrentlyAuthorized,
  });
}

describe("task accountability projection", () => {
  it("clasifica iniciación humana directa y tarea derivada sin copiar procedencia", () => {
    expect(project(task(), [event()]).origin).toEqual({
      kind: "DIRECT_HUMAN_INITIATION",
      alertId: null,
    });
    expect(project(task({ alertId: "alert-1" }), [event()]).origin).toEqual({
      kind: "REVIEWED_ALERT_DERIVED",
      alertId: "alert-1",
    });
  });

  it("mantiene creator, assignee y event actor como identidades distintas", () => {
    const events = [
      event(),
      event({
        id: "event-2",
        type: "assigned",
        fromState: "open",
        toState: "open",
        toAssignedToId: "assignee-b",
        actorUserId: "actor-c",
        actorRole: "clinician",
        resultingRevision: 2,
      }),
    ];
    const view = project(task({ assignedToId: "assignee-b", revision: 2 }), events);
    expect(view).toMatchObject({
      createdById: "creator-a",
      currentAssigneeId: "assignee-b",
      assignmentStatus: "ASSIGNED",
      consistencyStatus: "VALID",
    });
    expect(view.assignmentHistory).toEqual([
      expect.objectContaining({
        kind: "ASSIGNMENT",
        actorUserId: "actor-c",
        actorRole: "clinician",
        toAssignedToId: "assignee-b",
      }),
    ]);
  });

  it("rechaza una creación cuyo timestamp no coincide con el primer evento", () => {
    const view = project(task(), [event({ occurredAt: new Date("2026-07-27T08:00:00.001Z") })]);
    expect(view.consistencyStatus).toBe("INCONSISTENT");
    expect(view.blockers).toContain("CREATION_EVENT_MISMATCH");
  });

  it("trata CREATED con assignee como asignación inicial sin evento ficticio", () => {
    const view = project(task({ assignedToId: "assignee-a" }), [
      event({ toAssignedToId: "assignee-a" }),
    ]);
    expect(view.assignmentHistory).toEqual([
      expect.objectContaining({
        kind: "INITIAL_ASSIGNMENT",
        fromAssignedToId: null,
        toAssignedToId: "assignee-a",
        resultingRevision: 1,
      }),
    ]);
    expect(view.lifecycle).toHaveLength(1);
  });

  it("mantiene CREATED sin assignee como UNASSIGNED sin fallback ni acceptance", () => {
    const view = project(task(), [event()]);
    expect(view).toMatchObject({
      assignmentStatus: "UNASSIGNED",
      currentAssigneeId: null,
      currentAssigneeEligibility: "NOT_APPLICABLE",
      blockers: [],
    });
    expect(JSON.stringify(view)).not.toMatch(/accept|acknowledge|fallback/i);
  });

  it("reconstruye asignación y múltiples reasignaciones preservando actor y extremos", () => {
    const events = [
      event(),
      event({
        id: "event-2",
        type: "assigned",
        fromState: "open",
        toState: "open",
        toAssignedToId: "assignee-a",
        actorUserId: "actor-x",
        resultingRevision: 2,
      }),
      event({
        id: "event-3",
        type: "reassigned",
        fromState: "open",
        toState: "open",
        fromAssignedToId: "assignee-a",
        toAssignedToId: "assignee-b",
        actorUserId: "actor-y",
        actorRole: "clinician",
        resultingRevision: 3,
      }),
      event({
        id: "event-4",
        type: "reassigned",
        fromState: "open",
        toState: "open",
        fromAssignedToId: "assignee-b",
        toAssignedToId: "assignee-c",
        actorUserId: "actor-z",
        resultingRevision: 4,
      }),
    ];
    const view = project(task({ assignedToId: "assignee-c", revision: 4 }), events);
    expect(
      view.assignmentHistory.map(({ kind, fromAssignedToId, toAssignedToId }) => ({
        kind,
        fromAssignedToId,
        toAssignedToId,
      })),
    ).toEqual([
      { kind: "ASSIGNMENT", fromAssignedToId: null, toAssignedToId: "assignee-a" },
      { kind: "REASSIGNMENT", fromAssignedToId: "assignee-a", toAssignedToId: "assignee-b" },
      { kind: "REASSIGNMENT", fromAssignedToId: "assignee-b", toAssignedToId: "assignee-c" },
    ]);
    expect(view.consistencyStatus).toBe("VALID");
  });

  it.each(["contact-attempt", "note-recorded"] as const)("%s no modifica la asignación", (type) => {
    const view = project(task({ assignedToId: "assignee-a", revision: 2 }), [
      event({ toAssignedToId: "assignee-a" }),
      event({
        id: "event-2",
        type,
        fromState: "open",
        toState: "open",
        fromAssignedToId: "assignee-a",
        toAssignedToId: "assignee-a",
        resultingRevision: 2,
      }),
    ]);
    expect(view.assignmentHistory).toHaveLength(1);
    expect(view.currentAssigneeId).toBe("assignee-a");
    expect(view.consistencyStatus).toBe("VALID");
  });

  it("registra resolver distinto del assignee sin inventar transferencia", () => {
    const resolvedAt = new Date("2026-07-27T09:00:00.000Z");
    const view = project(
      task({
        currentState: "resolved",
        assignedToId: "assignee-a",
        revision: 2,
        resolvedById: "resolver-b",
        resolvedAt,
      }),
      [
        event({ toAssignedToId: "assignee-a" }),
        event({
          id: "event-2",
          type: "resolved",
          fromState: "open",
          toState: "resolved",
          fromAssignedToId: "assignee-a",
          toAssignedToId: "assignee-a",
          actorUserId: "resolver-b",
          actorRole: "clinician",
          resultingRevision: 2,
          occurredAt: resolvedAt,
        }),
      ],
    );
    expect(view).toMatchObject({
      assignmentStatus: "RESOLVED",
      currentAssigneeId: "assignee-a",
      resolvedById: "resolver-b",
      consistencyStatus: "VALID",
    });
    expect(view.assignmentHistory).toHaveLength(1);
  });

  it.each([
    {
      name: "revision gap",
      currentTask: task({ revision: 3 }),
      events: [
        event(),
        event({ id: "event-3", type: "note-recorded", fromState: "open", resultingRevision: 3 }),
      ],
      blocker: "TASK_EVENT_REVISION_GAP",
    },
    {
      name: "from assignee mismatch",
      currentTask: task({ assignedToId: "assignee-b", revision: 2 }),
      events: [
        event({ toAssignedToId: "assignee-a" }),
        event({
          id: "event-2",
          type: "reassigned",
          fromState: "open",
          fromAssignedToId: "assignee-x",
          toAssignedToId: "assignee-b",
          resultingRevision: 2,
        }),
      ],
      blocker: "ASSIGNMENT_CHAIN_MISMATCH",
    },
    {
      name: "current assignee mismatch",
      currentTask: task({ assignedToId: "assignee-b" }),
      events: [event({ toAssignedToId: "assignee-a" })],
      blocker: "CURRENT_ASSIGNEE_EVENT_MISMATCH",
    },
    {
      name: "task revision mismatch",
      currentTask: task({ revision: 2 }),
      events: [event()],
      blocker: "TASK_REVISION_EVENT_MISMATCH",
    },
  ] as const)("marca inconsistencia estructural ante $name", ({ currentTask, events, blocker }) => {
    const view = project(currentTask, events);
    expect(view.consistencyStatus).toBe("INCONSISTENT");
    expect(view.blockers).toContain(blocker);
  });

  it("representa assignee revocado como no autorizado sin reescribir historia", () => {
    const events = [event({ toAssignedToId: "assignee-a" })];
    const before = structuredClone(events);
    const view = project(task({ assignedToId: "assignee-a" }), events, false);
    expect(view).toMatchObject({
      consistencyStatus: "VALID",
      currentAssigneeEligibility: "NOT_CURRENTLY_AUTHORIZED",
      blockers: ["CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED"],
    });
    expect(events).toEqual(before);
    expect(view.assignmentHistory).toHaveLength(1);
  });

  it("declara incompleto un prefijo válido de eventos sin inventar mismatches del sufijo", () => {
    const events = [
      event(),
      ...Array.from({ length: 49 }, (_, index) =>
        event({
          id: `event-${index + 2}`,
          type: "note-recorded",
          fromState: "open",
          toState: "open",
          resultingRevision: index + 2,
          occurredAt: new Date(createdAt.getTime() + index + 1),
        }),
      ),
    ];
    const view = projectTaskAccountability({
      task: task({ revision: 51 }),
      events,
      currentAssigneeCurrentlyAuthorized: true,
      historyComplete: false,
    });

    expect(view.consistencyStatus).toBe("INCOMPLETE");
    expect(view.limitations).toEqual(["TASK_EVENT_HISTORY_TRUNCATED"]);
    expect(view.blockers).not.toContain("TASK_REVISION_EVENT_MISMATCH");
    expect(view.blockers).not.toContain("CURRENT_STATE_EVENT_MISMATCH");
    expect(view.blockers).not.toContain("CURRENT_ASSIGNEE_EVENT_MISMATCH");
  });

  it("es side-effect-free y no copia payload clínico, acceptance, SLA o prioridad", () => {
    const sensitiveTask = {
      ...task(),
      summary: "SENSITIVE-SUMMARY",
      resolutionReason: "SENSITIVE-REASON",
    };
    const sensitiveEvent = {
      ...event(),
      note: "SENSITIVE-NOTE",
      resolutionReason: "SENSITIVE-EVENT-REASON",
    };
    const view = projectTaskAccountability({
      task: sensitiveTask,
      events: [sensitiveEvent],
      currentAssigneeCurrentlyAuthorized: true,
    });
    expect(JSON.stringify(view)).not.toMatch(
      /SENSITIVE|summary|note|resolutionReason|accepted|acknowledged|priority|dueAt|deadline|sla|escalation/i,
    );
  });
});
