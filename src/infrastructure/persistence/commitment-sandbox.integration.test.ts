import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CommitmentConflictError,
  CommitmentSandboxCoreService,
  CommitmentSyntheticInvariantError,
} from "@/application/commitment/manage-commitments";
import type {
  CommitmentTransaction,
  CommitmentUnitOfWork,
} from "@/application/ports/commitment-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { CommitmentAuthorizationPolicy } from "@/domain/commitment/commitment-authorization";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaSyntheticCommitmentUnitOfWork } from "@/infrastructure/persistence/prisma-commitment-unit-of-work";

const gate = { configured: true, enabled: true } as const;
const policy: CommitmentAuthorizationPolicy = {
  evaluate: (request) => ({
    status: "AUTHORIZED",
    command: request.command,
    actorId: request.actor.userId,
    episodeId: request.episodeId,
  }),
};

async function syntheticUser(role: "admin" | "nurse" | "clinician", isSynthetic = true) {
  return prisma.user.create({
    data: {
      syntheticAlias: `commitment-${role}-${randomUUID()}`,
      displayLabel: `SYNTHETIC 5B FIXTURE ${role}`,
      isSynthetic,
      roleAssignments: { create: { role } },
    },
  });
}

async function setup(options: { actorSynthetic?: boolean; patientSynthetic?: boolean } = {}) {
  const [actor, nurse, clinician] = await Promise.all([
    syntheticUser("admin", options.actorSynthetic ?? true),
    syntheticUser("nurse"),
    syntheticUser("clinician"),
  ]);
  const protocol = await prisma.checkInProtocolVersion.create({
    data: {
      protocolKey: `commitment-protocol-${randomUUID()}`,
      versionNumber: 1,
      title: "SYNTHETIC 5B PROTOCOL FIXTURE",
      state: "DRAFT",
      isSyntheticFixture: true,
      createdById: actor.id,
    },
  });
  const patient = await prisma.patient.create({
    data: {
      externalPseudonymousId: `SYNTH-COMMITMENT-${randomUUID()}`,
      isSynthetic: options.patientSynthetic ?? true,
      createdById: actor.id,
    },
  });
  const episode = await prisma.dischargeEpisode.create({
    data: {
      patientId: patient.id,
      dischargeDate: new Date("2026-08-02T00:00:00.000Z"),
      programLengthDays: 30,
      responsibleNurseId: nurse.id,
      responsibleClinicianId: clinician.id,
      status: "ACTIVE",
      createdById: actor.id,
      checkInProtocolVersionId: protocol.id,
    },
  });
  const definition = await prisma.commitmentDefinition.create({
    data: {
      definitionKey: `synthetic.commitment.${randomUUID()}`,
      isSynthetic: true,
      createdById: actor.id,
    },
  });
  const definitionV1 = await prisma.commitmentDefinitionVersion.create({
    data: {
      definitionId: definition.id,
      versionNumber: 1,
      state: "DRAFT",
      isSynthetic: true,
      sourceType: "synthetic.protocol",
      sourceId: `synthetic-source-${randomUUID()}`,
      sourceVersion: "v1",
      actionKey: "synthetic.action.v1",
      actionStatement: "SYNTHETIC technical action one recorded by fixture",
      responsibleRoleRef: "synthetic.role.ref",
      dueSourceKind: "synthetic.due.source",
      evidencePolicyKey: "synthetic.evidence.policy",
      evidencePolicyVersion: "v1",
      createdById: actor.id,
    },
  });
  const definitionV2 = await prisma.commitmentDefinitionVersion.create({
    data: {
      definitionId: definition.id,
      versionNumber: 2,
      state: "DRAFT",
      basedOnVersionId: definitionV1.id,
      isSynthetic: true,
      sourceType: "synthetic.protocol",
      sourceId: `synthetic-source-${randomUUID()}`,
      sourceVersion: "v2",
      actionKey: "synthetic.action.v2",
      actionStatement: "SYNTHETIC technical action two recorded by fixture",
      responsibleRoleRef: "synthetic.role.ref",
      dueSourceKind: "synthetic.due.source",
      evidencePolicyKey: "synthetic.evidence.policy",
      evidencePolicyVersion: "v2",
      createdById: actor.id,
    },
  });
  const principal: AuthenticatedPrincipal = {
    userId: actor.id,
    roles: ["admin"],
    sessionId: randomUUID(),
  };
  return { actor, episode, definitionV1, definitionV2, principal };
}

function service(unitOfWork: CommitmentUnitOfWork = new PrismaSyntheticCommitmentUnitOfWork()) {
  return new CommitmentSandboxCoreService(
    unitOfWork,
    gate,
    policy,
    () => new Date("2026-08-02T12:00:00.000Z"),
  );
}

function createInput(fixture: Awaited<ReturnType<typeof setup>>, idempotencyKey: string) {
  return {
    kind: "CREATE_COMMITMENT_DRAFT" as const,
    actor: fixture.principal,
    actorRole: "admin" as const,
    episodeId: fixture.episode.id,
    definitionVersionId: fixture.definitionV1.id,
    assignedUserId: null,
    dueAt: "2026-08-04T12:00:00.000Z",
    timeZone: "Europe/Madrid",
    dueSource: {
      kind: "synthetic.due.source",
      sourceId: "synthetic-due-source-1",
      version: "v1",
    },
    idempotencyKey,
    correlationId: randomUUID(),
  };
}

function activateInput(
  fixture: Awaited<ReturnType<typeof setup>>,
  commitmentId: string,
  idempotencyKey: string,
) {
  return {
    kind: "ACTIVATE_COMMITMENT" as const,
    actor: fixture.principal,
    actorRole: "admin" as const,
    commitmentId,
    expectedRevision: 1,
    idempotencyKey,
    correlationId: randomUUID(),
  };
}

function supersedeInput(
  fixture: Awaited<ReturnType<typeof setup>>,
  commitmentId: string,
  kind: "SUPERSEDE_DRAFT" | "SUPERSEDE_ACTIVE_VERSION",
  expectedRevision: number,
  idempotencyKey: string,
) {
  return {
    kind,
    actor: fixture.principal,
    actorRole: "admin" as const,
    commitmentId,
    expectedRevision,
    replacementDefinitionVersionId: fixture.definitionV2.id,
    assignedUserId: null,
    dueAt: "2026-08-05T12:00:00.000Z",
    timeZone: "Europe/Madrid",
    dueSource: {
      kind: "synthetic.due.source",
      sourceId: "synthetic-due-source-2",
      version: "v2",
    },
    correctionReason: "synthetic correction reference v2",
    idempotencyKey,
    correlationId: randomUUID(),
  } as const;
}

class FailingAuditUnitOfWork implements CommitmentUnitOfWork {
  constructor(private readonly base: CommitmentUnitOfWork) {}

  run<T>(operation: (transaction: CommitmentTransaction) => Promise<T>): Promise<T> {
    return this.base.run((transaction) => {
      const proxy = new Proxy(transaction, {
        get(target, property) {
          if (property === "appendAuditEvent") {
            return () => Promise.reject(new Error("synthetic audit write failure"));
          }
          const value = Reflect.get(target, property, target) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      return operation(proxy);
    });
  }
}

describe("commitment 5B PostgreSQL persistence", () => {
  it("persiste, recupera, activa e idempotentemente no duplica evento/auditoría", async () => {
    const fixture = await setup();
    const createKey = `commitment-create:${randomUUID()}`;
    const created = await service().execute(createInput(fixture, createKey));
    const recovered = await prisma.episodeCommitment.findUniqueOrThrow({
      where: { id: created.commitmentId },
      include: { currentVersion: true, events: true },
    });
    expect(recovered).toMatchObject({ currentState: "DRAFT", revision: 1 });
    expect(recovered.currentVersion).toMatchObject({
      definitionVersionId: fixture.definitionV1.id,
      versionNumber: 1,
    });

    const activated = await service().execute(
      activateInput(fixture, created.commitmentId, `commitment-activate:${randomUUID()}`),
    );
    expect(activated).toMatchObject({ state: "AWAITING_EVIDENCE", revision: 2 });
    const replay = await service().execute({
      ...createInput(fixture, createKey),
      correlationId: randomUUID(),
    });
    expect(replay).toMatchObject({ commitmentId: created.commitmentId, idempotent: true });
    expect(
      await prisma.commitmentEvent.count({ where: { commitmentId: created.commitmentId } }),
    ).toBe(2);
    expect(
      await prisma.auditEvent.count({
        where: { resourceType: "EpisodeCommitment", resourceId: created.commitmentId },
      }),
    ).toBe(2);
  });

  it("persiste supersession causal desde DRAFT y desde AWAITING_EVIDENCE", async () => {
    const fixture = await setup();
    const draft = await service().execute(
      createInput(fixture, `commitment-create:${randomUUID()}`),
    );
    const supersededDraft = await service().execute(
      supersedeInput(
        fixture,
        draft.commitmentId,
        "SUPERSEDE_DRAFT",
        1,
        `commitment-supersede:${randomUUID()}`,
      ),
    );
    expect(supersededDraft).toMatchObject({ state: "SUPERSEDED_BY_CORRECTION", revision: 2 });

    const secondDraft = await service().execute(
      createInput(fixture, `commitment-create:${randomUUID()}`),
    );
    const active = await service().execute(
      activateInput(fixture, secondDraft.commitmentId, `commitment-activate:${randomUUID()}`),
    );
    const supersededActive = await service().execute(
      supersedeInput(
        fixture,
        active.commitmentId,
        "SUPERSEDE_ACTIVE_VERSION",
        2,
        `commitment-supersede:${randomUUID()}`,
      ),
    );
    expect(supersededActive).toMatchObject({
      state: "SUPERSEDED_BY_CORRECTION",
      revision: 3,
    });
    const versions = await prisma.episodeCommitmentVersion.findMany({
      where: { commitmentId: active.commitmentId },
      orderBy: { versionNumber: "asc" },
    });
    expect(versions).toHaveLength(2);
    expect(versions[1]).toMatchObject({
      basedOnVersionId: versions[0]?.id,
      definitionVersionId: fixture.definitionV2.id,
      correctionReason: "synthetic correction reference v2",
    });
  });

  it("serializa retry idempotente concurrente y conflicto de revisión", async () => {
    const fixture = await setup();
    const sameInput = createInput(fixture, `commitment-create:${randomUUID()}`);
    const same = await Promise.all([service().execute(sameInput), service().execute(sameInput)]);
    expect(new Set(same.map(({ commitmentId }) => commitmentId)).size).toBe(1);
    expect(same.filter(({ idempotent }) => !idempotent)).toHaveLength(1);

    const commitmentId = same[0]!.commitmentId;
    const race = await Promise.allSettled([
      service().execute(
        activateInput(fixture, commitmentId, `commitment-activate:${randomUUID()}`),
      ),
      service().execute(
        supersedeInput(
          fixture,
          commitmentId,
          "SUPERSEDE_DRAFT",
          1,
          `commitment-supersede:${randomUUID()}`,
        ),
      ),
    ]);
    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(race.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(await prisma.commitmentEvent.count({ where: { commitmentId } })).toBe(2);
  });

  it("rechaza reutilización incompatible de clave idempotente", async () => {
    const fixture = await setup();
    const key = `commitment-create:${randomUUID()}`;
    const command = createInput(fixture, key);
    await service().execute(command);
    await expect(
      service().execute({ ...command, dueAt: "2026-08-06T12:00:00.000Z" }),
    ).rejects.toBeInstanceOf(CommitmentConflictError);
  });

  it("revierte compromiso y evento si la auditoría atómica falla", async () => {
    const fixture = await setup();
    const before = await prisma.episodeCommitment.count();
    await expect(
      service(new FailingAuditUnitOfWork(new PrismaSyntheticCommitmentUnitOfWork())).execute(
        createInput(fixture, `commitment-create:${randomUUID()}`),
      ),
    ).rejects.toThrow("synthetic audit write failure");
    expect(await prisma.episodeCommitment.count()).toBe(before);
  });

  it("impide update/delete de definiciones, snapshots y eventos", async () => {
    const fixture = await setup();
    const created = await service().execute(
      createInput(fixture, `commitment-create:${randomUUID()}`),
    );
    const event = await prisma.commitmentEvent.findFirstOrThrow({
      where: { commitmentId: created.commitmentId },
    });
    await expect(
      prisma.commitmentDefinitionVersion.update({
        where: { id: fixture.definitionV1.id },
        data: { actionKey: "synthetic.mutated" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.episodeCommitmentVersion.delete({ where: { id: created.currentVersionId } }),
    ).rejects.toThrow();
    await expect(
      prisma.commitmentEvent.update({
        where: { id: event.id },
        data: { requestFingerprint: "f".repeat(64) },
      }),
    ).rejects.toThrow();
  });

  it.each([
    { actorSynthetic: false, patientSynthetic: true },
    { actorSynthetic: true, patientSynthetic: false },
  ])("rechaza identidades o episodio no sintéticos: %o", async (options) => {
    const fixture = await setup(options);
    await expect(
      service().execute(createInput(fixture, `commitment-create:${randomUUID()}`)),
    ).rejects.toBeInstanceOf(CommitmentSyntheticInvariantError);
  });

  it("no muta episodio, tareas ni avisos durante el lifecycle 5B", async () => {
    const fixture = await setup();
    const before = await prisma.dischargeEpisode.findUniqueOrThrow({
      where: { id: fixture.episode.id },
      select: { status: true, version: true, updatedAt: true },
    });
    const taskCount = await prisma.task.count({ where: { episodeId: fixture.episode.id } });
    const alertCount = await prisma.alert.count({ where: { episodeId: fixture.episode.id } });
    const draft = await service().execute(
      createInput(fixture, `commitment-create:${randomUUID()}`),
    );
    await service().execute(
      activateInput(fixture, draft.commitmentId, `commitment-activate:${randomUUID()}`),
    );
    expect(
      await prisma.dischargeEpisode.findUniqueOrThrow({
        where: { id: fixture.episode.id },
        select: { status: true, version: true, updatedAt: true },
      }),
    ).toEqual(before);
    expect(await prisma.task.count({ where: { episodeId: fixture.episode.id } })).toBe(taskCount);
    expect(await prisma.alert.count({ where: { episodeId: fixture.episode.id } })).toBe(alertCount);
  });
});
