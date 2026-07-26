import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type {
  AdministrativeSeverity,
  AlertState,
  ExplainableRuleDsl,
  ReferencedRuleInput,
  RuleEvaluationOutcome,
  RuleReviewOwner,
  RuleState,
} from "@/domain/alerts/explainable-rule";
import type { Role } from "@/domain/auth/role";
import type { SourceEvidenceReference } from "@/domain/provenance/signal-provenance";

export interface RuleDefinitionRecord {
  readonly id: string;
  readonly ruleKey: string;
  readonly name: string;
  readonly isSyntheticFixture: boolean;
}

export interface RuleVersionRecord {
  readonly id: string;
  readonly definitionId: string;
  readonly versionNumber: number;
  readonly state: RuleState;
  readonly basedOnVersionId: string | null;
  readonly dsl: ExplainableRuleDsl;
  readonly createdById: string;
  readonly approval: {
    readonly id: string;
    readonly approvedById: string;
    readonly approvedAt: Date;
  } | null;
}

export interface AlertEpisodeRecord {
  readonly id: string;
  readonly isSynthetic: boolean;
  readonly responsibleNurseId: string;
  readonly responsibleClinicianId: string;
}

export interface AlertRecord {
  readonly id: string;
  readonly episodeId: string;
  readonly currentState: AlertState;
  readonly responsibleNurseId: string;
  readonly responsibleClinicianId: string;
}

export interface RecordedEvaluation {
  readonly evaluationId: string;
  readonly alertId: string | null;
  readonly created: boolean;
  readonly evaluatedById: string;
  readonly ruleVersionId: string;
  readonly episodeId: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly outcome: RuleEvaluationOutcome;
  readonly missingInputs: readonly string[];
}

export interface ExplainableAlertsTransaction {
  isActiveUserWithRole(userId: string, role: Role): Promise<boolean>;
  findDefinitionByKey(ruleKey: string): Promise<RuleDefinitionRecord | null>;
  createDefinition(input: {
    readonly ruleKey: string;
    readonly name: string;
    readonly isSyntheticFixture: true;
    readonly createdById: string;
    readonly createdAt: Date;
  }): Promise<RuleDefinitionRecord>;
  getLatestVersion(definitionId: string): Promise<RuleVersionRecord | null>;
  getVersion(versionId: string): Promise<RuleVersionRecord | null>;
  createVersion(input: {
    readonly definitionId: string;
    readonly versionNumber: number;
    readonly state: "draft";
    readonly basedOnVersionId: string | null;
    readonly dsl: ExplainableRuleDsl;
    readonly createdById: string;
    readonly createdAt: Date;
  }): Promise<RuleVersionRecord>;
  approveVersion(input: {
    readonly versionId: string;
    readonly approvedById: string;
    readonly approvedAt: Date;
    readonly approvalReference: string;
  }): Promise<RuleVersionRecord>;
  activateVersion(input: {
    readonly definitionId: string;
    readonly versionId: string;
    readonly activatedAt: Date;
  }): Promise<RuleVersionRecord>;
  getEpisode(episodeId: string): Promise<AlertEpisodeRecord | null>;
  resolveSourceProvenance(
    inputs: readonly ReferencedRuleInput[],
    episodeId: string,
  ): Promise<readonly SourceEvidenceReference[]>;
  findEvaluationByIdempotency(
    evaluatedById: string,
    idempotencyKey: string,
  ): Promise<RecordedEvaluation | null>;
  recordEvaluation(input: {
    readonly ruleDefinitionId: string;
    readonly ruleVersionId: string;
    readonly ruleVersionNumber: number;
    readonly episodeId: string;
    readonly evaluatedById: string;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly evaluatedAt: Date;
    readonly inputSnapshot: readonly ReferencedRuleInput[];
    readonly inputHash: string;
    readonly outcome: RuleEvaluationOutcome;
    readonly missingInputs: readonly string[];
    readonly alert: {
      readonly sourceReferences: readonly SourceEvidenceReference[];
      readonly explanation: string;
      readonly administrativeSeverity: AdministrativeSeverity;
      readonly reviewOwner: RuleReviewOwner;
      readonly triggeredAt: Date;
    } | null;
  }): Promise<RecordedEvaluation>;
  getAlert(alertId: string): Promise<AlertRecord | null>;
  appendAlertReview(input: {
    readonly alertId: string;
    readonly fromState: AlertState;
    readonly toState: Exclude<AlertState, "open">;
    readonly reason: string | null;
    readonly reviewedById: string;
    readonly reviewedAt: Date;
  }): Promise<{ readonly reviewId: string }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
}

export interface ExplainableAlertsUnitOfWork {
  run<T>(operation: (transaction: ExplainableAlertsTransaction) => Promise<T>): Promise<T>;
}
