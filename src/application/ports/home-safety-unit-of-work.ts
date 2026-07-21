import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type { HomeSafetyItemInput } from "@/domain/home-safety/home-safety";

export interface HomeSafetyEpisodeRecord {
  readonly id: string;
  readonly isSynthetic: boolean;
  readonly responsibleNurseId: string;
  readonly responsibleClinicianId: string;
}

export interface HomeSafetyTransaction {
  isActiveUserWithRole(userId: string, role: Role): Promise<boolean>;
  getEpisode(episodeId: string): Promise<HomeSafetyEpisodeRecord | null>;
  getLatestVersionNumber(episodeId: string): Promise<number>;
  createVersion(input: {
    readonly episodeId: string;
    readonly versionNumber: number;
    readonly templateKey: string;
    readonly templateVersion: string;
    readonly informationalPurposeAcknowledged: true;
    readonly humanReviewed: boolean;
    readonly actorUserId: string;
    readonly recordedAt: Date;
    readonly items: readonly HomeSafetyItemInput[];
  }): Promise<{ readonly id: string }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
}

export interface HomeSafetyUnitOfWork {
  run<T>(operation: (transaction: HomeSafetyTransaction) => Promise<T>): Promise<T>;
}
