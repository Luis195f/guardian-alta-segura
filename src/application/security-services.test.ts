import { describe, expect, it } from "vitest";

import {
  ActiveRoleAssignmentExistsError,
  AssignRoleService,
  RoleAssignmentDeniedError,
  RoleAssignmentTargetDeniedError,
} from "@/application/admin/assign-role";
import { DemoLoginService } from "@/application/auth/demo-login";
import type { DemoIdentityProvider } from "@/application/ports/identity-provider";
import {
  ActiveRoleConflictError,
  type NewSessionMetadata,
  type SecurityTransaction,
  type SecurityUnitOfWork,
} from "@/application/ports/security-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";

class MemorySecurityUnitOfWork implements SecurityUnitOfWork, SecurityTransaction {
  readonly sessions: NewSessionMetadata[] = [];
  readonly auditEvents: NewAuditEvent[] = [];
  readonly roleAssignments: { userId: string; role: Role; assignedById: string }[] = [];
  readonly inactiveUserIds = new Set<string>();
  readonly missingTargetIds = new Set<string>();
  readonly targets = new Map<
    string,
    { syntheticAlias: string; isActive: boolean; isSynthetic: boolean }
  >();
  throwRoleConflict = false;

  async run<T>(operation: (transaction: SecurityTransaction) => Promise<T>): Promise<T> {
    return operation(this);
  }

  async createSession(input: NewSessionMetadata): Promise<{ readonly id: string }> {
    this.sessions.push(input);
    return { id: "session-1" };
  }

  async revokeSession(): Promise<void> {}

  async appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }> {
    this.auditEvents.push(input);
    return { id: `audit-${this.auditEvents.length}` };
  }

  async isActiveUserWithRole(userId: string, role: Role): Promise<boolean> {
    return !this.inactiveUserIds.has(userId) && (await this.hasActiveRole(userId, role));
  }

  async hasActiveRole(userId: string, role: Role): Promise<boolean> {
    return this.roleAssignments.some(
      (assignment) => assignment.userId === userId && assignment.role === role,
    );
  }

  async getRoleAssignmentTarget(userId: string): Promise<{
    readonly syntheticAlias: string;
    readonly isActive: boolean;
    readonly isSynthetic: boolean;
  } | null> {
    if (this.missingTargetIds.has(userId)) return null;
    return (
      this.targets.get(userId) ?? {
        syntheticAlias: `assignable-${userId}`,
        isActive: true,
        isSynthetic: true,
      }
    );
  }

  async createRoleAssignment(input: {
    readonly userId: string;
    readonly role: Role;
    readonly assignedById: string;
  }): Promise<{ readonly id: string }> {
    if (this.throwRoleConflict) {
      throw new ActiveRoleConflictError();
    }
    this.roleAssignments.push(input);
    return { id: `role-${this.roleAssignments.length}` };
  }
}

const fixedNow = new Date("2026-07-15T10:00:00.000Z");
const demoTtlMilliseconds = 8 * 60 * 60 * 1000;

function grantAdmin(unitOfWork: MemorySecurityUnitOfWork, userId = "synthetic-admin") {
  unitOfWork.roleAssignments.push({
    userId,
    role: "admin",
    assignedById: "synthetic-seed",
  });
}

describe("critical security mutations", () => {
  it("crea sesión y AuditEvent de login demo en la misma unidad de trabajo", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    const identityProvider: DemoIdentityProvider = {
      kind: "demo-local",
      async authenticate() {
        return { userId: "synthetic-nurse", roles: ["nurse"], isSynthetic: true };
      },
    };
    const service = new DemoLoginService(
      identityProvider,
      unitOfWork,
      { issue: () => ({ raw: "raw-token", hash: "hashed-token" }) },
      demoTtlMilliseconds,
      () => fixedNow,
    );

    const result = await service.execute({
      syntheticAlias: "demo-nurse",
      correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      userAgentHash: "synthetic-user-agent-hash",
    });

    expect(result.rawSessionToken).toBe("raw-token");
    expect(unitOfWork.sessions).toHaveLength(1);
    expect(unitOfWork.sessions[0]?.sessionTokenHash).toBe("hashed-token");
    expect(unitOfWork.auditEvents).toEqual([
      expect.objectContaining({
        action: "DEMO_LOGIN",
        actorUserId: "synthetic-nurse",
        actorRole: null,
        resourceId: "session-1",
        outcome: "SUCCESS",
      }),
    ]);
  });

  it("audita una denegación demo sin persistir el alias intentado", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    const identityProvider: DemoIdentityProvider = {
      kind: "demo-local",
      async authenticate() {
        return null;
      },
    };
    const service = new DemoLoginService(
      identityProvider,
      unitOfWork,
      { issue: () => ({ raw: "unused", hash: "unused" }) },
      demoTtlMilliseconds,
      () => fixedNow,
    );

    await expect(
      service.execute({
        syntheticAlias: "demo-nurse",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
        userAgentHash: null,
      }),
    ).rejects.toThrow("Authentication denied");
    expect(unitOfWork.sessions).toHaveLength(0);
    expect(unitOfWork.auditEvents).toEqual([
      expect.objectContaining({
        actorUserId: null,
        resourceId: null,
        outcome: "DENIED",
      }),
    ]);
    expect(JSON.stringify(unitOfWork.auditEvents)).not.toContain("demo-nurse");
  });

  it("crea AuditEvent al asignar un rol administrativo", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    grantAdmin(unitOfWork);
    const service = new AssignRoleService(unitOfWork, () => fixedNow);

    const result = await service.execute({
      actor: { userId: "synthetic-admin", roles: ["admin"], sessionId: "session-admin" },
      actingRole: "admin",
      targetUserId: "synthetic-support",
      role: "support",
      correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
    });

    expect(result.roleAssignmentId).toBe("role-2");
    expect(unitOfWork.auditEvents).toEqual([
      expect.objectContaining({
        action: "ROLE_ASSIGNED",
        actorRole: "admin",
        resourceId: result.roleAssignmentId,
      }),
    ]);
  });

  it("deniega administración por rol y no genera mutación ni auditoría de éxito", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    const service = new AssignRoleService(unitOfWork);

    await expect(
      service.execute({
        actor: { userId: "synthetic-support", roles: ["support"], sessionId: "session" },
        actingRole: "support",
        targetUserId: "synthetic-patient",
        role: "patient",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentDeniedError);
    expect(unitOfWork.roleAssignments).toHaveLength(0);
    expect(unitOfWork.auditEvents).toHaveLength(0);
  });

  it("impide que admin se autoasigne un rol clínico", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    grantAdmin(unitOfWork);
    const service = new AssignRoleService(unitOfWork);
    await expect(
      service.execute({
        actor: { userId: "synthetic-admin", roles: ["admin"], sessionId: "session" },
        actingRole: "admin",
        targetUserId: "synthetic-admin",
        role: "nurse",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentDeniedError);
  });

  it("evita asignaciones activas duplicadas", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    grantAdmin(unitOfWork);
    unitOfWork.roleAssignments.push({
      userId: "synthetic-support",
      role: "support",
      assignedById: "synthetic-admin",
    });
    const service = new AssignRoleService(unitOfWork);

    await expect(
      service.execute({
        actor: { userId: "synthetic-admin", roles: ["admin"], sessionId: "session" },
        actingRole: "admin",
        targetUserId: "synthetic-support",
        role: "support",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      }),
    ).rejects.toBeInstanceOf(ActiveRoleAssignmentExistsError);
  });

  it("usa el rol actuante explícito para un principal con varios roles", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    grantAdmin(unitOfWork);
    const service = new AssignRoleService(unitOfWork, () => fixedNow);

    await service.execute({
      actor: {
        userId: "synthetic-admin",
        roles: ["nurse", "admin"],
        sessionId: "session-admin",
      },
      actingRole: "admin",
      targetUserId: "synthetic-support",
      role: "support",
      correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
    });

    expect(unitOfWork.auditEvents[0]?.actorRole).toBe("admin");
  });

  it("revalida que el rol admin sigue activo dentro de la unidad de trabajo", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    const service = new AssignRoleService(unitOfWork);

    await expect(
      service.execute({
        actor: { userId: "revoked-admin", roles: ["admin"], sessionId: "stale-session" },
        actingRole: "admin",
        targetUserId: "synthetic-support",
        role: "support",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentDeniedError);
    expect(unitOfWork.roleAssignments).toHaveLength(0);
    expect(unitOfWork.auditEvents).toHaveLength(0);
  });

  it("revalida que el usuario administrador sigue activo", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    grantAdmin(unitOfWork);
    unitOfWork.inactiveUserIds.add("synthetic-admin");

    await expect(
      new AssignRoleService(unitOfWork).execute({
        actor: { userId: "synthetic-admin", roles: ["admin"], sessionId: "stale-session" },
        actingRole: "admin",
        targetUserId: "synthetic-target",
        role: "support",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentDeniedError);
    expect(unitOfWork.auditEvents).toHaveLength(0);
  });

  it.each([
    ["inexistente", null],
    ["inactivo", { syntheticAlias: "inactive-target", isActive: false, isSynthetic: true }],
    ["no sintético", { syntheticAlias: "external-target", isActive: true, isSynthetic: false }],
    ["identidad demo fija", { syntheticAlias: "demo-support", isActive: true, isSynthetic: true }],
  ])("deniega un target %s sin mutación ni auditoría", async (_label, target) => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    grantAdmin(unitOfWork);
    if (target === null) {
      unitOfWork.missingTargetIds.add("target");
    } else {
      unitOfWork.targets.set("target", target);
    }

    await expect(
      new AssignRoleService(unitOfWork).execute({
        actor: { userId: "synthetic-admin", roles: ["admin"], sessionId: "session" },
        actingRole: "admin",
        targetUserId: "target",
        role: "nurse",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentTargetDeniedError);
    expect(unitOfWork.roleAssignments).toHaveLength(1);
    expect(unitOfWork.auditEvents).toHaveLength(0);
  });

  it("convierte la carrera del índice único en conflicto estable", async () => {
    const unitOfWork = new MemorySecurityUnitOfWork();
    grantAdmin(unitOfWork);
    unitOfWork.throwRoleConflict = true;
    const service = new AssignRoleService(unitOfWork);

    await expect(
      service.execute({
        actor: { userId: "synthetic-admin", roles: ["admin"], sessionId: "session" },
        actingRole: "admin",
        targetUserId: "synthetic-support",
        role: "support",
        correlationId: "018f673a-4e35-7060-99b5-7bc6feba3a97",
      }),
    ).rejects.toBeInstanceOf(ActiveRoleAssignmentExistsError);
  });
});
