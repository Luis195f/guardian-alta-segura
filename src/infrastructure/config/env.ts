import { isLoopbackHostname } from "@/infrastructure/security/loopback";

type NodeEnvironment = "development" | "test" | "production";

export interface ServerEnvironment {
  readonly nodeEnv: NodeEnvironment;
  readonly databaseUrl: string;
  readonly appBaseUrl: URL;
  readonly demoMode: boolean;
  readonly demoSessionTtlHours: number;
  readonly sessionCookieSecure: boolean;
}

function parseBoolean(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly "true" or "false"`);
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

function parseIntegerInRange(
  name: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function isNodeEnvironment(value: string): value is NodeEnvironment {
  return value === "development" || value === "test" || value === "production";
}

export function readServerEnvironment(source: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  const nodeEnvValue = source.NODE_ENV ?? "development";
  if (!isNodeEnvironment(nodeEnvValue)) {
    throw new Error("NODE_ENV is invalid");
  }
  const nodeEnv = nodeEnvValue;

  const databaseUrl = required("DATABASE_URL", source.DATABASE_URL);
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }

  const appBaseUrl = new URL(required("APP_BASE_URL", source.APP_BASE_URL));
  const demoMode = parseBoolean("DEMO_MODE", source.DEMO_MODE, false);
  const demoSessionTtlHours = parseIntegerInRange(
    "DEMO_SESSION_TTL_HOURS",
    source.DEMO_SESSION_TTL_HOURS,
    8,
    1,
    12,
  );
  const sessionCookieSecure = parseBoolean(
    "SESSION_COOKIE_SECURE",
    source.SESSION_COOKIE_SECURE,
    nodeEnv === "production",
  );

  if (nodeEnv === "production" && demoMode) {
    throw new Error("DEMO_MODE cannot be enabled in production");
  }
  if (demoMode && !isLoopbackHostname(appBaseUrl.hostname)) {
    throw new Error("DEMO_MODE requires APP_BASE_URL on a loopback host");
  }
  if (nodeEnv === "production" && appBaseUrl.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use HTTPS in production");
  }
  if (nodeEnv === "production" && !sessionCookieSecure) {
    throw new Error("SESSION_COOKIE_SECURE must be enabled in production");
  }

  return {
    nodeEnv,
    databaseUrl,
    appBaseUrl,
    demoMode,
    demoSessionTtlHours,
    sessionCookieSecure,
  };
}
