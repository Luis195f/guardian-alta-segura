import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";

export class ActiveRoleConflictError extends Error {
  constructor() {
    super("Active role assignment already exists");
    this.name = "ActiveRoleConflictError";
  }
}

export interface NewSessionMetadata {
  readonly userId: string;
  readonly sessionTokenHash: string;
  readonly authenticationMethod: "demo-local" | "institutional";
  readonly correlationId: string;
  readonly userAgentHash: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface SecurityTransaction {
  createSession(input: NewSessionMetadata): Promise<{ readonly id: string }>;
  revokeSession(input: { readonly sessionId: string; readonly revokedAt: Date }): Promise<void>;
  appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }>;
  isActiveUserWithRole(userId: string, role: Role): Promise<boolean>;
  hasActiveRole(userId: string, role: Role): Promise<boolean>;
  getRoleAssignmentTarget(userId: string): Promise<{
    readonly syntheticAlias: string;
    readonly isActive: boolean;
    readonly isSynthetic: boolean;
  } | null>;
  createRoleAssignment(input: {
    readonly userId: string;
    readonly role: Role;
    readonly assignedById: string;
    readonly assignedAt: Date;
  }): Promise<{ readonly id: string }>;
}

export interface SecurityUnitOfWork {
  run<T>(operation: (transaction: SecurityTransaction) => Promise<T>): Promise<T>;
}
