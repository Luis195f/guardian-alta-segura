import type {
  CommitmentAuthorizationDecision,
  CommitmentAuthorizationPolicy,
  CommitmentAuthorizationRequest,
} from "../../src/domain/commitment/commitment-authorization";

/** Test-only authorization. Runtime code must never import this adapter. */
export class SyntheticCommitmentAuthorizationPolicy implements CommitmentAuthorizationPolicy {
  evaluate(request: CommitmentAuthorizationRequest): CommitmentAuthorizationDecision {
    return {
      status: "AUTHORIZED",
      command: request.command,
      actorId: request.actor.userId,
      episodeId: request.episodeId,
    };
  }
}
