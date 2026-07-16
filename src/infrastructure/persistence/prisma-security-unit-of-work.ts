import { Prisma } from "@prisma/client";

import {
  ActiveRoleConflictError,
  type NewSessionMetadata,
  type SecurityTransaction,
  type SecurityUnitOfWork,
} from "@/application/ports/security-unit-of-work";
import type { NewAuditEvent } from "@/domain/audit/audit-event";
import type { Role } from "@/domain/auth/role";
import { prisma } from "@/infrastructure/persistence/prisma";

class PrismaSecurityTransaction implements SecurityTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async createSession(input: NewSessionMetadata): Promise<{ readonly id: string }> {
    return this.transaction.sessionMetadata.create({ data: input, select: { id: true } });
  }

  async revokeSession(input: {
    readonly sessionId: string;
    readonly revokedAt: Date;
  }): Promise<void> {
    await this.transaction.sessionMetadata.updateMany({
      where: { id: input.sessionId, revokedAt: null },
      data: { revokedAt: input.revokedAt },
    });
  }

  async appendAuditEvent(input: NewAuditEvent): Promise<{ readonly id: string }> {
    return this.transaction.auditEvent.create({ data: input, select: { id: true } });
  }

  async isActiveUserWithRole(userId: string, role: Role): Promise<boolean> {
    const user = await this.transaction.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        roleAssignments: { some: { role, revokedAt: null } },
      },
      select: { id: true },
    });
    return user !== null;
  }

  async hasActiveRole(userId: string, role: Role): Promise<boolean> {
    const assignment = await this.transaction.roleAssignment.findFirst({
      where: { userId, role, revokedAt: null },
      select: { id: true },
    });
    return assignment !== null;
  }

  async getRoleAssignmentTarget(userId: string): Promise<{
    readonly syntheticAlias: string;
    readonly isActive: boolean;
    readonly isSynthetic: boolean;
  } | null> {
    return this.transaction.user.findUnique({
      where: { id: userId },
      select: { syntheticAlias: true, isActive: true, isSynthetic: true },
    });
  }

  async createRoleAssignment(input: {
    readonly userId: string;
    readonly role: Role;
    readonly assignedById: string;
    readonly assignedAt: Date;
  }): Promise<{ readonly id: string }> {
    try {
      return await this.transaction.roleAssignment.create({ data: input, select: { id: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ActiveRoleConflictError();
      }
      throw error;
    }
  }
}

export class PrismaSecurityUnitOfWork implements SecurityUnitOfWork {
  async run<T>(operation: (transaction: SecurityTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction((transaction) =>
      operation(new PrismaSecurityTransaction(transaction)),
    );
  }
}
