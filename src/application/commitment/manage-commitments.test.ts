import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CommitmentConflictError,
  CommitmentDeniedError,
  CommitmentGateError,
  CommitmentSandboxCoreService,
  CommitmentSyntheticInvariantError,
  type CreateCommitmentDraftCommand,
} from "@/application/commitment/manage-commitments";
import type {
  CommitmentDefinitionVersionRecord,
  CommitmentEventRecord,
  CommitmentTransaction,
  CommitmentUnitOfWork,
  EpisodeCommitmentRecord,
  EpisodeCommitmentVersionRecord,
} from "@/application/ports/commitment-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { CommitmentAuthorizationPolicy } from "@/domain/commitment/commitment-authorization";

const fixedNow = new Date("2026-08-02T12:00:00.000Z");
const enabledGate = { configured: true, enabled: true } as const;

const syntheticPolicy: CommitmentAuthorizationPolicy = {
  evaluate: (request) => ({
    status: "AUTHORIZED",
    command: request.command,
    actorId: request.actor.userId,
    episodeId: request.episodeId,
  }),
};

const principal: AuthenticatedPrincipal = {
  userId: "synthetic-actor-1",
  roles: ["admin"],
  sessionId: randomUUID(),
};

function definition(
  id: string,
  versionNumber: number,
  actionKey: string,
): CommitmentDefinitionVersionRecord {
  return {
    id,
    definitionId: "synthetic-definition-1",
    definitionKey: "synthetic.definition.one",
    versionNumber,
    state: "DRAFT",
    definitionIsSynthetic: true,
    versionIsSynthetic: true,
    creatorIsSynthetic: true,
    sourceType: "synthetic.protocol",
    sourceId: "synthetic-protocol-1",
    sourceVersion: `v${versionNumber}`,
    actionKey,
    actionStatement: `SYNTHETIC technical action ${versionNumber} recorded by fixture`,
    responsibleRoleRef: "synthetic.role.ref",
    dueSourceKind: "synthetic.due.source",
    evidencePolicyKey: "synthetic.evidence.policy",
    evidencePolicyVersion: `v${versionNumber}`,
  };
}

class MemoryCommitmentStore implements CommitmentUnitOfWork, CommitmentTransaction {
  syntheticAdapter = true;
  readonly definitions = new Map<string, CommitmentDefinitionVersionRecord>([
    ["synthetic-definition-v1", definition("synthetic-definition-v1", 1, "synthetic.action.v1")],
    ["synthetic-definition-v2", definition("synthetic-definition-v2", 2, "synthetic.action.v2")],
  ]);
  readonly commitments = new Map<string, EpisodeCommitmentRecord>();
  readonly events: CommitmentEventRecord[] = [];
  readonly audits: NewAuditEvent[] = [];
  episodeIsSynthetic = true;
  actorIsSynthetic = true;
  actorIsActive = true;
  assignedUserIsSynthetic = true;
  assignedUserIsActive = true;
  failAudit = false;

  async run<T>(operation: (transaction: CommitmentTransaction) => Promise<T>): Promise<T> {
    const commitments = new Map(this.commitments);
    const events = [...this.events];
    const audits = [...this.audits];
    try {
      return await operation(this);
    } catch (error) {
      this.commitments.clear();
      for (const [id, commitment] of commitments) this.commitments.set(id, commitment);
      this.events.splice(0, this.events.length, ...events);
      this.audits.splice(0, this.audits.length, ...audits);
      throw error;
    }
  }

  async lockSyntheticContext(input: {
    readonly episodeId: string;
    readonly actorUserId: string;
    readonly assignedUserId: string | null;
  }) {
    if (input.episodeId !== "synthetic-episode-1" || input.actorUserId !== principal.userId) {
      return null;
    }
    return {
      episodeId: input.episodeId,
      episodeIsSynthetic: this.episodeIsSynthetic,
      actorUserId: input.actorUserId,
      actorIsSynthetic: this.actorIsSynthetic,
      actorIsActive: this.actorIsActive,
      assignedUserId: input.assignedUserId,
      assignedUserIsSynthetic: input.assignedUserId === null ? null : this.assignedUserIsSynthetic,
      assignedUserIsActive: input.assignedUserId === null ? null : this.assignedUserIsActive,
    };
  }

  async getDefinitionVersionForUpdate(definitionVersionId: string) {
    return this.definitions.get(definitionVersionId) ?? null;
  }

  async getCommitmentForUpdate(commitmentId: string) {
    return this.commitments.get(commitmentId) ?? null;
  }

  async findEventByIdempotency(actorUserId: string, idempotencyKey: string) {
    return (
      this.events.find(
        (event) => event.actorUserId === actorUserId && event.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async createDraft(input: Parameters<CommitmentTransaction["createDraft"]>[0]) {
    const commitmentId = `synthetic-commitment-${this.commitments.size + 1}`;
    const versionId = `${commitmentId}-version-1`;
    const currentVersion: EpisodeCommitmentVersionRecord = {
      id: versionId,
      commitmentId,
      episodeId: input.episodeId,
      versionNumber: 1,
      basedOnVersionId: null,
      definitionVersionId: input.version.definition.id,
      actionKey: input.version.definition.actionKey,
      actionStatement: input.version.definition.actionStatement,
      responsibleRoleRef: input.version.definition.responsibleRoleRef,
      assignedUserId: input.version.assignedUserId,
      dueAt: input.version.dueAt,
      timeZone: input.version.timeZone,
      dueSourceKind: input.version.dueSource.kind,
      dueSourceId: input.version.dueSource.sourceId,
      dueSourceVersion: input.version.dueSource.version,
      evidencePolicyKey: input.version.definition.evidencePolicyKey,
      evidencePolicyVersion: input.version.definition.evidencePolicyVersion,
      createdById: input.actorUserId,
      actorRole: input.actorRole,
      createdAt: input.occurredAt,
      correctionReason: null,
    };
    const commitment: EpisodeCommitmentRecord = {
      id: commitmentId,
      episodeId: input.episodeId,
      currentVersionId: versionId,
      currentState: "DRAFT",
      revision: 1,
      createdAt: input.occurredAt,
      updatedAt: input.occurredAt,
      currentVersion,
    };
    const event: CommitmentEventRecord = {
      id: `synthetic-event-${this.events.length + 1}`,
      commitmentId,
      episodeId: input.episodeId,
      type: "COMMITMENT_DRAFT_CREATED",
      fromState: null,
      toState: "DRAFT",
      sourceVersionId: null,
      resultingVersionId: versionId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      resultingRevision: 1,
      correctionReason: null,
      occurredAt: input.occurredAt,
    };
    this.commitments.set(commitmentId, commitment);
    this.events.push(event);
    return { commitment, event };
  }

  async applyTransition(input: Parameters<CommitmentTransaction["applyTransition"]>[0]) {
    const previous = input.commitment;
    const currentVersion: EpisodeCommitmentVersionRecord = input.replacementVersion
      ? {
          id: `${previous.id}-version-${previous.currentVersion.versionNumber + 1}`,
          commitmentId: previous.id,
          episodeId: previous.episodeId,
          versionNumber: previous.currentVersion.versionNumber + 1,
          basedOnVersionId: previous.currentVersionId,
          definitionVersionId: input.replacementVersion.definition.id,
          actionKey: input.replacementVersion.definition.actionKey,
          actionStatement: input.replacementVersion.definition.actionStatement,
          responsibleRoleRef: input.replacementVersion.definition.responsibleRoleRef,
          assignedUserId: input.replacementVersion.assignedUserId,
          dueAt: input.replacementVersion.dueAt,
          timeZone: input.replacementVersion.timeZone,
          dueSourceKind: input.replacementVersion.dueSource.kind,
          dueSourceId: input.replacementVersion.dueSource.sourceId,
          dueSourceVersion: input.replacementVersion.dueSource.version,
          evidencePolicyKey: input.replacementVersion.definition.evidencePolicyKey,
          evidencePolicyVersion: input.replacementVersion.definition.evidencePolicyVersion,
          createdById: input.actorUserId,
          actorRole: input.actorRole,
          createdAt: input.occurredAt,
          correctionReason: input.correctionReason,
        }
      : previous.currentVersion;
    const event: CommitmentEventRecord = {
      id: `synthetic-event-${this.events.length + 1}`,
      commitmentId: previous.id,
      episodeId: previous.episodeId,
      type: input.eventType,
      fromState: previous.currentState,
      toState: input.toState,
      sourceVersionId: previous.currentVersionId,
      resultingVersionId: currentVersion.id,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      resultingRevision: previous.revision + 1,
      correctionReason: input.correctionReason,
      occurredAt: input.occurredAt,
    };
    const commitment: EpisodeCommitmentRecord = {
      ...previous,
      currentVersionId: currentVersion.id,
      currentState: input.toState,
      revision: previous.revision + 1,
      updatedAt: input.occurredAt,
      currentVersion,
    };
    this.events.push(event);
    this.commitments.set(commitment.id, commitment);
    return { commitment, event };
  }

  async appendAuditEvent(input: NewAuditEvent) {
    if (this.failAudit) throw new Error("synthetic audit failure");
    this.audits.push(input);
    return { id: `synthetic-audit-${this.audits.length}` };
  }
}

function createCommand(
  overrides: Partial<CreateCommitmentDraftCommand> = {},
): CreateCommitmentDraftCommand {
  return {
    kind: "CREATE_COMMITMENT_DRAFT",
    actor: principal,
    actorRole: "admin",
    episodeId: "synthetic-episode-1",
    definitionVersionId: "synthetic-definition-v1",
    assignedUserId: null,
    dueAt: "2026-08-04T12:00:00.000Z",
    timeZone: "Europe/Madrid",
    dueSource: {
      kind: "synthetic.due.source",
      sourceId: "synthetic-due-source-1",
      version: "v1",
    },
    idempotencyKey: "commitment:create:001",
    correlationId: randomUUID(),
    ...overrides,
  };
}

function service(store: MemoryCommitmentStore) {
  return new CommitmentSandboxCoreService(store, enabledGate, syntheticPolicy, () => fixedNow);
}

async function createDraft(store: MemoryCommitmentStore) {
  return service(store).execute(createCommand());
}

function supersedeInput(
  commitmentId: string,
  kind: "SUPERSEDE_DRAFT" | "SUPERSEDE_ACTIVE_VERSION",
  expectedRevision: number,
) {
  return {
    kind,
    actor: principal,
    actorRole: "admin" as const,
    commitmentId,
    expectedRevision,
    replacementDefinitionVersionId: "synthetic-definition-v2",
    assignedUserId: null,
    dueAt: "2026-08-05T12:00:00.000Z",
    timeZone: "Europe/Madrid",
    dueSource: {
      kind: "synthetic.due.source",
      sourceId: "synthetic-due-source-2",
      version: "v2",
    },
    correctionReason: "synthetic correction reference v2",
    idempotencyKey: `commitment:supersede:${kind}`,
    correlationId: randomUUID(),
  } as const;
}

describe("commitment sandbox application service", () => {
  it("crea un DRAFT sintético y su evento/auditoría minimizados", async () => {
    const store = new MemoryCommitmentStore();
    const created = await createDraft(store);
    expect(created).toMatchObject({
      state: "DRAFT",
      revision: 1,
      eventType: "COMMITMENT_DRAFT_CREATED",
      idempotent: false,
    });
    expect(store.events.map(({ type }) => type)).toEqual(["COMMITMENT_DRAFT_CREATED"]);
    expect(store.audits).toEqual([
      expect.objectContaining({
        action: "COMMITMENT_DRAFT_CREATED",
        resourceType: "EpisodeCommitment",
        resourceId: created.commitmentId,
      }),
    ]);
    expect(JSON.stringify(store.audits)).not.toContain("SYNTHETIC technical action");
  });

  it("activa únicamente DRAFT a AWAITING_EVIDENCE", async () => {
    const store = new MemoryCommitmentStore();
    const draft = await createDraft(store);
    const activated = await service(store).execute({
      kind: "ACTIVATE_COMMITMENT",
      actor: principal,
      actorRole: "admin",
      commitmentId: draft.commitmentId,
      expectedRevision: 1,
      idempotencyKey: "commitment:activate:001",
      correlationId: randomUUID(),
    });
    expect(activated).toMatchObject({
      state: "AWAITING_EVIDENCE",
      revision: 2,
      eventType: "COMMITMENT_ACTIVATED",
    });
    expect(activated.currentVersionId).toBe(draft.currentVersionId);
  });

  it("supersede un DRAFT mediante un snapshot N+1 causal", async () => {
    const store = new MemoryCommitmentStore();
    const draft = await createDraft(store);
    const superseded = await service(store).execute(
      supersedeInput(draft.commitmentId, "SUPERSEDE_DRAFT", 1),
    );
    expect(superseded).toMatchObject({
      state: "SUPERSEDED_BY_CORRECTION",
      revision: 2,
      eventType: "COMMITMENT_SUPERSEDED",
    });
    expect(superseded.currentVersionId).not.toBe(draft.currentVersionId);
    expect(store.commitments.get(draft.commitmentId)?.currentVersion).toMatchObject({
      basedOnVersionId: draft.currentVersionId,
      versionNumber: 2,
      correctionReason: "synthetic correction reference v2",
    });
  });

  it("supersede una versión AWAITING_EVIDENCE sin evaluación temporal", async () => {
    const store = new MemoryCommitmentStore();
    const draft = await createDraft(store);
    const active = await service(store).execute({
      kind: "ACTIVATE_COMMITMENT",
      actor: principal,
      actorRole: "admin",
      commitmentId: draft.commitmentId,
      expectedRevision: 1,
      idempotencyKey: "commitment:activate:active",
      correlationId: randomUUID(),
    });
    const superseded = await service(store).execute(
      supersedeInput(active.commitmentId, "SUPERSEDE_ACTIVE_VERSION", 2),
    );
    expect(superseded).toMatchObject({
      state: "SUPERSEDED_BY_CORRECTION",
      revision: 3,
      eventType: "COMMITMENT_SUPERSEDED",
    });
  });

  it("rechaza reactivar un compromiso superseded", async () => {
    const store = new MemoryCommitmentStore();
    const draft = await createDraft(store);
    const superseded = await service(store).execute(
      supersedeInput(draft.commitmentId, "SUPERSEDE_DRAFT", 1),
    );
    await expect(
      service(store).execute({
        kind: "ACTIVATE_COMMITMENT",
        actor: principal,
        actorRole: "admin",
        commitmentId: superseded.commitmentId,
        expectedRevision: 2,
        idempotencyKey: "commitment:reactivate:blocked",
        correlationId: randomUUID(),
      }),
    ).rejects.toThrow();
    expect(store.events).toHaveLength(2);
  });

  it("falla cerrado con gate apagado o ausente", async () => {
    for (const gate of [
      { configured: true, enabled: false },
      { configured: false, enabled: false },
    ]) {
      const store = new MemoryCommitmentStore();
      await expect(
        new CommitmentSandboxCoreService(store, gate, syntheticPolicy).execute(createCommand()),
      ).rejects.toBeInstanceOf(CommitmentGateError);
      expect(store.commitments.size).toBe(0);
    }
  });

  it("usa deny-all por defecto incluso con el gate encendido", async () => {
    const store = new MemoryCommitmentStore();
    await expect(
      new CommitmentSandboxCoreService(store, enabledGate).execute(createCommand()),
    ).rejects.toBeInstanceOf(CommitmentDeniedError);
  });

  it("rechaza un adaptador no sintético", async () => {
    const store = new MemoryCommitmentStore();
    store.syntheticAdapter = false;
    await expect(service(store).execute(createCommand())).rejects.toMatchObject({
      code: "NON_SYNTHETIC_ADAPTER",
    });
  });

  it.each(["episode", "actor", "assigned-user"] as const)(
    "rechaza contexto no sintético: %s",
    async (target) => {
      const store = new MemoryCommitmentStore();
      if (target === "episode") store.episodeIsSynthetic = false;
      if (target === "actor") store.actorIsSynthetic = false;
      if (target === "assigned-user") store.assignedUserIsSynthetic = false;
      await expect(
        service(store).execute(
          createCommand({
            assignedUserId: target === "assigned-user" ? "synthetic-assignee-1" : null,
          }),
        ),
      ).rejects.toBeInstanceOf(CommitmentSyntheticInvariantError);
    },
  );

  it.each(["definition", "version", "creator"] as const)(
    "rechaza definición/version no sintética: %s",
    async (target) => {
      const store = new MemoryCommitmentStore();
      const current = store.definitions.get("synthetic-definition-v1")!;
      store.definitions.set("synthetic-definition-v1", {
        ...current,
        ...(target === "definition" ? { definitionIsSynthetic: false } : {}),
        ...(target === "version" ? { versionIsSynthetic: false } : {}),
        ...(target === "creator" ? { creatorIsSynthetic: false } : {}),
      });
      await expect(service(store).execute(createCommand())).rejects.toBeInstanceOf(
        CommitmentSyntheticInvariantError,
      );
    },
  );

  it("detecta deriva del snapshot frente a la versión de definición referenciada", async () => {
    const store = new MemoryCommitmentStore();
    const draft = await createDraft(store);
    const current = store.definitions.get("synthetic-definition-v1")!;
    store.definitions.set("synthetic-definition-v1", {
      ...current,
      actionStatement: "SYNTHETIC mutated definition that must be rejected",
    });
    await expect(
      service(store).execute({
        kind: "ACTIVATE_COMMITMENT",
        actor: principal,
        actorRole: "admin",
        commitmentId: draft.commitmentId,
        expectedRevision: 1,
        idempotencyKey: "commitment:immutable:001",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CommitmentConflictError);
  });

  it("reproduce el mismo comando sin duplicar evento ni auditoría", async () => {
    const store = new MemoryCommitmentStore();
    const command = createCommand();
    const first = await service(store).execute(command);
    const replay = await service(store).execute({ ...command, correlationId: randomUUID() });
    expect(replay).toMatchObject({ commitmentId: first.commitmentId, idempotent: true });
    expect(store.commitments.size).toBe(1);
    expect(store.events).toHaveLength(1);
    expect(store.audits).toHaveLength(1);
  });

  it("reproduce el resultado original aunque el agregado haya avanzado", async () => {
    const store = new MemoryCommitmentStore();
    const command = createCommand();
    const draft = await service(store).execute(command);
    await service(store).execute({
      kind: "ACTIVATE_COMMITMENT",
      actor: principal,
      actorRole: "admin",
      commitmentId: draft.commitmentId,
      expectedRevision: 1,
      idempotencyKey: "commitment:activate:before-retry",
      correlationId: randomUUID(),
    });

    const replay = await service(store).execute({
      ...command,
      correlationId: randomUUID(),
    });

    expect(replay).toMatchObject({
      commitmentId: draft.commitmentId,
      currentVersionId: draft.currentVersionId,
      state: "DRAFT",
      revision: 1,
      eventType: "COMMITMENT_DRAFT_CREATED",
      idempotent: true,
    });
    expect(store.events).toHaveLength(2);
    expect(store.audits).toHaveLength(2);
  });

  it("conflicta si una clave idempotente se reutiliza con payload distinto", async () => {
    const store = new MemoryCommitmentStore();
    const command = createCommand();
    await service(store).execute(command);
    await expect(
      service(store).execute({
        ...command,
        dueAt: "2026-08-06T12:00:00.000Z",
        correlationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CommitmentConflictError);
    expect(store.events).toHaveLength(1);
  });

  it("revierte estado y evento cuando falla la auditoría del mismo unit of work", async () => {
    const store = new MemoryCommitmentStore();
    store.failAudit = true;
    await expect(service(store).execute(createCommand())).rejects.toThrow(
      "synthetic audit failure",
    );
    expect(store.commitments.size).toBe(0);
    expect(store.events).toHaveLength(0);
    expect(store.audits).toHaveLength(0);
  });
});
