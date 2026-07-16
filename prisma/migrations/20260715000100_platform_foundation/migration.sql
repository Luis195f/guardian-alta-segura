CREATE TYPE "Role" AS ENUM ('admin', 'nurse', 'clinician', 'patient', 'caregiver', 'support');
CREATE TYPE "AuditAction" AS ENUM ('DEMO_LOGIN', 'SESSION_LOGOUT', 'ROLE_ASSIGNED', 'ROLE_REVOKED', 'CRITICAL_MUTATION');
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "synthetic_alias" VARCHAR(64) NOT NULL,
  "display_label" VARCHAR(160) NOT NULL,
  "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "assigned_by_id" TEXT,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session_metadata" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "session_token_hash" CHAR(64) NOT NULL,
  "authentication_method" VARCHAR(32) NOT NULL,
  "correlation_id" UUID NOT NULL,
  "user_agent_hash" CHAR(64),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "session_metadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "actor_role" "Role",
  "action" "AuditAction" NOT NULL,
  "resource_type" VARCHAR(64) NOT NULL,
  "resource_id" VARCHAR(128),
  "outcome" "AuditOutcome" NOT NULL,
  "correlation_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_synthetic_alias_key" ON "users"("synthetic_alias");
CREATE INDEX "role_assignments_user_id_revoked_at_idx" ON "role_assignments"("user_id", "revoked_at");
CREATE INDEX "role_assignments_assigned_by_id_idx" ON "role_assignments"("assigned_by_id");
CREATE UNIQUE INDEX "role_assignments_active_user_role_key"
  ON "role_assignments"("user_id", "role")
  WHERE "revoked_at" IS NULL;
CREATE UNIQUE INDEX "session_metadata_session_token_hash_key" ON "session_metadata"("session_token_hash");
CREATE INDEX "session_metadata_user_id_revoked_at_expires_at_idx" ON "session_metadata"("user_id", "revoked_at", "expires_at");
CREATE INDEX "audit_events_actor_user_id_created_at_idx" ON "audit_events"("actor_user_id", "created_at");
CREATE INDEX "audit_events_correlation_id_idx" ON "audit_events"("correlation_id");

ALTER TABLE "role_assignments"
  ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "role_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_metadata"
  ADD CONSTRAINT "session_metadata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION deny_audit_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION deny_audit_event_mutation();

CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION deny_audit_event_mutation();
