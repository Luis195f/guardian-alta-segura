import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const SESSION_COOKIE_NAME = "guardian_demo_session";

export function sessionCookie(rawToken: string, expiresAt: Date, secure: boolean): ResponseCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    expires: expiresAt,
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure,
  };
}

export function expiredSessionCookie(secure: boolean): ResponseCookie {
  return sessionCookie("", new Date(0), secure);
}
