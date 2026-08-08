-- This migration must remain atomic even when the migration runner does not
-- provide an implicit transaction.
BEGIN;

-- Prevent review inserts and all other concurrent access while the append-only
-- guard is suspended for the controlled backfill.
LOCK TABLE "alert_reviews" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'alert_reviews'::regclass
      AND tgname = 'alert_reviews_no_update'
      AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'alert_reviews_no_update must exist and be enabled before backfill';
  END IF;
END $$;

-- Preserve existing append-only review history while adding durable replay metadata.
ALTER TABLE "alert_reviews"
  ADD COLUMN "idempotency_key" VARCHAR(112),
  ADD COLUMN "request_fingerprint" CHAR(64);

-- Existing rows predate client-supplied review idempotency. Suspend only the
-- immutable-history trigger and only while populating the two new columns.
ALTER TABLE "alert_reviews" DISABLE TRIGGER alert_reviews_no_update;

-- These deterministic technical markers are migration metadata. They neither
-- reconstruct nor claim the idempotency key or fingerprint of the historic request.
UPDATE "alert_reviews"
SET
  "idempotency_key" =
    'legacy-review-migration-v1:'
    || md5('key:' || "id")
    || md5('key:' || "id" || ':' || "reviewed_by_id"),
  "request_fingerprint" =
    md5('fingerprint:' || "id")
    || md5('fingerprint:' || "id" || ':' || "reviewed_by_id");

ALTER TABLE "alert_reviews" ENABLE TRIGGER alert_reviews_no_update;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'alert_reviews'::regclass
      AND tgname = 'alert_reviews_no_update'
      AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'alert_reviews_no_update was not restored after backfill';
  END IF;
END $$;

ALTER TABLE "alert_reviews"
  ALTER COLUMN "idempotency_key" SET NOT NULL,
  ALTER COLUMN "request_fingerprint" SET NOT NULL,
  ADD CONSTRAINT "alert_reviews_idempotency_key_check"
    CHECK ("idempotency_key" ~ '^[A-Za-z0-9._:-]{8,112}$'),
  ADD CONSTRAINT "alert_reviews_fingerprint_check"
    CHECK ("request_fingerprint" ~ '^[a-f0-9]{64}$');

CREATE UNIQUE INDEX "alert_reviews_actor_idempotency_key"
  ON "alert_reviews"("reviewed_by_id", "idempotency_key");

COMMIT;
