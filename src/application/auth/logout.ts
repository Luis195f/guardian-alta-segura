import type { SecurityUnitOfWork } from "@/application/ports/security-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";

export class LogoutService {
  constructor(
    private readonly unitOfWork: SecurityUnitOfWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    readonly principal: AuthenticatedPrincipal;
    readonly correlationId: string;
  }): Promise<void> {
    const revokedAt = this.now();
    await this.unitOfWork.run(async (transaction) => {
      await transaction.revokeSession({
        sessionId: input.principal.sessionId,
        revokedAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: input.principal.userId,
        actorRole: null,
        action: "SESSION_LOGOUT",
        resourceType: "SessionMetadata",
        resourceId: input.principal.sessionId,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt: revokedAt,
      });
    });
  }
}
