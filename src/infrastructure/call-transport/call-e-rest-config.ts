import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";

assertServerOnlyRuntime();

export const CALL_E_API_BASE_URL = "https://api.heycall-e.com" as const;

export interface CallERestConfiguration {
  readonly enabled: boolean;
  readonly apiKey: string | null;
  readonly fingerprintKey: string | null;
  readonly requestTimeoutMs: number;
}

export type CallERestEnvironment = Readonly<Record<string, string | undefined>>;

export class CallERestConfigurationError extends Error {
  readonly errorCode: string;

  constructor(errorCode: string) {
    super("Outbound call REST configuration is unavailable");
    this.name = "CallERestConfigurationError";
    this.errorCode = errorCode;
  }
}

function parseEnabled(value: string | undefined): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new CallERestConfigurationError("invalid_feature_flag");
}

function parseTimeout(value: string | undefined): number {
  if (value === undefined) return 10_000;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1_000 || parsed > 30_000) {
    throw new CallERestConfigurationError("invalid_request_timeout");
  }
  return parsed;
}

export function readCallERestConfiguration(
  source: CallERestEnvironment = process.env,
): CallERestConfiguration {
  const enabled = parseEnabled(source.CALL_E_REST_ENABLED);
  const requestTimeoutMs = parseTimeout(source.CALL_E_REST_REQUEST_TIMEOUT_MS);
  if (!enabled) {
    return { enabled: false, apiKey: null, fingerprintKey: null, requestTimeoutMs };
  }

  const apiKey = source.CALL_E_API_KEY?.trim();
  const fingerprintKey = source.CALL_E_FINGERPRINT_KEY?.trim();
  if (!apiKey) throw new CallERestConfigurationError("missing_api_key");
  if (!fingerprintKey || Buffer.byteLength(fingerprintKey, "utf8") < 32) {
    throw new CallERestConfigurationError("missing_fingerprint_key");
  }
  return { enabled: true, apiKey, fingerprintKey, requestTimeoutMs };
}
