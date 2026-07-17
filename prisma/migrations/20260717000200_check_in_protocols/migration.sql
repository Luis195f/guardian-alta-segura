ALTER TYPE "AuditAction" ADD VALUE 'CHECK_IN_PROTOCOL_VERSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECK_IN_ASSIGNMENTS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECK_IN_RESPONSE_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECK_IN_NON_RESPONSE_RECORDED';

CREATE TYPE "CheckInProtocolState" AS ENUM ('DRAFT', 'SYNTHETIC_DEMO', 'RETIRED');
CREATE TYPE "CheckInQuestionType" AS ENUM (
  'SCALE',
  'YES_NO',
  'SINGLE_CHOICE',
  'RESTRICTED_SHORT_TEXT'
);
CREATE TYPE "CheckInNonResponseReason" AS ENUM ('WINDOW_EXPIRED', 'PATIENT_OMITTED');
CREATE TYPE "CheckInOutcomeType" AS ENUM ('RESPONDED', 'OMITTED', 'EXPIRED');

CREATE TABLE "check_in_protocol_versions" (
  "id" TEXT NOT NULL,
  "protocol_key" VARCHAR(64) NOT NULL,
  "version_number" INTEGER NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "state" "CheckInProtocolState" NOT NULL,
  "based_on_version_id" TEXT,
  "is_synthetic_fixture" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_in_protocol_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "check_in_protocol_version_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "check_in_protocol_title_check" CHECK (char_length(btrim("title")) > 0)
);

CREATE TABLE "question_definitions" (
  "id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "question_key" VARCHAR(64) NOT NULL,
  "position" INTEGER NOT NULL,
  "type" "CheckInQuestionType" NOT NULL,
  "prompt" VARCHAR(240) NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "scale_minimum" INTEGER,
  "scale_maximum" INTEGER,
  "scale_minimum_label" VARCHAR(80),
  "scale_maximum_label" VARCHAR(80),
  "options" JSONB,
  "maximum_text_length" INTEGER,
  CONSTRAINT "question_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "question_definition_position_check" CHECK ("position" > 0),
  CONSTRAINT "question_definition_prompt_check" CHECK (char_length(btrim("prompt")) > 0),
  CONSTRAINT "question_definition_shape_check" CHECK (
    ("type" = 'SCALE' AND "scale_minimum" IS NOT NULL AND "scale_maximum" IS NOT NULL
      AND "scale_minimum" < "scale_maximum" AND "options" IS NULL AND "maximum_text_length" IS NULL)
    OR ("type" = 'YES_NO' AND "scale_minimum" IS NULL AND "scale_maximum" IS NULL
      AND "options" IS NULL AND "maximum_text_length" IS NULL)
    OR ("type" = 'SINGLE_CHOICE' AND "scale_minimum" IS NULL AND "scale_maximum" IS NULL
      AND jsonb_typeof("options") = 'array' AND jsonb_array_length("options") BETWEEN 2 AND 8
      AND "maximum_text_length" IS NULL)
    OR ("type" = 'RESTRICTED_SHORT_TEXT' AND "scale_minimum" IS NULL AND "scale_maximum" IS NULL
      AND "options" IS NULL AND "maximum_text_length" BETWEEN 1 AND 280)
  )
);

CREATE TABLE "schedule_configurations" (
  "id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "interval_days" INTEGER NOT NULL,
  "first_day_offset" INTEGER NOT NULL,
  "local_time" VARCHAR(5) NOT NULL,
  "time_zone" VARCHAR(64) NOT NULL,
  "response_window_minutes" INTEGER NOT NULL,
  CONSTRAINT "schedule_configurations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schedule_interval_check" CHECK ("interval_days" BETWEEN 1 AND 90),
  CONSTRAINT "schedule_offset_check" CHECK ("first_day_offset" BETWEEN 0 AND 90),
  CONSTRAINT "schedule_local_time_check" CHECK ("local_time" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "schedule_window_check" CHECK ("response_window_minutes" BETWEEN 15 AND 10080)
);

ALTER TABLE "discharge_episodes" ADD COLUMN "check_in_protocol_version_id" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "discharge_episodes") THEN
    INSERT INTO "check_in_protocol_versions" (
      "id",
      "protocol_key",
      "version_number",
      "title",
      "state",
      "is_synthetic_fixture",
      "created_by_id"
    ) VALUES (
      'legacy-check-in-unconfigured-v1',
      'legacy-check-in-unconfigured',
      1,
      'LEGACY — CONFIGURACIÓN DE CHECK-IN PENDIENTE',
      'DRAFT',
      false,
      NULL
    );
    UPDATE "discharge_episodes"
      SET "check_in_protocol_version_id" = 'legacy-check-in-unconfigured-v1'
      WHERE "check_in_protocol_version_id" IS NULL;
  END IF;
END $$;

ALTER TABLE "discharge_episodes"
  ALTER COLUMN "check_in_protocol_version_id" SET NOT NULL;

CREATE TABLE "check_in_assignment_batches" (
  "id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_in_assignment_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "check_in_assignments" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "window_starts_at" TIMESTAMP(3) NOT NULL,
  "window_ends_at" TIMESTAMP(3) NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_in_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "check_in_assignment_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "check_in_assignment_window_check" CHECK (
    "window_starts_at" <= "scheduled_for" AND "scheduled_for" < "window_ends_at"
  )
);

CREATE TABLE "check_in_outcomes" (
  "id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "type" "CheckInOutcomeType" NOT NULL,
  "recorded_by_id" TEXT NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_in_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "check_in_responses" (
  "id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "outcome_type" "CheckInOutcomeType" NOT NULL DEFAULT 'RESPONDED',
  "submitted_by_id" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_in_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "check_in_response_type_check" CHECK ("outcome_type" = 'RESPONDED')
);

CREATE TABLE "check_in_answers" (
  "id" TEXT NOT NULL,
  "check_in_response_id" TEXT NOT NULL,
  "question_definition_id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "scale_value" INTEGER,
  "yes_no_value" BOOLEAN,
  "selected_option" VARCHAR(120),
  "short_text_value" VARCHAR(280),
  CONSTRAINT "check_in_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "check_in_answer_single_value_check" CHECK (
    num_nonnulls("scale_value", "yes_no_value", "selected_option", "short_text_value") = 1
  )
);

CREATE TABLE "non_response_events" (
  "id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "check_in_protocol_version_id" TEXT NOT NULL,
  "outcome_type" "CheckInOutcomeType" NOT NULL,
  "reason" "CheckInNonResponseReason" NOT NULL,
  "recorded_by_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "non_response_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "non_response_event_type_reason_check" CHECK (
    ("outcome_type" = 'OMITTED' AND "reason" = 'PATIENT_OMITTED')
    OR ("outcome_type" = 'EXPIRED' AND "reason" = 'WINDOW_EXPIRED')
  )
);

CREATE UNIQUE INDEX "check_in_protocol_versions_key_version_key"
  ON "check_in_protocol_versions"("protocol_key", "version_number");
CREATE INDEX "check_in_protocol_versions_key_created_idx"
  ON "check_in_protocol_versions"("protocol_key", "created_at");
CREATE UNIQUE INDEX "question_definitions_id_protocol_key"
  ON "question_definitions"("id", "check_in_protocol_version_id");
CREATE UNIQUE INDEX "question_definitions_protocol_question_key"
  ON "question_definitions"("check_in_protocol_version_id", "question_key");
CREATE UNIQUE INDEX "question_definitions_protocol_position_key"
  ON "question_definitions"("check_in_protocol_version_id", "position");
CREATE UNIQUE INDEX "schedule_configurations_protocol_key"
  ON "schedule_configurations"("check_in_protocol_version_id");
CREATE UNIQUE INDEX "discharge_episodes_id_check_in_protocol_version_id_key"
  ON "discharge_episodes"("id", "check_in_protocol_version_id");
CREATE UNIQUE INDEX "check_in_assignment_batches_episode_key"
  ON "check_in_assignment_batches"("episode_id");
CREATE UNIQUE INDEX "check_in_assignment_batches_creator_idempotency_key"
  ON "check_in_assignment_batches"("created_by_id", "idempotency_key");
CREATE UNIQUE INDEX "check_in_assignments_id_protocol_key"
  ON "check_in_assignments"("id", "check_in_protocol_version_id");
CREATE UNIQUE INDEX "check_in_assignments_episode_sequence_key"
  ON "check_in_assignments"("episode_id", "sequence");
CREATE UNIQUE INDEX "check_in_assignments_episode_scheduled_key"
  ON "check_in_assignments"("episode_id", "scheduled_for");
CREATE INDEX "check_in_assignments_episode_scheduled_idx"
  ON "check_in_assignments"("episode_id", "scheduled_for");
CREATE UNIQUE INDEX "check_in_outcomes_assignment_key"
  ON "check_in_outcomes"("assignment_id");
CREATE UNIQUE INDEX "check_in_outcomes_assignment_protocol_key"
  ON "check_in_outcomes"("assignment_id", "check_in_protocol_version_id");
CREATE UNIQUE INDEX "check_in_outcomes_id_assignment_type_key"
  ON "check_in_outcomes"("id", "assignment_id", "type");
CREATE UNIQUE INDEX "check_in_outcomes_actor_idempotency_key"
  ON "check_in_outcomes"("recorded_by_id", "idempotency_key");
CREATE UNIQUE INDEX "check_in_responses_outcome_key" ON "check_in_responses"("outcome_id");
CREATE UNIQUE INDEX "check_in_responses_assignment_key" ON "check_in_responses"("assignment_id");
CREATE UNIQUE INDEX "check_in_responses_assignment_protocol_key"
  ON "check_in_responses"("assignment_id", "check_in_protocol_version_id");
CREATE UNIQUE INDEX "check_in_responses_outcome_assignment_type_key"
  ON "check_in_responses"("outcome_id", "assignment_id", "outcome_type");
CREATE UNIQUE INDEX "check_in_responses_id_protocol_key"
  ON "check_in_responses"("id", "check_in_protocol_version_id");
CREATE UNIQUE INDEX "check_in_answers_response_question_key"
  ON "check_in_answers"("check_in_response_id", "question_definition_id");
CREATE UNIQUE INDEX "non_response_events_outcome_key" ON "non_response_events"("outcome_id");
CREATE UNIQUE INDEX "non_response_events_assignment_key" ON "non_response_events"("assignment_id");
CREATE UNIQUE INDEX "non_response_events_assignment_protocol_key"
  ON "non_response_events"("assignment_id", "check_in_protocol_version_id");
CREATE UNIQUE INDEX "non_response_events_outcome_assignment_type_key"
  ON "non_response_events"("outcome_id", "assignment_id", "outcome_type");

ALTER TABLE "check_in_protocol_versions" ADD CONSTRAINT "check_in_protocol_versions_base_fkey"
  FOREIGN KEY ("based_on_version_id") REFERENCES "check_in_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_protocol_versions" ADD CONSTRAINT "check_in_protocol_versions_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_definitions" ADD CONSTRAINT "question_definitions_protocol_fkey"
  FOREIGN KEY ("check_in_protocol_version_id") REFERENCES "check_in_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "schedule_configurations" ADD CONSTRAINT "schedule_configurations_protocol_fkey"
  FOREIGN KEY ("check_in_protocol_version_id") REFERENCES "check_in_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discharge_episodes" ADD CONSTRAINT "discharge_episodes_check_in_protocol_fkey"
  FOREIGN KEY ("check_in_protocol_version_id") REFERENCES "check_in_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_assignment_batches" ADD CONSTRAINT "check_in_assignment_batches_episode_protocol_fkey"
  FOREIGN KEY ("episode_id", "check_in_protocol_version_id")
  REFERENCES "discharge_episodes"("id", "check_in_protocol_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_assignment_batches" ADD CONSTRAINT "check_in_assignment_batches_protocol_fkey"
  FOREIGN KEY ("check_in_protocol_version_id") REFERENCES "check_in_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_assignment_batches" ADD CONSTRAINT "check_in_assignment_batches_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_assignments" ADD CONSTRAINT "check_in_assignments_batch_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "check_in_assignment_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_assignments" ADD CONSTRAINT "check_in_assignments_episode_protocol_fkey"
  FOREIGN KEY ("episode_id", "check_in_protocol_version_id")
  REFERENCES "discharge_episodes"("id", "check_in_protocol_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_assignments" ADD CONSTRAINT "check_in_assignments_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_outcomes" ADD CONSTRAINT "check_in_outcomes_assignment_protocol_fkey"
  FOREIGN KEY ("assignment_id", "check_in_protocol_version_id")
  REFERENCES "check_in_assignments"("id", "check_in_protocol_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_outcomes" ADD CONSTRAINT "check_in_outcomes_actor_fkey"
  FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_responses" ADD CONSTRAINT "check_in_responses_assignment_protocol_fkey"
  FOREIGN KEY ("assignment_id", "check_in_protocol_version_id")
  REFERENCES "check_in_assignments"("id", "check_in_protocol_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_responses" ADD CONSTRAINT "check_in_responses_outcome_assignment_type_fkey"
  FOREIGN KEY ("outcome_id", "assignment_id", "outcome_type")
  REFERENCES "check_in_outcomes"("id", "assignment_id", "type") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_responses" ADD CONSTRAINT "check_in_responses_submitter_fkey"
  FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_answers" ADD CONSTRAINT "check_in_answers_response_protocol_fkey"
  FOREIGN KEY ("check_in_response_id", "check_in_protocol_version_id")
  REFERENCES "check_in_responses"("id", "check_in_protocol_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "check_in_answers" ADD CONSTRAINT "check_in_answers_question_protocol_fkey"
  FOREIGN KEY ("question_definition_id", "check_in_protocol_version_id")
  REFERENCES "question_definitions"("id", "check_in_protocol_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_response_events" ADD CONSTRAINT "non_response_events_assignment_protocol_fkey"
  FOREIGN KEY ("assignment_id", "check_in_protocol_version_id")
  REFERENCES "check_in_assignments"("id", "check_in_protocol_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_response_events" ADD CONSTRAINT "non_response_events_outcome_assignment_type_fkey"
  FOREIGN KEY ("outcome_id", "assignment_id", "outcome_type")
  REFERENCES "check_in_outcomes"("id", "assignment_id", "type") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_response_events" ADD CONSTRAINT "non_response_events_actor_fkey"
  FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION deny_check_in_protocol_reassignment() RETURNS trigger AS $$
BEGIN
  IF OLD.check_in_protocol_version_id IS DISTINCT FROM NEW.check_in_protocol_version_id THEN
    RAISE EXCEPTION 'check-in protocol version is immutable for an episode';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discharge_episodes_check_in_protocol_no_update
  BEFORE UPDATE OF "check_in_protocol_version_id" ON "discharge_episodes"
  FOR EACH ROW EXECUTE FUNCTION deny_check_in_protocol_reassignment();

CREATE FUNCTION enforce_check_in_outcome_child() RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'RESPONDED' THEN
    IF NOT EXISTS (
      SELECT 1 FROM "check_in_responses"
      WHERE "outcome_id" = NEW.id
        AND "assignment_id" = NEW.assignment_id
        AND "outcome_type" = NEW.type
    ) THEN
      RAISE EXCEPTION 'responded outcome requires a check-in response';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM "non_response_events"
      WHERE "outcome_id" = NEW.id
        AND "assignment_id" = NEW.assignment_id
        AND "outcome_type" = NEW.type
    ) THEN
      RAISE EXCEPTION 'non-response outcome requires a non-response event';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER check_in_outcome_requires_child
  AFTER INSERT ON "check_in_outcomes"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_check_in_outcome_child();

CREATE TRIGGER check_in_protocol_versions_no_update
  BEFORE UPDATE OR DELETE ON "check_in_protocol_versions"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER question_definitions_no_update
  BEFORE UPDATE OR DELETE ON "question_definitions"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER schedule_configurations_no_update
  BEFORE UPDATE OR DELETE ON "schedule_configurations"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER check_in_assignment_batches_no_update
  BEFORE UPDATE OR DELETE ON "check_in_assignment_batches"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER check_in_assignments_no_update
  BEFORE UPDATE OR DELETE ON "check_in_assignments"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER check_in_outcomes_no_update
  BEFORE UPDATE OR DELETE ON "check_in_outcomes"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER check_in_responses_no_update
  BEFORE UPDATE OR DELETE ON "check_in_responses"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER check_in_answers_no_update
  BEFORE UPDATE OR DELETE ON "check_in_answers"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
CREATE TRIGGER non_response_events_no_update
  BEFORE UPDATE OR DELETE ON "non_response_events"
  FOR EACH ROW EXECUTE FUNCTION deny_episode_history_mutation();
