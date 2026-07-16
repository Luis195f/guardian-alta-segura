import {
  ActiveRoleConflictError,
  type SecurityUnitOfWork,
} from "@/application/ports/security-unit-of-work";
import { authorize } from "@/domain/auth/authorization";
import { isFixedDemoAlias } from "@/domain/auth/demo-identities";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";

export class RoleAssignmentDeniedError extends Error {}
export class ActiveRoleAssignmentExistsError extends Error {}
export class RoleAssignmentTargetDeniedError extends Error {}

const clinicalRoles: readonly Role[] = ["nurse", "clinician", "patient", "caregiver"];

export class AssignRoleService {
  constructor(
    private readonly unitOfWork: SecurityUnitOfWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    readonly actor: AuthenticatedPrincipal;
    readonly actingRole: Role;
    readonly targetUserId: string;
    readonly role: Role;
    readonly correlationId: string;
  }): Promise<{ readonly roleAssignmentId: string }> {
    if (
      input.actingRole !== "admin" ||
      !input.actor.roles.includes(input.actingRole) ||
      !authorize({ roles: [input.actingRole] }, "role-administration").allowed
    ) {
      throw new RoleAssignmentDeniedError("Role administration denied");
    }
    if (input.actor.userId === input.targetUserId && clinicalRoles.includes(input.role)) {
      throw new RoleAssignmentDeniedError("Administrative self-assignment denied");
    }

    const assignedAt = this.now();
    try {
      return await this.unitOfWork.run(async (transaction) => {
        if (!(await transaction.isActiveUserWithRole(input.actor.userId, input.actingRole))) {
          throw new RoleAssignmentDeniedError("Active administrative user and role required");
        }

        const target = await transaction.getRoleAssignmentTarget(input.targetUserId);
        if (
          !target ||
          !target.isActive ||
          !target.isSynthetic ||
          isFixedDemoAlias(target.syntheticAlias)
        ) {
          throw new RoleAssignmentTargetDeniedError("Synthetic role assignment target denied");
        }
        if (await transaction.hasActiveRole(input.targetUserId, input.role)) {
          throw new ActiveRoleAssignmentExistsError("Active role assignment already exists");
        }

        const assignment = await transaction.createRoleAssignment({
          userId: input.targetUserId,
          role: input.role,
          assignedById: input.actor.userId,
          assignedAt,
        });
        await transaction.appendAuditEvent({
          actorUserId: input.actor.userId,
          actorRole: input.actingRole,
          action: "ROLE_ASSIGNED",
          resourceType: "RoleAssignment",
          resourceId: assignment.id,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
          createdAt: assignedAt,
        });
        return { roleAssignmentId: assignment.id };
      });
    } catch (error) {
      if (error instanceof ActiveRoleConflictError) {
        throw new ActiveRoleAssignmentExistsError("Active role assignment already exists");
      }
      throw error;
    }
  }
}
