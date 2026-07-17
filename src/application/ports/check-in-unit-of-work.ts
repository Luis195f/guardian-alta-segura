import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import type {
  CheckInAnswerInput,
  CheckInProtocolState,
  QuestionDefinitionInput,
  ScheduleConfigurationInput,
  ScheduledCheckInSlot,
} from "@/domain/check-in/check-in";
import type {
  DigitalParticipationRecord,
  PolicyVersion,
  RevocationEvent,
} from "@/domain/legal/legal-records";

export interface CheckInProtocolRecord {
  readonly id: string;
  readonly protocolKey: string;
  readonly versionNumber: number;
  readonly title: string;
  readonly state: CheckInProtocolState;
  readonly basedOnVersionId: string | null;
  readonly isSyntheticFixture: boolean;
  readonly questions: readonly (QuestionDefinitionInput & { readonly id: string })[];
  readonly schedule: ScheduleConfigurationInput;
}

export interface CheckInEpisodeRecord {
  readonly id: string;
  readonly status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
  readonly dischargeDate: Date;
  readonly programLengthDays: number;
  readonly responsibleNurseId: string;
  readonly responsibleClinicianId: string;
  readonly patientPortalUserId: string | null;
  readonly patientIsSynthetic: boolean;
  readonly checkInProtocolVersionId: string;
}

export interface CheckInAssignmentRecord {
  readonly id: string;
  readonly episodeId: string;
  readonly checkInProtocolVersionId: string;
  readonly scheduledFor: Date;
  readonly windowStartsAt: Date;
  readonly windowEndsAt: Date;
  readonly response: { readonly id: string } | null;
  readonly nonResponseEvent: { readonly reason: "WINDOW_EXPIRED" | "PATIENT_OMITTED" } | null;
  readonly outcome: CheckInOutcomeRecord | null;
  readonly episode: CheckInEpisodeRecord;
  readonly protocol: CheckInProtocolRecord;
}

export interface CheckInAssignmentBatchRecord {
  readonly id: string;
  readonly episodeId: string;
  readonly protocolVersionId: string;
  readonly createdById: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly assignmentIds: readonly string[];
}

export interface CheckInOutcomeRecord {
  readonly id: string;
  readonly assignmentId: string;
  readonly protocolVersionId: string;
  readonly type: "RESPONDED" | "OMITTED" | "EXPIRED";
  readonly recordedById: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly responseId: string | null;
  readonly nonResponseEventId: string | null;
}

export interface DigitalParticipationContext {
  readonly records: readonly DigitalParticipationRecord[];
  readonly policies: readonly PolicyVersion[];
  readonly revocations: readonly RevocationEvent[];
}

export interface CheckInTransaction {
  isActiveUserWithRole(userId: string, role: Role): Promise<boolean>;
  getProtocol(protocolVersionId: string): Promise<CheckInProtocolRecord | null>;
  getLatestProtocolVersion(protocolKey: string): Promise<CheckInProtocolRecord | null>;
  createProtocolVersion(input: {
    readonly protocolKey: string;
    readonly versionNumber: number;
    readonly title: string;
    readonly state: CheckInProtocolState;
    readonly basedOnVersionId: string | null;
    readonly isSyntheticFixture: boolean;
    readonly createdById: string;
    readonly questions: readonly QuestionDefinitionInput[];
    readonly schedule: ScheduleConfigurationInput;
  }): Promise<CheckInProtocolRecord>;
  getEpisode(episodeId: string): Promise<CheckInEpisodeRecord | null>;
  getDigitalParticipationContext(subjectUserId: string): Promise<DigitalParticipationContext>;
  findAssignmentBatchByIdempotency(
    createdById: string,
    idempotencyKey: string,
  ): Promise<CheckInAssignmentBatchRecord | null>;
  claimAssignmentBatch(input: {
    readonly episodeId: string;
    readonly protocolVersionId: string;
    readonly createdById: string;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly createdAt: Date;
  }): Promise<{
    readonly batch: CheckInAssignmentBatchRecord;
    readonly created: boolean;
  }>;
  createAssignments(input: {
    readonly batchId: string;
    readonly episodeId: string;
    readonly protocolVersionId: string;
    readonly createdById: string;
    readonly slots: readonly ScheduledCheckInSlot[];
  }): Promise<readonly { readonly id: string }[]>;
  getAssignment(assignmentId: string): Promise<CheckInAssignmentRecord | null>;
  findOutcomeByIdempotency(
    recordedById: string,
    idempotencyKey: string,
  ): Promise<CheckInOutcomeRecord | null>;
  claimOutcome(input: {
    readonly assignmentId: string;
    readonly protocolVersionId: string;
    readonly type: "RESPONDED" | "OMITTED" | "EXPIRED";
    readonly recordedById: string;
    readonly idempotencyKey: string;
    readonly requestFingerprint: string;
    readonly recordedAt: Date;
  }): Promise<{ readonly outcome: CheckInOutcomeRecord; readonly created: boolean }>;
  createResponse(input: {
    readonly outcomeId: string;
    readonly assignmentId: string;
    readonly protocolVersionId: string;
    readonly submittedById: string;
    readonly submittedAt: Date;
    readonly answers: readonly CheckInAnswerInput[];
  }): Promise<{ readonly id: string }>;
  createNonResponse(input: {
    readonly outcomeId: string;
    readonly assignmentId: string;
    readonly protocolVersionId: string;
    readonly outcomeType: "OMITTED" | "EXPIRED";
    readonly recordedById: string;
    readonly reason: "WINDOW_EXPIRED" | "PATIENT_OMITTED";
    readonly recordedAt: Date;
  }): Promise<{ readonly id: string }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
}

export interface CheckInUnitOfWork {
  run<T>(operation: (transaction: CheckInTransaction) => Promise<T>): Promise<T>;
}
