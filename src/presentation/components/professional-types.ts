import type { AlertProvenanceReadResult } from "@/domain/provenance/signal-provenance";
import type { EpisodeGovernanceEvidenceView } from "@/domain/governance/governance-evidence";

type Serialized<T> = T extends Date
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Serialized<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: Serialized<T[Key]> }
      : T;

export type EpisodeGovernanceEvidenceResponse = Serialized<EpisodeGovernanceEvidenceView>;

export type Professional = { readonly id: string; readonly syntheticAlias: string };

export interface ProfessionalQueueTask {
  readonly id: string;
  readonly alertId: string | null;
  readonly summary: string;
  readonly state: "open" | "resolved";
  readonly assignedTo: Professional | null;
  readonly createdAt: string;
}

export interface ProfessionalQueueEntry {
  readonly episode: {
    readonly id: string;
    readonly status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
    readonly dischargeDate: string;
    readonly patientPseudonymousId: string;
    readonly responsibleNurse: Professional;
    readonly responsibleClinician: Professional;
  };
  readonly pendingElementCount: number;
  readonly lastRelevantCheckIn: {
    readonly id: string;
    readonly scheduledFor: string;
    readonly outcome: { readonly type: string; readonly recordedAt: string } | null;
  } | null;
  readonly openAlerts: readonly {
    readonly id: string;
    readonly state: "open" | "reviewed" | "actioned";
    readonly ruleName: string;
    readonly ruleVersionId: string;
    readonly ruleVersionNumber: number;
    readonly explanation: string;
    readonly provenance: AlertProvenanceReadResult;
    readonly triggeredAt: string;
    readonly reviewedByHuman: boolean;
  }[];
  readonly tasks: readonly ProfessionalQueueTask[];
}

export interface ProfessionalQueueResponse {
  readonly entries: readonly ProfessionalQueueEntry[];
  readonly metrics: {
    readonly episodeCount: number;
    readonly pendingElementCount: number;
    readonly openTaskCount: number;
    readonly resolvedTaskCount: number;
    readonly oldestOpenTaskAgeHours: number | null;
  };
}

export interface OperationalContinuityResponse {
  readonly notice: string;
  readonly limitation: string;
  readonly items: readonly {
    readonly sourceType:
      | "EPISODE"
      | "CHECK_IN"
      | "RULE_EVALUATION"
      | "ALERT"
      | "ALERT_REVIEW"
      | "TASK"
      | "GOVERNANCE_EVIDENCE";
    readonly resourceId: string;
    readonly episodeId: string;
    readonly episodeAlias: string;
    readonly sourceState: string;
    readonly administrativeState:
      | "DATA_ERROR"
      | "BLOCKED"
      | "TECHNICALLY_OVERDUE"
      | "PENDING"
      | "NO_EVIDENCE"
      | "ABSTAINED"
      | "RECORDED"
      | "RESOLVED"
      | "UPDATE_UNKNOWN";
    readonly currentResponsibility: string | null;
    readonly configuredAt: string | null;
    readonly lastEvidenceAt: string | null;
    readonly sourceUpdatedAt: string | null;
    readonly inclusionReason: string;
    readonly canonicalHref: string;
  }[];
  readonly page: {
    readonly size: number;
    readonly returned: number;
    readonly hasNextPage: boolean;
    readonly truncated: boolean;
    readonly nextCursor: string | null;
  };
  readonly freshness: {
    readonly state: "UPDATE_UNKNOWN";
    readonly generatedAt: string;
    readonly explanation: string;
  };
}

export interface EpisodeDetail {
  readonly id: string;
  readonly dischargeDate: string;
  readonly programLengthDays: number;
  readonly status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
  readonly version: number;
  readonly checkInProtocolVersionId: string;
  readonly patient: { readonly externalPseudonymousId: string };
  readonly responsibleNurse: { readonly syntheticAlias: string };
  readonly responsibleClinician: { readonly syntheticAlias: string };
  readonly transitions: readonly {
    readonly id: string;
    readonly fromStatus: EpisodeDetail["status"] | null;
    readonly toStatus: EpisodeDetail["status"];
    readonly reason: string | null;
    readonly resultingVersion: number;
    readonly occurredAt: string;
    readonly actor: { readonly syntheticAlias: string };
  }[];
}

export interface EpisodeGovernanceView {
  readonly episodeId: string;
  readonly episodeVersion: number;
  readonly episodeStatus: EpisodeDetail["status"];
  readonly openObligations: readonly (
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
      }
  )[];
  readonly blockers: readonly {
    readonly category: "TECHNICAL_OR_OPERATIONAL_BLOCKER" | "LOCAL_POLICY_PENDING";
    readonly code: string;
    readonly resourceIds: readonly string[];
  }[];
  readonly pendingInstitutionalDecisions: readonly {
    readonly decisionId: "DEC-002";
    readonly status: "PENDING";
  }[];
  readonly organizationallyGoverned: boolean;
  readonly transitionDecision: {
    readonly targetStatus: "CLOSED";
    readonly authorization: "AUTHORIZED" | "NOT_AUTHORIZED";
  };
  readonly evaluatedAt: string;
}

export const episodeStatusLabels: Readonly<Record<EpisodeDetail["status"], string>> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  CLOSED: "Cerrado",
};
