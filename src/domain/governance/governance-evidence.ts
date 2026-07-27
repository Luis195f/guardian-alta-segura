import type {
  GovernanceEvidenceCollection,
  GovernanceEvidenceSource,
} from "@/application/ports/governance-evidence-reader";
import type { EpisodeGovernanceView } from "@/domain/episode/activation-policy";
import type {
  AlertEvidenceReference,
  AlertProvenanceReadResult,
  CanonicalProvenanceLineageV1,
  RuleEvaluationEvidenceReference,
  SourceEvidenceReference,
} from "@/domain/provenance/signal-provenance";
import {
  projectTaskAccountability,
  type TaskAccountabilityBlocker,
  type TaskAccountabilityProjection,
} from "@/domain/workqueue/task-accountability";

export const EVIDENCE_INTEGRITY_STATUSES = [
  "COMPLETE",
  "PARTIAL",
  "INCONSISTENT",
  "NOT_APPLICABLE",
  "UNAVAILABLE",
] as const;

export type EvidenceIntegrityStatus = (typeof EVIDENCE_INTEGRITY_STATUSES)[number];

export const EVIDENCE_INTEGRITY_DEFINITIONS = {
  COMPLETE:
    "All expected persisted references for the supported technical workflow are present and coherent.",
  PARTIAL:
    "The available evidence is coherent but deliberately unpersisted evidence, legacy provenance, or explicit query truncation prevents a complete reconstruction.",
  INCONSISTENT:
    "Persisted references contradict the supported technical workflow or its structural invariants.",
  NOT_APPLICABLE: "The evidence category is not required for this technical workflow.",
  UNAVAILABLE:
    "The evidence is not persisted or cannot be projected from an existing source of truth.",
} as const satisfies Readonly<Record<EvidenceIntegrityStatus, string>>;

export type GovernanceEvidenceIssueCode =
  | "EPISODE_GOVERNANCE_MISMATCH"
  | "COLLECTION_TRUNCATED"
  | "ALERT_EPISODE_MISMATCH"
  | "ALERT_EVALUATION_MISMATCH"
  | "ALERT_PROVENANCE_LEGACY_UNVERSIONED"
  | "ALERT_PROVENANCE_INVALID"
  | "ALERT_PROVENANCE_REFERENCE_MISMATCH"
  | "ALERT_REVIEW_HISTORY_INCONSISTENT"
  | "SIGNAL_DERIVED_TASK_ALERT_MISSING"
  | "SIGNAL_DERIVED_TASK_REVIEW_MISSING"
  | "TASK_ACCOUNTABILITY_INCONSISTENT"
  | "AUDIT_REFERENCE_MISMATCH"
  | "HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED"
  | "HISTORICAL_HUMAN_AUTHORIZATION_DECISION_NOT_PERSISTED";

type MinimizedEvidenceReference =
  | AlertEvidenceReference
  | SourceEvidenceReference
  | Omit<RuleEvaluationEvidenceReference, "inputHash">;

interface MinimizedCanonicalProvenanceLineageV1 {
  readonly schemaVersion: CanonicalProvenanceLineageV1["schemaVersion"];
  readonly episodeId: string;
  readonly subject: MinimizedEvidenceReference;
  readonly parents: readonly MinimizedEvidenceReference[];
}

type MinimizedAlertProvenance =
  | Exclude<AlertProvenanceReadResult, { readonly status: "VALID" }>
  | {
      readonly status: "VALID";
      readonly lineage: MinimizedCanonicalProvenanceLineageV1;
    };

interface AlertEvidenceProjection {
  readonly alertId: string;
  readonly state: GovernanceEvidenceSource["alerts"][number]["state"];
  readonly triggeredAt: Date;
  readonly rule: GovernanceEvidenceSource["alerts"][number]["rule"];
  readonly evaluation: Omit<GovernanceEvidenceSource["alerts"][number]["evaluation"], "inputHash">;
  readonly provenance: MinimizedAlertProvenance;
  readonly sourceVerification: {
    readonly atEvaluation:
      "SOURCE_REFERENCE_VERIFIED_AT_EVALUATION" | "UNAVAILABLE_FOR_LEGACY_OR_INVALID_PROVENANCE";
    readonly duringEvidenceRead: "SOURCE_RECORD_NOT_REVERIFIED_DURING_EVIDENCE_READ";
  };
  readonly humanReviews: GovernanceEvidenceSource["alerts"][number]["reviews"];
  readonly historicalReviewerRole: {
    readonly status: "UNAVAILABLE";
    readonly limitationCode: "HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED";
  };
  readonly integrity: {
    readonly status: Exclude<EvidenceIntegrityStatus, "NOT_APPLICABLE" | "UNAVAILABLE">;
    readonly issues: readonly GovernanceEvidenceIssueCode[];
  };
}

export interface GovernanceEvidenceTaskProjection {
  readonly accountability: TaskAccountabilityProjection;
  readonly accountabilityEvidenceStatus: "COMPLETE" | "PARTIAL" | "INCONSISTENT";
  readonly signalEvidence: {
    readonly status: Exclude<EvidenceIntegrityStatus, "UNAVAILABLE">;
    readonly alertId: string | null;
    readonly alertEvidence: AlertEvidenceProjection | null;
    readonly issues: readonly GovernanceEvidenceIssueCode[];
  };
  readonly humanAuthorization: {
    readonly enforcementContract:
      | {
          readonly status: "COMPLETE";
          readonly policy: "DefaultHumanAuthorizationPolicy";
          readonly action: "CREATE_TASK_FROM_REVIEWED_ALERT";
        }
      | {
          readonly status: "NOT_APPLICABLE";
        };
    readonly perInstanceDecisionPersistence:
      | {
          readonly status: "UNAVAILABLE";
          readonly limitationCode: "HISTORICAL_HUMAN_AUTHORIZATION_DECISION_NOT_PERSISTED";
        }
      | {
          readonly status: "NOT_APPLICABLE";
        };
  };
  readonly integrity: {
    readonly status: Exclude<EvidenceIntegrityStatus, "NOT_APPLICABLE" | "UNAVAILABLE">;
    readonly issues: readonly GovernanceEvidenceIssueCode[];
  };
}

export interface EpisodeGovernanceEvidenceView {
  readonly viewType: "EPISODE_GOVERNANCE_EVIDENCE";
  readonly readOnly: true;
  readonly generatedAt: Date;
  readonly integrityModel: typeof EVIDENCE_INTEGRITY_DEFINITIONS;
  readonly integrity: {
    readonly status: Exclude<EvidenceIntegrityStatus, "NOT_APPLICABLE" | "UNAVAILABLE">;
    readonly issues: readonly GovernanceEvidenceIssueCode[];
  };
  readonly episode: GovernanceEvidenceSource["episode"];
  readonly episodeTransitions: GovernanceEvidenceSource["transitions"];
  readonly governance: EpisodeGovernanceView;
  readonly alerts: readonly AlertEvidenceProjection[];
  readonly tasks: readonly GovernanceEvidenceTaskProjection[];
  readonly auditReferences: GovernanceEvidenceSource["auditEvents"];
  readonly coverage: Readonly<
    Record<
      GovernanceEvidenceCollection,
      GovernanceEvidenceSource["coverage"][GovernanceEvidenceCollection] & {
        readonly status: "COMPLETE" | "PARTIAL";
      }
    >
  >;
}

function mostSevere(
  statuses: readonly Exclude<EvidenceIntegrityStatus, "NOT_APPLICABLE" | "UNAVAILABLE">[],
): "COMPLETE" | "PARTIAL" | "INCONSISTENT" {
  if (statuses.includes("INCONSISTENT")) return "INCONSISTENT";
  if (statuses.includes("PARTIAL")) return "PARTIAL";
  return "COMPLETE";
}

function sameTimestamp(reference: string | undefined, persisted: Date): boolean {
  return reference === persisted.toISOString();
}

function withoutInputHash<T extends { readonly inputHash: string }>(
  value: T,
): Omit<T, "inputHash"> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "inputHash")) as Omit<
    T,
    "inputHash"
  >;
}

function validLineageMatchesAlert(
  lineage: CanonicalProvenanceLineageV1,
  alert: GovernanceEvidenceSource["alerts"][number],
): boolean {
  const subject = lineage.subject as AlertEvidenceReference;
  const evaluation = lineage.parents.find(
    (parent): parent is RuleEvaluationEvidenceReference =>
      parent.evidenceClass === "DERIVED" && parent.kind === "RULE_EVALUATION",
  );
  return (
    lineage.episodeId === alert.episodeId &&
    subject.evidenceClass === "DERIVED" &&
    subject.kind === "ALERT" &&
    subject.resource.resourceType === "Alert" &&
    subject.resource.resourceId === alert.alertId &&
    subject.episodeId === alert.episodeId &&
    subject.rule.definitionId === alert.rule.definitionId &&
    subject.rule.versionId === alert.rule.versionId &&
    subject.rule.versionNumber === alert.rule.versionNumber &&
    sameTimestamp(subject.timestamps.triggeredAt, alert.triggeredAt) &&
    evaluation !== undefined &&
    evaluation.resource.resourceType === "RuleEvaluation" &&
    evaluation.resource.resourceId === alert.evaluation.evaluationId &&
    evaluation.episodeId === alert.episodeId &&
    evaluation.outcome === alert.evaluation.outcome &&
    evaluation.outcome === "matched" &&
    evaluation.inputHash === alert.evaluation.inputHash &&
    sameTimestamp(evaluation.timestamps.evaluatedAt, alert.evaluation.evaluatedAt) &&
    evaluation.actor?.actorId === alert.evaluation.evaluatedById &&
    evaluation.rule.definitionId === alert.evaluation.ruleDefinitionId &&
    evaluation.rule.versionId === alert.evaluation.ruleVersionId &&
    evaluation.rule.versionNumber === alert.evaluation.ruleVersionNumber &&
    lineage.parents.every((parent) => parent.episodeId === alert.episodeId)
  );
}

function minimizeReference(
  reference: CanonicalProvenanceLineageV1["subject"],
): MinimizedEvidenceReference {
  if (reference.kind !== "RULE_EVALUATION") return reference;
  return withoutInputHash(reference);
}

function minimizeProvenance(provenance: AlertProvenanceReadResult): MinimizedAlertProvenance {
  if (provenance.status !== "VALID") return provenance;
  return {
    status: "VALID",
    lineage: {
      ...provenance.lineage,
      subject: minimizeReference(provenance.lineage.subject),
      parents: provenance.lineage.parents.map(minimizeReference),
    },
  };
}

function projectAlert(
  alert: GovernanceEvidenceSource["alerts"][number],
  reviewsTruncated: boolean,
): AlertEvidenceProjection {
  const issues = new Set<GovernanceEvidenceIssueCode>();
  if (alert.episodeId !== alert.evaluation.episodeId) issues.add("ALERT_EPISODE_MISMATCH");
  if (
    alert.evaluation.outcome !== "matched" ||
    alert.rule.definitionId !== alert.evaluation.ruleDefinitionId ||
    alert.rule.versionId !== alert.evaluation.ruleVersionId ||
    alert.rule.versionNumber !== alert.evaluation.ruleVersionNumber
  ) {
    issues.add("ALERT_EVALUATION_MISMATCH");
  }
  if (alert.provenance.status === "INVALID") {
    issues.add("ALERT_PROVENANCE_INVALID");
  } else if (alert.provenance.status === "LEGACY_UNVERSIONED") {
    issues.add("ALERT_PROVENANCE_LEGACY_UNVERSIONED");
  } else if (!validLineageMatchesAlert(alert.provenance.lineage, alert)) {
    issues.add("ALERT_PROVENANCE_REFERENCE_MISMATCH");
  }

  const reviews = [...alert.reviews].sort(
    (left, right) =>
      left.reviewedAt.getTime() - right.reviewedAt.getTime() ||
      left.reviewId.localeCompare(right.reviewId),
  );
  let expectedState: GovernanceEvidenceSource["alerts"][number]["state"] = "open";
  for (const review of reviews) {
    if (review.alertId !== alert.alertId || review.fromState !== expectedState) {
      issues.add("ALERT_REVIEW_HISTORY_INCONSISTENT");
    }
    expectedState = review.toState;
  }
  if (!reviewsTruncated && expectedState !== alert.state) {
    issues.add("ALERT_REVIEW_HISTORY_INCONSISTENT");
  }

  const inconsistent = [...issues].some((issue) =>
    [
      "ALERT_EPISODE_MISMATCH",
      "ALERT_EVALUATION_MISMATCH",
      "ALERT_PROVENANCE_INVALID",
      "ALERT_PROVENANCE_REFERENCE_MISMATCH",
      "ALERT_REVIEW_HISTORY_INCONSISTENT",
    ].includes(issue),
  );
  const partial = reviewsTruncated || issues.has("ALERT_PROVENANCE_LEGACY_UNVERSIONED");
  const minimizedEvaluation = withoutInputHash(alert.evaluation);
  return {
    alertId: alert.alertId,
    state: alert.state,
    triggeredAt: alert.triggeredAt,
    rule: alert.rule,
    evaluation: minimizedEvaluation,
    provenance: minimizeProvenance(alert.provenance),
    sourceVerification: {
      atEvaluation:
        alert.provenance.status === "VALID"
          ? "SOURCE_REFERENCE_VERIFIED_AT_EVALUATION"
          : "UNAVAILABLE_FOR_LEGACY_OR_INVALID_PROVENANCE",
      duringEvidenceRead: "SOURCE_RECORD_NOT_REVERIFIED_DURING_EVIDENCE_READ",
    },
    humanReviews: reviews,
    historicalReviewerRole: {
      status: "UNAVAILABLE",
      limitationCode: "HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED",
    },
    integrity: {
      status: inconsistent ? "INCONSISTENT" : partial ? "PARTIAL" : "COMPLETE",
      issues: [...issues],
    },
  };
}

const TRUNCATION_TAIL_BLOCKERS = new Set<TaskAccountabilityBlocker>([
  "TASK_EVENT_STREAM_EMPTY",
  "CURRENT_ASSIGNEE_EVENT_MISMATCH",
  "TASK_REVISION_EVENT_MISMATCH",
  "CURRENT_STATE_EVENT_MISMATCH",
  "RESOLUTION_EVENT_MISSING",
]);

function hasObservedAccountabilityContradiction(
  blockers: readonly TaskAccountabilityBlocker[],
): boolean {
  return blockers.some(
    (blocker) =>
      blocker !== "CURRENT_ASSIGNEE_NOT_CURRENTLY_AUTHORIZED" &&
      !TRUNCATION_TAIL_BLOCKERS.has(blocker),
  );
}

function auditReferenceMatchesEpisode(
  event: GovernanceEvidenceSource["auditEvents"][number],
  episodeId: string,
  alertIds: ReadonlySet<string>,
  evaluationIds: ReadonlySet<string>,
  taskIds: ReadonlySet<string>,
): boolean {
  return (
    (event.resourceType === "DischargeEpisode" && event.resourceId === episodeId) ||
    (event.resourceType === "Alert" &&
      event.resourceId !== null &&
      alertIds.has(event.resourceId)) ||
    (event.resourceType === "RuleEvaluation" &&
      event.resourceId !== null &&
      evaluationIds.has(event.resourceId)) ||
    (event.resourceType === "Task" && event.resourceId !== null && taskIds.has(event.resourceId))
  );
}

export function projectEpisodeGovernanceEvidence(input: {
  readonly source: GovernanceEvidenceSource;
  readonly governance: EpisodeGovernanceView;
  readonly generatedAt: Date;
}): EpisodeGovernanceEvidenceView {
  const issues = new Set<GovernanceEvidenceIssueCode>();
  if (
    input.governance.episodeId !== input.source.episode.id ||
    input.governance.episodeVersion !== input.source.episode.version ||
    input.governance.episodeStatus !== input.source.episode.state
  ) {
    issues.add("EPISODE_GOVERNANCE_MISMATCH");
  }

  const coverage = Object.fromEntries(
    Object.entries(input.source.coverage).map(([collection, value]) => {
      if (value.truncated) issues.add("COLLECTION_TRUNCATED");
      return [
        collection,
        {
          ...value,
          status: value.truncated ? ("PARTIAL" as const) : ("COMPLETE" as const),
        },
      ];
    }),
  ) as EpisodeGovernanceEvidenceView["coverage"];

  const alerts = input.source.alerts.map((alert) =>
    projectAlert(alert, input.source.coverage.alertReviews.truncated),
  );
  const alertById = new Map(alerts.map((alert) => [alert.alertId, alert]));
  const tasks: GovernanceEvidenceTaskProjection[] = input.source.tasks.map(
    ({ task, events, currentAssigneeCurrentlyAuthorized }) => {
      const accountability = projectTaskAccountability({
        task,
        events,
        currentAssigneeCurrentlyAuthorized,
      });
      const accountabilityIncompleteByTruncation =
        input.source.coverage.taskEvents.truncated && events.length < task.revision;
      const accountabilityKnownInconsistency =
        accountability.consistencyStatus === "INCONSISTENT" &&
        (!accountabilityIncompleteByTruncation ||
          hasObservedAccountabilityContradiction(accountability.blockers));
      const signalIssues = new Set<GovernanceEvidenceIssueCode>();
      let signalStatus: GovernanceEvidenceTaskProjection["signalEvidence"]["status"];
      let alertEvidence: AlertEvidenceProjection | null = null;
      if (task.alertId === null) {
        signalStatus = "NOT_APPLICABLE";
      } else {
        alertEvidence = alertById.get(task.alertId) ?? null;
        if (!alertEvidence) {
          signalIssues.add("SIGNAL_DERIVED_TASK_ALERT_MISSING");
          signalStatus = input.source.coverage.alerts.truncated ? "PARTIAL" : "INCONSISTENT";
        } else if (alertEvidence.humanReviews.length === 0) {
          signalIssues.add("SIGNAL_DERIVED_TASK_REVIEW_MISSING");
          signalStatus = input.source.coverage.alertReviews.truncated ? "PARTIAL" : "INCONSISTENT";
        } else {
          signalStatus = alertEvidence.integrity.status;
        }
      }

      const taskIssues = new Set<GovernanceEvidenceIssueCode>(signalIssues);
      if (accountabilityKnownInconsistency) {
        taskIssues.add("TASK_ACCOUNTABILITY_INCONSISTENT");
      }
      if (task.alertId !== null) {
        taskIssues.add("HISTORICAL_HUMAN_AUTHORIZATION_DECISION_NOT_PERSISTED");
      }
      const taskStatus: "COMPLETE" | "PARTIAL" | "INCONSISTENT" =
        accountabilityKnownInconsistency || signalStatus === "INCONSISTENT"
          ? "INCONSISTENT"
          : accountabilityIncompleteByTruncation ||
              signalStatus === "PARTIAL" ||
              task.alertId !== null
            ? "PARTIAL"
            : "COMPLETE";
      return {
        accountability,
        accountabilityEvidenceStatus: accountabilityIncompleteByTruncation
          ? accountabilityKnownInconsistency
            ? "INCONSISTENT"
            : "PARTIAL"
          : accountability.consistencyStatus === "INCONSISTENT"
            ? "INCONSISTENT"
            : "COMPLETE",
        signalEvidence: {
          status: signalStatus,
          alertId: task.alertId,
          alertEvidence,
          issues: [...signalIssues],
        },
        humanAuthorization:
          task.alertId === null
            ? {
                enforcementContract: { status: "NOT_APPLICABLE" as const },
                perInstanceDecisionPersistence: { status: "NOT_APPLICABLE" as const },
              }
            : {
                enforcementContract: {
                  status: "COMPLETE" as const,
                  policy: "DefaultHumanAuthorizationPolicy" as const,
                  action: "CREATE_TASK_FROM_REVIEWED_ALERT" as const,
                },
                perInstanceDecisionPersistence: {
                  status: "UNAVAILABLE" as const,
                  limitationCode: "HISTORICAL_HUMAN_AUTHORIZATION_DECISION_NOT_PERSISTED" as const,
                },
              },
        integrity: { status: taskStatus, issues: [...taskIssues] },
      };
    },
  );

  const alertIds = new Set(input.source.alerts.map(({ alertId }) => alertId));
  const evaluationIds = new Set(
    input.source.alerts.map(({ evaluation }) => evaluation.evaluationId),
  );
  const taskIds = new Set(input.source.tasks.map(({ task }) => task.id));
  if (
    input.source.auditEvents.some(
      (event) =>
        !auditReferenceMatchesEpisode(
          event,
          input.source.episode.id,
          alertIds,
          evaluationIds,
          taskIds,
        ),
    )
  ) {
    issues.add("AUDIT_REFERENCE_MISMATCH");
  }
  for (const alert of alerts) {
    alert.integrity.issues.forEach((issue) => issues.add(issue));
  }
  for (const task of tasks) {
    task.integrity.issues.forEach((issue) => issues.add(issue));
  }
  const status = mostSevere([
    issues.has("EPISODE_GOVERNANCE_MISMATCH") || issues.has("AUDIT_REFERENCE_MISMATCH")
      ? "INCONSISTENT"
      : issues.has("COLLECTION_TRUNCATED")
        ? "PARTIAL"
        : "COMPLETE",
    ...alerts.map(({ integrity }) => integrity.status),
    ...tasks.map(({ integrity }) => integrity.status),
  ]);

  return {
    viewType: "EPISODE_GOVERNANCE_EVIDENCE",
    readOnly: true,
    generatedAt: input.generatedAt,
    integrityModel: EVIDENCE_INTEGRITY_DEFINITIONS,
    integrity: { status, issues: [...issues] },
    episode: input.source.episode,
    episodeTransitions: input.source.transitions,
    governance: input.governance,
    alerts,
    tasks,
    auditReferences: input.source.auditEvents,
    coverage,
  };
}
