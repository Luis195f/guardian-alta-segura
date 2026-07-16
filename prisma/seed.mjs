import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const syntheticUsers = [
  { alias: "demo-admin", role: "admin" },
  { alias: "demo-nurse", role: "nurse" },
  { alias: "demo-clinician", role: "clinician" },
  { alias: "demo-patient", role: "patient" },
  { alias: "demo-caregiver", role: "caregiver" },
  { alias: "demo-support", role: "support" },
];

async function main() {
  const normalizedAt = new Date();
  const correlationId = randomUUID();

  await prisma.$transaction(async (transaction) => {
    const users = new Map();

    for (const { alias, role } of syntheticUsers) {
      const user = await transaction.user.upsert({
        where: { syntheticAlias: alias },
        create: {
          syntheticAlias: alias,
          displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
          isSynthetic: true,
        },
        update: {
          displayLabel: `SINTÉTICO / NO USO CLÍNICO — ${role}`,
          isActive: true,
          isSynthetic: true,
        },
      });
      users.set(alias, user);
    }

    const admin = users.get("demo-admin");
    if (!admin) throw new Error("Synthetic admin seed failed");

    for (const { alias, role } of syntheticUsers) {
      const user = users.get(alias);
      if (!user) throw new Error("Synthetic user seed failed");

      const unexpectedAssignments = await transaction.roleAssignment.findMany({
        where: { userId: user.id, revokedAt: null, NOT: { role } },
        select: { id: true },
      });
      for (const assignment of unexpectedAssignments) {
        await transaction.roleAssignment.update({
          where: { id: assignment.id },
          data: { revokedAt: normalizedAt },
        });
        await transaction.auditEvent.create({
          data: {
            actorUserId: null,
            actorRole: null,
            action: "ROLE_REVOKED",
            resourceType: "RoleAssignment",
            resourceId: assignment.id,
            outcome: "SUCCESS",
            correlationId,
            createdAt: normalizedAt,
          },
        });
      }

      const activeAssignment = await transaction.roleAssignment.findFirst({
        where: { userId: user.id, role, revokedAt: null },
        select: { id: true },
      });

      if (!activeAssignment) {
        const assignment = await transaction.roleAssignment.create({
          data: {
            userId: user.id,
            role,
            assignedById: alias === "demo-admin" ? null : admin.id,
            assignedAt: normalizedAt,
          },
          select: { id: true },
        });
        await transaction.auditEvent.create({
          data: {
            actorUserId: null,
            actorRole: null,
            action: "ROLE_ASSIGNED",
            resourceType: "RoleAssignment",
            resourceId: assignment.id,
            outcome: "SUCCESS",
            correlationId,
            createdAt: normalizedAt,
          },
        });
      }
    }
  });
}

main()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
