import type {
  RelayActorContext,
  RelayAttemptRecord,
  RelayAttemptStore,
  RelayAttestationVerifier,
  RelayAuthorityBinding,
  RelayAuthorityResolver,
  RelayAuthoritySnapshot,
  RelayContextRef,
  RelayOutboundExecutor,
  RelayPreview,
  RelayPreviewPolicy,
  RelaySecretProtector,
} from "@/application/ports/continuity-relay";
import { authorize } from "@/domain/auth/authorization";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import {
  isRelayResultState,
  isValidRelayPair,
  RELAY_COST_NOTICE,
  RELAY_NO_CANCEL_NOTICE,
  type RelayPurpose,
  type RelayRecipientKind,
} from "@/domain/relay/continuity-relay";
import { normalizeRelayResult } from "@/application/relay/result-governance";

const RECIPIENT_KINDS: readonly RelayRecipientKind[] = ["PATIENT", "PROFESSIONAL"];
const PURPOSES: readonly RelayPurpose[] = ["PATIENT_CALLBACK_OFFER", "PROFESSIONAL_REVIEW_REQUEST"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export class RelayDeniedError extends Error {
  constructor(readonly errorCode: string) {
    super("Continuity relay request denied");
    this.name = "RelayDeniedError";
  }
}

export class RelayInvalidError extends Error {
  constructor(readonly errorCode: string) {
    super("Continuity relay request is invalid");
    this.name = "RelayInvalidError";
  }
}

export class RelayConflictError extends Error {
  constructor(readonly errorCode: string) {
    super("Continuity relay state conflict");
    this.name = "RelayConflictError";
  }
}

export interface RelayPreviewRequest {
  readonly recipientKind: RelayRecipientKind;
  readonly purpose: RelayPurpose;
  readonly episodeRef: string;
  readonly correlationId: string;
}

export interface RelayConfirmationRequest extends RelayPreviewRequest {
  readonly confirmationToken: string;
}

export interface RelayHumanReviewRequest {
  readonly attemptRef: string;
  readonly correlationId: string;
}

function hasExactKeys(
  value: object,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function validateCommonRequest(
  input: RelayPreviewRequest,
  requiredKeys: readonly string[],
): RelayContextRef {
  if (!hasExactKeys(input, requiredKeys)) {
    throw new RelayInvalidError("invalid_request_shape");
  }
  if (
    !RECIPIENT_KINDS.includes(input.recipientKind) ||
    !PURPOSES.includes(input.purpose) ||
    !isValidRelayPair(input.recipientKind, input.purpose)
  ) {
    throw new RelayDeniedError("recipient_purpose_mismatch");
  }
  if (!OPAQUE_REF.test(input.episodeRef)) throw new RelayInvalidError("invalid_episode_ref");
  if (!UUID.test(input.correlationId)) throw new RelayInvalidError("invalid_correlation_id");
  return { episodeRef: input.episodeRef, taskRef: null };
}

function validateAuthority(
  snapshot: RelayAuthoritySnapshot,
  requestedEpisodeRef: string,
  recipientKind: RelayRecipientKind,
): void {
  if (
    snapshot.episodeRef !== requestedEpisodeRef ||
    (snapshot.taskRef !== null && !OPAQUE_REF.test(snapshot.taskRef)) ||
    (recipientKind === "PATIENT" &&
      (snapshot.taskRef !== null || snapshot.professionalEligibility !== null)) ||
    (recipientKind === "PROFESSIONAL" &&
      (snapshot.taskRef === null ||
        snapshot.professionalEligibility === null ||
        !Number.isInteger(snapshot.professionalEligibility.episodeRevision) ||
        snapshot.professionalEligibility.episodeRevision < 1 ||
        !Number.isInteger(snapshot.professionalEligibility.taskRevision) ||
        snapshot.professionalEligibility.taskRevision < 1 ||
        !OPAQUE_REF.test(snapshot.professionalEligibility.actorRoleAssignmentRef) ||
        !OPAQUE_REF.test(snapshot.professionalEligibility.targetRoleAssignmentRef) ||
        !["nurse", "clinician"].includes(snapshot.professionalEligibility.targetRole) ||
        snapshot.professionalEligibility.targetRole === snapshot.actingRole)) ||
    !OPAQUE_REF.test(snapshot.targetRef) ||
    !/^\+[1-9]\d{7,14}$/.test(snapshot.destinationPhone) ||
    snapshot.maskedTarget === snapshot.destinationPhone ||
    !snapshot.maskedTarget.includes("*") ||
    snapshot.maskedTarget.length > 32 ||
    !/^[A-Z]{2}$/.test(snapshot.region) ||
    !/^[a-z]{2,3}-[A-Z]{2}$/.test(snapshot.locale) ||
    !VERSION.test(snapshot.lineRegion) ||
    !VERSION.test(snapshot.revision)
  ) {
    throw new RelayDeniedError("authority_snapshot_invalid");
  }
}

function validateTaskContract(
  contract: {
    readonly key: string;
    readonly version: string;
    readonly outboundTaskKey: string;
  },
  purpose: RelayPurpose,
): void {
  if (
    contract.key !== purpose ||
    !VERSION.test(contract.version) ||
    contract.outboundTaskKey !== "SYNTHETIC_CONTINUITY_CHECK"
  ) {
    throw new RelayDeniedError("task_contract_invalid");
  }
}

function actorRole(
  actor: AuthenticatedPrincipal,
  snapshot: RelayAuthoritySnapshot,
): "nurse" | "clinician" {
  const role = snapshot.actingRole;
  if (
    !actor.roles.includes(role) ||
    !authorize({ roles: [role] }, "continuity-relay-preview").allowed
  ) {
    throw new RelayDeniedError("actor_not_authorized");
  }
  return role;
}

function binding(input: {
  readonly actor: AuthenticatedPrincipal;
  readonly recipientKind: RelayRecipientKind;
  readonly purpose: RelayPurpose;
  readonly authority: RelayAuthoritySnapshot;
  readonly taskContract: { readonly key: string; readonly version: string };
  readonly attestationVersion: string;
}): RelayAuthorityBinding {
  return {
    actorRef: input.actor.userId,
    targetRef: input.authority.targetRef,
    recipientKind: input.recipientKind,
    purpose: input.purpose,
    episodeRef: input.authority.episodeRef,
    taskRef: input.authority.taskRef,
    destinationPhone: input.authority.destinationPhone,
    region: input.authority.region,
    locale: input.authority.locale,
    lineRegion: input.authority.lineRegion,
    taskContractKey: input.taskContract.key,
    taskContractVersion: input.taskContract.version,
    attestationVersion: input.attestationVersion,
    revision: input.authority.revision,
    professionalEligibility: input.authority.professionalEligibility,
  };
}

export class ContinuityRelayService {
  constructor(
    private readonly actors: RelayActorContext,
    private readonly authority: RelayAuthorityResolver,
    private readonly attestations: RelayAttestationVerifier,
    private readonly policy: RelayPreviewPolicy,
    private readonly secrets: RelaySecretProtector,
    private readonly attempts: RelayAttemptStore,
    private readonly outbound: RelayOutboundExecutor,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async preview(input: RelayPreviewRequest): Promise<RelayPreview> {
    const context = validateCommonRequest(input, [
      "recipientKind",
      "purpose",
      "episodeRef",
      "correlationId",
    ]);
    const actor = await this.requireActor("continuity-relay-preview");
    const authority = await this.authority.resolve({
      actor,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
      context,
    });
    if (!authority) throw new RelayDeniedError("authority_unavailable");
    validateAuthority(authority, context.episodeRef, input.recipientKind);
    const actingRole = actorRole(actor, authority);
    const attestation = await this.attestations.verify({
      actor,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
    });
    if (!attestation.current || !VERSION.test(attestation.version)) {
      throw new RelayDeniedError("attestation_unavailable");
    }
    const taskContract = this.policy.taskContract(input);
    validateTaskContract(taskContract, input.purpose);
    const issuedAt = this.now();
    const expiresAt = this.policy.expiresAt({
      issuedAt,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
    });
    if (
      !(expiresAt instanceof Date) ||
      !Number.isFinite(expiresAt.valueOf()) ||
      expiresAt <= issuedAt
    ) {
      throw new RelayDeniedError("expiry_policy_invalid");
    }
    const confirmationToken = this.secrets.issueConfirmationToken();
    const authorityFingerprint = this.secrets.protectAuthority(
      binding({
        actor,
        recipientKind: input.recipientKind,
        purpose: input.purpose,
        authority,
        taskContract,
        attestationVersion: attestation.version,
      }),
    );
    await this.attempts.createPreview({
      recipientKind: input.recipientKind,
      purpose: input.purpose,
      episodeRef: authority.episodeRef,
      taskRef: authority.taskRef,
      targetRef: authority.targetRef,
      actorRef: actor.userId,
      actorRole: actingRole,
      authorityFingerprint,
      confirmationDigest: this.secrets.digestConfirmationToken(confirmationToken),
      idempotencyRef: this.secrets.issueIdempotencyRef(),
      attestationVersion: attestation.version,
      revision: authority.revision,
      region: authority.region,
      locale: authority.locale,
      lineRegion: authority.lineRegion,
      expiresAt,
      createdAt: issuedAt,
      correlationId: input.correlationId,
    });
    return {
      recipientKind: input.recipientKind,
      purpose: input.purpose,
      targetRef: authority.targetRef,
      maskedTarget: authority.maskedTarget,
      context: { episodeRef: authority.episodeRef, taskRef: authority.taskRef },
      region: authority.region,
      locale: authority.locale,
      lineRegion: authority.lineRegion,
      taskContract: { key: taskContract.key, version: taskContract.version },
      costNotice: RELAY_COST_NOTICE,
      noCancellationNotice: RELAY_NO_CANCEL_NOTICE,
      attestationVersion: attestation.version,
      authorityFingerprint,
      authorityRevision: authority.revision,
      expiresAt,
      providerContacted: false,
      confirmationToken,
    };
  }

  async confirm(input: RelayConfirmationRequest): Promise<{
    readonly attemptRef: string;
    readonly lifecycleState: RelayAttemptRecord["lifecycleState"];
    readonly outboundCallIntentRef: string | null;
  }> {
    let requestedContext: RelayContextRef;
    try {
      requestedContext = validateCommonRequest(input, [
        "recipientKind",
        "purpose",
        "episodeRef",
        "confirmationToken",
        "correlationId",
      ]);
    } catch (error) {
      const actor = await this.actors.current();
      await this.reject(actor, null, false, input.correlationId);
      throw error;
    }
    const actor = await this.requireActor("continuity-relay-confirm");
    if (typeof input.confirmationToken !== "string" || input.confirmationToken.length < 40) {
      await this.reject(actor, null, false, input.correlationId);
      throw new RelayDeniedError("confirmation_invalid");
    }
    const confirmationDigest = this.secrets.digestConfirmationToken(input.confirmationToken);
    const attempt = await this.attempts.findByConfirmationDigest(confirmationDigest);
    if (!attempt) {
      await this.reject(actor, null, false, input.correlationId);
      throw new RelayDeniedError("confirmation_invalid");
    }
    const now = this.now();
    if (
      attempt.actorRef !== actor.userId ||
      attempt.recipientKind !== input.recipientKind ||
      attempt.purpose !== input.purpose ||
      attempt.episodeRef !== requestedContext.episodeRef ||
      attempt.lifecycleState !== "PREVIEWED" ||
      attempt.consumedAt !== null ||
      attempt.revokedAt !== null ||
      attempt.expiresAt <= now
    ) {
      await this.reject(actor, attempt.id, false, input.correlationId);
      throw new RelayDeniedError("confirmation_invalid");
    }

    const storedContext: RelayContextRef = {
      episodeRef: attempt.episodeRef,
      taskRef: attempt.taskRef,
    };

    const refreshed = await this.authority.resolve({
      actor,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
      context: storedContext,
    });
    if (!refreshed) {
      await this.reject(actor, attempt.id, true, input.correlationId);
      throw new RelayDeniedError("authority_stale");
    }
    try {
      validateAuthority(refreshed, attempt.episodeRef, input.recipientKind);
      if (refreshed.taskRef !== attempt.taskRef) {
        throw new RelayDeniedError("authority_snapshot_invalid");
      }
      actorRole(actor, refreshed);
    } catch (error) {
      await this.reject(actor, attempt.id, true, input.correlationId);
      throw error;
    }
    const attestation = await this.attestations.verify({
      actor,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
    });
    const taskContract = this.policy.taskContract(input);
    validateTaskContract(taskContract, input.purpose);
    if (!attestation.current || attestation.version !== attempt.attestationVersion) {
      await this.reject(actor, attempt.id, true, input.correlationId);
      throw new RelayDeniedError("attestation_stale");
    }
    const candidateFingerprint = this.secrets.protectAuthority(
      binding({
        actor,
        recipientKind: input.recipientKind,
        purpose: input.purpose,
        authority: refreshed,
        taskContract,
        attestationVersion: attestation.version,
      }),
    );
    if (
      refreshed.targetRef !== attempt.targetRef ||
      refreshed.revision !== attempt.revision ||
      !this.secrets.matchesProtected(attempt.authorityFingerprint, candidateFingerprint)
    ) {
      await this.reject(actor, attempt.id, true, input.correlationId);
      throw new RelayDeniedError("authority_stale");
    }

    const consumed = await this.attempts.consumeConfirmation({
      attemptRef: attempt.id,
      confirmationDigest,
      actorRef: actor.userId,
      actorRole: refreshed.actingRole,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
      context: storedContext,
      targetRef: refreshed.targetRef,
      authorityFingerprint: candidateFingerprint,
      attestationVersion: attestation.version,
      revision: refreshed.revision,
      professionalEligibility: refreshed.professionalEligibility,
      correlationId: input.correlationId,
      now,
    });
    if (!consumed) {
      await this.reject(actor, attempt.id, false, input.correlationId);
      throw new RelayConflictError("confirmation_already_consumed");
    }

    const executionAuthority = await this.authority.resolve({
      actor,
      recipientKind: input.recipientKind,
      purpose: input.purpose,
      context: storedContext,
    });
    if (!executionAuthority) {
      await this.reject(actor, attempt.id, true, input.correlationId);
      throw new RelayDeniedError("authority_stale_before_execution");
    }
    try {
      validateAuthority(executionAuthority, attempt.episodeRef, input.recipientKind);
      actorRole(actor, executionAuthority);
      const executionAttestation = await this.attestations.verify({
        actor,
        recipientKind: input.recipientKind,
        purpose: input.purpose,
      });
      if (
        !executionAttestation.current ||
        executionAttestation.version !== attempt.attestationVersion
      ) {
        throw new RelayDeniedError("attestation_stale_before_execution");
      }
      const executionFingerprint = this.secrets.protectAuthority(
        binding({
          actor,
          recipientKind: input.recipientKind,
          purpose: input.purpose,
          authority: executionAuthority,
          taskContract,
          attestationVersion: executionAttestation.version,
        }),
      );
      if (
        executionAuthority.taskRef !== attempt.taskRef ||
        executionAuthority.targetRef !== attempt.targetRef ||
        executionAuthority.revision !== attempt.revision ||
        !this.secrets.matchesProtected(attempt.authorityFingerprint, executionFingerprint)
      ) {
        throw new RelayDeniedError("authority_stale_before_execution");
      }
    } catch (error) {
      await this.reject(actor, attempt.id, true, input.correlationId);
      throw error;
    }

    const execution = await this.outbound.execute({
      taskKey: taskContract.outboundTaskKey,
      recipients: [
        {
          phones: [executionAuthority.destinationPhone],
          region: executionAuthority.region,
          locale: executionAuthority.locale,
        },
      ],
      idempotencyRef: consumed.idempotencyRef,
    });
    const governedResult = normalizeRelayResult({
      purpose: input.purpose,
      intent: execution.outboundIntent,
      structuredResult: execution.rawTechnicalResult,
      providerEventType: execution.providerEventType,
    });
    const recorded = await this.attempts.recordOutboundState({
      attemptRef: attempt.id,
      outboundIntent: execution.outboundIntent,
      governedResult,
      syntheticExecution: execution.syntheticExecution,
      now: this.now(),
      correlationId: input.correlationId,
    });
    return {
      attemptRef: recorded.id,
      lifecycleState: recorded.lifecycleState,
      outboundCallIntentRef: recorded.outboundCallIntentRef,
    };
  }

  async recordHumanReview(input: RelayHumanReviewRequest): Promise<{
    readonly attemptRef: string;
    readonly lifecycleState: "HUMAN_REVIEWED";
    readonly reviewedAt: Date;
  }> {
    if (!hasExactKeys(input, ["attemptRef", "correlationId"])) {
      throw new RelayInvalidError("invalid_request_shape");
    }
    if (!OPAQUE_REF.test(input.attemptRef) || !UUID.test(input.correlationId)) {
      throw new RelayInvalidError("invalid_review_request");
    }
    const actor = await this.requireActor("continuity-relay-review");
    const attempt = await this.attempts.getById(input.attemptRef);
    if (!attempt || !isRelayResultState(attempt.lifecycleState)) {
      throw new RelayConflictError("result_not_reviewable");
    }
    const reviewerRole = await this.authority.authorizeReview({ actor, attempt });
    if (!reviewerRole || !actor.roles.includes(reviewerRole)) {
      throw new RelayDeniedError("review_not_authorized");
    }
    const reviewedAt = this.now();
    const reviewed = await this.attempts.recordHumanReview({
      attemptRef: attempt.id,
      reviewerRef: actor.userId,
      reviewerRole,
      correlationId: input.correlationId,
      now: reviewedAt,
    });
    if (!reviewed) throw new RelayConflictError("result_not_reviewable");
    return { attemptRef: reviewed.id, lifecycleState: "HUMAN_REVIEWED", reviewedAt };
  }

  private async requireActor(
    resource: "continuity-relay-preview" | "continuity-relay-confirm" | "continuity-relay-review",
  ): Promise<AuthenticatedPrincipal> {
    const actor = await this.actors.current();
    if (!actor || !authorize(actor, resource).allowed) {
      throw new RelayDeniedError("actor_not_authorized");
    }
    return actor;
  }

  private async reject(
    actor: AuthenticatedPrincipal | null,
    attemptRef: string | null,
    authorityStale: boolean,
    correlationId: string,
  ): Promise<void> {
    if (!UUID.test(correlationId)) return;
    const actorRole =
      actor?.roles.find(
        (role): role is "nurse" | "clinician" => role === "nurse" || role === "clinician",
      ) ?? null;
    await this.attempts.recordConfirmationRejection({
      actorRef: actor?.userId ?? null,
      actorRole: actorRole as Role | null,
      attemptRef,
      authorityStale,
      correlationId,
      now: this.now(),
    });
  }
}
