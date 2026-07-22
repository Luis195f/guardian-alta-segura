import { cache } from "react";
import { cookies } from "next/headers";

import type { Role } from "@/domain/auth/role";
import { readAuthenticatedPrincipal } from "@/infrastructure/auth/session-reader";
import { SESSION_COOKIE_NAME } from "@/infrastructure/http/session-cookie";

export interface DemoPageSession {
  readonly userId: string;
  readonly role: Role;
  readonly roles: readonly Role[];
  readonly syntheticAlias: string;
}

export const getDemoPageSession = cache(async (): Promise<DemoPageSession | null> => {
  const cookieStore = await cookies();
  const principal = await readAuthenticatedPrincipal(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const role = principal?.roles[0];
  if (!principal || !role) return null;
  return {
    userId: principal.userId,
    role,
    roles: principal.roles,
    syntheticAlias: `demo-${role}`,
  };
});
