import { isLoopbackHostname } from "@/infrastructure/security/loopback";

type NodeEnvironment = "development" | "test" | "production";

export interface ServerEnvironment {
  readonly nodeEnv: NodeEnvironment;
  readonly databaseUrl: string;
  readonly appBaseUrl: URL;
  readonly demoMode: boolean;
  readonly demoSessionTtlHours: number;
  readonly caregiverDemoInvitationTtlMinutes: number;
  readonly caregiverDemoSessionTtlHours: number;
  readonly sessionCookieSecure: boolean;
  readonly explainableTrafficLight: boolean;
  readonly commitmentEngineConfigured: boolean;
  readonly commitmentEngineEnabled: boolean;
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
  const caregiverDemoInvitationTtlMinutes = parseIntegerInRange(
    "CAREGIVER_DEMO_INVITATION_TTL_MINUTES",
    source.CAREGIVER_DEMO_INVITATION_TTL_MINUTES,
    30,
    5,
    120,
  );
  const caregiverDemoSessionTtlHours = parseIntegerInRange(
    "CAREGIVER_DEMO_SESSION_TTL_HOURS",
    source.CAREGIVER_DEMO_SESSION_TTL_HOURS,
    8,
    1,
    12,
  );
  const sessionCookieSecure = parseBoolean(
    "SESSION_COOKIE_SECURE",
    source.SESSION_COOKIE_SECURE,
    nodeEnv === "production",
  );
  const explainableTrafficLight = parseBoolean(
    "EXPLAINABLE_TRAFFIC_LIGHT",
    source.EXPLAINABLE_TRAFFIC_LIGHT,
    false,
  );
  const commitmentEngineConfigured = source.COMMITMENT_ENGINE_ENABLED !== undefined;
  const commitmentEngineEnabled = parseBoolean(
    "COMMITMENT_ENGINE_ENABLED",
    source.COMMITMENT_ENGINE_ENABLED,
    false,
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
  if (commitmentEngineEnabled && !demoMode) {
    throw new Error("COMMITMENT_ENGINE_ENABLED requires explicit synthetic DEMO_MODE");
  }
  if (commitmentEngineEnabled && nodeEnv !== "test") {
    throw new Error("COMMITMENT_ENGINE_ENABLED is restricted to internal synthetic tests");
  }

  return {
    nodeEnv,
    databaseUrl,
    appBaseUrl,
    demoMode,
    demoSessionTtlHours,
    caregiverDemoInvitationTtlMinutes,
    caregiverDemoSessionTtlHours,
    sessionCookieSecure,
    explainableTrafficLight,
    commitmentEngineConfigured,
    commitmentEngineEnabled,
  };
}
