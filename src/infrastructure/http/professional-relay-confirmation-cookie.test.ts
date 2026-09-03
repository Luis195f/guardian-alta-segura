import { describe, expect, it } from "vitest";

import {
  expiredProfessionalRelayConfirmationCookie,
  professionalRelayConfirmationCookie,
  professionalRelayConfirmationPath,
} from "@/infrastructure/http/professional-relay-confirmation-cookie";

const EPISODE_REF = "synthetic-demo-episode-buildweek";

describe("Professional Relay confirmation cookie", () => {
  it("keeps its one-use token HttpOnly, Strict, secure and separate from Patient Relay", () => {
    expect(
      professionalRelayConfirmationCookie(
        EPISODE_REF,
        "opaque-token",
        new Date("2026-09-02T12:00:00.000Z"),
        true,
      ),
    ).toMatchObject({
      name: "gas_professional_relay_confirmation",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: `/api/demo/discharge-episodes/${EPISODE_REF}/professional-relay`,
    });
    expect(professionalRelayConfirmationPath(EPISODE_REF)).not.toContain("patient-relay");
  });

  it("expires the same exact scope and rejects unsafe episode paths", () => {
    expect(expiredProfessionalRelayConfirmationCookie(EPISODE_REF, false)).toMatchObject({
      value: "",
      maxAge: 0,
      secure: false,
      path: `/api/demo/discharge-episodes/${EPISODE_REF}/professional-relay`,
    });
    expect(() => professionalRelayConfirmationPath("../other")).toThrow(
      "Professional Relay cookie scope is invalid",
    );
  });
});
