import type {
  CommitmentDefinitionVersionRecord,
  CommitmentEngineGate,
  CommitmentEventRecord,
  CommitmentTransaction,
  CommitmentUnitOfWork,
  CommitmentVersionInput,
  EpisodeCommitmentRecord,
} from "@/application/ports/commitment-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { isRole, type Role } from "@/domain/auth/role";
import {
  DenyAllCommitmentAuthorizationPolicy,
  type CommitmentAuthorizationPolicy,
} from "@/domain/commitment/commitment-authorization";
import {
  assertCommitmentTransition,
  commitmentRequestFingerprint,
  type CommitmentCommandKind,
  type DueSourceReference,
  normalizeCorrectionReason,
  parseExplicitUtcInstant,
  validateClockInstant,
  validateCorrelationId,
  validateDueSource,
  validateExpectedRevision,
  validateIdempotencyKey,
  validateTechnicalId,
  validateTimeZone,
} from "@/domain/commitment/commitment";

export class CommitmentGateError extends Error {
  constructor(
    message: string,
    readonly code: "GATE_MISSING" | "GATE_DISABLED" | "NON_SYNTHETIC_ADAPTER",
  ) {
    super(message);
    this.name = "CommitmentGateError";
  }
}

export class CommitmentDeniedError extends Error {
  constructor(message = "Commitment operation denied") {
    super(message);
    this.name = "CommitmentDeniedError";
  }
}

export class CommitmentNotFoundError extends Error {
  constructor(message = "Commitment resource not found") {
    super(message);
    this.name = "CommitmentNotFoundError";
  }
}

export class CommitmentConflictError extends Error {
  constructor(message = "Commitment operation conflicts with persisted state") {
    super(message);
    this.name = "CommitmentConflictError";
  }
}

export class CommitmentSyntheticInvariantError extends Error {
  constructor(message = "Commitment sandbox requires verified synthetic records") {
    super(message);
    this.name = "CommitmentSyntheticInvariantError";
  }
}

interface CommandBase {
  readonly actor: AuthenticatedPrincipal;
  readonly actorRole: Role;
  readonly idempotencyKey: string;
  readonly correlationId: string;
}

export interface CreateCommitmentDraftCommand extends CommandBase {
  readonly kind: "CREATE_COMMITMENT_DRAFT";
  readonly episodeId: string;
  readonly definitionVersionId: string;
  readonly assignedUserId: string | null;
  readonly dueAt: string;
  readonly timeZone: string;
  readonly dueSource: DueSourceReference;
}

export interface ActivateCommitmentCommand extends CommandBase {
  readonly kind: "ACTIVATE_COMMITMENT";
  readonly commitmentId: string;
  readonly expectedRevision: number;
}

interface SupersedeCommandBase extends CommandBase {
  readonly commitmentId: string;
  readonly expectedRevision: number;
  readonly replacementDefinitionVersionId: string;
  readonly assignedUserId: string | null;
  readonly dueAt: string;
  readonly timeZone: string;
  readonly dueSource: DueSourceReference;
  readonly correctionReason: string;
}

export interface SupersedeDraftCommand extends SupersedeCommandBase {
  readonly kind: "SUPERSEDE_DRAFT";
}

export interface SupersedeActiveVersionCommand extends SupersedeCommandBase {
  readonly kind: "SUPERSEDE_ACTIVE_VERSION";
}

export type CommitmentCommand =
  | CreateCommitmentDraftCommand
  | ActivateCommitmentCommand
  | SupersedeDraftCommand
  | SupersedeActiveVersionCommand;

export interface CommitmentCommandResult {
  readonly commitmentId: string;
  readonly currentVersionId: string;
  readonly state: EpisodeCommitmentRecord["currentState"];
  readonly revision: number;
  readonly eventType: "COMMITMENT_DRAFT_CREATED" | "COMMITMENT_ACTIVATED" | "COMMITMENT_SUPERSEDED";
  readonly idempotent: boolean;
}

function assertGate(gate: CommitmentEngineGate): void {
  if (!gate.configured) {
    throw new CommitmentGateError("COMMITMENT_ENGINE_ENABLED is missing", "GATE_MISSING");
  }
  if (!gate.enabled) {
    throw new CommitmentGateError("COMMITMENT_ENGINE_ENABLED is disabled", "GATE_DISABLED");
  }
}

function validateBase(command: CommitmentCommand): void {
  validateIdempotencyKey(command.idempotencyKey);
  validateCorrelationId(command.correlationId);
  validateTechnicalId("actor.userId", command.actor.userId);
  if (!isRole(command.actorRole) || !command.actor.roles.includes(command.actorRole)) {
    throw new CommitmentDeniedError("Actor role is not present in the authenticated principal");
  }
}

function validateVersionFields(input: {
  readonly definitionVersionId: string;
  readonly assignedUserId: string | null;
  readonly dueAt: string;
  readonly timeZone: string;
  readonly dueSource: DueSourceReference;
}): Date {
  validateTechnicalId("definitionVersionId", input.definitionVersionId);
  if (input.assignedUserId !== null) validateTechnicalId("assignedUserId", input.assignedUserId);
  validateTimeZone(input.timeZone);
  validateDueSource(input.dueSource);
  return parseExplicitUtcInstant(input.dueAt);
}

function assertSyntheticDefinition(definition: CommitmentDefinitionVersionRecord): void {
  if (
    definition.state !== "DRAFT" ||
    !definition.definitionIsSynthetic ||
    !definition.versionIsSynthetic ||
    !definition.definitionCreatorIsSynthetic ||
    !definition.versionCreatorIsSynthetic
  ) {
    throw new CommitmentSyntheticInvariantError(
      "Definition and version must be synthetic DRAFT records",
    );
  }
  for (const [name, value] of [
    ["definitionKey", definition.definitionKey],
    ["sourceType", definition.sourceType],
    ["sourceId", definition.sourceId],
    ["sourceVersion", definition.sourceVersion],
    ["actionKey", definition.actionKey],
    ["responsibleRoleRef", definition.responsibleRoleRef],
    ["dueSourceKind", definition.dueSourceKind],
    ["evidencePolicyKey", definition.evidencePolicyKey],
    ["evidencePolicyVersion", definition.evidencePolicyVersion],
  ] as const) {
    validateTechnicalId(name, value);
  }
  if (
    definition.versionNumber < 1 ||
    definition.actionStatement.trim() !== definition.actionStatement ||
    definition.actionStatement.length < 12 ||
    definition.actionStatement.length > 500
  ) {
    throw new CommitmentSyntheticInvariantError("Definition version is structurally incomplete");
  }
}

function assertDefinitionMatchesSnapshot(
  definition: CommitmentDefinitionVersionRecord,
  commitment: EpisodeCommitmentRecord,
): void {
  const snapshot = commitment.currentVersion;
  if (
    snapshot.definitionVersionId !== definition.id ||
    snapshot.actionKey !== definition.actionKey ||
    snapshot.actionStatement !== definition.actionStatement ||
    snapshot.responsibleRoleRef !== definition.responsibleRoleRef ||
    snapshot.dueSourceKind !== definition.dueSourceKind ||
    snapshot.evidencePolicyKey !== definition.evidencePolicyKey ||
    snapshot.evidencePolicyVersion !== definition.evidencePolicyVersion
  ) {
    throw new CommitmentConflictError("Referenced definition snapshot is inconsistent");
  }
}

function assertSyntheticContext(
  context: Awaited<ReturnType<CommitmentTransaction["lockSyntheticContext"]>>,
): asserts context is NonNullable<typeof context> {
  if (!context) throw new CommitmentNotFoundError("Episode or actor not found");
  if (
    !context.episodeIsSynthetic ||
    !context.actorIsSynthetic ||
    !context.actorIsActive ||
    (context.assignedUserId !== null &&
      (!context.assignedUserIsSynthetic || !context.assignedUserIsActive))
  ) {
    throw new CommitmentSyntheticInvariantError();
  }
}

async function authorize(
  policy: CommitmentAuthorizationPolicy,
  command: CommitmentCommandKind,
  actor: AuthenticatedPrincipal,
  episodeId: string,
  evaluatedAt: Date,
): Promise<void> {
  let decision;
  try {
    decision = await policy.evaluate({
      command,
      actor,
      episodeId,
      evaluatedAt,
      syntheticContextVerified: true,
    });
  } catch {
    throw new CommitmentDeniedError("Commitment authorization failed closed");
  }
  if (
    decision.status !== "AUTHORIZED" ||
    decision.command !== command ||
    decision.actorId !== actor.userId ||
    decision.episodeId !== episodeId
  ) {
    throw new CommitmentDeniedError();
  }
}

function result(
  commitment: EpisodeCommitmentRecord,
  eventType: CommitmentCommandResult["eventType"],
  idempotent: boolean,
): CommitmentCommandResult {
  return {
    commitmentId: commitment.id,
    currentVersionId: commitment.currentVersionId,
    state: commitment.currentState,
    revision: commitment.revision,
    eventType,
    idempotent,
  };
}

function replayResult(event: CommitmentEventRecord): CommitmentCommandResult {
  return {
    commitmentId: event.commitmentId,
    currentVersionId: event.resultingVersionId,
    state: event.toState,
    revision: event.resultingRevision,
    eventType: event.type,
    idempotent: true,
  };
}

function eventTypeFor(command: CommitmentCommandKind): CommitmentCommandResult["eventType"] {
  if (command === "CREATE_COMMITMENT_DRAFT") return "COMMITMENT_DRAFT_CREATED";
  if (command === "ACTIVATE_COMMITMENT") return "COMMITMENT_ACTIVATED";
  return "COMMITMENT_SUPERSEDED";
}

function auditActionFor(command: CommitmentCommandKind) {
  return eventTypeFor(command);
}

export class CommitmentSandboxCoreService {
  constructor(
    private readonly unitOfWork: CommitmentUnitOfWork,
    private readonly gate: CommitmentEngineGate = { configured: false, enabled: false },
    private readonly authorizationPolicy: CommitmentAuthorizationPolicy = new DenyAllCommitmentAuthorizationPolicy(),
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(command: CommitmentCommand): Promise<CommitmentCommandResult> {
    assertGate(this.gate);
    validateBase(command);
    const occurredAt = validateClockInstant(this.clock());

    if (command.kind === "CREATE_COMMITMENT_DRAFT") {
      return this.createDraft(command, occurredAt);
    }
    return this.transition(command, occurredAt);
  }

  private createDraft(
    command: CreateCommitmentDraftCommand,
    occurredAt: Date,
  ): Promise<CommitmentCommandResult> {
    validateTechnicalId("episodeId", command.episodeId);
    const dueAt = validateVersionFields(command);
    const requestFingerprint = commitmentRequestFingerprint({
      kind: command.kind,
      actorUserId: command.actor.userId,
      actorRole: command.actorRole,
      episodeId: command.episodeId,
      definitionVersionId: command.definitionVersionId,
      assignedUserId: command.assignedUserId,
      dueAt: command.dueAt,
      timeZone: command.timeZone,
      dueSource: command.dueSource,
    });

    return this.unitOfWork.run(async (transaction) => {
      if (transaction.syntheticAdapter !== true) {
        throw new CommitmentGateError(
          "Commitment writes require the synthetic-only adapter",
          "NON_SYNTHETIC_ADAPTER",
        );
      }
      const definitionBeforeUserLocks = await transaction.getDefinitionVersion(
        command.definitionVersionId,
      );
      if (!definitionBeforeUserLocks) {
        throw new CommitmentNotFoundError("Definition version not found");
      }
      const context = await transaction.lockSyntheticContext({
        episodeId: command.episodeId,
        actorUserId: command.actor.userId,
        assignedUserId: command.assignedUserId,
        definitionAndVersionCreatorUserIds: [
          definitionBeforeUserLocks.definitionCreatorUserId,
          definitionBeforeUserLocks.versionCreatorUserId,
        ],
      });
      assertSyntheticContext(context);
      await authorize(
        this.authorizationPolicy,
        command.kind,
        command.actor,
        command.episodeId,
        occurredAt,
      );

      const replay = await transaction.findEventByIdempotency(
        command.actor.userId,
        command.idempotencyKey,
      );
      if (replay) {
        if (
          replay.type !== "COMMITMENT_DRAFT_CREATED" ||
          replay.requestFingerprint !== requestFingerprint
        ) {
          throw new CommitmentConflictError("Idempotency key was reused incompatibly");
        }
        return replayResult(replay);
      }

      const definition = await transaction.getDefinitionVersion(command.definitionVersionId);
      if (!definition) throw new CommitmentNotFoundError("Definition version not found");
      assertSyntheticDefinition(definition);
      if (definition.dueSourceKind !== command.dueSource.kind) {
        throw new CommitmentConflictError("Due source kind does not match the definition version");
      }
      const created = await transaction.createDraft({
        episodeId: command.episodeId,
        actorUserId: command.actor.userId,
        actorRole: command.actorRole,
        version: {
          definition,
          dueAt,
          timeZone: command.timeZone,
          dueSource: command.dueSource,
          assignedUserId: command.assignedUserId,
        },
        idempotencyKey: command.idempotencyKey,
        requestFingerprint,
        occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: command.actor.userId,
        actorRole: command.actorRole,
        action: auditActionFor(command.kind),
        resourceType: "EpisodeCommitment",
        resourceId: created.commitment.id,
        outcome: "SUCCESS",
        correlationId: command.correlationId,
        createdAt: occurredAt,
      });
      return result(created.commitment, created.event.type, false);
    });
  }

  private transition(
    command: ActivateCommitmentCommand | SupersedeDraftCommand | SupersedeActiveVersionCommand,
    occurredAt: Date,
  ): Promise<CommitmentCommandResult> {
    validateTechnicalId("commitmentId", command.commitmentId);
    validateExpectedRevision(command.expectedRevision);

    let normalizedReplacement:
      | {
          readonly definitionVersionId: string;
          readonly assignedUserId: string | null;
          readonly dueAt: Date;
          readonly timeZone: string;
          readonly dueSource: DueSourceReference;
          readonly correctionReason: string;
        }
      | undefined;
    if (command.kind !== "ACTIVATE_COMMITMENT") {
      normalizedReplacement = {
        definitionVersionId: command.replacementDefinitionVersionId,
        assignedUserId: command.assignedUserId,
        dueAt: validateVersionFields({
          definitionVersionId: command.replacementDefinitionVersionId,
          assignedUserId: command.assignedUserId,
          dueAt: command.dueAt,
          timeZone: command.timeZone,
          dueSource: command.dueSource,
        }),
        timeZone: command.timeZone,
        dueSource: command.dueSource,
        correctionReason: normalizeCorrectionReason(command.correctionReason),
      };
    }
    const requestFingerprint = commitmentRequestFingerprint({
      kind: command.kind,
      actorUserId: command.actor.userId,
      actorRole: command.actorRole,
      commitmentId: command.commitmentId,
      expectedRevision: command.expectedRevision,
      ...(normalizedReplacement
        ? {
            replacementDefinitionVersionId: normalizedReplacement.definitionVersionId,
            assignedUserId: normalizedReplacement.assignedUserId,
            dueAt: normalizedReplacement.dueAt,
            timeZone: normalizedReplacement.timeZone,
            dueSource: normalizedReplacement.dueSource,
            correctionReason: normalizedReplacement.correctionReason,
          }
        : {}),
    });

    return this.unitOfWork.run(async (transaction) => {
      if (transaction.syntheticAdapter !== true) {
        throw new CommitmentGateError(
          "Commitment writes require the synthetic-only adapter",
          "NON_SYNTHETIC_ADAPTER",
        );
      }
      const commitment = await transaction.getCommitmentForUpdate(command.commitmentId);
      if (!commitment) throw new CommitmentNotFoundError();
      const currentDefinitionBeforeUserLocks = await transaction.getDefinitionVersion(
        commitment.currentVersion.definitionVersionId,
      );
      if (!currentDefinitionBeforeUserLocks) {
        throw new CommitmentConflictError("Referenced definition is missing");
      }
      const replacementDefinitionBeforeUserLocks = normalizedReplacement
        ? await transaction.getDefinitionVersion(normalizedReplacement.definitionVersionId)
        : null;
      if (normalizedReplacement && !replacementDefinitionBeforeUserLocks) {
        throw new CommitmentNotFoundError("Replacement definition version not found");
      }
      const context = await transaction.lockSyntheticContext({
        episodeId: commitment.episodeId,
        actorUserId: command.actor.userId,
        assignedUserId: normalizedReplacement?.assignedUserId ?? null,
        definitionAndVersionCreatorUserIds: [
          currentDefinitionBeforeUserLocks.definitionCreatorUserId,
          currentDefinitionBeforeUserLocks.versionCreatorUserId,
          ...(replacementDefinitionBeforeUserLocks
            ? [
                replacementDefinitionBeforeUserLocks.definitionCreatorUserId,
                replacementDefinitionBeforeUserLocks.versionCreatorUserId,
              ]
            : []),
        ],
      });
      assertSyntheticContext(context);
      await authorize(
        this.authorizationPolicy,
        command.kind,
        command.actor,
        commitment.episodeId,
        occurredAt,
      );

      const replay = await transaction.findEventByIdempotency(
        command.actor.userId,
        command.idempotencyKey,
      );
      if (replay) {
        if (
          replay.commitmentId !== commitment.id ||
          replay.type !== eventTypeFor(command.kind) ||
          replay.requestFingerprint !== requestFingerprint
        ) {
          throw new CommitmentConflictError("Idempotency key was reused incompatibly");
        }
        return replayResult(replay);
      }

      if (commitment.revision !== command.expectedRevision) {
        throw new CommitmentConflictError("Expected revision does not match");
      }
      const toState = assertCommitmentTransition(command.kind, commitment.currentState);
      const currentDefinition = await transaction.getDefinitionVersion(
        commitment.currentVersion.definitionVersionId,
      );
      if (!currentDefinition) throw new CommitmentConflictError("Referenced definition is missing");
      assertSyntheticDefinition(currentDefinition);
      assertDefinitionMatchesSnapshot(currentDefinition, commitment);

      let replacementVersion: CommitmentVersionInput | null = null;
      if (normalizedReplacement) {
        const replacementDefinition = await transaction.getDefinitionVersion(
          normalizedReplacement.definitionVersionId,
        );
        if (!replacementDefinition) {
          throw new CommitmentNotFoundError("Replacement definition version not found");
        }
        assertSyntheticDefinition(replacementDefinition);
        if (replacementDefinition.dueSourceKind !== normalizedReplacement.dueSource.kind) {
          throw new CommitmentConflictError(
            "Replacement due source kind does not match its definition version",
          );
        }
        replacementVersion = {
          definition: replacementDefinition,
          dueAt: normalizedReplacement.dueAt,
          timeZone: normalizedReplacement.timeZone,
          dueSource: normalizedReplacement.dueSource,
          assignedUserId: normalizedReplacement.assignedUserId,
        };
      }

      const applied = await transaction.applyTransition({
        commitment,
        eventType:
          command.kind === "ACTIVATE_COMMITMENT" ? "COMMITMENT_ACTIVATED" : "COMMITMENT_SUPERSEDED",
        toState,
        replacementVersion,
        correctionReason: normalizedReplacement?.correctionReason ?? null,
        actorUserId: command.actor.userId,
        actorRole: command.actorRole,
        idempotencyKey: command.idempotencyKey,
        requestFingerprint,
        occurredAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: command.actor.userId,
        actorRole: command.actorRole,
        action: auditActionFor(command.kind),
        resourceType: "EpisodeCommitment",
        resourceId: commitment.id,
        outcome: "SUCCESS",
        correlationId: command.correlationId,
        createdAt: occurredAt,
      });
      return result(applied.commitment, applied.event.type, false);
    });
  }
}
