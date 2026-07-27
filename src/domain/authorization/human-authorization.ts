import type { AlertState } from "@/domain/alerts/explainable-rule";

export const HUMAN_AUTHORIZATION_ACTIONS = ["CREATE_TASK_FROM_REVIEWED_ALERT"] as const;
export type HumanAuthorizationAction = (typeof HUMAN_AUTHORIZATION_ACTIONS)[number];

export const HUMAN_AUTHORIZATION_BLOCKERS = [
  "UNSUPPORTED_ACTION",
  "ACTOR_NOT_AUTHENTICATED",
  "ACTOR_NOT_AUTHORIZED",
  "ACTOR_NOT_RESPONSIBLE",
  "RESOURCE_INCONSISTENT",
  "ALERT_NOT_FOUND",
  "ALERT_EPISODE_MISMATCH",
  "ALERT_STATE_NOT_ELIGIBLE",
  "NO_HUMAN_REVIEW",
  "INVALID_REVIEW_EVIDENCE",
  "POLICY_EVALUATION_ERROR",
] as const;
export type HumanAuthorizationBlocker = (typeof HUMAN_AUTHORIZATION_BLOCKERS)[number];

export interface HumanAuthorizationEvidence {
  readonly reviewedObject: {
    readonly resourceType: "Alert";
    readonly resourceId: string;
    readonly ruleVersion: {
      readonly resourceId: string;
      readonly versionNumber: number;
    };
  };
  readonly humanReview: {
    readonly resourceType: "AlertReview";
    readonly resourceId: string;
    readonly alertId: string;
    readonly reviewerId: string;
    readonly reviewedAt: Date;
    readonly historicalReviewerRoleEvidence: "HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED";
  };
}

export interface HumanAuthorizationDecision {
  readonly status: "AUTHORIZED" | "NOT_AUTHORIZED";
  readonly action: HumanAuthorizationAction | "UNSUPPORTED";
  readonly episodeId: string | null;
  readonly actorId: string | null;
  readonly evaluatedAt: Date;
  readonly evidence: HumanAuthorizationEvidence | null;
  readonly blockers: readonly HumanAuthorizationBlocker[];
}

export interface HumanAuthorizationPolicy {
  evaluate(input: unknown): HumanAuthorizationDecision;
}

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const ELIGIBLE_ALERT_STATES: readonly AlertState[] = [
  "reviewed",
  "actioned",
  "resolved",
  "dismissed-with-reason",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(value: unknown): string | null {
  return typeof value === "string" && SAFE_IDENTIFIER.test(value) ? value : null;
}

function date(value: unknown): Date | null {
  return value instanceof Date && !Number.isNaN(value.valueOf()) ? value : null;
}

function notAuthorized(
  input: {
    readonly action: HumanAuthorizationDecision["action"];
    readonly episodeId: string | null;
    readonly actorId: string | null;
    readonly evaluatedAt: Date;
    readonly evidence?: HumanAuthorizationEvidence | null;
  },
  blockers: readonly HumanAuthorizationBlocker[],
): HumanAuthorizationDecision {
  return {
    status: "NOT_AUTHORIZED",
    action: input.action,
    episodeId: input.episodeId,
    actorId: input.actorId,
    evaluatedAt: input.evaluatedAt,
    evidence: input.evidence ?? null,
    blockers: [...new Set(blockers)],
  };
}

export class DefaultHumanAuthorizationPolicy implements HumanAuthorizationPolicy {
  evaluate(input: unknown): HumanAuthorizationDecision {
    const fallbackEvaluatedAt = new Date(0);
    try {
      if (!isRecord(input)) {
        return notAuthorized(
          {
            action: "UNSUPPORTED",
            episodeId: null,
            actorId: null,
            evaluatedAt: fallbackEvaluatedAt,
          },
          ["POLICY_EVALUATION_ERROR"],
        );
      }

      const parsedEvaluatedAt = date(input.evaluatedAt);
      const evaluatedAt = parsedEvaluatedAt ?? fallbackEvaluatedAt;
      const action =
        input.action === "CREATE_TASK_FROM_REVIEWED_ALERT"
          ? "CREATE_TASK_FROM_REVIEWED_ALERT"
          : "UNSUPPORTED";
      const actor = isRecord(input.actor) ? input.actor : null;
      const actorId = identifier(actor?.userId);
      const sessionId = identifier(actor?.sessionId);
      const roles = Array.isArray(actor?.roles) ? actor.roles : [];
      const episode = isRecord(input.episode) ? input.episode : null;
      const episodeId = identifier(episode?.id);
      const responsibleNurseId = identifier(episode?.responsibleNurseId);
      const responsibleClinicianId = identifier(episode?.responsibleClinicianId);
      const activeRole =
        input.activeRole === "nurse" || input.activeRole === "clinician" ? input.activeRole : null;

      const blockers: HumanAuthorizationBlocker[] = [];
      if (!parsedEvaluatedAt) blockers.push("POLICY_EVALUATION_ERROR");
      if (action === "UNSUPPORTED") blockers.push("UNSUPPORTED_ACTION");
      if (!actorId || !sessionId) blockers.push("ACTOR_NOT_AUTHENTICATED");
      if (
        !activeRole ||
        !roles.includes(activeRole) ||
        !roles.every((role) => typeof role === "string")
      ) {
        blockers.push("ACTOR_NOT_AUTHORIZED");
      }
      if (!episodeId || !responsibleNurseId || !responsibleClinicianId) {
        blockers.push("RESOURCE_INCONSISTENT");
      } else if (actorId && actorId !== responsibleNurseId && actorId !== responsibleClinicianId) {
        blockers.push("ACTOR_NOT_RESPONSIBLE");
      }

      if (input.alert === null || input.alert === undefined) {
        blockers.push("ALERT_NOT_FOUND");
        return notAuthorized({ action, episodeId, actorId, evaluatedAt }, blockers);
      }
      if (!isRecord(input.alert)) {
        blockers.push("RESOURCE_INCONSISTENT");
        return notAuthorized({ action, episodeId, actorId, evaluatedAt }, blockers);
      }

      const alertId = identifier(input.alert.id);
      const alertEpisodeId = identifier(input.alert.episodeId);
      const ruleVersionId = identifier(input.alert.ruleVersionId);
      const ruleVersionNumber =
        Number.isInteger(input.alert.ruleVersionNumber) && Number(input.alert.ruleVersionNumber) > 0
          ? Number(input.alert.ruleVersionNumber)
          : null;
      const alertState =
        typeof input.alert.state === "string" ? (input.alert.state as AlertState) : null;
      if (!alertId || !alertEpisodeId || !ruleVersionId || !ruleVersionNumber) {
        blockers.push("RESOURCE_INCONSISTENT");
      }
      if (episodeId && alertEpisodeId && episodeId !== alertEpisodeId) {
        blockers.push("ALERT_EPISODE_MISMATCH");
      }
      if (!alertState || !ELIGIBLE_ALERT_STATES.includes(alertState)) {
        blockers.push("ALERT_STATE_NOT_ELIGIBLE");
      }

      if (input.review === null || input.review === undefined) {
        blockers.push("NO_HUMAN_REVIEW");
        return notAuthorized({ action, episodeId, actorId, evaluatedAt }, blockers);
      }
      if (!isRecord(input.review)) {
        blockers.push("INVALID_REVIEW_EVIDENCE");
        return notAuthorized({ action, episodeId, actorId, evaluatedAt }, blockers);
      }

      const reviewId = identifier(input.review.id);
      const reviewedAlertId = identifier(input.review.alertId);
      const reviewerId = identifier(input.review.reviewedById);
      const reviewedAt = date(input.review.reviewedAt);
      if (
        !reviewId ||
        !reviewedAlertId ||
        !reviewerId ||
        !reviewedAt ||
        (parsedEvaluatedAt !== null && reviewedAt > parsedEvaluatedAt) ||
        !alertId ||
        reviewedAlertId !== alertId
      ) {
        blockers.push("INVALID_REVIEW_EVIDENCE");
      }

      const evidence =
        alertId &&
        ruleVersionId &&
        ruleVersionNumber &&
        reviewId &&
        reviewedAlertId === alertId &&
        reviewerId &&
        reviewedAt &&
        parsedEvaluatedAt !== null &&
        reviewedAt <= parsedEvaluatedAt
          ? {
              reviewedObject: {
                resourceType: "Alert" as const,
                resourceId: alertId,
                ruleVersion: {
                  resourceId: ruleVersionId,
                  versionNumber: ruleVersionNumber,
                },
              },
              humanReview: {
                resourceType: "AlertReview" as const,
                resourceId: reviewId,
                alertId: reviewedAlertId,
                reviewerId,
                reviewedAt,
                historicalReviewerRoleEvidence: "HISTORICAL_REVIEWER_ROLE_NOT_PERSISTED" as const,
              },
            }
          : null;

      if (blockers.length > 0 || !evidence) {
        return notAuthorized({ action, episodeId, actorId, evaluatedAt, evidence }, blockers);
      }
      return {
        status: "AUTHORIZED",
        action,
        episodeId,
        actorId,
        evaluatedAt,
        evidence,
        blockers: [],
      };
    } catch {
      return notAuthorized(
        {
          action: "UNSUPPORTED",
          episodeId: null,
          actorId: null,
          evaluatedAt: fallbackEvaluatedAt,
        },
        ["POLICY_EVALUATION_ERROR"],
      );
    }
  }
}
