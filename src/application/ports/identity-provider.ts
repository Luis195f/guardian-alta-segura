import type { Role } from "@/domain/auth/role";

export interface IdentitySubject {
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly isSynthetic: boolean;
}

export interface DemoIdentityProvider {
  readonly kind: "demo-local";
  authenticate(input: { readonly syntheticAlias: string }): Promise<IdentitySubject | null>;
}

export interface InstitutionalIdentityProvider<AuthenticationContext> {
  readonly kind: "institutional";
  authenticate(context: AuthenticationContext): Promise<IdentitySubject | null>;
}
