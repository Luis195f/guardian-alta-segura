import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import type { Role } from "@/domain/auth/role";

export const PROTECTED_RESOURCES = [
  "authenticated-session",
  "role-administration",
  "simulated-clinical-record",
  "simulated-own-record",
  "simulated-caregiver-section",
  "technical-support-metadata",
  "discharge-episode-read",
  "discharge-episode-write",
  "safety-plan-read",
  "safety-plan-write",
  "check-in-protocol-write",
  "check-in-protocol-read",
  "check-in-assignment-write",
  "check-in-read",
  "check-in-response-write",
] as const;

export type ProtectedResource = (typeof PROTECTED_RESOURCES)[number];

const allowedRoles: Readonly<Record<ProtectedResource, readonly Role[]>> = {
  "authenticated-session": ["admin", "nurse", "clinician", "patient", "caregiver", "support"],
  "role-administration": ["admin"],
  "simulated-clinical-record": ["nurse", "clinician"],
  "simulated-own-record": ["patient"],
  "simulated-caregiver-section": ["caregiver"],
  "technical-support-metadata": ["admin", "support"],
  "discharge-episode-read": ["nurse", "clinician"],
  "discharge-episode-write": ["nurse", "clinician"],
  "safety-plan-read": ["nurse", "clinician", "patient"],
  "safety-plan-write": ["nurse", "clinician"],
  "check-in-protocol-write": ["admin"],
  "check-in-protocol-read": ["admin", "nurse", "clinician"],
  "check-in-assignment-write": ["nurse", "clinician"],
  "check-in-read": ["nurse", "clinician", "patient"],
  "check-in-response-write": ["patient"],
};

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason: "allowed-by-role" | "denied-by-default" | "missing-role";
}

export function isProtectedResource(value: unknown): value is ProtectedResource {
  return (
    typeof value === "string" &&
    PROTECTED_RESOURCES.some((protectedResource) => protectedResource === value)
  );
}

export function authorize(
  principal: Pick<AuthenticatedPrincipal, "roles">,
  resource: ProtectedResource,
): AuthorizationDecision {
  if (principal.roles.length === 0) {
    return { allowed: false, reason: "missing-role" };
  }

  const allowed = principal.roles.some((role) => allowedRoles[resource].includes(role));
  return allowed
    ? { allowed: true, reason: "allowed-by-role" }
    : { allowed: false, reason: "denied-by-default" };
}
