import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import {
  CommitmentConflictError,
  CommitmentSyntheticInvariantError,
} from "@/application/commitment/manage-commitments";
import type {
  CommitmentDefinitionVersionRecord,
  CommitmentEventRecord,
  CommitmentSyntheticContextRecord,
  CommitmentTransaction,
  CommitmentUnitOfWork,
  EpisodeCommitmentRecord,
  EpisodeCommitmentVersionRecord,
} from "@/application/ports/commitment-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import { prisma } from "@/infrastructure/persistence/prisma";

const versionSelect = {
  id: true,
  commitmentId: true,
  episodeId: true,
  versionNumber: true,
  basedOnVersionId: true,
  definitionVersionId: true,
  actionKey: true,
  actionStatement: true,
  responsibleRoleRef: true,
  assignedUserId: true,
  dueAt: true,
  timeZone: true,
  dueSourceKind: true,
  dueSourceId: true,
  dueSourceVersion: true,
  evidencePolicyKey: true,
  evidencePolicyVersion: true,
  createdById: true,
  actorRole: true,
  createdAt: true,
  correctionReason: true,
} satisfies Prisma.EpisodeCommitmentVersionSelect;

const commitmentSelect = {
  id: true,
  episodeId: true,
  currentVersionId: true,
  currentState: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
  currentVersion: { select: versionSelect },
} satisfies Prisma.EpisodeCommitmentSelect;

const eventSelect = {
  id: true,
  commitmentId: true,
  episodeId: true,
  type: true,
  fromState: true,
  toState: true,
  sourceVersionId: true,
  resultingVersionId: true,
  actorUserId: true,
  actorRole: true,
  idempotencyKey: true,
  requestFingerprint: true,
  resultingRevision: true,
  correctionReason: true,
  occurredAt: true,
} satisfies Prisma.CommitmentEventSelect;

type PrismaCommitment = Prisma.EpisodeCommitmentGetPayload<{ select: typeof commitmentSelect }>;
type PrismaCommitmentEvent = Prisma.CommitmentEventGetPayload<{ select: typeof eventSelect }>;

function toVersion(version: PrismaCommitment["currentVersion"]): EpisodeCommitmentVersionRecord {
  return version;
}

function toCommitment(commitment: PrismaCommitment): EpisodeCommitmentRecord {
  return { ...commitment, currentVersion: toVersion(commitment.currentVersion) };
}

function toEvent(event: PrismaCommitmentEvent): CommitmentEventRecord {
  return event;
}

class PrismaSyntheticCommitmentTransaction implements CommitmentTransaction {
  readonly syntheticAdapter = true;

  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async lockSyntheticContext(input: {
    readonly episodeId: string;
    readonly actorUserId: string;
    readonly assignedUserId: string | null;
    readonly definitionAndVersionCreatorUserIds: readonly string[];
  }): Promise<CommitmentSyntheticContextRecord | null> {
    const rows = await this.transaction.$queryRaw<
      Array<{
        readonly episodeId: string;
        readonly episodeIsSynthetic: boolean;
      }>
    >(Prisma.sql`
      SELECT
        episode."id" AS "episodeId",
        patient."is_synthetic" AS "episodeIsSynthetic"
      FROM "discharge_episodes" AS episode
      INNER JOIN "patients" AS patient ON patient."id" = episode."patient_id"
      WHERE episode."id" = ${input.episodeId}
      FOR UPDATE OF episode, patient
    `);
    const base = rows[0];
    if (!base) return null;

    const orderedProtectedUserIds = [
      ...new Set([
        input.actorUserId,
        ...(input.assignedUserId === null ? [] : [input.assignedUserId]),
        ...input.definitionAndVersionCreatorUserIds,
      ]),
    ].sort();
    const participants = await this.transaction.$queryRaw<
      Array<{
        readonly id: string;
        readonly isSynthetic: boolean;
        readonly isActive: boolean;
      }>
    >(Prisma.sql`
      SELECT
        participant."id",
        participant."is_synthetic" AS "isSynthetic",
        participant."is_active" AS "isActive"
      FROM "users" AS participant
      WHERE participant."id" IN (${Prisma.join(orderedProtectedUserIds)})
      ORDER BY participant."id" ASC
      FOR UPDATE OF participant
    `);
    if (participants.length !== orderedProtectedUserIds.length) return null;
    const participantById = new Map(
      participants.map((participant) => [participant.id, participant]),
    );
    const actor = participantById.get(input.actorUserId);
    const assigned =
      input.assignedUserId === null ? null : participantById.get(input.assignedUserId);
    if (!actor || (input.assignedUserId !== null && !assigned)) return null;

    return {
      ...base,
      actorUserId: actor.id,
      actorIsSynthetic: actor.isSynthetic,
      actorIsActive: actor.isActive,
      assignedUserId: input.assignedUserId,
      assignedUserIsSynthetic: assigned?.isSynthetic ?? null,
      assignedUserIsActive: assigned?.isActive ?? null,
    };
  }

  async getDefinitionVersion(
    definitionVersionId: string,
  ): Promise<CommitmentDefinitionVersionRecord | null> {
    const version = await this.transaction.commitmentDefinitionVersion.findUnique({
      where: { id: definitionVersionId },
      include: {
        definition: {
          select: {
            definitionKey: true,
            isSynthetic: true,
            createdBy: { select: { id: true, isSynthetic: true } },
          },
        },
        createdBy: { select: { id: true, isSynthetic: true } },
      },
    });
    return version
      ? {
          id: version.id,
          definitionId: version.definitionId,
          definitionKey: version.definition.definitionKey,
          versionNumber: version.versionNumber,
          state: version.state,
          definitionIsSynthetic: version.definition.isSynthetic,
          versionIsSynthetic: version.isSynthetic,
          definitionCreatorUserId: version.definition.createdBy.id,
          versionCreatorUserId: version.createdBy.id,
          definitionCreatorIsSynthetic: version.definition.createdBy.isSynthetic,
          versionCreatorIsSynthetic: version.createdBy.isSynthetic,
          sourceType: version.sourceType,
          sourceId: version.sourceId,
          sourceVersion: version.sourceVersion,
          actionKey: version.actionKey,
          actionStatement: version.actionStatement,
          responsibleRoleRef: version.responsibleRoleRef,
          dueSourceKind: version.dueSourceKind,
          evidencePolicyKey: version.evidencePolicyKey,
          evidencePolicyVersion: version.evidencePolicyVersion,
        }
      : null;
  }

  async getCommitmentForUpdate(commitmentId: string): Promise<EpisodeCommitmentRecord | null> {
    const locked = await this.transaction.$queryRaw<Array<{ readonly id: string }>>(Prisma.sql`
      SELECT commitment."id"
      FROM "episode_commitments" AS commitment
      INNER JOIN "episode_commitment_versions" AS version
        ON version."id" = commitment."current_version_id"
       AND version."commitment_id" = commitment."id"
       AND version."episode_id" = commitment."episode_id"
      WHERE commitment."id" = ${commitmentId}
      FOR UPDATE OF commitment, version
    `);
    if (!locked[0]) return null;
    const commitment = await this.transaction.episodeCommitment.findUnique({
      where: { id: commitmentId },
      select: commitmentSelect,
    });
    return commitment ? toCommitment(commitment) : null;
  }

  async findEventByIdempotency(actorUserId: string, idempotencyKey: string) {
    const event = await this.transaction.commitmentEvent.findUnique({
      where: { actorUserId_idempotencyKey: { actorUserId, idempotencyKey } },
      select: eventSelect,
    });
    return event ? toEvent(event) : null;
  }

  async createDraft(input: Parameters<CommitmentTransaction["createDraft"]>[0]) {
    const commitmentId = randomUUID();
    const versionId = randomUUID();
    await this.transaction.episodeCommitment.create({
      data: {
        id: commitmentId,
        episodeId: input.episodeId,
        currentVersionId: versionId,
        currentState: "DRAFT",
        revision: 1,
        createdAt: input.occurredAt,
        updatedAt: input.occurredAt,
      },
    });
    await this.transaction.episodeCommitmentVersion.create({
      data: {
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
      },
    });
    const event = await this.transaction.commitmentEvent.create({
      data: {
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
      },
      select: eventSelect,
    });
    const commitment = await this.transaction.episodeCommitment.findUniqueOrThrow({
      where: { id: commitmentId },
      select: commitmentSelect,
    });
    return { commitment: toCommitment(commitment), event: toEvent(event) };
  }

  async applyTransition(input: Parameters<CommitmentTransaction["applyTransition"]>[0]) {
    let resultingVersionId = input.commitment.currentVersionId;
    if (input.replacementVersion) {
      resultingVersionId = randomUUID();
      await this.transaction.episodeCommitmentVersion.create({
        data: {
          id: resultingVersionId,
          commitmentId: input.commitment.id,
          episodeId: input.commitment.episodeId,
          versionNumber: input.commitment.currentVersion.versionNumber + 1,
          basedOnVersionId: input.commitment.currentVersionId,
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
        },
      });
    }

    const event = await this.transaction.commitmentEvent.create({
      data: {
        commitmentId: input.commitment.id,
        episodeId: input.commitment.episodeId,
        type: input.eventType,
        fromState: input.commitment.currentState,
        toState: input.toState,
        sourceVersionId: input.commitment.currentVersionId,
        resultingVersionId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        resultingRevision: input.commitment.revision + 1,
        correctionReason: input.correctionReason,
        occurredAt: input.occurredAt,
      },
      select: eventSelect,
    });
    const updated = await this.transaction.episodeCommitment.updateMany({
      where: {
        id: input.commitment.id,
        episodeId: input.commitment.episodeId,
        currentVersionId: input.commitment.currentVersionId,
        currentState: input.commitment.currentState,
        revision: input.commitment.revision,
      },
      data: {
        currentVersionId: resultingVersionId,
        currentState: input.toState,
        revision: input.commitment.revision + 1,
        updatedAt: input.occurredAt,
      },
    });
    if (updated.count !== 1) throw new CommitmentConflictError("Concurrent commitment update");
    const commitment = await this.transaction.episodeCommitment.findUniqueOrThrow({
      where: { id: input.commitment.id },
      select: commitmentSelect,
    });
    return { commitment: toCommitment(commitment), event: toEvent(event) };
  }

  appendAuditEvent(input: NewAuditEvent) {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }
}

function isCommitmentDatabaseConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return /commitment event|commitment version|commitment changes|commitment identity/iu.test(
      error.message,
    );
  }
  return false;
}

export class PrismaSyntheticCommitmentUnitOfWork implements CommitmentUnitOfWork {
  async run<T>(operation: (transaction: CommitmentTransaction) => Promise<T>): Promise<T> {
    try {
      return await prisma.$transaction((transaction) =>
        operation(new PrismaSyntheticCommitmentTransaction(transaction)),
      );
    } catch (error) {
      if (isCommitmentDatabaseConflict(error)) {
        throw new CommitmentConflictError("Concurrent or invalid commitment persistence");
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003" &&
        String(error.meta?.constraint).includes("commitment")
      ) {
        throw new CommitmentSyntheticInvariantError("Commitment reference failed closed");
      }
      throw error;
    }
  }
}
