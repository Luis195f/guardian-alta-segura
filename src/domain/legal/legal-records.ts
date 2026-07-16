export const LEGAL_RECORD_STATES = ["PENDING", "ACTIVE", "DECLINED"] as const;
export type LegalRecordState = (typeof LEGAL_RECORD_STATES)[number];

export const POLICY_STATES = ["PENDING", "APPROVED", "WITHDRAWN", "SUPERSEDED"] as const;
export type PolicyState = (typeof POLICY_STATES)[number];

export const RECORD_ORIGINS = [
  "DEMO_UI",
  "PROFESSIONAL_ENTRY",
  "INSTITUTIONAL_CONFIGURATION",
] as const;
export type RecordOrigin = (typeof RECORD_ORIGINS)[number];

export const EVIDENCE_TYPES = [
  "RECORDED_INTERACTION",
  "INSTITUTIONAL_DECISION_REFERENCE",
  "SYSTEM_IMPORT_REFERENCE",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const COMMUNICATION_CHANNELS = ["SMS", "EMAIL", "PUSH"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const LEGAL_RECORD_TYPES = [
  "PARTICIPATION",
  "DIGITAL_PARTICIPATION",
  "COMMUNICATION_PERMISSION",
  "CAREGIVER_AUTHORIZATION",
  "PROCESSING_BASIS",
] as const;
export type LegalRecordType = (typeof LEGAL_RECORD_TYPES)[number];

export interface PolicyVersion {
  readonly id: string;
  readonly policyKey: string;
  readonly version: string;
  readonly recordType: LegalRecordType;
  readonly state: PolicyState;
  readonly scope: string;
  readonly actorUserId: string;
  readonly recordedAt: Date;
  readonly origin: RecordOrigin;
  readonly evidenceType: EvidenceType;
  readonly evidenceRef: string;
}

interface LegalRecordBase {
  readonly id: string;
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
}

export interface ParticipationRecord extends LegalRecordBase {
  readonly recordType: "PARTICIPATION";
}

export interface DigitalParticipationRecord extends LegalRecordBase {
  readonly recordType: "DIGITAL_PARTICIPATION";
}

export interface CommunicationPermission extends LegalRecordBase {
  readonly recordType: "COMMUNICATION_PERMISSION";
  readonly channel: CommunicationChannel;
  readonly purpose: string;
}

export interface CaregiverAuthorization extends LegalRecordBase {
  readonly recordType: "CAREGIVER_AUTHORIZATION";
  readonly caregiverUserId: string;
}

export interface ProcessingBasisRecord extends LegalRecordBase {
  readonly recordType: "PROCESSING_BASIS";
  /** Institutionally configured code. The application does not infer the correct legal basis. */
  readonly basisCode: string;
}

export type LegalRecord =
  | ParticipationRecord
  | DigitalParticipationRecord
  | CommunicationPermission
  | CaregiverAuthorization
  | ProcessingBasisRecord;

export interface RevocationEvent {
  readonly id: string;
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
}

export function isLegalRecordState(value: unknown): value is LegalRecordState {
  return LEGAL_RECORD_STATES.some((state) => state === value);
}

export function isCommunicationChannel(value: unknown): value is CommunicationChannel {
  return COMMUNICATION_CHANNELS.some((channel) => channel === value);
}

export function isLegalRecordType(value: unknown): value is LegalRecordType {
  return LEGAL_RECORD_TYPES.some((recordType) => recordType === value);
}
