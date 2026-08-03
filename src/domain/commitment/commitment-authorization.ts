import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { CommitmentCommandKind } from "@/domain/commitment/commitment";

export interface CommitmentAuthorizationRequest {
  readonly command: CommitmentCommandKind;
  readonly actor: AuthenticatedPrincipal;
  readonly episodeId: string;
  readonly evaluatedAt: Date;
  readonly syntheticContextVerified: true;
}

export type CommitmentAuthorizationDecision =
  | {
      readonly status: "AUTHORIZED";
      readonly command: CommitmentCommandKind;
      readonly actorId: string;
      readonly episodeId: string;
    }
  | {
      readonly status: "DENIED";
      readonly reason: "RUNTIME_DENY_ALL" | "SYNTHETIC_POLICY_DENIED";
    };

export interface CommitmentAuthorizationPolicy {
  evaluate(
    request: CommitmentAuthorizationRequest,
  ): CommitmentAuthorizationDecision | Promise<CommitmentAuthorizationDecision>;
}

export class DenyAllCommitmentAuthorizationPolicy implements CommitmentAuthorizationPolicy {
  evaluate(): CommitmentAuthorizationDecision {
    return { status: "DENIED", reason: "RUNTIME_DENY_ALL" };
  }
}
