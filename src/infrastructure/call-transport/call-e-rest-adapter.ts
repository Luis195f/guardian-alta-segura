import {
  OutboundCallProviderError,
  type CreateOutboundCallInput,
  type OutboundCallProvider,
  type OutboundCallSnapshot,
  type OutboundCallTechnicalStatus,
  type SanitizedOutboundCallError,
} from "@/application/ports/outbound-call";
import { CALL_E_API_BASE_URL } from "@/infrastructure/call-transport/call-e-rest-config";
import { assertServerOnlyRuntime } from "@/infrastructure/call-transport/server-only-guard";

assertServerOnlyRuntime();

export type CallERestTransport = (input: string | URL, init: RequestInit) => Promise<Response>;

export interface SanitizedCallERestLogEvent {
  readonly operation: "CREATE" | "GET";
  readonly outcome: "SUCCESS" | "FAILURE";
  readonly errorClass?: SanitizedOutboundCallError["errorClass"];
  readonly errorCode?: string;
}

interface AdapterOptions {
  readonly apiKey: string;
  readonly requestTimeoutMs: number;
  readonly transport?: CallERestTransport;
  readonly log?: (event: SanitizedCallERestLogEvent) => void;
}

const TASK_ALLOWLIST = {
  SYNTHETIC_CONTINUITY_CHECK:
    "SYNTHETIC continuity check. Record only the synthetic acknowledgement.",
} as const;

const STATUS_MAP: Readonly<Record<string, OutboundCallTechnicalStatus>> = {
  queued: "QUEUED",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  failed: "FAILED",
  canceled: "CANCELED",
};

const CODE_MAP: Readonly<Record<string, SanitizedOutboundCallError>> = {
  unauthorized: {
    errorClass: "CONFIGURATION_AUTH",
    errorCode: "authentication_failed",
    uncertain: false,
  },
  forbidden: {
    errorClass: "CONFIGURATION_AUTH",
    errorCode: "authorization_failed",
    uncertain: false,
  },
  rate_limit_exceeded: { errorClass: "RATE_LIMIT", errorCode: "rate_limited", uncertain: false },
  insufficient_balance: {
    errorClass: "BALANCE",
    errorCode: "insufficient_balance",
    uncertain: false,
  },
  unsupported_region: {
    errorClass: "REGION_LANGUAGE",
    errorCode: "unsupported_region",
    uncertain: false,
  },
  unsupported_language: {
    errorClass: "REGION_LANGUAGE",
    errorCode: "unsupported_language",
    uncertain: false,
  },
  recipient_blocked: {
    errorClass: "RECIPIENT_PHONE",
    errorCode: "recipient_blocked",
    uncertain: false,
  },
  no_recipients: {
    errorClass: "RECIPIENT_PHONE",
    errorCode: "invalid_recipient",
    uncertain: false,
  },
  invalid_recipient: {
    errorClass: "RECIPIENT_PHONE",
    errorCode: "invalid_recipient",
    uncertain: false,
  },
  invalid_phone: { errorClass: "RECIPIENT_PHONE", errorCode: "invalid_phone", uncertain: false },
  idempotency_conflict: {
    errorClass: "IDEMPOTENCY_CONFLICT",
    errorCode: "idempotency_conflict",
    uncertain: false,
  },
  provider_unavailable: {
    errorClass: "PROVIDER_UNAVAILABLE",
    errorCode: "provider_unavailable",
    uncertain: true,
  },
};

const PROVIDER_REF = /^[A-Za-z0-9_-]{1,128}$/u;
const IDEMPOTENCY_REF = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/u;
const E164 = /^\+[1-9]\d{6,14}$/u;
const REGION = /^[A-Z]{2}$/u;
const LOCALE = /^[a-z]{2}-[A-Z]{2}$/u;
const MAX_RESPONSE_BYTES = 64 * 1024;

function invalidInput(code: string): never {
  throw new OutboundCallProviderError({
    errorClass: code === "idempotency_conflict" ? "IDEMPOTENCY_CONFLICT" : "RECIPIENT_PHONE",
    errorCode: code,
    uncertain: false,
  });
}

function exactKeys(value: object, allowed: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === allowed.length &&
    actual.every((key, index) => key === [...allowed].sort()[index])
  );
}

function buildCreateRequest(input: CreateOutboundCallInput) {
  if (!exactKeys(input, ["idempotencyRef", "recipients", "taskKey"])) {
    invalidInput("invalid_request_shape");
  }
  const task = TASK_ALLOWLIST[input.taskKey as keyof typeof TASK_ALLOWLIST];
  if (!task) invalidInput("task_not_allowlisted");
  if (!IDEMPOTENCY_REF.test(input.idempotencyRef)) invalidInput("invalid_idempotency_ref");
  if (input.recipients.length !== 1) invalidInput("invalid_recipient_cardinality");
  const recipient = input.recipients[0];
  if (!recipient || !exactKeys(recipient, ["locale", "phones", "region"])) {
    invalidInput("invalid_recipient_shape");
  }
  if (recipient.phones.length !== 1) invalidInput("invalid_phone_cardinality");
  const phone = recipient.phones[0];
  if (!phone || !E164.test(phone)) invalidInput("invalid_phone");
  if (!REGION.test(recipient.region)) invalidInput("invalid_region");
  if (!LOCALE.test(recipient.locale) || recipient.locale.slice(-2) !== recipient.region) {
    invalidInput("invalid_locale");
  }
  return {
    task,
    recipients: [
      {
        phones: [phone],
        region: recipient.region,
        locale: recipient.locale,
      },
    ],
  };
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throwInvalidResponse();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throwInvalidResponse();
  return date;
}

function throwInvalidResponse(): never {
  throw new OutboundCallProviderError({
    errorClass: "INVALID_RESPONSE",
    errorCode: "invalid_response",
    uncertain: true,
  });
}

async function readLimitedJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    throwInvalidResponse();
  }
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAX_RESPONSE_BYTES
    ) {
      throwInvalidResponse();
    }
  }

  const reader = response.body?.getReader();
  if (!reader) throwInvalidResponse();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throwInvalidResponse();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof OutboundCallProviderError) throw error;
    throwInvalidResponse();
  }
}

function mapSnapshot(value: unknown): OutboundCallSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throwInvalidResponse();
  const source = value as Record<string, unknown>;
  if (typeof source.id !== "string" || !PROVIDER_REF.test(source.id)) throwInvalidResponse();
  if (typeof source.status !== "string") throwInvalidResponse();
  const status = STATUS_MAP[source.status];
  if (!status) throwInvalidResponse();
  if (source.structured_result !== undefined && source.structured_result !== null) {
    throwInvalidResponse();
  }
  return {
    providerRef: source.id,
    status,
    structuredResult: "ABSTAINED",
    providerCreatedAt: parseDate(source.created_at),
    providerCompletedAt: parseDate(source.completed_at),
  };
}

async function parseErrorCode(response: Response): Promise<string | null> {
  try {
    const value = await readLimitedJson(response);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    if (typeof source.code === "string") return source.code;
    if (source.error && typeof source.error === "object" && !Array.isArray(source.error)) {
      const code = (source.error as Record<string, unknown>).code;
      return typeof code === "string" ? code : null;
    }
  } catch {
    return null;
  }
  return null;
}

async function classifyHttpError(response: Response): Promise<SanitizedOutboundCallError> {
  const providerCode = await parseErrorCode(response);
  if (providerCode && CODE_MAP[providerCode]) return CODE_MAP[providerCode];
  if (response.status === 401 || response.status === 403) {
    return {
      errorClass: "CONFIGURATION_AUTH",
      errorCode: "authentication_failed",
      uncertain: false,
    };
  }
  if (response.status === 409) {
    return {
      errorClass: "IDEMPOTENCY_CONFLICT",
      errorCode: "idempotency_conflict",
      uncertain: false,
    };
  }
  if (response.status === 429) {
    return { errorClass: "RATE_LIMIT", errorCode: "rate_limited", uncertain: false };
  }
  if (response.status >= 500) {
    return {
      errorClass: "PROVIDER_UNAVAILABLE",
      errorCode: "provider_unavailable",
      uncertain: true,
    };
  }
  return { errorClass: "UNKNOWN", errorCode: "provider_rejected_request", uncertain: false };
}

export class CallERestAdapter implements OutboundCallProvider {
  private readonly transport: CallERestTransport;
  private readonly log: (event: SanitizedCallERestLogEvent) => void;

  constructor(private readonly options: AdapterOptions) {
    if (!options.apiKey.trim()) {
      throw new OutboundCallProviderError({
        errorClass: "CONFIGURATION_AUTH",
        errorCode: "missing_api_key",
        uncertain: false,
      });
    }
    if (
      !Number.isInteger(options.requestTimeoutMs) ||
      options.requestTimeoutMs < 1_000 ||
      options.requestTimeoutMs > 30_000
    ) {
      throw new OutboundCallProviderError({
        errorClass: "CONFIGURATION_AUTH",
        errorCode: "invalid_request_timeout",
        uncertain: false,
      });
    }
    this.transport = options.transport ?? ((input, init) => fetch(input, init));
    this.log = options.log ?? (() => undefined);
  }

  async create(input: CreateOutboundCallInput): Promise<OutboundCallSnapshot> {
    const body = buildCreateRequest(input);
    return this.request("CREATE", `${CALL_E_API_BASE_URL}/v1/calls`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyRef,
      },
      body: JSON.stringify(body),
    });
  }

  async get(providerRef: string): Promise<OutboundCallSnapshot> {
    if (!PROVIDER_REF.test(providerRef)) throwInvalidResponse();
    return this.request(
      "GET",
      `${CALL_E_API_BASE_URL}/v1/calls/${encodeURIComponent(providerRef)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
  }

  private async request(
    operation: SanitizedCallERestLogEvent["operation"],
    url: string,
    init: RequestInit,
  ): Promise<OutboundCallSnapshot> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.options.requestTimeoutMs);
    try {
      const response = await this.transport(url, {
        ...init,
        redirect: "error",
        signal: controller.signal,
      });
      if (response.redirected || (response.url !== "" && response.url !== url)) {
        throwInvalidResponse();
      }
      if (!response.ok) throw new OutboundCallProviderError(await classifyHttpError(response));
      const snapshot = mapSnapshot(await readLimitedJson(response));
      this.log({ operation, outcome: "SUCCESS" });
      return snapshot;
    } catch (error) {
      const sanitized =
        error instanceof OutboundCallProviderError
          ? { errorClass: error.errorClass, errorCode: error.errorCode, uncertain: error.uncertain }
          : timedOut
            ? { errorClass: "TIMEOUT" as const, errorCode: "request_timeout", uncertain: true }
            : {
                errorClass: "CONNECTION_UNCERTAIN" as const,
                errorCode: "connection_uncertain",
                uncertain: true,
              };
      this.log({
        operation,
        outcome: "FAILURE",
        errorClass: sanitized.errorClass,
        errorCode: sanitized.errorCode,
      });
      throw new OutboundCallProviderError(sanitized);
    } finally {
      clearTimeout(timeout);
    }
  }
}
