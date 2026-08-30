-- Technical persistence for the disabled CALL-E REST adapter.
-- No recipient, task, payload, provider body, transcript, evidence, attempt, or recording is stored.

CREATE TYPE "OutboundCallIntentState" AS ENUM (
  'RESERVED',
  'POSTING',
  'PROVIDER_ACCEPTED',
  'POLLING',
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'UNCERTAIN'
);

CREATE TYPE "OutboundCallReconciliationState" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'RECONCILED',
  'REVIEW_REQUIRED'
);

CREATE TYPE "OutboundCallIntentEventType" AS ENUM (
  'RESERVED',
  'POST_CLAIMED',
  'PROVIDER_REF_STORED',
  'SNAPSHOT_RECORDED',
  'ERROR_RECORDED'
);

CREATE TABLE "outbound_call_intents" (
  "id" TEXT NOT NULL,
  "idempotency_ref" VARCHAR(128) NOT NULL,
  "protected_fingerprint" CHAR(64) NOT NULL,
  "provider_ref" VARCHAR(128),
  "state" "OutboundCallIntentState" NOT NULL DEFAULT 'RESERVED',
  "technical_status" VARCHAR(32),
  "reconciliation_state" "OutboundCallReconciliationState" NOT NULL DEFAULT 'NOT_REQUIRED',
  "error_class" VARCHAR(32),
  "error_code" VARCHAR(64),
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "provider_accepted_at" TIMESTAMPTZ(3),
  "last_polled_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  CONSTRAINT "outbound_call_intents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbound_call_intents_fingerprint_check" CHECK ("protected_fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "outbound_call_intents_idempotency_ref_check" CHECK ("idempotency_ref" ~ '^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$'),
  CONSTRAINT "outbound_call_intents_provider_ref_check" CHECK ("provider_ref" IS NULL OR "provider_ref" ~ '^[A-Za-z0-9_-]{1,128}$')
);

CREATE TABLE "outbound_call_intent_events" (
  "id" TEXT NOT NULL,
  "intent_id" TEXT NOT NULL,
  "type" "OutboundCallIntentEventType" NOT NULL,
  "from_state" "OutboundCallIntentState",
  "to_state" "OutboundCallIntentState" NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "outbound_call_intent_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outbound_call_intents_idempotency_ref_key"
  ON "outbound_call_intents"("idempotency_ref");
CREATE UNIQUE INDEX "outbound_call_intents_provider_ref_key"
  ON "outbound_call_intents"("provider_ref");
CREATE INDEX "outbound_call_intents_state_reconciliation_updated_idx"
  ON "outbound_call_intents"("state", "reconciliation_state", "updated_at");
CREATE INDEX "outbound_call_intent_events_intent_occurred_idx"
  ON "outbound_call_intent_events"("intent_id", "occurred_at");

ALTER TABLE "outbound_call_intent_events"
  ADD CONSTRAINT "outbound_call_intent_events_intent_fkey"
  FOREIGN KEY ("intent_id") REFERENCES "outbound_call_intents"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_outbound_call_intent_immutability() RETURNS trigger AS $$
BEGIN
  IF NEW."idempotency_ref" IS DISTINCT FROM OLD."idempotency_ref"
     OR NEW."protected_fingerprint" IS DISTINCT FROM OLD."protected_fingerprint"
     OR (OLD."provider_ref" IS NOT NULL AND NEW."provider_ref" IS DISTINCT FROM OLD."provider_ref") THEN
    RAISE EXCEPTION 'outbound call identity fields are immutable';
  END IF;
  IF OLD."state" IN ('COMPLETED', 'FAILED', 'CANCELED')
     AND NEW."state" IS DISTINCT FROM OLD."state" THEN
    RAISE EXCEPTION 'terminal outbound call state is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbound_call_intents_enforce_immutability
  BEFORE UPDATE ON "outbound_call_intents"
  FOR EACH ROW EXECUTE FUNCTION enforce_outbound_call_intent_immutability();

CREATE FUNCTION reject_outbound_call_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'outbound call intent events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbound_call_intent_events_reject_update
  BEFORE UPDATE ON "outbound_call_intent_events"
  FOR EACH ROW EXECUTE FUNCTION reject_outbound_call_event_mutation();

CREATE TRIGGER outbound_call_intent_events_reject_delete
  BEFORE DELETE ON "outbound_call_intent_events"
  FOR EACH ROW EXECUTE FUNCTION reject_outbound_call_event_mutation();
