ALTER TYPE "AuditAction" ADD VALUE 'COMMITMENT_DRAFT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMITMENT_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMITMENT_SUPERSEDED';

CREATE TYPE "CommitmentDefinitionState" AS ENUM ('DRAFT');
CREATE TYPE "EpisodeCommitmentState" AS ENUM (
  'DRAFT',
  'AWAITING_EVIDENCE',
  'SUPERSEDED_BY_CORRECTION'
);
CREATE TYPE "CommitmentEventType" AS ENUM (
  'COMMITMENT_DRAFT_CREATED',
  'COMMITMENT_ACTIVATED',
  'COMMITMENT_SUPERSEDED'
);

CREATE TABLE "commitment_definitions" (
  "id" TEXT NOT NULL,
  "definition_key" VARCHAR(128) NOT NULL,
  "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commitment_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commitment_definitions_key_check"
    CHECK ("definition_key" ~ '^[A-Za-z0-9._:-]{1,128}$')
);

CREATE TABLE "commitment_definition_versions" (
  "id" TEXT NOT NULL,
  "definition_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "state" "CommitmentDefinitionState" NOT NULL DEFAULT 'DRAFT',
  "based_on_version_id" TEXT,
  "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
  "source_type" VARCHAR(128) NOT NULL,
  "source_id" VARCHAR(128) NOT NULL,
  "source_version" VARCHAR(128) NOT NULL,
  "action_key" VARCHAR(128) NOT NULL,
  "action_statement" VARCHAR(500) NOT NULL,
  "responsible_role_ref" VARCHAR(128) NOT NULL,
  "due_source_kind" VARCHAR(128) NOT NULL,
  "evidence_policy_key" VARCHAR(128) NOT NULL,
  "evidence_policy_version" VARCHAR(128) NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commitment_definition_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commitment_definition_versions_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "commitment_definition_versions_lineage_check" CHECK (
    ("version_number" = 1 AND "based_on_version_id" IS NULL)
    OR ("version_number" > 1 AND "based_on_version_id" IS NOT NULL)
  ),
  CONSTRAINT "commitment_definition_versions_fields_check" CHECK (
    "source_type" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "source_id" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "source_version" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "action_key" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND char_length("action_statement") BETWEEN 12 AND 500
    AND btrim("action_statement") = "action_statement"
    AND "responsible_role_ref" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "due_source_kind" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "evidence_policy_key" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "evidence_policy_version" ~ '^[A-Za-z0-9._:-]{1,128}$'
  )
);

CREATE TABLE "episode_commitments" (
  "id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "current_version_id" TEXT NOT NULL,
  "current_state" "EpisodeCommitmentState" NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "episode_commitments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "episode_commitments_revision_check" CHECK ("revision" > 0)
);

CREATE TABLE "episode_commitment_versions" (
  "id" TEXT NOT NULL,
  "commitment_id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "based_on_version_id" TEXT,
  "definition_version_id" TEXT NOT NULL,
  "action_key" VARCHAR(128) NOT NULL,
  "action_statement" VARCHAR(500) NOT NULL,
  "responsible_role_ref" VARCHAR(128) NOT NULL,
  "assigned_user_id" TEXT,
  "due_at" TIMESTAMPTZ(3) NOT NULL,
  "time_zone" VARCHAR(64) NOT NULL,
  "due_source_kind" VARCHAR(128) NOT NULL,
  "due_source_id" VARCHAR(128) NOT NULL,
  "due_source_version" VARCHAR(128) NOT NULL,
  "evidence_policy_key" VARCHAR(128) NOT NULL,
  "evidence_policy_version" VARCHAR(128) NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "actor_role" "Role" NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "correction_reason" VARCHAR(280),
  CONSTRAINT "episode_commitment_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "episode_commitment_versions_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "episode_commitment_versions_lineage_check" CHECK (
    ("version_number" = 1 AND "based_on_version_id" IS NULL AND "correction_reason" IS NULL)
    OR
    ("version_number" > 1 AND "based_on_version_id" IS NOT NULL
      AND char_length(btrim(COALESCE("correction_reason", ''))) BETWEEN 8 AND 280)
  ),
  CONSTRAINT "episode_commitment_versions_fields_check" CHECK (
    "action_key" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND char_length("action_statement") BETWEEN 12 AND 500
    AND btrim("action_statement") = "action_statement"
    AND "responsible_role_ref" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND char_length(btrim("time_zone")) BETWEEN 1 AND 64
    AND btrim("time_zone") = "time_zone"
    AND "due_source_kind" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "due_source_id" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "due_source_version" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "evidence_policy_key" ~ '^[A-Za-z0-9._:-]{1,128}$'
    AND "evidence_policy_version" ~ '^[A-Za-z0-9._:-]{1,128}$'
  )
);

CREATE TABLE "commitment_events" (
  "id" TEXT NOT NULL,
  "commitment_id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "type" "CommitmentEventType" NOT NULL,
  "from_state" "EpisodeCommitmentState",
  "to_state" "EpisodeCommitmentState" NOT NULL,
  "source_version_id" TEXT,
  "resulting_version_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "actor_role" "Role" NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "resulting_revision" INTEGER NOT NULL,
  "correction_reason" VARCHAR(280),
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commitment_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commitment_events_idempotency_key_check"
    CHECK ("idempotency_key" ~ '^[A-Za-z0-9._:-]{8,128}$'),
  CONSTRAINT "commitment_events_fingerprint_check"
    CHECK ("request_fingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "commitment_events_revision_check" CHECK ("resulting_revision" > 0),
  CONSTRAINT "commitment_events_shape_check" CHECK (
    ("type" = 'COMMITMENT_DRAFT_CREATED'
      AND "from_state" IS NULL
      AND "to_state" = 'DRAFT'
      AND "source_version_id" IS NULL
      AND "resulting_revision" = 1
      AND "correction_reason" IS NULL)
    OR
    ("type" = 'COMMITMENT_ACTIVATED'
      AND "from_state" = 'DRAFT'
      AND "to_state" = 'AWAITING_EVIDENCE'
      AND "source_version_id" = "resulting_version_id"
      AND "correction_reason" IS NULL)
    OR
    ("type" = 'COMMITMENT_SUPERSEDED'
      AND "from_state" IN ('DRAFT', 'AWAITING_EVIDENCE')
      AND "to_state" = 'SUPERSEDED_BY_CORRECTION'
      AND "source_version_id" IS NOT NULL
      AND "source_version_id" <> "resulting_version_id"
      AND char_length(btrim(COALESCE("correction_reason", ''))) BETWEEN 8 AND 280)
  )
);

CREATE UNIQUE INDEX "commitment_definitions_definition_key_key"
  ON "commitment_definitions"("definition_key");
CREATE UNIQUE INDEX "commitment_definition_versions_definition_version_key"
  ON "commitment_definition_versions"("definition_id", "version_number");
CREATE UNIQUE INDEX "commitment_definition_versions_id_definition_key"
  ON "commitment_definition_versions"("id", "definition_id");
CREATE INDEX "commitment_definition_versions_definition_created_idx"
  ON "commitment_definition_versions"("definition_id", "created_at");
CREATE UNIQUE INDEX "episode_commitments_current_version_key"
  ON "episode_commitments"("current_version_id");
CREATE UNIQUE INDEX "episode_commitments_id_episode_key"
  ON "episode_commitments"("id", "episode_id");
CREATE UNIQUE INDEX "episode_commitments_id_revision_key"
  ON "episode_commitments"("id", "revision");
CREATE UNIQUE INDEX "episode_commitments_current_identity_key"
  ON "episode_commitments"("current_version_id", "id", "episode_id");
CREATE INDEX "episode_commitments_episode_state_created_idx"
  ON "episode_commitments"("episode_id", "current_state", "created_at");
CREATE UNIQUE INDEX "episode_commitment_versions_commitment_version_key"
  ON "episode_commitment_versions"("commitment_id", "version_number");
CREATE UNIQUE INDEX "episode_commitment_versions_identity_key"
  ON "episode_commitment_versions"("id", "commitment_id", "episode_id");
CREATE INDEX "episode_commitment_versions_commitment_created_idx"
  ON "episode_commitment_versions"("commitment_id", "created_at");
CREATE UNIQUE INDEX "commitment_events_actor_idempotency_key"
  ON "commitment_events"("actor_user_id", "idempotency_key");
CREATE UNIQUE INDEX "commitment_events_commitment_revision_key"
  ON "commitment_events"("commitment_id", "resulting_revision");
CREATE INDEX "commitment_events_commitment_occurred_idx"
  ON "commitment_events"("commitment_id", "occurred_at");

ALTER TABLE "commitment_definitions" ADD CONSTRAINT "commitment_definitions_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commitment_definition_versions" ADD CONSTRAINT "commitment_definition_versions_definition_fkey"
  FOREIGN KEY ("definition_id") REFERENCES "commitment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commitment_definition_versions" ADD CONSTRAINT "commitment_definition_versions_base_fkey"
  FOREIGN KEY ("based_on_version_id", "definition_id") REFERENCES "commitment_definition_versions"("id", "definition_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commitment_definition_versions" ADD CONSTRAINT "commitment_definition_versions_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_commitments" ADD CONSTRAINT "episode_commitments_episode_fkey"
  FOREIGN KEY ("episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_commitment_versions" ADD CONSTRAINT "episode_commitment_versions_commitment_fkey"
  FOREIGN KEY ("commitment_id", "episode_id") REFERENCES "episode_commitments"("id", "episode_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_commitment_versions" ADD CONSTRAINT "episode_commitment_versions_base_fkey"
  FOREIGN KEY ("based_on_version_id", "commitment_id", "episode_id") REFERENCES "episode_commitment_versions"("id", "commitment_id", "episode_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_commitment_versions" ADD CONSTRAINT "episode_commitment_versions_definition_fkey"
  FOREIGN KEY ("definition_version_id") REFERENCES "commitment_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_commitment_versions" ADD CONSTRAINT "episode_commitment_versions_assignee_fkey"
  FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_commitment_versions" ADD CONSTRAINT "episode_commitment_versions_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_commitments" ADD CONSTRAINT "episode_commitments_current_version_fkey"
  FOREIGN KEY ("current_version_id", "id", "episode_id") REFERENCES "episode_commitment_versions"("id", "commitment_id", "episode_id")
  ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "commitment_events" ADD CONSTRAINT "commitment_events_commitment_fkey"
  FOREIGN KEY ("commitment_id", "episode_id") REFERENCES "episode_commitments"("id", "episode_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commitment_events" ADD CONSTRAINT "commitment_events_source_version_fkey"
  FOREIGN KEY ("source_version_id", "commitment_id", "episode_id") REFERENCES "episode_commitment_versions"("id", "commitment_id", "episode_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commitment_events" ADD CONSTRAINT "commitment_events_resulting_version_fkey"
  FOREIGN KEY ("resulting_version_id", "commitment_id", "episode_id") REFERENCES "episode_commitment_versions"("id", "commitment_id", "episode_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commitment_events" ADD CONSTRAINT "commitment_events_actor_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION deny_commitment_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'commitment definitions, versions, and events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_commitment_version_insert() RETURNS trigger AS $$
DECLARE current_commitment "episode_commitments"%ROWTYPE;
BEGIN
  SELECT * INTO current_commitment
  FROM "episode_commitments"
  WHERE "id" = NEW."commitment_id" AND "episode_id" = NEW."episode_id"
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'commitment version requires an existing commitment'; END IF;

  IF NEW."version_number" = 1 THEN
    IF current_commitment."revision" <> 1
      OR current_commitment."current_state" <> 'DRAFT'
      OR current_commitment."current_version_id" <> NEW."id"
      OR NEW."based_on_version_id" IS NOT NULL
      OR NEW."correction_reason" IS NOT NULL
    THEN RAISE EXCEPTION 'invalid initial commitment version'; END IF;
  ELSE
    IF current_commitment."current_state" NOT IN ('DRAFT', 'AWAITING_EVIDENCE')
      OR current_commitment."current_version_id" <> NEW."based_on_version_id"
      OR NOT EXISTS (
        SELECT 1 FROM "episode_commitment_versions" AS prior
        WHERE prior."id" = NEW."based_on_version_id"
          AND prior."commitment_id" = NEW."commitment_id"
          AND prior."episode_id" = NEW."episode_id"
          AND prior."version_number" + 1 = NEW."version_number"
      )
    THEN RAISE EXCEPTION 'invalid replacement commitment version'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_commitment_event_insert() RETURNS trigger AS $$
DECLARE current_commitment "episode_commitments"%ROWTYPE;
DECLARE replacement "episode_commitment_versions"%ROWTYPE;
BEGIN
  SELECT * INTO current_commitment
  FROM "episode_commitments"
  WHERE "id" = NEW."commitment_id" AND "episode_id" = NEW."episode_id"
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'commitment event requires an existing commitment'; END IF;

  IF NEW."type" = 'COMMITMENT_DRAFT_CREATED' THEN
    IF current_commitment."revision" <> 1
      OR current_commitment."current_state" <> 'DRAFT'
      OR current_commitment."current_version_id" <> NEW."resulting_version_id"
    THEN RAISE EXCEPTION 'invalid commitment creation event'; END IF;
  ELSE
    IF NEW."resulting_revision" <> current_commitment."revision" + 1
      OR NEW."from_state" <> current_commitment."current_state"
      OR NEW."source_version_id" <> current_commitment."current_version_id"
    THEN RAISE EXCEPTION 'commitment event does not start from current revision'; END IF;

    IF NEW."type" = 'COMMITMENT_ACTIVATED'
      AND NEW."resulting_version_id" <> current_commitment."current_version_id"
    THEN RAISE EXCEPTION 'activation cannot replace the immutable snapshot'; END IF;

    IF NEW."type" = 'COMMITMENT_SUPERSEDED' THEN
      SELECT * INTO replacement FROM "episode_commitment_versions"
      WHERE "id" = NEW."resulting_version_id"
        AND "commitment_id" = NEW."commitment_id"
        AND "episode_id" = NEW."episode_id";
      IF NOT FOUND
        OR replacement."based_on_version_id" <> current_commitment."current_version_id"
        OR replacement."correction_reason" <> NEW."correction_reason"
      THEN RAISE EXCEPTION 'supersession requires a causally linked correction snapshot'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_commitment_guarded_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'episode commitments cannot be deleted'; END IF;
  IF ROW(OLD."id", OLD."episode_id", OLD."created_at") IS DISTINCT FROM
     ROW(NEW."id", NEW."episode_id", NEW."created_at")
  THEN RAISE EXCEPTION 'commitment identity and episode are immutable'; END IF;

  IF NEW."revision" <> OLD."revision" + 1 OR NOT EXISTS (
    SELECT 1 FROM "commitment_events" AS event
    WHERE event."commitment_id" = OLD."id"
      AND event."episode_id" = OLD."episode_id"
      AND event."resulting_revision" = NEW."revision"
      AND event."from_state" = OLD."current_state"
      AND event."to_state" = NEW."current_state"
      AND event."source_version_id" = OLD."current_version_id"
      AND event."resulting_version_id" = NEW."current_version_id"
      AND event."occurred_at" = NEW."updated_at"
  ) THEN RAISE EXCEPTION 'commitment changes require a matching append-only event'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commitment_definitions_no_update
  BEFORE UPDATE OR DELETE ON "commitment_definitions"
  FOR EACH ROW EXECUTE FUNCTION deny_commitment_history_mutation();
CREATE TRIGGER commitment_definition_versions_no_update
  BEFORE UPDATE OR DELETE ON "commitment_definition_versions"
  FOR EACH ROW EXECUTE FUNCTION deny_commitment_history_mutation();
CREATE TRIGGER episode_commitment_versions_validate_insert
  BEFORE INSERT ON "episode_commitment_versions"
  FOR EACH ROW EXECUTE FUNCTION enforce_commitment_version_insert();
CREATE TRIGGER episode_commitment_versions_no_update
  BEFORE UPDATE OR DELETE ON "episode_commitment_versions"
  FOR EACH ROW EXECUTE FUNCTION deny_commitment_history_mutation();
CREATE TRIGGER commitment_events_validate_insert
  BEFORE INSERT ON "commitment_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_commitment_event_insert();
CREATE TRIGGER commitment_events_no_update
  BEFORE UPDATE OR DELETE ON "commitment_events"
  FOR EACH ROW EXECUTE FUNCTION deny_commitment_history_mutation();
CREATE TRIGGER episode_commitments_guarded_update
  BEFORE UPDATE OR DELETE ON "episode_commitments"
  FOR EACH ROW EXECUTE FUNCTION enforce_commitment_guarded_update();
