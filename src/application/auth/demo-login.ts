import type { DemoIdentityProvider } from "@/application/ports/identity-provider";
import type { SecurityUnitOfWork } from "@/application/ports/security-unit-of-work";
import type { AuthenticatedPrincipal } from "@/domain/auth/principal";

export class AuthenticationDeniedError extends Error {
  constructor() {
    super("Authentication denied");
    this.name = "AuthenticationDeniedError";
  }
}

export interface SessionTokenIssuer {
  issue(): { readonly raw: string; readonly hash: string };
}

export interface DemoLoginResult {
  readonly rawSessionToken: string;
  readonly expiresAt: Date;
  readonly principal: AuthenticatedPrincipal;
}

export class DemoLoginService {
  constructor(
    private readonly identityProvider: DemoIdentityProvider,
    private readonly unitOfWork: SecurityUnitOfWork,
    private readonly tokenIssuer: SessionTokenIssuer,
    private readonly sessionTtlMilliseconds: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    readonly syntheticAlias: string;
    readonly correlationId: string;
    readonly userAgentHash: string | null;
  }): Promise<DemoLoginResult> {
    const subject = await this.identityProvider.authenticate({
      syntheticAlias: input.syntheticAlias,
    });
    if (!subject?.isSynthetic || subject.roles.length === 0) {
      const deniedAt = this.now();
      await this.unitOfWork.run(async (transaction) => {
        await transaction.appendAuditEvent({
          actorUserId: null,
          actorRole: null,
          action: "DEMO_LOGIN",
          resourceType: "IdentityProvider",
          resourceId: null,
          outcome: "DENIED",
          correlationId: input.correlationId,
          createdAt: deniedAt,
        });
      });
      throw new AuthenticationDeniedError();
    }

    const createdAt = this.now();
    const expiresAt = new Date(createdAt.getTime() + this.sessionTtlMilliseconds);
    const token = this.tokenIssuer.issue();

    const session = await this.unitOfWork.run(async (transaction) => {
      const createdSession = await transaction.createSession({
        userId: subject.userId,
        sessionTokenHash: token.hash,
        authenticationMethod: "demo-local",
        correlationId: input.correlationId,
        userAgentHash: input.userAgentHash,
        createdAt,
        expiresAt,
      });
      await transaction.appendAuditEvent({
        actorUserId: subject.userId,
        actorRole: null,
        action: "DEMO_LOGIN",
        resourceType: "SessionMetadata",
        resourceId: createdSession.id,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        createdAt,
      });
      return createdSession;
    });

    return {
      rawSessionToken: token.raw,
      expiresAt,
      principal: { userId: subject.userId, roles: subject.roles, sessionId: session.id },
    };
  }
}
