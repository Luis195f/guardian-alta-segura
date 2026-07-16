import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  ActiveRoleAssignmentExistsError,
  AssignRoleService,
  RoleAssignmentDeniedError,
} from "@/application/admin/assign-role";
import { prisma } from "@/infrastructure/persistence/prisma";
import { PrismaSecurityUnitOfWork } from "@/infrastructure/persistence/prisma-security-unit-of-work";

const runFile = promisify(execFile);

function syntheticAlias(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

async function createSyntheticUser(prefix: string) {
  return prisma.user.create({
    data: {
      syntheticAlias: syntheticAlias(prefix),
      displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${prefix}`,
      isSynthetic: true,
    },
  });
}

async function createActiveAdmin(prefix: string) {
  const user = await createSyntheticUser(prefix);
  await prisma.roleAssignment.create({
    data: { userId: user.id, role: "admin", assignedById: null },
  });
  return user;
}

describe.sequential("PostgreSQL security transaction guarantees", () => {
  it("revierte la sesión si falla appendAuditEvent", async () => {
    const user = await createSyntheticUser("rollback-session");
    const sessionTokenHash = randomBytes(32).toString("hex");
    const unitOfWork = new PrismaSecurityUnitOfWork();

    await expect(
      unitOfWork.run(async (transaction) => {
        const session = await transaction.createSession({
          userId: user.id,
          sessionTokenHash,
          authenticationMethod: "demo-local",
          correlationId: randomUUID(),
          userAgentHash: null,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        });
        await transaction.appendAuditEvent({
          actorUserId: user.id,
          actorRole: null,
          action: "DEMO_LOGIN",
          resourceType: "SessionMetadata",
          resourceId: session.id,
          outcome: "SUCCESS",
          correlationId: "invalid-uuid",
          createdAt: new Date(),
        });
      }),
    ).rejects.toThrow();

    await expect(
      prisma.sessionMetadata.findUnique({ where: { sessionTokenHash } }),
    ).resolves.toBeNull();
  });

  it("revierte la asignación de rol si falla appendAuditEvent", async () => {
    const actor = await createSyntheticUser("rollback-role-actor");
    const target = await createSyntheticUser("rollback-role-target");
    const unitOfWork = new PrismaSecurityUnitOfWork();

    await expect(
      unitOfWork.run(async (transaction) => {
        const assignment = await transaction.createRoleAssignment({
          userId: target.id,
          role: "support",
          assignedById: actor.id,
          assignedAt: new Date(),
        });
        await transaction.appendAuditEvent({
          actorUserId: actor.id,
          actorRole: "admin",
          action: "ROLE_ASSIGNED",
          resourceType: "RoleAssignment",
          resourceId: assignment.id,
          outcome: "SUCCESS",
          correlationId: "invalid-uuid",
          createdAt: new Date(),
        });
      }),
    ).rejects.toThrow();

    await expect(
      prisma.roleAssignment.findFirst({
        where: { userId: target.id, role: "support", revokedAt: null },
      }),
    ).resolves.toBeNull();
  });

  it("bloquea UPDATE y DELETE sobre audit_events", async () => {
    const auditEvent = await prisma.auditEvent.create({
      data: {
        actorUserId: null,
        actorRole: null,
        action: "CRITICAL_MUTATION",
        resourceType: "SyntheticIntegrationTest",
        resourceId: randomUUID(),
        outcome: "SUCCESS",
        correlationId: randomUUID(),
      },
    });

    await expect(
      prisma.auditEvent.update({
        where: { id: auditEvent.id },
        data: { resourceType: "ForbiddenUpdate" },
      }),
    ).rejects.toThrow();
    await expect(prisma.auditEvent.delete({ where: { id: auditEvent.id } })).rejects.toThrow();
    await expect(prisma.auditEvent.findUnique({ where: { id: auditEvent.id } })).resolves.toEqual(
      auditEvent,
    );
  });

  it("confirma una mutación administrativa y su AuditEvent juntos", async () => {
    const actor = await createActiveAdmin("committed-admin");
    const target = await createSyntheticUser("committed-target");
    const correlationId = randomUUID();

    const result = await new AssignRoleService(new PrismaSecurityUnitOfWork()).execute({
      actor: { userId: actor.id, roles: ["nurse", "admin"], sessionId: randomUUID() },
      actingRole: "admin",
      targetUserId: target.id,
      role: "support",
      correlationId,
    });

    const [assignment, auditEvent] = await Promise.all([
      prisma.roleAssignment.findUnique({ where: { id: result.roleAssignmentId } }),
      prisma.auditEvent.findFirst({
        where: { resourceId: result.roleAssignmentId, correlationId },
      }),
    ]);
    expect(assignment).toMatchObject({ userId: target.id, role: "support" });
    expect(auditEvent).toMatchObject({
      actorUserId: actor.id,
      actorRole: "admin",
      action: "ROLE_ASSIGNED",
      outcome: "SUCCESS",
    });
  });

  it("deniega con un principal obsoleto si admin fue revocado antes de la transacción", async () => {
    const actor = await createActiveAdmin("revoked-admin");
    const target = await createSyntheticUser("revoked-admin-target");
    const correlationId = randomUUID();
    await prisma.roleAssignment.updateMany({
      where: { userId: actor.id, role: "admin", revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await expect(
      new AssignRoleService(new PrismaSecurityUnitOfWork()).execute({
        actor: { userId: actor.id, roles: ["admin"], sessionId: randomUUID() },
        actingRole: "admin",
        targetUserId: target.id,
        role: "support",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentDeniedError);
    await expect(
      prisma.roleAssignment.findFirst({ where: { userId: target.id, revokedAt: null } }),
    ).resolves.toBeNull();
    await expect(prisma.auditEvent.findFirst({ where: { correlationId } })).resolves.toBeNull();
  });

  it("deniega sin AuditEvent de éxito si el actor queda inactivo antes de la transacción", async () => {
    const actor = await createActiveAdmin("inactive-admin");
    const target = await createSyntheticUser("inactive-admin-target");
    const correlationId = randomUUID();
    await prisma.user.update({ where: { id: actor.id }, data: { isActive: false } });

    await expect(
      new AssignRoleService(new PrismaSecurityUnitOfWork()).execute({
        actor: { userId: actor.id, roles: ["admin"], sessionId: randomUUID() },
        actingRole: "admin",
        targetUserId: target.id,
        role: "support",
        correlationId,
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentDeniedError);
    await expect(
      prisma.roleAssignment.findFirst({ where: { userId: target.id, revokedAt: null } }),
    ).resolves.toBeNull();
    await expect(
      prisma.auditEvent.findFirst({
        where: { correlationId, action: "ROLE_ASSIGNED", outcome: "SUCCESS" },
      }),
    ).resolves.toBeNull();
  });

  it("resuelve una carrera del rol activo como un conflicto estable", async () => {
    const actor = await createActiveAdmin("race-admin");
    const target = await createSyntheticUser("race-target");
    const service = new AssignRoleService(new PrismaSecurityUnitOfWork());
    const baseInput = {
      actor: { userId: actor.id, roles: ["admin"] as const, sessionId: randomUUID() },
      actingRole: "admin" as const,
      targetUserId: target.id,
      role: "support" as const,
    };

    const results = await Promise.allSettled([
      service.execute({ ...baseInput, correlationId: randomUUID() }),
      service.execute({ ...baseInput, correlationId: randomUUID() }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejection = results.find(({ status }) => status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: expect.any(ActiveRoleAssignmentExistsError),
    });
    await expect(
      prisma.roleAssignment.count({
        where: { userId: target.id, role: "support", revokedAt: null },
      }),
    ).resolves.toBe(1);
  });

  it("normaliza roles demo inesperados, conserva historial y es idempotente", async () => {
    const supportUser = await prisma.user.findUniqueOrThrow({
      where: { syntheticAlias: "demo-support" },
    });
    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { syntheticAlias: "demo-admin" },
    });
    const unexpected = await prisma.roleAssignment.create({
      data: {
        userId: supportUser.id,
        role: "nurse",
        assignedById: adminUser.id,
      },
    });

    await runFile(process.execPath, ["prisma/seed.mjs"], {
      cwd: process.cwd(),
      env: process.env,
    });
    const activeRoles = await prisma.roleAssignment.findMany({
      where: { userId: supportUser.id, revokedAt: null },
      select: { role: true },
    });
    expect(activeRoles).toEqual([{ role: "support" }]);
    await expect(
      prisma.roleAssignment.findUnique({ where: { id: unexpected.id } }),
    ).resolves.toMatchObject({ revokedAt: expect.any(Date) });
    const auditCountAfterNormalization = await prisma.auditEvent.count({
      where: { action: "ROLE_REVOKED", resourceId: unexpected.id },
    });
    expect(auditCountAfterNormalization).toBe(1);

    await runFile(process.execPath, ["prisma/seed.mjs"], {
      cwd: process.cwd(),
      env: process.env,
    });
    await expect(
      prisma.auditEvent.count({
        where: { action: "ROLE_REVOKED", resourceId: unexpected.id },
      }),
    ).resolves.toBe(auditCountAfterNormalization);
  });
});
