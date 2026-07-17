ALTER TYPE "AuditAction" ADD VALUE 'SAFETY_PLAN_VERSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SAFETY_PLAN_VERSION_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'SAFETY_PLAN_VERSION_INVALIDATED';

CREATE TYPE "SafetyPlanVersionState" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'INVALIDATED');
CREATE TYPE "SafetyPlanStep" AS ENUM (
  'WARNING_SIGNS',
  'INTERNAL_COPING',
  'DISTRACTION_CONTACTS',
  'SUPPORT_CONTACTS',
  'PROFESSIONAL_RESOURCES',
  'MEANS_REDUCTION'
);
CREATE TYPE "SafetyPlanProvenance" AS ENUM ('PATIENT', 'NURSE', 'CLINICIAN');
CREATE TYPE "SafetyPlanAudience" AS ENUM ('PATIENT', 'CAREGIVER');

ALTER TABLE "patients" ADD COLUMN "portal_user_id" TEXT;
CREATE UNIQUE INDEX "patients_portal_user_id_key" ON "patients"("portal_user_id");
ALTER TABLE "patients" ADD CONSTRAINT "patients_portal_user_id_fkey"
  FOREIGN KEY ("portal_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "safety_plans" (
  "id" TEXT NOT NULL,
  "discharge_episode_id" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "current_version" INTEGER NOT NULL DEFAULT 0,
  "active_version_number" INTEGER,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "safety_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_plans_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "safety_plans_current_version_check" CHECK ("current_version" >= 0),
  CONSTRAINT "safety_plans_active_version_check"
    CHECK ("active_version_number" IS NULL OR ("active_version_number" > 0 AND "active_version_number" <= "current_version"))
);

CREATE TABLE "safety_plan_versions" (
  "id" TEXT NOT NULL,
  "safety_plan_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "based_on_version" INTEGER,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "safety_plan_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_plan_versions_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "safety_plan_versions_base_check" CHECK ("based_on_version" IS NULL OR "based_on_version" < "version_number")
);

CREATE TABLE "safety_plan_sections" (
  "id" TEXT NOT NULL,
  "safety_plan_version_id" TEXT NOT NULL,
  "step" "SafetyPlanStep" NOT NULL,
  "content" TEXT NOT NULL,
  "provenance" "SafetyPlanProvenance" NOT NULL,
  CONSTRAINT "safety_plan_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_plan_sections_content_check" CHECK (char_length("content") BETWEEN 1 AND 4000)
);

CREATE TABLE "safety_plan_section_permissions" (
  "id" TEXT NOT NULL,
  "safety_plan_section_id" TEXT NOT NULL,
  "audience" "SafetyPlanAudience" NOT NULL,
  "can_view" BOOLEAN NOT NULL,
  CONSTRAINT "safety_plan_section_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "safety_plan_version_state_changes" (
  "id" TEXT NOT NULL,
  "safety_plan_version_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "resulting_state" "SafetyPlanVersionState" NOT NULL,
  "reason" VARCHAR(500),
  "actor_user_id" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "safety_plan_version_state_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_plan_state_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "safety_plan_invalidation_reason_check"
    CHECK (("resulting_state" = 'INVALIDATED' AND char_length(btrim("reason")) >= 3)
      OR ("resulting_state" <> 'INVALIDATED' AND "reason" IS NULL))
);

CREATE UNIQUE INDEX "safety_plans_discharge_episode_id_key" ON "safety_plans"("discharge_episode_id");
CREATE UNIQUE INDEX "safety_plan_versions_safety_plan_id_version_number_key" ON "safety_plan_versions"("safety_plan_id", "version_number");
CREATE INDEX "safety_plan_versions_safety_plan_id_created_at_idx" ON "safety_plan_versions"("safety_plan_id", "created_at");
CREATE UNIQUE INDEX "safety_plan_sections_safety_plan_version_id_step_key" ON "safety_plan_sections"("safety_plan_version_id", "step");
CREATE UNIQUE INDEX "safety_plan_section_permissions_section_audience_key" ON "safety_plan_section_permissions"("safety_plan_section_id", "audience");
CREATE UNIQUE INDEX "safety_plan_state_changes_version_sequence_key" ON "safety_plan_version_state_changes"("safety_plan_version_id", "sequence");
CREATE INDEX "safety_plan_state_changes_version_occurred_at_idx" ON "safety_plan_version_state_changes"("safety_plan_version_id", "occurred_at");

ALTER TABLE "safety_plans" ADD CONSTRAINT "safety_plans_discharge_episode_id_fkey"
  FOREIGN KEY ("discharge_episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_plans" ADD CONSTRAINT "safety_plans_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_plan_versions" ADD CONSTRAINT "safety_plan_versions_safety_plan_id_fkey"
  FOREIGN KEY ("safety_plan_id") REFERENCES "safety_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_plan_versions" ADD CONSTRAINT "safety_plan_versions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_plan_sections" ADD CONSTRAINT "safety_plan_sections_version_id_fkey"
  FOREIGN KEY ("safety_plan_version_id") REFERENCES "safety_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_plan_section_permissions" ADD CONSTRAINT "safety_plan_section_permissions_section_id_fkey"
  FOREIGN KEY ("safety_plan_section_id") REFERENCES "safety_plan_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_plan_version_state_changes" ADD CONSTRAINT "safety_plan_state_changes_version_id_fkey"
  FOREIGN KEY ("safety_plan_version_id") REFERENCES "safety_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_plan_version_state_changes" ADD CONSTRAINT "safety_plan_state_changes_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER safety_plan_versions_no_update
  BEFORE UPDATE OR DELETE ON "safety_plan_versions"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER safety_plan_sections_no_update
  BEFORE UPDATE OR DELETE ON "safety_plan_sections"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER safety_plan_section_permissions_no_update
  BEFORE UPDATE OR DELETE ON "safety_plan_section_permissions"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER safety_plan_state_changes_no_update
  BEFORE UPDATE OR DELETE ON "safety_plan_version_state_changes"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER safety_plans_no_delete
  BEFORE DELETE ON "safety_plans"
  FOR EACH ROW EXECUTE FUNCTION deny_discharge_episode_delete();
