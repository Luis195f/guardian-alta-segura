export interface IdentityActivationContext {
  readonly patientIsSynthetic: boolean;
  readonly patientState: "PENDING" | "VERIFIED" | "REJECTED";
  readonly policyState: "PENDING" | "APPROVED" | "WITHDRAWN" | "SUPERSEDED" | null;
  readonly acceptedState: "PENDING" | "VERIFIED" | "REJECTED" | null;
  readonly processCode: string | null;
  readonly processVersion: string | null;
  readonly policyIsSyntheticDemo: boolean | null;
  readonly identityVerifiedAt: Date | null;
  readonly identityVerifiedById: string | null;
}

export function isIdentityEligibleForActivation(context: IdentityActivationContext): boolean {
  return (
    context.policyState === "APPROVED" &&
    context.patientState === context.acceptedState &&
    context.patientState === "VERIFIED" &&
    Boolean(context.processCode?.trim()) &&
    Boolean(context.processVersion?.trim()) &&
    context.patientIsSynthetic === context.policyIsSyntheticDemo &&
    context.identityVerifiedAt !== null &&
    context.identityVerifiedById !== null
  );
}

export interface EpisodeClosurePolicy {
  evaluate(
    episodeId: string,
  ): Promise<
    | { readonly allowed: true }
    | { readonly allowed: false; readonly reason: "OPEN_ALERTS" | "ALERT_POLICY_UNAVAILABLE" }
  >;
}

export class AlertModuleUnavailableClosurePolicy implements EpisodeClosurePolicy {
  async evaluate(): Promise<{
    readonly allowed: false;
    readonly reason: "ALERT_POLICY_UNAVAILABLE";
  }> {
    return { allowed: false, reason: "ALERT_POLICY_UNAVAILABLE" };
  }
}
