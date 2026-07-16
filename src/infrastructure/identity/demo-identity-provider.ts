import type { DemoIdentityProvider, IdentitySubject } from "@/application/ports/identity-provider";
import { readServerEnvironment } from "@/infrastructure/config/env";
import { prisma } from "@/infrastructure/persistence/prisma";

export class PrismaDemoIdentityProvider implements DemoIdentityProvider {
  readonly kind = "demo-local" as const;

  async authenticate(input: { readonly syntheticAlias: string }): Promise<IdentitySubject | null> {
    const environment = readServerEnvironment();
    if (!environment.demoMode || environment.nodeEnv === "production") return null;

    const user = await prisma.user.findUnique({
      where: { syntheticAlias: input.syntheticAlias },
      select: {
        id: true,
        isActive: true,
        isSynthetic: true,
        roleAssignments: {
          where: { revokedAt: null },
          select: { role: true },
        },
      },
    });

    if (!user?.isActive || !user.isSynthetic) return null;
    return {
      userId: user.id,
      roles: user.roleAssignments.map(({ role }) => role),
      isSynthetic: true,
    };
  }
}
