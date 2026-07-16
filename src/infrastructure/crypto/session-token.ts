import { createHash, randomBytes } from "node:crypto";

import type { SessionTokenIssuer } from "@/application/auth/demo-login";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export const secureSessionTokenIssuer: SessionTokenIssuer = {
  issue() {
    const raw = randomBytes(32).toString("base64url");
    return { raw, hash: sha256(raw) };
  },
};

export function hashUserAgent(userAgent: string | null): string | null {
  return userAgent ? sha256(userAgent) : null;
}
