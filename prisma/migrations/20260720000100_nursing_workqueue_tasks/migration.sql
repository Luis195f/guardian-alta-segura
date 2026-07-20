ALTER TYPE "AuditAction" ADD VALUE 'TASK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_REASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_CONTACT_ATTEMPT_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_NOTE_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_RESOLVED';

CREATE TYPE "TaskState" AS ENUM ('open', 'resolved');
CREATE TYPE "TaskEventType" AS ENUM (
  'created',
  'assigned',
  'reassigned',
  'contact-attempt',
  'note-recorded',
  'resolved'
);
CREATE TYPE "ContactAttemptOutcome" AS ENUM ('reached', 'no-answer', 'other');

CREATE UNIQUE INDEX "alerts_id_episode_key" ON "alerts"("id", "episode_id");

CREATE TABLE "tasks" (
  "id" TEXT NOT NULL,
  "episode_id" TEXT NOT NULL,
  "alert_id" TEXT,
  "summary" VARCHAR(160) NOT NULL,
  "current_state" "TaskState" NOT NULL DEFAULT 'open',
  "assigned_to_id" TEXT,
  "created_by_id" TEXT NOT NULL,
  "creation_idempotency_key" VARCHAR(112) NOT NULL,
  "creation_fingerprint" CHAR(64) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "resolved_by_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "resolution_reason" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tasks_summary_check" CHECK (char_length(btrim("summary")) BETWEEN 5 AND 160),
  CONSTRAINT "tasks_idempotency_key_check"
    CHECK ("creation_idempotency_key" ~ '^[A-Za-z0-9._:-]{8,112}$'),
  CONSTRAINT "tasks_fingerprint_check" CHECK ("creation_fingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "tasks_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "tasks_resolution_fields_check" CHECK (
    ("current_state" = 'open'
      AND "resolved_by_id" IS NULL
      AND "resolved_at" IS NULL
      AND "resolution_reason" IS NULL)
    OR
    ("current_state" = 'resolved'
      AND "resolved_by_id" IS NOT NULL
      AND "resolved_at" IS NOT NULL
      AND char_length(btrim(COALESCE("resolution_reason", ''))) BETWEEN 3 AND 500)
  )
);

CREATE TABLE "task_events" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "type" "TaskEventType" NOT NULL,
  "from_state" "TaskState",
  "to_state" "TaskState" NOT NULL,
  "from_assigned_to_id" TEXT,
  "to_assigned_to_id" TEXT,
  "note" VARCHAR(280),
  "contact_outcome" "ContactAttemptOutcome",
  "resolution_reason" VARCHAR(500),
  "actor_user_id" TEXT NOT NULL,
  "actor_role" "Role" NOT NULL,
  "idempotency_key" VARCHAR(112) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "resulting_revision" INTEGER NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_events_idempotency_key_check"
    CHECK ("idempotency_key" ~ '^[A-Za-z0-9._:-]{8,112}$'),
  CONSTRAINT "task_events_fingerprint_check" CHECK ("request_fingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "task_events_revision_check" CHECK ("resulting_revision" > 0),
  CONSTRAINT "task_events_shape_check" CHECK (
    ("type" = 'created'
      AND "from_state" IS NULL
      AND "to_state" = 'open'
      AND "note" IS NULL
      AND "contact_outcome" IS NULL
      AND "resolution_reason" IS NULL)
    OR
    ("type" = 'assigned'
      AND "from_state" = 'open'
      AND "to_state" = 'open'
      AND "from_assigned_to_id" IS NULL
      AND "to_assigned_to_id" IS NOT NULL
      AND "note" IS NULL
      AND "contact_outcome" IS NULL
      AND "resolution_reason" IS NULL)
    OR
    ("type" = 'reassigned'
      AND "from_state" = 'open'
      AND "to_state" = 'open'
      AND "from_assigned_to_id" IS NOT NULL
      AND "to_assigned_to_id" IS NOT NULL
      AND "from_assigned_to_id" <> "to_assigned_to_id"
      AND "note" IS NULL
      AND "contact_outcome" IS NULL
      AND "resolution_reason" IS NULL)
    OR
    ("type" = 'contact-attempt'
      AND "from_state" = 'open'
      AND "to_state" = 'open'
      AND "from_assigned_to_id" IS NOT DISTINCT FROM "to_assigned_to_id"
      AND "contact_outcome" IS NOT NULL
      AND "note" IS NULL
      AND "resolution_reason" IS NULL)
    OR
    ("type" = 'note-recorded'
      AND "from_state" = 'open'
      AND "to_state" = 'open'
      AND "from_assigned_to_id" IS NOT DISTINCT FROM "to_assigned_to_id"
      AND char_length(btrim(COALESCE("note", ''))) BETWEEN 3 AND 280
      AND "contact_outcome" IS NULL
      AND "resolution_reason" IS NULL)
    OR
    ("type" = 'resolved'
      AND "from_state" = 'open'
      AND "to_state" = 'resolved'
      AND "from_assigned_to_id" IS NOT DISTINCT FROM "to_assigned_to_id"
      AND char_length(btrim(COALESCE("resolution_reason", ''))) BETWEEN 3 AND 500
      AND "note" IS NULL
      AND "contact_outcome" IS NULL)
  )
);

CREATE UNIQUE INDEX "tasks_creator_idempotency_key"
  ON "tasks"("created_by_id", "creation_idempotency_key");
CREATE UNIQUE INDEX "tasks_id_revision_key" ON "tasks"("id", "revision");
CREATE INDEX "tasks_episode_state_created_idx"
  ON "tasks"("episode_id", "current_state", "created_at");
CREATE INDEX "tasks_assignee_state_created_idx"
  ON "tasks"("assigned_to_id", "current_state", "created_at");
CREATE UNIQUE INDEX "task_events_actor_idempotency_key"
  ON "task_events"("actor_user_id", "idempotency_key");
CREATE UNIQUE INDEX "task_events_task_revision_key"
  ON "task_events"("task_id", "resulting_revision");
CREATE INDEX "task_events_task_time_idx" ON "task_events"("task_id", "occurred_at");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_episode_fkey"
  FOREIGN KEY ("episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_alert_episode_fkey"
  FOREIGN KEY ("alert_id", "episode_id") REFERENCES "alerts"("id", "episode_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_fkey"
  FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_resolver_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_actor_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_assignee_from_fkey"
  FOREIGN KEY ("from_assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_assignee_to_fkey"
  FOREIGN KEY ("to_assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION deny_task_event_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'task event history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_reviewed_alert_task_link() RETURNS trigger AS $$
BEGIN
  IF NEW."alert_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "alerts" AS alert
    WHERE alert."id" = NEW."alert_id"
      AND alert."episode_id" = NEW."episode_id"
      AND alert."current_state" <> 'open'
      AND EXISTS (
        SELECT 1 FROM "alert_reviews" AS review WHERE review."alert_id" = alert."id"
      )
  ) THEN
    RAISE EXCEPTION 'linked alert requires prior human review' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_task_event_insert() RETURNS trigger AS $$
DECLARE current_task "tasks"%ROWTYPE;
BEGIN
  SELECT * INTO current_task FROM "tasks" WHERE "id" = NEW."task_id";
  IF NOT FOUND THEN RAISE EXCEPTION 'task event requires an existing task'; END IF;
  IF NEW."type" = 'created' THEN
    IF NEW."resulting_revision" <> 1
      OR current_task."revision" <> 1
      OR current_task."created_by_id" <> NEW."actor_user_id"
      OR current_task."current_state" <> NEW."to_state"
      OR current_task."assigned_to_id" IS DISTINCT FROM NEW."to_assigned_to_id"
    THEN
      RAISE EXCEPTION 'invalid task creation event';
    END IF;
  ELSIF current_task."revision" + 1 <> NEW."resulting_revision"
    OR current_task."current_state" <> NEW."from_state"
    OR current_task."assigned_to_id" IS DISTINCT FROM NEW."from_assigned_to_id"
  THEN
    RAISE EXCEPTION 'task event does not start from current revision';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_task_guarded_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'tasks cannot be deleted'; END IF;
  IF ROW(
    OLD."id", OLD."episode_id", OLD."alert_id", OLD."summary", OLD."created_by_id",
    OLD."creation_idempotency_key", OLD."creation_fingerprint", OLD."created_at"
  ) IS DISTINCT FROM ROW(
    NEW."id", NEW."episode_id", NEW."alert_id", NEW."summary", NEW."created_by_id",
    NEW."creation_idempotency_key", NEW."creation_fingerprint", NEW."created_at"
  ) THEN
    RAISE EXCEPTION 'task origin is immutable';
  END IF;
  IF NEW."revision" <> OLD."revision" + 1 OR NOT EXISTS (
    SELECT 1 FROM "task_events" AS event
    WHERE event."task_id" = OLD."id"
      AND event."resulting_revision" = NEW."revision"
      AND event."from_state" = OLD."current_state"
      AND event."to_state" = NEW."current_state"
      AND event."from_assigned_to_id" IS NOT DISTINCT FROM OLD."assigned_to_id"
      AND event."to_assigned_to_id" IS NOT DISTINCT FROM NEW."assigned_to_id"
      AND (
        (NEW."current_state" = 'open'
          AND NEW."resolved_by_id" IS NULL
          AND NEW."resolved_at" IS NULL
          AND NEW."resolution_reason" IS NULL)
        OR
        (NEW."current_state" = 'resolved'
          AND event."type" = 'resolved'
          AND NEW."resolved_by_id" = event."actor_user_id"
          AND NEW."resolved_at" = event."occurred_at"
          AND NEW."resolution_reason" = event."resolution_reason")
      )
  ) THEN
    RAISE EXCEPTION 'task changes require a matching append-only event';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_guarded_update
  BEFORE UPDATE OR DELETE ON "tasks"
  FOR EACH ROW EXECUTE FUNCTION enforce_task_guarded_update();
CREATE TRIGGER tasks_require_reviewed_alert
  BEFORE INSERT ON "tasks"
  FOR EACH ROW EXECUTE FUNCTION enforce_reviewed_alert_task_link();
CREATE TRIGGER task_events_validate_insert
  BEFORE INSERT ON "task_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_task_event_insert();
CREATE TRIGGER task_events_no_update
  BEFORE UPDATE OR DELETE ON "task_events"
  FOR EACH ROW EXECUTE FUNCTION deny_task_event_history_mutation();
