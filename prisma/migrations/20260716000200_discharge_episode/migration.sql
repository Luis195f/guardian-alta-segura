ALTER TYPE "AuditAction" ADD VALUE 'EPISODE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'EPISODE_TRANSITIONED';

CREATE TYPE "IdentityVerificationState" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "DischargeEpisodeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');

CREATE TABLE "identity_verification_policy_versions" (
  "id" TEXT NOT NULL,
  "policy_key" VARCHAR(64) NOT NULL,
  "version" VARCHAR(32) NOT NULL,
  "state" "PolicyState" NOT NULL,
  "accepted_state" "IdentityVerificationState" NOT NULL,
  "process_code" VARCHAR(64) NOT NULL,
  "process_version" VARCHAR(32) NOT NULL,
  "is_synthetic_demo" BOOLEAN NOT NULL DEFAULT false,
  "actor_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_verification_policy_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patients" (
  "id" TEXT NOT NULL,
  "external_pseudonymous_id" VARCHAR(64) NOT NULL,
  "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
  "identity_verification_state" "IdentityVerificationState" NOT NULL DEFAULT 'PENDING',
  "identity_verification_policy_version_id" TEXT,
  "identity_verified_at" TIMESTAMP(3),
  "identity_verified_by_id" TEXT,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discharge_episodes" (
  "id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "discharge_date" DATE NOT NULL,
  "program_length_days" INTEGER NOT NULL,
  "responsible_nurse_id" TEXT NOT NULL,
  "responsible_clinician_id" TEXT NOT NULL,
  "status" "DischargeEpisodeStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" TEXT NOT NULL,
  "closed_reason" VARCHAR(500),
  "closed_by_id" TEXT,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "discharge_episodes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "discharge_episodes_program_length_check" CHECK ("program_length_days" IN (30, 60, 90)),
  CONSTRAINT "discharge_episodes_version_check" CHECK ("version" > 0),
  CONSTRAINT "discharge_episodes_closed_fields_check" CHECK (
    ("status" = 'CLOSED' AND "closed_reason" IS NOT NULL AND "closed_by_id" IS NOT NULL AND "closed_at" IS NOT NULL)
    OR
    ("status" <> 'CLOSED' AND "closed_reason" IS NULL AND "closed_by_id" IS NULL AND "closed_at" IS NULL)
  )
);

CREATE TABLE "episode_transitions" (
  "id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "from_status" "DischargeEpisodeStatus",
  "to_status" "DischargeEpisodeStatus" NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "actor_role" "Role" NOT NULL,
  "reason" VARCHAR(500),
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "resulting_version" INTEGER NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "episode_transitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "identity_verification_policy_versions_policy_key_version_key" ON "identity_verification_policy_versions"("policy_key", "version");
CREATE INDEX "identity_verification_policy_versions_policy_key_recorded_at_idx" ON "identity_verification_policy_versions"("policy_key", "recorded_at");
CREATE UNIQUE INDEX "patients_external_pseudonymous_id_key" ON "patients"("external_pseudonymous_id");
CREATE INDEX "patients_identity_verification_state_idx" ON "patients"("identity_verification_state");
CREATE INDEX "discharge_episodes_responsible_nurse_id_status_idx" ON "discharge_episodes"("responsible_nurse_id", "status");
CREATE INDEX "discharge_episodes_responsible_clinician_id_status_idx" ON "discharge_episodes"("responsible_clinician_id", "status");
CREATE INDEX "discharge_episodes_patient_id_created_at_idx" ON "discharge_episodes"("patient_id", "created_at");
CREATE UNIQUE INDEX "episode_transitions_actor_user_id_idempotency_key_key" ON "episode_transitions"("actor_user_id", "idempotency_key");
CREATE UNIQUE INDEX "episode_transitions_episode_id_resulting_version_key" ON "episode_transitions"("episode_id", "resulting_version");
CREATE INDEX "episode_transitions_episode_id_occurred_at_idx" ON "episode_transitions"("episode_id", "occurred_at");

ALTER TABLE "identity_verification_policy_versions" ADD CONSTRAINT "identity_verification_policy_versions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_identity_verification_policy_version_id_fkey" FOREIGN KEY ("identity_verification_policy_version_id") REFERENCES "identity_verification_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_identity_verified_by_id_fkey" FOREIGN KEY ("identity_verified_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discharge_episodes" ADD CONSTRAINT "discharge_episodes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discharge_episodes" ADD CONSTRAINT "discharge_episodes_responsible_nurse_id_fkey" FOREIGN KEY ("responsible_nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discharge_episodes" ADD CONSTRAINT "discharge_episodes_responsible_clinician_id_fkey" FOREIGN KEY ("responsible_clinician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discharge_episodes" ADD CONSTRAINT "discharge_episodes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discharge_episodes" ADD CONSTRAINT "discharge_episodes_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_transitions" ADD CONSTRAINT "episode_transitions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_transitions" ADD CONSTRAINT "episode_transitions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION deny_episode_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'episode history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION deny_discharge_episode_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'discharge episodes and patients use state and retention policies, not hard delete';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER identity_verification_policy_versions_no_update BEFORE UPDATE OR DELETE ON "identity_verification_policy_versions" FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER episode_transitions_no_update BEFORE UPDATE OR DELETE ON "episode_transitions" FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER discharge_episodes_no_delete BEFORE DELETE ON "discharge_episodes" FOR EACH ROW EXECUTE FUNCTION deny_discharge_episode_delete();
CREATE TRIGGER patients_no_delete BEFORE DELETE ON "patients" FOR EACH ROW EXECUTE FUNCTION deny_discharge_episode_delete();
