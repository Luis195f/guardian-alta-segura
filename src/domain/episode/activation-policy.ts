import type { EpisodeStatus } from "@/domain/episode/discharge-episode";

export interface IdentityActivationContext {
  readonly patientIsSynthetic: boolean;
  readonly patientState: "PENDING" | "VERIFIED" | "REJECTED";
  readonly policyVersionId: string | null;
  readonly policyKey: string | null;
  readonly policyVersion: string | null;
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

export type EpisodeGovernanceBlockerCategory =
  "TECHNICAL_OR_OPERATIONAL_BLOCKER" | "LOCAL_POLICY_PENDING";

export type EpisodeGovernanceBlockerCode =
  | "DEC_002_EPISODE_CLOSURE_POLICY_PENDING"
  | "UNRESOLVED_ALERTS"
  | "OPEN_TASKS"
  | "RESPONSIBLE_NURSE_INACTIVE"
  | "RESPONSIBLE_CLINICIAN_INACTIVE"
  | "REQUIRED_CHECK_IN_PROTOCOL_UNAVAILABLE"
  | "IDENTITY_ACTIVATION_EVIDENCE_INCONSISTENT"
  | "GOVERNANCE_POLICY_UNAVAILABLE"
  | "GOVERNANCE_EVALUATION_FAILED"
  | "GOVERNANCE_STATE_INCONSISTENT";

export const EPISODE_CLOSURE_INSTITUTIONAL_DECISION = {
  decisionId: "DEC-002",
  status: "PENDING",
} as const;

export type EpisodeGovernanceObligation =
  | {
      readonly kind: "ALERT";
      readonly resourceId: string;
      readonly state: "open" | "reviewed" | "actioned";
    }
  | {
      readonly kind: "TASK";
      readonly resourceId: string;
      readonly state: "open";
      readonly revision: number;
    };

export interface EpisodeGovernanceInput {
  readonly episode: {
    readonly id: string;
    readonly version: number;
    readonly status: EpisodeStatus;
    readonly responsibleNurseId: string;
    readonly responsibleClinicianId: string;
    readonly checkInProtocolVersionId: string;
    readonly identity: IdentityActivationContext;
  };
  readonly responsibleProfessionals: {
    readonly nurseActive: boolean;
    readonly clinicianActive: boolean;
  };
  readonly checkInProtocol: {
    readonly versionId: string;
    readonly protocolKey: string;
    readonly versionNumber: number;
    readonly state: "DRAFT" | "SYNTHETIC_DEMO" | "RETIRED";
    readonly isSyntheticFixture: boolean;
  } | null;
  readonly openObligations: readonly EpisodeGovernanceObligation[];
  readonly openObligationsCoverage: {
    readonly returned: number;
    readonly limit: number;
    readonly truncated: boolean;
    readonly basis: "TECHNICAL_DEMO_LIMIT";
  };
  readonly evaluatedAt: Date;
  readonly correlationId: string;
}

export interface EpisodeGovernanceBlocker {
  readonly category: EpisodeGovernanceBlockerCategory;
  readonly code: EpisodeGovernanceBlockerCode;
  readonly resourceIds: readonly string[];
  readonly correlationId: string | null;
}

export interface EpisodeGovernanceView {
  readonly episodeId: string;
  readonly episodeVersion: number;
  readonly episodeStatus: EpisodeStatus;
  readonly responsibleNurse: {
    readonly userId: string;
    readonly active: boolean;
  };
  readonly responsibleClinician: {
    readonly userId: string;
    readonly active: boolean;
  };
  readonly checkInProtocol: EpisodeGovernanceInput["checkInProtocol"];
  readonly activationAuthorization: {
    readonly status: "AUTHORIZED" | "NOT_AUTHORIZED";
    readonly identityPolicyVersionId: string | null;
  };
  readonly openObligations: readonly EpisodeGovernanceObligation[];
  readonly openObligationsCoverage: EpisodeGovernanceInput["openObligationsCoverage"];
  readonly blockers: readonly EpisodeGovernanceBlocker[];
  readonly pendingInstitutionalDecisions: readonly {
    readonly decisionId: "DEC-002";
    readonly status: "PENDING";
  }[];
  readonly organizationallyGoverned: boolean;
  readonly transitionDecision: {
    readonly targetStatus: "CLOSED";
    readonly authorization: "AUTHORIZED" | "NOT_AUTHORIZED";
  };
  readonly evaluatedAt: Date;
}

export interface EpisodeGovernancePolicy {
  evaluate(input: EpisodeGovernanceInput): Promise<EpisodeGovernanceView>;
}

function blocker(
  code: EpisodeGovernanceBlockerCode,
  resourceIds: readonly string[] = [],
  correlationId: string | null = null,
): EpisodeGovernanceBlocker {
  return {
    category:
      code === "DEC_002_EPISODE_CLOSURE_POLICY_PENDING"
        ? "LOCAL_POLICY_PENDING"
        : "TECHNICAL_OR_OPERATIONAL_BLOCKER",
    code,
    resourceIds,
    correlationId,
  };
}

function baseView(
  input: EpisodeGovernanceInput,
  blockers: readonly EpisodeGovernanceBlocker[],
): EpisodeGovernanceView {
  return {
    episodeId: input.episode.id,
    episodeVersion: input.episode.version,
    episodeStatus: input.episode.status,
    responsibleNurse: {
      userId: input.episode.responsibleNurseId,
      active: input.responsibleProfessionals.nurseActive,
    },
    responsibleClinician: {
      userId: input.episode.responsibleClinicianId,
      active: input.responsibleProfessionals.clinicianActive,
    },
    checkInProtocol: input.checkInProtocol,
    activationAuthorization: {
      status: isIdentityEligibleForActivation(input.episode.identity)
        ? "AUTHORIZED"
        : "NOT_AUTHORIZED",
      identityPolicyVersionId: input.episode.identity.policyVersionId,
    },
    openObligations: input.openObligations,
    openObligationsCoverage: input.openObligationsCoverage,
    blockers,
    pendingInstitutionalDecisions: [EPISODE_CLOSURE_INSTITUTIONAL_DECISION],
    organizationallyGoverned: blockers.length === 0,
    transitionDecision: {
      targetStatus: "CLOSED",
      authorization: "NOT_AUTHORIZED",
    },
    evaluatedAt: input.evaluatedAt,
  };
}

function operationalBlockers(input: EpisodeGovernanceInput): EpisodeGovernanceBlocker[] {
  const blockers: EpisodeGovernanceBlocker[] = [];
  if (!input.responsibleProfessionals.nurseActive) {
    blockers.push(blocker("RESPONSIBLE_NURSE_INACTIVE", [input.episode.responsibleNurseId]));
  }
  if (!input.responsibleProfessionals.clinicianActive) {
    blockers.push(
      blocker("RESPONSIBLE_CLINICIAN_INACTIVE", [input.episode.responsibleClinicianId]),
    );
  }
  if (
    input.checkInProtocol === null ||
    input.checkInProtocol.versionId !== input.episode.checkInProtocolVersionId ||
    input.checkInProtocol.state !== "SYNTHETIC_DEMO" ||
    !input.checkInProtocol.isSyntheticFixture
  ) {
    blockers.push(
      blocker("REQUIRED_CHECK_IN_PROTOCOL_UNAVAILABLE", [input.episode.checkInProtocolVersionId]),
    );
  }
  if (
    input.episode.status !== "DRAFT" &&
    !isIdentityEligibleForActivation(input.episode.identity)
  ) {
    blockers.push(
      blocker(
        "IDENTITY_ACTIVATION_EVIDENCE_INCONSISTENT",
        input.episode.identity.policyVersionId ? [input.episode.identity.policyVersionId] : [],
      ),
    );
  }
  const alertIds = input.openObligations
    .filter((obligation) => obligation.kind === "ALERT")
    .map(({ resourceId }) => resourceId);
  if (alertIds.length > 0) blockers.push(blocker("UNRESOLVED_ALERTS", alertIds));
  const taskIds = input.openObligations
    .filter((obligation) => obligation.kind === "TASK")
    .map(({ resourceId }) => resourceId);
  if (taskIds.length > 0) blockers.push(blocker("OPEN_TASKS", taskIds));
  return blockers;
}

export class PendingInstitutionalEpisodeGovernancePolicy implements EpisodeGovernancePolicy {
  async evaluate(input: EpisodeGovernanceInput): Promise<EpisodeGovernanceView> {
    return baseView(input, [
      ...operationalBlockers(input),
      blocker("DEC_002_EPISODE_CLOSURE_POLICY_PENDING"),
    ]);
  }
}

export function failClosedEpisodeGovernanceView(
  input: EpisodeGovernanceInput,
  failure:
    | "GOVERNANCE_POLICY_UNAVAILABLE"
    | "GOVERNANCE_EVALUATION_FAILED"
    | "GOVERNANCE_STATE_INCONSISTENT",
): EpisodeGovernanceView {
  return baseView(input, [
    ...operationalBlockers(input),
    blocker(failure, [], input.correlationId),
    blocker("DEC_002_EPISODE_CLOSURE_POLICY_PENDING"),
  ]);
}
