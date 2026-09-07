-- C06 extends the canonical Relay ledger with normalized governance only.
-- Existing rows remain valid without backfill; no provider payload or personal data is added.

CREATE TYPE "RelayGovernanceOutcome" AS ENUM (
  'CALL_NOT_ATTEMPTED',
  'CHANNEL_UNAVAILABLE',
  'UNKNOWN_PENDING_RECONCILIATION',
  'CONFIRMATION_CONFLICT',
  'PROVIDER_POLICY_REFUSAL',
  'CALL_NOT_READY',
  'RESULT_SCHEMA_VIOLATION',
  'RESULT_AVAILABLE_PENDING_HUMAN_REVIEW',
  'UNKNOWN_PROVIDER_ERROR'
);

ALTER TABLE "relay_attempts"
  ADD COLUMN "region" VARCHAR(2),
  ADD COLUMN "locale" VARCHAR(16),
  ADD COLUMN "line_region" VARCHAR(64),
  ADD COLUMN "governance_outcome" "RelayGovernanceOutcome",
  ADD CONSTRAINT "relay_attempts_region_check" CHECK (
    "region" IS NULL OR "region" ~ '^[A-Z]{2}$'
  ),
  ADD CONSTRAINT "relay_attempts_locale_check" CHECK (
    "locale" IS NULL OR "locale" ~ '^[a-z]{2,3}-[A-Z]{2}$'
  ),
  ADD CONSTRAINT "relay_attempts_line_region_check" CHECK (
    "line_region" IS NULL OR "line_region" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  ADD CONSTRAINT "relay_attempts_governance_phase_check" CHECK (
    "governance_outcome" IS NULL OR
    (
      "lifecycle_state" = 'PROVIDER_CREATED'
      AND "governance_outcome" IN ('CALL_NOT_READY', 'UNKNOWN_PENDING_RECONCILIATION')
    ) OR (
      "lifecycle_state" IN (
        'RESULT_COMPLETED',
        'RESULT_FAILED',
        'RESULT_CANCELED',
        'RESULT_UNCERTAIN',
        'HUMAN_REVIEWED'
      )
      AND "governance_outcome" NOT IN ('CALL_NOT_READY', 'UNKNOWN_PENDING_RECONCILIATION')
    )
  );

ALTER TABLE "relay_events"
  ADD COLUMN "governance_outcome" "RelayGovernanceOutcome";

CREATE OR REPLACE FUNCTION enforce_relay_attempt_invariants() RETURNS trigger AS $$
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
    NEW."region" IS DISTINCT FROM OLD."region" OR
    NEW."locale" IS DISTINCT FROM OLD."locale" OR
    NEW."line_region" IS DISTINCT FROM OLD."line_region" OR
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
    (OLD."lifecycle_state" = 'CONFIRMED' AND NEW."lifecycle_state" IN ('PROVIDER_CREATED', 'RESULT_UNCERTAIN')) OR
    (OLD."lifecycle_state" = 'PROVIDER_CREATED' AND NEW."lifecycle_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN')) OR
    (OLD."lifecycle_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN') AND NEW."lifecycle_state" = 'HUMAN_REVIEWED')
  ) THEN
    RAISE EXCEPTION 'invalid relay lifecycle transition';
  END IF;

  IF NEW."lifecycle_state" NOT IN ('PREVIEWED', 'CONFIRMED') THEN
    SELECT "provider_ref" INTO provider_reference
      FROM "outbound_call_intents" WHERE "id" = NEW."outbound_call_intent_ref";
    IF provider_reference IS NULL AND NOT (
      NEW."lifecycle_state" IN ('RESULT_UNCERTAIN', 'HUMAN_REVIEWED')
      AND NEW."governance_outcome" IN (
        'CALL_NOT_ATTEMPTED',
        'CHANNEL_UNAVAILABLE',
        'CONFIRMATION_CONFLICT',
        'PROVIDER_POLICY_REFUSAL',
        'UNKNOWN_PROVIDER_ERROR'
      )
    ) THEN
      RAISE EXCEPTION 'relay provider lifecycle requires persisted provider reference';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_relay_event_append_only() RETURNS trigger AS $$
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
    (NEW."from_state" = 'CONFIRMED' AND NEW."to_state" IN ('PROVIDER_CREATED', 'RESULT_UNCERTAIN')) OR
    (NEW."from_state" = 'PROVIDER_CREATED' AND NEW."to_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN')) OR
    (NEW."from_state" IN ('RESULT_COMPLETED', 'RESULT_FAILED', 'RESULT_CANCELED', 'RESULT_UNCERTAIN') AND NEW."to_state" = 'HUMAN_REVIEWED')
  ) THEN
    RAISE EXCEPTION 'invalid relay event transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_relay_result_immutability() RETURNS trigger AS $$
BEGIN
  IF OLD."result_validity" IS NOT NULL AND (
    NEW."result_validity" IS DISTINCT FROM OLD."result_validity" OR
    NEW."identity_status" IS DISTINCT FROM OLD."identity_status" OR
    NEW."contact_status" IS DISTINCT FROM OLD."contact_status" OR
    NEW."callback_preference" IS DISTINCT FROM OLD."callback_preference" OR
    NEW."acknowledged" IS DISTINCT FROM OLD."acknowledged" OR
    NEW."availability_to_review" IS DISTINCT FROM OLD."availability_to_review" OR
    NEW."boundary_event" IS DISTINCT FROM OLD."boundary_event" OR
    NEW."governance_outcome" IS DISTINCT FROM OLD."governance_outcome"
  ) THEN
    RAISE EXCEPTION 'relay normalized technical result is immutable';
  END IF;

  IF OLD."result_validity" IS NULL AND NEW."result_validity" IS NOT NULL AND NOT (
    OLD."lifecycle_state" IN ('CONFIRMED', 'PROVIDER_CREATED') AND
    NEW."lifecycle_state" IN (
      'RESULT_COMPLETED',
      'RESULT_FAILED',
      'RESULT_CANCELED',
      'RESULT_UNCERTAIN'
    )
  ) THEN
    RAISE EXCEPTION 'relay normalized technical result requires a result transition';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
