import type {
  AuditOutcome,
  CaregiverAccessAction,
  CaregiverCapability,
  PolicyState,
  SafetyPlanStep,
} from "@prisma/client";

import type { NewAuditEvent } from "@/domain/audit/audit-event";

export class CaregiverScopeWriteConflictError extends Error {}

export interface CaregiverAuthorizationContext {
  readonly id: string;
  readonly subjectUserId: string;
  readonly caregiverUserId: string;
  readonly state: "PENDING" | "ACTIVE" | "DECLINED";
  readonly scope: string;
  readonly policyVersionId: string;
  readonly recordedAt: Date;
  readonly expiresAt: Date | null;
  readonly policy: {
    readonly id: string;
    readonly policyKey: string;
    readonly version: string;
    readonly recordType: "CAREGIVER_AUTHORIZATION";
    readonly state: PolicyState;
    readonly scope: string;
    readonly actorUserId: string;
    readonly recordedAt: Date;
    readonly origin: "DEMO_UI" | "PROFESSIONAL_ENTRY" | "INSTITUTIONAL_CONFIGURATION";
    readonly evidenceType:
      "RECORDED_INTERACTION" | "INSTITUTIONAL_DECISION_REFERENCE" | "SYSTEM_IMPORT_REFERENCE";
    readonly evidenceRef: string;
  } | null;
  readonly revokedAt: Date | null;
}

export interface CaregiverEpisodeContext {
  readonly id: string;
  readonly patientPortalUserId: string | null;
  readonly patientIsSynthetic: boolean;
}

export interface CaregiverProfileRecord {
  readonly id: string;
  readonly caregiverUserId: string;
  readonly externalPseudonymousId: string;
}

export interface CaregiverScopeRecord {
  readonly id: string;
  readonly dischargeEpisodeId: string;
  readonly version: number;
  readonly capabilities: readonly CaregiverCapability[];
  readonly allowedPlanSections: readonly SafetyPlanStep[];
  readonly authorizedResourceKeys: readonly string[];
}

export interface CaregiverInvitationRecord {
  readonly id: string;
  readonly caregiverAuthorizationId: string;
  readonly caregiverProfileId: string;
  readonly dischargeEpisodeId: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly profile: CaregiverProfileRecord;
  readonly authorization: CaregiverAuthorizationContext;
}

export interface NewCaregiverAccessAudit {
  readonly caregiverAuthorizationId?: string | null;
  readonly caregiverProfileId?: string | null;
  readonly caregiverSessionId?: string | null;
  readonly actorUserId?: string | null;
  readonly action: CaregiverAccessAction;
  readonly outcome: AuditOutcome;
  readonly resourceType: string;
  readonly resourceId?: string | null;
  readonly correlationId: string;
  readonly createdAt: Date;
}

export interface CaregiverAccessTransaction {
  lockAuthorization(id: string): Promise<void>;
  getAuthorization(id: string): Promise<CaregiverAuthorizationContext | null>;
  getEpisode(id: string): Promise<CaregiverEpisodeContext | null>;
  isActiveUserWithRole(userId: string, role: "patient" | "caregiver"): Promise<boolean>;
  ensureProfile(input: {
    readonly caregiverUserId: string;
    readonly externalPseudonymousId: string;
  }): Promise<CaregiverProfileRecord>;
  getLatestScope(
    caregiverAuthorizationId: string,
    dischargeEpisodeId: string,
  ): Promise<CaregiverScopeRecord | null>;
  createScope(input: {
    readonly caregiverAuthorizationId: string;
    readonly dischargeEpisodeId: string;
    readonly version: number;
    readonly capabilities: readonly CaregiverCapability[];
    readonly allowedPlanSections: readonly SafetyPlanStep[];
    readonly authorizedResourceKeys: readonly string[];
    readonly actorUserId: string;
    readonly recordedAt: Date;
  }): Promise<CaregiverScopeRecord>;
  createInvitation(input: {
    readonly caregiverAuthorizationId: string;
    readonly caregiverProfileId: string;
    readonly dischargeEpisodeId: string;
    readonly invitationTokenHash: string;
    readonly createdById: string;
    readonly createdAt: Date;
    readonly expiresAt: Date;
  }): Promise<{ readonly id: string }>;
  findInvitationByTokenHash(hash: string): Promise<CaregiverInvitationRecord | null>;
  consumeInvitation(id: string, consumedAt: Date): Promise<boolean>;
  createSession(input: {
    readonly caregiverAuthorizationId: string;
    readonly caregiverProfileId: string;
    readonly dischargeEpisodeId: string;
    readonly invitationId: string;
    readonly sessionTokenHash: string;
    readonly createdAt: Date;
    readonly expiresAt: Date;
  }): Promise<{ readonly id: string }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
  appendAccessAudit(input: NewCaregiverAccessAudit): Promise<{ readonly id: string }>;
}

export interface CaregiverAccessUnitOfWork {
  run<T>(operation: (transaction: CaregiverAccessTransaction) => Promise<T>): Promise<T>;
}

export interface CaregiverTokenIssuer {
  issue(): { readonly raw: string; readonly hash: string };
}

export interface CaregiverPseudonymIssuer {
  issue(): string;
}

export interface LocalCaregiverInvitationAdapter {
  deliver(input: {
    readonly invitationId: string;
    readonly rawToken: string;
    readonly expiresAt: Date;
  }): Promise<{ readonly localAcceptanceToken: string }>;
}
