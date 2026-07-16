ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_RECORD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_RECORD_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'POLICY_VERSION_CREATED';

CREATE TYPE "LegalRecordState" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED');
CREATE TYPE "PolicyState" AS ENUM ('PENDING', 'APPROVED', 'WITHDRAWN', 'SUPERSEDED');
CREATE TYPE "RecordOrigin" AS ENUM ('DEMO_UI', 'PROFESSIONAL_ENTRY', 'INSTITUTIONAL_CONFIGURATION');
CREATE TYPE "EvidenceType" AS ENUM ('RECORDED_INTERACTION', 'INSTITUTIONAL_DECISION_REFERENCE', 'SYSTEM_IMPORT_REFERENCE');
CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH');
CREATE TYPE "LegalRecordType" AS ENUM ('PARTICIPATION', 'DIGITAL_PARTICIPATION', 'COMMUNICATION_PERMISSION', 'CAREGIVER_AUTHORIZATION', 'PROCESSING_BASIS');
CREATE TYPE "RevocationState" AS ENUM ('REVOKED');

CREATE TABLE "policy_versions" (
  "id" TEXT NOT NULL,
  "policy_key" VARCHAR(64) NOT NULL,
  "version" VARCHAR(32) NOT NULL,
  "record_type" "LegalRecordType" NOT NULL,
  "state" "PolicyState" NOT NULL,
  "scope" VARCHAR(128) NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "origin" "RecordOrigin" NOT NULL,
  "evidence_type" "EvidenceType" NOT NULL,
  "evidence_ref" VARCHAR(128) NOT NULL,
  CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "participation_records" (
  "id" TEXT NOT NULL, "subject_user_id" TEXT NOT NULL, "state" "LegalRecordState" NOT NULL,
  "scope" VARCHAR(128) NOT NULL, "policy_version_id" TEXT NOT NULL, "actor_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expires_at" TIMESTAMP(3),
  "origin" "RecordOrigin" NOT NULL, "evidence_type" "EvidenceType" NOT NULL,
  "evidence_ref" VARCHAR(128) NOT NULL, CONSTRAINT "participation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_participation_records" (
  "id" TEXT NOT NULL, "subject_user_id" TEXT NOT NULL, "state" "LegalRecordState" NOT NULL,
  "scope" VARCHAR(128) NOT NULL, "policy_version_id" TEXT NOT NULL, "actor_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expires_at" TIMESTAMP(3),
  "origin" "RecordOrigin" NOT NULL, "evidence_type" "EvidenceType" NOT NULL,
  "evidence_ref" VARCHAR(128) NOT NULL, CONSTRAINT "digital_participation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_permissions" (
  "id" TEXT NOT NULL, "subject_user_id" TEXT NOT NULL, "state" "LegalRecordState" NOT NULL,
  "scope" VARCHAR(128) NOT NULL, "channel" "CommunicationChannel" NOT NULL, "purpose" VARCHAR(64) NOT NULL,
  "policy_version_id" TEXT NOT NULL, "actor_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expires_at" TIMESTAMP(3),
  "origin" "RecordOrigin" NOT NULL, "evidence_type" "EvidenceType" NOT NULL,
  "evidence_ref" VARCHAR(128) NOT NULL, CONSTRAINT "communication_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "caregiver_authorizations" (
  "id" TEXT NOT NULL, "subject_user_id" TEXT NOT NULL, "caregiver_user_id" TEXT NOT NULL,
  "state" "LegalRecordState" NOT NULL, "scope" VARCHAR(128) NOT NULL, "policy_version_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL, "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3), "origin" "RecordOrigin" NOT NULL, "evidence_type" "EvidenceType" NOT NULL,
  "evidence_ref" VARCHAR(128) NOT NULL, CONSTRAINT "caregiver_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "processing_basis_records" (
  "id" TEXT NOT NULL, "subject_user_id" TEXT NOT NULL, "state" "LegalRecordState" NOT NULL,
  "scope" VARCHAR(128) NOT NULL, "basis_code" VARCHAR(64) NOT NULL, "policy_version_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL, "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3), "origin" "RecordOrigin" NOT NULL, "evidence_type" "EvidenceType" NOT NULL,
  "evidence_ref" VARCHAR(128) NOT NULL, CONSTRAINT "processing_basis_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revocation_events" (
  "id" TEXT NOT NULL, "state" "RevocationState" NOT NULL DEFAULT 'REVOKED', "target_type" "LegalRecordType" NOT NULL, "target_record_id" VARCHAR(128) NOT NULL,
  "subject_user_id" TEXT NOT NULL, "scope" VARCHAR(128) NOT NULL, "policy_version_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL, "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "origin" "RecordOrigin" NOT NULL, "evidence_type" "EvidenceType" NOT NULL,
  "evidence_ref" VARCHAR(128) NOT NULL, CONSTRAINT "revocation_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "policy_versions_policy_key_version_key" ON "policy_versions"("policy_key", "version");
CREATE INDEX "policy_versions_policy_key_recorded_at_idx" ON "policy_versions"("policy_key", "recorded_at");
CREATE INDEX "participation_records_subject_user_id_scope_recorded_at_idx" ON "participation_records"("subject_user_id", "scope", "recorded_at");
CREATE INDEX "digital_participation_records_subject_user_id_scope_recorded_at_idx" ON "digital_participation_records"("subject_user_id", "scope", "recorded_at");
CREATE INDEX "communication_permissions_subject_channel_purpose_recorded_idx" ON "communication_permissions"("subject_user_id", "channel", "purpose", "recorded_at");
CREATE INDEX "caregiver_authorizations_subject_caregiver_scope_recorded_idx" ON "caregiver_authorizations"("subject_user_id", "caregiver_user_id", "scope", "recorded_at");
CREATE INDEX "processing_basis_records_subject_user_id_scope_recorded_at_idx" ON "processing_basis_records"("subject_user_id", "scope", "recorded_at");
CREATE UNIQUE INDEX "revocation_events_target_type_target_record_id_key" ON "revocation_events"("target_type", "target_record_id");
CREATE INDEX "revocation_events_subject_user_id_recorded_at_idx" ON "revocation_events"("subject_user_id", "recorded_at");

ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "participation_records" ADD CONSTRAINT "participation_records_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "participation_records" ADD CONSTRAINT "participation_records_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "participation_records" ADD CONSTRAINT "participation_records_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_participation_records" ADD CONSTRAINT "digital_participation_records_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_participation_records" ADD CONSTRAINT "digital_participation_records_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_participation_records" ADD CONSTRAINT "digital_participation_records_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_permissions" ADD CONSTRAINT "communication_permissions_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_permissions" ADD CONSTRAINT "communication_permissions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_permissions" ADD CONSTRAINT "communication_permissions_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_authorizations" ADD CONSTRAINT "caregiver_authorizations_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_authorizations" ADD CONSTRAINT "caregiver_authorizations_caregiver_user_id_fkey" FOREIGN KEY ("caregiver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_authorizations" ADD CONSTRAINT "caregiver_authorizations_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_authorizations" ADD CONSTRAINT "caregiver_authorizations_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "processing_basis_records" ADD CONSTRAINT "processing_basis_records_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "processing_basis_records" ADD CONSTRAINT "processing_basis_records_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "processing_basis_records" ADD CONSTRAINT "processing_basis_records_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revocation_events" ADD CONSTRAINT "revocation_events_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revocation_events" ADD CONSTRAINT "revocation_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revocation_events" ADD CONSTRAINT "revocation_events_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION deny_legal_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'legal history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER policy_versions_no_update BEFORE UPDATE OR DELETE ON "policy_versions" FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER participation_records_no_update BEFORE UPDATE OR DELETE ON "participation_records" FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER digital_participation_records_no_update BEFORE UPDATE OR DELETE ON "digital_participation_records" FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER communication_permissions_no_update BEFORE UPDATE OR DELETE ON "communication_permissions" FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER caregiver_authorizations_no_update BEFORE UPDATE OR DELETE ON "caregiver_authorizations" FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER processing_basis_records_no_update BEFORE UPDATE OR DELETE ON "processing_basis_records" FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER revocation_events_no_update BEFORE UPDATE OR DELETE ON "revocation_events" FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
