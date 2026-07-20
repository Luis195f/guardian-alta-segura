import { describe, expect, it } from "vitest";

import {
  authorize,
  PROTECTED_RESOURCES,
  type ProtectedResource,
} from "@/domain/auth/authorization";
import { ROLES, type Role } from "@/domain/auth/role";

const allowedByRole: Readonly<Record<Role, readonly ProtectedResource[]>> = {
  admin: [
    "authenticated-session",
    "role-administration",
    "technical-support-metadata",
    "check-in-protocol-read",
    "check-in-protocol-write",
    "rule-definition-write",
    "rule-activation-write",
    "rule-catalog-read",
  ],
  nurse: [
    "authenticated-session",
    "simulated-clinical-record",
    "discharge-episode-read",
    "discharge-episode-write",
    "safety-plan-read",
    "safety-plan-write",
    "check-in-protocol-read",
    "check-in-assignment-write",
    "check-in-read",
    "rule-catalog-read",
    "alert-evaluation-write",
    "alert-read",
    "alert-review-write",
  ],
  clinician: [
    "authenticated-session",
    "simulated-clinical-record",
    "discharge-episode-read",
    "discharge-episode-write",
    "safety-plan-read",
    "safety-plan-write",
    "check-in-protocol-read",
    "check-in-assignment-write",
    "check-in-read",
    "rule-approval-write",
    "rule-catalog-read",
    "alert-evaluation-write",
    "alert-read",
    "alert-review-write",
  ],
  patient: [
    "authenticated-session",
    "simulated-own-record",
    "safety-plan-read",
    "check-in-read",
    "check-in-response-write",
  ],
  caregiver: ["authenticated-session", "simulated-caregiver-section"],
  support: ["authenticated-session", "technical-support-metadata"],
};

const allResources: readonly ProtectedResource[] = PROTECTED_RESOURCES;

describe("server-side authorization matrix", () => {
  for (const role of ROLES) {
    it(`${role} solo accede a rutas expresamente permitidas`, () => {
      for (const resource of allResources) {
        expect(authorize({ roles: [role] }, resource).allowed).toBe(
          allowedByRole[role].includes(resource),
        );
      }
      expect(allResources.some((resource) => !allowedByRole[role].includes(resource))).toBe(true);
    });
  }

  it("deniega a un usuario autenticado sin rol", () => {
    expect(authorize({ roles: [] }, "authenticated-session")).toEqual({
      allowed: false,
      reason: "missing-role",
    });
  });

  it("deniega a support el recurso clínico simulado", () => {
    expect(authorize({ roles: ["support"] }, "simulated-clinical-record")).toEqual({
      allowed: false,
      reason: "denied-by-default",
    });
  });

  it("no concede a admin acceso clínico implícito", () => {
    expect(authorize({ roles: ["admin"] }, "simulated-clinical-record").allowed).toBe(false);
  });
});
