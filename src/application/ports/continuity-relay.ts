import type {
  OutboundCallIntentRecord,
  OutboundCallTaskKey,
} from "@/application/ports/outbound-call";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";
import type {
  RelayLifecycleState,
  RelayPurpose,
  RelayRecipientKind,
  RelayTechnicalDisposition,
} from "@/domain/relay/continuity-relay";

export interface RelayContextRef {
  readonly episodeRef: string;
  readonly taskRef: string | null;
}

export interface RelayTaskContract {
  readonly key: RelayPurpose;
  readonly version: string;
  readonly outboundTaskKey: OutboundCallTaskKey;
}

/**
 * Ephemeral result from a canonical, server-side authority source.
 * Implementations must not use client-provided target data or perform provider network calls.
 */
export interface RelayAuthoritySnapshot extends RelayContextRef {
  readonly actingRole: "nurse" | "clinician";
  readonly targetRef: string;
  readonly destinationPhone: string;
  readonly maskedTarget: string;
  readonly region: string;
  readonly locale: string;
  readonly lineRegion: string;
  readonly revision: string;
}

export interface RelayAuthorityResolver {
  resolve(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly recipientKind: RelayRecipientKind;
    readonly purpose: RelayPurpose;
    readonly context: RelayContextRef;
  }): Promise<RelayAuthoritySnapshot | null>;
  authorizeReview(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly attempt: RelayAttemptRecord;
  }): Promise<"nurse" | "clinician" | null>;
}

export interface RelayActorContext {
  current(): Promise<AuthenticatedPrincipal | null>;
}

export interface RelayAttestationVerifier {
  verify(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly recipientKind: RelayRecipientKind;
    readonly purpose: RelayPurpose;
  }): Promise<{ readonly version: string; readonly current: boolean }>;
}

export interface RelayPreviewPolicy {
  expiresAt(input: {
    readonly issuedAt: Date;
    readonly recipientKind: RelayRecipientKind;
    readonly purpose: RelayPurpose;
  }): Date;
  taskContract(input: {
    readonly recipientKind: RelayRecipientKind;
    readonly purpose: RelayPurpose;
  }): RelayTaskContract;
}

export interface RelaySecretProtector {
  issueConfirmationToken(): string;
  issueIdempotencyRef(): string;
  digestConfirmationToken(token: string): string;
  protectAuthority(input: RelayAuthorityBinding): string;
  matchesProtected(stored: string, candidate: string): boolean;
}

export interface RelayAuthorityBinding extends RelayContextRef {
  readonly actorRef: string;
  readonly targetRef: string;
  readonly recipientKind: RelayRecipientKind;
  readonly purpose: RelayPurpose;
  readonly destinationPhone: string;
  readonly region: string;
  readonly locale: string;
  readonly lineRegion: string;
  readonly taskContractKey: string;
  readonly taskContractVersion: string;
  readonly attestationVersion: string;
  readonly revision: string;
}

export interface RelayAttemptRecord extends RelayContextRef {
  readonly id: string;
  readonly recipientKind: RelayRecipientKind;
  readonly purpose: RelayPurpose;
  readonly targetRef: string;
  readonly actorRef: string;
  readonly authorityFingerprint: string;
  readonly confirmationDigest: string;
  readonly idempotencyRef: string;
  readonly outboundCallIntentRef: string | null;
  readonly lifecycleState: RelayLifecycleState;
  readonly attestationVersion: string;
  readonly revision: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly reviewedByRef: string | null;
  readonly reviewedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateRelayPreviewRecordInput extends Omit<
  RelayAttemptRecord,
  | "id"
  | "outboundCallIntentRef"
  | "lifecycleState"
  | "consumedAt"
  | "revokedAt"
  | "reviewedByRef"
  | "reviewedAt"
  | "updatedAt"
> {
  readonly actorRole: "nurse" | "clinician";
  readonly correlationId: string;
}

export interface RelayAttemptStore {
  createPreview(input: CreateRelayPreviewRecordInput): Promise<RelayAttemptRecord>;
  findByConfirmationDigest(digest: string): Promise<RelayAttemptRecord | null>;
  getById(attemptRef: string): Promise<RelayAttemptRecord | null>;
  consumeConfirmation(input: {
    readonly attemptRef: string;
    readonly confirmationDigest: string;
    readonly actorRef: string;
    readonly actorRole: "nurse" | "clinician";
    readonly recipientKind: RelayRecipientKind;
    readonly purpose: RelayPurpose;
    readonly context: RelayContextRef;
    readonly targetRef: string;
    readonly authorityFingerprint: string;
    readonly attestationVersion: string;
    readonly revision: string;
    readonly correlationId: string;
    readonly now: Date;
  }): Promise<RelayAttemptRecord | null>;
  recordConfirmationRejection(input: {
    readonly actorRef: string | null;
    readonly actorRole: Role | null;
    readonly attemptRef: string | null;
    readonly authorityStale: boolean;
    readonly correlationId: string;
    readonly now: Date;
  }): Promise<void>;
  recordOutboundState(input: {
    readonly attemptRef: string;
    readonly outboundIntent: OutboundCallIntentRecord;
    readonly now: Date;
    readonly correlationId: string;
  }): Promise<RelayAttemptRecord>;
  recordHumanReview(input: {
    readonly attemptRef: string;
    readonly reviewerRef: string;
    readonly reviewerRole: "nurse" | "clinician";
    readonly correlationId: string;
    readonly now: Date;
  }): Promise<RelayAttemptRecord | null>;
}

export interface RelayOutboundExecutor {
  execute(input: {
    readonly taskKey: OutboundCallTaskKey;
    readonly recipients: readonly [
      {
        readonly phones: readonly [string];
        readonly region: string;
        readonly locale: string;
      },
    ];
    readonly idempotencyRef: string;
  }): Promise<OutboundCallIntentRecord>;
}

export interface RelayPreview {
  readonly recipientKind: RelayRecipientKind;
  readonly purpose: RelayPurpose;
  readonly targetRef: string;
  readonly maskedTarget: string;
  readonly context: RelayContextRef;
  readonly region: string;
  readonly locale: string;
  readonly lineRegion: string;
  readonly taskContract: Pick<RelayTaskContract, "key" | "version">;
  readonly costNotice: string;
  readonly noCancellationNotice: string;
  readonly attestationVersion: string;
  readonly authorityFingerprint: string;
  readonly authorityRevision: string;
  readonly expiresAt: Date;
  readonly providerContacted: false;
  readonly confirmationToken: string;
}

export type RelayResultState = `RESULT_${RelayTechnicalDisposition}`;
