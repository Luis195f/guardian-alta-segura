-- C05 adds only closed, normalized fields for the synthetic Professional Relay result.
-- No phone, prompt, transcript, summary, evidence, payload, or free text is added.

ALTER TYPE "RelayIdentityStatus" ADD VALUE 'intended_professional';

CREATE TYPE "RelayAcknowledged" AS ENUM ('yes', 'no', 'unknown');
CREATE TYPE "RelayAvailabilityToReview" AS ENUM ('yes', 'no', 'unknown');

ALTER TABLE "relay_attempts"
  ADD COLUMN "acknowledged" "RelayAcknowledged",
  ADD COLUMN "availability_to_review" "RelayAvailabilityToReview";

ALTER TABLE "relay_attempts" DROP CONSTRAINT "relay_attempts_closed_result_check";
ALTER TABLE "relay_attempts"
  ADD CONSTRAINT "relay_attempts_closed_result_check" CHECK (
    (
      "lifecycle_state" IN ('PREVIEWED', 'CONFIRMED', 'PROVIDER_CREATED')
      AND "result_validity" IS NULL
      AND "identity_status" IS NULL
      AND "contact_status" IS NULL
      AND "callback_preference" IS NULL
      AND "acknowledged" IS NULL
      AND "availability_to_review" IS NULL
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
          AND "contact_status" IS NOT NULL
          AND (
            (
              "recipient_kind" = 'PATIENT'
              AND "identity_status"::text IN ('intended_recipient', 'wrong_recipient', 'unknown')
              AND "callback_preference" IS NOT NULL
              AND "acknowledged" IS NULL
              AND "availability_to_review" IS NULL
            ) OR (
              "recipient_kind" = 'PROFESSIONAL'
              AND "identity_status"::text IN ('intended_professional', 'wrong_recipient', 'unknown')
              AND "callback_preference" IS NULL
              AND "acknowledged" IS NOT NULL
              AND "availability_to_review" IS NOT NULL
              AND "boundary_event" IN ('none', 'out_of_scope_request', 'unknown')
            )
          )
          AND "boundary_event" IS NOT NULL
        ) OR (
          "result_validity" IN ('INVALID', 'MISSING')
          AND "identity_status" IS NULL
          AND "contact_status" IS NULL
          AND "callback_preference" IS NULL
          AND "acknowledged" IS NULL
          AND "availability_to_review" IS NULL
          AND "boundary_event" IS NULL
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION enforce_relay_result_immutability() RETURNS trigger AS $$
BEGIN
  IF OLD."result_validity" IS NOT NULL AND (
    NEW."result_validity" IS DISTINCT FROM OLD."result_validity" OR
    NEW."identity_status" IS DISTINCT FROM OLD."identity_status" OR
    NEW."contact_status" IS DISTINCT FROM OLD."contact_status" OR
    NEW."callback_preference" IS DISTINCT FROM OLD."callback_preference" OR
    NEW."acknowledged" IS DISTINCT FROM OLD."acknowledged" OR
    NEW."availability_to_review" IS DISTINCT FROM OLD."availability_to_review" OR
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
