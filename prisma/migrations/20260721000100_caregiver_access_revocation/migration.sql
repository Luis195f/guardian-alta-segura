ALTER TYPE "AuditAction" ADD VALUE 'CAREGIVER_INVITATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAREGIVER_INVITATION_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'CAREGIVER_SCOPE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'CAREGIVER_ACCESS_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'CAREGIVER_OBSERVATION_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'CAREGIVER_SESSION_LOGGED_OUT';

CREATE TYPE "CaregiverCapability" AS ENUM (
  'VIEW_PLAN_SECTIONS',
  'VIEW_ASSIGNED_TASKS',
  'SEND_OBSERVATIONS',
  'VIEW_AUTHORIZED_RESOURCES'
);

CREATE TYPE "CaregiverAccessAction" AS ENUM (
  'INVITATION_CREATED',
  'INVITATION_ACCEPTED',
  'INVITATION_DENIED',
  'PORTAL_READ',
  'OBSERVATION_SUBMITTED',
  'OBSERVATION_DENIED',
  'SCOPE_CHANGED',
  'ACCESS_REVOKED',
  'SESSION_DENIED',
  'SESSION_LOGGED_OUT'
);

CREATE TABLE "caregiver_profiles" (
  "id" TEXT NOT NULL,
  "caregiver_user_id" TEXT NOT NULL,
  "external_pseudonymous_id" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "caregiver_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caregiver_profiles_pseudonym_check"
    CHECK ("external_pseudonymous_id" ~ '^cg_[a-f0-9]{24}$')
);

CREATE TABLE "caregiver_authorization_scopes" (
  "id" TEXT NOT NULL,
  "caregiver_authorization_id" TEXT NOT NULL,
  "discharge_episode_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "capabilities" "CaregiverCapability"[] NOT NULL,
  "allowed_plan_sections" "SafetyPlanStep"[] NOT NULL,
  "authorized_resource_keys" TEXT[] NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "caregiver_authorization_scopes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caregiver_scopes_version_check" CHECK ("version" > 0),
  CONSTRAINT "caregiver_scopes_plan_dependency_check" CHECK (
    cardinality("allowed_plan_sections") = 0
    OR 'VIEW_PLAN_SECTIONS' = ANY("capabilities")
  ),
  CONSTRAINT "caregiver_scopes_resource_dependency_check" CHECK (
    cardinality("authorized_resource_keys") = 0
    OR 'VIEW_AUTHORIZED_RESOURCES' = ANY("capabilities")
  )
);

CREATE TABLE "caregiver_invitations" (
  "id" TEXT NOT NULL,
  "caregiver_authorization_id" TEXT NOT NULL,
  "caregiver_profile_id" TEXT NOT NULL,
  "discharge_episode_id" TEXT NOT NULL,
  "invitation_token_hash" CHAR(64) NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  CONSTRAINT "caregiver_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caregiver_invitations_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "caregiver_invitations_consumed_check"
    CHECK ("consumed_at" IS NULL OR "consumed_at" >= "created_at")
);

CREATE TABLE "caregiver_sessions" (
  "id" TEXT NOT NULL,
  "caregiver_authorization_id" TEXT NOT NULL,
  "caregiver_profile_id" TEXT NOT NULL,
  "discharge_episode_id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "session_token_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "caregiver_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caregiver_sessions_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "caregiver_sessions_revocation_check"
    CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at")
);

CREATE TABLE "caregiver_observations" (
  "id" TEXT NOT NULL,
  "caregiver_authorization_id" TEXT NOT NULL,
  "caregiver_profile_id" TEXT NOT NULL,
  "caregiver_session_id" TEXT NOT NULL,
  "discharge_episode_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "caregiver_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caregiver_observations_content_check"
    CHECK (char_length(btrim("content")) BETWEEN 3 AND 1000)
);

CREATE TABLE "caregiver_access_audits" (
  "id" TEXT NOT NULL,
  "caregiver_authorization_id" TEXT,
  "caregiver_profile_id" TEXT,
  "caregiver_session_id" TEXT,
  "actor_user_id" TEXT,
  "action" "CaregiverAccessAction" NOT NULL,
  "outcome" "AuditOutcome" NOT NULL,
  "resource_type" VARCHAR(64) NOT NULL,
  "resource_id" VARCHAR(128),
  "correlation_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "caregiver_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "caregiver_profiles_caregiver_user_id_key"
  ON "caregiver_profiles"("caregiver_user_id");
CREATE UNIQUE INDEX "caregiver_profiles_external_pseudonymous_id_key"
  ON "caregiver_profiles"("external_pseudonymous_id");
CREATE UNIQUE INDEX "caregiver_scopes_authorization_episode_version_key"
  ON "caregiver_authorization_scopes"("caregiver_authorization_id", "discharge_episode_id", "version");
CREATE INDEX "caregiver_scopes_authorization_episode_time_idx"
  ON "caregiver_authorization_scopes"("caregiver_authorization_id", "discharge_episode_id", "recorded_at");
CREATE UNIQUE INDEX "caregiver_invitations_invitation_token_hash_key"
  ON "caregiver_invitations"("invitation_token_hash");
CREATE UNIQUE INDEX "caregiver_invitations_identity_key"
  ON "caregiver_invitations"("id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id");
CREATE INDEX "caregiver_invitations_authorization_expiry_idx"
  ON "caregiver_invitations"("caregiver_authorization_id", "expires_at");
CREATE UNIQUE INDEX "caregiver_sessions_session_token_hash_key"
  ON "caregiver_sessions"("session_token_hash");
CREATE UNIQUE INDEX "caregiver_sessions_invitation_id_key"
  ON "caregiver_sessions"("invitation_id");
CREATE UNIQUE INDEX "caregiver_sessions_invitation_identity_key"
  ON "caregiver_sessions"("invitation_id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id");
CREATE UNIQUE INDEX "caregiver_sessions_identity_key"
  ON "caregiver_sessions"("id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id");
CREATE INDEX "caregiver_sessions_authorization_active_idx"
  ON "caregiver_sessions"("caregiver_authorization_id", "revoked_at", "expires_at");
CREATE INDEX "caregiver_observations_episode_time_idx"
  ON "caregiver_observations"("discharge_episode_id", "submitted_at");
CREATE INDEX "caregiver_access_audits_authorization_time_idx"
  ON "caregiver_access_audits"("caregiver_authorization_id", "created_at");
CREATE INDEX "caregiver_access_audits_correlation_idx"
  ON "caregiver_access_audits"("correlation_id");

ALTER TABLE "caregiver_profiles" ADD CONSTRAINT "caregiver_profiles_user_fkey"
  FOREIGN KEY ("caregiver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_authorization_scopes" ADD CONSTRAINT "caregiver_scopes_authorization_fkey"
  FOREIGN KEY ("caregiver_authorization_id") REFERENCES "caregiver_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_authorization_scopes" ADD CONSTRAINT "caregiver_scopes_episode_fkey"
  FOREIGN KEY ("discharge_episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_authorization_scopes" ADD CONSTRAINT "caregiver_scopes_actor_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_invitations" ADD CONSTRAINT "caregiver_invitations_authorization_fkey"
  FOREIGN KEY ("caregiver_authorization_id") REFERENCES "caregiver_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_invitations" ADD CONSTRAINT "caregiver_invitations_profile_fkey"
  FOREIGN KEY ("caregiver_profile_id") REFERENCES "caregiver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_invitations" ADD CONSTRAINT "caregiver_invitations_episode_fkey"
  FOREIGN KEY ("discharge_episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_invitations" ADD CONSTRAINT "caregiver_invitations_creator_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_sessions" ADD CONSTRAINT "caregiver_sessions_authorization_fkey"
  FOREIGN KEY ("caregiver_authorization_id") REFERENCES "caregiver_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_sessions" ADD CONSTRAINT "caregiver_sessions_profile_fkey"
  FOREIGN KEY ("caregiver_profile_id") REFERENCES "caregiver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_sessions" ADD CONSTRAINT "caregiver_sessions_episode_fkey"
  FOREIGN KEY ("discharge_episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_sessions" ADD CONSTRAINT "caregiver_sessions_invitation_identity_fkey"
  FOREIGN KEY ("invitation_id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id")
  REFERENCES "caregiver_invitations"("id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_observations" ADD CONSTRAINT "caregiver_observations_authorization_fkey"
  FOREIGN KEY ("caregiver_authorization_id") REFERENCES "caregiver_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_observations" ADD CONSTRAINT "caregiver_observations_profile_fkey"
  FOREIGN KEY ("caregiver_profile_id") REFERENCES "caregiver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_observations" ADD CONSTRAINT "caregiver_observations_session_identity_fkey"
  FOREIGN KEY ("caregiver_session_id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id")
  REFERENCES "caregiver_sessions"("id", "caregiver_authorization_id", "caregiver_profile_id", "discharge_episode_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_observations" ADD CONSTRAINT "caregiver_observations_episode_fkey"
  FOREIGN KEY ("discharge_episode_id") REFERENCES "discharge_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_access_audits" ADD CONSTRAINT "caregiver_access_audits_authorization_fkey"
  FOREIGN KEY ("caregiver_authorization_id") REFERENCES "caregiver_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_access_audits" ADD CONSTRAINT "caregiver_access_audits_profile_fkey"
  FOREIGN KEY ("caregiver_profile_id") REFERENCES "caregiver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_access_audits" ADD CONSTRAINT "caregiver_access_audits_session_fkey"
  FOREIGN KEY ("caregiver_session_id") REFERENCES "caregiver_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caregiver_access_audits" ADD CONSTRAINT "caregiver_access_audits_actor_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION assert_caregiver_episode_identity(
  authorization_id TEXT,
  profile_id TEXT,
  episode_id TEXT
) RETURNS void AS $$
DECLARE
  authorization_subject_id TEXT;
  authorization_caregiver_id TEXT;
  episode_subject_id TEXT;
  profile_caregiver_id TEXT;
BEGIN
  SELECT "subject_user_id", "caregiver_user_id"
    INTO authorization_subject_id, authorization_caregiver_id
    FROM "caregiver_authorizations"
    WHERE "id" = authorization_id
    FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'caregiver authorization does not exist'; END IF;

  IF EXISTS (
    SELECT 1 FROM "revocation_events"
    WHERE "target_type" = 'CAREGIVER_AUTHORIZATION'
      AND "target_record_id" = authorization_id
  ) THEN
    RAISE EXCEPTION 'caregiver authorization is revoked';
  END IF;

  SELECT patient."portal_user_id"
    INTO episode_subject_id
    FROM "discharge_episodes" episode
    JOIN "patients" patient ON patient."id" = episode."patient_id"
    WHERE episode."id" = episode_id;
  IF NOT FOUND OR episode_subject_id IS DISTINCT FROM authorization_subject_id THEN
    RAISE EXCEPTION 'caregiver episode subject mismatch';
  END IF;

  IF profile_id IS NOT NULL THEN
    SELECT "caregiver_user_id"
      INTO profile_caregiver_id
      FROM "caregiver_profiles"
      WHERE "id" = profile_id;
    IF NOT FOUND OR profile_caregiver_id IS DISTINCT FROM authorization_caregiver_id THEN
      RAISE EXCEPTION 'caregiver profile authorization mismatch';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_caregiver_scope_integrity() RETURNS trigger AS $$
BEGIN
  PERFORM assert_caregiver_episode_identity(
    NEW."caregiver_authorization_id",
    NULL,
    NEW."discharge_episode_id"
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_caregiver_invitation_integrity() RETURNS trigger AS $$
DECLARE
  authorization_subject_id TEXT;
BEGIN
  PERFORM assert_caregiver_episode_identity(
    NEW."caregiver_authorization_id",
    NEW."caregiver_profile_id",
    NEW."discharge_episode_id"
  );
  SELECT "subject_user_id" INTO authorization_subject_id
    FROM "caregiver_authorizations"
    WHERE "id" = NEW."caregiver_authorization_id";
  IF NEW."created_by_id" IS DISTINCT FROM authorization_subject_id THEN
    RAISE EXCEPTION 'caregiver invitation creator subject mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_caregiver_session_integrity() RETURNS trigger AS $$
DECLARE
  invitation_consumed_at TIMESTAMP(3);
  invitation_expires_at TIMESTAMP(3);
BEGIN
  PERFORM assert_caregiver_episode_identity(
    NEW."caregiver_authorization_id",
    NEW."caregiver_profile_id",
    NEW."discharge_episode_id"
  );
  SELECT "consumed_at", "expires_at"
    INTO invitation_consumed_at, invitation_expires_at
    FROM "caregiver_invitations"
    WHERE "id" = NEW."invitation_id";
  IF invitation_consumed_at IS NULL
    OR invitation_consumed_at > NEW."created_at"
    OR invitation_expires_at <= NEW."created_at"
  THEN
    RAISE EXCEPTION 'caregiver invitation is not consumable for session';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_caregiver_observation_integrity() RETURNS trigger AS $$
DECLARE
  session_expires_at TIMESTAMP(3);
  session_revoked_at TIMESTAMP(3);
BEGIN
  PERFORM assert_caregiver_episode_identity(
    NEW."caregiver_authorization_id",
    NEW."caregiver_profile_id",
    NEW."discharge_episode_id"
  );
  SELECT "expires_at", "revoked_at"
    INTO session_expires_at, session_revoked_at
    FROM "caregiver_sessions"
    WHERE "id" = NEW."caregiver_session_id";
  IF session_revoked_at IS NOT NULL OR session_expires_at <= NEW."submitted_at" THEN
    RAISE EXCEPTION 'caregiver session is not active for observation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION lock_caregiver_authorization_on_revocation() RETURNS trigger AS $$
BEGIN
  IF NEW."target_type" = 'CAREGIVER_AUTHORIZATION' THEN
    PERFORM 1 FROM "caregiver_authorizations"
      WHERE "id" = NEW."target_record_id"
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'caregiver authorization does not exist'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_caregiver_access_audit_integrity() RETURNS trigger AS $$
DECLARE
  session_authorization_id TEXT;
  session_profile_id TEXT;
  authorization_caregiver_id TEXT;
  profile_caregiver_id TEXT;
BEGIN
  IF NEW."caregiver_session_id" IS NOT NULL THEN
    SELECT "caregiver_authorization_id", "caregiver_profile_id"
      INTO session_authorization_id, session_profile_id
      FROM "caregiver_sessions"
      WHERE "id" = NEW."caregiver_session_id";
    IF NOT FOUND
      OR NEW."caregiver_authorization_id" IS DISTINCT FROM session_authorization_id
      OR NEW."caregiver_profile_id" IS DISTINCT FROM session_profile_id
    THEN
      RAISE EXCEPTION 'caregiver access audit session identity mismatch';
    END IF;
  ELSIF NEW."caregiver_authorization_id" IS NOT NULL
    AND NEW."caregiver_profile_id" IS NOT NULL
  THEN
    SELECT "caregiver_user_id" INTO authorization_caregiver_id
      FROM "caregiver_authorizations"
      WHERE "id" = NEW."caregiver_authorization_id";
    SELECT "caregiver_user_id" INTO profile_caregiver_id
      FROM "caregiver_profiles"
      WHERE "id" = NEW."caregiver_profile_id";
    IF authorization_caregiver_id IS DISTINCT FROM profile_caregiver_id THEN
      RAISE EXCEPTION 'caregiver access audit profile identity mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_caregiver_invitation_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'caregiver invitations cannot be deleted'; END IF;
  IF OLD."consumed_at" IS NOT NULL
    OR NEW."consumed_at" IS NULL
    OR ROW(OLD."id", OLD."caregiver_authorization_id", OLD."caregiver_profile_id",
      OLD."discharge_episode_id", OLD."invitation_token_hash", OLD."created_by_id",
      OLD."created_at", OLD."expires_at")
      IS DISTINCT FROM
      ROW(NEW."id", NEW."caregiver_authorization_id", NEW."caregiver_profile_id",
      NEW."discharge_episode_id", NEW."invitation_token_hash", NEW."created_by_id",
      NEW."created_at", NEW."expires_at")
  THEN RAISE EXCEPTION 'caregiver invitation history is immutable'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION enforce_caregiver_session_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'caregiver sessions cannot be deleted'; END IF;
  IF OLD."revoked_at" IS NOT NULL
    OR NEW."revoked_at" IS NULL
    OR ROW(OLD."id", OLD."caregiver_authorization_id", OLD."caregiver_profile_id",
      OLD."invitation_id", OLD."session_token_hash", OLD."created_at", OLD."expires_at")
      IS DISTINCT FROM
      ROW(NEW."id", NEW."caregiver_authorization_id", NEW."caregiver_profile_id",
      NEW."invitation_id", NEW."session_token_hash", NEW."created_at", NEW."expires_at")
  THEN RAISE EXCEPTION 'caregiver session history is immutable'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER caregiver_profiles_no_update
  BEFORE UPDATE OR DELETE ON "caregiver_profiles"
  FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER caregiver_scopes_no_update
  BEFORE UPDATE OR DELETE ON "caregiver_authorization_scopes"
  FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER caregiver_scopes_integrity
  BEFORE INSERT ON "caregiver_authorization_scopes"
  FOR EACH ROW EXECUTE FUNCTION enforce_caregiver_scope_integrity();
CREATE TRIGGER caregiver_invitations_integrity
  BEFORE INSERT ON "caregiver_invitations"
  FOR EACH ROW EXECUTE FUNCTION enforce_caregiver_invitation_integrity();
CREATE TRIGGER caregiver_invitations_guard_update
  BEFORE UPDATE OR DELETE ON "caregiver_invitations"
  FOR EACH ROW EXECUTE FUNCTION enforce_caregiver_invitation_update();
CREATE TRIGGER caregiver_sessions_guard_update
  BEFORE UPDATE OR DELETE ON "caregiver_sessions"
  FOR EACH ROW EXECUTE FUNCTION enforce_caregiver_session_update();
CREATE TRIGGER caregiver_sessions_integrity
  BEFORE INSERT ON "caregiver_sessions"
  FOR EACH ROW EXECUTE FUNCTION enforce_caregiver_session_integrity();
CREATE TRIGGER caregiver_observations_no_update
  BEFORE UPDATE OR DELETE ON "caregiver_observations"
  FOR EACH ROW EXECUTE FUNCTION deny_legal_history_mutation();
CREATE TRIGGER caregiver_observations_integrity
  BEFORE INSERT ON "caregiver_observations"
  FOR EACH ROW EXECUTE FUNCTION enforce_caregiver_observation_integrity();
CREATE TRIGGER caregiver_access_audits_no_update
  BEFORE UPDATE OR DELETE ON "caregiver_access_audits"
  FOR EACH ROW EXECUTE FUNCTION deny_audit_event_mutation();
CREATE TRIGGER caregiver_access_audits_integrity
  BEFORE INSERT ON "caregiver_access_audits"
  FOR EACH ROW EXECUTE FUNCTION enforce_caregiver_access_audit_integrity();
CREATE TRIGGER caregiver_revocation_lock
  BEFORE INSERT ON "revocation_events"
  FOR EACH ROW EXECUTE FUNCTION lock_caregiver_authorization_on_revocation();
