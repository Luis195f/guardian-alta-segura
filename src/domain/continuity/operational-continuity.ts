export const OPERATIONAL_SOURCE_TYPES = [
  "EPISODE",
  "CHECK_IN",
  "RULE_EVALUATION",
  "ALERT",
  "ALERT_REVIEW",
  "TASK",
  "GOVERNANCE_EVIDENCE",
] as const;

export type OperationalSourceType = (typeof OPERATIONAL_SOURCE_TYPES)[number];

export const OPERATIONAL_ADMINISTRATIVE_STATES = [
  "DATA_ERROR",
  "BLOCKED",
  "TECHNICALLY_OVERDUE",
  "PENDING",
  "NO_EVIDENCE",
  "ABSTAINED",
  "RECORDED",
  "RESOLVED",
  "UPDATE_UNKNOWN",
] as const;

export type OperationalAdministrativeState = (typeof OPERATIONAL_ADMINISTRATIVE_STATES)[number];

export interface OperationalContinuityItem {
  readonly sourceType: OperationalSourceType;
  readonly resourceId: string;
  readonly episodeId: string;
  readonly episodeAlias: string;
  readonly sourceState: string;
  readonly administrativeState: OperationalAdministrativeState;
  readonly administrativeRank: number;
  readonly currentResponsibility: string | null;
  readonly configuredAt: Date | null;
  readonly lastEvidenceAt: Date | null;
  readonly sourceUpdatedAt: Date | null;
  readonly inclusionReason: string;
  readonly canonicalHref: string;
}

export interface OperationalCursorPosition {
  readonly administrativeRank: number;
  readonly configuredAt: Date | null;
  readonly sourceType: OperationalSourceType;
  readonly resourceId: string;
}

export interface OperationalContinuityPage {
  readonly items: readonly OperationalContinuityItem[];
  readonly page: {
    readonly size: number;
    readonly returned: number;
    readonly hasNextPage: boolean;
    readonly truncated: boolean;
  };
  readonly freshness: {
    readonly state: "UPDATE_UNKNOWN";
    readonly generatedAt: Date;
    readonly explanation: string;
  };
}

export function operationalCursorPosition(
  item: OperationalContinuityItem,
): OperationalCursorPosition {
  return {
    administrativeRank: item.administrativeRank,
    configuredAt: item.configuredAt,
    sourceType: item.sourceType,
    resourceId: item.resourceId,
  };
}

export function canonicalOperationalHref(
  sourceType: OperationalSourceType,
  episodeId: string,
): string {
  const episodeHref = `/episodes/${encodeURIComponent(episodeId)}`;
  const tabBySource: Readonly<Partial<Record<OperationalSourceType, string>>> = {
    CHECK_IN: "check-ins",
    RULE_EVALUATION: "evidence",
    ALERT: "alerts",
    ALERT_REVIEW: "evidence",
    TASK: "follow-up",
    GOVERNANCE_EVIDENCE: "evidence",
  };
  const tab = tabBySource[sourceType];
  return tab ? `${episodeHref}?tab=${tab}` : episodeHref;
}
