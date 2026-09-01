import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type {
  RelayAuthorityBinding,
  RelaySecretProtector,
} from "@/application/ports/continuity-relay";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";

assertServerOnlyRuntime();

function canonicalAuthority(input: RelayAuthorityBinding): string {
  return JSON.stringify([
    input.actorRef,
    input.targetRef,
    input.recipientKind,
    input.purpose,
    input.episodeRef,
    input.taskRef,
    input.destinationPhone,
    input.region,
    input.locale,
    input.lineRegion,
    input.taskContractKey,
    input.taskContractVersion,
    input.attestationVersion,
    input.revision,
  ]);
}

export class HmacRelaySecretProtector implements RelaySecretProtector {
  private readonly key: Buffer;

  constructor(key: string | Buffer) {
    assertServerOnlyRuntime();
    this.key = Buffer.isBuffer(key) ? Buffer.from(key) : Buffer.from(key, "utf8");
    if (this.key.byteLength < 32) throw new Error("Relay fingerprint key is too short");
  }

  issueConfirmationToken(): string {
    return randomBytes(32).toString("base64url");
  }

  issueIdempotencyRef(): string {
    return `relay_${randomBytes(24).toString("base64url")}`;
  }

  digestConfirmationToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  protectAuthority(input: RelayAuthorityBinding): string {
    return createHmac("sha256", this.key).update(canonicalAuthority(input), "utf8").digest("hex");
  }

  matchesProtected(stored: string, candidate: string): boolean {
    if (!/^[0-9a-f]{64}$/.test(stored) || !/^[0-9a-f]{64}$/.test(candidate)) return false;
    return timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(candidate, "hex"));
  }
}
