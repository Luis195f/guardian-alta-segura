import type {
  CaregiverAuthorization,
  CommunicationChannel,
  CommunicationPermission,
  DigitalParticipationRecord,
  LegalRecord,
  PolicyVersion,
  ProcessingBasisRecord,
  RevocationEvent,
} from "@/domain/legal/legal-records";

export type LegalAuthorizationReason =
  | "allowed"
  | "feature-disabled"
  | "missing-specific-record"
  | "record-pending"
  | "pending-local-validation"
  | "record-not-active"
  | "policy-not-found"
  | "policy-record-type-mismatch"
  | "policy-scope-mismatch"
  | "policy-not-approved"
  | "expired"
  | "revoked";

export interface LegalAuthorizationDecision {
  readonly allowed: boolean;
  readonly reason: LegalAuthorizationReason;
  readonly code: string;
  readonly label: string;
  readonly recordId: string | null;
  readonly policyVersionId: string | null;
}

interface EvaluationContext {
  readonly policies: readonly PolicyVersion[];
  readonly revocations: readonly RevocationEvent[];
  readonly now: Date;
}

function newest<T extends LegalRecord>(records: readonly T[]): T | undefined {
  return [...records].sort((left, right) => {
    const byTime = right.recordedAt.getTime() - left.recordedAt.getTime();
    return byTime || right.id.localeCompare(left.id);
  })[0];
}

const decisionPresentation = {
  allowed: { allowed: true, code: "EFFECTIVE", label: "AUTORIZADO — registro vigente" },
  "feature-disabled": {
    allowed: false,
    code: "FEATURE_DISABLED",
    label: "DENEGADO — funcionalidad desactivada",
  },
  "missing-specific-record": {
    allowed: false,
    code: "MISSING_SPECIFIC_RECORD",
    label: "DENEGADO — falta registro específico",
  },
  "record-pending": {
    allowed: false,
    code: "RECORD_PENDING",
    label: "DENEGADO — estado registrado pendiente",
  },
  "pending-local-validation": {
    allowed: false,
    code: "POLICY_PENDING",
    label: "DENEGADO — política pendiente de validación local",
  },
  "record-not-active": {
    allowed: false,
    code: "RECORD_INACTIVE",
    label: "DENEGADO — registro no activo",
  },
  "policy-not-found": {
    allowed: false,
    code: "POLICY_NOT_FOUND",
    label: "DENEGADO — política no disponible",
  },
  "policy-record-type-mismatch": {
    allowed: false,
    code: "POLICY_RECORD_TYPE_MISMATCH",
    label: "DENEGADO — política de otro tipo de registro",
  },
  "policy-scope-mismatch": {
    allowed: false,
    code: "POLICY_SCOPE_MISMATCH",
    label: "DENEGADO — alcance de política incompatible",
  },
  "policy-not-approved": {
    allowed: false,
    code: "POLICY_NOT_APPROVED",
    label: "DENEGADO — política no aprobada",
  },
  expired: { allowed: false, code: "EXPIRED", label: "DENEGADO — registro vencido" },
  revoked: { allowed: false, code: "REVOKED", label: "DENEGADO — registro revocado" },
} as const satisfies Record<
  LegalAuthorizationReason,
  { readonly allowed: boolean; readonly code: string; readonly label: string }
>;

function decision(
  reason: LegalAuthorizationReason,
  record?: LegalRecord,
): LegalAuthorizationDecision {
  return {
    ...decisionPresentation[reason],
    reason,
    recordId: record?.id ?? null,
    policyVersionId: record?.policyVersionId ?? null,
  };
}

export function evaluateLegalRecordAuthorization(
  record: LegalRecord | undefined,
  context: EvaluationContext,
): LegalAuthorizationDecision {
  if (!record) return decision("missing-specific-record");
  const revoked = context.revocations.some(
    (event) =>
      event.targetRecordId === record.id &&
      event.targetType === record.recordType &&
      event.recordedAt <= context.now,
  );
  if (revoked) return decision("revoked", record);
  if (record.state === "PENDING") {
    return decision("record-pending", record);
  }
  if (record.state !== "ACTIVE") {
    return decision("record-not-active", record);
  }
  if (record.expiresAt && record.expiresAt <= context.now) {
    return decision("expired", record);
  }
  const policy = context.policies.find(({ id }) => id === record.policyVersionId);
  if (!policy) return decision("policy-not-found", record);
  if (policy.recordType !== record.recordType) {
    return decision("policy-record-type-mismatch", record);
  }
  if (policy.scope !== record.scope) return decision("policy-scope-mismatch", record);
  if (policy.state === "PENDING") return decision("pending-local-validation", record);
  if (policy.state !== "APPROVED") return decision("policy-not-approved", record);
  return decision("allowed", record);
}

export class LegalAuthorizationService {
  authorizeCommunication(input: {
    readonly subjectUserId: string;
    readonly channel: CommunicationChannel;
    readonly purpose: string;
    readonly permissions: readonly CommunicationPermission[];
    readonly processingBasisRecords: readonly ProcessingBasisRecord[];
    readonly policies: readonly PolicyVersion[];
    readonly revocations: readonly RevocationEvent[];
    readonly now: Date;
  }): LegalAuthorizationDecision {
    const scope = communicationScope(input.channel, input.purpose);
    const context = input;
    const permission = evaluateLegalRecordAuthorization(
      newest(
        input.permissions.filter(
          (record) =>
            record.subjectUserId === input.subjectUserId &&
            record.channel === input.channel &&
            record.purpose === input.purpose &&
            record.scope === scope,
        ),
      ),
      context,
    );
    if (!permission.allowed) return permission;

    // A care-treatment basis is deliberately insufficient: the configured basis must match
    // this exact channel and purpose.
    return evaluateLegalRecordAuthorization(
      newest(
        input.processingBasisRecords.filter(
          (record) => record.subjectUserId === input.subjectUserId && record.scope === scope,
        ),
      ),
      context,
    );
  }

  authorizeFutureCheckIn(input: {
    readonly subjectUserId: string;
    readonly featureEnabled: boolean;
    readonly records: readonly DigitalParticipationRecord[];
    readonly policies: readonly PolicyVersion[];
    readonly revocations: readonly RevocationEvent[];
    readonly now: Date;
  }): LegalAuthorizationDecision {
    if (!input.featureEnabled) {
      return decision("feature-disabled");
    }
    return evaluateLegalRecordAuthorization(
      newest(
        input.records.filter(
          (record) => record.subjectUserId === input.subjectUserId && record.scope === "check-ins",
        ),
      ),
      input,
    );
  }

  authorizeCaregiverAccess(input: {
    readonly subjectUserId: string;
    readonly caregiverUserId: string;
    readonly requestedScope: string;
    readonly records: readonly CaregiverAuthorization[];
    readonly policies: readonly PolicyVersion[];
    readonly revocations: readonly RevocationEvent[];
    readonly now: Date;
  }): LegalAuthorizationDecision {
    return evaluateLegalRecordAuthorization(
      newest(
        input.records.filter(
          (record) =>
            record.subjectUserId === input.subjectUserId &&
            record.caregiverUserId === input.caregiverUserId &&
            record.scope === input.requestedScope,
        ),
      ),
      input,
    );
  }
}

export function communicationScope(channel: CommunicationChannel, purpose: string): string {
  return `communication:${channel.toLowerCase()}:${purpose}`;
}
