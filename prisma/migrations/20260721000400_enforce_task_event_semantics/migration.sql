-- Strengthen event-type semantics without modifying any applied migration.

CREATE OR REPLACE FUNCTION enforce_task_event_insert() RETURNS trigger AS $$
DECLARE current_task "tasks"%ROWTYPE;
BEGIN
  SELECT * INTO current_task FROM "tasks" WHERE "id" = NEW."task_id";
  IF NOT FOUND THEN RAISE EXCEPTION 'task event requires an existing task'; END IF;

  IF NEW."type" = 'created' THEN
    IF NEW."resulting_revision" <> 1
      OR current_task."revision" <> 1
      OR current_task."created_by_id" <> NEW."actor_user_id"
      OR NEW."from_state" IS NOT NULL
      OR NEW."to_state" <> 'open'
      OR current_task."current_state" <> NEW."to_state"
      OR current_task."assigned_to_id" IS DISTINCT FROM NEW."to_assigned_to_id"
      OR NEW."from_assigned_to_id" IS NOT NULL
      OR NEW."note" IS NOT NULL
      OR NEW."contact_outcome" IS NOT NULL
      OR NEW."resolution_reason" IS NOT NULL
    THEN RAISE EXCEPTION 'invalid task creation event'; END IF;
  ELSE
    IF current_task."revision" + 1 <> NEW."resulting_revision"
      OR current_task."current_state" <> NEW."from_state"
      OR current_task."assigned_to_id" IS DISTINCT FROM NEW."from_assigned_to_id"
    THEN RAISE EXCEPTION 'task event does not start from current revision'; END IF;

    IF NEW."type" = 'assigned' AND NOT (
      NEW."from_state" = 'open' AND NEW."to_state" = 'open'
      AND current_task."assigned_to_id" IS NULL AND NEW."to_assigned_to_id" IS NOT NULL
      AND NEW."note" IS NULL AND NEW."contact_outcome" IS NULL AND NEW."resolution_reason" IS NULL
    ) THEN RAISE EXCEPTION 'invalid task assignment event'; END IF;

    IF NEW."type" = 'reassigned' AND NOT (
      NEW."from_state" = 'open' AND NEW."to_state" = 'open'
      AND current_task."assigned_to_id" IS NOT NULL AND NEW."to_assigned_to_id" IS NOT NULL
      AND NEW."to_assigned_to_id" IS DISTINCT FROM current_task."assigned_to_id"
      AND NEW."note" IS NULL AND NEW."contact_outcome" IS NULL AND NEW."resolution_reason" IS NULL
    ) THEN RAISE EXCEPTION 'invalid task reassignment event'; END IF;

    IF NEW."type" = 'contact-attempt' AND NOT (
      NEW."from_state" = 'open' AND NEW."to_state" = 'open'
      AND NEW."to_assigned_to_id" IS NOT DISTINCT FROM current_task."assigned_to_id"
      AND NEW."contact_outcome" IS NOT NULL AND NEW."note" IS NULL AND NEW."resolution_reason" IS NULL
    ) THEN RAISE EXCEPTION 'invalid contact attempt event'; END IF;

    IF NEW."type" = 'note-recorded' AND NOT (
      NEW."from_state" = 'open' AND NEW."to_state" = 'open'
      AND NEW."to_assigned_to_id" IS NOT DISTINCT FROM current_task."assigned_to_id"
      AND char_length(btrim(COALESCE(NEW."note", ''))) >= 3
      AND NEW."contact_outcome" IS NULL AND NEW."resolution_reason" IS NULL
    ) THEN RAISE EXCEPTION 'invalid task note event'; END IF;

    IF NEW."type" = 'resolved' AND NOT (
      NEW."from_state" = 'open' AND NEW."to_state" = 'resolved'
      AND NEW."to_assigned_to_id" IS NOT DISTINCT FROM current_task."assigned_to_id"
      AND char_length(btrim(COALESCE(NEW."resolution_reason", ''))) >= 3
      AND NEW."note" IS NULL AND NEW."contact_outcome" IS NULL
    ) THEN RAISE EXCEPTION 'invalid task resolution event'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
