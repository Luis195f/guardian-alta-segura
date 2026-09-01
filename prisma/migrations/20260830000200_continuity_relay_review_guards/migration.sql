-- Additive hardening for the internal C03 lifecycle.
-- Preserve one event per reached state and immutable human-review attribution.

CREATE UNIQUE INDEX "relay_events_attempt_to_state_key"
  ON "relay_events"("attempt_ref", "to_state");

CREATE FUNCTION enforce_relay_review_immutability() RETURNS trigger AS $$
BEGIN
  IF (OLD."reviewed_by_ref" IS NOT NULL AND NEW."reviewed_by_ref" IS DISTINCT FROM OLD."reviewed_by_ref")
     OR (OLD."reviewed_at" IS NOT NULL AND NEW."reviewed_at" IS DISTINCT FROM OLD."reviewed_at") THEN
    RAISE EXCEPTION 'relay human review attribution is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER relay_attempts_enforce_review_immutability
  BEFORE UPDATE ON "relay_attempts"
  FOR EACH ROW EXECUTE FUNCTION enforce_relay_review_immutability();
