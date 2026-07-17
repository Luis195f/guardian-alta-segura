import type { Role } from "@/domain/auth/role";

export const AUDIT_ACTIONS = [
  "DEMO_LOGIN",
  "SESSION_LOGOUT",
  "ROLE_ASSIGNED",
  "ROLE_REVOKED",
  "CRITICAL_MUTATION",
  "LEGAL_RECORD_CREATED",
  "LEGAL_RECORD_REVOKED",
  "POLICY_VERSION_CREATED",
  "EPISODE_CREATED",
  "EPISODE_TRANSITIONED",
  "SAFETY_PLAN_VERSION_CREATED",
  "SAFETY_PLAN_VERSION_ACTIVATED",
  "SAFETY_PLAN_VERSION_INVALIDATED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditOutcome = "SUCCESS" | "DENIED" | "FAILURE";

export interface NewAuditEvent {
  readonly actorUserId: string | null;
  readonly actorRole: Role | null;
  readonly action: AuditAction;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: AuditOutcome;
  readonly correlationId: string;
  readonly createdAt: Date;
}
