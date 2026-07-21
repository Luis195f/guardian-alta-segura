ALTER TYPE "AuditAction" ADD VALUE 'HOME_SAFETY_VERSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SBAR_PREVIEW_GENERATED';

CREATE TYPE "HomeSafetyItemState" AS ENUM (
  'NOT_REVIEWED',
  'INFORMATION_RECORDED',
  'FOLLOW_UP_PENDING',
  'NOT_APPLICABLE'
);

CREATE TYPE "HomeSafetyProvenance" AS ENUM ('PATIENT', 'CAREGIVER', 'NURSE', 'CLINICIAN');

CREATE TABLE "home_safety_review_versions" (
  "id" TEXT NOT NULL,
  "discharge_episode_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "template_key" VARCHAR(64) NOT NULL,
  "template_version" VARCHAR(32) NOT NULL,
  "informational_purpose_acknowledged" BOOLEAN NOT NULL,
  "human_reviewed" BOOLEAN NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "home_safety_review_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "home_safety_version_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "home_safety_acknowledgement_check" CHECK ("informational_purpose_acknowledged" = TRUE)
);

CREATE TABLE "home_safety_items" (
  "id" TEXT NOT NULL,
  "review_version_id" TEXT NOT NULL,
  "item_key" VARCHAR(64) NOT NULL,
  "state" "HomeSafetyItemState" NOT NULL,
  "provenance" "HomeSafetyProvenance" NOT NULL,
  CONSTRAINT "home_safety_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "home_safety_versions_episode_version_key"
  ON "home_safety_review_versions"("discharge_episode_id", "version_number");
CREATE INDEX "home_safety_versions_episode_time_idx"
  ON "home_safety_review_versions"("discharge_episode_id", "recorded_at");
CREATE UNIQUE INDEX "home_safety_items_version_item_key"
  ON "home_safety_items"("review_version_id", "item_key");

ALTER TABLE "home_safety_review_versions" ADD CONSTRAINT "home_safety_versions_episode_fkey"
  FOREIGN KEY ("discharge_episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "home_safety_review_versions" ADD CONSTRAINT "home_safety_versions_actor_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "home_safety_items" ADD CONSTRAINT "home_safety_items_version_fkey"
  FOREIGN KEY ("review_version_id") REFERENCES "home_safety_review_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER home_safety_review_versions_no_update
  BEFORE UPDATE OR DELETE ON "home_safety_review_versions"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER home_safety_items_no_update
  BEFORE UPDATE OR DELETE ON "home_safety_items"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
