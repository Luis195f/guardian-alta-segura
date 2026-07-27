import type { AuditAction, AuditOutcome } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type { EpisodeGovernanceView } from "@/domain/episode/activation-policy";
import type { AlertProvenanceReadResult } from "@/domain/provenance/signal-provenance";
import type {
  TaskAccountabilityEvent,
  TaskAccountabilityTask,
} from "@/domain/workqueue/task-accountability";

export const GOVERNANCE_EVIDENCE_COLLECTION_LIMIT = 100;

export type GovernanceEvidenceCollection =
  "episodeTransitions" | "alerts" | "alertReviews" | "tasks" | "taskEvents" | "auditEvents";

export interface GovernanceEvidenceCollectionCoverage {
  readonly returned: number;
  readonly limit: number;
  readonly truncated: boolean;
}

export interface GovernanceEvidenceSource {
  readonly episode: {
    readonly id: string;
    readonly state: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
    readonly version: number;
    readonly responsibleNurseId: string;
    readonly responsibleClinicianId: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly checkInProtocol: {
      readonly versionId: string;
      readonly protocolKey: string;
      readonly versionNumber: number;
    };
  };
  readonly transitions: readonly {
    readonly transitionId: string;
    readonly fromState: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | null;
    readonly toState: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
    readonly actorUserId: string;
    readonly actorRole: Role;
    readonly resultingVersion: number;
    readonly occurredAt: Date;
  }[];
  readonly alerts: readonly {
    readonly alertId: string;
    readonly episodeId: string;
    readonly state: "open" | "reviewed" | "actioned" | "resolved" | "dismissed-with-reason";
    readonly triggeredAt: Date;
    readonly rule: {
      readonly definitionId: string;
      readonly versionId: string;
      readonly versionNumber: number;
    };
    readonly evaluation: {
      readonly evaluationId: string;
      readonly episodeId: string;
      readonly evaluatedById: string;
      readonly evaluatedAt: Date;
      readonly outcome: "matched" | "not-matched" | "abstained";
      readonly inputHash: string;
      readonly ruleDefinitionId: string;
      readonly ruleVersionId: string;
      readonly ruleVersionNumber: number;
    };
    readonly provenance: AlertProvenanceReadResult;
    readonly reviews: readonly {
      readonly reviewId: string;
      readonly alertId: string;
      readonly fromState: "open" | "reviewed" | "actioned" | "resolved" | "dismissed-with-reason";
      readonly toState: "open" | "reviewed" | "actioned" | "resolved" | "dismissed-with-reason";
      readonly reviewedById: string;
      readonly reviewedAt: Date;
    }[];
  }[];
  readonly tasks: readonly {
    readonly task: TaskAccountabilityTask;
    readonly events: readonly TaskAccountabilityEvent[];
    readonly currentAssigneeCurrentlyAuthorized: boolean;
  }[];
  readonly auditEvents: readonly {
    readonly auditEventId: string;
    readonly action: AuditAction;
    readonly result: AuditOutcome;
    readonly actorUserId: string | null;
    readonly actorRole: Role | null;
    readonly resourceType: string;
    readonly resourceId: string | null;
    readonly occurredAt: Date;
    readonly correlationId: string;
  }[];
  readonly coverage: Readonly<
    Record<GovernanceEvidenceCollection, GovernanceEvidenceCollectionCoverage>
  >;
}

export interface GovernanceEvidenceReader {
  readAuthorizedEpisodeEvidenceSnapshot(input: {
    readonly episodeId: string;
    readonly actorUserId: string;
    readonly actorProfessionalRoles: readonly ("nurse" | "clinician")[];
    readonly correlationId: string;
    readonly evaluatedAt: Date;
  }): Promise<{
    readonly source: GovernanceEvidenceSource;
    readonly governance: EpisodeGovernanceView;
  } | null>;
}
