import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type {
  SafetyPlanSectionDraft,
  SafetyPlanVersionState,
} from "@/domain/safety-plan/safety-plan";

export interface SafetyPlanRecord {
  readonly id: string;
  readonly dischargeEpisodeId: string;
  readonly revision: number;
  readonly currentVersion: number;
  readonly activeVersionNumber: number | null;
}

export interface SafetyPlanAccessContext {
  readonly episodeId: string;
  readonly patientIsSynthetic: boolean;
  readonly responsibleNurseId: string;
  readonly responsibleClinicianId: string;
  readonly patientPortalUserId: string | null;
}

export interface SafetyPlanVersionRecord {
  readonly id: string;
  readonly versionNumber: number;
  readonly state: SafetyPlanVersionState;
}

export interface SafetyPlanTransaction {
  getEpisodeAccess(episodeId: string): Promise<SafetyPlanAccessContext | null>;
  findPlanByEpisode(episodeId: string): Promise<SafetyPlanRecord | null>;
  ensurePlan(episodeId: string, actorUserId: string): Promise<SafetyPlanRecord>;
  claimNextVersion(
    safetyPlanId: string,
    expectedRevision: number,
  ): Promise<{ readonly revision: number; readonly versionNumber: number } | null>;
  claimLifecycleChange(
    safetyPlanId: string,
    expectedRevision: number,
    activeVersionNumber: number | null,
  ): Promise<number | null>;
  createVersion(input: {
    readonly safetyPlanId: string;
    readonly versionNumber: number;
    readonly basedOnVersion: number | null;
    readonly createdById: string;
    readonly sections: readonly SafetyPlanSectionDraft[];
    readonly occurredAt: Date;
  }): Promise<SafetyPlanVersionRecord>;
  getVersion(safetyPlanId: string, versionNumber: number): Promise<SafetyPlanVersionRecord | null>;
  appendStateChange(input: {
    readonly safetyPlanVersionId: string;
    readonly resultingState: SafetyPlanVersionState;
    readonly reason: string | null;
    readonly actorUserId: string;
    readonly occurredAt: Date;
  }): Promise<void>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
  isActiveUserWithRole(userId: string, role: Role): Promise<boolean>;
}

export interface SafetyPlanUnitOfWork {
  run<T>(operation: (transaction: SafetyPlanTransaction) => Promise<T>): Promise<T>;
}
