import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const PATIENT_RELAY_CONFIRMATION_COOKIE = "gas_patient_relay_confirmation";

export function patientRelayConfirmationPath(episodeRef: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/u.test(episodeRef)) {
    throw new Error("Patient Relay cookie scope is invalid");
  }
  return `/api/demo/discharge-episodes/${episodeRef}/patient-relay`;
}

export function patientRelayConfirmationCookie(
  episodeRef: string,
  token: string,
  expires: Date,
  secure: boolean,
): ResponseCookie {
  return {
    name: PATIENT_RELAY_CONFIRMATION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: patientRelayConfirmationPath(episodeRef),
    expires,
  };
}

export function expiredPatientRelayConfirmationCookie(
  episodeRef: string,
  secure: boolean,
): ResponseCookie {
  return {
    name: PATIENT_RELAY_CONFIRMATION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: patientRelayConfirmationPath(episodeRef),
    expires: new Date(0),
    maxAge: 0,
  };
}
