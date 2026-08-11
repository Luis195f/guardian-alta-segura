import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type {
  CommitmentEventType,
  CommitmentState,
  DueSourceReference,
} from "@/domain/commitment/commitment";

export interface CommitmentEngineGate {
  readonly configured: boolean;
  readonly enabled: boolean;
}

export interface CommitmentSyntheticContextRecord {
  readonly episodeId: string;
  readonly episodeIsSynthetic: boolean;
  readonly actorUserId: string;
  readonly actorIsSynthetic: boolean;
  readonly actorIsActive: boolean;
  readonly assignedUserId: string | null;
  readonly assignedUserIsSynthetic: boolean | null;
  readonly assignedUserIsActive: boolean | null;
}

export interface CommitmentDefinitionVersionRecord {
  readonly id: string;
  readonly definitionId: string;
  readonly definitionKey: string;
  readonly versionNumber: number;
  readonly state: "DRAFT";
  readonly definitionIsSynthetic: boolean;
  readonly versionIsSynthetic: boolean;
  readonly definitionCreatorUserId: string;
  readonly versionCreatorUserId: string;
  readonly definitionCreatorIsSynthetic: boolean;
  readonly versionCreatorIsSynthetic: boolean;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly actionKey: string;
  readonly actionStatement: string;
  readonly responsibleRoleRef: string;
  readonly dueSourceKind: string;
  readonly evidencePolicyKey: string;
  readonly evidencePolicyVersion: string;
}

export interface EpisodeCommitmentVersionRecord {
  readonly id: string;
  readonly commitmentId: string;
  readonly episodeId: string;
  readonly versionNumber: number;
  readonly basedOnVersionId: string | null;
  readonly definitionVersionId: string;
  readonly actionKey: string;
  readonly actionStatement: string;
  readonly responsibleRoleRef: string;
  readonly assignedUserId: string | null;
  readonly dueAt: Date;
  readonly timeZone: string;
  readonly dueSourceKind: string;
  readonly dueSourceId: string;
  readonly dueSourceVersion: string;
  readonly evidencePolicyKey: string;
  readonly evidencePolicyVersion: string;
  readonly createdById: string;
  readonly actorRole: Role;
  readonly createdAt: Date;
  readonly correctionReason: string | null;
}

export interface EpisodeCommitmentRecord {
  readonly id: string;
  readonly episodeId: string;
  readonly currentVersionId: string;
  readonly currentState: CommitmentState;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly currentVersion: EpisodeCommitmentVersionRecord;
}

export interface CommitmentEventRecord {
  readonly id: string;
  readonly commitmentId: string;
  readonly episodeId: string;
  readonly type: CommitmentEventType;
  readonly fromState: CommitmentState | null;
  readonly toState: CommitmentState;
  readonly sourceVersionId: string | null;
  readonly resultingVersionId: string;
  readonly actorUserId: string;
  readonly actorRole: Role;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly resultingRevision: number;
  readonly correctionReason: string | null;
  readonly occurredAt: Date;
}

export interface CommitmentVersionInput {
  readonly definition: CommitmentDefinitionVersionRecord;
  readonly dueAt: Date;
  readonly timeZone: string;
  readonly dueSource: DueSourceReference;
  readonly assignedUserId: string | null;
}

export interface CommitmentTransaction {
  readonly syntheticAdapter: boolean;
  lockSyntheticContext(input: {
    readonly episodeId: string;
    readonly actorUserId: string;
    readonly assignedUserId: string | null;
    readonly definitionAndVersionCreatorUserIds: readonly string[];
  }): Promise<CommitmentSyntheticContextRecord | null>;
  getDefinitionVersion(
    definitionVersionId: string,
  ): Promise<CommitmentDefinitionVersionRecord | null>;
  getCommitmentForUpdate(commitmentId: string): Promise<EpisodeCommitmentRecord | null>;
  findEventByIdempotency(
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<CommitmentEventRecord | null>;
  createDraft(input: {
    readonly episodeId: string;
    readonly actorUserId: string;
    readonly actorRole: Role;
    readonly version: CommitmentVersionInput;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly occurredAt: Date;
  }): Promise<{
    readonly commitment: EpisodeCommitmentRecord;
    readonly event: CommitmentEventRecord;
  }>;
  applyTransition(input: {
    readonly commitment: EpisodeCommitmentRecord;
    readonly eventType: Exclude<CommitmentEventType, "COMMITMENT_DRAFT_CREATED">;
    readonly toState: CommitmentState;
    readonly replacementVersion: CommitmentVersionInput | null;
    readonly correctionReason: string | null;
    readonly actorUserId: string;
    readonly actorRole: Role;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly occurredAt: Date;
  }): Promise<{
    readonly commitment: EpisodeCommitmentRecord;
    readonly event: CommitmentEventRecord;
  }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
}

export interface CommitmentUnitOfWork {
  run<T>(operation: (transaction: CommitmentTransaction) => Promise<T>): Promise<T>;
}
