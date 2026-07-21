import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const CAREGIVER_SESSION_COOKIE_NAME = "guardian_caregiver_session";

export function caregiverSessionCookie(
  rawToken: string,
  expiresAt: Date,
  secure: boolean,
): ResponseCookie {
  return {
    name: CAREGIVER_SESSION_COOKIE_NAME,
    value: rawToken,
    expires: expiresAt,
    httpOnly: true,
    sameSite: "strict",
    path: "/api/demo/caregiver",
    secure,
  };
}

export function expiredCaregiverSessionCookie(secure: boolean): ResponseCookie {
  return caregiverSessionCookie("", new Date(0), secure);
}
