import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  CreateOutboundCallInput,
  OutboundCallFingerprint,
} from "@/application/ports/outbound-call";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";

assertServerOnlyRuntime();

export class KeyedCallFingerprint implements OutboundCallFingerprint {
  constructor(private readonly key: string) {
    if (Buffer.byteLength(key, "utf8") < 32) {
      throw new Error("Outbound call fingerprint configuration is unavailable");
    }
  }

  derive(input: CreateOutboundCallInput): string {
    const canonical = JSON.stringify({
      idempotencyRef: input.idempotencyRef,
      taskKey: input.taskKey,
      recipients: input.recipients.map((recipient) => ({
        phones: [...recipient.phones],
        region: recipient.region,
        locale: recipient.locale,
      })),
    });
    return createHmac("sha256", this.key).update(canonical, "utf8").digest("hex");
  }

  matches(stored: string, candidate: string): boolean {
    if (!/^[0-9a-f]{64}$/u.test(stored) || !/^[0-9a-f]{64}$/u.test(candidate)) return false;
    return timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(candidate, "hex"));
  }
}
