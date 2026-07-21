-- Forward-only reconciliation for installations that applied an earlier task-guard definition.
-- This does not rewrite migration 20260720000100 and is safe on fresh databases.

CREATE OR REPLACE FUNCTION enforce_reviewed_alert_task_link() RETURNS trigger AS $$
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

CREATE OR REPLACE FUNCTION enforce_task_event_insert() RETURNS trigger AS $$
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

CREATE OR REPLACE FUNCTION enforce_task_guarded_update() RETURNS trigger AS $$
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

DROP TRIGGER IF EXISTS tasks_guarded_update ON "tasks";
DROP TRIGGER IF EXISTS tasks_require_reviewed_alert ON "tasks";
DROP TRIGGER IF EXISTS task_events_validate_insert ON "task_events";

CREATE TRIGGER tasks_guarded_update
  BEFORE UPDATE OR DELETE ON "tasks"
  FOR EACH ROW EXECUTE FUNCTION enforce_task_guarded_update();
CREATE TRIGGER tasks_require_reviewed_alert
  BEFORE INSERT ON "tasks"
  FOR EACH ROW EXECUTE FUNCTION enforce_reviewed_alert_task_link();
CREATE TRIGGER task_events_validate_insert
  BEFORE INSERT ON "task_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_task_event_insert();
