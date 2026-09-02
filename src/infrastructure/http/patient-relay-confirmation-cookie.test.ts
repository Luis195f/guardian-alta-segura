import { describe, expect, it } from "vitest";

import {
  expiredPatientRelayConfirmationCookie,
  patientRelayConfirmationCookie,
  patientRelayConfirmationPath,
} from "@/infrastructure/http/patient-relay-confirmation-cookie";

const EPISODE_REF = "synthetic-demo-episode-buildweek";

describe("Patient Relay confirmation cookie", () => {
  it("keeps the one-use token HttpOnly, Strict, secure and scoped to the exact relay", () => {
    const expires = new Date("2030-01-01T00:00:00.000Z");
    expect(patientRelayConfirmationCookie(EPISODE_REF, "synthetic-token", expires, true)).toEqual({
      name: "gas_patient_relay_confirmation",
      value: "synthetic-token",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: `/api/demo/discharge-episodes/${EPISODE_REF}/patient-relay`,
      expires,
    });
  });

  it("expires the same exact scope and rejects an unsafe episode path", () => {
    expect(expiredPatientRelayConfirmationCookie(EPISODE_REF, false)).toMatchObject({
      value: "",
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: patientRelayConfirmationPath(EPISODE_REF),
      maxAge: 0,
    });
    expect(() => patientRelayConfirmationPath("../another-route")).toThrow(
      "Patient Relay cookie scope is invalid",
    );
  });
});
