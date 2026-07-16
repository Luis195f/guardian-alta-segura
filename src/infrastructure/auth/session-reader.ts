import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import { sha256 } from "@/infrastructure/crypto/session-token";
import { prisma } from "@/infrastructure/persistence/prisma";

export async function readAuthenticatedPrincipal(
  rawSessionToken: string | undefined,
  now: Date = new Date(),
): Promise<AuthenticatedPrincipal | null> {
  if (!rawSessionToken) return null;

  const session = await prisma.sessionMetadata.findUnique({
    where: { sessionTokenHash: sha256(rawSessionToken) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          isActive: true,
          roleAssignments: {
            where: { revokedAt: null },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= now || !session.user.isActive)
    return null;
  const roles = session.user.roleAssignments.map(({ role }) => role);
  if (roles.length === 0) return null;
  return { userId: session.user.id, roles, sessionId: session.id };
}
