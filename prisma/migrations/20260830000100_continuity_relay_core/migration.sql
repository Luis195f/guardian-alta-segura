-- Internal, disabled Continuity Relay core.
-- No phone, prompt, transcript, summary, evidence, provider payload, or free metadata is stored.

ALTER TYPE "AuditAction" ADD VALUE 'RELAY_PREVIEW_ISSUED';
ALTER TYPE "AuditAction" ADD VALUE 'RELAY_CONFIRMATION_CONSUMED';
ALTER TYPE "AuditAction" ADD VALUE 'RELAY_CONFIRMATION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'RELAY_AUTHORITY_STALE';
ALTER TYPE "AuditAction" ADD VALUE 'RELAY_PROVIDER_REF_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RELAY_TECHNICAL_RESULT_AVAILABLE';
ALTER TYPE "AuditAction" ADD VALUE 'RELAY_HUMAN_REVIEW_RECORDED';

CREATE TYPE "RelayRecipientKind" AS ENUM ('PATIENT', 'PROFESSIONAL');
CREATE TYPE "RelayPurpose" AS ENUM (
  'PATIENT_CALLBACK_OFFER',
  'PROFESSIONAL_REVIEW_REQUEST'
);
CREATE TYPE "RelayLifecycleState" AS ENUM (
  'PREVIEWED',
  'CONFIRMED',
  'PROVIDER_CREATED',
  'RESULT_COMPLETED',
  'RESULT_FAILED',
  'RESULT_CANCELED',
  'RESULT_UNCERTAIN',
  'HUMAN_REVIEWED'
);
CREATE TYPE "RelayTechnicalDisposition" AS ENUM (
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'UNCERTAIN'
);

CREATE TABLE "relay_attempts" (
  "id" TEXT NOT NULL,
  "recipient_kind" "RelayRecipientKind" NOT NULL,
  "purpose" "RelayPurpose" NOT NULL,
  "episode_ref" TEXT NOT NULL,
  "task_ref" TEXT,
  "target_ref" VARCHAR(128) NOT NULL,
  "actor_ref" TEXT NOT NULL,
  "authority_fingerprint" CHAR(64) NOT NULL,
  "confirmation_digest" CHAR(64) NOT NULL,
  "idempotency_ref" VARCHAR(128) NOT NULL,
  "outbound_call_intent_ref" TEXT,
  "lifecycle_state" "RelayLifecycleState" NOT NULL DEFAULT 'PREVIEWED',
  "attestation_version" VARCHAR(64) NOT NULL,
  "revision" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "consumed_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "reviewed_by_ref" TEXT,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "relay_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "relay_attempts_pair_check" CHECK (
    ("recipient_kind" = 'PATIENT' AND "purpose" = 'PATIENT_CALLBACK_OFFER') OR
    ("recipient_kind" = 'PROFESSIONAL' AND "purpose" = 'PROFESSIONAL_REVIEW_REQUEST')
  ),
  CONSTRAINT "relay_attempts_patient_context_check" CHECK (
    "recipient_kind" <> 'PATIENT' OR "task_ref" IS NULL
  ),
  CONSTRAINT "relay_attempts_fingerprint_check" CHECK (
    "authority_fingerprint" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "relay_attempts_confirmation_digest_check" CHECK (
    "confirmation_digest" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "relay_attempts_idempotency_ref_check" CHECK (
    "idempotency_ref" ~ '^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$'
  ),
  CONSTRAINT "relay_attempts_target_ref_check" CHECK (
    "target_ref" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  CONSTRAINT "relay_attempts_revision_check" CHECK (
    "revision" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  CONSTRAINT "relay_attempts_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "relay_attempts_consumption_check" CHECK (
    ("lifecycle_state" = 'PREVIEWED' AND "consumed_at" IS NULL) OR
    ("lifecycle_state" <> 'PREVIEWED' AND "consumed_at" IS NOT NULL)
  ),
  CONSTRAINT "relay_attempts_review_check" CHECK (
    ("lifecycle_state" = 'HUMAN_REVIEWED' AND "reviewed_by_ref" IS NOT NULL AND "reviewed_at" IS NOT NULL) OR
    ("lifecycle_state" <> 'HUMAN_REVIEWED' AND "reviewed_by_ref" IS NULL AND "reviewed_at" IS NULL)
  ),
  CONSTRAINT "relay_attempts_outbound_check" CHECK (
    ("lifecycle_state" IN ('PREVIEWED', 'CONFIRMED') AND "outbound_call_intent_ref" IS NULL) OR
    ("lifecycle_state" NOT IN ('PREVIEWED', 'CONFIRMED') AND "outbound_call_intent_ref" IS NOT NULL)
  )
);

CREATE TABLE "relay_events" (
  "id" TEXT NOT NULL,
  "attempt_ref" TEXT NOT NULL,
  "from_state" "RelayLifecycleState",
  "to_state" "RelayLifecycleState" NOT NULL,
  "technical_disposition" "RelayTechnicalDisposition",
  "actor_ref" TEXT,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "relay_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "relay_events_disposition_check" CHECK (
    ("to_state" = 'RESULT_COMPLETED' AND "technical_disposition" = 'COMPLETED') OR
    ("to_state" = 'RESULT_FAILED' AND "technical_disposition" = 'FAILED') OR
    ("to_state" = 'RESULT_CANCELED' AND "technical_disposition" = 'CANCELED') OR
    ("to_state" = 'RESULT_UNCERTAIN' AND "technical_disposition" = 'UNCERTAIN') OR
    ("to_state" NOT IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN') AND "technical_disposition" IS NULL)
  )
);

CREATE UNIQUE INDEX "relay_attempts_confirmation_digest_key"
  ON "relay_attempts"("confirmation_digest");
CREATE UNIQUE INDEX "relay_attempts_idempotency_ref_key"
  ON "relay_attempts"("idempotency_ref");
CREATE UNIQUE INDEX "relay_attempts_outbound_intent_ref_key"
  ON "relay_attempts"("outbound_call_intent_ref");
CREATE INDEX "relay_attempts_episode_state_created_idx"
  ON "relay_attempts"("episode_ref", "lifecycle_state", "created_at");
CREATE INDEX "relay_attempts_task_state_created_idx"
  ON "relay_attempts"("task_ref", "lifecycle_state", "created_at");
CREATE INDEX "relay_attempts_actor_created_idx"
  ON "relay_attempts"("actor_ref", "created_at");
CREATE INDEX "relay_events_attempt_occurred_idx"
  ON "relay_events"("attempt_ref", "occurred_at");

ALTER TABLE "relay_attempts" ADD CONSTRAINT "relay_attempts_episode_fkey"
  FOREIGN KEY ("episode_ref") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "relay_attempts" ADD CONSTRAINT "relay_attempts_task_fkey"
  FOREIGN KEY ("task_ref") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "relay_attempts" ADD CONSTRAINT "relay_attempts_actor_fkey"
  FOREIGN KEY ("actor_ref") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "relay_attempts" ADD CONSTRAINT "relay_attempts_reviewer_fkey"
  FOREIGN KEY ("reviewed_by_ref") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "relay_attempts" ADD CONSTRAINT "relay_attempts_outbound_intent_fkey"
  FOREIGN KEY ("outbound_call_intent_ref") REFERENCES "outbound_call_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "relay_events" ADD CONSTRAINT "relay_events_attempt_fkey"
  FOREIGN KEY ("attempt_ref") REFERENCES "relay_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "relay_events" ADD CONSTRAINT "relay_events_actor_fkey"
  FOREIGN KEY ("actor_ref") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_relay_attempt_invariants() RETURNS trigger AS $$
DECLARE
  provider_reference TEXT;
  task_episode TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW."recipient_kind" IS DISTINCT FROM OLD."recipient_kind" OR
    NEW."purpose" IS DISTINCT FROM OLD."purpose" OR
    NEW."episode_ref" IS DISTINCT FROM OLD."episode_ref" OR
    NEW."task_ref" IS DISTINCT FROM OLD."task_ref" OR
    NEW."target_ref" IS DISTINCT FROM OLD."target_ref" OR
    NEW."actor_ref" IS DISTINCT FROM OLD."actor_ref" OR
    NEW."authority_fingerprint" IS DISTINCT FROM OLD."authority_fingerprint" OR
    NEW."confirmation_digest" IS DISTINCT FROM OLD."confirmation_digest" OR
    NEW."idempotency_ref" IS DISTINCT FROM OLD."idempotency_ref" OR
    NEW."attestation_version" IS DISTINCT FROM OLD."attestation_version" OR
    NEW."revision" IS DISTINCT FROM OLD."revision" OR
    NEW."expires_at" IS DISTINCT FROM OLD."expires_at" OR
    NEW."consumed_at" IS DISTINCT FROM OLD."consumed_at" AND OLD."consumed_at" IS NOT NULL OR
    NEW."revoked_at" IS DISTINCT FROM OLD."revoked_at" AND OLD."revoked_at" IS NOT NULL OR
    NEW."outbound_call_intent_ref" IS DISTINCT FROM OLD."outbound_call_intent_ref" AND OLD."outbound_call_intent_ref" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'relay attempt authority and identity fields are immutable';
  END IF;

  IF NEW."task_ref" IS NOT NULL THEN
    SELECT "episode_id" INTO task_episode FROM "tasks" WHERE "id" = NEW."task_ref";
    IF task_episode IS NULL OR task_episode IS DISTINCT FROM NEW."episode_ref" THEN
      RAISE EXCEPTION 'relay task must belong to relay episode';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."lifecycle_state" IS DISTINCT FROM OLD."lifecycle_state" AND NOT (
    (OLD."lifecycle_state" = 'PREVIEWED' AND NEW."lifecycle_state" = 'CONFIRMED') OR
    (OLD."lifecycle_state" = 'CONFIRMED' AND NEW."lifecycle_state" = 'PROVIDER_CREATED') OR
    (OLD."lifecycle_state" = 'PROVIDER_CREATED' AND NEW."lifecycle_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN')) OR
    (OLD."lifecycle_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN') AND NEW."lifecycle_state" = 'HUMAN_REVIEWED')
  ) THEN
    RAISE EXCEPTION 'invalid relay lifecycle transition';
  END IF;

  IF NEW."lifecycle_state" NOT IN ('PREVIEWED', 'CONFIRMED') THEN
    SELECT "provider_ref" INTO provider_reference
      FROM "outbound_call_intents" WHERE "id" = NEW."outbound_call_intent_ref";
    IF provider_reference IS NULL THEN
      RAISE EXCEPTION 'relay provider lifecycle requires persisted provider reference';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER relay_attempts_enforce_invariants
  BEFORE INSERT OR UPDATE ON "relay_attempts"
  FOR EACH ROW EXECUTE FUNCTION enforce_relay_attempt_invariants();

CREATE FUNCTION enforce_relay_event_append_only() RETURNS trigger AS $$
DECLARE
  current_state "RelayLifecycleState";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'relay events are append-only';
  END IF;
  SELECT "lifecycle_state" INTO current_state
    FROM "relay_attempts" WHERE "id" = NEW."attempt_ref" FOR UPDATE;
  IF NEW."from_state" IS NULL THEN
    IF NEW."to_state" <> 'PREVIEWED' OR current_state <> 'PREVIEWED' THEN
      RAISE EXCEPTION 'invalid initial relay event';
    END IF;
  ELSIF current_state IS DISTINCT FROM NEW."to_state" OR NOT (
    (NEW."from_state" = 'PREVIEWED' AND NEW."to_state" = 'CONFIRMED') OR
    (NEW."from_state" = 'CONFIRMED' AND NEW."to_state" = 'PROVIDER_CREATED') OR
    (NEW."from_state" = 'PROVIDER_CREATED' AND NEW."to_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN')) OR
    (NEW."from_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN') AND NEW."to_state" = 'HUMAN_REVIEWED')
  ) THEN
    RAISE EXCEPTION 'invalid relay event transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER relay_events_enforce_insert
  BEFORE INSERT ON "relay_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_relay_event_append_only();
CREATE TRIGGER relay_events_reject_update
  BEFORE UPDATE ON "relay_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_relay_event_append_only();
CREATE TRIGGER relay_events_reject_delete
  BEFORE DELETE ON "relay_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_relay_event_append_only();
