import { ExecuteOutboundCall } from "@/application/outbound-call/execute-outbound-call";
import {
  CallERestConfigurationError,
  readCallERestConfiguration,
  type CallERestEnvironment,
} from "@/infrastructure/call-transport/call-e-rest-config";
import { CallERestAdapter } from "@/infrastructure/call-transport/call-e-rest-adapter";
import { KeyedCallFingerprint } from "@/infrastructure/call-transport/keyed-call-fingerprint";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";
import { PrismaOutboundCallIntentStore } from "@/infrastructure/persistence/prisma-outbound-call-intent-store";

assertServerOnlyRuntime();

export class DisabledCallERestRuntime {
  private executor: ExecuteOutboundCall | null = null;

  constructor(private readonly source: CallERestEnvironment = process.env) {}

  getExecutor(): ExecuteOutboundCall {
    if (this.executor) return this.executor;
    const configuration = readCallERestConfiguration(this.source);
    if (!configuration.enabled || !configuration.apiKey || !configuration.fingerprintKey) {
      throw new CallERestConfigurationError("runtime_disabled");
    }
    this.executor = new ExecuteOutboundCall(
      new CallERestAdapter({
        apiKey: configuration.apiKey,
        requestTimeoutMs: configuration.requestTimeoutMs,
      }),
      new PrismaOutboundCallIntentStore(),
      new KeyedCallFingerprint(configuration.fingerprintKey),
      { pollingTimeoutMs: 120_000, pollingIntervalMs: 2_000 },
    );
    return this.executor;
  }
}
