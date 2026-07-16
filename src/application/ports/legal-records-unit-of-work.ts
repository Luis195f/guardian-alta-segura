import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type {
  CommunicationChannel,
  EvidenceType,
  LegalRecordState,
  LegalRecordType,
  PolicyState,
  RecordOrigin,
} from "@/domain/legal/legal-records";

export class RevocationConflictError extends Error {
  constructor() {
    super("Revocation already exists");
    this.name = "RevocationConflictError";
  }
}

export interface LegalRecordCreateInput {
  readonly recordType: LegalRecordType;
  readonly subjectUserId: string;
  readonly state: LegalRecordState;
  readonly scope: string;
  readonly policyVersionId: string;
  readonly actorUserId: string;
  readonly recordedAt: Date;
  readonly expiresAt: Date | null;
  readonly origin: RecordOrigin;
  readonly evidenceType: EvidenceType;
  readonly evidenceRef: string;
  readonly channel: CommunicationChannel | null;
  readonly purpose: string | null;
  readonly caregiverUserId: string | null;
  readonly basisCode: string | null;
}

export interface LegalRecordTarget {
  readonly id: string;
  readonly recordType: LegalRecordType;
  readonly subjectUserId: string;
  readonly scope: string;
  readonly policyVersionId: string;
}

export interface LegalRecordsTransaction {
  resolveSyntheticUser(alias: string): Promise<{
    readonly id: string;
    readonly isActive: boolean;
    readonly isSynthetic: boolean;
  } | null>;
  isActiveUserWithRole(
    userId: string,
    role: "patient" | "clinician" | "caregiver",
  ): Promise<boolean>;
  getPolicyVersion(id: string): Promise<{
    readonly id: string;
    readonly recordType: LegalRecordType;
    readonly state: PolicyState;
    readonly scope: string;
  } | null>;
  createLegalRecord(input: LegalRecordCreateInput): Promise<{ readonly id: string }>;
  getLegalRecord(type: LegalRecordType, id: string): Promise<LegalRecordTarget | null>;
  hasRevocation(type: LegalRecordType, id: string): Promise<boolean>;
  createRevocation(input: {
    readonly state: "REVOKED";
    readonly targetType: LegalRecordType;
    readonly targetRecordId: string;
    readonly subjectUserId: string;
    readonly scope: string;
    readonly policyVersionId: string;
    readonly actorUserId: string;
    readonly recordedAt: Date;
    readonly origin: RecordOrigin;
    readonly evidenceType: EvidenceType;
    readonly evidenceRef: string;
  }): Promise<{ readonly id: string }>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
}

export interface LegalRecordsUnitOfWork {
  run<T>(operation: (transaction: LegalRecordsTransaction) => Promise<T>): Promise<T>;
}
