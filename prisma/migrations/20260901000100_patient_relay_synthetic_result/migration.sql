-- C04 stores only a closed, normalized synthetic technical result.
-- No phone, prompt, transcript, summary, evidence, payload, or free text is added.

ALTER TYPE "AuditAction" ADD VALUE 'RELAY_SYNTHETIC_EXECUTION_RECORDED';

CREATE TYPE "RelayResultValidity" AS ENUM ('VALID', 'INVALID', 'MISSING');
CREATE TYPE "RelayIdentityStatus" AS ENUM (
  'intended_recipient',
  'wrong_recipient',
  'unknown'
);
CREATE TYPE "RelayContactStatus" AS ENUM ('reached', 'not_reached', 'unknown');
CREATE TYPE "RelayCallbackPreference" AS ENUM ('requested', 'not_requested', 'unknown');
CREATE TYPE "RelayBoundaryEvent" AS ENUM (
  'none',
  'out_of_scope_request',
  'emergency_statement',
  'unknown'
);

ALTER TABLE "relay_attempts"
  ADD COLUMN "result_validity" "RelayResultValidity",
  ADD COLUMN "identity_status" "RelayIdentityStatus",
  ADD COLUMN "contact_status" "RelayContactStatus",
  ADD COLUMN "callback_preference" "RelayCallbackPreference",
  ADD COLUMN "boundary_event" "RelayBoundaryEvent",
  ADD CONSTRAINT "relay_attempts_closed_result_check" CHECK (
    (
      "lifecycle_state" IN ('PREVIEWED', 'CONFIRMED', 'PROVIDER_CREATED')
      AND "result_validity" IS NULL
      AND "identity_status" IS NULL
      AND "contact_status" IS NULL
      AND "callback_preference" IS NULL
      AND "boundary_event" IS NULL
    ) OR (
      "lifecycle_state" IN (
        'RESULT_COMPLETED',
        'RESULT_FAILED',
        'RESULT_CANCELED',
        'RESULT_UNCERTAIN',
        'HUMAN_REVIEWED'
      )
      AND (
        (
          "result_validity" = 'VALID'
          AND "identity_status" IS NOT NULL
          AND "contact_status" IS NOT NULL
          AND "callback_preference" IS NOT NULL
          AND "boundary_event" IS NOT NULL
        ) OR (
          "result_validity" IN ('INVALID', 'MISSING')
          AND "identity_status" IS NULL
          AND "contact_status" IS NULL
          AND "callback_preference" IS NULL
          AND "boundary_event" IS NULL
        )
      )
    )
  );

CREATE FUNCTION enforce_relay_result_immutability() RETURNS trigger AS $$
BEGIN
  IF OLD."result_validity" IS NOT NULL AND (
    NEW."result_validity" IS DISTINCT FROM OLD."result_validity" OR
    NEW."identity_status" IS DISTINCT FROM OLD."identity_status" OR
    NEW."contact_status" IS DISTINCT FROM OLD."contact_status" OR
    NEW."callback_preference" IS DISTINCT FROM OLD."callback_preference" OR
    NEW."boundary_event" IS DISTINCT FROM OLD."boundary_event"
  ) THEN
    RAISE EXCEPTION 'relay normalized technical result is immutable';
  END IF;

  IF OLD."result_validity" IS NULL AND NEW."result_validity" IS NOT NULL AND NOT (
    OLD."lifecycle_state" = 'PROVIDER_CREATED' AND
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

CREATE TRIGGER relay_attempts_enforce_result_immutability
  BEFORE UPDATE ON "relay_attempts"
  FOR EACH ROW EXECUTE FUNCTION enforce_relay_result_immutability();
