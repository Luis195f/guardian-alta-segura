ALTER TYPE "AuditAction" ADD VALUE 'RULE_VERSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_VERSION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_VERSION_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_EVALUATED';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_ACTION_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_DISMISSED';

CREATE TYPE "RuleVersionState" AS ENUM ('draft', 'approved', 'active', 'retired');
CREATE TYPE "RuleEvaluationOutcome" AS ENUM ('matched', 'not-matched', 'abstained');
CREATE TYPE "AlertState" AS ENUM (
  'open',
  'reviewed',
  'actioned',
  'resolved',
  'dismissed-with-reason'
);
CREATE TYPE "AdministrativeSeverity" AS ENUM ('standard', 'priority');
CREATE TYPE "RuleReviewOwner" AS ENUM ('nurse', 'clinician');

CREATE TABLE "rule_definitions" (
  "id" TEXT NOT NULL,
  "rule_key" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "is_synthetic_fixture" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rule_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rule_definitions_rule_key_check"
    CHECK ("rule_key" ~ '^[a-z][a-z0-9-]{2,63}$'),
  CONSTRAINT "rule_definitions_name_check"
    CHECK (char_length(btrim("name")) BETWEEN 5 AND 160)
);

CREATE TABLE "rule_versions" (
  "id" TEXT NOT NULL,
  "rule_definition_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "state" "RuleVersionState" NOT NULL DEFAULT 'draft',
  "based_on_version_id" TEXT,
  "schema_version" INTEGER NOT NULL,
  "allowed_inputs" JSONB NOT NULL,
  "temporal_window" JSONB NOT NULL,
  "condition" JSONB NOT NULL,
  "administrative_severity" "AdministrativeSeverity" NOT NULL,
  "explanation" VARCHAR(500) NOT NULL,
  "review_owner" "RuleReviewOwner" NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rule_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rule_versions_version_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "rule_versions_schema_version_check" CHECK ("schema_version" = 1),
  CONSTRAINT "rule_versions_explanation_check"
    CHECK (char_length(btrim("explanation")) BETWEEN 10 AND 500)
);

CREATE TABLE "rule_approvals" (
  "id" TEXT NOT NULL,
  "rule_version_id" TEXT NOT NULL,
  "approved_by_id" TEXT NOT NULL,
  "approval_reference" VARCHAR(128) NOT NULL,
  "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rule_approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rule_approvals_reference_check"
    CHECK ("approval_reference" ~ '^[A-Za-z0-9._:/-]{3,128}$')
);

CREATE TABLE "rule_evaluations" (
  "id" TEXT NOT NULL,
  "rule_definition_id" TEXT NOT NULL,
  "rule_version_id" TEXT NOT NULL,
  "rule_version_number" INTEGER NOT NULL,
  "episode_id" TEXT NOT NULL,
  "evaluated_by_id" TEXT NOT NULL,
  "idempotency_key" VARCHAR(112) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "evaluated_at" TIMESTAMP(3) NOT NULL,
  "input_snapshot" JSONB NOT NULL,
  "input_hash" CHAR(64) NOT NULL,
  "outcome" "RuleEvaluationOutcome" NOT NULL,
  "missing_inputs" JSONB NOT NULL,
  CONSTRAINT "rule_evaluations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rule_evaluations_idempotency_key_check"
    CHECK ("idempotency_key" ~ '^[A-Za-z0-9._:-]{8,112}$'),
  CONSTRAINT "rule_evaluations_request_fingerprint_check"
    CHECK ("request_fingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "rule_evaluations_input_hash_check" CHECK ("input_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "rule_evaluations_input_snapshot_array_check"
    CHECK (jsonb_typeof("input_snapshot") = 'array'),
  CONSTRAINT "rule_evaluations_missing_inputs_array_check"
    CHECK (jsonb_typeof("missing_inputs") = 'array')
);

CREATE TABLE "alerts" (
  "id" TEXT NOT NULL,
  "rule_definition_id" TEXT NOT NULL,
  "rule_version_id" TEXT NOT NULL,
  "rule_version_number" INTEGER NOT NULL,
  "evaluation_id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "input_references" JSONB NOT NULL,
  "explanation" TEXT NOT NULL,
  "administrative_severity" "AdministrativeSeverity" NOT NULL,
  "review_owner" "RuleReviewOwner" NOT NULL,
  "triggered_at" TIMESTAMP(3) NOT NULL,
  "current_state" "AlertState" NOT NULL DEFAULT 'open',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alerts_input_references_array_check"
    CHECK (jsonb_typeof("input_references") = 'array'),
  CONSTRAINT "alerts_explanation_check"
    CHECK (char_length(btrim("explanation")) >= 10)
);

CREATE TABLE "alert_reviews" (
  "id" TEXT NOT NULL,
  "alert_id" TEXT NOT NULL,
  "from_state" "AlertState" NOT NULL,
  "to_state" "AlertState" NOT NULL,
  "reason" VARCHAR(500),
  "reviewed_by_id" TEXT NOT NULL,
  "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alert_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alert_reviews_transition_check" CHECK (
    ("from_state" = 'open' AND "to_state" IN ('reviewed', 'dismissed-with-reason'))
    OR ("from_state" = 'reviewed' AND "to_state" IN ('actioned', 'resolved', 'dismissed-with-reason'))
    OR ("from_state" = 'actioned' AND "to_state" IN ('resolved', 'dismissed-with-reason'))
  ),
  CONSTRAINT "alert_reviews_dismiss_reason_check" CHECK (
    "to_state" <> 'dismissed-with-reason'
    OR char_length(btrim(COALESCE("reason", ''))) >= 3
  )
);

CREATE UNIQUE INDEX "rule_definitions_rule_key_key"
  ON "rule_definitions"("rule_key");
CREATE UNIQUE INDEX "rule_versions_definition_version_key"
  ON "rule_versions"("rule_definition_id", "version_number");
CREATE UNIQUE INDEX "rule_versions_id_definition_version_key"
  ON "rule_versions"("id", "rule_definition_id", "version_number");
CREATE INDEX "rule_versions_definition_state_version_idx"
  ON "rule_versions"("rule_definition_id", "state", "version_number");
CREATE UNIQUE INDEX "rule_versions_one_active_per_definition"
  ON "rule_versions"("rule_definition_id")
  WHERE "state" = 'active';
CREATE UNIQUE INDEX "rule_approvals_rule_version_key"
  ON "rule_approvals"("rule_version_id");
CREATE INDEX "rule_approvals_actor_time_idx"
  ON "rule_approvals"("approved_by_id", "approved_at");
CREATE UNIQUE INDEX "rule_evaluations_actor_idempotency_key"
  ON "rule_evaluations"("evaluated_by_id", "idempotency_key");
CREATE INDEX "rule_evaluations_reproducibility_idx"
  ON "rule_evaluations"("rule_version_id", "episode_id", "input_hash");
CREATE UNIQUE INDEX "rule_evaluations_id_version_episode_key"
  ON "rule_evaluations"("id", "rule_version_id", "episode_id");
CREATE INDEX "rule_evaluations_episode_time_idx"
  ON "rule_evaluations"("episode_id", "evaluated_at");
CREATE UNIQUE INDEX "alerts_evaluation_key" ON "alerts"("evaluation_id");
CREATE UNIQUE INDEX "alerts_evaluation_version_episode_key"
  ON "alerts"("evaluation_id", "rule_version_id", "episode_id");
CREATE INDEX "alerts_episode_state_time_idx"
  ON "alerts"("episode_id", "current_state", "triggered_at");
CREATE INDEX "alerts_owner_state_time_idx"
  ON "alerts"("review_owner", "current_state", "triggered_at");
CREATE INDEX "alert_reviews_alert_time_idx"
  ON "alert_reviews"("alert_id", "reviewed_at");

ALTER TABLE "rule_definitions"
  ADD CONSTRAINT "rule_definitions_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_versions"
  ADD CONSTRAINT "rule_versions_definition_fkey"
  FOREIGN KEY ("rule_definition_id") REFERENCES "rule_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_versions"
  ADD CONSTRAINT "rule_versions_base_fkey"
  FOREIGN KEY ("based_on_version_id") REFERENCES "rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_versions"
  ADD CONSTRAINT "rule_versions_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_approvals"
  ADD CONSTRAINT "rule_approvals_version_fkey"
  FOREIGN KEY ("rule_version_id") REFERENCES "rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_approvals"
  ADD CONSTRAINT "rule_approvals_actor_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_evaluations"
  ADD CONSTRAINT "rule_evaluations_definition_fkey"
  FOREIGN KEY ("rule_definition_id") REFERENCES "rule_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_evaluations"
  ADD CONSTRAINT "rule_evaluations_version_fkey"
  FOREIGN KEY ("rule_version_id", "rule_definition_id", "rule_version_number")
  REFERENCES "rule_versions"("id", "rule_definition_id", "version_number")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_evaluations"
  ADD CONSTRAINT "rule_evaluations_episode_fkey"
  FOREIGN KEY ("episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rule_evaluations"
  ADD CONSTRAINT "rule_evaluations_actor_fkey"
  FOREIGN KEY ("evaluated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts"
  ADD CONSTRAINT "alerts_definition_fkey"
  FOREIGN KEY ("rule_definition_id") REFERENCES "rule_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts"
  ADD CONSTRAINT "alerts_version_fkey"
  FOREIGN KEY ("rule_version_id", "rule_definition_id", "rule_version_number")
  REFERENCES "rule_versions"("id", "rule_definition_id", "version_number")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts"
  ADD CONSTRAINT "alerts_evaluation_version_episode_fkey"
  FOREIGN KEY ("evaluation_id", "rule_version_id", "episode_id")
  REFERENCES "rule_evaluations"("id", "rule_version_id", "episode_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts"
  ADD CONSTRAINT "alerts_episode_fkey"
  FOREIGN KEY ("episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alert_reviews"
  ADD CONSTRAINT "alert_reviews_alert_fkey"
  FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alert_reviews"
  ADD CONSTRAINT "alert_reviews_actor_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION deny_explainable_alert_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'explainable alert history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_rule_version_lineage() RETURNS trigger AS $$
BEGIN
  IF NEW."state" <> 'draft' THEN
    RAISE EXCEPTION 'new rule versions must start in draft';
  END IF;
  IF NEW."version_number" = 1 AND NEW."based_on_version_id" IS NOT NULL THEN
    RAISE EXCEPTION 'first rule version cannot have a base';
  END IF;
  IF NEW."version_number" > 1 AND NOT EXISTS (
    SELECT 1
    FROM "rule_versions"
    WHERE "id" = NEW."based_on_version_id"
      AND "rule_definition_id" = NEW."rule_definition_id"
      AND "version_number" = NEW."version_number" - 1
  ) THEN
    RAISE EXCEPTION 'rule version must derive from the previous version of the same definition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_rule_version_state_transition() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'rule versions cannot be deleted';
  END IF;
  IF ROW(
    OLD."id",
    OLD."rule_definition_id",
    OLD."version_number",
    OLD."based_on_version_id",
    OLD."schema_version",
    OLD."allowed_inputs",
    OLD."temporal_window",
    OLD."condition",
    OLD."administrative_severity",
    OLD."explanation",
    OLD."review_owner",
    OLD."created_by_id",
    OLD."created_at"
  ) IS DISTINCT FROM ROW(
    NEW."id",
    NEW."rule_definition_id",
    NEW."version_number",
    NEW."based_on_version_id",
    NEW."schema_version",
    NEW."allowed_inputs",
    NEW."temporal_window",
    NEW."condition",
    NEW."administrative_severity",
    NEW."explanation",
    NEW."review_owner",
    NEW."created_by_id",
    NEW."created_at"
  ) THEN
    RAISE EXCEPTION 'rule version definitions are immutable';
  END IF;
  IF NOT (
    (OLD."state" = 'draft' AND NEW."state" = 'approved')
    OR (OLD."state" = 'approved' AND NEW."state" = 'active')
    OR (OLD."state" = 'active' AND NEW."state" = 'retired')
  ) THEN
    RAISE EXCEPTION 'invalid rule version state transition';
  END IF;
  IF NEW."state" IN ('approved', 'active')
    AND NOT EXISTS (
      SELECT 1 FROM "rule_approvals" WHERE "rule_version_id" = NEW."id"
    )
  THEN
    RAISE EXCEPTION 'approved or active rule version requires approval history';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_alert_review_insert() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "alerts"
    WHERE "id" = NEW."alert_id"
      AND "current_state" = NEW."from_state"
  ) THEN
    RAISE EXCEPTION 'alert review must start from the current alert state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_alert_review_transition() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'alerts cannot be deleted';
  END IF;
  IF ROW(
    OLD."id",
    OLD."rule_definition_id",
    OLD."rule_version_id",
    OLD."rule_version_number",
    OLD."evaluation_id",
    OLD."episode_id",
    OLD."input_references",
    OLD."explanation",
    OLD."administrative_severity",
    OLD."review_owner",
    OLD."triggered_at"
  ) IS DISTINCT FROM ROW(
    NEW."id",
    NEW."rule_definition_id",
    NEW."rule_version_id",
    NEW."rule_version_number",
    NEW."evaluation_id",
    NEW."episode_id",
    NEW."input_references",
    NEW."explanation",
    NEW."administrative_severity",
    NEW."review_owner",
    NEW."triggered_at"
  ) THEN
    RAISE EXCEPTION 'alert evidence is immutable';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM "alert_reviews"
    WHERE "alert_id" = OLD."id"
      AND "from_state" = OLD."current_state"
      AND "to_state" = NEW."current_state"
  ) THEN
    RAISE EXCEPTION 'alert state changes require append-only human review';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rule_definitions_no_update
  BEFORE UPDATE OR DELETE ON "rule_definitions"
  FOR EACH ROW EXECUTE FUNCTION deny_explainable_alert_history_mutation();
CREATE TRIGGER rule_versions_lineage_on_insert
  BEFORE INSERT ON "rule_versions"
  FOR EACH ROW EXECUTE FUNCTION enforce_rule_version_lineage();
CREATE TRIGGER rule_versions_guarded_update
  BEFORE UPDATE OR DELETE ON "rule_versions"
  FOR EACH ROW EXECUTE FUNCTION enforce_rule_version_state_transition();
CREATE TRIGGER rule_approvals_no_update
  BEFORE UPDATE OR DELETE ON "rule_approvals"
  FOR EACH ROW EXECUTE FUNCTION deny_explainable_alert_history_mutation();
CREATE TRIGGER rule_evaluations_no_update
  BEFORE UPDATE OR DELETE ON "rule_evaluations"
  FOR EACH ROW EXECUTE FUNCTION deny_explainable_alert_history_mutation();
CREATE TRIGGER alerts_guarded_update
  BEFORE UPDATE OR DELETE ON "alerts"
  FOR EACH ROW EXECUTE FUNCTION enforce_alert_review_transition();
CREATE TRIGGER alert_reviews_validate_insert
  BEFORE INSERT ON "alert_reviews"
  FOR EACH ROW EXECUTE FUNCTION enforce_alert_review_insert();
CREATE TRIGGER alert_reviews_no_update
  BEFORE UPDATE OR DELETE ON "alert_reviews"
  FOR EACH ROW EXECUTE FUNCTION deny_explainable_alert_history_mutation();
