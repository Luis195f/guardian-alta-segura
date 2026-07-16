import type { Role } from "@/domain/auth/role";

export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly sessionId: string;
}
