import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const PROFESSIONAL_RELAY_CONFIRMATION_COOKIE = "gas_professional_relay_confirmation";

export function professionalRelayConfirmationPath(episodeRef: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/u.test(episodeRef)) {
    throw new Error("Professional Relay cookie scope is invalid");
  }
  return `/api/demo/discharge-episodes/${episodeRef}/professional-relay`;
}

export function professionalRelayConfirmationCookie(
  episodeRef: string,
  token: string,
  expires: Date,
  secure: boolean,
): ResponseCookie {
  return {
    name: PROFESSIONAL_RELAY_CONFIRMATION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: professionalRelayConfirmationPath(episodeRef),
    expires,
  };
}

export function expiredProfessionalRelayConfirmationCookie(
  episodeRef: string,
  secure: boolean,
): ResponseCookie {
  return {
    name: PROFESSIONAL_RELAY_CONFIRMATION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: professionalRelayConfirmationPath(episodeRef),
    expires: new Date(0),
    maxAge: 0,
  };
}
